// ═══════════════════════════════════════════════════════
//  LEVEL REVIEW — paste a submission, check it, play it,
//  copy the pool entry if it's good.
//  Everything is localStorage; nothing is uploaded.
// ═══════════════════════════════════════════════════════

const RV_KEY = 'qg_review_inbox_v1'

const RV_SB_URL = 'https://kuvpxhuvednptyfqccea.supabase.co'
const RV_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dnB4aHV2ZWRucHR5ZnFjY2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjY4MTcsImV4cCI6MjA5MDQ0MjgxN30.tYb15AI3DfwSjYrYrLVUPhOJjh8tfAvglPGXmunEA4k'

const RV = { items: [], sel: -1, user: null }
const _rvSb = (typeof supabase !== 'undefined')
  ? supabase.createClient(RV_SB_URL, RV_SB_KEY) : null

const RV_DIFF_COL = {
  easy:'#4ade80', medium:'#fbbf24', hard:'#f87171',
  extreme:'#fb923c', fp:'#c084fc', dc:'#ef4444', boss:'#ef4444',
}

function rvEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}
function rvMsg(m) {
  const el = document.getElementById('rv-msg')
  if (el) el.textContent = m
  if (m) setTimeout(() => { if (el && el.textContent === m) el.textContent = '' }, 4000)
}

function rvLoad() {
  try { RV.items = JSON.parse(localStorage.getItem(RV_KEY) || '[]') } catch { RV.items = [] }
  if (!Array.isArray(RV.items)) RV.items = []
}
function rvSave() {
  try { localStorage.setItem(RV_KEY, JSON.stringify(RV.items)) }
  catch (e) { rvMsg('⚠ Could not save: ' + e.message) }
}

// ── Adding ────────────────────────────────────────────

window.rvClearPaste = function() { document.getElementById('rv-paste').value = '' }

// Shared by pasting, the file picker and drag-and-drop
function rvAddText(raw, source) {
  raw = (raw || '').trim()
  if (!raw) { rvMsg('Nothing to add.'); return false }
  let lv
  try { lv = JSON.parse(raw) }
  catch (e) { rvMsg(`⚠ ${source || 'That'} isn't valid JSON: ` + e.message); return false }
  if (!lv || typeof lv !== 'object' || (!lv.keyframes && !lv.obstacles)) {
    rvMsg("⚠ That doesn't look like a level — no keyframes or obstacles."); return false
  }
  if (!lv.game) lv.game = lv.keyframes ? 'wavegauntlet' : 'spider'
  RV.items.unshift({ lv, at: Date.now() })
  RV.sel = 0
  rvSave(); rvRenderList(); rvRenderReport()
  rvMsg(`Checked "${lv.name || 'unnamed'}".`)
  return true
}

window.rvAdd = function() {
  const box = document.getElementById('rv-paste')
  if (rvAddText(box.value, 'That')) box.value = ''
}

// Submitters send .qglevel.json files, so take them directly
window.rvFiles = function(files) {
  const list = [...(files || [])]
  if (!list.length) return
  let done = 0, okCount = 0
  for (const f of list) {
    const r = new FileReader()
    r.onload = () => {
      if (rvAddText(String(r.result), f.name)) okCount++
      if (++done === list.length && list.length > 1) rvMsg(`Added ${okCount} of ${list.length} files.`)
    }
    r.onerror = () => { if (++done === list.length) rvMsg('⚠ Could not read that file.') }
    r.readAsText(f)
  }
}

window.rvSelect = function(i) { RV.sel = i; rvRenderList(); rvRenderReport() }

window.rvDrop = async function() {
  const it = RV.items[RV.sel]; if (!it) return
  if (!confirm(`Reject "${it.lv.name || 'unnamed'}"?`)) return
  await rvMark(it, 'rejected')
  RV.items.splice(RV.sel, 1)
  RV.sel = RV.items.length ? 0 : -1
  rvSave(); rvRenderList(); rvRenderReport()
}

window.rvClearAll = function() {
  if (!RV.items.length) return
  if (!confirm(`Remove all ${RV.items.length} submissions?`)) return
  RV.items = []; RV.sel = -1
  rvSave(); rvRenderList(); rvRenderReport()
}

// ── Server queue ──────────────────────────────────────
// Reading is gated by RLS on your email, so signing in is what makes
// the queue visible. Local paste and file import work without it.

