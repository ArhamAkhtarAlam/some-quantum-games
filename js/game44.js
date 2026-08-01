// ═══════════════════════════════════════════════════════
//  GAME 44 — SPIDER
//  GD-inspired: tap to snap between floor & ceiling.
//  Challenge-based like Wave Gauntlet. Score = clears.
// ═══════════════════════════════════════════════════════

const SPD_R   = 9    // spider body radius
const SPD_OBW = 26   // obstacle block width

// ── Challenge pool ────────────────────────────────────

const SPD_POOL = {
  easy: [
    {
      name:'FIRST STEPS', diff:'easy', speed:155,
      gen(h) {
        let col = 240, floor = true
        const obs = []
        for (let i = 0; i < 5; i++) {
          obs.push({ col, floor })
          floor = !floor; col += 195 + qRandInt(50)
        }
        return { clearAt: col + 250, obstacles: obs }
      }
    },
    {
      name:'WARM UP', diff:'easy', speed:178,
      gen(h) {
        let col = 220, floor = qRandInt(2) === 0
        const obs = []
        for (let i = 0; i < 8; i++) {
          obs.push({ col, floor })
          floor = !floor; col += 160 + qRandInt(45)
        }
        return { clearAt: col + 220, obstacles: obs }
      }
    },
  ],

  medium: [
    {
      name:'RHYTHM', diff:'medium', speed:248,
      gen(h) {
        // Evenly spaced — find the beat
        let col = 220, floor = qRandInt(2) === 0
        const obs = []
        for (let i = 0; i < 11; i++) {
          obs.push({ col, floor })
          floor = !floor; col += 128
        }
        return { clearAt: col + 220, obstacles: obs }
      }
    },
    {
      name:'SHUFFLE', diff:'medium', speed:265,
      gen(h) {
        // Irregular gaps — disrupts rhythm
        let col = 220, floor = qRandInt(2) === 0
        const obs = []
        const gaps = [100,145,100,160,95,155,95,145,100,140,100,155]
        for (let i = 0; i < 12; i++) {
          obs.push({ col, floor })
          floor = !floor; col += gaps[i] + qRandInt(20)
        }
        return { clearAt: col + 220, obstacles: obs }
      }
    },
    {
      name:'SPRINT', diff:'medium', speed:295,
      gen(h) {
        // Gradually tightening spacing
        let col = 220, floor = qRandInt(2) === 0
        const obs = []
        for (let i = 0; i < 13; i++) {
          obs.push({ col, floor })
          floor = !floor; col += Math.max(95, 148 - i * 4) + qRandInt(18)
        }
        return { clearAt: col + 220, obstacles: obs }
      }
    },
  ],

  hard: [
    {
      name:'BURST', diff:'hard', speed:325,
      gen(h) {
        // 3 bursts of 4 tight blocks — intense then relief
        let col = 230, floor = qRandInt(2) === 0
        const obs = []
        for (let b = 0; b < 3; b++) {
          for (let i = 0; i < 4; i++) {
            obs.push({ col, floor })
            floor = !floor; col += 88
          }
          col += 165
        }
        return { clearAt: col + 220, obstacles: obs }
      }
    },
    {
      name:'RAPID FIRE', diff:'hard', speed:355,
      gen(h) {
        // 16 continuous rapid blocks
        let col = 220, floor = qRandInt(2) === 0
        const obs = []
        for (let i = 0; i < 16; i++) {
          obs.push({ col, floor })
          floor = !floor; col += 82 + qRandInt(14)
        }
        return { clearAt: col + 220, obstacles: obs }
      }
    },
    {
      name:'SURGE', diff:'hard', speed:392,
      gen(h) {
        // 4 waves of 5 — fast, no mercy between waves
        let col = 230, floor = qRandInt(2) === 0
        const obs = []
        for (let b = 0; b < 4; b++) {
          for (let i = 0; i < 5; i++) {
            obs.push({ col, floor })
            floor = !floor; col += 78
          }
          col += 145
        }
        return { clearAt: col + 220, obstacles: obs }
      }
    },
  ],

  extreme: [
    {
      name:'GAUNTLET', diff:'extreme', speed:440,
      gen(h) {
        // 24 blocks, extremely tight
        let col = 220, floor = qRandInt(2) === 0
        const obs = []
        for (let i = 0; i < 24; i++) {
          obs.push({ col, floor })
          floor = !floor; col += 72 + qRandInt(10)
        }
        return { clearAt: col + 220, obstacles: obs }
      }
    },
    {
      name:'NO MERCY', diff:'extreme', speed:460,
      gen(h) {
        // Two waves of 15 at max speed
        let col = 220, floor = qRandInt(2) === 0
        const obs = []
        for (let b = 0; b < 2; b++) {
          for (let i = 0; i < 15; i++) {
            obs.push({ col, floor })
            floor = !floor; col += 70 + qRandInt(8)
          }
          col += 120
        }
        return { clearAt: col + 220, obstacles: obs }
      }
    },
  ],
}

