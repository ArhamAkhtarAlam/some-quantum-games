// ═══════════════════════════════════════════════════════
//  GAME 35 — WAVE DASH
//  GD wave gamemode. Hold to angle up, release to go down.
//  Starts wide and slow — gets tighter and faster.
// ═══════════════════════════════════════════════════════
const G35_WAVE_SPD = 255
const G35_PR       = 7

const G35 = {
  active: false,
  y: 0,
  vy: 0,
  holding: false,
  score: 0,
  scrollX: 0,
  scrollAcc: 0,
  speed: 150,
  gapH: 205,
  wallBuf: [],
  wallGenCy: 0,
  wallGenTarget: 0,
  wallGenTimer: 0,
  trail: [],
  cx: 0,
  grace: 3.5,
  raf: null,
  lastTime: 0,
}
window._g35Score = 0

let _g35Canvas = null
let _g35WallPat = null

function _g35C() {
  if (!_g35Canvas) _g35Canvas = document.getElementById('g35-canvas')
  return _g35Canvas
}

function _g35MakePat(ctx) {
  if (_g35WallPat) return _g35WallPat
  const off = document.createElement('canvas')
  off.width = 24; off.height = 24
  const oc = off.getContext('2d')
  oc.fillStyle = '#07111e'
  oc.fillRect(0, 0, 24, 24)
  // Diamond body
  oc.fillStyle = '#0f2d47'
  oc.beginPath()
  oc.moveTo(12, 0); oc.lineTo(24, 12); oc.lineTo(12, 24); oc.lineTo(0, 12)
  oc.closePath(); oc.fill()
  // Top-right face — lighter for depth
  oc.fillStyle = '#163d5e'
  oc.beginPath()
  oc.moveTo(12, 0); oc.lineTo(24, 12); oc.lineTo(12, 12)
  oc.closePath(); oc.fill()
  // Subtle highlight
  oc.fillStyle = '#1c4f78'
  oc.beginPath(); oc.arc(15, 8, 2, 0, Math.PI * 2); oc.fill()
  _g35WallPat = ctx.createPattern(off, 'repeat')
  return _g35WallPat
}

function stopGame35() {
  G35.active = false
  if (G35.raf) { cancelAnimationFrame(G35.raf); G35.raf = null }
  document.removeEventListener('keydown',  _g35KD)
  document.removeEventListener('keyup',    _g35KU)
  const c = _g35C()
  if (c) {
    c.removeEventListener('mousedown',  _g35MD)
    c.removeEventListener('mouseup',    _g35MU)
    c.removeEventListener('touchstart', _g35TD)
    c.removeEventListener('touchend',   _g35TU)
  }
}
window.stopGame35 = stopGame35

function _g35KD(e) { if (e.code==='Space'||e.code==='KeyW'||e.code==='ArrowUp') { e.preventDefault(); G35.holding=true } }
function _g35KU(e) { if (e.code==='Space'||e.code==='KeyW'||e.code==='ArrowUp') { e.preventDefault(); G35.holding=false } }
function _g35MD() { G35.holding = true }
function _g35MU() { G35.holding = false }
function _g35TD(e) { e.preventDefault(); G35.holding = true }
function _g35TU(e) { e.preventDefault(); G35.holding = false }

async function initGame35() {
  stopGame35()
  _g35Canvas = null
  _g35WallPat = null
  document.getElementById('g35-over').classList.remove('show')
  document.getElementById('g35-overlay').style.display = 'flex'
  await initCurby()
}

window.startWaveDash = function() {
  SFX.resume(); SFX.click()
  const c = _g35C()
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('g35-overlay').style.display = 'none'

  const w = c.width, h = c.height
  G35.active    = true
  G35.y         = h / 2
  G35.vy        = 0
  G35.holding   = false
  G35.score     = 0
  G35.scrollX   = 0
  G35.scrollAcc = 0
  G35.speed     = 150
  G35.gapH      = 205
  G35.grace     = 3.5
  G35.trail     = []
  G35.cx        = Math.floor(w * 0.18)
  _g35WallPat   = null

  G35.wallBuf       = []
  G35.wallGenCy     = h / 2
  G35.wallGenTarget = h / 2
  G35.wallGenTimer  = 0

  // Long straight opening — player can orient before obstacles appear
  const safeLen = Math.max(420, Math.floor(w * 0.70))
  for (let x = 0; x < safeLen; x++) G35.wallBuf.push({ cy: h / 2, gapH: G35.gapH })
  g35GenCols(w + 250 - safeLen, h)

  document.getElementById('g35-score-hud').textContent = '0'
  document.addEventListener('keydown',   _g35KD)
  document.addEventListener('keyup',     _g35KU)
  c.addEventListener('mousedown',  _g35MD)
  c.addEventListener('mouseup',    _g35MU)
  c.addEventListener('touchstart', _g35TD, { passive: false })
  c.addEventListener('touchend',   _g35TU, { passive: false })

  G35.lastTime = performance.now()
  G35.raf = requestAnimationFrame(g35Loop)
}

function g35GenCols(n, h) {
  for (let i = 0; i < n; i++) {
    G35.wallGenTimer--
    if (G35.wallGenTimer <= 0) {
      const margin = G35.gapH / 2 + 22
      G35.wallGenTarget = margin + qRandInt(Math.max(1, Math.floor(h - margin * 2)))
      G35.wallGenTimer  = 55 + qRandInt(110)
    }
    G35.wallGenCy += (G35.wallGenTarget - G35.wallGenCy) * 0.028
    G35.wallBuf.push({ cy: G35.wallGenCy, gapH: G35.gapH })
  }
}

