// ═══════════════════════════════════════════════════════
//  LEVEL EDITOR — Wave Gauntlet (43) + Spider (44)
//  Local dev tool (editor.html). Drafts live in localStorage;
//  Publish pushes to Supabase so every player gets the level.
//  Undo/redo, a restorable trash, and revert-to-original are in
//  the "Restore" section.
//
//  Level data format (shared, resolution-independent):
//    wavegauntlet: { keyframes:[{at, cf, gapHf}], clearAt }
//    spider:       { obstacles:[{col, floor}],    clearAt }
//  cf and gapHf are fractions of canvas height, so a level
//  authored on one screen plays the same on another.
// ═══════════════════════════════════════════════════════

// This file only ever loads from editor.html, which is NOT linked from
// the site — it's a local dev tool. Access control is "it's on your
// machine". Publishing to Supabase is separately gated by the RLS policy
// in sql/custom_levels.sql, which must list your account's email.
const ED_LS_KEY = 'qg_editor_drafts_v1'

const ED_SB_URL = 'https://kuvpxhuvednptyfqccea.supabase.co'
const ED_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dnB4aHV2ZWRucHR5ZnFjY2VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjY4MTcsImV4cCI6MjA5MDQ0MjgxN30.tYb15AI3DfwSjYrYrLVUPhOJjh8tfAvglPGXmunEA4k'

const _sb = (typeof supabase !== 'undefined')
  ? supabase.createClient(ED_SB_URL, ED_SB_KEY) : null
let ED_USER = null

const ED_DIFFS = {
  wavegauntlet: ['easy','medium','hard','extreme','fp','dc'],
  spider:       ['easy','medium','hard','extreme'],
}
const ED_DIFF_COL = {
  easy:'#4ade80', medium:'#fbbf24', hard:'#f87171',
  extreme:'#fb923c', fp:'#c084fc', dc:'#ef4444', boss:'#ef4444',
}

// The built-in pools live in game43.js / game44.js as top-level consts
function _edBuiltins() {
  if (ED.game === 'wavegauntlet') return (typeof G43_POOL !== 'undefined') ? G43_POOL : {}
  return (typeof SPD_POOL !== 'undefined') ? SPD_POOL : {}
}

// Height to bake gen() against. Built-in gens mix fractions with pixel
// clamps, so using the real canvas height reproduces what actually plays.
function _edRefHeight() {
  const id = ED.game === 'wavegauntlet' ? 'g43-canvas' : 'spd-canvas'
  const c  = document.getElementById(id)
  return (c && c.height > 50) ? c.height
       : (c && c.parentElement && c.parentElement.clientHeight > 50) ? c.parentElement.clientHeight
       : 400
}

const ED = {
  game:'wavegauntlet',
  levels:[],            // drafts, from localStorage
  published:[],         // rows from Supabase
  sel:-1,               // index into ED.levels
  drag:null,            // {type, i}
  scroll:0,             // horizontal scroll in columns
  zoom:1,               // px per column
  msg:'',
  undo:[], redo:[],     // full-state snapshots
  trash:[],             // deleted drafts, restorable
}

// ── Undo / redo ───────────────────────────────────────
// Snapshots the whole draft list, so it covers edits, creates,
// deletes and imports uniformly. Call BEFORE mutating.

const ED_UNDO_MAX  = 60
const ED_TRASH_KEY = 'qg_editor_trash_v1'
const ED_TRASH_MAX = 30

function _edClone(x) { return JSON.parse(JSON.stringify(x)) }

function _edPush() {
  const snap = { levels:_edClone(ED.levels), sel:ED.sel }
  const prev = ED.undo[ED.undo.length - 1]
  // Skip if nothing actually changed since the last snapshot
  if (prev && JSON.stringify(prev.levels) === JSON.stringify(snap.levels)) return
  ED.undo.push(snap)
  if (ED.undo.length > ED_UNDO_MAX) ED.undo.shift()
  ED.redo.length = 0
  _edRenderRestore()
}

function _edApply(snap) {
  ED.levels = _edClone(snap.levels)
  ED.sel    = Math.min(snap.sel, ED.levels.length - 1)
  _edSaveDrafts(); _edRender()
}

window.edUndo = function() {
  if (!ED.undo.length) { _edSetMsg('Nothing to undo.'); return }
  ED.redo.push({ levels:_edClone(ED.levels), sel:ED.sel })
  _edApply(ED.undo.pop())
  _edSetMsg('↩ Undone.')
}

window.edRedo = function() {
  if (!ED.redo.length) { _edSetMsg('Nothing to redo.'); return }
  ED.undo.push({ levels:_edClone(ED.levels), sel:ED.sel })
  _edApply(ED.redo.pop())
  _edSetMsg('↪ Redone.')
}

// ── Trash (deleted drafts) ────────────────────────────

function _edLoadTrash() {
  try {
    const raw = localStorage.getItem(ED_TRASH_KEY)
    ED.trash = raw ? JSON.parse(raw) : []
  } catch { ED.trash = [] }
  if (!Array.isArray(ED.trash)) ED.trash = []
}

function _edSaveTrash() {
  try { localStorage.setItem(ED_TRASH_KEY, JSON.stringify(ED.trash)) } catch {}
}

window.edRestoreTrash = function(i) {
  const item = ED.trash[i]; if (!item) return
  _edPush()
  ED.levels.push(item.lv)
  ED.sel = ED.levels.length - 1
  ED.game = item.lv.game || ED.game
  ED.trash.splice(i, 1)
  _edSaveTrash(); _edTouch()
  document.querySelectorAll('.ed-gametab').forEach(b =>
    b.classList.toggle('active', b.dataset.game === ED.game))
  _edRender()
  _edSetMsg(`Restored "${item.lv.name}".`)
}