const SPD_DIFF_COL = { easy:'#4ade80', medium:'#fbbf24', hard:'#f87171', extreme:'#c084fc' }

// ── Editor-published levels ───────────────────────────

function _spdCustomAll() {
  return (window.QG_CUSTOM_LEVELS && window.QG_CUSTOM_LEVELS.spider) || []
}

// Names of built-ins that a published edit replaces
function _spdOverridden() {
  return new Set(_spdCustomAll().map(l => l.overrides).filter(Boolean))
}

// Strip built-ins that have been overridden by an edited version
function _spdB(arr) {
  const ov = _spdOverridden()
  return ov.size ? arr.filter(t => !ov.has(t.name)) : arr
}

// Published levels → pool templates (data becomes a gen() fn)
function _spdCustom(diff, score) {
  return _spdCustomAll().filter(l => {
    if (l.diff !== diff || !Array.isArray(l.obstacles)) return false
    if (score == null) return true
    if ((l.minScore ?? 0) > score) return false
    if ((l.maxScore ?? 0) > 0 && score > l.maxScore) return false
    return true
  }).map(l => ({
    name:l.name, diff:l.diff, speed:l.speed, custom:true,
    weight: l.weight ?? 1,
    gen() {
      return { clearAt:l.clearAt, obstacles:l.obstacles.map(o => ({ ...o })), deco:l.deco || [] }
    },
  }))
}

function _spdCustomEligible(score) {
  const out = []
  for (const d of ['easy','medium','hard','extreme']) out.push(..._spdCustom(d, score))
  return out
}

// Weighted random pick — weight 1 is normal, 3 is 3× as likely
function _spdPick(pool) {
  if (!pool.length) return null
  const total = pool.reduce((s, t) => s + (t.weight ?? 1), 0)
  if (total <= 0) return pool[qRandInt(pool.length)]
  let r = (qRandInt(10000) / 10000) * total
  for (const t of pool) {
    r -= (t.weight ?? 1)
    if (r <= 0) return t
  }
  return pool[pool.length - 1]
}

function _spdGetPool(score) {
  const {easy, medium, hard, extreme} = SPD_POOL
  const B = _spdB
  let builtins
  if      (score < 3)  builtins = [...B(easy)]
  else if (score < 6)  builtins = [...B(easy), ...B(medium)]
  else if (score < 11) builtins = [...B(medium), ...B(hard)]
  else if (score < 16) builtins = [...B(hard)]
  else                 builtins = [...B(hard), ...B(extreme)]
  return [...builtins, ..._spdCustomEligible(score)]
}

// ── State ─────────────────────────────────────────────

const _SPD = {
  active:false, phase:'idle',
  onFloor:true,
  scrollX:0, speed:0,
  score:0,
  challenge:null, clearAt:0,
  obstacles:[], deco:[],
  trail:[], threads:[],
  announceT:0, clearedT:0,
  shake:0, hitFlash:0,
  noclip:false, practiceDiff:null, testLevel:null,
  deadT:0, showOver:false,
  raf:null, lastTime:0,
}
window._spdScore = 0

let _spdCvs = null
function _spdC() {
  if (!_spdCvs) _spdCvs = document.getElementById('spd-canvas')
  return _spdCvs
}

async function initSpider() {
  stopSpider(); _spdCvs = null
  document.getElementById('spd-overlay').style.display = 'flex'
  document.getElementById('spd-over').style.display    = 'none'
  await initCurby()
}
window.initSpider = initSpider
window.initGame44 = initSpider
window.stopGame44 = function() { stopSpider() }

function _spdStart(noclip, practiceDiff) {
  SFX.resume(); SFX.click()
  const c = _spdC()
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('spd-overlay').style.display = 'none'
  document.getElementById('spd-over').style.display    = 'none'

  Object.assign(_SPD, {
    active:true, score:0, shake:0, hitFlash:0, deadT:0, showOver:false,
    noclip:!!noclip, practiceDiff:practiceDiff||null,
    testLevel:_SPD.testLevel || null,
  })
  window._spdScore = 0
  document.getElementById('spd-score-hud').textContent = noclip ? '—' : '0'

  _spdLoadChallenge()

  window.addEventListener('keydown', _spdKeyDn)
  c.addEventListener('mousedown',  _spdInput, {passive:false})
  c.addEventListener('touchstart', _spdInput, {passive:false})

  _SPD.lastTime = performance.now()
  _SPD.raf = requestAnimationFrame(_spdLoop)
}
window.startSpider         = function()  { _SPD.testLevel = null; _spdStart(false, null) }
window.startSpiderPractice = function(d) { _SPD.testLevel = null; _spdStart(true,  d)    }

