// ═══════════════════════════════════════════════════════
//  GAME 9 — SWARM LEADER
//  Control a leader particle with mouse/WASD/arrows.
//  Quantum-spawned food orbs appear. Collect them.
//  Repeller enemies spawn that scatter your swarm.
//  Score = orbs collected in 60 seconds.
// ═══════════════════════════════════════════════════════
const G9 = {
  active: false,
  score: 0,
  timeLeft: 60,
  timerInterval: null,
  animFrame: null,
  leaderX: 0, leaderY: 0,
  keys: {},
  orbs: [],
  followers: [],
  canvas: null,
  ctx: null,
}

function stopGame9() {
  clearInterval(G9.timerInterval)
  cancelAnimationFrame(G9.animFrame)
  G9.timerInterval = null
  G9.animFrame = null
  G9.active = false
  G9.keys = {}
  const arena = document.getElementById('g9-arena')
  if (arena) {
    arena.removeEventListener('mousemove', g9MouseMove)
  }
  document.removeEventListener('keydown', g9KeyDown)
  document.removeEventListener('keyup', g9KeyUp)
}
window.stopGame9 = stopGame9

async function initGame9() {
  stopGame9()
  G9.active = false; G9.score = 0; G9.timeLeft = 60; G9.orbs = []; G9.followers = []; G9.keys = {}
  document.getElementById('g9-over').classList.remove('show')
  document.getElementById('g9-score').textContent = '0'
  document.getElementById('g9-overlay').style.display = 'flex'
  document.getElementById('g9-timer-display').textContent = '60s'
  G9.canvas = document.getElementById('g9-canvas')
  G9.ctx = G9.canvas.getContext('2d')
  await initCurby()
}

window.startSwarm = function() {
  document.getElementById('g9-overlay').style.display = 'none'

  const arena = document.getElementById('g9-arena')
  const rect = arena.getBoundingClientRect()
  G9.canvas.width = rect.width
  G9.canvas.height = rect.height

  G9.leaderX = rect.width / 2
  G9.leaderY = rect.height / 2
  G9.active = true
  G9.score = 0; G9.timeLeft = 60; G9.orbs = []

  // Create 8 followers
  G9.followers = Array.from({ length: 8 }, (_, i) => ({
    x: G9.leaderX + (Math.random() - .5) * 60,
    y: G9.leaderY + (Math.random() - .5) * 60,
    vx: 0, vy: 0,
    hue: i * 45,
  }))

  // Spawn initial orbs
  for (let i = 0; i < 5; i++) spawnG9Orb()

  arena.addEventListener('mousemove', g9MouseMove)
  document.addEventListener('keydown', g9KeyDown)
  document.addEventListener('keyup', g9KeyUp)

  G9.timerInterval = setInterval(() => {
    if (!G9.active) return
    G9.timeLeft--
    document.getElementById('g9-timer-display').textContent = G9.timeLeft + 's'
    if (G9.timeLeft <= 0) endGame9()
    // Spawn more orbs over time
    if (G9.timeLeft % 5 === 0) spawnG9Orb()
  }, 1000)

  g9Loop()
}

function g9MouseMove(e) {
  if (!G9.active) return
  const rect = document.getElementById('g9-arena').getBoundingClientRect()
  G9.leaderX = e.clientX - rect.left
  G9.leaderY = e.clientY - rect.top
}

function g9KeyDown(e) {
  if (!document.getElementById('game9').classList.contains('active')) return
  G9.keys[e.key] = true
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault()
}
function g9KeyUp(e) { G9.keys[e.key] = false }

function spawnG9Orb() {
  if (!G9.canvas) return
  const margin = 20
  const x = margin + qRandInt(G9.canvas.width - margin * 2)
  const y = margin + qRandInt(G9.canvas.height - margin * 2)
  const hue = qRandInt(360)
  G9.orbs.push({ x, y, hue, r: 10, age: 0, lifetime: 8000 + qRandInt(4000), spawnedAt: Date.now() })
}

