// ═══════════════════════════════════════════════════════
//  GAME 34 — WAVE DASH
//  Hold to go up, release to go down. Navigate the
//  quantum-generated corridor. GD wave gamemode vibes.
// ═══════════════════════════════════════════════════════
const G34_WAVE_SPD = 245   // vertical speed px/s
const G34_PR       = 8     // player half-size

const G34 = {
  active: false,
  y: 0,
  holding: false,
  score: 0,          // blocks = floor(scrollX / 80)
  scrollX: 0,
  scrollAcc: 0,
  speed: 195,        // horizontal px/s (increases over time)
  gapH: 132,         // corridor gap height (shrinks slowly)
  wallBuf: [],       // { cy, gapH } per screen column
  wallGenCy: 0,
  wallGenTarget: 0,
  wallGenTimer: 0,
  trail: [],         // last N {x,y} positions
  cx: 0,             // fixed player screen x
  shake: 0,
  raf: null, lastTime: 0,
}
window._g34Score = 0

let _g34Canvas = null
function _g34C() {
  if (!_g34Canvas) _g34Canvas = document.getElementById('g34-canvas')
  return _g34Canvas
}

function stopGame34() {
  G34.active = false
  if (G34.raf) { cancelAnimationFrame(G34.raf); G34.raf = null }
  document.removeEventListener('keydown',  _g34KD)
  document.removeEventListener('keyup',    _g34KU)
  _g34C().removeEventListener('mousedown', _g34MD)
  _g34C().removeEventListener('mouseup',   _g34MU)
  _g34C().removeEventListener('touchstart',_g34TD)
  _g34C().removeEventListener('touchend',  _g34TU)
}
window.stopGame34 = stopGame34