// Editor test play: loop one level in noclip so it can be studied
window.spdTestLevel = function(tmpl) {
  _SPD.testLevel = tmpl
  _spdStart(true, null)
}

window.stopSpider = function() {
  _SPD.active = false
  if (_SPD.raf) { cancelAnimationFrame(_SPD.raf); _SPD.raf = null }
  const c = _spdC()
  if (c) {
    c.removeEventListener('mousedown',  _spdInput)
    c.removeEventListener('touchstart', _spdInput)
  }
  window.removeEventListener('keydown', _spdKeyDn)
}

function _spdLoadChallenge() {
  const c    = _spdC()
  let pool = _SPD.testLevel
    ? [_SPD.testLevel]
    : (_SPD.noclip && _SPD.practiceDiff)
      // Practice ignores score gates so every level in the tier is reachable
      ? [..._spdB(SPD_POOL[_SPD.practiceDiff] || SPD_POOL.easy), ..._spdCustom(_SPD.practiceDiff, null)]
      : _spdGetPool(_SPD.score)
  if (!pool.length) pool = [...SPD_POOL.easy]
  const tmpl = _spdPick(pool)
  const data = tmpl.gen(c.height)
  Object.assign(_SPD, {
    challenge:  { name: tmpl.name, diff: tmpl.diff, speed: tmpl.speed },
    speed:      tmpl.speed,
    clearAt:    data.clearAt,
    obstacles:  data.obstacles,
    deco:       data.deco || [],
    scrollX:    0,
    trail:      [],
    threads:    [],
    onFloor:    true,
    phase:      'announce',
    announceT:  0,
  })
}

function _spdKeyDn(e) {
  if (e.code === 'Space') { e.preventDefault(); _spdDoFlip() }
}
function _spdInput(e) { e.preventDefault(); _spdDoFlip() }

function _spdDoFlip() {
  if (!_SPD.active || _SPD.phase !== 'playing') return
  const h     = _spdC().height
  const fromY = _SPD.onFloor ? h - SPD_R - 4 : SPD_R + 4
  _SPD.onFloor = !_SPD.onFloor
  const toY   = _SPD.onFloor ? h - SPD_R - 4 : SPD_R + 4
  _SPD.threads.push({ worldX: _SPD.scrollX, y1: fromY, y2: toY, age: 0 })
  if (_SPD.threads.length > 10) _SPD.threads.shift()
  SFX.click()
}

// ── Game loop ─────────────────────────────────────────

function _spdLoop(ts) {
  if (!_SPD.active) return
  const dt = Math.min((ts - _SPD.lastTime) / 1000, 0.05)
  _SPD.lastTime = ts
  const c = _spdC(), w = c.width, h = c.height
  const spX = Math.round(w * 0.25)
  const oh  = Math.round(h * 0.44)

  if (_SPD.shake   > 0) _SPD.shake   = Math.max(0, _SPD.shake   - dt * 4)
  if (_SPD.hitFlash > 0) _SPD.hitFlash = Math.max(0, _SPD.hitFlash - dt * 5)

  if (_SPD.phase === 'announce') {
    _SPD.announceT += dt
    if (_SPD.announceT >= 0.9) _SPD.phase = 'playing'

  } else if (_SPD.phase === 'playing') {
    _SPD.scrollX += _SPD.speed * dt
    const spY = _SPD.onFloor ? h - SPD_R - 4 : SPD_R + 4

    _SPD.trail.push({ worldX: _SPD.scrollX, y: spY })
    if (_SPD.trail.length > 40) _SPD.trail.shift()

    for (const t of _SPD.threads) t.age += dt
    _SPD.threads = _SPD.threads.filter(t => t.age < 2)

    for (const obs of _SPD.obstacles) {
      const ox = obs.col - _SPD.scrollX + spX
      if (Math.abs(ox - spX) < SPD_OBW / 2 + SPD_R) {
        const hit = obs.floor ? spY + SPD_R > h - oh : spY - SPD_R < oh
        if (hit) {
          if (_SPD.noclip) {
            if (_SPD.hitFlash <= 0) { _SPD.hitFlash = 0.22; SFX.die() }
          } else {
            _spdDie(); break
          }
        }
      }
    }

    if (_SPD.scrollX >= _SPD.clearAt) {
      _SPD.phase = 'cleared'; _SPD.clearedT = 0
      if (!_SPD.noclip) {
        _SPD.score++
        window._spdScore = _SPD.score
        document.getElementById('spd-score-hud').textContent = _SPD.score
      }
      SFX.win()
    }

  } else if (_SPD.phase === 'cleared') {
    _SPD.clearedT += dt
    if (_SPD.clearedT >= 0.75) _spdLoadChallenge()

  } else if (_SPD.phase === 'dead') {
    _SPD.deadT += dt
    if (_SPD.deadT >= 1.6 && !_SPD.showOver) {
      _SPD.showOver = true
      window._spdScore = _SPD.score
      document.getElementById('spd-final-score').textContent =
        `${_SPD.score} clear${_SPD.score !== 1 ? 's' : ''}`
      document.getElementById('spd-over').style.display = 'flex'
    }
  }

  _spdDraw(c.getContext('2d'), w, h)
  if (_SPD.showOver) { _SPD.active = false; return }
  _SPD.raf = requestAnimationFrame(_spdLoop)
}

