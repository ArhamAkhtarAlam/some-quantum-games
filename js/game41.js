// ═══════════════════════════════════════════════════════
//  GAME 41 — JET RUSH
//  GD Jetpack style. HOLD to thrust up, release to fall.
//  Auto-scrolling spike columns. Faster and tighter each block.
// ═══════════════════════════════════════════════════════

const G41_GRAV    = 660
const G41_THRUST  = 1380   // applied upward while holding (net -720)
const G41_VY_MAX  = 370
const G41_PW      = 14     // player half-width
const G41_PH      = 12     // player half-height
const G41_OW      = 52     // obstacle column width
const G41_SPD0    = 178
const G41_SPEEDUP = 0.9    // speed gained per block
const G41_OBS_SEP = 270
const G41_GAP0    = 215
const G41_GAP_MIN = 92
const G41_WALL    = 6      // ceiling / floor thickness

const G41 = {
  active: false, phase: 'idle',
  y: 0, vy: 0, holding: false,
  score: 0,
  obs: [],
  speed: G41_SPD0,
  gap: G41_GAP0,
  stars: [],
  raf: null, lastTime: 0,
  deadT: 0, showOver: false,
}
window._g41Score = 0

let _g41Canvas = null
function _g41C() {
  if (!_g41Canvas) _g41Canvas = document.getElementById('g41-canvas')
  return _g41Canvas
}

async function initGame41() {
  stopGame41()
  _g41Canvas = null
  document.getElementById('g41-overlay').style.display = 'flex'
  document.getElementById('g41-over').style.display    = 'none'
  await initCurby()
}
window.initGame41 = initGame41

window.startJetRush = function() {
  SFX.resume(); SFX.click()
  const c = _g41C()
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('g41-overlay').style.display = 'none'
  document.getElementById('g41-over').style.display    = 'none'

  G41.stars = Array.from({length: 55}, () => ({
    x: Math.random() * c.width,
    y: Math.random() * c.height,
    r: Math.random() * 1.3 + 0.2,
    spd: Math.random() * 25 + 6,
    a: Math.random() * 0.45 + 0.3,
  }))

  G41.active   = true
  G41.phase    = 'playing'
  G41.y        = c.height / 2
  G41.vy       = 0
  G41.holding  = false
  G41.score    = 0
  G41.obs      = []
  G41.speed    = G41_SPD0
  G41.gap      = G41_GAP0
  G41.deadT    = 0
  G41.showOver = false
  window._g41Score = 0
  document.getElementById('g41-score-hud').textContent = '0'

  let ox = c.width + 320
  for (let i = 0; i < 4; i++) { _g41Spawn(ox, c.height); ox += G41_OBS_SEP }

  c.addEventListener('mousedown',  _g41On)
  c.addEventListener('mouseup',    _g41Off)
  c.addEventListener('touchstart', _g41On,  { passive: false })
  c.addEventListener('touchend',   _g41Off, { passive: false })
  window.addEventListener('keydown', _g41KeyDn)
  window.addEventListener('keyup',   _g41KeyUp)

  G41.lastTime = performance.now()
  G41.raf = requestAnimationFrame(_g41Loop)
}

window.stopGame41 = function() {
  G41.active  = false
  G41.holding = false
  if (G41.raf) { cancelAnimationFrame(G41.raf); G41.raf = null }
  const c = _g41C()
  if (c) {
    c.removeEventListener('mousedown',  _g41On)
    c.removeEventListener('mouseup',    _g41Off)
    c.removeEventListener('touchstart', _g41On)
    c.removeEventListener('touchend',   _g41Off)
  }
  window.removeEventListener('keydown', _g41KeyDn)
  window.removeEventListener('keyup',   _g41KeyUp)
}

function _g41KeyDn(e) { if (e.code === 'Space') { e.preventDefault(); if (G41.phase === 'playing') G41.holding = true } }
function _g41KeyUp(e) { if (e.code === 'Space') { e.preventDefault(); G41.holding = false } }
function _g41On(e)  { e.preventDefault(); if (G41.phase === 'playing') G41.holding = true }
function _g41Off(e) { e.preventDefault(); G41.holding = false }