function rvRenderAuth() {
  const el = document.getElementById('rv-auth')
  if (!el) return
  if (!_rvSb) { el.innerHTML = '<span class="rv-empty">Offline — local review only.</span>'; return }
  if (RV.user) {
    el.innerHTML = `<span style="color:#4ade80;font-size:.76rem">✓ ${rvEsc(RV.user.email)}</span>
      <button class="ed-mini" onclick="rvFetch()">↻ Refresh</button>
      <button class="ed-mini" onclick="rvSignOut()">Sign out</button>`
  } else {
    el.innerHTML = `<input id="rv-em" type="email" placeholder="email" autocomplete="username">
      <input id="rv-pw" type="password" placeholder="password" autocomplete="current-password">
      <button class="ed-mini" onclick="rvSignIn()">Sign in</button>`
  }
}

window.rvSignIn = async function() {
  if (!_rvSb) return
  const email = (document.getElementById('rv-em') || {}).value
  const pw    = (document.getElementById('rv-pw') || {}).value
  if (!email || !pw) { rvMsg('Enter both fields.'); return }
  rvMsg('Signing in…')
  const { data, error } = await _rvSb.auth.signInWithPassword({ email, password: pw })
  if (error) { rvMsg('⚠ ' + error.message); return }
  RV.user = data.user
  rvRenderAuth(); rvMsg('Signed in.')
  rvFetch()
}

window.rvSignOut = async function() {
  if (_rvSb) await _rvSb.auth.signOut()
  RV.user = null
  rvRenderAuth()
}

// Pull pending submissions. RLS returns nothing unless the signed-in
// email is on the admin list in sql/level_submissions.sql.
window.rvFetch = async function() {
  if (!_rvSb || !RV.user) { rvMsg('Sign in first.'); return }
  rvMsg('Fetching…')
  const { data, error } = await _rvSb.from('level_submissions')
    .select('*').eq('status', 'pending').order('created_at', { ascending: false })
  if (error) { rvMsg('⚠ ' + error.message); return }
  if (!data || !data.length) { rvMsg('Queue is empty.'); return }

  let added = 0
  for (const row of data) {
    if (RV.items.some(it => it.id === row.id)) continue
    RV.items.push({
      id: row.id, at: new Date(row.created_at).getTime(),
      author: row.author, note: row.note, remote: true,
      lv: {
        game: row.game, name: row.name, diff: row.diff,
        speed: row.speed, clearAt: row.clear_at,
        ...(row.data || {}),
      },
    })
    added++
  }
  RV.items.sort((a, b) => b.at - a.at)
  if (RV.sel < 0 && RV.items.length) RV.sel = 0
  rvSave(); rvRenderList(); rvRenderReport()
  rvMsg(added ? `Pulled ${added} new submission(s).` : 'Nothing new.')
}

// Mark a submission so it stops showing up in the queue
async function rvMark(item, status) {
  if (!item || !item.remote || !_rvSb || !RV.user) return true
  const { error } = await _rvSb.from('level_submissions')
    .update({ status }).eq('id', item.id)
  if (error) { rvMsg('⚠ ' + error.message); return false }
  return true
}

window.rvAccept = async function() {
  const it = RV.items[RV.sel]; if (!it) return
  if (await rvMark(it, 'accepted')) {
    rvCopyJS()
    rvMsg('✅ Marked accepted — pool entry copied.')
  }
}

// ── Rendering ─────────────────────────────────────────

function rvRenderList() {
  const el = document.getElementById('rv-list')
  if (!el) return
  if (!RV.items.length) { el.innerHTML = '<div class="rv-empty">None yet.</div>'; return }
  el.innerHTML = RV.items.map((it, i) => {
    const c = RV_DIFF_COL[it.lv.diff] || '#888'
    return `<div class="rv-item ${i === RV.sel ? 'active' : ''}" onclick="rvSelect(${i})">
      <span class="rv-dot" style="background:${c}"></span>
      <span class="rv-item-name">${rvEsc(it.lv.name || '(unnamed)')}</span>
      <span style="font-size:.66rem;color:var(--muted)">${it.lv.game === 'spider' ? '🕷' : '🌊'}</span>
    </div>`
  }).join('')
}

