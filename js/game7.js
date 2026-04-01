// ═══════════════════════════════════════════════════════
//  GAME 7 — CURSOR BETRAYAL
//  Your phantom cursor moves opposite to your real mouse.
//  Targets spawn at quantum positions. Click them using the
//  phantom cursor. 30 seconds. Score = targets hit.
// ═══════════════════════════════════════════════════════
const G7 = {
  active: false,
  score: 0,
  timeLeft: 30,
  timerInterval: null,
  spawnTimeout: null,
  targets: [],
  phantomX: 0,
  phantomY: 0,
  mouseX: 0,
  mouseY: 0,
}

function stopGame7() {
  clearInterval(G7.timerInterval)
  clearTimeout(G7.spawnTimeout)
  G7.timerInterval = null
  G7.spawnTimeout = null
  G7.active = false
  document.getElementById('g7-arena').removeEventListener('mousemove', g7MouseMove)
  document.getElementById('g7-arena').removeEventListener('click', g7Click)
  document.getElementById('g7-phantom').style.display = 'none'
}
window.stopGame7 = stopGame7

async function initGame7() {
  stopGame7()
  G7.active = false; G7.score = 0; G7.timeLeft = 30; G7.targets = []
  document.getElementById('g7-over').classList.remove('show')
  document.getElementById('g7-score').textContent = '0'
  document.getElementById('g7-overlay').style.display = 'flex'
  document.getElementById('g7-phantom').style.display = 'none'
  document.getElementById('g7-timer-display').textContent = ''
  document.querySelectorAll('.g7-target').forEach(e => e.remove())
  await initCurby()
}

window.startCursor = function() {
  document.getElementById('g7-overlay').style.display = 'none'
  document.getElementById('g7-phantom').style.display = 'block'
  G7.active = true
  G7.score = 0
  G7.timeLeft = 30
  G7.targets = []

  const arena = document.getElementById('g7-arena')
  arena.addEventListener('mousemove', g7MouseMove)
  arena.addEventListener('click', g7Click)

  G7.timerInterval = setInterval(() => {
    if (!G7.active) return
    G7.timeLeft--
    document.getElementById('g7-timer-display').textContent = G7.timeLeft + 's'
    if (G7.timeLeft <= 0) endGame7()
  }, 1000)

  spawnG7Target()
}

function g7MouseMove(e) {
  if (!G7.active) return
  const arena = document.getElementById('g7-arena')
  const rect = arena.getBoundingClientRect()
  G7.mouseX = e.clientX - rect.left
  G7.mouseY = e.clientY - rect.top
  // Phantom is mirrored horizontally
  G7.phantomX = rect.width - G7.mouseX
  G7.phantomY = G7.mouseY
  const ph = document.getElementById('g7-phantom')
  ph.style.left = G7.phantomX + 'px'
  ph.style.top  = G7.phantomY + 'px'
}

function g7Click(e) {
  if (!G7.active) return
  // Hit test phantom position against targets
  for (let i = G7.targets.length - 1; i >= 0; i--) {
    const t = G7.targets[i]
    const dx = G7.phantomX - t.x
    const dy = G7.phantomY - t.y
    if (Math.sqrt(dx*dx + dy*dy) < t.r) {
      // Hit!
      G7.score++
      document.getElementById('g7-score').textContent = G7.score
      t.el.remove()
      clearTimeout(t.timeout)
      G7.targets.splice(i, 1)
      showG7Feedback(t.x, t.y, true)
      break
    }
  }
}

function spawnG7Target() {
  if (!G7.active) return
  const arena = document.getElementById('g7-arena')
  const rect = arena.getBoundingClientRect()
  const r = 20 + qRandInt(15)
  const margin = r + 5
  const x = margin + qRandInt(Math.max(1, rect.width - margin * 2))
  const y = margin + qRandInt(Math.max(1, rect.height - margin * 2))
  const hue = qRandInt(360)
  const lifetime = 2000 + qRandInt(1500)

  const el = document.createElement('div')
  el.className = 'g7-target'
  el.style.cssText = `
    position:absolute;
    left:${x}px; top:${y}px;
    width:${r*2}px; height:${r*2}px;
    border-radius:50%;
    transform:translate(-50%,-50%);
    background: radial-gradient(circle at 35% 35%, hsl(${hue},90%,70%), hsl(${hue+40},80%,40%));
    box-shadow: 0 0 ${r*.8}px hsl(${hue},90%,55%);
    pointer-events:none;
    z-index:4;
    animation: targetPop .15s ease-out;
  `
  arena.appendChild(el)

  const timeout = setTimeout(() => {
    if (el.isConnected) {
      el.style.transition = 'transform .2s, opacity .2s'
      el.style.transform = 'translate(-50%,-50%) scale(0)'
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 200)
    }
    G7.targets = G7.targets.filter(t => t.el !== el)
  }, lifetime)

  G7.targets.push({ el, x, y, r, timeout })

  // Schedule next spawn: 500-1200ms
  G7.spawnTimeout = setTimeout(spawnG7Target, 500 + qRandInt(700))
}

function showG7Feedback(x, y, hit) {
  const arena = document.getElementById('g7-arena')
  const fb = document.createElement('div')
  fb.style.cssText = `
    position:absolute; left:${x}px; top:${y - 20}px;
    font-weight:900; font-size:1.2rem;
    color:${hit ? 'var(--success)' : 'var(--danger)'};
    pointer-events:none; z-index:20;
    animation: floatUp .6s ease-out forwards;
  `
  fb.textContent = hit ? '+1' : '✗'
  arena.appendChild(fb)
  setTimeout(() => fb.remove(), 700)
}

function endGame7() {
  stopGame7()
  window._g7Score = G7.score
  document.getElementById('g7-final-score').textContent = G7.score
  document.getElementById('g7-over-stats').textContent = `${G7.score} targets hit in 30 seconds`
  document.querySelectorAll('.g7-target').forEach(e => e.remove())
  renderMedalDisplay('g7-medal-display', 'cursor', G7.score)
  document.getElementById('g7-over').classList.add('show')
}
