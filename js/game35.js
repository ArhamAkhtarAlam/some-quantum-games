// ═══════════════════════════════════════════════════════
//  GAME 35 — WAVE DASH
//  GD wave gamemode. Hold to angle up, release to go down.
//  Starts wide and slow — gets tighter and faster.
// ═══════════════════════════════════════════════════════
const G35_WAVE_SPD = 255
const G35_PR       = 7
const G35_SERVER   = 'https://some-quantum-games.onrender.com'

let G35_socket       = null
let G35_roomCode     = null
let G35_oppScore     = null
let G35_oppDone      = false

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
  wallGenVel: 0,   // velocity for smooth round corners
  wallGenDist: 0,  // total cols generated (for difficulty ramp)
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

function _g35UpdateOppHud() {
  const hud  = document.getElementById('g35-opp-hud')
  const stat = document.getElementById('g35-opp-stat')
  if (!hud || !stat) return
  if (G35_roomCode && G35_oppScore !== null) {
    hud.style.display = 'flex'
    stat.textContent  = G35_oppScore + ' blocks'
  }
}

function _g35RoomStatus(html, isError = false) {
  const el = document.getElementById('g35-room-status')
  if (!el) return
  el.style.color = isError ? 'var(--danger)' : 'var(--muted)'
  el.innerHTML = html
}

function g35GetSocket() {
  if (G35_socket && G35_socket.connected) return G35_socket
  G35_socket = io(G35_SERVER)
  G35_socket.on('room-created', code => {
    G35_roomCode = code
    _g35RoomStatus(`Room created! Share code: <b style="color:#67e8f9;letter-spacing:3px;">${code}</b><br>Waiting for friend…`)
  })
  G35_socket.on('game-ready', () => {
    _g35RoomStatus('Friend joined! Starting…')
    setTimeout(() => startWaveDash(), 800)
  })
  G35_socket.on('join-error',     msg   => _g35RoomStatus(`❌ ${msg}`, true))
  G35_socket.on('opponent-score', score => { G35_oppScore = score; _g35UpdateOppHud() })
  G35_socket.on('opponent-done',  score => { G35_oppScore = score; G35_oppDone = true; _g35UpdateOppHud() })
  G35_socket.on('opponent-left',  ()    => { G35_oppScore = null; _g35RoomStatus('Opponent disconnected.', true) })
  G35_socket.on('force-end', ({ loserScore }) => {
    // Opponent crashed — we win
    stopGame35()
    window._g35Score = G35.score
    document.getElementById('g35-final-score').textContent = G35.score + ' blocks'
    renderMedalDisplay('g35-medal-display', 'wavedash', G35.score)
    document.getElementById('g35-mp-result').innerHTML =
      `Opponent crashed at ${loserScore} blocks! 🏆 <b>You win!</b>`
    document.getElementById('g35-over').classList.add('show')
    if (typeof recordMpResult === 'function') recordMpResult('wavedash', true)
  })
  return G35_socket
}

window.g35CreateRoom = function() {
  _g35RoomStatus('Connecting…')
  const sock = g35GetSocket()
  sock.once('connect', () => sock.emit('create-room'))
  if (sock.connected) sock.emit('create-room')
}

window.g35JoinRoom = function() {
  const code = document.getElementById('g35-room-input').value.trim().toUpperCase()
  if (!code || code.length < 4) { _g35RoomStatus('Enter a valid room code.', true); return }
  _g35RoomStatus('Joining…')
  G35_roomCode = code
  const sock = g35GetSocket()
  const doJoin = () => sock.emit('join-room', code)
  sock.once('connect', doJoin)
  if (sock.connected) doJoin()
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
  _g35Canvas  = null
  _g35WallPat = null
  G35_oppScore = null
  G35_oppDone  = false
  document.getElementById('g35-over').classList.remove('show')
  document.getElementById('g35-overlay').style.display = 'flex'
  _g35RoomStatus('')
  await initCurby()
}

