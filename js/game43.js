// ═══════════════════════════════════════════════════════
//  GAME 43 — WAVE GAUNTLET
//  Continuous corridor (ceiling + floor always present).
//  Walls are angular slopes (GD geometry style).
//  FP: wall SLAMS to a 24px gap for ~30 columns —
//      one timed hold/release to be at the right height.
//  DC: mini-wave through 5–6 slam sections at max speed.
// ═══════════════════════════════════════════════════════

const G43_WAVE_SPD    = 255
const G43_WAVE_R_NRM  = 7
const G43_WAVE_R_MINI = 4
const G43_DRAW_STEP   = 2

// Corridor is defined by keyframes: {at, cf (cy as 0–1 fraction of h), gapH (px)}
// Linear interpolation between keyframes → angular slope walls.
// SHORT transition = steep slope (GD tile feel)
// LONG transition  = gentle ramp

const G43_POOL = {
  easy: [
    {
      name:'DRIFT', diff:'easy', speed:148,
      gen(h) {
        const cy = 0.30 + qRandInt(40)/100
        return { clearAt:820, keyframes:[
          {at:0,   cf:0.50, gapH:h*.52},
          {at:80,  cf:0.50, gapH:h*.52},
          {at:220, cf:cy,   gapH:h*.52},  // slope 140 col — gentle
          {at:600, cf:cy,   gapH:h*.52},  // flat
          {at:740, cf:0.50, gapH:h*.52},  // slope back
          {at:820, cf:0.50, gapH:h*.52},
        ]}
      }
    },
    {
      name:'WAVE ROLL', diff:'easy', speed:150,
      gen(h) {
        return { clearAt:880, keyframes:[
          {at:0,   cf:0.50, gapH:h*.54},
          {at:100, cf:0.50, gapH:h*.54},
          {at:220, cf:0.30, gapH:h*.54},  // slope up 120 col
          {at:340, cf:0.30, gapH:h*.54},
          {at:480, cf:0.68, gapH:h*.54},  // slope down 140 col
          {at:600, cf:0.68, gapH:h*.54},
          {at:740, cf:0.30, gapH:h*.54},  // slope up
          {at:880, cf:0.50, gapH:h*.54},
        ]}
      }
    },
    {
      name:'WIDE CORRIDOR', diff:'easy', speed:145,
      gen(h) {
        return { clearAt:780, keyframes:[
          {at:0,   cf:0.50, gapH:h*.56},
          {at:130, cf:0.35, gapH:h*.54},  // slope 130 col
          {at:400, cf:0.35, gapH:h*.54},
          {at:550, cf:0.65, gapH:h*.54},  // slope 150 col
          {at:680, cf:0.65, gapH:h*.54},
          {at:780, cf:0.50, gapH:h*.54},
        ]}
      }
    },
  ],

  medium: [
    {
      name:'TIGHT ROLL', diff:'medium', speed:238,
      gen(h) {
        return { clearAt:920, keyframes:[
          {at:0,   cf:0.50, gapH:h*.28},
          {at:90,  cf:0.30, gapH:h*.27},  // slope 90 col
          {at:270, cf:0.30, gapH:h*.27},
          {at:390, cf:0.70, gapH:h*.26},  // slope 120 col
          {at:570, cf:0.70, gapH:h*.26},
          {at:690, cf:0.30, gapH:h*.27},  // slope 120 col
          {at:820, cf:0.30, gapH:h*.27},
          {at:920, cf:0.50, gapH:h*.28},
        ]}
      }
    },
    {
      name:'SUDDEN SHIFT', diff:'medium', speed:248,
      gen(h) {
        const a=0.28+qRandInt(10)/100, b=0.64+qRandInt(8)/100
        return { clearAt:870, keyframes:[
          {at:0,   cf:0.50, gapH:h*.30},
          {at:100, cf:a,    gapH:h*.30},  // slope 100 col
          {at:240, cf:a,    gapH:h*.30},
          {at:300, cf:b,    gapH:h*.28},  // steep shift 60 col
          {at:490, cf:b,    gapH:h*.28},
          {at:550, cf:a,    gapH:h*.28},  // steep back 60 col
          {at:730, cf:a,    gapH:h*.28},
          {at:870, cf:0.50, gapH:h*.30},
        ]}
      }
    },
    {
      name:'SQUEEZE', diff:'medium', speed:232,
      gen(h) {
        return { clearAt:920, keyframes:[
          {at:0,   cf:0.50, gapH:h*.44},
          {at:140, cf:0.50, gapH:h*.44},
          {at:200, cf:0.50, gapH:h*.23},  // squeeze slope 60 col
          {at:530, cf:0.50, gapH:h*.23},  // long narrow
          {at:590, cf:0.50, gapH:h*.44},  // open slope 60 col
          {at:920, cf:0.50, gapH:h*.44},
        ]}
      }
    },
    {
      name:'FAST SHIFT', diff:'medium', speed:348,
      gen(h) {
        return { clearAt:1050, keyframes:[
          {at:0,    cf:0.50, gapH:h*.32},
          {at:90,   cf:0.28, gapH:h*.30},  // slope 90 col
          {at:280,  cf:0.28, gapH:h*.30},
          {at:390,  cf:0.72, gapH:h*.30},  // slope 110 col
          {at:580,  cf:0.72, gapH:h*.30},
          {at:670,  cf:0.50, gapH:h*.32},  // slope 90 col
          {at:1050, cf:0.50, gapH:h*.32},
        ]}
      }
    },
  ],

  hard: [
    {
      name:'NEEDLE', diff:'hard', speed:302,
      gen(h) {
        const cy=0.27+qRandInt(46)/100
        return { clearAt:960, keyframes:[
          {at:0,   cf:0.50, gapH:h*.30},
          {at:75,  cf:cy,   gapH:h*.30},  // slope 75 col — steep
          {at:130, cf:cy,   gapH:h*.14},  // close: 55 col slope
          {at:510, cf:cy,   gapH:h*.14},  // long narrow
          {at:565, cf:cy,   gapH:h*.30},  // open 55 col
          {at:960, cf:0.50, gapH:h*.30},
        ]}
      }
    },
    {
      name:'RAPID SHIFT', diff:'hard', speed:315,
      gen(h) {
        return { clearAt:1010, keyframes:[
          {at:0,   cf:0.50, gapH:h*.16},
          {at:55,  cf:0.28, gapH:h*.15},  // steep slope 55 col
          {at:200, cf:0.28, gapH:h*.15},
          {at:280, cf:0.72, gapH:h*.14},  // steep slope 80 col
          {at:430, cf:0.72, gapH:h*.14},
          {at:510, cf:0.28, gapH:h*.14},  // steep slope 80 col
          {at:660, cf:0.28, gapH:h*.14},
          {at:740, cf:0.50, gapH:h*.16},
          {at:1010,cf:0.50, gapH:h*.16},
        ]}
      }
    },
    {
      name:'MARATHON', diff:'hard', speed:308,
      gen(h) {
        const cys=[0.28,0.64,0.33,0.68,0.45].map(v=>v+qRandInt(8)/100-0.04)
        return { clearAt:1120, keyframes:[
          {at:0,    cf:0.50,   gapH:h*.16},
          {at:75,   cf:cys[0], gapH:h*.145},
          {at:260,  cf:cys[0], gapH:h*.14},
          {at:335,  cf:cys[1], gapH:h*.145},
          {at:520,  cf:cys[1], gapH:h*.14},
          {at:595,  cf:cys[2], gapH:h*.14},
          {at:780,  cf:cys[2], gapH:h*.14},
          {at:855,  cf:cys[3], gapH:h*.145},
          {at:1000, cf:cys[3], gapH:h*.145},
          {at:1120, cf:0.50,   gapH:h*.16},
        ]}
      }
    },
    {
      name:'SPEED NEEDLE', diff:'hard', speed:408,
      gen(h) {
        const cy=0.27+qRandInt(46)/100
        return { clearAt:1200, keyframes:[
          {at:0,    cf:0.50, gapH:h*.28},
          {at:70,   cf:cy,   gapH:h*.28},  // slope 70 col
          {at:130,  cf:cy,   gapH:h*.15},  // close 60 col
          {at:640,  cf:cy,   gapH:h*.15},
          {at:700,  cf:cy,   gapH:h*.28},  // open 60 col
          {at:1200, cf:0.50, gapH:h*.28},
        ]}
      }
    },
  ],

  fp: [
    // Corridor drifts to FP height via slope, then wall SLAMS shut to 24px
    // for ~30 columns. One timed hold/release threads the gap.
    {
      name:'FRAME PERFECT', diff:'fp', speed:308, isFP:true,
      gen(h) {
        const fpCy=0.25+qRandInt(50)/100
        return { clearAt:730, keyframes:[
          {at:0,   cf:0.50, gapH:h*.40},
          {at:80,  cf:0.50, gapH:h*.40},
          {at:200, cf:fpCy, gapH:h*.40},  // slope to FP height 120 col
          {at:235, cf:fpCy, gapH:h*.40},  // brief flat — player sees target
          {at:265, cf:fpCy, gapH:24    },  // SLAM SHUT 30 col — steep!
          {at:298, cf:fpCy, gapH:24    },  // FP gap 33 col ≈ 107ms @308px/s
          {at:328, cf:fpCy, gapH:h*.40 },  // SLAM OPEN 30 col
          {at:500, cf:fpCy, gapH:h*.40 },
          {at:620, cf:0.50, gapH:h*.40 },
          {at:730, cf:0.50, gapH:h*.40 },
        ]}
      }
    },
    {
      name:'HIGH FP', diff:'fp', speed:312, isFP:true,
      gen(h) {
        const fpCy=0.18+qRandInt(18)/100
        return { clearAt:710, keyframes:[
          {at:0,   cf:0.50, gapH:h*.38},
          {at:80,  cf:0.50, gapH:h*.38},
          {at:195, cf:fpCy, gapH:h*.38},  // slope 115 col
          {at:228, cf:fpCy, gapH:h*.38},
          {at:258, cf:fpCy, gapH:24    },  // SLAM 30 col
          {at:290, cf:fpCy, gapH:24    },
          {at:320, cf:fpCy, gapH:h*.38 },  // OPEN 30 col
          {at:500, cf:0.50, gapH:h*.38 },
          {at:710, cf:0.50, gapH:h*.38 },
        ]}
      }
    },
    {
      name:'LOW FP', diff:'fp', speed:312, isFP:true,
      gen(h) {
        const fpCy=0.60+qRandInt(20)/100
        return { clearAt:710, keyframes:[
          {at:0,   cf:0.50, gapH:h*.38},
          {at:80,  cf:0.50, gapH:h*.38},
          {at:195, cf:fpCy, gapH:h*.38},  // slope 115 col
          {at:228, cf:fpCy, gapH:h*.38},
          {at:258, cf:fpCy, gapH:24    },  // SLAM 30 col
          {at:290, cf:fpCy, gapH:24    },
          {at:320, cf:fpCy, gapH:h*.38 },  // OPEN 30 col
          {at:500, cf:0.50, gapH:h*.38 },
          {at:710, cf:0.50, gapH:h*.38 },
        ]}
      }
    },
  ],

  dc: [
    // Mini-wave, tight corridor, 5 SLAM sections.
    // Between slams corridor shifts to new cy via slope (angular transitions).
    {
      name:"OL' DEATH CORRIDOR", diff:'dc', speed:440, isDC:true, miniWave:true,
      gen(h) {
        const cys=Array.from({length:5},()=>0.24+qRandInt(52)/100)
        const FP=22, W=h*.19
        return { clearAt:1420, keyframes:[
          {at:0,   cf:0.50,   gapH:W},
          // slam 1 — slope 80 col then slam
          {at:80,  cf:cys[0], gapH:W},
          {at:115, cf:cys[0], gapH:W},
          {at:140, cf:cys[0], gapH:FP},   // SLAM 25 col
          {at:170, cf:cys[0], gapH:FP},   // gap 30 col
          {at:195, cf:cys[0], gapH:W},    // OPEN 25 col
          // slam 2
          {at:275, cf:cys[1], gapH:W},
          {at:310, cf:cys[1], gapH:W},
          {at:335, cf:cys[1], gapH:FP},
          {at:365, cf:cys[1], gapH:FP},
          {at:390, cf:cys[1], gapH:W},
          // slam 3
          {at:470, cf:cys[2], gapH:W},
          {at:505, cf:cys[2], gapH:W},
          {at:530, cf:cys[2], gapH:FP},
          {at:560, cf:cys[2], gapH:FP},
          {at:585, cf:cys[2], gapH:W},
          // slam 4
          {at:665, cf:cys[3], gapH:W},
          {at:700, cf:cys[3], gapH:W},
          {at:725, cf:cys[3], gapH:FP},
          {at:755, cf:cys[3], gapH:FP},
          {at:780, cf:cys[3], gapH:W},
          // slam 5
          {at:860, cf:cys[4], gapH:W},
          {at:895, cf:cys[4], gapH:W},
          {at:920, cf:cys[4], gapH:FP},
          {at:950, cf:cys[4], gapH:FP},
          {at:975, cf:cys[4], gapH:W},
          {at:1060,cf:0.50,   gapH:W},
          {at:1420,cf:0.50,   gapH:W},
        ]}
      }
    },
    {
      name:'THE CORRIDOR', diff:'dc', speed:452, isDC:true, miniWave:true,
      gen(h) {
        const cys=[0.26,0.64,0.30,0.70,0.50].map(v=>v+qRandInt(8)/100-0.04)
        const FP=22, W=h*.18
        return { clearAt:1300, keyframes:[
          {at:0,   cf:0.50,   gapH:W},
          {at:75,  cf:cys[0], gapH:W},
          {at:108, cf:cys[0], gapH:W},
          {at:130, cf:cys[0], gapH:FP},
          {at:158, cf:cys[0], gapH:FP},
          {at:180, cf:cys[0], gapH:W},
          {at:255, cf:cys[1], gapH:W},
          {at:288, cf:cys[1], gapH:W},
          {at:310, cf:cys[1], gapH:FP},
          {at:338, cf:cys[1], gapH:FP},
          {at:360, cf:cys[1], gapH:W},
          {at:435, cf:cys[2], gapH:W},
          {at:468, cf:cys[2], gapH:W},
          {at:490, cf:cys[2], gapH:FP},
          {at:518, cf:cys[2], gapH:FP},
          {at:540, cf:cys[2], gapH:W},
          {at:615, cf:cys[3], gapH:W},
          {at:648, cf:cys[3], gapH:W},
          {at:670, cf:cys[3], gapH:FP},
          {at:698, cf:cys[3], gapH:FP},
          {at:720, cf:cys[3], gapH:W},
          {at:795, cf:cys[4], gapH:W},
          {at:828, cf:cys[4], gapH:W},
          {at:850, cf:cys[4], gapH:FP},
          {at:878, cf:cys[4], gapH:FP},
          {at:900, cf:cys[4], gapH:W},
          {at:980, cf:0.50,   gapH:W},
          {at:1300,cf:0.50,   gapH:W},
        ]}
      }
    },
    {
      name:'FULL CORRIDOR', diff:'dc', speed:462, isDC:true, miniWave:true,
      gen(h) {
        const cys=Array.from({length:6},()=>0.22+qRandInt(56)/100)
        const FP=24, W=h*.18
        return { clearAt:1500, keyframes:[
          {at:0,    cf:0.50,   gapH:W},
          {at:65,   cf:cys[0], gapH:W},
          {at:92,   cf:cys[0], gapH:W},
          {at:112,  cf:cys[0], gapH:FP},
          {at:138,  cf:cys[0], gapH:FP},
          {at:158,  cf:cys[0], gapH:W},
          {at:223,  cf:cys[1], gapH:W},
          {at:250,  cf:cys[1], gapH:W},
          {at:270,  cf:cys[1], gapH:FP},
          {at:296,  cf:cys[1], gapH:FP},
          {at:316,  cf:cys[1], gapH:W},
          {at:381,  cf:cys[2], gapH:W},
          {at:408,  cf:cys[2], gapH:W},
          {at:428,  cf:cys[2], gapH:FP},
          {at:454,  cf:cys[2], gapH:FP},
          {at:474,  cf:cys[2], gapH:W},
          {at:539,  cf:cys[3], gapH:W},
          {at:566,  cf:cys[3], gapH:W},
          {at:586,  cf:cys[3], gapH:FP},
          {at:612,  cf:cys[3], gapH:FP},
          {at:632,  cf:cys[3], gapH:W},
          {at:697,  cf:cys[4], gapH:W},
          {at:724,  cf:cys[4], gapH:W},
          {at:744,  cf:cys[4], gapH:FP},
          {at:770,  cf:cys[4], gapH:FP},
          {at:790,  cf:cys[4], gapH:W},
          {at:855,  cf:cys[5], gapH:W},
          {at:882,  cf:cys[5], gapH:W},
          {at:902,  cf:cys[5], gapH:FP},
          {at:928,  cf:cys[5], gapH:FP},
          {at:948,  cf:cys[5], gapH:W},
          {at:1020, cf:0.50,   gapH:W},
          {at:1500, cf:0.50,   gapH:W},
        ]}
      }
    },
  ],
}