function _spdDie() {
  if (_SPD.phase === 'dead') return
  _SPD.phase = 'dead'; _SPD.deadT = 0; _SPD.shake = 1.2
  SFX.die()
  window.removeEventListener('keydown', _spdKeyDn)
}

// ── Draw ─────────────────────────────────────────────────────

function _spdDraw(ctx, w, h) {
  const S  = _SPD
  const ch = S.challenge
  const mainCol = ch ? (SPD_DIFF_COL[ch.diff] || '#a855f7') : '#a855f7'
  const spX = Math.round(w * 0.25)
  const spY = S.onFloor ? h - SPD_R - 4 : SPD_R + 4
  const oh  = Math.round(h * 0.44)

  ctx.save()
  if (S.shake > 0) {
    const s = S.shake * 7
    ctx.translate((Math.random()-0.5)*s, (Math.random()-0.5)*s)
  }

  // Background
  ctx.fillStyle = '#05010a'
  ctx.fillRect(-12, -12, w+24, h+24)

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.018)'
  ctx.lineWidth = 1
  for (let y = 0; y < h; y += 28) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  // Surfaces (color matches current diff)
  const surfH = 6
  ctx.fillStyle = '#150020'
  ctx.fillRect(0, 0, w, surfH)
  ctx.fillRect(0, h - surfH, w, surfH)
  ctx.strokeStyle = mainCol; ctx.lineWidth = 1.5
  ctx.shadowColor = mainCol; ctx.shadowBlur = 8
  ctx.beginPath(); ctx.moveTo(0, surfH);   ctx.lineTo(w, surfH);   ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, h-surfH); ctx.lineTo(w, h-surfH); ctx.stroke()
  ctx.shadowBlur = 0

  // Web threads (scroll left with world)
  ctx.setLineDash([3, 5])
  for (const t of S.threads) {
    const tx = Math.round(t.worldX - S.scrollX + spX)
    if (tx < -30 || tx > w + 30) continue
    const a = Math.max(0, 1 - t.age * 0.65)
    ctx.globalAlpha = a * 0.5
    ctx.strokeStyle = mainCol; ctx.lineWidth = 1
    ctx.shadowColor = mainCol; ctx.shadowBlur = 4
    ctx.beginPath(); ctx.moveTo(tx, t.y1); ctx.lineTo(tx, t.y2); ctx.stroke()
    ctx.shadowBlur = 0
  }
  ctx.setLineDash([])
  ctx.globalAlpha = 1

  // Trail
  for (let i = 1; i < S.trail.length; i++) {
    const tx = Math.round(S.trail[i].worldX - S.scrollX + spX)
    if (tx < -20 || tx > w + 20) continue
    const a = i / S.trail.length
    ctx.globalAlpha = a * a * 0.4
    ctx.fillStyle = mainCol
    ctx.shadowColor = mainCol; ctx.shadowBlur = 3
    ctx.beginPath(); ctx.arc(tx, S.trail[i].y, 2.5, 0, Math.PI*2); ctx.fill()
    ctx.shadowBlur = 0
  }
  ctx.globalAlpha = 1

  // Deco sits behind the obstacles so it can never read as a block
  if (typeof drawDeco === 'function') drawDeco(ctx, S.deco, w, h, S.scrollX, spX)

  // Obstacles
  for (const obs of S.obstacles) {
    const ox   = Math.round(obs.col - S.scrollX + spX)
    if (ox < -SPD_OBW - 10 || ox > w + SPD_OBW) continue
    const half  = SPD_OBW / 2
    const oy    = obs.floor ? h - oh : 0
    const edgeY = obs.floor ? h - oh : oh

    ctx.fillStyle = '#1e0030'
    ctx.fillRect(ox - half, oy, SPD_OBW, oh)
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1
    ctx.strokeRect(ox - half, oy, SPD_OBW, oh)

    ctx.strokeStyle = mainCol; ctx.lineWidth = 2
    ctx.shadowColor = mainCol; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.moveTo(ox - half, edgeY); ctx.lineTo(ox + half, edgeY)
    ctx.stroke(); ctx.shadowBlur = 0
  }

  // Spider (flash red on noclip hit)
  const spiderCol  = S.hitFlash > 0 ? '#ff4444' : mainCol
  const deadAlpha  = S.phase === 'dead' ? Math.max(0, 1 - S.deadT * 2.5) : 1
  if (deadAlpha > 0.01) {
    ctx.globalAlpha = deadAlpha
    _spdDrawSpider(ctx, spX, spY, S.onFloor, spiderCol)
    ctx.globalAlpha = 1
  }

  // Score
  ctx.textAlign = 'center'
  ctx.font = 'bold 26px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.shadowColor = mainCol; ctx.shadowBlur = 16
  ctx.fillText(S.noclip ? '—' : S.score, w/2, 42); ctx.shadowBlur = 0

  // Noclip label
  if (S.noclip) {
    ctx.font = '11px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.30)'
    ctx.fillText('NOCLIP — ' + (S.practiceDiff || '').toUpperCase(), w/2, 18)
  }

  // ── Announce overlay ──
  if (S.phase === 'announce' && ch) {
    const a = Math.min(1, S.announceT * 7)
    ctx.globalAlpha = a
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0,0,w,h)
    ctx.textAlign = 'center'
    ctx.font = 'bold 12px monospace'
    ctx.fillStyle = mainCol; ctx.shadowColor = mainCol; ctx.shadowBlur = 12
    ctx.fillText(ch.diff.toUpperCase(), w/2, h/2 - 48)
    ctx.font = 'bold 28px monospace'
    ctx.fillStyle = '#fff'; ctx.shadowColor = mainCol; ctx.shadowBlur = 22
    ctx.fillText(ch.name, w/2, h/2 - 10); ctx.shadowBlur = 0
    ctx.font = '12px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.36)'
    ctx.fillText('tap / space to flip', w/2, h/2 + 18)
    ctx.globalAlpha = 1
  }

  // ── Cleared overlay ──
  if (S.phase === 'cleared') {
    const t = S.clearedT
    const a = Math.min(1, t*8) * Math.max(0, 1 - (t - 0.25)*5.5)
    if (a > 0.01) {
      ctx.globalAlpha = a
      ctx.textAlign = 'center'; ctx.font = 'bold 36px monospace'
      ctx.fillStyle = '#4ade80'; ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 30
      ctx.fillText('CLEARED!', w/2, h/2); ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    }
  }

  ctx.restore()
}

