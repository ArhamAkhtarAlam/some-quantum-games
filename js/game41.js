// ═══════════════════════════════════════════════════════
//  GAME 41 — JET RUSH
//  GD Platformer/Jetpack style. Full 2D movement.
//  Screen auto-scrolls right — get left behind and die.
//  Arrow/WASD to thrust. Mobile: touch toward where you want to go.
// ═══════════════════════════════════════════════════════

const G41_GRAV    = 920    // heavy gravity (GD-style)
const G41_UP_ACC  = 1950   // upward thrust (net -1030 when held)
const G41_HSPD    = 215    // instant horizontal speed (GD-style)
const G41_VYMAX   = 480
const G41_VXMAX   = 215
const G41_PW      = 11     // player half-width
const G41_PH      = 11     // player half-height
const G41_OW      = 44     // obstacle wall width
const G41_GAP0    = 210    // initial gap height
const G41_GAP_MIN = 92
const G41_OBS_SEP = 310    // world-space spacing between walls
const G41_CAM0    = 82     // initial camera scroll speed px/s
const G41_CAM_ACC = 2.0    // camera acceleration per second

const G41 = {
  active: false, phase: 'idle',
  x: 0, y: 0,
  vx: 0, vy: 0,
  camX: 0, camSpd: G41_CAM0,
  score: 0,
  obs: [],
  gap: G41_GAP0,
  keys: {},
  touchX: null, touchY: null,
  stars: [], raf: null, lastTime: 0,
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
    spd: Math.random() * 20 + 5,
    a: Math.random() * 0.45 + 0.3,
  }))

  G41.camX     = 0
  G41.camSpd   = G41_CAM0
  G41.x        = c.width * 0.28
  G41.y        = c.height / 2
  G41.vx       = 0
  G41.vy       = 0
  G41.score    = 0
  G41.obs      = []
  G41.gap      = G41_GAP0
  G41.keys     = {}
  G41.touchX   = null
  G41.touchY   = null
  G41.deadT    = 0
  G41.showOver = false
  G41.active   = true
  G41.phase    = 'playing'
  window._g41Score = 0
  document.getElementById('g41-score-hud').textContent = '0'

  let wx = G41.x + c.width * 0.55
  for (let i = 0; i < 5; i++) { _g41Spawn(wx, c.height); wx += G41_OBS_SEP }

  window.addEventListener('keydown', _g41Kd)
  window.addEventListener('keyup',   _g41Ku)
  c.addEventListener('touchstart', _g41Ts, { passive: false })
  c.addEventListener('touchmove',  _g41Tm, { passive: false })
  c.addEventListener('touchend',   _g41Te, { passive: false })

  G41.lastTime = performance.now()
  G41.raf = requestAnimationFrame(_g41Loop)
}

window.stopGame41 = function() {
  G41.active = false
  G41.keys   = {}
  if (G41.raf) { cancelAnimationFrame(G41.raf); G41.raf = null }
  const c = _g41C()
  if (c) {
    c.removeEventListener('touchstart', _g41Ts)
    c.removeEventListener('touchmove',  _g41Tm)
    c.removeEventListener('touchend',   _g41Te)
  }
  window.removeEventListener('keydown', _g41Kd)
  window.removeEventListener('keyup',   _g41Ku)
}

const G41_UP    = new Set(['ArrowUp',   'KeyW', 'Space'])
const G41_DOWN  = new Set(['ArrowDown',  'KeyS'])
const G41_LEFT  = new Set(['ArrowLeft',  'KeyA'])
const G41_RIGHT = new Set(['ArrowRight', 'KeyD'])

function _g41Kd(e) {
  if ([...G41_UP, ...G41_DOWN, ...G41_LEFT, ...G41_RIGHT].includes(e.code)) e.preventDefault()
  G41.keys[e.code] = true
}
function _g41Ku(e) { G41.keys[e.code] = false }