const G43_DIFF_COL = { easy:'#4ade80', medium:'#fbbf24', hard:'#f87171', fp:'#c084fc', dc:'#ef4444' }

const G43 = {
  active:false, phase:'idle',
  wy:0, wvy:0, holding:false,
  waveR:G43_WAVE_R_NRM,
  score:0, challenge:null,
  keyframes:[], clearAt:0, scrollX:0,
  trail:[],
  announceT:0, clearedT:0,
  deadT:0, showOver:false, shake:0,
  noclip:false, practiceDiff:null, hitFlash:0,
  raf:null, lastTime:0,
}
window._g43Score = 0

let _g43Canvas = null
function _g43C() {
  if (!_g43Canvas) _g43Canvas = document.getElementById('g43-canvas')
  return _g43Canvas
}

async function initGame43() {
  stopGame43(); _g43Canvas = null
  document.getElementById('g43-overlay').style.display = 'flex'
  document.getElementById('g43-over').style.display    = 'none'
  await initCurby()
}
window.initGame43 = initGame43

function _g43Start(noclip, practiceDiff) {
  SFX.resume(); SFX.click()
  const c = _g43C()
  c.width  = c.parentElement.clientWidth
  c.height = c.parentElement.clientHeight
  document.getElementById('g43-overlay').style.display = 'none'
  document.getElementById('g43-over').style.display    = 'none'

  Object.assign(G43, {
    active:true, phase:'announce',
    wy:c.height/2, wvy:G43_WAVE_SPD, holding:false,
    waveR:G43_WAVE_R_NRM,
    score:0, challenge:null, keyframes:[], clearAt:0, scrollX:0,
    trail:[],
    announceT:0, clearedT:0,
    deadT:0, showOver:false, shake:0,
    noclip:!!noclip, practiceDiff:practiceDiff||null, hitFlash:0,
  })
  window._g43Score = 0
  document.getElementById('g43-score-hud').textContent = noclip ? '—' : '0'

  _g43LoadChallenge(c.width, c.height)

  c.addEventListener('mousedown',  _g43On,  {passive:false})
  c.addEventListener('mouseup',    _g43Off)
  c.addEventListener('touchstart', _g43On,  {passive:false})
  c.addEventListener('touchend',   _g43Off, {passive:false})
  window.addEventListener('keydown', _g43KeyDn)
  window.addEventListener('keyup',   _g43KeyUp)

  G43.lastTime = performance.now()
  G43.raf = requestAnimationFrame(_g43Loop)
}

