// server/src/server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const LevelGenerator = require('./levelGenerator');
const constants = require('../shared/constants');
const utils = require('../shared/utils');
const adminConfig = require('./admin-config');

// Create the Express app
const app = express();

// Add CORS middleware for Express
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Parse request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Set up cookie parser and session middleware
app.use(cookieParser());
app.use(session({
  secret: adminConfig.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: adminConfig.sessionMaxAge
  }
}));

// Authentication middleware for admin routes
const authenticateAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect('/admin/login');
};

const server = http.createServer(app);

// Configure Socket.IO with CORS options
const io = socketIO(server, {
  cors: {
    origin: ["https://atreas.github.io", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Create level generator
const levelGenerator = new LevelGenerator();

// Current level data
let currentLevelData = null;

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// Serve shared files
app.use('/shared', express.static(path.join(__dirname, '../shared')));

// Admin routes
// Login page
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// Login authentication
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === adminConfig.username && password === adminConfig.password) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }

  return res.redirect('/admin/login?error=1');
});

// Admin dashboard
app.get('/admin', authenticateAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Admin API endpoints
app.get('/admin/api/players', authenticateAdmin, (req, res) => {
  console.log('Admin API - Get Players - Connected players:', players.size);

  const playerList = Array.from(players.values()).map(player => {
    console.log('Player data:', player.id, player.name, player.color);
    return {
      id: player.id,
      name: player.name,
      color: player.color,
      points: player.points,
      x: Math.round(player.x),
      y: Math.round(player.y),
      invincible: player.invincible
    };
  });

  console.log('Admin API - Sending player list:', playerList.length);
  console.log('Game state:', { gameInProgress, countdownActive, celebrationActive, matchTimeRemaining });

  res.json({
    players: playerList,
    gameInProgress,
    countdownActive,
    celebrationActive,
    matchTimeRemaining
  });
});

// Kick player
app.post('/admin/api/kick', authenticateAdmin, (req, res) => {
  const { playerId } = req.body;
  console.log('Admin API - Kick player request for ID:', playerId);

  if (players.has(playerId)) {
    console.log('Player found in players map');

    // Get the socket by ID
    const socketId = playerId;
    const socket = io.sockets.sockets.get(socketId);

    if (socket) {
      console.log('Socket found, disconnecting player');

      // Disconnect the socket
      socket.disconnect(true);

      // Remove player from the game
      players.delete(playerId);
      usedColors.delete(playerId);

      // Notify other players
      io.emit('player-left', { id: playerId });

      console.log('Player kicked successfully');
      return res.json({ success: true, message: 'Player kicked successfully' });
    } else {
      console.log('Socket not found for player ID');
      return res.status(404).json({ success: false, message: 'Socket not found for player' });
    }
  }

  console.log('Player not found in players map');
  return res.status(404).json({ success: false, message: 'Player not found' });
});

// Stop current match
app.post('/admin/api/stop-match', authenticateAdmin, (req, res) => {
  console.log('Admin API - Stop match request');

  if (gameInProgress) {
    console.log('Game in progress, stopping match');

    // Clear game timer
    if (gameTimer) {
      clearInterval(gameTimer);
      gameTimer = null;
    }

    // Reset game state
    gameInProgress = false;
    countdownActive = false;
    celebrationActive = false;

    // Notify all players that the game has been stopped by admin
    console.log('Emitting game-stopped event to all clients');
    io.emit('game-stopped', { message: 'Game stopped by administrator' });

    return res.json({ success: true, message: 'Match stopped successfully' });
  }

  console.log('No match in progress');
  return res.json({ success: false, message: 'No match in progress' });
});

// Start new match
app.post('/admin/api/start-match', authenticateAdmin, (req, res) => {
  console.log('Admin API - Start match request');

  if (!gameInProgress && !countdownActive && !celebrationActive) {
    console.log('Starting game countdown');
    startGameCountdown();
    return res.json({ success: true, message: 'Match countdown started' });
  }

  console.log('Cannot start match - game state:', { gameInProgress, countdownActive, celebrationActive });
  return res.status(400).json({
    success: false,
    message: 'Cannot start match: game in progress, countdown active, or celebration active'
  });
});

// Logout
app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Serve admin static files
app.use('/admin/assets', express.static(path.join(__dirname, 'admin', 'assets')));

// Game state
const players = new Map(); // playerId -> playerData
let gameInProgress = false;
let countdownActive = false;
let celebrationActive = false;
let gameTimer = null;
const POINTS_TO_WIN = 11; // Points needed to win
const MIN_POINT_DIFFERENCE = 2; // Minimum point difference to win
const CELEBRATION_DURATION = 5000; // 5 seconds in milliseconds
const MATCH_DURATION = 300000; // 5 minutes in milliseconds
const PRE_MATCH_COUNTDOWN = 30; // 30 seconds countdown before match
let matchStartTime = 0; // When the current match started
let matchTimeRemaining = MATCH_DURATION; // Time remaining in current match

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

// Track used colors
const usedColors = new Map(); // playerId -> colorIndex

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Find an unused color
  let colorIndex = 0;
  const usedIndices = Array.from(usedColors.values());

  // Find the first unused color index
  while (usedIndices.includes(colorIndex) && colorIndex < colors.length) {
    colorIndex++;
  }

  // If all colors are used, wrap around
  if (colorIndex >= colors.length) {
    colorIndex = 0;
  }

  // Store the color index for this player
  usedColors.set(socket.id, colorIndex);

  const playerColor = colors[colorIndex];

  // Calculate spawn position at the bottom of the map
  // Space players evenly across the bottom
  const mapWidth = 4000;
  const mapHeight = 3000;
  const bottomMargin = 200; // Distance from the very bottom
  const playerCount = players.size;
  const spacing = mapWidth / (playerCount + 2); // +2 to leave space on edges
  const spawnX = spacing * (playerCount + 1); // Position based on player count
  const spawnY = mapHeight - bottomMargin; // Near the bottom of the map

  // Create player data
  const playerData = {
    id: socket.id,
    x: spawnX,
    y: spawnY,
    rotation: 270, // Facing upward (270 degrees)
    vx: 0,
    vy: 0,
    color: playerColor,
    name: `Player ${players.size + 1}`,
    points: 0,
    activeCheckpoint: -1,
    invincible: true, // Start as invincible
    invincibleUntil: Date.now() + 5000 // Invincible for 5 seconds
  };

  // Add player to the game
  players.set(socket.id, playerData);

  // Send the new player their own data
  socket.emit('init', {
    id: socket.id,
    players: Array.from(players.values()),
    color: playerColor,
    gameInProgress,
    countdownActive,
    celebrationActive,
    levelData: currentLevelData // Send current level data if available
  });

  // Notify other players about the new player
  socket.broadcast.emit('player-joined', playerData);

  // If a countdown is in progress, sync it with the new player
  if (countdownActive) {
    socket.emit('countdown-sync', {
      countdown: currentCountdown,
      startTime: countdownStartTime
    });
  }

  // If this is the first player, start the game after a short delay
  if (players.size === 1) {
    console.log('First player joined, starting game in 3 seconds...');
    setTimeout(() => {
      if (players.size > 0 && !gameInProgress && !countdownActive && !celebrationActive) {
        console.log('Starting game automatically for first player...');
        startGameCountdown();
      }
    }, 3000);
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

      // Check if invincibility has expired
      if (player.invincible && Date.now() > player.invincibleUntil) {
        player.invincible = false;
        // Notify the player that invincibility has ended
        socket.emit('invincibility-ended');
      }

      // Broadcast the update to all other players
      socket.broadcast.emit('player-moved', {
        id: socket.id,
        x: data.x,
        y: data.y,
        rotation: data.rotation,
        vx: data.vx,
        vy: data.vy,
        invincible: player.invincible
      });
    }
  });

  // Handle point updates
  socket.on('point-update', (data) => {
    const player = players.get(socket.id);
    if (player) {
      player.points = data.points;

      // Broadcast to all players
      io.emit('player-points', {
        id: socket.id,
        points: data.points
      });
    }
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Remove player from the game
    players.delete(socket.id);

    // Release the player's color
    usedColors.delete(socket.id);

    // Notify other players
    io.emit('player-left', { id: socket.id });

    // If no players left, reset game state
    if (players.size === 0) {
      resetGameState();
    }
  });

  // Handle game start request (first player can start the game)
  socket.on('request-game-start', () => {
    // Only allow starting if no game is in progress
    if (!gameInProgress && !countdownActive && !celebrationActive && players.size > 0) {
      startGameCountdown();
    }
  });

  // Handle destroy ship request (when a wrecking ball hits another ship)
  socket.on('destroy-ship', (data) => {
    const targetId = data.targetId;
    if (targetId && players.has(targetId)) {
      // Check if target is invincible
      const targetPlayer = players.get(targetId);
      if (targetPlayer.invincible) {
        // Target is invincible, no destruction
        return;
      }

      // Award 5 points to the destroyer
      const destroyer = players.get(socket.id);
      if (destroyer) {
        destroyer.points += 5;

        // Broadcast the updated points
        io.emit('player-points', {
          id: socket.id,
          points: destroyer.points
        });

        // Send a message to the destroyer that they earned points
        io.to(socket.id).emit('points-earned', {
          amount: 5,
          reason: 'destroyed-ship',
          total: destroyer.points
        });
      }

      // Send a message to the target player that they've been destroyed
      io.to(targetId).emit('ship-destroyed', {
        destroyerId: socket.id
      });
    }
  });

  // Handle collision with wall or object
  socket.on('collision', () => {
    // Deduct 2 points for colliding with a wall or object
    const player = players.get(socket.id);
    if (player && gameInProgress) {
      player.points = Math.max(0, player.points - 2); // Ensure points don't go below 0

      // Broadcast the updated points
      io.emit('player-points', {
        id: socket.id,
        points: player.points
      });

      // Send a message to the player that they lost points
      io.to(socket.id).emit('points-earned', {
        amount: -2,
        reason: 'collision',
        total: player.points
      });
    }
  });
});

