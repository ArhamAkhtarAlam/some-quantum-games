// ═══════════════════════════════════════════════════════
//  CURBy quantum entropy client (dynamic import)
// ═══════════════════════════════════════════════════════
let curbyClient = null
let latestRandomness = null
let entropyPool = []
let poolIndex = 0
let curbyInitPromise = null

async function initCurby() {
  if (curbyInitPromise) return curbyInitPromise
  curbyInitPromise = (async () => {
    try {
      const mod = await import('https://esm.sh/@buff-beacon-project/curby-client@1.2.0')
      curbyClient = await mod.Client.create()
      await refreshEntropy()
      return true
    } catch (e) {
      console.warn('CURBy init failed, using fallback PRNG:', e)
      setEntropyLive(false)
      return false
    }
  })()
  return curbyInitPromise
}

async function refreshEntropy() {
  if (!curbyClient) return
  try {
    latestRandomness = await curbyClient.randomness()
    const base = Array.from({ length: 4096 }, (_, i) => i)
    entropyPool = latestRandomness.shuffled(base)
    poolIndex = 0
    setEntropyLive(true)
  } catch (e) {
    setEntropyLive(false)
    console.warn('Entropy refresh failed:', e)
  }
}

setInterval(refreshEntropy, 60_000)

function setEntropyLive(live) {
  document.querySelectorAll('.entropy-dot').forEach(el => {
    el.className = 'entropy-dot' + (live ? ' live' : '')
  })
  const label = live ? 'quantum live' : 'local fallback'
  document.querySelectorAll('.entropy-indicator span').forEach(el => {
    el.textContent = label
  })
}

function qRandInt(max) {
  if (entropyPool.length > 0) {
    const raw = entropyPool[poolIndex % entropyPool.length]
    poolIndex++
    if (poolIndex >= entropyPool.length) {
      poolIndex = 0
      refreshEntropy()
    }
    return raw % max
  }
  return Math.floor(Math.random() * max)
}

function qPickUnique(n, max) {
  if (n > max) n = max
  const arr = Array.from({ length: max }, (_, i) => i)
  if (latestRandomness) {
    return latestRandomness.shuffled(arr).slice(0, n)
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, n)
}

// ═══════════════════════════════════════════════════════
//  BACKGROUND PARTICLE CANVAS
// ═══════════════════════════════════════════════════════
const canvas = document.getElementById('bg-canvas')
const ctx = canvas.getContext('2d')
let particles = []

