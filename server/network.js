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
      this.socket = io();
      
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
        
        // If race is already in progress, update game state
        if (data.raceInProgress) {
          this.game.raceSystem.raceActive = true;
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
      
      // Player progress update (checkpoint/lap)
      this.socket.on('player-progress', (data) => {
        const remotePlayer = this.remotePlayers.get(data.id);
        if (remotePlayer) {
          remotePlayer.checkpoint = data.checkpoint;
          remotePlayer.lap = data.lap;
        }
      });
      
      // Countdown start
      this.socket.on('countdown-start', (data) => {
        console.log('Race countdown started', data);
        this.game.startCountdown(data.countdown);
      });
      
      // Countdown update
      this.socket.on('countdown-update', (data) => {
        console.log('Countdown update', data);
        this.game.updateCountdown(data.countdown);
      });
      
      // Race start
      this.socket.on('race-start', () => {
        console.log('Race started');
        this.game.startRace();
      });
      
      // Sync with ongoing countdown
      this.socket.on('countdown-sync', (data) => {
        const elapsedTime = (Date.now() - data.startTime) / 1000;
        const remainingSeconds = Math.max(0, Math.ceil(data.countdown - elapsedTime));
        
        if (remainingSeconds > 0) {
          this.game.startCountdown(remainingSeconds);
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
    
    sendCheckpointUpdate(checkpoint, lap) {
      if (!this.connected) return;
      
      // Send checkpoint/lap update to server
      this.socket.emit('checkpoint-update', {
        checkpoint: checkpoint,
        lap: lap
      });
    }
    
    requestRaceStart() {
      if (!this.connected) return;
      
      // Request to start the race
      this.socket.emit('request-race-start');
    }
  }