window.edEmptyTrash = function() {
  if (!ED.trash.length) return
  if (!confirm(`Permanently delete ${ED.trash.length} item(s) from the trash?`)) return
  ED.trash = []; _edSaveTrash(); _edRenderRestore()
  _edSetMsg('Trash emptied.')
}

// ── Revert an edited built-in to its original ─────────

window.edRevert = function() {
  const lv = _edCur(); if (!lv) return
  if (!lv.overrides) { _edSetMsg('⚠ This is not a copy of a built-in — nothing to revert to.'); return }
  const pools = _edBuiltins()
  let found = null, foundKey = null
  for (const key of ED_DIFFS[ED.game]) {
    const i = (pools[key] || []).findIndex(t => t.name === lv.overrides)
    if (i >= 0) { found = pools[key][i]; foundKey = key; break }
  }
  if (!found) { _edSetMsg(`⚠ Built-in "${lv.overrides}" no longer exists.`); return }
  // Restores shape, speed and length from the built-in but keeps your
  // name and tuning, since those are usually deliberate.
  if (!confirm(`Reload the shape, speed and length of "${lv.overrides}" from the built-in?\n\nYour name and tuning are kept. Ctrl+Z undoes this.`)) return

  _edPush()
  const H = _edRefHeight()
  const d = found.gen(H)
  lv.diff    = found.diff || foundKey
  lv.speed   = found.speed
  lv.clearAt = Math.round(d.clearAt)
  if (ED.game === 'wavegauntlet') {
    lv.keyframes = (d.keyframes || []).map(k => ({
      at: Math.round(k.at), cf: +k.cf.toFixed(4), gapHf: +(k.gapH / H).toFixed(4),
    }))
  } else {
    lv.obstacles = (d.obstacles || []).map(o => ({ col: Math.round(o.col), floor: !!o.floor }))
  }
  _edTouch(); _edRender()
  _edSetMsg(`↺ Reverted to the original "${lv.overrides}".`)
}

function _edRenderRestore() {
  const u = document.getElementById('ed-undo-count')
  if (u) u.textContent = ED.undo.length ? `(${ED.undo.length})` : ''
  const el = document.getElementById('ed-trash')
  if (!el) return
  if (!ED.trash.length) { el.innerHTML = '<div class="ed-empty">Trash is empty.</div>'; return }
  el.innerHTML = ED.trash.map((t, i) => {
    const col = ED_DIFF_COL[t.lv.diff] || '#888'
    const when = new Date(t.at).toLocaleString()
    return `<div class="ed-item" title="Deleted ${_edEsc(when)}">
      <span class="ed-item-diff" style="background:${col}"></span>
      <span class="ed-item-name">${_edEsc(t.lv.name)}</span>
      <button class="ed-mini" onclick="edRestoreTrash(${i})">Restore</button>
    </div>`
  }).join('')
}

// ── Sign-in (only needed to publish) ──────────────────

function _edRenderAuth() {
  const el = document.getElementById('ed-auth')
  if (!el) return
  if (ED_USER) {
    el.innerHTML = `<span style="color:var(--success)">✓ ${_edEsc(ED_USER.email)}</span>
      <button class="ed-mini" onclick="edSignOut()">Sign out</button>`
  } else {
    el.innerHTML = `<input id="ed-em" type="email" placeholder="email" autocomplete="username">
      <input id="ed-pw" type="password" placeholder="password" autocomplete="current-password">
      <button class="ed-mini" onclick="edSignIn()">Sign in to publish</button>`
    el.querySelector('#ed-pw').onkeydown = e => { if (e.key === 'Enter') edSignIn() }
  }
}

window.edSignIn = async function() {
  if (!_sb) { _edSetMsg('⚠ Supabase library did not load (offline?).'); return }
  const email = document.getElementById('ed-em').value.trim()
  const pw    = document.getElementById('ed-pw').value
  if (!email || !pw) { _edSetMsg('⚠ Enter email and password.'); return }
  _edSetMsg('Signing in…')
  const { data, error } = await _sb.auth.signInWithPassword({ email, password: pw })
  if (error) { _edSetMsg('⚠ ' + error.message); return }
  ED_USER = data.user
  _edSetMsg('✓ Signed in as ' + ED_USER.email)
  _edRenderAuth(); _edRefreshPublished()
}

window.edSignOut = async function() {
  if (_sb) await _sb.auth.signOut()
  ED_USER = null
  _edRenderAuth()
}

// ── Persistence ───────────────────────────────────────

function _edLoadDrafts() {
  try {
    const raw = localStorage.getItem(ED_LS_KEY)
    ED.levels = raw ? JSON.parse(raw) : []
  } catch { ED.levels = [] }
  if (!Array.isArray(ED.levels)) ED.levels = []
}

function _edSaveDrafts() {
  try { localStorage.setItem(ED_LS_KEY, JSON.stringify(ED.levels)) }
  catch (e) { _edSetMsg('⚠ Could not save drafts: ' + e.message) }
}

// ── Published levels (Supabase) ───────────────────────
// The live site loads these via js/customlevels.js. In the editor we
// mirror them into the same global so Test Play sees overrides too.

window.QG_CUSTOM_LEVELS = { wavegauntlet: [], spider: [] }

function _edRowToLevel(row) {
  return {
    id: row.id, name: row.name, diff: row.diff,
    speed: row.speed, clearAt: row.clear_at,
    ...(row.data || {}),
    custom: true,
  }
}

