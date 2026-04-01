// ═══════════════════════════════════════════════════════
//  GAME 2 — AIM TRAINER
// ═══════════════════════════════════════════════════════
const G2 = {
  score: 0, level: 1, combo: 0,
  misses: 0, maxMisses: 3,
  totalClicks: 0, totalHits: 0,
  active: false, started: false,
  targets: [],
  spawnInterval: null,
  entropyBuffer: [],
}

function g2Config() {
  const l = G2.level
  return {
    targetSize: Math.max(28, 70 - l * 4),
    lifetime: Math.max(1200, 5000 - l * 300),
    spawnRate: Math.max(400, 1800 - l * 120),
    maxTargets: Math.min(2 + Math.floor(l / 3), 6),
  }
}

async function initGame2() {
  G2.score = 0; G2.level = 1; G2.combo = 0; G2.misses = 0
  G2.totalClicks = 0; G2.totalHits = 0
  G2.active = false; G2.started = false
  G2.targets = []; G2.entropyBuffer = []
  document.getElementById('g2-over').classList.remove('show')
  document.getElementById('g2-start-msg').style.display = 'flex'
  document.getElementById('g2-start-btn').style.display = 'inline-flex'
  document.querySelectorAll('.target-circle').forEach(e => e.remove())
  updateG2UI()
}

window.startAimGame = async function(e) {
  e.stopPropagation()
  const btn = document.getElementById('g2-start-btn')
  const loading = document.getElementById('g2-loading')
  btn.style.display = 'none'
  loading.style.display = 'flex'
  await initCurby()
  await prefillEntropyBuffer()
  loading.style.display = 'none'
  document.getElementById('g2-start-msg').style.display = 'none'
  G2.active = true; G2.started = true
  scheduleSpawn()
}

async function prefillEntropyBuffer() {
  G2.entropyBuffer = []
  if (latestRandomness) {
    const xs = latestRandomness.shuffled(Array.from({ length: 200 }, (_, i) => i))
    const ys = latestRandomness.shuffled(Array.from({ length: 200 }, (_, i) => i))
    for (let i = 0; i < 200; i++) {
      G2.entropyBuffer.push({ xFrac: xs[i] / 199, yFrac: ys[i] / 199 })
    }
  }
}

function getQuantumPos() {
  if (G2.entropyBuffer.length > 0) {
    return G2.entropyBuffer.splice(qRandInt(G2.entropyBuffer.length), 1)[0]
  }
  return { xFrac: Math.random(), yFrac: Math.random() }
}

function scheduleSpawn() {
  if (!G2.active) return
  stopSpawn()
  const cfg = g2Config()
  G2.spawnInterval = setInterval(() => {
    if (!G2.active) return
    const activeTargets = document.querySelectorAll('.target-circle').length
    if (activeTargets < cfg.maxTargets) spawnTarget()
  }, cfg.spawnRate)
  spawnTarget()
}

function spawnTarget() {
  if (!G2.active) return
  const arena = document.getElementById('g2-arena')
  const rect = arena.getBoundingClientRect()
  const cfg = g2Config()
  const size = cfg.targetSize
  const pos = getQuantumPos()
  const margin = size / 2 + 10
  const x = margin + pos.xFrac * (rect.width - margin * 2)
  const y = margin + pos.yFrac * (rect.height - margin * 2)
  const hue = qRandInt(360)

  const el = document.createElement('div')
  el.className = 'target-circle'
  el.style.cssText = `
    left:${x}px; top:${y}px;
    width:${size}px; height:${size}px;
    background: radial-gradient(circle at 35% 35%,
      hsl(${hue},90%,70%), hsl(${hue + 40},80%,40%));
    box-shadow: 0 0 ${size * .6}px hsl(${hue},90%,50%);
  `
  const ring = document.createElement('div')
  ring.className = 'target-ring'
  el.appendChild(ring)

  const timerRing = document.createElement('canvas')
  timerRing.width = size; timerRing.height = size
  timerRing.style.cssText = 'position:absolute;inset:0;border-radius:50%;'
  el.appendChild(timerRing)

  arena.appendChild(el)

  const spawnTime = Date.now()
  let animFrame

  function drawTimer() {
    if (!el.isConnected) return
    const elapsed = Date.now() - spawnTime
    const pct = Math.max(0, 1 - elapsed / cfg.lifetime)
    const c = timerRing.getContext('2d')
    c.clearRect(0, 0, size, size)
    c.beginPath()
    c.arc(size / 2, size / 2, size / 2 - 3, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2)
    c.strokeStyle = `hsla(${hue},90%,70%,0.6)`
    c.lineWidth = 3
    c.stroke()
    animFrame = requestAnimationFrame(drawTimer)
  }
  drawTimer()

  el.addEventListener('click', (e) => {
    e.stopPropagation()
    cancelAnimationFrame(animFrame)
    clearTimeout(timeoutId)
    hitTarget(el, x, y, hue)
  })

  const timeoutId = setTimeout(() => {
    cancelAnimationFrame(animFrame)
    missTarget(el)
  }, cfg.lifetime)

  G2.targets.push({ el, timeoutId, animFrame })
}

