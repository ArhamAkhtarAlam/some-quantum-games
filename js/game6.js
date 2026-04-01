// ═══════════════════════════════════════════════════════
//  GAME 6 — DELTA E / JND
// ═══════════════════════════════════════════════════════
const G6 = {
  round: 0, totalRounds: 40,
  score: 0,
  splitPct: 0,
  state: 'idle',
  feedbackTimeout: null,
  currentColors: null,
}

function stopDeltaE() {
  clearTimeout(G6.feedbackTimeout)
  G6.state = 'idle'
}
window.stopDeltaE = stopDeltaE

function g6Colors(round) {
  const t = (round - 1) / 39
  const delta = 12 * Math.pow(0.08 / 12, t)
  const hue  = qRandInt(360)
  const sat  = 65 + qRandInt(15)
  const lig  = 44 + qRandInt(12)
  const hue2 = (hue + delta + 360) % 360
  return {
    left:  `hsl(${hue},${sat}%,${lig}%)`,
    right: `hsl(${hue2.toFixed(3)},${sat}%,${lig}%)`,
    delta: delta.toFixed(2),
  }
}

async function initGame6() {
  stopDeltaE()
  G6.round = 0; G6.score = 0; G6.state = 'idle'
  document.getElementById('g6-over').classList.remove('show')
  document.getElementById('g6-score').textContent = '0'
  document.getElementById('g6-start-overlay').style.display = 'flex'
  document.getElementById('g6-round-info').style.display = 'none'
  document.getElementById('g6-progress').style.display = 'none'
  document.getElementById('g6-color-strip').style.display = 'none'
  document.getElementById('g6-info').style.display = 'none'
  document.getElementById('g6-feedback').style.display = 'none'
  await initCurby()
}

window.startDeltaE = function() {
  document.getElementById('g6-start-overlay').style.display = 'none'
  document.getElementById('g6-round-info').style.display = 'block'
  document.getElementById('g6-progress').style.display = 'flex'
  document.getElementById('g6-color-strip').style.display = 'block'
  document.getElementById('g6-info').style.display = 'block'
  document.getElementById('g6-feedback').style.display = 'block'
  const prog = document.getElementById('g6-progress')
  prog.innerHTML = Array.from({ length: G6.totalRounds }, (_, i) =>
    `<div class="g6-pip" id="g6-pip-${i}"></div>`).join('')
  nextRoundG6()
}

function nextRoundG6() {
  G6.round++
  if (G6.round > G6.totalRounds) { endGame6(); return }

  const pip = document.getElementById(`g6-pip-${G6.round - 1}`)
  if (pip) pip.classList.add('active')

  G6.splitPct = 15 + qRandInt(71)
  const colors = g6Colors(G6.round)
  G6.currentColors = colors

  const left  = document.getElementById('g6-left-half')
  const right = document.getElementById('g6-right-half')
  const marker = document.getElementById('g6-marker')
  const answerLine = document.getElementById('g6-answer-line')

  left.style.left  = '0'
  left.style.width = G6.splitPct + '%'
  left.style.background = colors.left

  right.style.left  = G6.splitPct + '%'
  right.style.width = (100 - G6.splitPct) + '%'
  right.style.background = colors.right

  marker.style.display = 'none'
  answerLine.style.display = 'none'

  const difficulty = G6.round <= 5 ? 'Easy' : G6.round <= 12 ? 'Medium' : G6.round <= 22 ? 'Hard' : G6.round <= 32 ? 'Brutal' : '💀 Impossible'
  document.getElementById('g6-round-info').textContent =
    `Round ${G6.round} of ${G6.totalRounds} · ΔHue ${colors.delta}° · ${difficulty}`
  document.getElementById('g6-feedback').textContent = ''
  document.getElementById('g6-feedback').style.color = 'var(--muted)'
  document.getElementById('g6-info').textContent = 'Click where the colour changes ↓'
  document.getElementById('g6-color-strip').style.cursor = 'crosshair'
  G6.state = 'waiting'
}

window.deltaEClick = function(e) {
  if (G6.state !== 'waiting') return
  G6.state = 'result'

  const strip = document.getElementById('g6-color-strip')
  const rect = strip.getBoundingClientRect()
  const clickPct = ((e.clientX - rect.left) / rect.width) * 100
  const errorPct = Math.abs(clickPct - G6.splitPct)

  const t = (G6.round - 1) / 39
  const multiplier = 4 + t * 4
  const pts = Math.max(0, Math.round(100 - errorPct * multiplier))
  G6.score += pts
  document.getElementById('g6-score').textContent = G6.score

  const marker = document.getElementById('g6-marker')
  const answerLine = document.getElementById('g6-answer-line')
  marker.style.left = clickPct + '%'
  marker.style.display = 'block'
  answerLine.style.left = G6.splitPct + '%'
  answerLine.style.display = 'block'
  strip.style.cursor = 'default'

  const pip = document.getElementById(`g6-pip-${G6.round - 1}`)
  const fbEl = document.getElementById('g6-feedback')

  if (errorPct < 2) {
    fbEl.textContent = `🎯 Perfect! +${pts} pts`
    fbEl.style.color = 'var(--success)'
    if (pip) { pip.classList.remove('active'); pip.classList.add('hit') }
  } else if (pts > 0) {
    fbEl.textContent = `+${pts} pts · ${errorPct.toFixed(1)}% off`
    fbEl.style.color = '#f59e0b'
    if (pip) { pip.classList.remove('active'); pip.classList.add('hit') }
  } else {
    fbEl.textContent = `Miss · ${errorPct.toFixed(1)}% off`
    fbEl.style.color = 'var(--danger)'
    if (pip) { pip.classList.remove('active'); pip.classList.add('miss') }
  }
  document.getElementById('g6-info').textContent = `True boundary: ${G6.splitPct.toFixed(0)}% · You clicked: ${clickPct.toFixed(0)}%`

  const pause = Math.max(900, 1800 - G6.round * 20)
  G6.feedbackTimeout = setTimeout(() => nextRoundG6(), pause)
}

function endGame6() {
  stopDeltaE()
  window._g6Score = G6.score
  document.getElementById('g6-final-score').textContent = G6.score + ' pts'
  document.getElementById('g6-over-stats').textContent =
    `${G6.score} points across ${G6.totalRounds} rounds`
  renderMedalDisplay('g6-medal-display', 'deltae', G6.score)
  document.getElementById('g6-over').classList.add('show')
}