function _edLevelToRow(lv) {
  const data = ED.game === 'wavegauntlet'
    ? { keyframes: lv.keyframes }
    : { obstacles: lv.obstacles }
  if (lv.overrides) data.overrides = lv.overrides
  if (lv.miniWave)  data.miniWave  = true
  data.rank     = lv.rank     ?? 20
  data.minScore = lv.minScore ?? 0
  data.maxScore = lv.maxScore ?? 0
  data.weight   = lv.weight   ?? 1
  return {
    game: ED.game, name: lv.name, diff: lv.diff,
    speed: Math.round(lv.speed), clear_at: Math.round(lv.clearAt),
    data, author_id: ED_USER ? ED_USER.id : null,
  }
}

// ── Level creation ────────────────────────────────────

// Tuning defaults shared by both games:
//   rank     0–100 difficulty label (cosmetic + sorts the list)
//   minScore level only starts appearing at this score
//   maxScore level stops appearing after this score (0 = never stops)
//   weight   relative chance vs other eligible levels (1 = normal)
const ED_TUNING = { rank:20, minScore:0, maxScore:0, weight:1 }

function _edNewLevel(game) {
  if (game === 'wavegauntlet') {
    return {
      game, name:'NEW LEVEL', diff:'easy', speed:160, clearAt:800, ...ED_TUNING,
      keyframes:[
        { at:0,   cf:0.50, gapHf:0.50 },
        { at:200, cf:0.50, gapHf:0.50 },
        { at:500, cf:0.35, gapHf:0.45 },
        { at:800, cf:0.50, gapHf:0.50 },
      ],
    }
  }
  return {
    game, name:'NEW LEVEL', diff:'easy', speed:170, clearAt:900, ...ED_TUNING,
    obstacles:[
      { col:240, floor:false },
      { col:440, floor:true  },
      { col:640, floor:false },
    ],
  }
}

// Rough 0–100 rank for a built-in, from its tier and speed
function _edGuessRank(diff, speed) {
  const base = { easy:10, medium:30, hard:55, extreme:75, fp:90, dc:95, boss:95 }[diff] ?? 30
  return Math.max(0, Math.min(100, Math.round(base + (speed - 250) / 20)))
}

// ── Loading a built-in level for editing ──────────────
// Built-ins are gen(h) functions, some with randomness. We run one
// at the real canvas height to bake out a concrete, editable copy.

window.edLoadBuiltin = function(diffKey, idx) {
  const tmpl = (_edBuiltins()[diffKey] || [])[idx]
  if (!tmpl) return
  const H = _edRefHeight()
  let d
  try { d = tmpl.gen(H) }
  catch (e) { _edSetMsg('⚠ Could not read that level: ' + e.message); return }

  const diff = tmpl.diff || diffKey
  _edPush()
  const lv = {
    game:    ED.game,
    name:    tmpl.name,
    diff,
    speed:   tmpl.speed,
    clearAt: Math.round(d.clearAt),
    ...ED_TUNING,
    rank:      _edGuessRank(diff, tmpl.speed),
    overrides: tmpl.name,      // publishing this replaces the built-in
  }
  if (tmpl.miniWave) lv.miniWave = true

  if (ED.game === 'wavegauntlet') {
    lv.keyframes = (d.keyframes || []).map(k => ({
      at: Math.round(k.at), cf: +k.cf.toFixed(4), gapHf: +(k.gapH / H).toFixed(4),
    }))
  } else {
    lv.obstacles = (d.obstacles || []).map(o => ({ col: Math.round(o.col), floor: !!o.floor }))
  }

  ED.levels.push(lv)
  ED.sel = ED.levels.length - 1
  _edTouch(); _edRender()
  _edSetMsg(`Loaded "${tmpl.name}" — publishing replaces the original for everyone.`)
}

function _edRenderBuiltins() {
  const el = document.getElementById('ed-builtin')
  if (!el) return
  const pools = _edBuiltins()
  const overridden = new Set(
    ((window.QG_CUSTOM_LEVELS && window.QG_CUSTOM_LEVELS[ED.game]) || [])
      .map(l => l.overrides).filter(Boolean))

  const rows = []
  for (const key of ED_DIFFS[ED.game]) {
    for (let i = 0; i < (pools[key] || []).length; i++) {
      const t = pools[key][i]
      const col = ED_DIFF_COL[t.diff || key] || '#888'
      const tag = overridden.has(t.name)
        ? '<span class="ed-ovr" title="Replaced by a published edit">edited</span>' : ''
      rows.push(`<div class="ed-item" onclick="edLoadBuiltin('${key}',${i})">
        <span class="ed-item-diff" style="background:${col}"></span>
        <span class="ed-item-name">${_edEsc(t.name)}</span>${tag}
      </div>`)
    }
  }
  el.innerHTML = rows.length ? rows.join('') : '<div class="ed-empty">No built-ins found.</div>'
}

// ── Page lifecycle ────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  _edLoadDrafts()
  _edLoadTrash()
  if (ED.sel < 0) ED.sel = ED.levels.findIndex(l => l.game === ED.game)
  // Restore an existing Supabase session if there is one
  if (_sb) {
    try {
      const { data } = await _sb.auth.getSession()
      ED_USER = data?.session?.user || null
    } catch { ED_USER = null }
  }
  _edRenderAuth()
  _edRefreshPublished()
  _edRender()
  _edBindCanvas()
})