function _g41TouchPos(e) {
  const c = _g41C()
  const rect = c.getBoundingClientRect()
  const t = e.touches[0]
  return {
    x: (t.clientX - rect.left) * (c.width  / rect.width),
    y: (t.clientY - rect.top)  * (c.height / rect.height),
  }
}
function _g41Ts(e) { e.preventDefault(); const p = _g41TouchPos(e); G41.touchX = p.x; G41.touchY = p.y }
function _g41Tm(e) { e.preventDefault(); const p = _g41TouchPos(e); G41.touchX = p.x; G41.touchY = p.y }
function _g41Te(e) { e.preventDefault(); if (e.touches.length === 0) { G41.touchX = null; G41.touchY = null } }

function _g41Spawn(wx, h) {
  const margin = Math.floor(h * 0.10)
  const maxTop = Math.floor(h - margin * 2 - G41.gap)
  const topH   = margin + (maxTop > 0 ? qRandInt(maxTop + 1) : 0)
  const botH   = Math.max(margin, h - topH - G41.gap)
  G41.obs.push({ wx, topH, botH, passed: false })
}

function _g41Loop(ts) {
  if (!G41.active) return
  const dt = Math.min((ts - G41.lastTime) / 1000, 0.05)
  G41.lastTime = ts
  const c = _g41C(); const w = c.width, h = c.height

  // Scroll stars
  for (const s of G41.stars) {
    s.x -= s.spd * dt
    if (s.x < 0) { s.x = w + 2; s.y = Math.random() * h }
  }

  if (G41.phase === 'playing') {
    // Camera auto-scroll
    G41.camSpd = Math.min(320, G41.camSpd + G41_CAM_ACC * dt)
    G41.camX  += G41.camSpd * dt

    // Input → forces
    const up    = G41.keys['ArrowUp']    || G41.keys['KeyW'] || G41.keys['Space']
    const down  = G41.keys['ArrowDown']  || G41.keys['KeyS']
    const left  = G41.keys['ArrowLeft']  || G41.keys['KeyA']
    const right = G41.keys['ArrowRight'] || G41.keys['KeyD']

    // Touch direction (from player screen pos toward touch point)
    let tDx = 0, tDy = 0
    if (G41.touchX !== null) {
      const pSx = G41.x - G41.camX
      const dx = G41.touchX - pSx
      const dy = G41.touchY - G41.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len > 18) { tDx = dx / len; tDy = dy / len }
    }

    // Horizontal: instant velocity (GD-style — no momentum)
    if      (right)              G41.vx =  G41_HSPD
    else if (left)               G41.vx = -G41_HSPD
    else if (G41.touchX !== null) G41.vx = tDx * G41_HSPD
    else                         G41.vx =  0
    G41.x += G41.vx * dt

    // Vertical: gravity always, thrust when UP held
    G41.vy += G41_GRAV * dt
    if (up)                  G41.vy -= G41_UP_ACC * dt
    if (down)                G41.vy += 500 * dt
    if (G41.touchX !== null) G41.vy += tDy * G41_UP_ACC * dt
    G41.vy = Math.max(-G41_VYMAX, Math.min(G41_VYMAX, G41.vy))
    G41.y += G41.vy * dt

    // Keep player from going too far right
    const maxScreenX = G41.camX + w * 0.82
    if (G41.x > maxScreenX) { G41.x = maxScreenX; G41.vx = Math.min(G41.vx, 0) }

    // Score + obstacle management
    for (const o of G41.obs) {
      const oSx = o.wx - G41.camX
      if (!o.passed && oSx + G41_OW < G41.x - G41.camX - G41_PW) {
        o.passed = true
        G41.score++
        window._g41Score = G41.score
        document.getElementById('g41-score-hud').textContent = G41.score
        G41.gap = Math.max(G41_GAP_MIN, G41_GAP0 - G41.score * 1.8)
      }
    }
    G41.obs = G41.obs.filter(o => o.wx - G41.camX > -G41_OW - 20)
    const last = G41.obs[G41.obs.length - 1]
    if (!last || last.wx - G41.camX < w - G41_OBS_SEP) _g41Spawn(G41.camX + w + 60, h)

    // Ceiling / floor
    const WALL = 6
    if (G41.y - G41_PH <= WALL || G41.y + G41_PH >= h - WALL) { _g41Die(); }
    // Left edge (pushed off screen)
    else if (G41.x - G41.camX <= G41_PW) { _g41Die(); }
    else {
      // Obstacle collision
      const pSx = G41.x - G41.camX
      for (const o of G41.obs) {
        const oSx = o.wx - G41.camX
        if (pSx + G41_PW <= oSx || pSx - G41_PW >= oSx + G41_OW) continue
        if (G41.y - G41_PH < o.topH || G41.y + G41_PH > h - o.botH) { _g41Die(); break }
      }
    }

  } else if (G41.phase === 'dead') {
    G41.camX  += G41.camSpd * 0.4 * dt
    G41.vy     = Math.min(G41_VYMAX, G41.vy + G41_GRAV * dt)
    G41.y     += G41.vy * dt
    G41.deadT += dt
    if (G41.deadT >= 1.5 && !G41.showOver) {
      G41.showOver     = true
      window._g41Score = G41.score
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
  G41.phase = 'dead'; G41.deadT = 0
  G41.keys  = {}; G41.touchX = null; G41.touchY = null
  SFX.die()
  const c = _g41C()
  c.removeEventListener('touchstart', _g41Ts)
  c.removeEventListener('touchmove',  _g41Tm)
  c.removeEventListener('touchend',   _g41Te)
  window.removeEventListener('keydown', _g41Kd)
  window.removeEventListener('keyup',   _g41Ku)
}

function _g41Draw(ctx, w, h) {
  ctx.save()
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'

  ctx.fillStyle = '#030710'
  ctx.fillRect(0, 0, w, h)

  // Scan lines
  ctx.strokeStyle = 'rgba(249,115,22,0.04)'
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

  // Ceiling & floor
  const WALL = 6
  ctx.fillStyle = '#0f1f35'
  ctx.fillRect(0, 0, w, WALL)
  ctx.fillRect(0, h - WALL, w, WALL)
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.8
  ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10
  ctx.beginPath(); ctx.moveTo(0, WALL);       ctx.lineTo(w, WALL);       ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, h - WALL);   ctx.lineTo(w, h - WALL);   ctx.stroke()
  ctx.shadowBlur = 0

  // Obstacles
  for (const o of G41.obs) _g41DrawObs(ctx, o.wx - G41.camX, o.topH, o.botH, h)

  // Left-edge danger line (visual cue)
  ctx.strokeStyle = 'rgba(239,68,68,0.55)'
  ctx.lineWidth   = 2
  ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 8
  ctx.setLineDash([6, 6])
  ctx.beginPath(); ctx.moveTo(G41_PW + 2, WALL); ctx.lineTo(G41_PW + 2, h - WALL); ctx.stroke()
  ctx.setLineDash([])
  ctx.shadowBlur = 0

  // Player
  const pSx  = G41.x - G41.camX
  const alpha = G41.phase === 'dead' ? Math.max(0.1, 1 - G41.deadT * 1.5) : 1
  const thrusting = G41.phase === 'playing' && (
    G41.keys['ArrowUp'] || G41.keys['KeyW'] || G41.keys['Space'] ||
    G41.keys['ArrowDown'] || G41.keys['KeyS'] ||
    G41.keys['ArrowLeft'] || G41.keys['KeyA'] ||
    G41.keys['ArrowRight'] || G41.keys['KeyD'] ||
    G41.touchX !== null
  )
  ctx.globalAlpha = alpha
  _g41DrawPlayer(ctx, pSx, G41.y, thrusting)
  ctx.globalAlpha = 1

  // Score
  ctx.textAlign   = 'center'
  ctx.font        = 'bold 28px monospace'
  ctx.fillStyle   = 'rgba(255,255,255,0.92)'
  ctx.shadowColor = '#f97316'; ctx.shadowBlur = 16
  ctx.fillText(G41.score, w / 2, 46)
  ctx.shadowBlur = 0

  // Speed indicator
  ctx.textAlign  = 'right'
  ctx.font       = '11px monospace'
  ctx.fillStyle  = 'rgba(249,115,22,0.55)'
  ctx.fillText(`${Math.round(G41.camSpd)} px/s`, w - 12, 36)

  // Touch hint (fades at score > 2)
  if (G41.score < 3 && G41.phase === 'playing') {
    ctx.globalAlpha = Math.max(0, 0.6 - G41.score * 0.2)
    ctx.textAlign   = 'center'
    ctx.font        = '12px monospace'
    ctx.fillStyle   = '#f97316'
    ctx.fillText('Hold keys / touch toward where you want to fly', w / 2, h - 22)
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

function _g41DrawObs(ctx, sx, topH, botH, h) {
  const OW = G41_OW

  function block(x, y, bw, bh, spikesDown) {
    if (bh <= 0) return
    ctx.fillStyle = '#080e1c'
    ctx.fillRect(x, y, bw, bh)
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.6
    ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10
    ctx.strokeRect(x + 0.8, y, bw - 1.6, bh)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(249,115,22,0.09)'
    ctx.fillRect(x + 4, y, 8, bh)
    // Danger-edge spikes
    const sW = 10, spikeY = spikesDown ? y + bh : y, dir = spikesDown ? 1 : -1
    const count = Math.floor(bw / sW)
    ctx.fillStyle   = '#fb923c'
    ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10
    for (let i = 0; i < count; i++) {
      ctx.beginPath()
      ctx.moveTo(x + i * sW,          spikeY)
      ctx.lineTo(x + i * sW + sW / 2, spikeY + dir * 11)
      ctx.lineTo(x + i * sW + sW,     spikeY)
      ctx.closePath(); ctx.fill()
    }
    ctx.shadowBlur = 0
  }

  block(sx, 0,          OW, topH,  true)
  block(sx, h - botH,   OW, botH,  false)
}

function _g41DrawPlayer(ctx, x, y, thrusting) {
  const pw = G41_PW, ph = G41_PH

  if (thrusting) {
    // Flame: thrust direction opposite to velocity
    const spd  = Math.sqrt(G41.vx * G41.vx + G41.vy * G41.vy)
    const fdx  = spd > 5 ? -G41.vx / spd : 0
    const fdy  = spd > 5 ? -G41.vy / spd : 1
    const fl   = 22 + Math.random() * 10
    const fg   = ctx.createLinearGradient(x, y, x + fdx * fl, y + fdy * fl)
    fg.addColorStop(0,   'rgba(251,191,36,0.95)')
    fg.addColorStop(0.5, 'rgba(249,115,22,0.7)')
    fg.addColorStop(1,   'rgba(249,115,22,0)')
    ctx.beginPath()
    ctx.moveTo(x - pw * 0.4 * (1 - Math.abs(fdx)), y - ph * 0.4 * (1 - Math.abs(fdy)))
    ctx.lineTo(x + fdx * fl, y + fdy * fl)
    ctx.lineTo(x + pw * 0.4 * (1 - Math.abs(fdx)), y + ph * 0.4 * (1 - Math.abs(fdy)))
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

  // Cockpit glow
  ctx.beginPath()
  ctx.arc(x, y - ph * 0.1, ph * 0.38, 0, Math.PI * 2)
  ctx.fillStyle   = thrusting ? 'rgba(251,191,36,0.8)' : 'rgba(249,115,22,0.4)'
  ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8
  ctx.fill(); ctx.shadowBlur = 0
}