function _g34KD(e) { if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') { e.preventDefault(); G34.holding = true } }
function _g34KU(e) { if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') { e.preventDefault(); G34.holding = false } }
function _g34MD() { G34.holding = true }
function _g34MU() { G34.holding = false }
function _g34TD(e) { e.preventDefault(); G34.holding = true }
function _g34TU(e) { e.preventDefault(); G34.holding = false }

async function initGame34() {
  stopGame34()
  _g34Canvas = null
  document.getElementById('g34-over').classList.remove('show')
  document.getElementById('g34-score-hud').textContent = '0'
  document.getElementById('g34-overlay').style.display = 'flex'
  await initCurby()
}

window.startWaveDash = function() {
  SFX.resume(); SFX.click()
  const c = _g34C()
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('g34-overlay').style.display = 'none'

  const w = c.width, h = c.height
  G34.active    = true
  G34.y         = h / 2
  G34.holding   = false
  G34.score     = 0
  G34.scrollX   = 0
  G34.scrollAcc = 0
  G34.speed     = 195
  G34.gapH      = 132
  G34.shake     = 0
  G34.trail     = []
  G34.cx        = Math.floor(w * 0.22)

  // Init wall buffer: first 160px straight, then generated
  G34.wallBuf       = []
  G34.wallGenCy     = h / 2
  G34.wallGenTarget = h / 2
  G34.wallGenTimer  = 0
  for (let x = 0; x < 160; x++) G34.wallBuf.push({ cy: h / 2, gapH: G34.gapH })
  g34GenCols(w + 200 - 160, h)  // fill rest of buffer

  document.getElementById('g34-score-hud').textContent = '0'
  document.addEventListener('keydown',   _g34KD)
  document.addEventListener('keyup',     _g34KU)
  c.addEventListener('mousedown',  _g34MD)
  c.addEventListener('mouseup',    _g34MU)
  c.addEventListener('touchstart', _g34TD, { passive: false })
  c.addEventListener('touchend',   _g34TU, { passive: false })

  G34.lastTime = performance.now()
  G34.raf = requestAnimationFrame(g34Loop)
}

function g34GenCols(n, h) {
  for (let i = 0; i < n; i++) {
    G34.wallGenTimer--
    if (G34.wallGenTimer <= 0) {
      const margin = G34.gapH / 2 + 18
      G34.wallGenTarget = margin + qRandInt(Math.max(1, Math.floor(h - margin * 2)))
      G34.wallGenTimer  = 55 + qRandInt(110)
    }
    G34.wallGenCy += (G34.wallGenTarget - G34.wallGenCy) * 0.032
    G34.wallBuf.push({ cy: G34.wallGenCy, gapH: G34.gapH })
  }
}

function g34Loop(ts) {
  if (!G34.active) return
  const dt = Math.min((ts - G34.lastTime) / 1000, 0.05)
  G34.lastTime = ts

  const c = _g34C()
  const w = c.width, h = c.height

  // Scroll
  G34.scrollAcc += G34.speed * dt
  const px = Math.floor(G34.scrollAcc)
  if (px > 0) {
    G34.scrollAcc -= px
    G34.scrollX   += px
    G34.wallBuf.splice(0, px)
    // Slowly shrink gap and speed up
    G34.gapH  = Math.max(62, G34.gapH - px * 0.003)
    G34.speed = Math.min(380, 195 + G34.scrollX * 0.018)
    g34GenCols(px, h)
  }

  // Update score
  const newScore = Math.floor(G34.scrollX / 80)
  if (newScore !== G34.score) {
    G34.score = newScore
    document.getElementById('g34-score-hud').textContent = G34.score
  }

  // Player vertical movement
  const vy = G34.holding ? -G34_WAVE_SPD : G34_WAVE_SPD
  G34.y += vy * dt
  G34.y  = Math.max(G34_PR, Math.min(h - G34_PR, G34.y))

  // Trail
  G34.trail.push({ x: G34.cx, y: G34.y })
  if (G34.trail.length > 38) G34.trail.shift()

  // Collision check at player x
  const wallIdx = Math.min(G34.cx, G34.wallBuf.length - 1)
  const wall    = G34.wallBuf[wallIdx]
  const topKill = wall.cy - wall.gapH / 2 + G34_PR
  const botKill = wall.cy + wall.gapH / 2 - G34_PR
  if (G34.y <= topKill || G34.y >= botKill) { endGame34(); return }

  // ─── Draw ───
  const ctx = c.getContext('2d')
  ctx.save()

  // Shake on near-miss (unused — only on death)
  if (G34.shake > 0) {
    ctx.translate((Math.random() - 0.5) * G34.shake * 6, (Math.random() - 0.5) * G34.shake * 6)
    G34.shake = Math.max(0, G34.shake - dt * 5)
  }

  ctx.fillStyle = '#07090f'
  ctx.fillRect(0, 0, w, h)

  // Draw corridor walls as filled polygons
  ctx.fillStyle = '#111827'
  // Top wall
  ctx.beginPath()
  ctx.moveTo(0, 0)
  for (let x = 0; x < w; x += 2) {
    const entry = G34.wallBuf[Math.min(x, G34.wallBuf.length - 1)]
    ctx.lineTo(x, entry.cy - entry.gapH / 2)
  }
  ctx.lineTo(w, 0)
  ctx.closePath()
  ctx.fill()

  // Bottom wall
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x < w; x += 2) {
    const entry = G34.wallBuf[Math.min(x, G34.wallBuf.length - 1)]
    ctx.lineTo(x, entry.cy + entry.gapH / 2)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()

  // Wall edge glow lines
  ctx.lineWidth = 2
  // Top edge
  ctx.beginPath()
  for (let x = 0; x < w; x += 2) {
    const entry = G34.wallBuf[Math.min(x, G34.wallBuf.length - 1)]
    const y = entry.cy - entry.gapH / 2
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.strokeStyle = '#3b82f6'; ctx.stroke()

  // Bottom edge
  ctx.beginPath()
  for (let x = 0; x < w; x += 2) {
    const entry = G34.wallBuf[Math.min(x, G34.wallBuf.length - 1)]
    const y = entry.cy + entry.gapH / 2
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.strokeStyle = '#3b82f6'; ctx.stroke()

  // Trail
  for (let i = 0; i < G34.trail.length; i++) {
    const t   = i / G34.trail.length
    const p   = G34.trail[i]
    const r   = G34_PR * 0.55 * t
    const alpha = t * 0.7
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2)
    ctx.fillStyle = `rgba(251,191,36,${alpha})`; ctx.fill()
  }

  // Player diamond
  const angle = Math.atan2(G34.holding ? -G34_WAVE_SPD : G34_WAVE_SPD, G34.speed)
  ctx.save()
  ctx.translate(G34.cx, G34.y)
  ctx.rotate(angle)

  // Outer glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, G34_PR * 2.5)
  glow.addColorStop(0, '#fbbf2488'); glow.addColorStop(1, '#fbbf2400')
  ctx.beginPath(); ctx.arc(0, 0, G34_PR * 2.5, 0, Math.PI * 2)
  ctx.fillStyle = glow; ctx.fill()

  // Diamond shape
  ctx.beginPath()
  ctx.moveTo(0, -G34_PR)
  ctx.lineTo(G34_PR, 0)
  ctx.lineTo(0, G34_PR)
  ctx.lineTo(-G34_PR, 0)
  ctx.closePath()
  ctx.fillStyle = '#fbbf24'; ctx.fill()
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.restore()

  ctx.restore()
  G34.raf = requestAnimationFrame(g34Loop)
}

function endGame34() {
  SFX.die()
  stopGame34()
  window._g34Score = G34.score
  document.getElementById('g34-final-score').textContent = G34.score + ' blocks'
  renderMedalDisplay('g34-medal-display', 'wavedash', G34.score)
  document.getElementById('g34-over').classList.add('show')
}