// Game countdown function
let currentCountdown = 5;
let countdownStartTime = 0;
let countdownInterval = null;
let isPreMatchCountdown = false;

function startGameCountdown() {
  countdownActive = true;
  isPreMatchCountdown = true;
  currentCountdown = PRE_MATCH_COUNTDOWN;
  countdownStartTime = Date.now();

  // Notify all players that countdown is starting
  io.emit('countdown-start', {
    countdown: currentCountdown,
    isPreMatch: true
  });

  // Start the countdown
  countdownInterval = setInterval(() => {
    currentCountdown--;

    // Broadcast the current countdown value
    io.emit('countdown-update', {
      countdown: currentCountdown,
      isPreMatch: true
    });

    // When countdown reaches 5, start the final countdown
    if (currentCountdown === 5) {
      isPreMatchCountdown = false;
      io.emit('final-countdown-start', { countdown: 5 });

      // Set up a separate interval for the final 5-second countdown
      let finalCountdown = 5;
      const finalCountdownInterval = setInterval(() => {
        finalCountdown--;

        // Send the countdown update
        io.emit('countdown-update', {
          countdown: finalCountdown,
          isPreMatch: false
        });

        // When final countdown reaches 0, clear this interval
        if (finalCountdown === 0) {
          clearInterval(finalCountdownInterval);
        }
      }, 1000);
    }

    // When countdown reaches 0, start the game
    if (currentCountdown === 0) {
      clearInterval(countdownInterval);

      // Start the game after a short delay (for "GO!")
      setTimeout(() => {
        // Clear countdown state
        countdownActive = false;
        isPreMatchCountdown = false;

        // Start the game
        startGame();
      }, 1000);
    }
  }, 1000);
}

