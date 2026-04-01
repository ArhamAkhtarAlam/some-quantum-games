// ═══════════════════════════════════════════════════════
//  GAME 1 — EQUATION BUILDER
// ═══════════════════════════════════════════════════════
const G1 = {
  score: 0, round: 0, lives: 3,
  target: 0, zone: [],
  timerSec: 30, timerInterval: null,
  timeLeft: 30, active: false,
}
const OPS = ['+', '−', '×', '÷']
const OP_MAP = { '+': '+', '−': '-', '×': '*', '÷': '/' }

async function initGame1() {
  G1.score = 0; G1.round = 0; G1.lives = 3; G1.active = true
  document.getElementById('g1-over').classList.remove('show')
  document.getElementById('g1-loading').style.display = 'flex'
  document.getElementById('g1-check-btn').disabled = true
  setEntropyLive(false)
  await initCurby()
  document.getElementById('g1-loading').style.display = 'none'
  updateG1UI()
  nextRoundG1()
}

function nextRoundG1() {
  if (!G1.active) return
  G1.round++
  clearZone()
  const maxTarget = Math.min(20 + G1.round * 5, 100)
  G1.target = qRandInt(maxTarget - 2) + 2
  G1.timerSec = Math.max(15, 30 - G1.round * 2)
  G1.timeLeft = G1.timerSec
  buildPalette()
  updateG1UI()
  startG1Timer()
}

function buildPalette() {
  const palette = document.getElementById('g1-palette')
  palette.innerHTML = ''
  const numCount = Math.min(4 + G1.round, 8)
  const nums = []
  for (let i = 0; i < numCount; i++) {
    let n
    if (i < 3) {
      n = qRandInt(G1.target) + 1
    } else {
      n = qRandInt(9) + 1
    }
    nums.push(n)
  }
  const shuffled = latestRandomness
    ? latestRandomness.shuffled(nums)
    : nums.sort(() => Math.random() - .5)
  for (const n of shuffled) {
    palette.appendChild(makeTile(String(n), 'num-tile', false))
  }
  for (const op of OPS) {
    palette.appendChild(makeTile(op, 'op-tile', false))
  }
}

function makeTile(val, cls, inZone) {
  const el = document.createElement('div')
  el.className = `tile ${cls}${inZone ? ' in-zone' : ''}`
  el.draggable = true
  el.dataset.val = val
  el.dataset.cls = cls
  el.textContent = val
  if (inZone) {
    const rb = document.createElement('span')
    rb.className = 'remove-btn'
    rb.textContent = '×'
    rb.onclick = (e) => { e.stopPropagation(); removeTileFromZone(el) }
    el.appendChild(rb)
  }
  el.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ val, cls, fromZone: inZone }))
    if (inZone) el.dataset.removing = '1'
  })
  el.addEventListener('dragend', () => { delete el.dataset.removing })
  el.addEventListener('click', () => {
    if (!inZone) addTileToZone(val, cls)
  })
  return el
}

window.dzDragOver = function(e) {
  e.preventDefault()
  document.getElementById('g1-drop-zone').classList.add('drag-over')
}
window.dzDragLeave = function() {
  document.getElementById('g1-drop-zone').classList.remove('drag-over')
}
window.dzDrop = function(e) {
  e.preventDefault()
  document.getElementById('g1-drop-zone').classList.remove('drag-over')
  try {
    const data = JSON.parse(e.dataTransfer.getData('text/plain'))
    addTileToZone(data.val, data.cls)
  } catch {}
}

function addTileToZone(val, cls) {
  G1.zone.push({ val, cls })
  renderZone()
  validateG1()
}

function removeTileFromZone(el) {
  const idx = Array.from(document.getElementById('g1-drop-zone').children)
    .filter(c => c.classList.contains('tile'))
    .indexOf(el)
  if (idx >= 0) G1.zone.splice(idx, 1)
  renderZone()
  validateG1()
}

