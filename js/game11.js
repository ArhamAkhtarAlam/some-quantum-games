// ═══════════════════════════════════════════════════════
//  GAME 11 — QUANTUM TYPE
//  A quantum-chosen word appears. Type it as fast as you
//  can. 5 rounds. Score = average WPM across all rounds.
// ═══════════════════════════════════════════════════════
const G11_WORDS = [
  'quantum','photon','entropy','nebula','eclipse','gravity','neutron','plasma',
  'circuit','cascade','syntax','binary','cipher','vector','matrix','kernel',
  'lambda','vertex','signal','prism','fusion','pulsar','vortex','helium',
  'oxygen','carbon','proton','quasar','cosmic','radial','spiral','zenith',
  'fractal','cluster','atomic','charge','tensor','flux','pulse','wave',
  'shift','drift','orbit','phase','decay','field','force','light','power',
  'speed','energy','mass','time','space','dark','void','star','moon','ring',
]

let G11_roomCode = null
let G11_oppWpm   = null
let G11_oppDone  = false

function _g11UpdateOppDisplay() {
  const hud  = document.getElementById('g11-opp-hud')
  const stat = document.getElementById('g11-opp-stat')
  if (!hud || !stat) return
  if (G11_roomCode && G11_oppWpm !== null) {
    hud.style.display = 'flex'
    stat.textContent  = G11_oppWpm + ' WPM'
  }
}

window.g11FindMatch = function() {
  mpFindMatch('typing', {
    statusEl: document.getElementById('g11-queue-status'),
    btnEl:    document.getElementById('g11-queue-btn'),
    onMatched: ({ code }) => {
      G11_roomCode = code
      G11_oppWpm   = 0
      const sock = mpGetSocket()
      sock.off('opponent-score'); sock.off('opponent-done'); sock.off('opponent-left')
      sock.on('opponent-score', score => { G11_oppWpm = score; _g11UpdateOppDisplay() })
      sock.on('opponent-done',  score => { G11_oppWpm = score; G11_oppDone = true; _g11UpdateOppDisplay() })
      sock.on('opponent-left',  ()    => {
        G11_oppWpm = null
        document.getElementById('g11-queue-status').textContent = 'Opponent disconnected.'
      })
      startTyping()
    }
  })
}

const G11 = {
  active: false,
  round: 0,
  totalRounds: 5,
  currentWord: '',
  typed: '',
  roundStart: 0,
  roundTimes: [],
  roundWpms: [],
}

let _g11Input = null
let _g11ListenersAttached = false

function _g11GetInput() {
  if (!_g11Input) _g11Input = document.getElementById('g11-input')
  return _g11Input
}

function _g11BlurHandler() {
  if (G11.active) setTimeout(() => _g11GetInput().focus(), 0)
}
function _g11ArenaMousedown(e) {
  if (G11.active) { e.preventDefault(); _g11GetInput().focus() }
}

function stopGame11() {
  G11.active = false
  const inp = _g11GetInput()
  inp.removeEventListener('keydown', g11KeyDown)
  inp.blur()
}
window.stopGame11 = stopGame11

async function initGame11() {
  stopGame11()
  G11.round = 0; G11.roundTimes = []; G11.roundWpms = []; G11.typed = ''
  G11_roomCode = null
  G11_oppWpm   = null
  G11_oppDone  = false
  document.getElementById('g11-over').classList.remove('show')
  document.getElementById('g11-score').textContent = '—'
  document.getElementById('g11-word-display').textContent = ''
  document.getElementById('g11-typed-display').innerHTML = ''
  document.getElementById('g11-feedback').textContent = ''
  document.getElementById('g11-round-badge').textContent = 'Round 1 / 5'
  const qst = document.getElementById('g11-queue-status')
  if (qst) qst.textContent = ''
  const qbtn = document.getElementById('g11-queue-btn')
  if (qbtn) { qbtn.disabled = false; qbtn.textContent = '⚔️ Find Match' }
  const hud = document.getElementById('g11-opp-hud')
  if (hud) hud.style.display = 'none'
  document.getElementById('g11-overlay-start').style.display = 'flex'
  await initCurby()
}

window.startTyping = function() {
  SFX.resume(); SFX.click()
  document.getElementById('g11-overlay-start').style.display = 'none'
  if (G11_roomCode) {
    const hud = document.getElementById('g11-opp-hud')
    if (hud) hud.style.display = 'flex'
  }
  G11.active = true
  const inp = _g11GetInput()
  inp.value = ''
  inp.addEventListener('keydown', g11KeyDown)
  if (!_g11ListenersAttached) {
    inp.addEventListener('blur', _g11BlurHandler)
    document.getElementById('g11-arena').addEventListener('mousedown', _g11ArenaMousedown)
    _g11ListenersAttached = true
  }
  inp.focus()
  g11NextRound()
}