function initCanvas() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5 + .3,
    vx: (Math.random() - .5) * .3,
    vy: (Math.random() - .5) * .3,
    alpha: Math.random() * .6 + .2,
  }))
}
function animCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const p of particles) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(124,58,237,${p.alpha})`
    ctx.fill()
    p.x += p.vx; p.y += p.vy
    if (p.x < 0) p.x = canvas.width
    if (p.x > canvas.width) p.x = 0
    if (p.y < 0) p.y = canvas.height
    if (p.y > canvas.height) p.y = 0
  }
  requestAnimationFrame(animCanvas)
}
window.addEventListener('resize', initCanvas)
initCanvas(); animCanvas()

// ═══════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════
window.showGame = function(n) {
  document.getElementById('home').classList.remove('active')
  document.getElementById(`game${n}`).classList.add('active')
  if (n === 1) initGame1()
  if (n === 2) initGame2()
  if (n === 3) initGame3()
  if (n === 4) initGame4()
  if (n === 5) initGame5()
  if (n === 6) initGame6()
  if (n === 8) initGame8()
  if (n === 10) initGame10()
}

window.goHome = function() {
  stopG1Timer(); stopSpawn(); stopReact(); stopDodge(); stopFlash(); stopDeltaE()
  stopGame8(); stopGame10()
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById('home').classList.add('active')
}

window.restartGame = function(n) {
  document.getElementById(`g${n}-over`).classList.remove('show')
  if (n === 1) initGame1()
  if (n === 2) initGame2()
  if (n === 3) initGame3()
  if (n === 4) initGame4()
  if (n === 5) initGame5()
  if (n === 6) initGame6()
  if (n === 8) initGame8()
  if (n === 10) initGame10()
}

// ═══════════════════════════════════════════════════════
//  TRACKMANIA-STYLE MEDALS
// ═══════════════════════════════════════════════════════
const MEDALS = {
  equation: { bronze: 50,   silver: 150, gold: 300  },
  aim:      { bronze: 100,  silver: 300, gold: 600  },
  reaction: { bronze: 300,  silver: 230, gold: 180  },
  dodge:    { bronze: 100,  silver: 250, gold: 450  },
  flash:    { bronze: 4,    silver: 6,   gold: 8    },
  deltae:   { bronze: 1200, silver: 2400, gold: 3400 },
  tiles:    { bronze: 10,   silver: 25,  gold: 45   },
  gravity:  { bronze: 50,   silver: 150, gold: 300  },
}

let authorScores = {
  equation: null, aim: null, reaction: null, dodge: null, flash: null, deltae: null,
  tiles: null, gravity: null,
}

async function fetchAuthorScores() {
  for (const game of ['equation','aim','reaction','dodge','flash','deltae','tiles','gravity']) {
    try {
      const rows = await sbFetch(
        `/rest/v1/leaderboard?game=eq.${game}&name=eq.ARHAM&order=score.desc&limit=1`
      )
      if (rows && rows.length > 0) authorScores[game] = rows[0].score
    } catch {}
  }
}

const LOWER_IS_BETTER = new Set(['reaction'])

function getMedal(game, score) {
  const t = MEDALS[game]
  if (!t) return null
  const author = authorScores[game]
  if (LOWER_IS_BETTER.has(game)) {
    if (author !== null && score < author) return 'author'
    if (score <= t.gold)   return 'gold'
    if (score <= t.silver) return 'silver'
    if (score <= t.bronze) return 'bronze'
    return null
  }
  if (author !== null && score > author) return 'author'
  if (score >= t.gold)   return 'gold'
  if (score >= t.silver) return 'silver'
  if (score >= t.bronze) return 'bronze'
  return null
}

const MEDAL_META = {
  bronze: { icon: '🥉', label: 'Bronze Medal',  cls: 'medal-bronze',  bg: 'rgba(180,100,40,.12)'  },
  silver: { icon: '🥈', label: 'Silver Medal',  cls: 'medal-silver',  bg: 'rgba(148,163,184,.12)' },
  gold:   { icon: '🥇', label: 'Gold Medal',    cls: 'medal-gold',    bg: 'rgba(245,158,11,.12)'  },
  author: { icon: '👾', label: 'Author Medal',  cls: 'medal-author',  bg: 'rgba(124,58,237,.15)'  },
}

function renderMedalDisplay(elId, game, score) {
  const el = document.getElementById(elId)
  if (!el) return
  const medal = getMedal(game, score)
  if (!medal) { el.innerHTML = ''; return }
  const m = MEDAL_META[medal]
  el.innerHTML = `
    <div class="medal-earned" style="background:${m.bg};">
      <div class="medal-icon">${m.icon}</div>
      <div class="medal-label ${m.cls}">${m.label}${medal === 'author' ? ' — You beat ARHAM!' : ''}</div>
    </div>`
}

function medalBadgeHtml(game, score) {
  const medal = getMedal(game, score)
  if (!medal) return ''
  const m = MEDAL_META[medal]
  return ` <span class="medal ${m.cls}">${m.icon} ${medal}</span>`
}

// ═══════════════════════════════════════════════════════
//  COOKIES / LOCAL STORAGE
// ═══════════════════════════════════════════════════════
function cookieSet(key, val, days = 365) {
  const d = new Date(); d.setTime(d.getTime() + days * 864e5)
  document.cookie = `${key}=${encodeURIComponent(val)};expires=${d.toUTCString()};path=/;SameSite=Lax`
}
function cookieGet(key) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + key + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

function getPB(game) {
  const v = localStorage.getItem('pb_' + game)
  if (v === null) return LOWER_IS_BETTER.has(game) ? 99999 : 0
  return parseFloat(v)
}
function setPB(game, score) {
  const better = LOWER_IS_BETTER.has(game) ? score < getPB(game) : score > getPB(game)
  if (better) { localStorage.setItem('pb_' + game, score); return true }
  return false
}

// ═══════════════════════════════════════════════════════
//  ADMIN AUTH
// ═══════════════════════════════════════════════════════
const ADMIN_NAME = 'ARHAM'
const ADMIN_HASH = 'd4c39c00879d9caf8fdee691d3cfe371b48767334f2c8c49313b439f31f46455'

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function isAdminVerified() { return sessionStorage.getItem('admin_verified') === '1' }
function setAdminVerified() { sessionStorage.setItem('admin_verified', '1') }

// ═══════════════════════════════════════════════════════
//  SUPABASE LEADERBOARD
// ═══════════════════════════════════════════════════════
const SB_URL = 'https://kuvpxhuvednptyfqccea.supabase.co'
const SB_KEY = 'sb_publishable_gKmvBHgqjV9cbQvoo_48tA_zKQKDPbw'

async function sbFetch(path, options = {}) {
  const res = await fetch(SB_URL + path, {
    ...options,
    headers: {
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || '',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(await res.text())
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

function escHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}

function scoreToDisplay(game, score) {
  if (game === 'reaction') return score + ' ms'
  if (game === 'dodge' || game === 'gravity') return (score / 10).toFixed(1) + 's'
  if (game === 'flash') return score + '/10'
  if (game === 'deltae') return score + ' pts'
  if (game === 'tiles') return score + ' tiles'
  return score.toLocaleString()
}

let lbCurrentGame = 'equation'

const LB_TABS = [
  { id: 'lb-tab-1',  game: 'equation', label: 'Equation', color: null,        cls: '' },
  { id: 'lb-tab-2',  game: 'aim',      label: 'Aim',      color: null,        cls: 'cyan' },
  { id: 'lb-tab-3',  game: 'reaction', label: 'Reaction', color: 'var(--success)' },
  { id: 'lb-tab-4',  game: 'dodge',    label: 'Dodge',    color: 'var(--danger)'  },
  { id: 'lb-tab-5',  game: 'flash',    label: 'Flash',    color: '#f59e0b'         },
  { id: 'lb-tab-6',  game: 'deltae',   label: 'Delta E',  color: '#ec4899'         },
  { id: 'lb-tab-8',  game: 'tiles',    label: 'Tiles',    color: 'var(--accent2)'  },
  { id: 'lb-tab-10', game: 'gravity',  label: 'Gravity',  color: 'var(--accent)'   },
]

window.switchLbTab = function(game) {
  lbCurrentGame = game
  for (const tab of LB_TABS) {
    const el = document.getElementById(tab.id)
    if (!el) continue
    const active = tab.game === game
    if (tab.color) {
      el.style.cssText = active
        ? `background:${tab.color};border-color:${tab.color};color:#fff;`
        : `border-color:${tab.color};color:${tab.color};`
      el.className = 'lb-tab'
    } else if (tab.cls === 'cyan') {
      el.className = 'lb-tab cyan' + (active ? ' active' : '')
      el.style.cssText = ''
    } else {
      el.className = 'lb-tab' + (active ? ' active' : '')
      el.style.cssText = ''
    }
  }
  loadLeaderboard(game)
}

