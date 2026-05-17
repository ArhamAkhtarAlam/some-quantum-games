// ═══════════════════════════════════════════════════════
//  GAME 37 — QUANTUM RHYTHM
//  ADOFAI-inspired one-button rhythm game.
//  A planet orbits the current tile. Press SPACE or click
//  when it aligns with the next tile. 3 hearts. 21 tiles.
// ═══════════════════════════════════════════════════════

// Level: relative turns in degrees per segment
// 0 = straight, +90 = right turn, -90 = left turn
const G37_TURNS  = [0, -90, 0, 90, 0, 90, -90, 0, 0, -90, 0, -90, 0, 90, 0, 90, 0, -90, 0, 90]
const G37_SPEED  = 3.5    // rad/sec
const G37_ORBITR = 30     // orbit radius in canvas px
const G37_PERF   = 0.16   // ±perfect window (rad, ~9°)
const G37_GOOD   = 0.40   // ±good window (rad, ~23°)
const G37_AUTO   = 0.58   // auto-miss margin past exit angle

let G37 = {
  active: false, done: false,
  tiles: [], headings: [],
  orbitTile: 0, dir: 1,
  arcStart: 0, arcEnd: 0, arcLen: 0, arcT: 0,
  health: 3, score: 0,
  hits: [],
  feedback: '', fbTimer: 0,
  raf: null, lastTime: 0,
}
window._g37Score = 0

// ── level geometry ────────────────────────────────────

function _g37BuildLevel(W, H) {
  let heading = 0
  const raw = [{ x: 0, y: 0 }]
  for (const t of G37_TURNS) {
    heading = ((heading + t) % 360 + 360) % 360
    const rad = heading * Math.PI / 180
    const p = raw[raw.length - 1]
    raw.push({ x: p.x + Math.cos(rad), y: p.y + Math.sin(rad) })
  }
  const pad = 52 + G37_ORBITR
  const xs = raw.map(p => p.x), ys = raw.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const s  = Math.min((W - pad * 2) / Math.max(maxX - minX, 0.1),
                      (H - pad * 2) / Math.max(maxY - minY, 0.1))
  const ox = (W - (maxX - minX) * s) / 2 - minX * s
  const oy = (H - (maxY - minY) * s) / 2 - minY * s
  return raw.map(p => ({ x: p.x * s + ox, y: p.y * s + oy }))
}

function _g37BuildHeadings(tiles) {
  const h = []
  for (let i = 0; i < tiles.length - 1; i++)
    h.push(Math.atan2(tiles[i+1].y - tiles[i].y, tiles[i+1].x - tiles[i].x))
  return h
}