async function _edRefreshPublished() {
  if (!_sb) return
  try {
    const { data, error } = await _sb.from('custom_levels')
      .select('*').eq('game', ED.game).order('created_at', { ascending:false })
    ED.published = (error || !data) ? [] : data
  } catch { ED.published = [] }
  // Mirror into the shared global so Test Play sees the same overrides
  // and score gates the live site would apply.
  window.QG_CUSTOM_LEVELS[ED.game] = ED.published.map(_edRowToLevel)
  _edRenderPublished()
  _edRenderBuiltins()
}

// ── UI rendering ──────────────────────────────────────

function _edSetMsg(m) {
  ED.msg = m
  const el = document.getElementById('ed-msg')
  if (el) el.textContent = m
  if (m) setTimeout(() => { if (ED.msg === m) { ED.msg = ''; if (el) el.textContent = '' } }, 4000)
}

function _edCur() { return ED.levels[ED.sel] || null }

function _edRender() {
  _edRenderRestore()
  _edRenderList()
  _edRenderBuiltins()
  _edRenderProps()
  _edRenderPublished()
  _edDraw()
}

function _edRenderList() {
  const el = document.getElementById('ed-list')
  if (!el) return
  const mine = ED.levels.filter(l => l.game === ED.game)
  if (!mine.length) {
    el.innerHTML = '<div class="ed-empty">No drafts yet — hit <b>+ New</b>.</div>'
    return
  }
  el.innerHTML = ED.levels.map((l, i) => {
    if (l.game !== ED.game) return ''
    const col = ED_DIFF_COL[l.diff] || '#888'
    const pub = l.publishedId ? '<span class="ed-pub-dot" title="Published">●</span>' : ''
    const ovr = l.overrides ? '<span class="ed-ovr" title="Replaces built-in">edit</span>' : ''
    return `<div class="ed-item ${i === ED.sel ? 'active' : ''}" onclick="edSelect(${i})">
      <span class="ed-item-diff" style="background:${col}"></span>
      <span class="ed-item-name">${_edEsc(l.name)}</span>
      <span class="ed-rank" style="color:${_edRankCol(l.rank ?? 20)}">${l.rank ?? 20}</span>${ovr}${pub}
    </div>`
  }).join('')
}

function _edRenderProps() {
  const el = document.getElementById('ed-props')
  if (!el) return
  const lv = _edCur()
  if (!lv || lv.game !== ED.game) { el.innerHTML = '<div class="ed-empty">Select a level.</div>'; return }
  const diffs = ED_DIFFS[ED.game].map(d =>
    `<option value="${d}" ${d === lv.diff ? 'selected' : ''}>${d.toUpperCase()}</option>`).join('')
  const rank = lv.rank ?? 20
  el.innerHTML = `
    <label>Name<input id="ed-f-name" value="${_edEsc(lv.name)}" maxlength="20"></label>
    <label>Tier <span class="ed-hint">colour + practice group</span><select id="ed-f-diff">${diffs}</select></label>
    <label>Speed <span class="ed-hint">px/sec</span><input id="ed-f-speed" type="number" min="40" max="600" value="${lv.speed}"></label>
    <label>Length <span class="ed-hint">columns</span><input id="ed-f-clear" type="number" min="200" max="4000" step="10" value="${lv.clearAt}"></label>

    <div class="ed-sep">Appearance</div>

    <label>Difficulty <b id="ed-rank-out" style="color:${_edRankCol(rank)}">${rank}</b><span class="ed-hint">/ 100</span>
      <input id="ed-f-rank" type="range" min="0" max="100" value="${rank}"></label>
    <label>Starts at score<input id="ed-f-min" type="number" min="0" max="999" value="${lv.minScore ?? 0}"></label>
    <label>Stops after score <span class="ed-hint">0 = never</span><input id="ed-f-max" type="number" min="0" max="999" value="${lv.maxScore ?? 0}"></label>
    <label>Chance weight <span class="ed-hint">1 = normal, 3 = 3× as likely</span>
      <input id="ed-f-weight" type="number" min="0.1" max="20" step="0.1" value="${lv.weight ?? 1}"></label>
    <div class="ed-hint" id="ed-window-note">${_edWindowNote(lv)}</div>
  `
  const q = s => el.querySelector(s)
  q('#ed-f-name').oninput   = e => { lv.name = e.target.value; _edTouch(); _edRenderList() }
  q('#ed-f-diff').onchange  = e => { lv.diff = e.target.value; _edTouch(); _edRenderList(); _edDraw() }
  q('#ed-f-speed').oninput  = e => { lv.speed = +e.target.value || 150; _edTouch(); _edDraw() }
  q('#ed-f-clear').oninput  = e => { lv.clearAt = +e.target.value || 800; _edTouch(); _edDraw() }
  q('#ed-f-rank').oninput   = e => {
    lv.rank = +e.target.value
    const out = q('#ed-rank-out')
    out.textContent = lv.rank; out.style.color = _edRankCol(lv.rank)
    _edTouch()
  }
  q('#ed-f-min').oninput    = e => { lv.minScore = Math.max(0, +e.target.value || 0); _edTouch(); q('#ed-window-note').textContent = _edWindowNote(lv) }
  q('#ed-f-max').oninput    = e => { lv.maxScore = Math.max(0, +e.target.value || 0); _edTouch(); q('#ed-window-note').textContent = _edWindowNote(lv) }
  q('#ed-f-weight').oninput = e => { lv.weight = Math.max(0.1, +e.target.value || 1); _edTouch() }

  // One undo entry per field-editing session, taken before the first keystroke
  el.querySelectorAll('input, select').forEach(i => i.addEventListener('focus', _edPush))
}

function _edRankCol(r) {
  if (r < 25) return '#4ade80'
  if (r < 50) return '#fbbf24'
  if (r < 70) return '#f87171'
  if (r < 88) return '#fb923c'
  return '#c084fc'
}