function rvRenderReport() {
  const el = document.getElementById('rv-report')
  if (!el) return
  const it = RV.items[RV.sel]
  if (!it) {
    el.innerHTML = '<div class="rv-empty">Paste a level on the left and hit <b>+ Add</b>.</div>'
    return
  }
  const r = lcReport(it.lv)
  const okAll = r.clearable && r.problems.length === 0

  let html = `<div class="rv-verdict" style="color:${okAll ? '#4ade80' : r.clearable ? '#fbbf24' : '#f87171'}">
      ${okAll ? '✅ Looks good' : r.clearable ? '⚠ Playable, with issues' : '❌ Not clearable'}
    </div>
    <div class="rv-sub">${rvEsc(r.name)} — ${rvEsc(r.game)} · ${rvEsc(r.diff)} · speed ${r.speed} · ${r.clearAt} columns</div>
    ${it.author ? `<div class="rv-line">by <b>${rvEsc(it.author)}</b></div>` : ''}
    ${it.note ? `<div class="rv-line" style="color:var(--muted)">"${rvEsc(it.note)}"</div>` : ''}`

  if (r.problems.length) {
    html += `<div class="rv-sec">Problems</div>`
    html += r.problems.map(p => `<div class="rv-line bad">• ${rvEsc(p)}</div>`).join('')
  }
  if (r.warnings.length) {
    html += `<div class="rv-sec">Worth knowing</div>`
    html += r.warnings.map(p => `<div class="rv-line warn">• ${rvEsc(p)}</div>`).join('')
  }
  if (!r.problems.length && !r.warnings.length) {
    html += `<div class="rv-line good">• Nothing flagged.</div>`
  }

  if (r.game === 'spider') {
    html += `<div class="rv-sec">Numbers</div><div class="rv-grid">
      <div class="rv-stat"><b>${r.blocks}</b><span>blocks</span></div>
      <div class="rv-stat"><b>${r.tightestFlipMs ?? '—'}ms</b><span>tightest flip</span></div>
      <div class="rv-stat"><b>${(r.clearAt / r.speed).toFixed(1)}s</b><span>length</span></div>
    </div>`
  } else {
    const t = r.tightest
    html += `<div class="rv-sec">Numbers</div><div class="rv-grid">
      <div class="rv-stat"><b>${(r.clearAt / r.speed).toFixed(1)}s</b><span>length</span></div>
      <div class="rv-stat"><b>${r.colsPerFrame.toFixed(1)}</b><span>columns per frame</span></div>
      <div class="rv-stat"><b>${r.lookahead.toFixed(2)}s</b><span>warning time</span></div>
      <div class="rv-stat"><b>${r.tightestGap.px.toFixed(0)}px</b><span>tightest gap (${r.tightestGap.clearance.toFixed(0)}px clear)</span></div>
      ${t ? `<div class="rv-stat"><b class="${t.label.cls}">${t.frames.toFixed(1)}f</b><span>margin — ${t.label.text}</span></div>` : ''}
    </div>`

    html += `<div class="rv-sec">By window height</div><table class="rv-table">`
    for (const h of r.heights) {
      html += `<tr><td>${h.h}px</td><td>` + (h.ok
        ? `<span class="${h.label.cls}">${h.band.toFixed(1)}px — ${h.frames.toFixed(1)} frames, ${h.label.text}</span>`
        : `<span class="bad" style="color:#f87171">dies at column ${h.diedAt}</span>`) + `</td></tr>`
    }
    html += `</table>`
  }
  el.innerHTML = html
}

// ── Play / copy ───────────────────────────────────────

function rvRuntime(lv) {
  const base = { name: lv.name || 'SUBMISSION', diff: lv.diff || 'easy', speed: lv.speed || 200, custom: true }
  if ((lv.game || 'wavegauntlet') === 'wavegauntlet') {
    return { ...base, gen(h) {
      return {
        clearAt: lv.clearAt,
        keyframes: (lv.keyframes || []).map(k => ({ at:k.at, cf:k.cf, gapH:k.gapHf * h })),
        deco: lv.deco || [],
      }
    }}
  }
  return { ...base, gen() {
    return { clearAt: lv.clearAt, obstacles: (lv.obstacles || []).map(o => ({ ...o })), deco: lv.deco || [] }
  }}
}

window.rvPlay = function() {
  const it = RV.items[RV.sel]; if (!it) { rvMsg('Nothing selected.'); return }
  const lv = it.lv
  const host = document.getElementById('rv-testhost')
  host.classList.add('on')
  document.getElementById('rv-test-title').textContent = lv.name || 'submission'
  const wave = (lv.game || 'wavegauntlet') === 'wavegauntlet'
  document.getElementById('g43-canvas').style.display = wave ? 'block' : 'none'
  document.getElementById('spd-canvas').style.display = wave ? 'none' : 'block'
  // Runs in noclip so a bad level can be watched all the way through
  setTimeout(() => {
    if (wave) window.g43TestLevel(rvRuntime(lv))
    else      window.spdTestLevel(rvRuntime(lv))
  }, 30)
}