function clearZone() {
  G1.zone = []
  renderZone()
  document.getElementById('g1-result').textContent = ''
  document.getElementById('g1-result').className = 'eq-result'
  document.getElementById('g1-check-btn').disabled = true
}
window.clearZone = clearZone

function renderZone() {
  const dz = document.getElementById('g1-drop-zone')
  dz.innerHTML = ''
  if (G1.zone.length === 0) {
    const span = document.createElement('span')
    span.className = 'placeholder-text'
    span.id = 'g1-zone-placeholder'
    span.textContent = 'Drop tiles here to build your equation'
    dz.appendChild(span)
    return
  }
  for (const item of G1.zone) {
    dz.appendChild(makeTile(item.val, item.cls, true))
  }
}

function validateG1() {
  const hasNum = G1.zone.some(t => t.cls === 'num-tile')
  document.getElementById('g1-check-btn').disabled = !hasNum
}

window.checkEquation = function() {
  if (!G1.active) return
  const expr = G1.zone.map(t => {
    if (t.cls === 'op-tile') return OP_MAP[t.val] || t.val
    return t.val
  }).join(' ')
  let result
  try {
    if (!/^[\d\s\+\-\*\/\.]+$/.test(expr)) throw new Error('invalid')
    result = Function('"use strict"; return (' + expr + ')')()
  } catch {
    showG1Result('Invalid expression', 'wrong')
    return
  }
  if (Math.abs(result - G1.target) < 0.0001) {
    const complexity = G1.zone.filter(t => t.cls === 'op-tile').length
    const timeBonus = Math.floor(G1.timeLeft * 2)
    const pts = 10 + complexity * 5 + timeBonus
    G1.score += pts
    showG1Result(`✓ Correct! +${pts} points`, 'correct')
    stopG1Timer()
    setTimeout(nextRoundG1, 1200)
  } else {
    showG1Result(`✗ Got ${+result.toFixed(4)}, need ${G1.target}`, 'wrong')
    G1.lives--
    updateG1UI()
    if (G1.lives <= 0) endGame1()
  }
}

function showG1Result(msg, cls) {
  const el = document.getElementById('g1-result')
  el.textContent = msg
  el.className = 'eq-result ' + cls
}

function startG1Timer() {
  stopG1Timer()
  const bar = document.getElementById('g1-timer-bar')
  G1.timerInterval = setInterval(() => {
    G1.timeLeft -= .1
    const pct = Math.max(0, (G1.timeLeft / G1.timerSec) * 100)
    bar.style.width = pct + '%'
    if (pct < 30) bar.style.background = 'linear-gradient(90deg, var(--danger), #f97316)'
    else bar.style.background = 'linear-gradient(90deg, var(--accent), var(--accent2))'
    if (G1.timeLeft <= 0) {
      stopG1Timer()
      showG1Result("⏱ Time's up!", 'wrong')
      G1.lives--
      updateG1UI()
      if (G1.lives <= 0) endGame1()
      else setTimeout(nextRoundG1, 1000)
    }
  }, 100)
}

function stopG1Timer() {
  clearInterval(G1.timerInterval)
}
window.stopG1Timer = stopG1Timer

function updateG1UI() {
  document.getElementById('g1-score').textContent = G1.score
  document.getElementById('g1-round').textContent = `Round ${G1.round}`
  const livesEl = document.getElementById('g1-lives')
  livesEl.innerHTML = Array.from({ length: 3 }, (_, i) =>
    `<span class="heart">${i < G1.lives ? '❤️' : '🖤'}</span>`
  ).join('')
  document.getElementById('g1-target').textContent = G1.target || '?'
}

function endGame1() {
  G1.active = false
  stopG1Timer()
  document.getElementById('g1-final-score').textContent = G1.score
  renderMedalDisplay('g1-medal-display', 'equation', G1.score)
  document.getElementById('g1-over').classList.add('show')
}