function hitTarget(el, x, y, hue) {
  el.remove()
  G2.totalHits++; G2.combo++
  const pts = Math.floor(10 * (1 + (G2.combo - 1) * .5) * G2.level)
  G2.score += pts

  const arena = document.getElementById('g2-arena')
  const popup = document.createElement('div')
  popup.className = 'combo-popup'
  popup.style.cssText = `left:${x}px;top:${y - 20}px;`
  popup.textContent = G2.combo > 1 ? `×${G2.combo} +${pts}` : `+${pts}`
  arena.appendChild(popup)
  setTimeout(() => popup.remove(), 900)

  if (G2.totalHits % 10 === 0) {
    G2.level++
    scheduleSpawn()
    if (G2.entropyBuffer.length < 50) prefillEntropyBuffer()
  }
  updateG2UI()
}

function missTarget(el) {
  if (!el.isConnected) return
  el.style.transition = 'transform .3s, opacity .3s'
  el.style.transform = 'translate(-50%,-50%) scale(0)'
  el.style.opacity = '0'
  setTimeout(() => el.remove(), 300)
  G2.combo = 0; G2.misses++
  updateG2UI()
  if (G2.misses >= G2.maxMisses) endGame2()
}

window.arenaMissClick = function(e) {
  if (!G2.active || !G2.started) return
  if (e.target.id === 'g2-arena') {
    G2.totalClicks++
    const arena = document.getElementById('g2-arena')
    const rect = arena.getBoundingClientRect()
    const rip = document.createElement('div')
    rip.className = 'ripple'
    rip.style.left = (e.clientX - rect.left) + 'px'
    rip.style.top = (e.clientY - rect.top) + 'px'
    arena.appendChild(rip)
    setTimeout(() => rip.remove(), 500)
  }
}

function stopSpawn() {
  clearInterval(G2.spawnInterval)
}
window.stopSpawn = stopSpawn

function updateG2UI() {
  document.getElementById('g2-score').textContent = G2.score
  document.getElementById('g2-level').textContent = G2.level
  document.getElementById('g2-combo').textContent = `×${G2.combo || 1}`
  const totalShots = G2.totalHits + G2.totalClicks
  document.getElementById('g2-acc').textContent =
    totalShots > 0 ? Math.round(G2.totalHits / totalShots * 100) + '%' : '—'
  const dots = document.getElementById('g2-miss-dots')
  dots.innerHTML = Array.from({ length: G2.maxMisses }, (_, i) =>
    `<div class="miss-dot${i < G2.misses ? ' filled' : ''}"></div>`
  ).join('')
}

function endGame2() {
  G2.active = false
  stopSpawn()
  document.querySelectorAll('.target-circle').forEach(e => e.remove())
  document.getElementById('g2-final-score').textContent = G2.score
  document.getElementById('g2-over-stats').textContent =
    `Level ${G2.level} · ${G2.totalHits} hits · ${G2.totalClicks} total clicks`
  renderMedalDisplay('g2-medal-display', 'aim', G2.score)
  document.getElementById('g2-over').classList.add('show')
}