function _edWindowNote(lv) {
  const lo = lv.minScore ?? 0, hi = lv.maxScore ?? 0
  if (!lo && !hi) return 'Appears at any score.'
  if (lo && !hi)  return `Appears once the player has cleared ${lo}+.`
  if (!lo && hi)  return `Only appears up to score ${hi}.`
  if (lo > hi)    return `⚠ Starts at ${lo} but stops after ${hi} — this level will never appear.`
  return `Appears between score ${lo} and ${hi}.`
}

function _edRenderPublished() {
  const el = document.getElementById('ed-published')
  if (!el) return
  if (!ED.published.length) {
    el.innerHTML = '<div class="ed-empty">Nothing published for this game yet.</div>'
    return
  }
  el.innerHTML = ED.published.map(r => {
    const col = ED_DIFF_COL[r.diff] || '#888'
    return `<div class="ed-item">
      <span class="ed-item-diff" style="background:${col}"></span>
      <span class="ed-item-name">${_edEsc(r.name)}</span>
      <button class="ed-mini danger" onclick="edUnpublish('${r.id}')">✕</button>
    </div>`
  }).join('')
}

function _edEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}

function _edTouch() { _edSaveDrafts() }

// ── Toolbar actions ───────────────────────────────────

window.edSetGame = function(g) {
  ED.game = g
  ED.sel  = ED.levels.findIndex(l => l.game === g)
  ED.scroll = 0
  document.querySelectorAll('.ed-gametab').forEach(b =>
    b.classList.toggle('active', b.dataset.game === g))
  _edRefreshPublished()
  _edRender()
}

window.edSelect = function(i) { ED.sel = i; ED.scroll = 0; _edRender() }

window.edNew = function() {
  _edPush()
  ED.levels.push(_edNewLevel(ED.game))
  ED.sel = ED.levels.length - 1
  _edTouch(); _edRender()
}

window.edDuplicate = function() {
  const lv = _edCur(); if (!lv) return
  _edPush()
  const copy = JSON.parse(JSON.stringify(lv))
  copy.name = (copy.name + ' COPY').slice(0, 20)
  delete copy.publishedId
  ED.levels.push(copy)
  ED.sel = ED.levels.length - 1
  _edTouch(); _edRender()
}

window.edDelete = function() {
  const lv = _edCur(); if (!lv) return
  if (!confirm(`Delete draft "${lv.name}"?\n\nIt goes to the trash and can be restored. Any published copy stays live.`)) return
  _edPush()
  ED.trash.unshift({ lv:_edClone(lv), at:Date.now() })
  if (ED.trash.length > ED_TRASH_MAX) ED.trash.length = ED_TRASH_MAX
  _edSaveTrash()
  ED.levels.splice(ED.sel, 1)
  ED.sel = ED.levels.findIndex(l => l.game === ED.game)
  _edTouch(); _edRender()
  _edSetMsg(`Moved "${lv.name}" to the trash.`)
}

// Test Play runs the REAL game against a hidden host that carries the
// canvas ids game43/game44 expect. Same physics as the live site.
window.edTestPlay = async function() {
  const lv = _edCur(); if (!lv) return
  const built = _edBuildRuntime(lv)
  const wave  = ED.game === 'wavegauntlet'

  _edUnbindCanvas()
  document.getElementById('ed-testhost').classList.add('on')
  document.getElementById('ed-test-title').textContent = `${lv.name} — ${lv.diff.toUpperCase()}`
  document.getElementById('g43-canvas').style.display = wave ? 'block' : 'none'
  document.getElementById('spd-canvas').style.display = wave ? 'none'  : 'block'
  document.getElementById('g43-score-hud').style.display = wave ? '' : 'none'
  document.getElementById('spd-score-hud').style.display = wave ? 'none' : ''

  try {
    if (wave) { await initGame43(); window.g43TestLevel(built) }
    else      { await initSpider(); window.spdTestLevel(built) }
  } catch (e) {
    console.error('[editor] test play failed', e)
    _edSetMsg('⚠ Test play failed: ' + e.message)
    edStopTest()
  }
}

window.edStopTest = function() {
  try { if (typeof stopGame43 === 'function') stopGame43() } catch {}
  try { if (typeof stopSpider === 'function') stopSpider() } catch {}
  document.getElementById('ed-testhost').classList.remove('on')
  _edBindCanvas()
  _edDraw()
}

// Runtime level: same shape the game pools use
function _edBuildRuntime(lv) {
  const base = { name: lv.name, diff: lv.diff, speed: lv.speed, custom: true }
  if (lv.game === 'wavegauntlet') {
    return { ...base, gen(h) {
      return {
        clearAt: lv.clearAt,
        keyframes: lv.keyframes.map(k => ({ at:k.at, cf:k.cf, gapH:k.gapHf * h })),
      }
    }}
  }
  return { ...base, gen() {
    return { clearAt: lv.clearAt, obstacles: lv.obstacles.map(o => ({ ...o })) }
  }}
}