window.startWaveDash = function() {
  SFX.resume(); SFX.click()
  if (G35_roomCode) {
    const hud = document.getElementById('g35-opp-hud')
    if (hud) hud.style.display = 'flex'
  }
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
  G35.wallGenTimer  = 240  // delay first curve well past the safe zone
  G35.wallGenVel    = 0
  G35.wallGenDist   = 0

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
    G35.wallGenDist++
    const margin   = G35.gapH / 2 + 24
    const progress = Math.min(1, G35.wallGenDist / 2400)
    const spread   = (0.12 + progress * 0.28) * h
    const lo       = Math.max(margin, h / 2 - spread)
    const hi       = Math.min(h - margin, h / 2 + spread)
    const step     = G35_WAVE_SPD / G35.speed  // match player wave slope

    // Snap to target when within one step → immediately reverse to opposite half
    if (Math.abs(G35.wallGenTarget - G35.wallGenCy) <= step) {
      G35.wallGenCy = G35.wallGenTarget
      const mid = (lo + hi) / 2
      if (G35.wallGenCy <= mid) {
        // currently low → go high
        G35.wallGenTarget = mid + qRandInt(Math.max(1, Math.floor(hi - mid + 1)))
      } else {
        // currently high → go low
        G35.wallGenTarget = lo + qRandInt(Math.max(1, Math.floor(mid - lo + 1)))
      }
    } else {
      G35.wallGenCy += Math.sign(G35.wallGenTarget - G35.wallGenCy) * step
    }

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
    G35.gapH  = Math.max(88, G35.gapH - px * 0.003)
    G35.speed = Math.min(380, 150 + G35.scrollX * 0.018)
    g35GenCols(px, h)
  }

  // Score
  const newScore = Math.floor(G35.scrollX / 80)
  if (newScore !== G35.score) {
    G35.score = newScore
    document.getElementById('g35-score-hud').textContent = G35.score
    if (G35_socket && G35_roomCode && G35.score % 5 === 0) {
      G35_socket.emit('score-update', { code: G35_roomCode, score: G35.score })
    }
  }

  // Wave physics — instant direction change (authentic GD feel)
  G35.vy = G35.holding ? -G35_WAVE_SPD : G35_WAVE_SPD
  G35.y  += G35.vy * dt
  G35.y   = Math.max(G35_PR, Math.min(h - G35_PR, G35.y))

  // Trail — store world scroll position so it renders as a zigzag path
  G35.trail.push({ sx: G35.scrollX, y: G35.y })
  if (G35.trail.length > 120) G35.trail.shift()

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

  // Neon trail — rendered as a glowing zigzag line showing the actual path
  if (G35.trail.length > 1) {
    // Build visible segment (clip to screen)
    const pts = []
    for (let i = 0; i < G35.trail.length; i++) {
      const p = G35.trail[i]
      const sx = G35.cx - (G35.scrollX - p.sx)
      if (sx >= -4) pts.push({ x: sx, y: p.y })
    }
    if (pts.length > 1) {
      // Outer glow pass
      ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 10
      ctx.lineWidth = 5
      ctx.strokeStyle = 'rgba(74,222,128,0.25)'
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
      // Bright core line
      ctx.shadowBlur = 6
      ctx.lineWidth = 2
      ctx.strokeStyle = '#4ade80'
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
    }
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

  if (G35_socket && G35_roomCode) {
    G35_socket.emit('player-died', { code: G35_roomCode, score: G35.score })
    if (typeof recordMpResult === 'function') recordMpResult('wavedash', false)
  }

  document.getElementById('g35-final-score').textContent = G35.score + ' blocks'
  renderMedalDisplay('g35-medal-display', 'wavedash', G35.score)

  const mpEl = document.getElementById('g35-mp-result')
  if (mpEl && G35_roomCode) {
    mpEl.innerHTML = G35_oppScore !== null
      ? `Opponent was at ${G35_oppScore} blocks. 😔 <b>You crashed first!</b>`
      : ''
  }

  document.getElementById('g35-over').classList.add('show')
}
