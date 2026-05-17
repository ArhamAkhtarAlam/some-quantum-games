const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

const rooms = {}

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

io.on('connection', socket => {
  socket.on('create-room', () => {
    const code = randomCode()
    rooms[code] = { players: [socket.id], scores: {} }
    socket.join(code)
    socket.emit('room-created', code)
  })

  socket.on('join-room', code => {
    const room = rooms[code]
    if (!room || room.players.length >= 2) {
      socket.emit('join-error', 'Room not found or full.')
      return
    }
    room.players.push(socket.id)
    socket.join(code)
    io.to(code).emit('game-ready')
  })

  socket.on('score-update', ({ code, score }) => {
    socket.to(code).emit('opponent-score', score)
  })

  // Natural game end (CPS timer, Typing rounds finish)
  socket.on('game-over', ({ code, score }) => {
    socket.to(code).emit('opponent-done', score)
  })

  // Player crashed mid-game (Wave Dash, Parkour) — force-end the opponent's game
  socket.on('player-died', ({ code, score }) => {
    socket.to(code).emit('force-end', { loserScore: score })
  })

  socket.on('disconnecting', () => {
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
