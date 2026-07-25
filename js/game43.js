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
        // max safe over 120-col hi→lo = 255/238*120*0.85 = 109px → swing = 54px each way
        const sw = Math.min(54, Math.floor(h * 0.13))
        const hi = 0.50 - sw/h, lo = 0.50 + sw/h
        return { clearAt:920, keyframes:[
          {at:0,   cf:0.50, gapH:h*.28},
          {at:90,  cf:hi,   gapH:h*.27},  // 90-col slope (54px, 0.60px/col ✓)
          {at:270, cf:hi,   gapH:h*.27},
          {at:390, cf:lo,   gapH:h*.26},  // 120-col shift (108px, 0.90px/col ✓)
          {at:570, cf:lo,   gapH:h*.26},
          {at:690, cf:hi,   gapH:h*.27},  // 120-col shift back
          {at:820, cf:hi,   gapH:h*.27},
          {at:920, cf:0.50, gapH:h*.28},  // 100-col return
        ]}
      }
    },
    {
      name:'SUDDEN SHIFT', diff:'medium', speed:248,
      gen(h) {
        // 120-col shifts → max safe = 255/248*120*0.85 = 105px total → swing = 52px
        const sw = Math.min(52, Math.floor(h * 0.14))
        const a = 0.50 - sw/h, b = 0.50 + sw/h
        return { clearAt:870, keyframes:[
          {at:0,   cf:0.50, gapH:h*.30},
          {at:100, cf:a,    gapH:h*.30},  // 100-col slope to a
          {at:230, cf:a,    gapH:h*.30},
          {at:350, cf:b,    gapH:h*.28},  // 120-col shift a→b (104px, 0.87px/col ✓)
          {at:530, cf:b,    gapH:h*.28},
          {at:650, cf:a,    gapH:h*.28},  // 120-col shift back
          {at:760, cf:a,    gapH:h*.28},
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
          {at:200, cf:0.50, gapH:h*.23},  // squeeze 60 col
          {at:530, cf:0.50, gapH:h*.23},
          {at:590, cf:0.50, gapH:h*.44},
          {at:920, cf:0.50, gapH:h*.44},
        ]}
      }
    },
    {
      name:'FAST SHIFT', diff:'medium', speed:348,
      gen(h) {
        // 110-col slopes → max safe = 255/348*110*0.85 = 68px (one direction)
        // never shift directly hi→lo; go via center instead
        const sw = Math.min(68, Math.floor(h * 0.16))
        const hi = 0.50 - sw/h, lo = 0.50 + sw/h
        return { clearAt:1040, keyframes:[
          {at:0,    cf:0.50, gapH:h*.32},
          {at:110,  cf:hi,   gapH:h*.30},  // 110-col up (68px, 0.62px/col ✓)
          {at:290,  cf:hi,   gapH:h*.30},
          {at:400,  cf:0.50, gapH:h*.30},  // 110-col back center
          {at:430,  cf:0.50, gapH:h*.30},
          {at:540,  cf:lo,   gapH:h*.30},  // 110-col down
          {at:720,  cf:lo,   gapH:h*.30},
          {at:830,  cf:0.50, gapH:h*.32},  // 110-col return
          {at:1040, cf:0.50, gapH:h*.32},
        ]}
      }
    },
  ],

  hard: [
    {
      name:'NEEDLE', diff:'hard', speed:302,
      gen(h) {
        // slope is during WIDE section so wave navigates freely — just cap cy
        // so player has enough time (130 col) to reach the narrow gap center
        const maxReach = Math.floor(255/302 * 130 * 0.90)  // ~99px in 130 col
        const sign = qRandInt(2) === 0 ? 1 : -1
        const deltaPx = 20 + qRandInt(Math.max(1, Math.min(maxReach - 30, 70)))
        const cy = Math.max(0.15, Math.min(0.85, 0.50 + sign * deltaPx / h))
        return { clearAt:960, keyframes:[
          {at:0,   cf:0.50, gapH:h*.30},
          {at:75,  cf:cy,   gapH:h*.30},  // slope during wide (no constraint)
          {at:130, cf:cy,   gapH:h*.14},  // close 55 col
          {at:510, cf:cy,   gapH:h*.14},
          {at:565, cf:cy,   gapH:h*.30},
          {at:960, cf:0.50, gapH:h*.30},
        ]}
      }
    },
    {
      name:'RAPID SHIFT', diff:'hard', speed:315,
      gen(h) {
        // 90-col slopes → max safe = 255/315*90*0.85 = 62px per move
        // route hi→lo via center (never direct) — corridor stays narrow
        const sw = Math.min(62, Math.floor(h * 0.16))
        const hi = 0.50 - sw/h, lo = 0.50 + sw/h
        return { clearAt:1010, keyframes:[
          {at:0,   cf:0.50, gapH:h*.16},
          {at:90,  cf:hi,   gapH:h*.15},  // 90-col up (62px, 0.69px/col ✓)
          {at:240, cf:hi,   gapH:h*.15},
          {at:330, cf:0.50, gapH:h*.14},  // 90-col back center
          {at:370, cf:0.50, gapH:h*.14},
          {at:460, cf:lo,   gapH:h*.14},  // 90-col down
          {at:610, cf:lo,   gapH:h*.14},
          {at:700, cf:0.50, gapH:h*.16},  // 90-col return
          {at:1010,cf:0.50, gapH:h*.16},
        ]}
      }
    },
    {
      name:'MARATHON', diff:'hard', speed:308,
      gen(h) {
        // each 75-col slope: max safe = 255/308*75*0.85 = 53px
        // generate cys as bounded cumulative steps so no consecutive pair exceeds 53px
        const step = Math.floor(255/308 * 75 * 0.85)  // 53px
        const dirs = [-1, 1, -1, 1]
        let cy = 0.50
        const cys = []
        for (const d of dirs) {
          const delta = (12 + qRandInt(Math.max(1, step - 12))) / h
          cy = Math.max(0.13, Math.min(0.87, cy + d * delta))
          cys.push(cy)
        }
        return { clearAt:1120, keyframes:[
          {at:0,    cf:0.50,    gapH:h*.16},
          {at:75,   cf:cys[0],  gapH:h*.145},  // 75-col (≤53px, ≤0.71px/col ✓)
          {at:260,  cf:cys[0],  gapH:h*.14},
          {at:335,  cf:cys[1],  gapH:h*.145},  // 75-col (≤53px ✓)
          {at:520,  cf:cys[1],  gapH:h*.14},
          {at:595,  cf:cys[2],  gapH:h*.14},   // 75-col ✓
          {at:780,  cf:cys[2],  gapH:h*.14},
          {at:855,  cf:cys[3],  gapH:h*.145},  // 75-col ✓
          {at:1000, cf:cys[3],  gapH:h*.145},
          {at:1120, cf:0.50,    gapH:h*.16},
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
    // speed=255 = wave vertical speed → diagonal angle = exactly 45°.
    // Wall snaps tight (gapH=22) while simultaneously sloping at 1px/column.
    // Wave R=7 (diam=14), clearance=4px/side ≈ 1-frame timing window.
    // Player must hold (upslope) or release (downslope) at the exact frame.
    {
      name:'FRAME PERFECT', diff:'fp', speed:255, isFP:true,
      gen(h) {
        const startCf = 0.60 + qRandInt(15)/100   // 60-75%: below center
        const endCf   = startCf - 80/h             // 80px rise = 45° upslope
        return { clearAt:720, keyframes:[
          { at:0,   cf:0.50,    gapH:h*.42 },
          { at:160, cf:0.50,    gapH:h*.42 },
          { at:198, cf:startCf, gapH:h*.42 },       // drift to slope position
          { at:200, cf:startCf, gapH:22    },        // SNAP + slope begins
          { at:280, cf:endCf,   gapH:22    },        // 45° upslope (80 col)
          { at:320, cf:endCf,   gapH:h*.42 },
          { at:720, cf:0.50,    gapH:h*.42 },
        ]}
      }
    },
    {
      name:'DOWN FP', diff:'fp', speed:255, isFP:true,
      gen(h) {
        const startCf = 0.28 + qRandInt(12)/100   // 28-40%: above center
        const endCf   = startCf + 80/h             // 80px drop = 45° downslope
        return { clearAt:720, keyframes:[
          { at:0,   cf:0.50,    gapH:h*.42 },
          { at:160, cf:0.50,    gapH:h*.42 },
          { at:198, cf:startCf, gapH:h*.42 },
          { at:200, cf:startCf, gapH:22    },        // SNAP + slope begins
          { at:280, cf:endCf,   gapH:22    },        // 45° downslope (80 col)
          { at:320, cf:endCf,   gapH:h*.42 },
          { at:720, cf:0.50,    gapH:h*.42 },
        ]}
      }
    },
    {
      name:'MID FP', diff:'fp', speed:255, isFP:true,
      gen(h) {
        const up      = qRandInt(2) === 0
        const startCf = up ? 0.55 + qRandInt(15)/100 : 0.28 + qRandInt(12)/100
        const endCf   = up ? startCf - 80/h : startCf + 80/h
        return { clearAt:720, keyframes:[
          { at:0,   cf:0.50,    gapH:h*.42 },
          { at:160, cf:0.50,    gapH:h*.42 },
          { at:198, cf:startCf, gapH:h*.42 },
          { at:200, cf:startCf, gapH:22    },
          { at:280, cf:endCf,   gapH:22    },
          { at:320, cf:endCf,   gapH:h*.42 },
          { at:720, cf:0.50,    gapH:h*.42 },
        ]}
      }
    },
  ],

  extreme: [
    {
      name:'TWIN SLAM', diff:'extreme', speed:278,
      gen(h) {
        // Two 30px slams at different positions.
        // Approach (120 col): max safe = 255/278*120*0.85 = 93px
        // Inter-slam drift (100 col): max safe = 255/278*100*0.85 = 78px
        const maxPos  = Math.floor(255/278 * 120 * 0.85)
        const maxJump = Math.floor(255/278 * 100 * 0.85)
        const cy1px   = 20 + qRandInt(Math.min(maxPos - 25, 55))
        const sign1   = qRandInt(2) === 0 ? 1 : -1
        const cy1     = Math.max(0.18, Math.min(0.82, 0.50 + sign1 * cy1px / h))
        const cy2px   = 15 + qRandInt(Math.min(maxJump - 20, 50))
        const cy2     = Math.max(0.18, Math.min(0.82, cy1 - sign1 * cy2px / h))
        return { clearAt:960, keyframes:[
          {at:0,   cf:0.50, gapH:h*.36},
          {at:120, cf:cy1,  gapH:h*.36},  // 120-col drift (≤93px ✓)
          {at:180, cf:cy1,  gapH:46},     // SLAM 1 (46px)
          {at:270, cf:cy1,  gapH:46},
          {at:330, cf:cy1,  gapH:h*.36},
          {at:430, cf:cy2,  gapH:h*.36},  // 100-col drift (≤65px ✓)
          {at:490, cf:cy2,  gapH:46},     // SLAM 2 (46px)
          {at:580, cf:cy2,  gapH:46},
          {at:640, cf:cy2,  gapH:h*.36},
          {at:960, cf:0.50, gapH:h*.36},
        ]}
      }
    },
    {
      name:'SQUEEZE SHIFT', diff:'extreme', speed:318,
      gen(h) {
        // 28px gap that slowly drifts while closed.
        // Clearance = 7px/side — must tap-control to stay centered while tracking drift.
        const maxPos = Math.floor(255/318 * 100 * 0.85)
        const cy1px  = 10 + qRandInt(Math.min(maxPos - 15, 50))
        const sign   = qRandInt(2) === 0 ? 1 : -1
        const cy1    = Math.max(0.20, Math.min(0.80, 0.50 + sign * cy1px / h))
        const drift  = (qRandInt(2) === 0 ? 1 : -1) * (6 + qRandInt(8))  // 6-13px
        const cy2    = Math.max(0.18, Math.min(0.82, cy1 + drift / h))
        return { clearAt:920, keyframes:[
          {at:0,   cf:0.50, gapH:h*.36},
          {at:100, cf:cy1,  gapH:h*.36},  // position
          {at:160, cf:cy1,  gapH:52},     // SLAM — 52px tight gap
          {at:260, cf:cy2,  gapH:52},     // slow drift 100 col (6-13px) while slammed
          {at:330, cf:cy2,  gapH:h*.36},
          {at:920, cf:0.50, gapH:h*.36},
        ]}
      }
    },
    {
      name:'BLITZ', diff:'extreme', speed:395,
      gen(h) {
        // High speed, h*.10 gap, quick shifts while tight.
        // sw = safe shift in 80 col = min(255/395*80*0.85, h*.10)
        const gW = h * 0.13
        const sw = Math.min(Math.floor(255/395 * 80 * 0.85), Math.floor(h * 0.13))
        const hi = 0.50 - sw/h, lo = 0.50 + sw/h
        return { clearAt:1100, keyframes:[
          {at:0,    cf:0.50, gapH:h*.28},
          {at:80,   cf:hi,   gapH:h*.26},   // 80-col shift up (≤sw px ✓)
          {at:200,  cf:hi,   gapH:gW},      // tighten
          {at:280,  cf:0.50, gapH:gW},      // 80-col return center while tight
          {at:300,  cf:0.50, gapH:gW},
          {at:380,  cf:lo,   gapH:gW},      // 80-col shift down while tight
          {at:500,  cf:lo,   gapH:gW},
          {at:580,  cf:lo,   gapH:h*.28},
          {at:1100, cf:0.50, gapH:h*.28},
        ]}
      }
    },
  ],

  dc: [
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

const G43_DIFF_COL = { easy:'#4ade80', medium:'#fbbf24', hard:'#f87171', extreme:'#fb923c', fp:'#c084fc', dc:'#ef4444' }

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
  multi:false,
  p2wy:0, p2wvy:0, p2holding:false, p2trail:[],
}
window._g43Score = 0

let G43_roomCode           = null
let G43_isHost             = false
let G43_lastNetSync        = 0
let G43_pendingSyncChallenge = null  // host: challenge to include in next state-sync
let G43_pendingNetChallenge  = null  // joiner: buffered challenge from host

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

function _g43Start(noclip, practiceDiff, multi) {
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
    multi:!!multi,
    p2wy:c.height/2, p2wvy:G43_WAVE_SPD, p2holding:false, p2trail:[],
  })
  window._g43Score = 0
  document.getElementById('g43-score-hud').textContent = noclip ? '—' : '0'

  if (G43_roomCode && !G43_isHost) {
    // Joiner: wait for host to send first challenge via state-sync
    G43.challenge = null
    G43.keyframes = []
    G43.clearAt   = 999999
    G43.scrollX   = 0
    G43.trail     = []
    G43.phase     = 'waiting'
  } else {
    _g43LoadChallenge(c.width, c.height)
  }

  c.addEventListener('mousedown',  _g43On,  {passive:false})
  c.addEventListener('mouseup',    _g43Off)
  c.addEventListener('touchstart', _g43On,  {passive:false})
  c.addEventListener('touchend',   _g43Off, {passive:false})
  window.addEventListener('keydown', _g43KeyDn)
  window.addEventListener('keyup',   _g43KeyUp)

  G43.lastTime = performance.now()
  G43.raf = requestAnimationFrame(_g43Loop)
}

window.startWaveGauntlet         = function()  { _g43Start(false, null, false) }
window.startWaveGauntlet2P       = function()  { _g43Start(false, null, true)  }
window.startWaveGauntletPractice = function(d) { _g43Start(true,  d,    false) }

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
  if (typeof mpGetSocket !== 'undefined' && G43_roomCode) {
    const s = mpGetSocket()
    s.off('opponent-state'); s.off('force-end')
  }
  G43_roomCode             = null
  G43_isHost               = false
  G43_pendingSyncChallenge = null
  G43_pendingNetChallenge  = null
}

window.g43FindMatch = function() {
  const statusEl = document.getElementById('g43-match-status')
  const btnEl    = document.getElementById('g43-match-btn')
  mpFindMatch('wavegauntlet', {
    onMatched: ({ code, isHost }) => {
      G43_roomCode = code
      G43_isHost   = isHost
      _g43Start(false, null, true)
      _g43SetupNetEvents()
    },
    onLeft: () => {
      G43_roomCode = null; G43_isHost = false
      G43_pendingNetChallenge = null
      if (!G43.active) document.getElementById('g43-overlay').style.display = 'flex'
    },
    statusEl, btnEl,
  })
}

function _g43SetupNetEvents() {
  const sock = mpGetSocket()
  sock.off('opponent-state'); sock.off('force-end')
  sock.on('opponent-state', (state) => {
    G43.p2wy  = state.wy
    G43.p2wvy = state.wvy
    if (!G43_isHost && state.challenge) G43_pendingNetChallenge = state.challenge
  })
  sock.on('force-end', () => { _g43Die() })
}

function _g43SerializeChallenge(h) {
  const ch = G43.challenge
  return {
    name: ch.name, diff: ch.diff, speed: ch.speed,
    clearAt: G43.clearAt,
    isFP: !!ch.isFP, isDC: !!ch.isDC, miniWave: !!ch.miniWave,
    keyframes: G43.keyframes.map(kf => ({ at: kf.at, cf: kf.cf, gapHf: kf.gapH / h })),
  }
}

function _g43ApplyNetChallenge(data, h) {
  G43.challenge = { name: data.name, diff: data.diff, speed: data.speed,
    clearAt: data.clearAt, isFP: data.isFP, isDC: data.isDC, miniWave: data.miniWave }
  G43.waveR    = data.miniWave ? G43_WAVE_R_MINI : G43_WAVE_R_NRM
  G43.keyframes = data.keyframes.map(kf => ({ at: kf.at, cf: kf.cf, gapH: kf.gapHf * h }))
  G43.clearAt  = data.clearAt
  G43.scrollX  = 0
  G43.trail    = []; G43.p2trail = []
  G43.phase    = 'announce'
  G43.announceT = 0
  G43.wy       = h / 2; G43.wvy = G43_WAVE_SPD; G43.hitFlash = 0
}

function _g43On(e)    { e.preventDefault(); G43.holding = true }
function _g43Off(e)   { if (e.cancelable) e.preventDefault(); G43.holding = false }
function _g43KeyDn(e) {
  if (e.code === 'Space') { e.preventDefault(); G43.holding = true }
  else if (e.key === 'ArrowUp') { e.preventDefault(); G43.multi ? (G43.p2holding = true) : (G43.holding = true) }
}
function _g43KeyUp(e) {
  if (e.code === 'Space') G43.holding = false
  else if (e.key === 'ArrowUp') { G43.multi ? (G43.p2holding = false) : (G43.holding = false) }
}

function _g43GetPool(score) {
  const {easy,medium,hard,extreme,fp,dc} = G43_POOL
  if (score < 3)  return [...easy]
  if (score < 5)  return [...easy, ...medium]
  if (score < 9)  return [...medium, ...hard, extreme[0]]
  if (score < 13) return [...hard, ...extreme, fp[0]]
  if (score < 17) return [...extreme, fp[0], fp[1], dc[0]]
  return [fp[0], ...dc, ...dc]
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
  if (G43.multi) {
    G43.p2wy = h / 2; G43.p2wvy = G43_WAVE_SPD; G43.p2holding = false; G43.p2trail = []
  }
  if (G43_roomCode && G43_isHost) G43_pendingSyncChallenge = _g43SerializeChallenge(h)
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
    if (G43.multi) {
      G43.p2wvy = G43.p2holding ? -G43_WAVE_SPD : G43_WAVE_SPD
      G43.p2wy += G43.p2wvy * dt
      if (doClamp) G43.p2wy = Math.max(WR + 2, Math.min(h - WR - 2, G43.p2wy))
    }
  }

  if (G43.phase === 'waiting') {
    // Online joiner: waiting for host to send first challenge
    waveStep(true)
    if (G43_pendingNetChallenge) {
      _g43ApplyNetChallenge(G43_pendingNetChallenge, h)
      G43_pendingNetChallenge = null
    }

  } else if (G43.phase === 'announce') {
    G43.announceT += dt
    if (G43.announceT >= 0.9) G43.phase = 'playing'

  } else if (G43.phase === 'playing') {
    waveStep(false)
    G43.scrollX += G43.challenge.speed * dt

    const wX = Math.round(w * 0.22)
    G43.trail.push({ x: wX, y: G43.wy })
    if (G43.trail.length > 30) G43.trail.shift()
    if (G43.multi) {
      G43.p2trail.push({ x: wX, y: G43.p2wy })
      if (G43.p2trail.length > 30) G43.p2trail.shift()
    }

    const wall    = _g43WallAt(Math.floor(G43.scrollX), h)
    const topWall = wall.cy - wall.gapH / 2
    const botWall = wall.cy + wall.gapH / 2
    const hit     = G43.wy - WR < topWall || G43.wy + WR > botWall
    // In online mode, P2 collision is checked on their own device
    const hit2    = G43.multi && !G43_roomCode && (G43.p2wy - WR < topWall || G43.p2wy + WR > botWall)

    if (hit || hit2) {
      if (G43.noclip) {
        if (G43.hitFlash <= 0) { G43.hitFlash = 0.22; SFX.die() }
        G43.wy = Math.max(WR + 2, Math.min(h - WR - 2, G43.wy))
        if (G43.multi && !G43_roomCode) G43.p2wy = Math.max(WR + 2, Math.min(h - WR - 2, G43.p2wy))
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
    if (G43.clearedT >= 0.75) {
      if (!G43_roomCode || G43_isHost) {
        _g43LoadChallenge(w, h)
      } else if (G43_pendingNetChallenge) {
        _g43ApplyNetChallenge(G43_pendingNetChallenge, h)
        G43_pendingNetChallenge = null
      }
    }

  } else if (G43.phase === 'dead') {
    G43.deadT += dt
    G43.wvy = G43_WAVE_SPD; G43.wy += G43.wvy * dt
    if (G43.multi) { G43.p2wvy = G43_WAVE_SPD; G43.p2wy += G43.p2wvy * dt }
    if (G43.deadT >= 1.8 && !G43.showOver) {
      G43.showOver     = true
      window._g43Score = G43.score
      document.getElementById('g43-final-score').textContent =
        `${G43.score} clear${G43.score !== 1 ? 's' : ''}`
      document.getElementById('g43-over').style.display = 'flex'
    }
  }

  // Network state sync (both host and joiner emit their wave position ~20/s)
  if (G43_roomCode && G43.phase !== 'dead') {
    if (ts - G43_lastNetSync >= 50) {
      G43_lastNetSync = ts
      const state = { wy: G43.wy, wvy: G43.wvy }
      if (G43_pendingSyncChallenge) {
        state.challenge = G43_pendingSyncChallenge
        G43_pendingSyncChallenge = null
      }
      mpGetSocket().emit('state-sync', { code: G43_roomCode, state })
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
  if (G43_roomCode) {
    mpGetSocket().emit('player-died', { code: G43_roomCode, score: G43.score })
    const s = mpGetSocket(); s.off('opponent-state'); s.off('force-end')
    G43_roomCode = null
  }
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

  // ── Wave trails ──────────────────────────────────────
  const _drawTrail = (trail, col) => {
    for (let i = 1; i < trail.length; i++) {
      const a = i / trail.length
      ctx.globalAlpha = a * a * 0.55
      ctx.strokeStyle = col; ctx.lineWidth = a * 2.2
      ctx.shadowColor = col; ctx.shadowBlur = 3
      ctx.beginPath()
      ctx.moveTo(trail[i-1].x, trail[i-1].y)
      ctx.lineTo(trail[i].x,   trail[i].y)
      ctx.stroke(); ctx.shadowBlur = 0
    }
    ctx.globalAlpha = 1
  }
  _drawTrail(G43.trail, mainCol)
  if (G43.multi) _drawTrail(G43.p2trail, '#38bdf8')

  // ── Wave characters ──────────────────────────────────
  const wAlpha = G43.phase === 'dead' ? Math.max(0, 1 - G43.deadT * 2.2) : 1
  ctx.globalAlpha = wAlpha
  _g43DrawWave(ctx, waveX, G43.wy,   G43.waveR, mainCol,  G43.wvy)
  if (G43.multi) _g43DrawWave(ctx, waveX, G43.p2wy, G43.waveR, '#38bdf8', G43.p2wvy)
  ctx.globalAlpha = 1

  // Noclip hit flash
  if (G43.noclip && G43.hitFlash > 0) {
    ctx.fillStyle = `rgba(239,68,68,${Math.min(0.28, G43.hitFlash * 1.8)})`
    ctx.fillRect(0, 0, w, h)
  }

  // Score / mode indicator
  ctx.textAlign = 'center'
  if (G43.noclip) {
    ctx.font = 'bold 11px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('NOCLIP — '+(G43.practiceDiff||'').toUpperCase(), w/2, 18)
  } else {
    ctx.font = 'bold 26px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.shadowColor = mainCol; ctx.shadowBlur = 16
    ctx.fillText(G43.score, w/2, 42); ctx.shadowBlur = 0
    if (G43.multi) {
      ctx.font = 'bold 10px monospace'
      ctx.fillStyle = mainCol;   ctx.fillText('P1 ●', w/2 - 22, 58)
      ctx.fillStyle = '#38bdf8'; ctx.fillText('● P2', w/2 + 22, 58)
    }
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
    if (G43.multi && G43_roomCode) {
      ctx.fillStyle = mainCol; ctx.fillText('SPACE / click to fly up', w/2, h/2 + 16)
      ctx.fillStyle = '#38bdf8'; ctx.fillText('Opponent online', w/2, h/2 + 34)
    } else if (G43.multi) {
      ctx.fillStyle = mainCol; ctx.fillText('P1: SPACE / click', w/2, h/2 + 16)
      ctx.fillStyle = '#38bdf8'; ctx.fillText('P2: ↑ arrow key',  w/2, h/2 + 34)
    } else {
      ctx.fillText('hold SPACE / click to fly up', w/2, h/2 + 18)
    }
    if (ch.isFP) {
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(216,180,254,0.75)'; ctx.shadowColor='#a855f7'; ctx.shadowBlur=6
      ctx.fillText('⚡ wall slams — be at the right height when it hits', w/2, h/2+38); ctx.shadowBlur=0
    } else if (ch.isDC) {
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(252,165,165,0.75)'; ctx.shadowColor='#ef4444'; ctx.shadowBlur=6
      ctx.fillText('⚡ mini wave · 5 slams · max speed', w/2, h/2+38); ctx.shadowBlur=0
    } else if (ch.diff === 'extreme') {
      ctx.font = '11px monospace'
      ctx.fillStyle = 'rgba(251,146,60,.75)'; ctx.shadowColor='#fb923c'; ctx.shadowBlur=6
      ctx.fillText('⚡ tight gaps — stay centered', w/2, h/2+38); ctx.shadowBlur=0
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

  // ── Waiting overlay (online joiner before first challenge arrives) ──
  if (G43.phase === 'waiting') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0,0,w,h)
    ctx.textAlign = 'center'; ctx.font = 'bold 14px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('Waiting for host…', w/2, h/2)
  }

  ctx.restore()
}

function _g43DrawWave(ctx, x, y, R, col, wvy) {
  const tilt = (wvy ?? G43.wvy) < 0 ? -Math.PI*0.25 : Math.PI*0.25
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