window.edPublish = async function() {
  const lv = _edCur(); if (!lv) return
  if (!_sb) { _edSetMsg('⚠ Supabase library did not load.'); return }
  if (!ED_USER) { _edSetMsg('⚠ Sign in first (top right) to publish.'); return }
  const warn = _edValidate(lv)
  if (warn && !confirm(warn + '\n\nPublish anyway?')) return
  _edSetMsg('Publishing…')
  try {
    const row = _edLevelToRow(lv)
    let res
    if (lv.publishedId) {
      res = await _sb.from('custom_levels').update(row).eq('id', lv.publishedId).select().maybeSingle()
    } else {
      res = await _sb.from('custom_levels').insert(row).select().maybeSingle()
    }
    if (res.error) {
      const m = res.error.message || ''
      _edSetMsg(/row-level security|policy/i.test(m)
        ? `⚠ Server rejected the write. Add "${ED_USER.email}" to the policy in sql/custom_levels.sql and re-run it in Supabase.`
        : '⚠ ' + m)
      return
    }
    if (res.data) lv.publishedId = res.data.id
    _edTouch()
    _edSetMsg('✅ Published — live for everyone.')
    await _edRefreshPublished()
    _edRenderList()
  } catch (e) { _edSetMsg('⚠ ' + e.message) }
}

window.edUnpublish = async function(id) {
  if (!confirm('Remove this level for all players?')) return
  try {
    const { error } = await _sb.from('custom_levels').delete().eq('id', id)
    if (error) { _edSetMsg('⚠ ' + error.message); return }
    for (const l of ED.levels) if (l.publishedId === id) delete l.publishedId
    _edTouch()
    _edSetMsg('Removed.')
    await _edRefreshPublished()
    _edRenderList()
  } catch (e) { _edSetMsg('⚠ ' + e.message) }
}

window.edExport = function() {
  const lv = _edCur(); if (!lv) return
  const json = JSON.stringify(lv, null, 2)
  navigator.clipboard?.writeText(json)
  _edSetMsg('📋 Level JSON copied to clipboard.')
  console.log(json)
}

// Emit a pool entry you can paste straight into game43.js / game44.js
window.edExportCode = function() {
  const lv = _edCur(); if (!lv) return
  const p = n => Number(n.toFixed(4))
  let body
  if (lv.game === 'wavegauntlet') {
    const kf = lv.keyframes.map(k =>
      `          {at:${k.at}, cf:${p(k.cf)}, gapH:h*${p(k.gapHf)}},`).join('\n')
    body =
`    {
      name:'${lv.name}', diff:'${lv.diff}', speed:${Math.round(lv.speed)},
      gen(h) {
        return { clearAt:${Math.round(lv.clearAt)}, keyframes:[
${kf}
        ]}
      }
    },`
  } else {
    const obs = lv.obstacles.map(o =>
      `          {col:${o.col}, floor:${!!o.floor}},`).join('\n')
    body =
`    {
      name:'${lv.name}', diff:'${lv.diff}', speed:${Math.round(lv.speed)},
      gen(h) {
        return { clearAt:${Math.round(lv.clearAt)}, obstacles:[
${obs}
        ]}
      }
    },`
  }
  const target = lv.game === 'wavegauntlet' ? 'G43_POOL' : 'SPD_POOL'
  navigator.clipboard?.writeText(body)
  _edSetMsg(`📋 JS copied — paste into ${target}.${lv.diff} in js/${lv.game === 'wavegauntlet' ? 'game43' : 'game44'}.js`)
  console.log(body)
}

window.edImport = function() {
  const raw = prompt('Paste level JSON:')
  if (!raw) return
  try {
    const lv = JSON.parse(raw)
    if (!lv.game) lv.game = ED.game
    _edPush()
    delete lv.publishedId
    ED.levels.push(lv)
    ED.sel = ED.levels.length - 1
    _edTouch(); _edRender()
    _edSetMsg('Imported.')
  } catch (e) { _edSetMsg('⚠ Bad JSON: ' + e.message) }
}

// ── Validation (catches impossible levels) ────────────
// Wave: the wave climbs at a fixed 255px/s vertically while the
// level scrolls at `speed` px/s. Over N columns it can cover at
// most 255/speed*N px — with 15% slack for reaction time.

function _edValidate(lv) {
  const problems = []
  if (lv.game === 'wavegauntlet') {
    const kfs = lv.keyframes
    const H = 400   // reference height for px estimates
    for (let i = 1; i < kfs.length; i++) {
      const cols = kfs[i].at - kfs[i-1].at
      if (cols <= 0) { problems.push(`Keyframe ${i+1} is at or before the previous one.`); continue }
      const dy      = Math.abs(kfs[i].cf - kfs[i-1].cf) * H
      const maxSafe = 255 / lv.speed * cols * 0.85
      if (dy > maxSafe) {
        problems.push(`Keyframes ${i}→${i+1}: corridor moves ${Math.round(dy)}px over ${cols} cols, but the wave can only cover ~${Math.round(maxSafe)}px. Impossible — widen the span or lower the speed.`)
      }
    }
    const minGap = Math.min(...kfs.map(k => k.gapHf * H))
    if (minGap < 20) problems.push(`Tightest gap is ~${Math.round(minGap)}px — the wave is 14px tall, so this is near-unplayable.`)
    if (kfs.length && kfs[kfs.length-1].at < lv.clearAt) {
      problems.push(`Last keyframe is at col ${kfs[kfs.length-1].at} but the level runs to ${lv.clearAt} — the corridor will hold its final shape for the remaining ${lv.clearAt - kfs[kfs.length-1].at} columns.`)
    }
  } else {
    const obs = [...lv.obstacles].sort((a,b) => a.col - b.col)
    // Blocks alternate surfaces, so every switch needs flip time.
    // At `speed` px/s, N columns = N/speed seconds of reaction.
    for (let i = 1; i < obs.length; i++) {
      const cols = obs[i].col - obs[i-1].col
      const secs = cols / lv.speed
      if (obs[i].floor !== obs[i-1].floor && secs < 0.16) {
        problems.push(`Blocks at col ${obs[i-1].col}→${obs[i].col}: only ${secs.toFixed(2)}s to flip surfaces. Under ~0.16s is inhuman — space them out or slow the level.`)
      }
      if (cols === 0) problems.push(`Two blocks sit on top of each other at col ${obs[i].col}.`)
    }
    // The spider always starts on the floor
    if (obs.length && obs[0].floor) {
      const secs = obs[0].col / lv.speed
      if (secs < 0.5) {
        problems.push(`First block is on the FLOOR where the spider spawns, and it arrives in ${secs.toFixed(2)}s. Either make it a ceiling block or move it past col ${Math.ceil(lv.speed * 0.5)}.`)
      }
    }
  }
  return problems.length ? '⚠ Issues found:\n\n• ' + problems.join('\n• ') : ''
}

