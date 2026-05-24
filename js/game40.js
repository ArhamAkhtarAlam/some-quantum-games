// ═══════════════════════════════════════════════════════
//  GAME 40 — UFO FLAP
//  Flappy-Bird style. Space / tap to thrust up.
//  Dodge the neon pillars — faster and tighter as you score.
// ═══════════════════════════════════════════════════════

const G40_GRAV      = 880
const G40_THRUST    = -400
const G40_UFO_RX    = 22
const G40_UFO_RY    = 11
const G40_PIPE_W    = 62
const G40_PIPE_GAP0 = 195
const G40_PIPE_SPD0 = 155
const G40_PIPE_SEP  = 290
const G40_ACCEL     = 3.5

const G40 = {
  active:   false,
  phase:    'idle',
  y:        0,
  vy:       0,
  score:    0,
  pipes:    [],
  speed:    G40_PIPE_SPD0,
  gap:      G40_PIPE_GAP0,
  stars:    [],
  raf:      null,
  lastTime: 0,
  deadT:    0,
  showOver: false,
}

let _g40Canvas = null
function _g40C() {
  if (!_g40Canvas) _g40Canvas = document.getElementById('g40-canvas')
  return _g40Canvas
}

async function initGame40() {
  stopGame40()
  _g40Canvas = null
  document.getElementById('g40-overlay').style.display = 'flex'
  document.getElementById('g40-over').style.display    = 'none'
  await initCurby()
}
window.initGame40 = initGame40

window.startUFOGame = function() {
  SFX.resume(); SFX.click()
  const c = _g40C()
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('g40-overlay').style.display = 'none'
  document.getElementById('g40-over').style.display    = 'none'

  G40.stars = Array.from({length: 70}, () => ({
    x:   Math.random() * c.width,
    y:   Math.random() * c.height,
    r:   Math.random() * 1.4 + 0.3,
    spd: Math.random() * 28 + 8,
    a:   Math.random() * 0.5 + 0.4,
  }))

  G40.active   = true
  G40.phase    = 'playing'
  G40.y        = c.height / 2
  G40.vy       = 0
  G40.score    = 0
  G40.pipes    = []
  G40.speed    = G40_PIPE_SPD0
  G40.gap      = G40_PIPE_GAP0
  G40.deadT    = 0
  G40.showOver = false
  document.getElementById('g40-score-hud').textContent = '0'

  _g40Spawn(c.width + G40_PIPE_W, c.height)

  c.addEventListener('click',      _g40Thrust)
  c.addEventListener('touchstart', _g40Thrust, { passive: false })
  window.addEventListener('keydown', _g40Key)

  G40.lastTime = performance.now()
  G40.raf = requestAnimationFrame(_g40Loop)
}

window.stopGame40 = function() {
  G40.active = false
  if (G40.raf) { cancelAnimationFrame(G40.raf); G40.raf = null }
  const c = _g40C()
  if (c) {
    c.removeEventListener('click',      _g40Thrust)
    c.removeEventListener('touchstart', _g40Thrust)
  }
  window.removeEventListener('keydown', _g40Key)
}

function _g40Key(e) {
  if (e.code === 'Space') { e.preventDefault(); _g40DoThrust() }
}
function _g40Thrust(e) { e.preventDefault(); _g40DoThrust() }
function _g40DoThrust() {
  if (G40.phase !== 'playing') return
  G40.vy = G40_THRUST
  SFX.click()
}

function _g40Spawn(x, h) {
  const margin = Math.floor(h * 0.18)
  const range  = Math.floor(h * 0.64)
  const cy = margin + (range > 0 ? qRandInt(range + 1) : 0)
  G40.pipes.push({ x, cy, passed: false })
}

function _g40Loop(ts) {
  if (!G40.active) return
  const dt = Math.min((ts - G40.lastTime) / 1000, 0.05)
  G40.lastTime = ts

  const c = _g40C()
  const w = c.width, h = c.height
  const ufoX = w * 0.20

  for (const s of G40.stars) {
    s.x -= s.spd * dt
    if (s.x < 0) { s.x = w + 2; s.y = Math.random() * h }
  }

  if (G40.phase === 'playing') {
    G40.vy += G40_GRAV * dt
    G40.y  += G40.vy * dt

    const halfGap = G40.gap / 2
    for (const p of G40.pipes) {
      p.x -= G40.speed * dt
      if (!p.passed && p.x + G40_PIPE_W < ufoX - G40_UFO_RX) {
        p.passed = true
        G40.score++
        window._g40Score = G40.score
        document.getElementById('g40-score-hud').textContent = G40.score
        G40.speed = G40_PIPE_SPD0 + G40.score * G40_ACCEL
        G40.gap   = Math.max(95, G40_PIPE_GAP0 - G40.score * 2.2)
      }
    }
    G40.pipes = G40.pipes.filter(p => p.x > -G40_PIPE_W - 20)

    const last = G40.pipes[G40.pipes.length - 1]
    if (!last || last.x < w - G40_PIPE_SEP) _g40Spawn(w + G40_PIPE_W, h)

    if (G40.y - G40_UFO_RY <= 0 || G40.y + G40_UFO_RY >= h) {
      _g40Die()
    } else {
      for (const p of G40.pipes) {
        const inX = ufoX + G40_UFO_RX > p.x && ufoX - G40_UFO_RX < p.x + G40_PIPE_W
        if (inX && (G40.y - G40_UFO_RY < p.cy - halfGap || G40.y + G40_UFO_RY > p.cy + halfGap)) {
          _g40Die(); break
        }
      }
    }

  } else if (G40.phase === 'dead') {
    G40.vy   += G40_GRAV * dt
    G40.y    += G40.vy * dt
    G40.deadT += dt
    if (G40.deadT >= 1.5 && !G40.showOver) {
      G40.showOver = true
      window._g40Score = G40.score
      const s = G40.score
      document.getElementById('g40-final-score').textContent = `${s} pipe${s !== 1 ? 's' : ''}`
      document.getElementById('g40-over').style.display = 'flex'
    }
  }

  _g40Draw(c.getContext('2d'), w, h)

  if (G40.showOver) { G40.active = false; return }
  G40.raf = requestAnimationFrame(_g40Loop)
}

