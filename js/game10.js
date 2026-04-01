// ═══════════════════════════════════════════════════════
//  GAME 10 — GRAVITY WELLS
//  Wells move smoothly around the arena and bounce off walls.
//  A new well spawns every 15 seconds — survive forever.
//  Score = deciseconds survived.
// ═══════════════════════════════════════════════════════
const G10 = {
  active: false,
  startTime: null,
  elapsed: 0,
  animFrame: null,
  keys: {},
  playerX: 0, playerY: 0,
  vx: 0, vy: 0,
  wells: [],
  orbs: [],
  orbScore: 0,
  canvas: null,
  ctx: null,
  lastSpawnTime: 0, // elapsed seconds when last well was added
}

function stopGame10() {
  cancelAnimationFrame(G10.animFrame)
  G10.animFrame = null
  G10.active = false
  G10.keys = {}
  const arena = document.getElementById('g10-arena')
  if (arena) arena.removeEventListener('mousemove', g10MouseMove)
  document.removeEventListener('keydown', g10KeyDown)
  document.removeEventListener('keyup', g10KeyUp)
}
window.stopGame10 = stopGame10

async function initGame10() {
  stopGame10()
  G10.active = false; G10.elapsed = 0; G10.keys = {}
  G10.vx = 0; G10.vy = 0; G10.wells = []; G10.orbs = []; G10.orbScore = 0
  G10.lastSpawnTime = 0
  document.getElementById('g10-over').classList.remove('show')
  document.getElementById('g10-score').textContent = '0.0s'
  document.getElementById('g10-overlay').style.display = 'flex'
  document.getElementById('g10-timer-display').textContent = ''
  G10.canvas = document.getElementById('g10-canvas')
  G10.ctx = G10.canvas.getContext('2d')
  await initCurby()
}

window.startGravity = function() {
  document.getElementById('g10-overlay').style.display = 'none'

  const arena = document.getElementById('g10-arena')
  const rect = arena.getBoundingClientRect()
  G10.canvas.width = rect.width
  G10.canvas.height = rect.height

  const w = G10.canvas.width
  const h = G10.canvas.height

  G10.playerX = w / 2
  G10.playerY = h / 2
  G10.vx = 0; G10.vy = 0
  G10.active = true
  G10.startTime = Date.now()
  G10.elapsed = 0
  G10.lastSpawnTime = 0

  // Start with 2 wells
  G10.wells = []
  spawnG10Well()
  spawnG10Well()

  // Spawn orbs
  G10.orbs = []
  for (let i = 0; i < 5; i++) spawnG10Orb()

  arena.addEventListener('mousemove', g10MouseMove)
  document.addEventListener('keydown', g10KeyDown)
  document.addEventListener('keyup', g10KeyUp)

  g10Loop()
}

function spawnG10Well() {
  const w = G10.canvas.width
  const h = G10.canvas.height
  const margin = 40
  let x, y
  do {
    x = margin + qRandInt(w - margin * 2)
    y = margin + qRandInt(h - margin * 2)
  } while (Math.hypot(x - G10.playerX, y - G10.playerY) < 120)

  const angle = qRandInt(628) / 100
  const speed = 0.5 + qRandInt(80) / 100 // 0.5–1.3 px/frame, gets spicier

  G10.wells.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    mass: 600 + qRandInt(400),
    r: 16,
  })
}

function g10MouseMove(e) {
  if (!G10.active) return
  const rect = document.getElementById('g10-arena').getBoundingClientRect()
  const tx = e.clientX - rect.left
  const ty = e.clientY - rect.top
  G10.vx += (tx - G10.playerX) * 0.015
  G10.vy += (ty - G10.playerY) * 0.015
}

function g10KeyDown(e) {
  if (!document.getElementById('game10').classList.contains('active')) return
  G10.keys[e.key] = true
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault()
}
function g10KeyUp(e) { G10.keys[e.key] = false }

function spawnG10Orb() {
  const w = G10.canvas.width
  const h = G10.canvas.height
  const margin = 20
  let x, y, safe, attempts = 0
  do {
    x = margin + qRandInt(w - margin * 2)
    y = margin + qRandInt(h - margin * 2)
    safe = G10.wells.every(well => Math.hypot(x - well.x, y - well.y) > 50)
    attempts++
  } while (!safe && attempts < 20)
  G10.orbs.push({ x, y, hue: qRandInt(360), r: 8 })
}