window.edValidate = function() {
  const lv = _edCur(); if (!lv) return
  const w = _edValidate(lv)
  alert(w || '✅ Looks playable — no timing problems found.')
}

// ── Canvas editing ────────────────────────────────────

function _edCvs() { return document.getElementById('ed-canvas') }

function _edView() {
  const c = _edCvs()
  const lv = _edCur()
  const cols = lv ? lv.clearAt : 800
  return { c, w:c.width, h:c.height, cols, pxPerCol: c.width / Math.max(1, cols) }
}

function _edDraw() {
  const c = _edCvs(); if (!c) return
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  const ctx = c.getContext('2d')
  const lv  = _edCur()
  const w = c.width, h = c.height

  ctx.fillStyle = '#05010a'; ctx.fillRect(0, 0, w, h)
  if (!lv || lv.game !== ED.game) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '14px monospace'; ctx.textAlign = 'center'
    ctx.fillText('Select or create a level', w/2, h/2)
    return
  }

  const col = ED_DIFF_COL[lv.diff] || '#888'
  const ppc = w / Math.max(1, lv.clearAt)

  // Grid every 100 columns
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '9px monospace'; ctx.textAlign = 'left'
  for (let cx = 0; cx <= lv.clearAt; cx += 100) {
    const x = cx * ppc
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    ctx.fillText(cx, x + 3, 10)
  }

  if (lv.game === 'wavegauntlet') _edDrawWave(ctx, lv, w, h, ppc, col)
  else                           _edDrawSpider(ctx, lv, w, h, ppc, col)
}