function g9Loop() {
  if (!G9.active) return
  const SPEED = 3
  const w = G9.canvas.width
  const h = G9.canvas.height

  // Keyboard leader movement
  if (G9.keys['ArrowUp']    || G9.keys['w'] || G9.keys['W']) G9.leaderY = Math.max(11, G9.leaderY - SPEED)
  if (G9.keys['ArrowDown']  || G9.keys['s'] || G9.keys['S']) G9.leaderY = Math.min(h - 11, G9.leaderY + SPEED)
  if (G9.keys['ArrowLeft']  || G9.keys['a'] || G9.keys['A']) G9.leaderX = Math.max(11, G9.leaderX - SPEED)
  if (G9.keys['ArrowRight'] || G9.keys['d'] || G9.keys['D']) G9.leaderX = Math.min(w - 11, G9.leaderX + SPEED)

  const ctx = G9.ctx
  ctx.clearRect(0, 0, w, h)

  // Update followers (swarm behaviour)
  for (const f of G9.followers) {
    const dx = G9.leaderX - f.x
    const dy = G9.leaderY - f.y
    const dist = Math.sqrt(dx*dx + dy*dy) || 1
    f.vx += (dx / dist) * 0.4
    f.vy += (dy / dist) * 0.4
    f.vx *= 0.85; f.vy *= 0.85
    f.x += f.vx; f.y += f.vy
    f.x = Math.max(5, Math.min(w - 5, f.x))
    f.y = Math.max(5, Math.min(h - 5, f.y))
  }

  // Draw orbs
  const now = Date.now()
  G9.orbs = G9.orbs.filter(orb => {
    const age = now - orb.spawnedAt
    if (age > orb.lifetime) return false
    const alpha = Math.max(0.2, 1 - age / orb.lifetime)
    ctx.beginPath()
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${orb.hue},90%,65%,${alpha})`
    ctx.shadowColor = `hsl(${orb.hue},90%,65%)`
    ctx.shadowBlur = 10
    ctx.fill()
    ctx.shadowBlur = 0
    return true
  })

  // Check leader→orb collisions
  for (let i = G9.orbs.length - 1; i >= 0; i--) {
    const orb = G9.orbs[i]
    const dx = G9.leaderX - orb.x
    const dy = G9.leaderY - orb.y
    if (Math.sqrt(dx*dx + dy*dy) < 14 + orb.r) {
      G9.score++
      document.getElementById('g9-score').textContent = G9.score
      G9.orbs.splice(i, 1)
      spawnG9Orb()
    }
  }

  // Draw followers
  for (const f of G9.followers) {
    ctx.beginPath()
    ctx.arc(f.x, f.y, 6, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${f.hue},80%,65%,0.8)`
    ctx.shadowColor = `hsl(${f.hue},80%,65%)`
    ctx.shadowBlur = 6
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // Draw leader
  ctx.beginPath()
  ctx.arc(G9.leaderX, G9.leaderY, 12, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(124,58,237,0.9)'
  ctx.shadowColor = '#7c3aed'
  ctx.shadowBlur = 16
  ctx.fill()
  ctx.strokeStyle = '#a78bfa'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.shadowBlur = 0

  // Timer bar
  const pct = G9.timeLeft / 60
  ctx.fillStyle = `hsl(${pct * 120},80%,50%)`
  ctx.fillRect(0, h - 4, w * pct, 4)

  G9.animFrame = requestAnimationFrame(g9Loop)
}

function endGame9() {
  stopGame9()
  window._g9Score = G9.score
  document.getElementById('g9-final-score').textContent = G9.score
  document.getElementById('g9-over-stats').textContent = `${G9.score} orbs collected in 60 seconds`
  renderMedalDisplay('g9-medal-display', 'swarm', G9.score)
  document.getElementById('g9-over').classList.add('show')
}
