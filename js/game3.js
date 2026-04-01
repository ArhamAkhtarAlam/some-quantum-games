// ═══════════════════════════════════════════════════════
//  GAME 3 — QUANTUM REACTION TEST
// ═══════════════════════════════════════════════════════
const G3 = {
  round: 0, totalRounds: 5,
  state: 'idle',
  results: [],
  flashTime: null,
  waitTimeout: null,
}

function stopReact() {
  clearTimeout(G3.waitTimeout)
  G3.waitTimeout = null
}
window.stopReact = stopReact

async function initGame3() {
  stopReact()
  G3.round = 0; G3.results = []; G3.state = 'idle'
  document.getElementById('g3-over').classList.remove('show')
  const arena = document.getElementById('g3-arena')
  arena.className = 'arena state-wait'
  document.getElementById('g3-msg').textContent = 'Click to Start'
  document.getElementById('g3-sub').textContent = `5 rounds · quantum-random delay each time`
  document.getElementById('g3-sub').style.display = ''
  document.getElementById('g3-time').style.display = 'none'
  renderReactRounds()
  await initCurby()
}

function renderReactRounds() {
  const el = document.getElementById('g3-rounds')
  el.innerHTML = Array.from({ length: G3.totalRounds }, (_, i) => {
    let cls = 'react-round-dot'
    if (i < G3.results.length) cls += G3.results[i] === null ? ' early' : ' done'
    else if (i === G3.round && G3.state !== 'idle') cls += ' active'
    const label = i < G3.results.length
      ? (G3.results[i] === null ? '✗' : G3.results[i] + 'ms')
      : (i + 1)
    return `<div class="${cls}">${label}</div>`
  }).join('')
}

window.reactClick = function() {
  const arena = document.getElementById('g3-arena')
  if (G3.state === 'idle') {
    G3.round = 0; G3.results = []
    G3.state = 'waiting'
    renderReactRounds()
    scheduleFlash()
    return
  }
  if (G3.state === 'waiting') {
    clearTimeout(G3.waitTimeout)
    arena.className = 'arena state-early'
    document.getElementById('g3-msg').textContent = 'Too early! ✗'
    document.getElementById('g3-sub').textContent = 'Wait for the green flash...'
    document.getElementById('g3-time').style.display = 'none'
    G3.results.push(null)
    G3.round++
    G3.state = 'result'
    renderReactRounds()
    G3.waitTimeout = setTimeout(() => nextReactRound(), 1200)
    return
  }
  if (G3.state === 'flash') {
    const ms = Date.now() - G3.flashTime
    G3.results.push(ms)
    G3.round++
    G3.state = 'result'
    arena.className = 'arena state-result'
    document.getElementById('g3-msg').textContent = ms + ' ms'
    document.getElementById('g3-sub').textContent = ms < 200 ? 'Incredible!' : ms < 280 ? 'Great!' : ms < 350 ? 'Good' : 'Keep practicing'
    document.getElementById('g3-time').style.display = 'none'
    renderReactRounds()
    if (G3.round >= G3.totalRounds) {
      G3.waitTimeout = setTimeout(() => endGame3(), 1200)
    } else {
      G3.waitTimeout = setTimeout(() => nextReactRound(), 1400)
    }
    return
  }
}

function scheduleFlash() {
  const arena = document.getElementById('g3-arena')
  arena.className = 'arena state-ready'
  document.getElementById('g3-msg').textContent = 'Get ready…'
  document.getElementById('g3-sub').textContent = `Round ${G3.round + 1} of ${G3.totalRounds}`
  document.getElementById('g3-time').style.display = 'none'
  G3.state = 'waiting'
  const delay = 1000 + qRandInt(3000)
  G3.waitTimeout = setTimeout(() => {
    arena.className = 'arena state-flash'
    document.getElementById('g3-msg').textContent = 'CLICK NOW!'
    document.getElementById('g3-sub').style.display = 'none'
    G3.flashTime = Date.now()
    G3.state = 'flash'
  }, delay)
}

function nextReactRound() {
  if (G3.round >= G3.totalRounds) { endGame3(); return }
  document.getElementById('g3-sub').style.display = ''
  scheduleFlash()
}

function endGame3() {
  stopReact()
  G3.state = 'done'
  const valid = G3.results.filter(r => r !== null)
  const avg = valid.length > 0 ? Math.round(valid.reduce((a,b) => a+b, 0) / valid.length) : 9999
  const earlyCount = G3.results.filter(r => r === null).length

  document.getElementById('g3-final-score').textContent = avg + ' ms avg'
  document.getElementById('g3-over-stats').textContent =
    `${valid.length}/${G3.totalRounds} valid · ${earlyCount} early clicks · Best: ${valid.length ? Math.min(...valid) : '—'} ms`

  window._g3Score = avg
  renderMedalDisplay('g3-medal-display', 'reaction', avg)
  document.getElementById('g3-over').classList.add('show')
}

document.getElementById('g5-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') submitFlashAnswer()
})