function g11NextRound() {
  G11.round++
  G11.typed = ''
  G11.currentWord = G11_WORDS[qRandInt(G11_WORDS.length)]
  G11.roundStart = 0

  const inp = _g11GetInput()
  inp.value = ''
  inp.focus()

  document.getElementById('g11-round-badge').textContent = `Round ${G11.round} / ${G11.totalRounds}`
  document.getElementById('g11-word-display').textContent = G11.currentWord
  document.getElementById('g11-feedback').textContent = 'type it!'
  g11Render()
}

function g11KeyDown(e) {
  if (!G11.active) return

  if (e.key === 'Tab') {
    e.preventDefault()
    G11.typed = ''
    G11.roundStart = 0
    G11.currentWord = G11_WORDS[qRandInt(G11_WORDS.length)]
    e.target.value = ''
    document.getElementById('g11-word-display').textContent = G11.currentWord
    document.getElementById('g11-feedback').textContent = 'type it!'
    g11Render()
    return
  }

  if (e.key === 'Enter') { e.preventDefault(); return }

  if (e.key === 'Backspace') {
    e.preventDefault()
    G11.typed = G11.typed.slice(0, -1)
    e.target.value = G11.typed
    g11Render()
    return
  }

  if (e.key.length !== 1) return

  // Start timer on first real keypress
  if (G11.roundStart === 0) G11.roundStart = Date.now()

  SFX.tick()
  G11.typed += e.key
  g11Render()

  // Check completion
  if (G11.typed.length >= G11.currentWord.length) {
    const elapsed = Date.now() - G11.roundStart
    if (G11.typed === G11.currentWord) {
      const chars = G11.currentWord.length
      const wpm = Math.round((chars / 5) / (elapsed / 60000))
      G11.roundTimes.push(elapsed)
      G11.roundWpms.push(wpm)
      document.getElementById('g11-feedback').textContent = `✓ ${wpm} WPM`
      document.getElementById('g11-score').textContent = wpm
      if (G11_roomCode) mpGetSocket().emit('score-update', { code: G11_roomCode, score: wpm })

      if (G11.round >= G11.totalRounds) {
        setTimeout(endGame11, 700)
      } else {
        setTimeout(g11NextRound, 700)
      }
    } else {
      if (G11.typed.length > G11.currentWord.length) {
        G11.typed = G11.typed.slice(0, G11.currentWord.length)
      }
      document.getElementById('g11-feedback').textContent = '✗ keep going…'
      g11Render()
    }
  }
}

function g11Render() {
  const word = G11.currentWord
  const typed = G11.typed
  let html = ''
  for (let i = 0; i < word.length; i++) {
    if (i < typed.length) {
      const cls = typed[i] === word[i] ? 'hit' : 'miss'
      html += `<span class="${cls}">${word[i]}</span>`
    } else {
      if (i === typed.length) html += `<span class="cur-pipe">|</span>`
      html += `<span style="opacity:.35">${word[i]}</span>`
    }
  }
  document.getElementById('g11-typed-display').innerHTML = html
}

function endGame11() {
  SFX.win()
  stopGame11()
  const avgWpm = G11.roundWpms.length
    ? Math.round(G11.roundWpms.reduce((a, b) => a + b, 0) / G11.roundWpms.length)
    : 0
  window._g11Score = avgWpm

  if (G11_roomCode) mpGetSocket().emit('game-over', { code: G11_roomCode, score: avgWpm })

  const best = Math.max(...G11.roundWpms)
  const worst = Math.min(...G11.roundWpms)
  document.getElementById('g11-final-score').textContent = avgWpm + ' WPM'
  document.getElementById('g11-over-stats').textContent =
    `avg ${avgWpm} WPM · best ${best} · worst ${worst} · ${G11.totalRounds} rounds`
  renderMedalDisplay('g11-medal-display', 'typing', avgWpm)

  const mpEl = document.getElementById('g11-mp-result')
  if (mpEl && G11_roomCode && G11_oppWpm !== null) {
    const oppTxt = G11_oppDone ? G11_oppWpm : '…'
    const won    = G11_oppDone && avgWpm > G11_oppWpm
    const lost   = G11_oppDone && avgWpm < G11_oppWpm
    const verdict = G11_oppDone
      ? (won ? '🏆 You win!' : lost ? '😔 They win!' : '🤝 Tie!')
      : ''
    if (G11_oppDone && typeof recordMpResult === 'function') recordMpResult('typing', won)
    mpEl.innerHTML = `Opponent: ${oppTxt} WPM <b>${verdict}</b>`
  } else if (mpEl) {
    mpEl.textContent = ''
  }

  document.getElementById('g11-over').classList.add('show')
}
