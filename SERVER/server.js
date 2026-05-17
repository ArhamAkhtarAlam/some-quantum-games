const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

const rooms  = {}  // code → { players, game, scores, dead }
const queues = {}  // game → [socket, ...]

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function tryMatch(game) {
  if (!queues[game] || queues[game].length < 2) return
  const [p1, p2] = queues[game].splice(0, 2)
  const code = randomCode()
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