async function loadLeaderboard(game) {
  const list = document.getElementById('lb-list')
  list.innerHTML = '<div class="lb-loading"><div class="spinner"></div> Loading…</div>'
  try {
    const order = LOWER_IS_BETTER.has(game) ? 'score.asc' : 'score.desc'
    const rawRows = await sbFetch(`/rest/v1/leaderboard?game=eq.${game}&order=${order}&limit=100`)
    if (!rawRows || rawRows.length === 0) {
      list.innerHTML = '<div class="lb-empty">No scores yet — be the first!</div>'
      return
    }
    const seen = new Map()
    for (const r of rawRows) {
      const key = r.name.toLowerCase()
      if (!seen.has(key) || r.score > seen.get(key).score) seen.set(key, r)
    }
    const rows = Array.from(seen.values())
      .sort((a, b) => LOWER_IS_BETTER.has(game) ? a.score - b.score : b.score - a.score)
      .slice(0, 10)

    const rankLabels = ['🥇', '🥈', '🥉']
    const myName = cookieGet('player_name') || ''
    const pb = getPB(game)
    list.innerHTML = rows.map((r, i) => {
      const isAdmin = r.name.toUpperCase() === ADMIN_NAME
      const isMe = myName && r.name === myName
      const authorBadge = isAdmin
        ? ' <span class="medal medal-author-badge">AUTHOR</span>' : ''
      const youBadge = isMe
        ? ' <span style="font-size:.7rem;background:rgba(124,58,237,.25);color:var(--accent);padding:.1rem .4rem;border-radius:4px;vertical-align:middle">you</span>' : ''
      const medalBadge = isAdmin
        ? ' <span class="medal medal-earned medal-author"><span class="medal-icon">👾</span><span class="medal-label">Author</span></span>'
        : medalBadgeHtml(game, r.score)
      const scoreDisplay = scoreToDisplay(game, r.score)
      const scoreStyle = game === 'aim' ? 'class="lb-score cyan"'
        : game === 'reaction' ? 'class="lb-score" style="color:var(--success)"'
        : game === 'dodge' || game === 'gravity' ? 'class="lb-score" style="color:var(--danger)"'
        : 'class="lb-score"'
      return `
        <div class="lb-row" style="${isMe ? 'background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.3);' : ''}">
          <span class="lb-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${rankLabels[i] || i+1}</span>
          <span class="lb-name">${escHtml(r.name)}${authorBadge}${youBadge}${medalBadge}</span>
          <span ${scoreStyle}>${scoreDisplay}</span>
        </div>`
    }).join('')

    const pbValid = LOWER_IS_BETTER.has(game) ? pb < 99999 : pb > 0
    if (pbValid && myName && !rows.find(r => r.name === myName)) {
      const pbDisplay = scoreToDisplay(game, pb)
      list.innerHTML += `
        <div style="margin-top:.5rem;padding-top:.5rem;border-top:1px solid var(--border);">
          <div class="lb-row" style="background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.2);">
            <span class="lb-rank">—</span>
            <span class="lb-name">${escHtml(myName)} <span style="font-size:.7rem;background:rgba(124,58,237,.25);color:var(--accent);padding:.1rem .4rem;border-radius:4px;">you</span>${medalBadgeHtml(game, pb)}</span>
            <span class="lb-score ${game==='aim'?'cyan':''}">PB: ${pbDisplay}</span>
          </div>
        </div>`
    }
  } catch (e) {
    list.innerHTML = '<div class="lb-empty">Could not load scores.</div>'
    console.warn('Leaderboard load failed:', e)
  }
}