window.rvStopTest = function() {
  if (typeof stopGame43 === 'function') stopGame43()
  if (typeof stopSpider === 'function') stopSpider()
  document.getElementById('rv-testhost').classList.remove('on')
}

window.rvCopyJSON = function() {
  const it = RV.items[RV.sel]; if (!it) return
  const s = JSON.stringify(it.lv, null, 2)
  navigator.clipboard?.writeText(s); console.log(s)
  rvMsg('📋 JSON copied.')
}

// The pool entry, ready to paste into G43_POOL / SPD_POOL
window.rvCopyJS = function() {
  const it = RV.items[RV.sel]; if (!it) return
  const lv = it.lv
  const p = n => (Math.round(n * 10000) / 10000)
  const decoSrc = (lv.deco && lv.deco.length)
    ? ',\n          deco:[\n' + lv.deco.map(d => {
        const b = [`t:'${d.t}'`, `col:${Math.round(d.col)}`, `cf:${p(d.cf ?? 0.5)}`,
                   `w:${Math.round(d.w ?? 60)}`, `hf:${p(d.hf ?? 0.12)}`,
                   `c:${d.c ?? 0}`, `a:${p(d.a ?? 0.22)}`]
        if (d.rot) b.push(`rot:${Math.round(d.rot)}`)
        if (d.tx)  b.push(`tx:'${String(d.tx).replace(/'/g, "\\'")}'`)
        if (d.mk && d.mk.length) {
          b.push('mk:[' + d.mk.map(k => {
            const kb = [`t:${p(k.t)}`]
            if (k.dx)  kb.push(`dx:${p(k.dx)}`)
            if (k.dy)  kb.push(`dy:${p(k.dy)}`)
            if (k.rot) kb.push(`rot:${p(k.rot)}`)
            if (k.a != null) kb.push(`a:${p(k.a)}`)
            return '{' + kb.join(',') + '}'
          }).join(',') + ']')
          if ((d.mkSpeed ?? 1) !== 1) b.push(`mkSpeed:${p(d.mkSpeed)}`)
        }
        return '            {' + b.join(', ') + '},'
      }).join('\n') + '\n          ]'
    : ''

  let src
  if ((lv.game || 'wavegauntlet') === 'wavegauntlet') {
    src = `    {
      name:'${String(lv.name || 'SUBMISSION').replace(/'/g, "\\'")}', diff:'${lv.diff}', speed:${lv.speed},
      gen(h) {
        // Submitted level, reviewed in review.html
        return { clearAt:${lv.clearAt}, keyframes:[
${(lv.keyframes || []).map(k => `          {at:${Math.round(k.at)}, cf:${p(k.cf)}, gapH:h*${p(k.gapHf)}},`).join('\n')}
        ]${decoSrc}}
      }
    },`
  } else {
    src = `    {
      name:'${String(lv.name || 'SUBMISSION').replace(/'/g, "\\'")}', diff:'${lv.diff}', speed:${lv.speed},
      gen() {
        // Submitted level, reviewed in review.html
        return { clearAt:${lv.clearAt}, obstacles:[
${(lv.obstacles || []).map(o => `          {col:${Math.round(o.col)}, floor:${!!o.floor}},`).join('\n')}
        ]${decoSrc}}
      }
    },`
  }
  navigator.clipboard?.writeText(src); console.log(src)
  rvMsg('📋 Pool entry copied — paste it into the tier in game43.js / game44.js.')
}

document.addEventListener('DOMContentLoaded', () => {
  rvLoad(); rvRenderList(); rvRenderReport(); rvRenderAuth()
  // Restore a session if there is one, then pull the queue
  if (_rvSb) {
    _rvSb.auth.getSession().then(({ data }) => {
      if (data && data.session) { RV.user = data.session.user; rvRenderAuth(); rvFetch() }
    }).catch(() => {})
  }
  // Paste straight into the box and hit Ctrl/Cmd+Enter to add
  const box = document.getElementById('rv-paste')
  box.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); rvAdd() }
  })

  const fileIn = document.getElementById('rv-file')
  if (fileIn) fileIn.addEventListener('change', e => { rvFiles(e.target.files); e.target.value = '' })

  // Drop a .json anywhere on the page
  const stop = e => { e.preventDefault(); e.stopPropagation() }
  document.addEventListener('dragover', e => { stop(e); document.body.classList.add('rv-dragging') })
  document.addEventListener('dragleave', e => { stop(e); document.body.classList.remove('rv-dragging') })
  document.addEventListener('drop', e => {
    stop(e); document.body.classList.remove('rv-dragging')
    rvFiles(e.dataTransfer && e.dataTransfer.files)
  })
})
