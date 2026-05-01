// ═══════════════════════════════════════════════════════
//  AUTH — Supabase authentication layer
// ═══════════════════════════════════════════════════════

if (typeof supabase === 'undefined') console.warn('Supabase SDK not loaded — auth disabled.')
const _sb = (typeof supabase !== 'undefined') ? supabase.createClient(SB_URL, SB_KEY) : null

const AUTH = {
  user:    null,
  profile: null,
  _pendingSignupEmail: null,   // held so resend knows the address

  // ── init ─────────────────────────────────────────────
  async init() {
    if (!_sb) { AUTH._updateHeaderUI(); return }

    const hashParams  = new URLSearchParams(window.location.hash.slice(1))
    const queryParams = new URLSearchParams(window.location.search)
    const errorDesc   = hashParams.get('error_description') || queryParams.get('error_description')
    // Detect fresh OAuth/email callback before we wipe the hash
    const isOAuthCallback = window.location.hash.includes('access_token') || window.location.search.includes('code=')

    if (errorDesc) {
      history.replaceState(null, '', window.location.pathname)
      AUTH.openPage()
      AUTH._showTab('login')
      setTimeout(() => AUTH._showError('auth-status', errorDesc.replace(/\+/g, ' ') + ' — resend below.', true), 50)
    } else {
      if (isOAuthCallback) history.replaceState(null, '', window.location.pathname)
    }

    // Restore / process session from URL hash
    const { data: { session } } = await _sb.auth.getSession()
    if (session) {
      AUTH.user = session.user
      await AUTH._loadProfile()
      // If this is a fresh OAuth redirect, handle navigation here —
      // onAuthStateChange fires before the listener is registered so we can't rely on it
      if (isOAuthCallback) {
        if (!AUTH.profile) {
          AUTH._openUsernamePicker()
        } else {
          AUTH._showWelcome()
          setTimeout(() => AUTH.goHome(), 1200)
        }
      }
    }

    _sb.auth.onAuthStateChange(async (event, session) => {
      AUTH.user = session?.user || null
      if (AUTH.user) {
        await AUTH._loadProfile()
        // SIGNED_IN fires for email/password logins (not OAuth redirects — handled above)
        if (event === 'SIGNED_IN') {
          if (!AUTH.profile) {
            AUTH._openUsernamePicker()
          } else {
            AUTH._showWelcome()
            setTimeout(() => AUTH.goHome(), 1200)
          }
        }
      } else {
        AUTH.profile = null
      }
      AUTH._updateHeaderUI()
    })

    AUTH._updateHeaderUI()
  },

  async _loadProfile() {
    if (!AUTH.user) return
    const { data } = await _sb.from('profiles').select('*').eq('id', AUTH.user.id).maybeSingle()
    if (data) {
      AUTH.profile = data
    } else {
      // Determine display name: explicit signup metadata → known email map → Google full_name
      let name = AUTH.user.user_metadata?.display_name
      if (!name) {
        const email = AUTH.user.email || ''
        if (email === 'arham.akhtar111@gmail.com') {
          name = 'ARHAM'
        } else {
          const raw = AUTH.user.user_metadata?.full_name || AUTH.user.user_metadata?.name || ''
          name = raw.slice(0, 20).trim() || null
        }
      }
      if (name) {
        const { data: created } = await _sb.from('profiles')
          .insert({ id: AUTH.user.id, display_name: name })
          .select().maybeSingle()
        AUTH.profile = created || null
      }
    }
    AUTH._updateHeaderUI()
  },

  getDisplayName() {
    return AUTH.profile?.display_name?.trim() || null
  },

  // ── auth actions ─────────────────────────────────────
  async signInEmail(email, password) {
    if (!_sb) throw new Error('Auth unavailable.')
    const { error } = await _sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(
      error.message.includes('Email not confirmed')
        ? 'Email not confirmed yet — check your inbox (or resend below).'
        : error.message
    )
  },

  async signInGoogle() {
    if (!_sb) throw new Error('Auth unavailable.')
    const { error } = await _sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + (typeof getBasePath === 'function' ? getBasePath() : '') + '/' }
    })
    if (error) throw new Error(error.message)
  },

  async signUp(email, password, displayName) {
    if (!_sb) throw new Error('Auth unavailable.')
    const name = displayName.trim()
    if (!name || name.length < 2) throw new Error('Display name must be at least 2 characters.')
    if (name.length > 20)         throw new Error('Display name must be 20 characters or fewer.')
    const available = await AUTH.checkNameAvailable(name)
    if (!available) throw new Error('That display name is already taken. Choose another.')
    const { error } = await _sb.auth.signUp({
      email, password,
      options: {
        data: { display_name: name },
        emailRedirectTo: window.location.origin + (typeof getBasePath === 'function' ? getBasePath() : '') + '/',
      }
    })
    if (error) throw new Error(error.message)
    AUTH._pendingSignupEmail = email
  },

  async resendConfirmation(email) {
    if (!_sb) throw new Error('Auth unavailable.')
    const { error } = await _sb.auth.resend({ type: 'signup', email })
    if (error) throw new Error(error.message)
  },

  async signOut() {
    if (!_sb) return
    await _sb.auth.signOut()
    AUTH.user = null; AUTH.profile = null
    AUTH._updateHeaderUI()
  },

  // ── name check ───────────────────────────────────────
  async checkNameAvailable(name) {
    try {
      if (!_sb) return true
      const { data } = await _sb.from('profiles').select('id').ilike('display_name', name.trim()).limit(1)
      return !data || data.length === 0
    } catch { return true }
  },

  // ── navigation ───────────────────────────────────────
  openPage(tab = 'login') {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
    document.getElementById('login-screen').classList.add('active')
    AUTH._showTab(tab)
    document.getElementById('auth-status').textContent = ''
    document.getElementById('auth-signup-status').textContent = ''
    const base = (typeof getBasePath === 'function') ? getBasePath() : ''
    const loginUrl = base + '/login'
    if (!window.location.pathname.endsWith('/login')) history.pushState({ login: true }, '', loginUrl)
  },

  goHome() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
    document.getElementById('home').classList.add('active')
    if (typeof pushHomeUrl === 'function') pushHomeUrl()
  },

  _openUsernamePicker() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
    document.getElementById('username-screen').classList.add('active')
    document.getElementById('choose-name-status').textContent = ''
    const input = document.getElementById('choose-name-input')
    // Pre-fill with Google name as a suggestion
    const suggestion = AUTH.user?.user_metadata?.full_name || AUTH.user?.user_metadata?.name || ''
    input.value = suggestion.slice(0, 20)
    input.focus()
  },

  async handleChooseName() {
    const input = document.getElementById('choose-name-input')
    const status = document.getElementById('choose-name-status')
    const name = input.value.trim()
    status.textContent = ''
    if (!name || name.length < 2) { AUTH._showError('choose-name-status', 'Name must be at least 2 characters.'); return }
    if (name.length > 20)         { AUTH._showError('choose-name-status', 'Name must be 20 characters or fewer.'); return }
    const available = await AUTH.checkNameAvailable(name)
    if (!available) { AUTH._showError('choose-name-status', 'That name is already taken.'); return }
    status.style.color = 'var(--muted)'; status.textContent = 'Saving…'
    try {
      const { data } = await _sb.from('profiles')
        .insert({ id: AUTH.user.id, display_name: name })
        .select().maybeSingle()
      AUTH.profile = data
      AUTH._updateHeaderUI()
      AUTH._showWelcome()
      setTimeout(() => AUTH.goHome(), 1200)
    } catch(e) {
      AUTH._showError('choose-name-status', e.message)
    }
  },

  _showWelcome() {
    // Brief welcome overlay on the login screen before redirecting home
    const screen = document.getElementById('login-screen')
    screen.querySelectorAll('.auth-tab-content').forEach(el => el.style.display = 'none')
    const name = AUTH.getDisplayName() || 'back'
    const div = document.createElement('div')
    div.style.cssText = 'text-align:center;padding:2rem;color:var(--success);font-size:1.2rem;font-weight:700;'
    div.textContent = `✓ Welcome, ${name}!`
    document.querySelector('.login-card').appendChild(div)
  },

  // ── tabs ─────────────────────────────────────────────
  _showTab(tab) {
    document.querySelectorAll('.auth-tab-content').forEach(el => el.style.display = 'none')
    document.querySelectorAll('.auth-tab-btn').forEach(el => el.classList.remove('active'))
    const content = document.getElementById('auth-tab-' + tab)
    const btn     = document.querySelector(`.auth-tab-btn[data-tab="${tab}"]`)
    if (content) content.style.display = 'flex'
    if (btn)     btn.classList.add('active')
  },

  _showError(elId, msg, showResend = false) {
    const el = document.getElementById(elId)
    if (!el) return
    el.style.color = 'var(--danger)'; el.textContent = msg
    if (showResend) {
      const btn = document.createElement('button')
      btn.textContent = 'Resend confirmation email'
      btn.style.cssText = 'margin-top:.5rem;background:none;border:1px solid var(--border);color:var(--muted);padding:.3rem .7rem;border-radius:6px;cursor:pointer;font-size:.8rem;'
      btn.onclick = async () => {
        const emailInput = document.getElementById('auth-email')
        const email = emailInput?.value.trim() || AUTH._pendingSignupEmail || ''
        if (!email) { el.textContent = 'Enter your email above then click resend.'; return }
        btn.disabled = true; btn.textContent = 'Sending…'
        try {
          await AUTH.resendConfirmation(email)
          el.style.color = 'var(--success)'; el.textContent = '✓ Confirmation email resent — check your inbox.'
          btn.remove()
        } catch(e) {
          el.textContent = e.message; btn.disabled = false; btn.textContent = 'Resend confirmation email'
        }
      }
      el.appendChild(document.createElement('br'))
      el.appendChild(btn)
    }
  },

  // ── header UI ────────────────────────────────────────
  _updateHeaderUI() {
    const wrap = document.getElementById('auth-header-wrap')
    if (!wrap) return
    if (AUTH.user && AUTH.profile) {
      wrap.innerHTML = `
        <span class="auth-username">👤 ${escHtml(AUTH.profile.display_name)}</span>
        <button class="auth-small-btn" onclick="AUTH.signOut()">Sign Out</button>`
    } else {
      wrap.innerHTML = `<button class="auth-small-btn" onclick="AUTH.openPage()">Login / Sign Up</button>`
    }
  },

  // ── form handlers ────────────────────────────────────
  async handleLogin() {
    const email  = document.getElementById('auth-email').value.trim()
    const pw     = document.getElementById('auth-pw').value
    const status = document.getElementById('auth-status')
    status.textContent = ''
    if (!email || !pw) { AUTH._showError('auth-status', 'Please fill in all fields.'); return }
    status.style.color = 'var(--muted)'; status.textContent = 'Signing in…'
    try {
      await AUTH.signInEmail(email, pw)
      status.style.color = 'var(--success)'; status.textContent = '✓ Signed in!'
    } catch(e) {
      const needsResend = e.message.includes('not confirmed')
      AUTH._showError('auth-status', e.message, needsResend)
    }
  },

  async handleSignUp() {
    const name   = document.getElementById('auth-signup-name').value.trim()
    const email  = document.getElementById('auth-signup-email').value.trim()
    const pw     = document.getElementById('auth-signup-pw').value
    const status = document.getElementById('auth-signup-status')
    status.textContent = ''
    if (!name || !email || !pw) { AUTH._showError('auth-signup-status', 'Please fill in all fields.'); return }
    status.style.color = 'var(--muted)'; status.textContent = 'Creating account…'
    try {
      await AUTH.signUp(email, pw, name)
      status.style.color = 'var(--success)'
      status.innerHTML = `✓ Check your email (<b>${escHtml(email)}</b>) for a confirmation link, then come back and sign in.`
      // Show resend option after 15s
      setTimeout(() => {
        if (status.innerHTML.includes('confirmation link')) {
          const btn = document.createElement('button')
          btn.textContent = 'Resend email'
          btn.style.cssText = 'display:block;margin:.6rem auto 0;background:none;border:1px solid var(--border);color:var(--muted);padding:.3rem .8rem;border-radius:6px;cursor:pointer;font-size:.8rem;'
          btn.onclick = async () => {
            btn.disabled = true; btn.textContent = 'Sending…'
            try {
              await AUTH.resendConfirmation(email)
              btn.textContent = '✓ Sent!'
            } catch { btn.textContent = 'Failed — try again'; btn.disabled = false }
          }
          status.appendChild(btn)
        }
      }, 15000)
    } catch(e) {
      AUTH._showError('auth-signup-status', e.message)
    }
  },
}

document.addEventListener('DOMContentLoaded', () => AUTH.init())