// ═══════════════════════════════════════════════════════
//  SUBMIT SCORE
// ═══════════════════════════════════════════════════════
let pendingSubmit = null

const SCORE_COLORS = {
  aim: 'var(--accent2)', reaction: 'var(--success)', dodge: 'var(--danger)',
  flash: '#f59e0b', deltae: '#ec4899',
  tiles: 'var(--accent2)', gravity: 'var(--accent)',
}

window.openSubmit = function(game) {
  let score = 0
  if (game === 'equation') score = window.G1 ? window.G1.score : 0
  else if (game === 'aim') score = window.G2 ? window.G2.score : 0
  else if (game === 'reaction') score = window._g3Score || 9999
  else if (game === 'dodge')    score = window._g4Score || 0
  else if (game === 'flash')    score = window._g5Score || 0
  else if (game === 'deltae')   score = window._g6Score || 0
  else if (game === 'cursor')   score = window._g7Score || 0
  else if (game === 'tiles')    score = window._g8Score || 0
  else if (game === 'swarm')    score = window._g9Score || 0
  else if (game === 'gravity')  score = window._g10Score || 0

  pendingSubmit = { game, score }
  document.getElementById('sub-score-display').textContent = scoreToDisplay(game, score)
  document.getElementById('sub-score-display').style.color = SCORE_COLORS[game] || 'var(--accent)'

  const pb = getPB(game)
  const pbEl = document.getElementById('sub-pb-info')
  const pbValid = LOWER_IS_BETTER.has(game) ? pb < 99999 : pb > 0
  if (pbValid) {
    const improved = LOWER_IS_BETTER.has(game) ? score < pb : score > pb
    pbEl.textContent = improved
      ? `New personal best! (was ${scoreToDisplay(game, pb)})`
      : `Your best: ${scoreToDisplay(game, pb)}`
    pbEl.style.color = improved ? 'var(--success)' : 'var(--muted)'
  } else {
    pbEl.textContent = 'First time playing!'
    pbEl.style.color = 'var(--muted)'
  }

  const saved = cookieGet('player_name') || ''
  document.getElementById('sub-name-input').value = saved
  document.getElementById('sub-status').textContent = ''
  document.getElementById('sub-submit-btn').disabled = false
  document.getElementById('admin-pw-row').style.display = 'none'
  document.getElementById('sub-admin-pw').value = ''
  document.getElementById('submit-overlay').classList.add('show')
  setTimeout(() => document.getElementById('sub-name-input').focus(), 100)
}