function _g37ArcLen(from, to, dir) {
  let d = (to - from) * dir
  d = ((d % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  if (d < 0.001) d = Math.PI * 2
  return d
}

function _g37StartTile(i) {
  G37.orbitTile = i
  G37.arcT = 0
  const n = G37.headings.length

  let arcStart = i === 0
    ? G37.headings[0] + Math.PI
    : G37.headings[i - 1] + Math.PI
  arcStart = ((arcStart % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  G37.arcStart = arcStart

  if (i >= n) { G37.arcEnd = arcStart; G37.arcLen = 0; G37.dir = 1; return }

  const arcEnd = ((G37.headings[i] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  G37.arcEnd = arcEnd

  const cwLen  = _g37ArcLen(arcStart, arcEnd, +1)
  const ccwLen = _g37ArcLen(arcStart, arcEnd, -1)
  if (cwLen <= ccwLen) { G37.dir = +1; G37.arcLen = cwLen }
  else                 { G37.dir = -1; G37.arcLen = ccwLen }
}

// ── lifecycle ─────────────────────────────────────────

function stopGame37() {
  G37.active = false
  if (G37.raf) { cancelAnimationFrame(G37.raf); G37.raf = null }
  document.removeEventListener('keydown', _g37Key)
  const c = document.getElementById('g37-canvas')
  if (c) c.onclick = null
}
window.stopGame37 = stopGame37

window.initGame37 = async function() {
  stopGame37()
  G37 = {
    active: false, done: false,
    tiles: [], headings: [],
    orbitTile: 0, dir: 1,
    arcStart: 0, arcEnd: 0, arcLen: 0, arcT: 0,
    health: 3, score: 0, hits: [], feedback: '', fbTimer: 0,
    raf: null, lastTime: 0,
  }
  window._g37Score = 0
  document.getElementById('g37-over').classList.remove('show')
  document.getElementById('g37-overlay').style.display = 'flex'
  await initCurby()
}

window.startRhythm = function() {
  SFX.resume(); SFX.click()
  const c = document.getElementById('g37-canvas')
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('g37-overlay').style.display = 'none'

  G37.tiles    = _g37BuildLevel(c.width, c.height)
  G37.headings = _g37BuildHeadings(G37.tiles)
  _g37StartTile(0)
  G37.active = true
  G37.done   = false

  c.onclick = _g37Press
  document.addEventListener('keydown', _g37Key)
  G37.lastTime = performance.now()
  G37.raf = requestAnimationFrame(_g37Loop)
}

function _g37Key(e) {
  if (!document.getElementById('game37').classList.contains('active')) return
  if (e.code === 'Space') { e.preventDefault(); _g37Press() }
}

// ── hit logic ─────────────────────────────────────────

function _g37Press() {
  if (!G37.active || G37.done) return
  if (G37.orbitTile >= G37.tiles.length - 1) return

  const diff = Math.abs(G37.arcLen - G37.arcT)

  let rating
  if (diff < G37_PERF) rating = 'perfect'
  else if (diff < G37_GOOD) rating = 'good'
  else rating = 'miss'

  _g37ApplyResult(rating)
}

function _g37ApplyResult(rating) {
  G37.hits.push(rating)
  G37.feedback = rating
  G37.fbTimer  = 0.72

  if (rating === 'miss') {
    G37.health--
    SFX.die?.()
    if (G37.health <= 0) { G37.done = true; setTimeout(_g37EndGame, 350); return }
  } else {
    G37.score += rating === 'perfect' ? 100 : 50
    SFX.coin?.()
  }

  const next = G37.orbitTile + 1
  if (next >= G37.tiles.length - 1) {
    G37.score += 200  // completion bonus
    G37.done = true
    setTimeout(_g37EndGame, 500)
    return
  }
  _g37StartTile(next)
}

// ── game loop & drawing ───────────────────────────────

function _g37Loop(ts) {
  if (!G37.active) return
  const dt = Math.min((ts - G37.lastTime) / 1000, 0.05)
  G37.lastTime = ts

  G37.fbTimer = Math.max(0, G37.fbTimer - dt)

  if (!G37.done) {
    G37.arcT += G37_SPEED * dt
    if (G37.arcT > G37.arcLen + G37_AUTO && G37.orbitTile < G37.tiles.length - 1) {
      _g37ApplyResult('miss')
    }
  }

  _g37Draw()
  G37.raf = requestAnimationFrame(_g37Loop)
}

function _g37Draw() {
  const c   = document.getElementById('g37-canvas')
  const ctx = c.getContext('2d')
  const W = c.width, H = c.height

  ctx.fillStyle = '#06060f'
  ctx.fillRect(0, 0, W, H)

  const tiles = G37.tiles
  const n     = tiles.length
  const oi    = G37.orbitTile
  const R     = G37_ORBITR

  // ── path lines ──
  for (let i = 0; i < n - 1; i++) {
    const a = tiles[i], b = tiles[i + 1]
    ctx.strokeStyle = i < oi ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.13)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  }

  // ── orbit circle (ghost ring) ──
  if (oi < n) {
    ctx.strokeStyle = 'rgba(244,114,182,0.1)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(tiles[oi].x, tiles[oi].y, R, 0, Math.PI * 2); ctx.stroke()
  }

  // ── tile nodes ──
  for (let i = 0; i < n; i++) {
    const t = tiles[i]
    const isCur  = i === oi
    const isDone = i < oi
    const isNext = i === oi + 1
    const r = isCur ? 9 : isNext ? 7 : 5

    ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2)
    if (isCur) {
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 22
    } else if (isDone) {
      ctx.fillStyle = '#4f46e5'; ctx.shadowBlur = 0
    } else if (isNext) {
      ctx.fillStyle = '#c4b5fd'
      ctx.shadowColor = '#c4b5fd'; ctx.shadowBlur = 8
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.shadowBlur = 0
    }
    ctx.fill(); ctx.shadowBlur = 0
  }

  // ── target indicator (small gold ring at exit angle) ──
  if (oi < n - 1) {
    const ct = tiles[oi]
    const tx = ct.x + R * Math.cos(G37.arcEnd)
    const ty = ct.y + R * Math.sin(G37.arcEnd)
    ctx.strokeStyle = 'rgba(251,191,36,0.75)'
    ctx.lineWidth = 2
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.stroke()
    ctx.shadowBlur = 0
  }

  // ── planet ──
  const angle = ((G37.arcStart + G37.arcT * G37.dir) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
  if (oi < n) {
    const ct = tiles[oi]
    const px = ct.x + R * Math.cos(angle)
    const py = ct.y + R * Math.sin(angle)
    ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 20
    ctx.fill(); ctx.shadowBlur = 0
  }

  // ── HUD ──
  // Hearts
  for (let i = 0; i < 3; i++) {
    ctx.font = '18px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillStyle = i < G37.health ? '#f472b6' : 'rgba(255,255,255,0.12)'
    ctx.shadowColor = '#f472b6'; ctx.shadowBlur = i < G37.health ? 8 : 0
    ctx.fillText('♥', 10 + i * 24, 28)
  }
  ctx.shadowBlur = 0

  // Score
  ctx.fillStyle = '#c4b5fd'
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = 'right'
  ctx.fillText(G37.score + ' pts', W - 10, 24)

  // Progress
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = '11px monospace'
  ctx.fillText(`tile ${Math.min(oi + 1, n)} / ${n}`, W - 10, 42)

  // Feedback text
  if (G37.fbTimer > 0 && G37.feedback) {
    const alpha = G37.fbTimer / 0.72
    const col = G37.feedback === 'perfect' ? '#fbbf24'
              : G37.feedback === 'good'    ? '#4ade80'
              : '#f87171'
    const txt = G37.feedback === 'perfect' ? 'PERFECT!'
              : G37.feedback === 'good'    ? 'GOOD'
              : 'MISS'
    ctx.globalAlpha = alpha
    ctx.fillStyle = col
    ctx.font = `bold ${G37.feedback === 'perfect' ? 26 : 20}px monospace`
    ctx.textAlign = 'center'
    ctx.shadowColor = col; ctx.shadowBlur = 14
    ctx.fillText(txt, W / 2, H * 0.2)
    ctx.shadowBlur = 0; ctx.globalAlpha = 1
  }

  ctx.textAlign = 'left'
}

function _g37EndGame() {
  stopGame37()
  const perfects = G37.hits.filter(h => h === 'perfect').length
  const goods    = G37.hits.filter(h => h === 'good').length
  const misses   = G37.hits.filter(h => h === 'miss').length
  const total    = G37.hits.length
  const acc      = total > 0 ? Math.round((perfects + goods * 0.5) / total * 100) : 0
  window._g37Score = G37.score
  document.getElementById('g37-final-score').textContent = `${G37.score} pts`
  document.getElementById('g37-over-stats').textContent  =
    `${acc}% acc · ${perfects}× Perfect · ${goods}× Good · ${misses}× Miss`
  renderMedalDisplay('g37-medal-display', 'rhythm', G37.score)
  document.getElementById('g37-over').classList.add('show')
  SFX.win?.()
}