window.startWaveGauntlet         = function() { _g43Start(false, null) }
window.startWaveGauntletPractice = function(d)  { _g43Start(true, d) }

window.stopGame43 = function() {
  G43.active = false
  if (G43.raf) { cancelAnimationFrame(G43.raf); G43.raf = null }
  const c = _g43C()
  if (c) {
    c.removeEventListener('mousedown',  _g43On)
    c.removeEventListener('mouseup',    _g43Off)
    c.removeEventListener('touchstart', _g43On)
    c.removeEventListener('touchend',   _g43Off)
  }
  window.removeEventListener('keydown', _g43KeyDn)
  window.removeEventListener('keyup',   _g43KeyUp)
}

function _g43On(e)    { e.preventDefault(); G43.holding = true }
function _g43Off(e)   { if (e.cancelable) e.preventDefault(); G43.holding = false }
function _g43KeyDn(e) { if (e.code==='Space'||e.key==='ArrowUp') { e.preventDefault(); G43.holding=true } }
function _g43KeyUp(e) { if (e.code==='Space'||e.key==='ArrowUp') G43.holding=false }

function _g43GetPool(score) {
  const {easy,medium,hard,fp,dc} = G43_POOL
  if (score < 3)  return [...easy]
  if (score < 5)  return [...easy, ...medium]
  if (score < 9)  return [...medium, ...hard, fp[0]]
  if (score < 13) return [...hard, ...fp]
  if (score < 17) return [...fp, dc[0]]
  return [...fp, ...dc, ...dc]
}

