// ═══════════════════════════════════════════════════════
//  GAME 36 — CPS TEST
//  Click + Space both count. 10 seconds. Integer score.
// ═══════════════════════════════════════════════════════

const G36_DURATION = 10
const G36_SERVER   = 'https://some-quantum-games.onrender.com'

let G36 = { active: false, done: false, clicks: 0, timeLeft: G36_DURATION, startTime: 0, ripples: [], raf: null, lastTime: 0 }
let G36_socket     = null
let G36_roomCode   = null
let G36_opponentCPS = null
let G36_opponentDone = false
window._g36Score   = 0

// ── socket ───────────────────────────────────────────
function g36GetSocket() {
  if (G36_socket && G36_socket.connected) return G36_socket
  G36_socket = io(G36_SERVER)

  G36_socket.on('room-created', code => {
    G36_roomCode = code
    _g36RoomStatus(`Room created! Share code: <b style="color:#a5b4fc;letter-spacing:3px;">${code}</b><br>Waiting for friend…`)
  })

  G36_socket.on('game-ready', () => {
    _g36RoomStatus('Friend joined! Starting…')
    setTimeout(() => startCPS(), 800)
  })

  G36_socket.on('join-error', msg => {
    _g36RoomStatus(`❌ ${msg}`, true)
  })

  G36_socket.on('opponent-score', score => {
    G36_opponentCPS = score
    _g36UpdateOppHud()
  })

  G36_socket.on('opponent-done', score => {
    G36_opponentCPS  = score
    G36_opponentDone = true
    _g36UpdateOppHud()
  })

  G36_socket.on('opponent-left', () => {
    G36_opponentCPS = null
    _g36RoomStatus('Opponent disconnected.', true)
  })

  return G36_socket
}

function _g36UpdateOppHud() {
  const hud  = document.getElementById('g36-opp-hud')
  const stat = document.getElementById('g36-opp-stat')
  if (!hud || !stat) return
  if (G36_roomCode && G36_opponentCPS !== null) {
    hud.style.display = 'flex'
    stat.textContent  = G36_opponentCPS + ' CPS'
  } else {
    hud.style.display = 'none'
  }
}

function _g36RoomStatus(html, isError = false) {
  const el = document.getElementById('g36-room-status')
  if (!el) return
  el.style.color = isError ? 'var(--danger)' : 'var(--muted)'
  el.innerHTML = html
}

window.g36CreateRoom = function() {
  _g36RoomStatus('Connecting…')
  const sock = g36GetSocket()
  sock.once('connect', () => sock.emit('create-room'))
  if (sock.connected) sock.emit('create-room')
}

window.g36JoinRoom = function() {
  const code = document.getElementById('g36-room-input').value.trim().toUpperCase()
  if (!code || code.length < 4) { _g36RoomStatus('Enter a valid room code.', true); return }
  _g36RoomStatus('Joining…')
  G36_roomCode = code
  const sock = g36GetSocket()
  const doJoin = () => sock.emit('join-room', code)
  sock.once('connect', doJoin)
  if (sock.connected) doJoin()
}

// ── game lifecycle ────────────────────────────────────
function stopGame36() {
  if (G36.raf) { cancelAnimationFrame(G36.raf); G36.raf = null }
  G36.active = false
  const c = document.getElementById('g36-canvas')
  if (c) c.onclick = null
  document.removeEventListener('keydown', _g36Key)
}
window.stopGame36 = stopGame36

window.initGame36 = async function() {
  stopGame36()
  G36 = { active: false, done: false, clicks: 0, timeLeft: G36_DURATION, startTime: 0, ripples: [], raf: null, lastTime: 0 }
  G36_opponentCPS  = null
  G36_opponentDone = false
  window._g36Score = 0
  document.getElementById('g36-over').classList.remove('show')
  document.getElementById('g36-overlay').style.display = 'flex'
  _g36RoomStatus('')
  await initCurby()
}

window.startCPS = function() {
  SFX.resume()
  document.getElementById('g36-overlay').style.display = 'none'
  if (G36_roomCode) {
    const hud = document.getElementById('g36-opp-hud')
    if (hud) hud.style.display = 'flex'
  }
  const c = document.getElementById('g36-canvas')
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  G36 = { active: true, done: false, clicks: 0, timeLeft: G36_DURATION, startTime: 0, ripples: [], raf: null, lastTime: performance.now() }
  G36_opponentCPS  = G36_roomCode ? (G36_opponentCPS ?? 0) : null
  G36_opponentDone = false
  c.onclick = e => _g36Click(e.offsetX, e.offsetY)
  document.addEventListener('keydown', _g36Key)
  G36.raf = requestAnimationFrame(_g36Loop)
}

function _g36Key(e) {
  if (!document.getElementById('game36').classList.contains('active')) return
  if (e.code === 'Space') { e.preventDefault(); _g36Click(null, null) }
}

function _g36Click(x, y) {
  if (!G36.active || G36.done) return
  if (G36.startTime === 0) G36.startTime = performance.now()
  G36.clicks++
  SFX.click?.()
  if (x !== null) {
    G36.ripples.push({ x, y, r: 0, maxR: 60, alpha: 1, t: 0 })
  } else {
    const c = document.getElementById('g36-canvas')
    G36.ripples.push({ x: c.width/2, y: c.height/2, r: 0, maxR: 80, alpha: 1, t: 0 })
  }
}