function startGame() {
  gameInProgress = true;
  countdownActive = false;
  isPreMatchCountdown = false;
  celebrationActive = false;
  matchStartTime = Date.now();
  matchTimeRemaining = MATCH_DURATION;

  // Generate a new level with a new seed
  levelGenerator.setSeed(Date.now());
  currentLevelData = levelGenerator.generateLevel(8000, 8000); // Use the same size as client

  // Reset all player points and set invincibility
  for (const player of players.values()) {
    // Reset points and set invincibility
    player.points = 0;
    player.invincible = true;
    player.invincibleUntil = Date.now() + 5000; // 5 seconds of invincibility

    // Broadcast the invincibility update to all players
    io.emit('player-invincibility', {
      id: player.id,
      invincible: player.invincible
    });
  }

  // Notify all players that the game has started and send level data
  io.emit('game-start', {
    matchDuration: MATCH_DURATION,
    levelData: currentLevelData
  });

  // Start checking for win conditions periodically
  gameTimer = setInterval(updateGameState, 1000); // Check every second
}

function updateGameState() {
  if (!gameInProgress) return;

  // Update match time remaining
  const elapsedTime = Date.now() - matchStartTime;
  matchTimeRemaining = Math.max(0, MATCH_DURATION - elapsedTime);

  // Broadcast time remaining to all players
  io.emit('time-update', {
    timeRemaining: matchTimeRemaining
  });

  // Find player with highest points
  let highestPoints = -1;
  let secondHighestPoints = -1;
  let leader = null;

  for (const player of players.values()) {
    if (player.points > highestPoints) {
      secondHighestPoints = highestPoints;
      highestPoints = player.points;
      leader = player;
    } else if (player.points > secondHighestPoints) {
      secondHighestPoints = player.points;
    }
  }

  // Check if win condition is met (points)
  if (leader &&
      leader.points >= POINTS_TO_WIN &&
      (leader.points - secondHighestPoints) >= MIN_POINT_DIFFERENCE) {
    // We have a winner!
    endGame([leader]);
    return;
  }

  // Check if time has expired
  if (matchTimeRemaining <= 0) {
    // Time's up! Find winners based on highest points
    const winners = [];
    let highestPoints = -1;

    for (const player of players.values()) {
      if (player.points > highestPoints) {
        highestPoints = player.points;
        winners.length = 0; // Clear previous winners
        winners.push(player);
      } else if (player.points === highestPoints && highestPoints > 0) {
        winners.push(player); // Tie
      }
    }

    endGame(winners.length > 0 ? winners : null);
  }
}