function _g43LoadChallenge(w, h) {
  let pool
  if (G43.noclip && G43.practiceDiff) {
    pool = G43_POOL[G43.practiceDiff] || G43_POOL.easy
  } else {
    pool = _g43GetPool(G43.score)
  }
  const tmpl        = pool[qRandInt(pool.length)]
  G43.challenge     = { ...tmpl }
  G43.waveR         = tmpl.miniWave ? G43_WAVE_R_MINI : G43_WAVE_R_NRM
  const kfData      = tmpl.gen(h)
  G43.keyframes     = kfData.keyframes
  G43.clearAt       = kfData.clearAt
  G43.scrollX       = 0
  G43.trail         = []
  G43.phase         = 'announce'
  G43.announceT     = 0
  G43.wy            = h / 2
  G43.wvy           = G43_WAVE_SPD
  G43.hitFlash      = 0
}

// Linearly interpolated corridor shape at a given column offset
function _g43WallAt(col, h) {
  const kfs = G43.keyframes
  if (!kfs || kfs.length === 0) return { cy:h/2, gapH:h*0.6 }
  if (col <= kfs[0].at)         return { cy:kfs[0].cf*h, gapH:kfs[0].gapH }
  const last = kfs[kfs.length-1]
  if (col >= last.at)           return { cy:last.cf*h, gapH:last.gapH }
  for (let i = 1; i < kfs.length; i++) {
    if (col <= kfs[i].at) {
      const span = kfs[i].at - kfs[i-1].at
      const t    = span > 0 ? (col - kfs[i-1].at) / span : 1
      return {
        cy:   (kfs[i-1].cf   + (kfs[i].cf   - kfs[i-1].cf)   * t) * h,
        gapH:  kfs[i-1].gapH + (kfs[i].gapH - kfs[i-1].gapH) * t,
      }
    }
  }
  return { cy:last.cf*h, gapH:last.gapH }
}

