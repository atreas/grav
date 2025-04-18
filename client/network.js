// network.js
class NetworkManager {
    constructor(game) {
      this.game = game;
      this.socket = null;
      this.playerId = null;
      this.remotePlayers = new Map(); // playerId -> remotePlayer
      this.connected = false;
      this.lastUpdateTime = 0;
      this.updateInterval = 50; // Send position updates every 50ms
    }

    connect() {
      // Connect to the server
      this.socket = io(SERVER_URL);

      // Set up event handlers
      this.setupEventHandlers();
    }

    setupEventHandlers() {
      // Connection established
      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.connected = true;
      });

      // Disconnection
      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        this.connected = false;
      });

      // Initial game state
      this.socket.on('init', (data) => {
        console.log('Received initial game state', data);

        // Save player ID
        this.playerId = data.id;

        // Set player color
        this.game.ship.color = data.color;

        // Create remote players
        for (const playerData of data.players) {
          // Skip our own player
          if (playerData.id === this.playerId) continue;

          this.addRemotePlayer(playerData);
        }

        // If server provided level data, create a new level with it
        if (data.levelData) {
          console.log('Creating level from server data');
          this.game.level = new Level(this.game.gameWidth, this.game.gameHeight, data.levelData);

          // Don't force checkpoint reinitialization when joining mid-game
          // This ensures we use the server's checkpoint positions
          this.game.raceSystem.setLevel(this.game.level, false);

          // Update ship's level reference to ensure collision detection works with new level
          if (this.game.ship) {
            this.game.ship.level = this.game.level;
            if (this.game.ship.wreckingBall) {
              this.game.ship.wreckingBall.level = this.game.level;
            }
          }
        }

        // If game is already in progress, update game state
        if (data.gameInProgress) {
          this.game.raceSystem.gameActive = true;
        }

        // If celebration is active, show celebration UI
        if (data.celebrationActive) {
          this.game.showCelebration();
        }

        // If countdown is active, sync with it
        if (data.countdownActive) {
          // This will be handled by the countdown-sync event
        }
      });

      // New player joined
      this.socket.on('player-joined', (playerData) => {
        console.log('Player joined', playerData);
        this.addRemotePlayer(playerData);
      });

      // Player left
      this.socket.on('player-left', (data) => {
        console.log('Player left', data);
        this.removeRemotePlayer(data.id);
      });

      // Player moved
      this.socket.on('player-moved', (data) => {
        this.updateRemotePlayer(data);
      });

      // Player points update
      this.socket.on('player-points', (data) => {
        // Check if this is about the local player
        if (data.id === this.socket.id) {
          // Update local player's points
          if (this.game.raceSystem) {
            this.game.raceSystem.setPoints(data.points);
          }
        } else {
          // Update remote player's points
          const remotePlayer = this.remotePlayers.get(data.id);
          if (remotePlayer) {
            remotePlayer.points = data.points;
          }
        }
      });

      // Points earned notification
      this.socket.on('points-earned', (data) => {
        // Show notification about points earned/lost
        let message = '';
        if (data.amount > 0) {
          message = `+${data.amount} points! (${data.reason === 'destroyed-ship' ? 'Ship destroyed' : 'Checkpoint reached'})`;
        } else {
          message = `${data.amount} points! (Collision)`;
        }

        // Update local points to match server's total
        if (this.game.raceSystem) {
          this.game.raceSystem.setPoints(data.total);
        }

        this.game.ui.addNotification(message);

        // Play appropriate sound
        if (this.game.audioManager) {
          if (data.amount > 0) {
            this.game.audioManager.play('checkpoint');
          } else {
            this.game.audioManager.play('collision');
          }
        }
      });

      // Countdown start
      this.socket.on('countdown-start', (data) => {
        console.log('Game countdown started', data);
        if (data.isPreMatch) {
          // This is the pre-match countdown (30 seconds)
          this.game.startPreMatchCountdown(data.countdown);
        } else {
          // This is the regular 5-second countdown
          this.game.startCountdown(data.countdown);
        }
      });

      // Countdown update
      this.socket.on('countdown-update', (data) => {
        console.log('Countdown update', data);
        if (data.isPreMatch) {
          // This is the pre-match countdown update
          this.game.updatePreMatchCountdown(data.countdown);
        } else {
          // This is the regular countdown update
          this.game.updateCountdown(data.countdown);
        }
      });

      // Final countdown start (last 5 seconds)
      this.socket.on('final-countdown-start', (data) => {
        console.log('Final countdown started', data);
        this.game.startCountdown(data.countdown);
      });

      // Game start
      this.socket.on('game-start', (data) => {
        console.log('Game started!', data);

        // Ensure any active countdown is cleared
        this.game.countdownActive = false;
        this.game.preMatchCountdownActive = false;

        // Start the game with match duration and level data if provided
        this.game.startGame(data.matchDuration, data.levelData);

        // Add a notification
        this.game.ui.addNotification('Game started! Find the active checkpoint!', 5000);
      });

      // Time update
      this.socket.on('time-update', (data) => {
        // Update the game's time remaining
        if (this.game.raceSystem) {
          this.game.raceSystem.updateTimeRemaining(data.timeRemaining);
        }
      });

      // Player invincibility update
      this.socket.on('player-invincibility', (data) => {
        if (data.id === this.socket.id) {
          // This is our ship, update invincibility
          if (this.game.ship) {
            this.game.ship.invincible = data.invincible;

            // Add notification
            this.game.ui.addNotification('New game started! You are invincible for 5 seconds.', 3000);
          }
        } else {
          // This is another player, update their invincibility
          const remotePlayer = this.remotePlayers.get(data.id);
          if (remotePlayer) {
            remotePlayer.invincible = data.invincible;
          }
        }
      });

      // Game end
      this.socket.on('game-end', (data) => {
        console.log('Game ended. Winners:', data.winners);
        this.game.endGame(data.winners);
      });

      // Game stopped by admin
      this.socket.on('game-stopped', (data) => {
        console.log('Game stopped by admin:', data.message);

        // Call the game's stopGame method to properly handle the event
        this.game.stopGame();
      });

      // Sync with ongoing countdown
      this.socket.on('countdown-sync', (data) => {
        const elapsedTime = (Date.now() - data.startTime) / 1000;
        const remainingSeconds = Math.max(0, Math.ceil(data.countdown - elapsedTime));

        if (remainingSeconds > 0) {
          this.game.startCountdown(remainingSeconds);
        }
      });

      // Handle invincibility ended event
      this.socket.on('invincibility-ended', () => {
        console.log('Invincibility has ended');
        if (this.game.ship) {
          this.game.ship.invincible = false;
          this.game.ui.addNotification('Invincibility ended!', 2000);
        }
      });

      // Handle ship destroyed event (when your ship is destroyed by another player's wrecking ball)
      this.socket.on('ship-destroyed', (data) => {
        console.log('Your ship was destroyed by player ID: ' + data.destroyerId);

        // End the game
        this.game.gameOver = true;

        // Update debug info
        this.game.ui.updateDebugInfo('Game over - destroyed by another player\'s wrecking ball',
                                   this.game, this.game.ship, this.game.raceSystem.getGameInfo());

        // Play collision sound
        if (this.game.audioManager) {
          this.game.audioManager.play('collision');
          this.game.audioManager.stop('thrust'); // Stop thrust sound if it was playing
        }
      });
    }

    addRemotePlayer(playerData) {
      // Create a new remote player
      const remotePlayer = new RemotePlayer(
        playerData.id,
        playerData.x,
        playerData.y,
        playerData.color,
        playerData.name
      );

      // Initialize wrecking ball collision detection
      remotePlayer.initWreckingBallCollision();

      // Add to remote players map
      this.remotePlayers.set(playerData.id, remotePlayer);
    }

    removeRemotePlayer(playerId) {
      // Remove from remote players map
      this.remotePlayers.delete(playerId);
    }

    updateRemotePlayer(data) {
      const remotePlayer = this.remotePlayers.get(data.id);
      if (remotePlayer) {
        remotePlayer.updateFromServer(data);
        // Update invincibility status if provided
        if (data.invincible !== undefined) {
          remotePlayer.invincible = data.invincible;
        }
      }
    }

    sendPosition() {
      // Only send if connected and enough time has passed since last update
      const now = performance.now();
      if (!this.connected || now - this.lastUpdateTime < this.updateInterval) return;

      this.lastUpdateTime = now;

      // Send position update to server
      this.socket.emit('position-update', {
        x: this.game.ship.x,
        y: this.game.ship.y,
        rotation: this.game.ship.rotation,
        vx: this.game.ship.vx,
        vy: this.game.ship.vy
      });
    }

    sendPointUpdate(points) {
      if (!this.connected) return;

      // Send points update to server
      this.socket.emit('point-update', {
        points: points
      });
    }

    requestGameStart() {
      if (!this.connected) return;

      // Request to start the game
      this.socket.emit('request-game-start');
    }

    sendDestroyShip(playerId) {
      if (!this.connected) return;

      // Send a message to destroy another player's ship
      this.socket.emit('destroy-ship', {
        targetId: playerId
      });
    }

    sendCollision() {
      if (!this.connected) return;

      console.log('NetworkManager: Sending collision event to server');

      // Send a message that the player collided with a wall or object
      this.socket.emit('collision');
    }
  }