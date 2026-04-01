// ═══════════════════════════════════════════════════════
//  GAME 5 — FLASH NUMBER
// ═══════════════════════════════════════════════════════
const G5 = {
  round: 0, totalRounds: 10,
  score: 0,
  currentNumber: null,
  state: 'idle',
  flashTimeout: null,
  feedbackTimeout: null,
  results: [],
}

function stopFlash() {
  clearTimeout(G5.flashTimeout)
  clearTimeout(G5.feedbackTimeout)
  G5.state = 'idle'
}
window.stopFlash = stopFlash

async function initGame5() {
  stopFlash()
  G5.round = 0; G5.score = 0; G5.results = []; G5.state = 'idle'
  document.getElementById('g5-over').classList.remove('show')
  document.getElementById('g5-score').textContent = '0'
  document.getElementById('g5-start-overlay').style.display = 'flex'
  document.getElementById('g5-round-info').style.display = 'none'
  document.getElementById('g5-progress').style.display = 'none'
  document.getElementById('g5-flash-number').style.display = 'none'
  document.getElementById('g5-input').style.display = 'none'
  document.getElementById('g5-feedback').style.display = 'none'
  await initCurby()
}

window.startFlash = function() {
  document.getElementById('g5-start-overlay').style.display = 'none'
  document.getElementById('g5-round-info').style.display = 'block'
  document.getElementById('g5-progress').style.display = 'flex'
  document.getElementById('g5-flash-number').style.display = 'block'
  document.getElementById('g5-input').style.display = 'block'
  document.getElementById('g5-feedback').style.display = 'block'
  const prog = document.getElementById('g5-progress')
  prog.innerHTML = Array.from({ length: G5.totalRounds }, (_, i) =>
    `<div class="g5-pip" id="g5-pip-${i}"></div>`).join('')
  nextRoundG5()
}

function nextRoundG5() {
  G5.round++
  if (G5.round > G5.totalRounds) { endGame5(); return }

  const flashMs = Math.max(150, 800 - (G5.round - 1) * 70)
  const maxDigits = Math.min(1 + Math.floor(G5.round / 2), 5)
  const min = Math.pow(10, maxDigits - 1)
  const max = Math.pow(10, maxDigits) - 1
  G5.currentNumber = min + qRandInt(max - min + 1)
  G5.state = 'showing'

  const pip = document.getElementById(`g5-pip-${G5.round - 1}`)
  if (pip) pip.classList.add('active')

  const numEl = document.getElementById('g5-flash-number')
  const inp = document.getElementById('g5-input')
  const fbEl = document.getElementById('g5-feedback')
  const roundEl = document.getElementById('g5-round-info')

  roundEl.textContent = `Round ${G5.round} of ${G5.totalRounds} · ${flashMs}ms flash`
  numEl.textContent = G5.currentNumber
  numEl.style.opacity = '1'
  inp.value = ''
  inp.className = ''
  inp.disabled = true
  fbEl.textContent = '👀 Memorise!'
  fbEl.style.color = '#f59e0b'

  G5.flashTimeout = setTimeout(() => {
    numEl.style.opacity = '0'
    G5.state = 'typing'
    inp.disabled = false
    inp.focus()
    fbEl.textContent = 'Type the number!'
    fbEl.style.color = 'var(--muted)'
  }, flashMs)
}

window.checkFlashInput = function() {
  if (G5.state !== 'typing') return
  const inp = document.getElementById('g5-input')
  const val = parseInt(inp.value, 10)
  if (isNaN(val)) return
  if (inp.value.length >= String(G5.currentNumber).length) {
    submitFlashAnswer()
  }
}

function submitFlashAnswer() {
  if (G5.state !== 'typing') return
  G5.state = 'feedback'
  const inp = document.getElementById('g5-input')
  const fbEl = document.getElementById('g5-feedback')
  const pip = document.getElementById(`g5-pip-${G5.round - 1}`)
  const val = parseInt(inp.value, 10)
  const correct = val === G5.currentNumber

  G5.results.push(correct)
  if (correct) G5.score++
  document.getElementById('g5-score').textContent = G5.score

  if (correct) {
    inp.className = 'correct'
    fbEl.textContent = '✓ Correct!'
    fbEl.style.color = 'var(--success)'
    if (pip) { pip.classList.remove('active'); pip.classList.add('correct') }
  } else {
    inp.className = 'wrong'
    fbEl.textContent = `✗ It was ${G5.currentNumber}`
    fbEl.style.color = 'var(--danger)'
    if (pip) { pip.classList.remove('active'); pip.classList.add('wrong') }
    const numEl = document.getElementById('g5-flash-number')
    numEl.textContent = G5.currentNumber
    numEl.style.opacity = '0.4'
  }

  inp.disabled = true
  G5.feedbackTimeout = setTimeout(() => {
    document.getElementById('g5-flash-number').style.opacity = '0'
    nextRoundG5()
  }, 1200)
}
window.submitFlashAnswer = submitFlashAnswer

function endGame5() {
  stopFlash()
  window._g5Score = G5.score
  document.getElementById('g5-final-score').textContent = G5.score + '/10'
  document.getElementById('g5-over-stats').textContent =
    `${G5.score} correct out of ${G5.totalRounds} rounds`
  renderMedalDisplay('g5-medal-display', 'flash', G5.score)
  document.getElementById('g5-over').classList.add('show')
}