function _g43Loop(ts) {
  if (!G43.active) return
  const dt = Math.min((ts - G43.lastTime) / 1000, 0.05)
  G43.lastTime = ts
  const c = _g43C(), w = c.width, h = c.height
  const WR = G43.waveR

  if (G43.shake    > 0) G43.shake    = Math.max(0, G43.shake    - dt * 4)
  if (G43.hitFlash > 0) G43.hitFlash = Math.max(0, G43.hitFlash - dt)

  const waveStep = (doClamp) => {
    G43.wvy = G43.holding ? -G43_WAVE_SPD : G43_WAVE_SPD
    G43.wy += G43.wvy * dt
    if (doClamp) G43.wy = Math.max(WR + 2, Math.min(h - WR - 2, G43.wy))
  }

  if (G43.phase === 'announce') {
    G43.announceT += dt
    if (G43.announceT >= 0.9) G43.phase = 'playing'

  } else if (G43.phase === 'playing') {
    waveStep(false)
    G43.scrollX += G43.challenge.speed * dt

    G43.trail.push({ x: Math.round(w * 0.22), y: G43.wy })
    if (G43.trail.length > 30) G43.trail.shift()

    const wall    = _g43WallAt(Math.floor(G43.scrollX), h)
    const topWall = wall.cy - wall.gapH / 2
    const botWall = wall.cy + wall.gapH / 2
    const hit     = G43.wy - WR < topWall || G43.wy + WR > botWall

    if (hit) {
      if (G43.noclip) {
        if (G43.hitFlash <= 0) { G43.hitFlash = 0.22; SFX.die() }
        G43.wy = Math.max(WR + 2, Math.min(h - WR - 2, G43.wy))
      } else {
        _g43Die()
      }
    }

    if (G43.scrollX >= G43.clearAt) {
      G43.phase    = 'cleared'
      G43.clearedT = 0
      if (!G43.noclip) {
        G43.score++
        window._g43Score = G43.score
        document.getElementById('g43-score-hud').textContent = G43.score
      }
      SFX.win()
    }

  } else if (G43.phase === 'cleared') {
    G43.clearedT += dt
    waveStep(true)
    if (G43.clearedT >= 0.75) _g43LoadChallenge(w, h)

  } else if (G43.phase === 'dead') {
    G43.deadT += dt
    G43.wvy = G43_WAVE_SPD; G43.wy += G43.wvy * dt
    if (G43.deadT >= 1.8 && !G43.showOver) {
      G43.showOver     = true
      window._g43Score = G43.score
      document.getElementById('g43-final-score').textContent =
        `${G43.score} clear${G43.score !== 1 ? 's' : ''}`
      document.getElementById('g43-over').style.display = 'flex'
    }
  }

  _g43Draw(c.getContext('2d'), w, h)
  if (G43.showOver) { G43.active = false; return }
  G43.raf = requestAnimationFrame(_g43Loop)
}