function _spdDrawSpider(ctx, x, y, onFloor, col) {
  const R = SPD_R
  ctx.save()
  ctx.translate(x, y)
  if (!onFloor) ctx.scale(1, -1)

  ctx.strokeStyle = col; ctx.lineWidth = 1.5
  ctx.shadowColor = col; ctx.shadowBlur = 3
  for (const deg of [22, 44, 66, 84]) {
    const rad = deg * Math.PI / 180
    const sx = Math.cos(rad) * R * 0.85, sy = Math.sin(rad) * R * 0.85
    const ex = Math.cos(rad) * R * 2.4,  ey = Math.sin(rad) * R * 1.9
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-sx, sy); ctx.lineTo(-ex, ey); ctx.stroke()
  }
  ctx.shadowBlur = 0

  ctx.beginPath(); ctx.arc(0, 0, R * 1.6, 0, Math.PI*2)
  ctx.fillStyle = col + '15'; ctx.fill()

  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI*2)
  ctx.fillStyle = col + '40'; ctx.fill()

  ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, Math.PI*2)
  ctx.fillStyle = '#fff'
  ctx.shadowColor = col; ctx.shadowBlur = 12
  ctx.fill(); ctx.shadowBlur = 0

  ctx.fillStyle = '#05010a'
  ctx.beginPath(); ctx.arc(-R*0.22, -R*0.2, 1.4, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc( R*0.22, -R*0.2, 1.4, 0, Math.PI*2); ctx.fill()

  ctx.restore()
}