function _g41Spawn(x, h) {
  const margin  = Math.floor(h * 0.10)
  const maxTop  = Math.floor(h - margin * 2 - G41.gap)
  const topH    = margin + (maxTop > 0 ? qRandInt(maxTop + 1) : 0)
  const botH    = Math.max(margin, h - topH - G41.gap)
  G41.obs.push({ x, topH, botH, passed: false })
}

function _g41Loop(ts) {
  if (!G41.active) return
  const dt = Math.min((ts - G41.lastTime) / 1000, 0.05)
  G41.lastTime = ts
  const c = _g41C()
  const w = c.width, h = c.height
  const pX = w * 0.22

  for (const s of G41.stars) {
    s.x -= s.spd * dt
    if (s.x < 0) { s.x = w + 2; s.y = Math.random() * h }
  }

  if (G41.phase === 'playing') {
    const force = G41.holding ? (-G41_THRUST + G41_GRAV) : G41_GRAV
    G41.vy = Math.max(-G41_VY_MAX, Math.min(G41_VY_MAX, G41.vy + force * dt))
    G41.y += G41.vy * dt

    for (const o of G41.obs) {
      o.x -= G41.speed * dt
      if (!o.passed && o.x + G41_OW < pX - G41_PW) {
        o.passed = true
        G41.score++
        window._g41Score = G41.score
        document.getElementById('g41-score-hud').textContent = G41.score
        G41.speed = G41_SPD0 + G41.score * G41_SPEEDUP
        G41.gap   = Math.max(G41_GAP_MIN, G41_GAP0 - G41.score * 2.0)
      }
    }
    G41.obs = G41.obs.filter(o => o.x > -G41_OW - 20)

    const last = G41.obs[G41.obs.length - 1]
    if (!last || last.x < w - G41_OBS_SEP) _g41Spawn(w + 60, h)

    // ceiling / floor collision
    if (G41.y - G41_PH <= G41_WALL || G41.y + G41_PH >= h - G41_WALL) {
      _g41Die()
    } else {
      for (const o of G41.obs) {
        if (pX + G41_PW <= o.x || pX - G41_PW >= o.x + G41_OW) continue
        if (G41.y - G41_PH < o.topH || G41.y + G41_PH > h - o.botH) { _g41Die(); break }
      }
    }

  } else if (G41.phase === 'dead') {
    G41.vy  = Math.min(G41_VY_MAX, G41.vy + G41_GRAV * dt)
    G41.y  += G41.vy * dt
    G41.deadT += dt
    if (G41.deadT >= 1.5 && !G41.showOver) {
      G41.showOver = true
      const s = G41.score
      document.getElementById('g41-final-score').textContent = `${s} block${s !== 1 ? 's' : ''}`
      document.getElementById('g41-over').style.display = 'flex'
    }
  }

  _g41Draw(c.getContext('2d'), w, h)
  if (G41.showOver) { G41.active = false; return }
  G41.raf = requestAnimationFrame(_g41Loop)
}

function _g41Die() {
  if (G41.phase === 'dead') return
  G41.phase = 'dead'; G41.deadT = 0; G41.holding = false
  SFX.die()
  const c = _g41C()
  c.removeEventListener('mousedown',  _g41On)
  c.removeEventListener('mouseup',    _g41Off)
  c.removeEventListener('touchstart', _g41On)
  c.removeEventListener('touchend',   _g41Off)
  window.removeEventListener('keydown', _g41KeyDn)
  window.removeEventListener('keyup',   _g41KeyUp)
}