function _g43Die() {
  if (G43.phase === 'dead') return
  G43.phase = 'dead'; G43.deadT = 0; G43.shake = 1
  SFX.die()
  window.removeEventListener('keydown', _g43KeyDn)
  window.removeEventListener('keyup',   _g43KeyUp)
}

// ── draw ─────────────────────────────────────────────────

function _g43Draw(ctx, w, h) {
  ctx.save()
  if (G43.shake > 0) {
    const s = G43.shake * 7
    ctx.translate((Math.random()-.5)*s, (Math.random()-.5)*s)
  }

  const ch      = G43.challenge
  const mainCol = ch ? (G43_DIFF_COL[ch.diff] || '#22c55e') : '#22c55e'
  const waveX   = Math.round(w * 0.22)
  const scrollI = Math.floor(G43.scrollX)

  // Background
  ctx.fillStyle = ch?.isDC ? '#0a0101' : '#01080a'
  ctx.fillRect(-12, -12, w+24, h+24)

  // Faint grid
  ctx.strokeStyle = 'rgba(255,255,255,0.018)'
  ctx.lineWidth   = 1
  for (let y = 0; y < h; y += 28) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke()
  }

  // ── Corridor walls ───────────────────────────────────
  // Path sampled every G43_DRAW_STEP px.
  // Linear keyframe interpolation creates angular slopes automatically.
  ctx.fillStyle = ch?.isDC ? '#0e0000' : '#001408'

  // Cache wall lookups (ci = actual count after loop)
  const wallCache = []
  for (let x = 0; x <= w + G43_DRAW_STEP; x += G43_DRAW_STEP) {
    wallCache.push(_g43WallAt(scrollI + x - waveX, h))
  }
  const wc = wallCache.length

  // Top wall
  ctx.beginPath(); ctx.moveTo(-1, -1)
  for (let i = 0; i < wc; i++) {
    ctx.lineTo(i * G43_DRAW_STEP, wallCache[i].cy - wallCache[i].gapH / 2)
  }
  ctx.lineTo(w+1, -1); ctx.closePath(); ctx.fill()

  // Bottom wall
  ctx.beginPath(); ctx.moveTo(-1, h+1)
  for (let i = 0; i < wc; i++) {
    ctx.lineTo(i * G43_DRAW_STEP, wallCache[i].cy + wallCache[i].gapH / 2)
  }
  ctx.lineTo(w+1, h+1); ctx.closePath(); ctx.fill()

  // Top inner edge (glowing line — shows the slope geometry)
  ctx.beginPath()
  for (let i = 0; i < wc; i++) {
    const x = i * G43_DRAW_STEP
    const y = wallCache[i].cy - wallCache[i].gapH / 2
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = mainCol; ctx.lineWidth = 1.8
  ctx.shadowColor = mainCol; ctx.shadowBlur = 10
  ctx.stroke(); ctx.shadowBlur = 0

  // Bottom inner edge
  ctx.beginPath()
  for (let i = 0; i < wc; i++) {
    const x = i * G43_DRAW_STEP
    const y = wallCache[i].cy + wallCache[i].gapH / 2
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = mainCol; ctx.lineWidth = 1.8
  ctx.shadowColor = mainCol; ctx.shadowBlur = 10
  ctx.stroke(); ctx.shadowBlur = 0

  // ── Wave trail ───────────────────────────────────────
  const trail = G43.trail
  for (let i = 1; i < trail.length; i++) {
    const a = i / trail.length
    ctx.globalAlpha = a * a * 0.55
    ctx.strokeStyle = mainCol; ctx.lineWidth = a * 2.2
    ctx.shadowColor = mainCol; ctx.shadowBlur = 3
    ctx.beginPath()
    ctx.moveTo(trail[i-1].x, trail[i-1].y)
    ctx.lineTo(trail[i].x,   trail[i].y)
    ctx.stroke(); ctx.shadowBlur = 0
  }
  ctx.globalAlpha = 1

  // ── Wave character ───────────────────────────────────
  const wAlpha = G43.phase === 'dead' ? Math.max(0, 1 - G43.deadT * 2.2) : 1
  ctx.globalAlpha = wAlpha
  _g43DrawWave(ctx, waveX, G43.wy, G43.waveR, mainCol)
  ctx.globalAlpha = 1

  // Noclip hit flash
  if (G43.noclip && G43.hitFlash > 0) {
    ctx.fillStyle = `rgba(239,68,68,${Math.min(0.28, G43.hitFlash * 1.8)})`
    ctx.fillRect(0, 0, w, h)
  }

  // Score
  ctx.textAlign = 'center'
  if (G43.noclip) {
    ctx.font = 'bold 11px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('NOCLIP — '+(G43.practiceDiff||'').toUpperCase(), w/2, 18)
  } else {
    ctx.font = 'bold 26px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.shadowColor = mainCol; ctx.shadowBlur = 16
    ctx.fillText(G43.score, w/2, 42); ctx.shadowBlur = 0
  }

  // ── Announce overlay ─────────────────────────────────
  if (G43.phase === 'announce' && ch) {
    const a = Math.min(1, G43.announceT * 7)
    ctx.globalAlpha = a
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0,0,w,h)
    ctx.textAlign = 'center'
    ctx.font = 'bold 12px monospace'
    ctx.fillStyle = mainCol; ctx.shadowColor = mainCol; ctx.shadowBlur = 12
    ctx.fillText(ch.diff.toUpperCase(), w/2, h/2 - 50)
    ctx.font = `bold ${ch.isDC ? 20 : ch.isFP ? 22 : 28}px monospace`
    ctx.fillStyle = ch.isDC ? '#fca5a5' : ch.isFP ? '#e9d5ff' : '#fff'
    ctx.shadowColor = mainCol; ctx.shadowBlur = 22
    ctx.fillText(ch.name, w/2, h/2 - 12); ctx.shadowBlur = 0
    ctx.font = '12px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.36)'
    ctx.fillText('hold SPACE / click to fly up', w/2, h/2 + 18)
    if (ch.isFP) {
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(216,180,254,0.75)'; ctx.shadowColor='#a855f7'; ctx.shadowBlur=6
      ctx.fillText('⚡ wall slams — be at the right height when it hits', w/2, h/2+38); ctx.shadowBlur=0
    } else if (ch.isDC) {
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(252,165,165,0.75)'; ctx.shadowColor='#ef4444'; ctx.shadowBlur=6
      ctx.fillText('⚡ mini wave · 5 slams · max speed', w/2, h/2+38); ctx.shadowBlur=0
    }
    if (G43.noclip) { ctx.font='11px monospace'; ctx.fillStyle='rgba(255,255,255,0.30)'; ctx.fillText("noclip — walls won't kill you", w/2, h/2+58) }
    ctx.globalAlpha = 1
  }

  // ── Cleared overlay ──────────────────────────────────
  if (G43.phase === 'cleared') {
    const t = G43.clearedT
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

function _g43DrawWave(ctx, x, y, R, col) {
  const tilt = G43.wvy < 0 ? -Math.PI*0.25 : Math.PI*0.25
  ctx.save()
  ctx.translate(x, y); ctx.rotate(tilt)
  ctx.beginPath(); ctx.arc(0, 0, R*2.6, 0, Math.PI*2)
  ctx.fillStyle = col+'18'; ctx.fill()
  ctx.beginPath()
  ctx.moveTo( R*1.5,  0)
  ctx.lineTo(-R*1.0, -R*0.78)
  ctx.lineTo(-R*0.35, 0)
  ctx.lineTo(-R*1.0,  R*0.78)
  ctx.closePath()
  ctx.fillStyle = '#fff'; ctx.shadowColor = col; ctx.shadowBlur = 20
  ctx.fill()
  ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()
}