function endGame(winners) {
  // Clear the game timer
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }

  gameInProgress = false;
  celebrationActive = true;

  // If no winners provided, find them based on highest points
  if (!winners) {
    let highestPoints = -1;
    winners = [];

    for (const player of players.values()) {
      if (player.points > highestPoints) {
        highestPoints = player.points;
        winners = [player];
      } else if (player.points === highestPoints) {
        winners.push(player);
      }
    }
  }

  // Notify all players that the game has ended and who won
  io.emit('game-end', {
    winners: winners.map(player => ({
      id: player.id,
      name: player.name,
      color: player.color,
      points: player.points
    }))
  });

  // Set a timer to start the next game after the celebration period
  setTimeout(() => {
    celebrationActive = false;

    // If there are still players, start a new game
    if (players.size > 0) {
      startGameCountdown();
    }
  }, CELEBRATION_DURATION);
}

function resetGameState() {
  gameInProgress = false;
  countdownActive = false;
  celebrationActive = false;
  isPreMatchCountdown = false;

  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
}

// Start the server
const PORT = process.env.PORT || 3001; // Changed to port 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Start the first game automatically after a short delay
  setTimeout(() => {
    if (players.size > 0) {
      console.log('Starting first game automatically...');
      startGameCountdown();
    } else {
      console.log('No players connected yet, waiting for players to join before starting game...');
    }
  }, 3000); // Wait 3 seconds to allow players to connect
});