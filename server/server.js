// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

// Create the Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Game state
const players = new Map(); // playerId -> playerData
let raceInProgress = false;
let countdownActive = false;

// Color palette for players (distinct colors)
const colors = [
  '#e74c3c', // Red
  '#3498db', // Blue
  '#2ecc71', // Green
  '#f1c40f', // Yellow
  '#9b59b6', // Purple
  '#1abc9c', // Teal
  '#e67e22', // Orange
  '#34495e', // Navy
  '#d35400', // Dark Orange
  '#27ae60'  // Dark Green
];

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Assign a color to the player
  const colorIndex = players.size % colors.length;
  const playerColor = colors[colorIndex];

  // Create player data
  const playerData = {
    id: socket.id,
    x: 2000, // Center of the map
    y: 1500, // Center of the map
    rotation: 0,
    vx: 0,
    vy: 0,
    color: playerColor,
    name: `Player ${players.size + 1}`,
    lap: 0,
    checkpoint: 0
  };

  // Add player to the game
  players.set(socket.id, playerData);

  // Send the new player their own data
  socket.emit('init', {
    id: socket.id,
    players: Array.from(players.values()),
    color: playerColor,
    raceInProgress,
    countdownActive
  });

  // Notify other players about the new player
  socket.broadcast.emit('player-joined', playerData);

  // If a race countdown is in progress, sync it with the new player
  if (countdownActive) {
    socket.emit('countdown-sync', {
      countdown: currentCountdown,
      startTime: countdownStartTime
    });
  }

  // Handle position updates from the player
  socket.on('position-update', (data) => {
    const player = players.get(socket.id);
    if (player) {
      // Update player data
      player.x = data.x;
      player.y = data.y;
      player.rotation = data.rotation;
      player.vx = data.vx;
      player.vy = data.vy;

      // Broadcast the update to all other players
      socket.broadcast.emit('player-moved', {
        id: socket.id,
        x: data.x,
        y: data.y,
        rotation: data.rotation,
        vx: data.vx,
        vy: data.vy
      });
    }
  });

  // Handle checkpoint/lap updates
  socket.on('checkpoint-update', (data) => {
    const player = players.get(socket.id);
    if (player) {
      player.checkpoint = data.checkpoint;
      player.lap = data.lap;

      // Broadcast to all players
      io.emit('player-progress', {
        id: socket.id,
        checkpoint: data.checkpoint,
        lap: data.lap
      });
    }
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Remove player from the game
    players.delete(socket.id);

    // Notify other players
    io.emit('player-left', { id: socket.id });

    // If no players left, reset race state
    if (players.size === 0) {
      raceInProgress = false;
      countdownActive = false;
    }
  });

  // Handle race start request (first player can start the race)
  socket.on('request-race-start', () => {
    // Only allow starting if no race is in progress
    if (!raceInProgress && !countdownActive && players.size > 0) {
      startRaceCountdown();
    }
  });
});

// Race countdown function
let currentCountdown = 5;
let countdownStartTime = 0;
let countdownInterval = null;

function startRaceCountdown() {
  countdownActive = true;
  currentCountdown = 5;
  countdownStartTime = Date.now();

  // Notify all players that countdown is starting
  io.emit('countdown-start', { countdown: currentCountdown });

  // Start the countdown
  countdownInterval = setInterval(() => {
    currentCountdown--;

    // Broadcast the current countdown value
    io.emit('countdown-update', { countdown: currentCountdown });

    // When countdown reaches 0, start the race
    if (currentCountdown === 0) {
      clearInterval(countdownInterval);

      // Start the race after a short delay (for "GO!")
      setTimeout(() => {
        raceInProgress = true;
        countdownActive = false;
        io.emit('race-start');
      }, 1000);
    }
  }, 1000);
}

// Start the server
const PORT = process.env.PORT || 3001; // Changed to port 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});