function _g41Draw(ctx, w, h) {
  ctx.save()
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  ctx.fillStyle = '#030710'
  ctx.fillRect(0, 0, w, h)

  // Faint horizontal scan lines
  ctx.strokeStyle = 'rgba(249,115,22,0.045)'
  ctx.lineWidth = 1
  for (let y = 0; y < h; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  // Stars
  for (const s of G41.stars) {
    ctx.globalAlpha = s.a
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'; ctx.fill()
  }
  ctx.globalAlpha = 1

  // Ceiling
  ctx.fillStyle = '#0f1f35'
  ctx.fillRect(0, 0, w, G41_WALL)
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.8
  ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10
  ctx.beginPath(); ctx.moveTo(0, G41_WALL); ctx.lineTo(w, G41_WALL); ctx.stroke()
  ctx.shadowBlur = 0

  // Floor
  ctx.fillRect(0, h - G41_WALL, w, G41_WALL)
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.8
  ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10
  ctx.beginPath(); ctx.moveTo(0, h - G41_WALL); ctx.lineTo(w, h - G41_WALL); ctx.stroke()
  ctx.shadowBlur = 0

  for (const o of G41.obs) _g41DrawObs(ctx, o, h)

  const pX   = w * 0.22
  const fade = G41.phase === 'dead' ? Math.max(0.1, 1 - G41.deadT * 1.5) : 1
  ctx.globalAlpha = fade
  _g41DrawPlayer(ctx, pX, G41.y, G41.holding && G41.phase === 'playing')
  ctx.globalAlpha = 1

  ctx.textAlign   = 'center'
  ctx.font        = 'bold 28px monospace'
  ctx.fillStyle   = 'rgba(255,255,255,0.92)'
  ctx.shadowColor = '#f97316'; ctx.shadowBlur = 16
  ctx.fillText(G41.score, w / 2, 46)
  ctx.shadowBlur  = 0

  ctx.restore()
}

function _g41DrawObs(ctx, o, h) {
  const sW = 10

  function drawBlock(x, y, bw, bh, spikesDown) {
    if (bh <= 0) return
    ctx.fillStyle = '#080e1c'
    ctx.fillRect(x, y, bw, bh)
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.6
    ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10
    ctx.strokeRect(x + 0.8, y, bw - 1.6, bh)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(249,115,22,0.09)'
    ctx.fillRect(x + 4, y, 8, bh)

    // Spike row on the danger edge
    const spikeY = spikesDown ? y + bh : y
    const dir    = spikesDown ? 1 : -1
    const count  = Math.floor(bw / sW)
    ctx.fillStyle   = '#fb923c'
    ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10
    for (let i = 0; i < count; i++) {
      ctx.beginPath()
      ctx.moveTo(x + i * sW,           spikeY)
      ctx.lineTo(x + i * sW + sW / 2,  spikeY + dir * 12)
      ctx.lineTo(x + i * sW + sW,      spikeY)
      ctx.closePath(); ctx.fill()
    }
    ctx.shadowBlur = 0
  }

  drawBlock(o.x, 0,           G41_OW, o.topH,         true)
  drawBlock(o.x, h - o.botH,  G41_OW, o.botH,         false)
}

function _g41DrawPlayer(ctx, x, y, thrusting) {
  const pw = G41_PW, ph = G41_PH

  if (thrusting) {
    const fl = y + ph + 6 + Math.random() * 10
    const fg = ctx.createLinearGradient(x, y + ph, x, fl)
    fg.addColorStop(0, 'rgba(251,191,36,0.95)')
    fg.addColorStop(0.5, 'rgba(249,115,22,0.7)')
    fg.addColorStop(1,   'rgba(249,115,22,0)')
    ctx.beginPath()
    ctx.moveTo(x - pw * 0.4, y + ph)
    ctx.lineTo(x,             fl)
    ctx.lineTo(x + pw * 0.4, y + ph)
    ctx.closePath()
    ctx.fillStyle = fg; ctx.fill()
  }

  // Body
  ctx.fillStyle   = '#1c0a30'
  ctx.shadowColor = '#f97316'; ctx.shadowBlur = 22
  ctx.fillRect(x - pw, y - ph, pw * 2, ph * 2)
  ctx.shadowBlur  = 0
  ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2
  ctx.shadowColor = '#f97316'; ctx.shadowBlur = 8
  ctx.strokeRect(x - pw + 1, y - ph + 1, pw * 2 - 2, ph * 2 - 2)
  ctx.shadowBlur  = 0

  // Cockpit
  ctx.beginPath()
  ctx.arc(x, y - ph * 0.15, ph * 0.42, 0, Math.PI * 2)
  ctx.fillStyle   = thrusting ? 'rgba(251,191,36,0.75)' : 'rgba(249,115,22,0.45)'
  ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8
  ctx.fill(); ctx.shadowBlur = 0
}