function g10Loop() {
  if (!G10.active) return
  const now = Date.now()
  G10.elapsed = (now - G10.startTime) / 1000

  document.getElementById('g10-score').textContent = G10.elapsed.toFixed(1) + 's'
  document.getElementById('g10-timer-display').textContent =
    `${G10.wells.length} wells · next in ${Math.max(0, 15 - Math.floor(G10.elapsed - G10.lastSpawnTime))}s`

  // Spawn a new well every 15 seconds
  if (G10.elapsed - G10.lastSpawnTime >= 15) {
    G10.lastSpawnTime = Math.floor(G10.elapsed / 15) * 15
    spawnG10Well()
  }

  const w = G10.canvas.width
  const h = G10.canvas.height
  const ctx = G10.ctx

  // Keyboard thrust
  const THRUST = 0.25
  if (G10.keys['ArrowUp']    || G10.keys['w'] || G10.keys['W']) G10.vy -= THRUST
  if (G10.keys['ArrowDown']  || G10.keys['s'] || G10.keys['S']) G10.vy += THRUST
  if (G10.keys['ArrowLeft']  || G10.keys['a'] || G10.keys['A']) G10.vx -= THRUST
  if (G10.keys['ArrowRight'] || G10.keys['d'] || G10.keys['D']) G10.vx += THRUST

  // Move wells smoothly, bounce off walls
  for (const well of G10.wells) {
    well.x += well.vx
    well.y += well.vy
    if (well.x < well.r + 5) { well.vx = Math.abs(well.vx); well.x = well.r + 5 }
    if (well.x > w - well.r - 5) { well.vx = -Math.abs(well.vx); well.x = w - well.r - 5 }
    if (well.y < well.r + 5) { well.vy = Math.abs(well.vy); well.y = well.r + 5 }
    if (well.y > h - well.r - 5) { well.vy = -Math.abs(well.vy); well.y = h - well.r - 5 }
  }

  // Apply gravity from wells to player
  for (const well of G10.wells) {
    const dx = well.x - G10.playerX
    const dy = well.y - G10.playerY
    const dist2 = dx*dx + dy*dy
    const dist = Math.sqrt(dist2) || 1
    G10.vx += (dx / dist) * (well.mass / dist2)
    G10.vy += (dy / dist) * (well.mass / dist2)
  }

  // Damping + speed cap
  G10.vx *= 0.97; G10.vy *= 0.97
  const speed = Math.hypot(G10.vx, G10.vy)
  if (speed > 8) { G10.vx = G10.vx / speed * 8; G10.vy = G10.vy / speed * 8 }

  G10.playerX += G10.vx
  G10.playerY += G10.vy

  // Wall bounce
  if (G10.playerX < 10) { G10.playerX = 10; G10.vx *= -0.5 }
  if (G10.playerX > w - 10) { G10.playerX = w - 10; G10.vx *= -0.5 }
  if (G10.playerY < 10) { G10.playerY = 10; G10.vy *= -0.5 }
  if (G10.playerY > h - 10) { G10.playerY = h - 10; G10.vy *= -0.5 }

  ctx.clearRect(0, 0, w, h)

  // Draw gravity wells
  const pulse = Math.sin(now / 300) * 0.3 + 0.7
  for (const well of G10.wells) {
    ctx.beginPath()
    ctx.arc(well.x, well.y, well.r + 20 * pulse, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(239,68,68,0.2)'
    ctx.lineWidth = 2
    ctx.stroke()

    const grd = ctx.createRadialGradient(well.x, well.y, 0, well.x, well.y, well.r)
    grd.addColorStop(0, '#000')
    grd.addColorStop(1, '#ef4444')
    ctx.beginPath()
    ctx.arc(well.x, well.y, well.r, 0, Math.PI * 2)
    ctx.fillStyle = grd
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur = 12
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // Draw orbs
  for (const orb of G10.orbs) {
    ctx.beginPath()
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2)
    ctx.fillStyle = `hsl(${orb.hue},90%,65%)`
    ctx.shadowColor = `hsl(${orb.hue},90%,65%)`
    ctx.shadowBlur = 10
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // Player
  ctx.beginPath()
  ctx.arc(G10.playerX, G10.playerY, 10, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(124,58,237,0.9)'
  ctx.shadowColor = '#a78bfa'
  ctx.shadowBlur = 16
  ctx.fill()
  ctx.strokeStyle = '#c4b5fd'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.shadowBlur = 0

  // Velocity indicator
  if (speed > 0.5) {
    ctx.beginPath()
    ctx.moveTo(G10.playerX, G10.playerY)
    ctx.lineTo(G10.playerX + G10.vx * 3, G10.playerY + G10.vy * 3)
    ctx.strokeStyle = 'rgba(167,139,250,0.5)'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // Orb collection
  for (let i = G10.orbs.length - 1; i >= 0; i--) {
    if (Math.hypot(G10.playerX - G10.orbs[i].x, G10.playerY - G10.orbs[i].y) < 14) {
      G10.orbScore++
      G10.orbs.splice(i, 1)
      spawnG10Orb()
    }
  }

  // Well collision = game over
  for (const well of G10.wells) {
    if (Math.hypot(G10.playerX - well.x, G10.playerY - well.y) < well.r + 4) {
      endGame10()
      return
    }
  }

  G10.animFrame = requestAnimationFrame(g10Loop)
}

function endGame10() {
  stopGame10()
  const survived = parseFloat(G10.elapsed.toFixed(1))
  window._g10Score = Math.round(survived * 10)

  document.getElementById('g10-final-score').textContent = survived.toFixed(1) + 's'
  document.getElementById('g10-over-stats').textContent =
    `${survived.toFixed(1)}s survived · ${G10.orbScore} orbs · ${G10.wells.length} wells active`
  renderMedalDisplay('g10-medal-display', 'gravity', Math.round(survived * 10))
  document.getElementById('g10-over').classList.add('show')
}