function g35Loop(ts) {
  if (!G35.active) return
  const dt = Math.min((ts - G35.lastTime) / 1000, 0.05)
  G35.lastTime = ts

  const c   = _g35C()
  const w   = c.width, h = c.height
  const ctx = c.getContext('2d')

  // Grace period
  if (G35.grace > 0) {
    G35.grace -= dt
    g35Draw(ctx, w, h)
    ctx.textAlign = 'center'
    const label = G35.grace > 2.5 ? '3' : G35.grace > 1.5 ? '2' : G35.grace > 0.4 ? '1' : 'GO!'
    const alpha  = G35.grace > 0.4 ? 1 : G35.grace / 0.4
    ctx.globalAlpha = alpha
    ctx.font = 'bold 80px monospace'
    ctx.fillStyle = '#4ade80'
    ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 32
    ctx.fillText(label, w / 2, h / 2 + 28)
    ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.textAlign = 'left'
    G35.raf = requestAnimationFrame(g35Loop)
    return
  }

  // Scroll
  G35.scrollAcc += G35.speed * dt
  const px = Math.floor(G35.scrollAcc)
  if (px > 0) {
    G35.scrollAcc -= px
    G35.scrollX   += px
    G35.wallBuf.splice(0, px)
    G35.gapH  = Math.max(72, G35.gapH - px * 0.0045)
    G35.speed = Math.min(420, 150 + G35.scrollX * 0.022)
    g35GenCols(px, h)
  }

  // Score
  const newScore = Math.floor(G35.scrollX / 80)
  if (newScore !== G35.score) {
    G35.score = newScore
    document.getElementById('g35-score-hud').textContent = G35.score
  }

  // Wave physics — instant direction change (authentic GD feel)
  G35.vy = G35.holding ? -G35_WAVE_SPD : G35_WAVE_SPD
  G35.y  += G35.vy * dt
  G35.y   = Math.max(G35_PR, Math.min(h - G35_PR, G35.y))

  // Trail
  G35.trail.push({ x: G35.cx, y: G35.y })
  if (G35.trail.length > 50) G35.trail.shift()

  // Collision
  const wallIdx = Math.min(G35.cx, G35.wallBuf.length - 1)
  const wall    = G35.wallBuf[wallIdx]
  if (G35.y <= wall.cy - wall.gapH / 2 + G35_PR || G35.y >= wall.cy + wall.gapH / 2 - G35_PR) {
    endGame35(); return
  }

  g35Draw(ctx, w, h)
  G35.raf = requestAnimationFrame(g35Loop)
}

function g35Draw(ctx, w, h) {
  ctx.fillStyle = '#030710'
  ctx.fillRect(0, 0, w, h)

  const pat = _g35MakePat(ctx)

  // Top wall
  ctx.beginPath()
  ctx.moveTo(0, 0)
  for (let x = 0; x < w; x += 2) {
    const e = G35.wallBuf[Math.min(x, G35.wallBuf.length - 1)]
    ctx.lineTo(x, e.cy - e.gapH / 2)
  }
  ctx.lineTo(w, 0)
  ctx.closePath()
  ctx.fillStyle = pat
  ctx.fill()

  // Bottom wall
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x < w; x += 2) {
    const e = G35.wallBuf[Math.min(x, G35.wallBuf.length - 1)]
    ctx.lineTo(x, e.cy + e.gapH / 2)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = pat
  ctx.fill()

  // Neon cyan edge lines with glow
  ctx.lineWidth = 2.5
  ctx.shadowColor = '#06b6d4'; ctx.shadowBlur = 14
  ctx.beginPath()
  for (let x = 0; x < w; x += 2) {
    const e = G35.wallBuf[Math.min(x, G35.wallBuf.length - 1)]
    const y = e.cy - e.gapH / 2
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.strokeStyle = '#67e8f9'; ctx.stroke()

  ctx.beginPath()
  for (let x = 0; x < w; x += 2) {
    const e = G35.wallBuf[Math.min(x, G35.wallBuf.length - 1)]
    const y = e.cy + e.gapH / 2
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.strokeStyle = '#67e8f9'; ctx.stroke()
  ctx.shadowBlur = 0

  // Neon trail
  for (let i = 0; i < G35.trail.length; i++) {
    const t = (i + 1) / G35.trail.length
    const p = G35.trail[i]
    const r = G35_PR * 0.55 * t
    ctx.shadowColor = '#4ade80'; ctx.shadowBlur = r * 4
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2)
    ctx.fillStyle = `rgba(74,222,128,${t * 0.85})`; ctx.fill()
  }
  ctx.shadowBlur = 0

  // Player — arrow chevron pointing in direction of travel
  const angle = Math.atan2(G35.vy, G35.speed)
  ctx.save()
  ctx.translate(G35.cx, G35.y)
  ctx.rotate(angle)

  const s = G35_PR
  ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 18
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(s * 1.5, 0)
  ctx.lineTo(-s * 0.5, -s)
  ctx.lineTo(-s * 0.1, 0)
  ctx.lineTo(-s * 0.5, s)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()
}

function endGame35() {
  SFX.die()
  stopGame35()
  window._g35Score = G35.score
  document.getElementById('g35-final-score').textContent = G35.score + ' blocks'
  renderMedalDisplay('g35-medal-display', 'wavedash', G35.score)
  document.getElementById('g35-over').classList.add('show')
}