function _g40Die() {
  if (G40.phase === 'dead') return
  G40.phase = 'dead'
  G40.deadT = 0
  G40.vy    = G40_THRUST * 0.45
  SFX.die()
  const c = _g40C()
  c.removeEventListener('click',      _g40Thrust)
  c.removeEventListener('touchstart', _g40Thrust)
  window.removeEventListener('keydown', _g40Key)
}

function _g40Draw(ctx, w, h) {
  ctx.save()
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  // Background
  ctx.fillStyle = '#030710'
  ctx.fillRect(0, 0, w, h)

  // Nebula glow
  const ng = ctx.createRadialGradient(w * 0.72, h * 0.38, 0, w * 0.72, h * 0.38, w * 0.55)
  ng.addColorStop(0, 'rgba(88,28,135,0.14)')
  ng.addColorStop(1, 'rgba(88,28,135,0)')
  ctx.fillStyle = ng
  ctx.fillRect(0, 0, w, h)

  // Stars
  for (const s of G40.stars) {
    ctx.globalAlpha = s.a
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'; ctx.fill()
  }
  ctx.globalAlpha = 1

  const halfGap = G40.gap / 2
  for (const p of G40.pipes) {
    _g40DrawPipe(ctx, p.x, 0,              G40_PIPE_W, p.cy - halfGap,            true)
    _g40DrawPipe(ctx, p.x, p.cy + halfGap, G40_PIPE_W, h - (p.cy + halfGap), false)
  }

  const ufoX  = w * 0.20
  const alpha = G40.phase === 'dead' ? Math.max(0.15, 1 - G40.deadT * 1.4) : 1
  ctx.globalAlpha = alpha
  _g40DrawUFO(ctx, ufoX, G40.y)
  ctx.globalAlpha = 1

  // Score
  ctx.textAlign   = 'center'
  ctx.font        = 'bold 28px monospace'
  ctx.fillStyle   = 'rgba(255,255,255,0.92)'
  ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 18
  ctx.fillText(G40.score, w / 2, 46)
  ctx.shadowBlur  = 0

  ctx.restore()
}

function _g40DrawPipe(ctx, x, y, pw, ph, isTop) {
  if (ph <= 0) return
  const capH = 18, capX = x - 5, capW = pw + 10
  const capY = isTop ? y + ph - capH : y

  ctx.fillStyle = '#06091a'
  ctx.fillRect(x, y, pw, ph)
  ctx.fillStyle = '#0d1533'
  ctx.fillRect(capX, capY, capW, capH)

  ctx.strokeStyle = '#a855f7'
  ctx.lineWidth   = 1.8
  ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 12
  ctx.strokeRect(x + 0.9, y, pw - 1.8, ph)
  ctx.strokeRect(capX + 0.9, capY, capW - 1.8, capH)
  ctx.shadowBlur  = 0

  ctx.fillStyle = 'rgba(168,85,247,0.10)'
  ctx.fillRect(x + 4, y, 7, ph)
}

function _g40DrawUFO(ctx, x, y) {
  const rx = G40_UFO_RX, ry = G40_UFO_RY

  // Tractor beam
  const bGrad = ctx.createLinearGradient(x, y + ry, x, y + ry + 32)
  bGrad.addColorStop(0, 'rgba(168,85,247,0.28)')
  bGrad.addColorStop(1, 'rgba(168,85,247,0)')
  ctx.beginPath()
  ctx.moveTo(x - rx * 0.45, y + ry)
  ctx.lineTo(x - rx,        y + ry + 32)
  ctx.lineTo(x + rx,        y + ry + 32)
  ctx.lineTo(x + rx * 0.45, y + ry)
  ctx.closePath()
  ctx.fillStyle = bGrad; ctx.fill()

  // Saucer body
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle   = '#1e0d38'
  ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 28
  ctx.fill(); ctx.shadowBlur = 0
  ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2
  ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 12
  ctx.stroke(); ctx.shadowBlur = 0

  // Dome
  ctx.beginPath()
  ctx.ellipse(x, y - ry * 0.15, rx * 0.48, ry * 1.15, 0, Math.PI, 0)
  ctx.fillStyle = 'rgba(168,85,247,0.30)'; ctx.fill()
  ctx.strokeStyle = 'rgba(216,180,254,0.6)'; ctx.lineWidth = 1.2; ctx.stroke()

  // Rim lights
  const rimColors = ['#fbbf24', '#4ade80', '#fbbf24', '#06b6d4', '#fbbf24']
  for (let i = 0; i < 5; i++) {
    const t  = Math.PI * 0.08 + (i / 4) * Math.PI * 0.84
    const lx = x + Math.cos(t) * rx * 0.76
    const ly = y + Math.sin(t) * ry * 0.6
    ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, Math.PI * 2)
    ctx.fillStyle   = rimColors[i]
    ctx.shadowColor = rimColors[i]; ctx.shadowBlur = 8
    ctx.fill(); ctx.shadowBlur = 0
  }
}