function _g36Loop(ts) {
  if (!G36.active) return
  const dt = Math.min((ts - G36.lastTime) / 1000, 0.05)
  G36.lastTime = ts

  if (G36.startTime > 0 && !G36.done) {
    G36.timeLeft = Math.max(0, G36_DURATION - (ts - G36.startTime) / 1000)
    if (G36.timeLeft === 0) { _g36End(); return }

    // broadcast score to opponent every ~500ms via a simple frame counter trick
    if (G36_socket && G36_roomCode && Math.round(ts / 500) !== Math.round((ts - dt*1000) / 500)) {
      const elapsed = (ts - G36.startTime) / 1000
      const liveCPS = elapsed > 0.3 ? Math.round(G36.clicks / elapsed) : 0
      G36_socket.emit('score-update', { code: G36_roomCode, score: liveCPS })
    }
  }

  G36.ripples = G36.ripples.filter(r => {
    r.t += dt; r.r += 180 * dt; r.alpha = Math.max(0, 1 - r.t * 2.5)
    return r.alpha > 0
  })

  _g36Draw()
  G36.raf = requestAnimationFrame(_g36Loop)
}

function _g36End() {
  G36.done   = true
  G36.active = false
  cancelAnimationFrame(G36.raf); G36.raf = null
  document.removeEventListener('keydown', _g36Key)

  const cps = Math.round(G36.clicks / G36_DURATION)
  window._g36Score = cps

  if (G36_socket && G36_roomCode) {
    G36_socket.emit('game-over', { code: G36_roomCode, score: cps })
  }

  let resultHtml = `${cps} CPS  (${G36.clicks} clicks)`
  if (G36_roomCode && G36_opponentCPS !== null) {
    const oppFinal = G36_opponentDone ? G36_opponentCPS : '…'
    const won      = G36_opponentDone && cps > G36_opponentCPS
    const lost     = G36_opponentDone && cps < G36_opponentCPS
    const winner   = G36_opponentDone
      ? (won ? '🏆 You win!' : lost ? '😔 They win!' : '🤝 Tie!')
      : ''
    if (G36_opponentDone && typeof recordMpResult === 'function') recordMpResult('cps', won)
    resultHtml += `<br><span style="font-size:.9rem;color:#a5b4fc;">Opponent: ${oppFinal} CPS ${winner}</span>`
  }

  document.getElementById('g36-final-score').innerHTML = resultHtml
  renderMedalDisplay('g36-medal-display', 'cps', cps)
  document.getElementById('g36-over').classList.add('show')
  SFX.win()
}

function _g36Draw() {
  const c   = document.getElementById('g36-canvas')
  const ctx = c.getContext('2d')
  const W = c.width, H = c.height

  ctx.fillStyle = '#0a0a1a'
  ctx.fillRect(0, 0, W, H)

  const notStarted = G36.startTime === 0
  if (notStarted) {
    ctx.strokeStyle = 'rgba(99,102,241,0.2)'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 8])
    const pad = 24
    ctx.strokeRect(pad, pad, W - pad*2, H - pad*2)
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(99,102,241,0.5)'
    ctx.font = `bold ${Math.min(W/12, 32)}px monospace`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('CLICK OR SPACE TO START', W/2, H/2 + 60)
  }

  for (const r of G36.ripples) {
    ctx.strokeStyle = `rgba(129,140,248,${r.alpha})`
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2); ctx.stroke()
  }

  const cx = W/2, cy = H * 0.38, arcR = Math.min(W, H) * 0.28
  const progress = G36.startTime === 0 ? 1 : G36.timeLeft / G36_DURATION
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 10; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(cx, cy, arcR, -Math.PI/2, Math.PI*2 - Math.PI/2); ctx.stroke()
  const col = progress > 0.5 ? '#6366f1' : progress > 0.25 ? '#f59e0b' : '#ef4444'
  ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 18
  ctx.beginPath(); ctx.arc(cx, cy, arcR, -Math.PI/2, Math.PI*2 * progress - Math.PI/2); ctx.stroke()
  ctx.shadowBlur = 0

  ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.floor(arcR * 0.7)}px monospace`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(G36.startTime === 0 ? G36_DURATION : Math.ceil(G36.timeLeft), cx, cy)

  const elapsed  = G36.startTime > 0 ? (performance.now() - G36.startTime) / 1000 : 0
  const liveCPS  = elapsed > 0.3 ? Math.round(G36.clicks / elapsed) : 0
  ctx.fillStyle = '#a5b4fc'; ctx.font = `bold ${Math.floor(arcR * 0.25)}px monospace`
  ctx.fillText(G36.startTime === 0 ? 'CPS' : `${liveCPS} CPS`, cx, cy + arcR * 0.55)

  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.min(W/5, 90)}px monospace`
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = '#6366f1'; ctx.shadowBlur = 20
  ctx.fillText(G36.clicks, W/2, H * 0.82)
  ctx.shadowBlur = 0

  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = `${Math.min(W/20, 18)}px monospace`
  ctx.fillText('CLICKS', W/2, H * 0.82 + 22)
}
