const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

const rooms  = {}  // code → { players, game, scores, dead }
const queues = {}  // game → [socket, ...]

// ── Quantum room codes ────────────────────────────────
// Same bits the games use: 10 qubits x 204,683 measurements, von Neumann
// whitened. See data/README.md in the site repo for how it was made.
//
// The pool is finite (511,736 bits) so it wraps, which is fine for codes —
// a repeat only matters if that exact room is still open, and takenCode()
// below rejects those anyway.

const QUANTUM_PATHS = [
  path.join(__dirname, 'data', 'quantum.bin'),        // deployed alongside
  path.join(__dirname, '..', 'data', 'quantum.bin'),  // running from the repo
]

let qBits = null, qBitPos = 0
for (const p of QUANTUM_PATHS) {
  try { qBits = fs.readFileSync(p); break } catch {}
}
console.log(qBits
  ? `Quantum entropy loaded: ${(qBits.length * 8).toLocaleString()} bits`
  : 'No quantum data found — room codes will use crypto.randomBytes')

function qBit() {
  const byte = qBits[(qBitPos >> 3) % qBits.length]
  const bit = (byte >> (7 - (qBitPos & 7))) & 1
  qBitPos++
  if (qBitPos >= qBits.length * 8) qBitPos = 0
  return bit
}

// Rejection sampling, so every character is equally likely. `% 36` on
// raw bytes would favour the first 30 letters — the whole point of
// whitening the bits is lost if the mapping reintroduces bias.
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'   // 36

function qIndex(max) {
  if (!qBits) return crypto.randomInt(max)
  const width = 32 - Math.clz32(max - 1)
  for (let tries = 0; tries < 64; tries++) {
    let v = 0
    for (let i = 0; i < width; i++) v = (v << 1) | qBit()
    if (v < max) return v
  }
  return crypto.randomInt(max)
}

function randomCode() {
  let out = ''
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[qIndex(CODE_ALPHABET.length)]
  return out
}

// Never hand out a code that's already hosting a match
function freshCode() {
  for (let i = 0; i < 100; i++) {
    const c = randomCode()
    if (!rooms[c]) return c
  }
  return randomCode() + qIndex(36).toString(36).toUpperCase()
}

function tryMatch(game) {
  if (!queues[game] || queues[game].length < 2) return
  const [p1, p2] = queues[game].splice(0, 2)
  const code = freshCode()
  rooms[code] = { players: [p1.id, p2.id], game, scores: {}, dead: {} }
  p1.join(code)
  p2.join(code)
  io.to(code).emit('matched', { code })
}

io.on('connection', socket => {

  // ── Queue ─────────────────────────────────────────
  socket.on('join-queue', ({ game }) => {
    // Remove from any existing queue first
    for (const g in queues) queues[g] = queues[g].filter(s => s.id !== socket.id)
    if (!queues[game]) queues[game] = []
    queues[game].push(socket)
    socket.data.queueGame = game
    socket.emit('queue-joined', { position: queues[game].length })
    tryMatch(game)
  })

  socket.on('leave-queue', () => {
    const game = socket.data.queueGame
    if (game && queues[game]) queues[game] = queues[game].filter(s => s.id !== socket.id)
  })

  // ── Ping ──────────────────────────────────────────
  socket.on('ping-check', ts => socket.emit('pong-check', ts))

  // ── Game events ───────────────────────────────────
  socket.on('score-update', ({ code, score }) => socket.to(code).emit('opponent-score', score))
  socket.on('state-sync',   ({ code, state }) => socket.to(code).emit('opponent-state', state))

  // Natural end (CPS timer, Typing rounds)
  socket.on('game-over', ({ code, score }) => socket.to(code).emit('opponent-done', score))

  // Player died mid-game
  socket.on('player-died', ({ code, score }) => {
    if (!rooms[code]) return
    if (rooms[code].game === 'parkour') {
      // Parkour: opponent keeps playing — tell them you died, they keep going
      rooms[code].dead[socket.id] = score
      socket.to(code).emit('opponent-died', score)
    } else {
      // Wave Dash etc: instant force-end for both
      socket.to(code).emit('force-end', { loserScore: score })
    }
  })

  // ── Disconnect ────────────────────────────────────
  socket.on('disconnecting', () => {
    for (const g in queues) queues[g] = queues[g].filter(s => s.id !== socket.id)
    socket.rooms.forEach(code => {
      if (rooms[code]) {
        socket.to(code).emit('opponent-left')
        delete rooms[code]
      }
    })
  })
})

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`))