document.getElementById('sub-name-input').addEventListener('input', () => {
  const val = document.getElementById('sub-name-input').value.trim().toUpperCase()
  const pwRow = document.getElementById('admin-pw-row')
  if (val === ADMIN_NAME) {
    pwRow.style.display = 'flex'
    document.getElementById('sub-admin-pw').focus()
  } else {
    pwRow.style.display = 'none'
  }
})

document.getElementById('sub-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') submitScore()
})
document.getElementById('sub-admin-pw').addEventListener('keydown', e => {
  if (e.key === 'Enter') submitScore()
})

window.submitScore = async function() {
  const nameRaw = document.getElementById('sub-name-input').value.trim()
  if (!nameRaw) {
    document.getElementById('sub-status').textContent = 'Please enter your name.'
    return
  }

  if (nameRaw.toUpperCase() === ADMIN_NAME) {
    if (!isAdminVerified()) {
      const pw = document.getElementById('sub-admin-pw').value
      if (!pw) {
        document.getElementById('sub-status').textContent = 'Enter the admin password to use this name.'
        document.getElementById('sub-admin-pw').focus()
        return
      }
      const hashed = await sha256(pw)
      if (hashed !== ADMIN_HASH) {
        document.getElementById('sub-status').textContent = 'Wrong password.'
        document.getElementById('sub-admin-pw').value = ''
        return
      }
      setAdminVerified()
    }
  }

  const name = nameRaw.toUpperCase() === ADMIN_NAME ? ADMIN_NAME : nameRaw
  const btn = document.getElementById('sub-submit-btn')
  btn.disabled = true
  document.getElementById('sub-status').textContent = 'Submitting…'

  try {
    await sbFetch('/rest/v1/leaderboard', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({ name, game: pendingSubmit.game, score: pendingSubmit.score }),
    })

    cookieSet('player_name', name)
    const newPB = setPB(pendingSubmit.game, pendingSubmit.score)
    document.getElementById('sub-status').textContent = newPB ? '✓ New personal best saved!' : '✓ Score submitted!'

    setTimeout(() => {
      document.getElementById('submit-overlay').classList.remove('show')
      const overMap = {
        equation:'g1-over', aim:'g2-over', reaction:'g3-over', dodge:'g4-over',
        flash:'g5-over', deltae:'g6-over', cursor:'g7-over', tiles:'g8-over',
        swarm:'g9-over', gravity:'g10-over',
      }
      const overId = overMap[pendingSubmit.game]
      if (overId) document.getElementById(overId).classList.remove('show')
      goHome()
      loadLeaderboard(pendingSubmit.game)
      switchLbTab(pendingSubmit.game)
    }, 1000)
  } catch (e) {
    document.getElementById('sub-status').textContent = 'Failed to submit. Try again.'
    btn.disabled = false
    console.warn('Submit failed:', e)
  }
}

window.skipSubmit = function() {
  if (pendingSubmit) setPB(pendingSubmit.game, pendingSubmit.score)
  document.getElementById('submit-overlay').classList.remove('show')
}

// Load on page start
initCurby()
fetchAuthorScores().then(() => loadLeaderboard('equation'))