function _edDrawWave(ctx, lv, w, h, ppc, col) {
  const kfs = lv.keyframes
  if (!kfs.length) return

  // Corridor fill
  ctx.beginPath()
  for (let i = 0; i < kfs.length; i++) {
    const x = kfs[i].at * ppc, y = (kfs[i].cf - kfs[i].gapHf/2) * h
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  for (let i = kfs.length - 1; i >= 0; i--) {
    ctx.lineTo(kfs[i].at * ppc, (kfs[i].cf + kfs[i].gapHf/2) * h)
  }
  ctx.closePath()
  ctx.fillStyle = col + '18'; ctx.fill()

  // Walls
  ctx.strokeStyle = col; ctx.lineWidth = 2
  for (const sign of [-1, 1]) {
    ctx.beginPath()
    kfs.forEach((k, i) => {
      const x = k.at * ppc, y = (k.cf + sign * k.gapHf/2) * h
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  // Center line
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.setLineDash([4,4]); ctx.lineWidth = 1
  ctx.beginPath()
  kfs.forEach((k, i) => {
    const x = k.at * ppc, y = k.cf * h
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke(); ctx.setLineDash([])

  // Handles: center (drag = move corridor) + gap handles (drag = resize)
  kfs.forEach((k, i) => {
    const x = k.at * ppc
    const cy = k.cf * h
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(x, cy, 5, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = col
    for (const sign of [-1, 1]) {
      ctx.beginPath(); ctx.arc(x, (k.cf + sign*k.gapHf/2) * h, 4, 0, Math.PI*2); ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '9px monospace'; ctx.textAlign = 'center'
    ctx.fillText(i + 1, x, cy - 10)
  })
}

function _edDrawSpider(ctx, lv, w, h, ppc, col) {
  const oh = h * 0.44
  ctx.fillStyle = '#150020'
  ctx.fillRect(0, 0, w, 4); ctx.fillRect(0, h-4, w, 4)
  ctx.strokeStyle = col; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(0,4); ctx.lineTo(w,4); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0,h-4); ctx.lineTo(w,h-4); ctx.stroke()

  for (const o of lv.obstacles) {
    const x = o.col * ppc
    const bw = Math.max(4, 26 * ppc)
    const y  = o.floor ? h - oh : 0
    ctx.fillStyle = '#1e0030'; ctx.fillRect(x - bw/2, y, bw, oh)
    ctx.strokeStyle = col; ctx.lineWidth = 2
    const edgeY = o.floor ? h - oh : oh
    ctx.beginPath(); ctx.moveTo(x - bw/2, edgeY); ctx.lineTo(x + bw/2, edgeY); ctx.stroke()
  }

  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '10px monospace'; ctx.textAlign = 'center'
  ctx.fillText('click empty space = add block · click a block = remove · drag = move', w/2, h/2)
}

// ── Mouse interaction ─────────────────────────────────

function _edPos(e) {
  const c = _edCvs()
  const r = c.getBoundingClientRect()
  const t = e.touches ? e.touches[0] : e
  return { x: t.clientX - r.left, y: t.clientY - r.top }
}

function _edDown(e) {
  const lv = _edCur(); if (!lv) return
  e.preventDefault()
  _edPush()
  const { x, y } = _edPos(e)
  const c = _edCvs(), w = c.width, h = c.height
  const ppc = w / Math.max(1, lv.clearAt)

  if (lv.game === 'wavegauntlet') {
    for (let i = 0; i < lv.keyframes.length; i++) {
      const k = lv.keyframes[i], kx = k.at * ppc
      if (Math.abs(x - kx) > 10) continue
      if (Math.abs(y - k.cf * h) < 10)                       { ED.drag = { type:'center', i }; return }
      if (Math.abs(y - (k.cf - k.gapHf/2) * h) < 9)          { ED.drag = { type:'top',    i }; return }
      if (Math.abs(y - (k.cf + k.gapHf/2) * h) < 9)          { ED.drag = { type:'bot',    i }; return }
    }
    // Empty space → insert a keyframe here
    const at = Math.round(x / ppc)
    const cf = Math.max(0.05, Math.min(0.95, y / h))
    const idx = lv.keyframes.findIndex(k => k.at > at)
    const near = idx > 0 ? lv.keyframes[idx-1] : lv.keyframes[0]
    const kf = { at, cf, gapHf: near ? near.gapHf : 0.45 }
    idx < 0 ? lv.keyframes.push(kf) : lv.keyframes.splice(idx, 0, kf)
    ED.drag = { type:'center', i: idx < 0 ? lv.keyframes.length-1 : idx }
    _edTouch(); _edDraw()
    return
  }

  // Spider
  const bw = Math.max(8, 26 * ppc)
  for (let i = 0; i < lv.obstacles.length; i++) {
    if (Math.abs(x - lv.obstacles[i].col * ppc) < bw/2 + 3) {
      ED.drag = { type:'block', i, moved:false }
      return
    }
  }
  lv.obstacles.push({ col: Math.round(x / ppc), floor: y > h/2 })
  lv.obstacles.sort((a,b) => a.col - b.col)
  _edTouch(); _edDraw()
}

function _edMove(e) {
  if (!ED.drag) return
  const lv = _edCur(); if (!lv) return
  e.preventDefault()
  const { x, y } = _edPos(e)
  const c = _edCvs(), w = c.width, h = c.height
  const ppc = w / Math.max(1, lv.clearAt)
  const d = ED.drag

  if (lv.game === 'wavegauntlet') {
    const k = lv.keyframes[d.i]; if (!k) return
    if (d.type === 'center') {
      k.cf = Math.max(0.05, Math.min(0.95, y / h))
      k.at = Math.max(0, Math.round(x / ppc))
      lv.keyframes.sort((a,b) => a.at - b.at)
      ED.drag.i = lv.keyframes.indexOf(k)
    } else {
      const half = Math.abs(y / h - k.cf)
      k.gapHf = Math.max(0.04, Math.min(0.95, half * 2))
    }
  } else {
    const o = lv.obstacles[d.i]; if (!o) return
    d.moved = true
    o.col   = Math.max(0, Math.round(x / ppc))
    o.floor = y > h/2
  }
  _edTouch(); _edDraw()
}

function _edUp() {
  const lv = _edCur()
  const d  = ED.drag
  // Spider: a click without movement removes the block
  if (d && d.type === 'block' && !d.moved && lv) {
    lv.obstacles.splice(d.i, 1)
    _edTouch()
  }
  if (lv && lv.game === 'spider') lv.obstacles.sort((a,b) => a.col - b.col)
  ED.drag = null
  _edDraw()
}

// Right-click a keyframe / block to delete it
function _edContext(e) {
  const lv = _edCur(); if (!lv) return
  e.preventDefault()
  _edPush()
  const { x } = _edPos(e)
  const c = _edCvs()
  const ppc = c.width / Math.max(1, lv.clearAt)

  if (lv.game === 'wavegauntlet') {
    if (lv.keyframes.length <= 2) { _edSetMsg('Need at least 2 keyframes.'); return }
    let best = -1, bestD = 12
    lv.keyframes.forEach((k, i) => {
      const d = Math.abs(x - k.at * ppc)
      if (d < bestD) { bestD = d; best = i }
    })
    if (best >= 0) { lv.keyframes.splice(best, 1); _edTouch(); _edDraw() }
  } else {
    const bw = Math.max(8, 26 * ppc)
    const i = lv.obstacles.findIndex(o => Math.abs(x - o.col * ppc) < bw/2 + 3)
    if (i >= 0) { lv.obstacles.splice(i, 1); _edTouch(); _edDraw() }
  }
}

// Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y) redo
function _edKeys(e) {
  const k = e.key.toLowerCase()
  if (!(e.ctrlKey || e.metaKey)) return
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); edUndo() }
  else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); edRedo() }
}
window.addEventListener('keydown', _edKeys)

let _edBound = false
function _edBindCanvas() {
  const c = _edCvs(); if (!c || _edBound) return
  c.addEventListener('mousedown',  _edDown)
  window.addEventListener('mousemove', _edMove)
  window.addEventListener('mouseup',   _edUp)
  c.addEventListener('touchstart', _edDown, { passive:false })
  window.addEventListener('touchmove', _edMove, { passive:false })
  window.addEventListener('touchend',  _edUp)
  c.addEventListener('contextmenu', _edContext)
  window.addEventListener('resize', _edDraw)
  _edBound = true
}
function _edUnbindCanvas() {
  const c = _edCvs(); if (!c || !_edBound) return
  c.removeEventListener('mousedown',  _edDown)
  window.removeEventListener('mousemove', _edMove)
  window.removeEventListener('mouseup',   _edUp)
  c.removeEventListener('touchstart', _edDown)
  window.removeEventListener('touchmove', _edMove)
  window.removeEventListener('touchend',  _edUp)
  c.removeEventListener('contextmenu', _edContext)
  window.removeEventListener('resize', _edDraw)
  _edBound = false
}
