// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the game
    const game = new Game();
    game.init();
});

class Game {
    constructor() {
        // Game dimensions
        this.gameWidth = 4000; // Large level width
        this.gameHeight = 3000; // Large level height

        // Game state
        this.gameStarted = false; // Flag to track if game has started
        this.gameOver = false;
        this.collisionDisabled = true; // Disable collisions at start
        this.collisionTimer = 0; // Timer to enable collisions after a delay

        // Performance tracking
        this.lastTime = 0; // For frame rate calculation
        this.frameCount = 0;
        this.fps = 0;

        // Game objects and systems will be initialized in init()
        this.canvas = null;
        this.ship = null;
        this.level = null;
        this.inputHandler = null;
        this.camera = null;
        this.raceSystem = null;
        this.renderer = null;
        this.ui = null;
        this.audioManager = null;

        // Network-related properties
        this.networkManager = null;
        this.countdownActive = false;
        this.countdownValue = 5;
        this.preMatchCountdownActive = false;
        this.preMatchCountdownValue = 30;
    }

    init() {
        // Make the game instance globally accessible
        window.game = this;

        // Set up canvas
        this.canvas = document.getElementById('gameCanvas');
        this.canvas.width = window.innerWidth - 40;
        this.canvas.height = window.innerHeight - 100;

        // Test drawing to make sure canvas is working
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = 'red';
        ctx.fillRect(100, 100, 200, 200);
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText('Canvas is working!', 120, 200);

        // Create level
        this.level = new Level(this.gameWidth, this.gameHeight);

        // Create ship at the center of the figure-eight
        this.ship = new Ship(this.gameWidth / 2, this.gameHeight / 2);

        // Set level reference for the ship (needed for wrecking ball collision)
        this.ship.level = this.level;

        // Initialize input handler
        this.inputHandler = new InputHandler();

        // Initialize camera
        this.camera = new Camera(this.canvas, this.gameWidth, this.gameHeight);

        // Initialize race system
        this.raceSystem = new RaceSystem(this.gameWidth, this.gameHeight, this);
        this.raceSystem.setLevel(this.level); // Set level for checkpoint collision detection

        // Initialize renderer
        this.renderer = new Renderer(this.canvas);

        // Initialize UI
        this.ui = new UI(this.canvas);

        // Initialize audio manager
        this.audioManager = new AudioManager();

        // Set up event listener for window resize
        window.addEventListener('resize', this.handleResize.bind(this));

        // Initialize multiplayer
        this.initMultiplayer();

        // Set initial debug info
        this.ui.updateDebugInfo('Game initialized. Press any arrow key to start. Press SPACE to start multiplayer game.',
                              this, this.ship, { active: false, points: 0, timeRemaining: 0 });

        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    // Process key inputs from the input handler
    processInput() {
        // Start game with any arrow key
        if (!this.gameStarted && (
            this.inputHandler.isKeyPressed('ArrowUp') ||
            this.inputHandler.isKeyPressed('ArrowDown') ||
            this.inputHandler.isKeyPressed('ArrowLeft') ||
            this.inputHandler.isKeyPressed('ArrowRight'))) {
            this.gameStarted = true;
            this.ui.updateDebugInfo('Game started with arrow key', this, this.ship, this.raceSystem.getGameInfo());

            // Hide the controls info panel when game starts
            const controlsInfo = document.querySelector('.controls-info');
            if (controlsInfo) {
                controlsInfo.classList.add('hidden');
            }

            // Play game start sound and start background music
            this.audioManager.play('race_start');
            this.audioManager.startBackgroundMusic();
        }

        // Restart game with any key when game over, or R key anytime
        if (this.gameOver) {
            // Check if any key is pressed
            const anyKeyPressed = Object.keys(this.inputHandler.keys).some(key => this.inputHandler.keys[key]);
            if (anyKeyPressed) {
                this.ui.updateDebugInfo('Restart triggered by key press (game over state)', this, this.ship, this.raceSystem.getGameInfo());
                this.restart();

                // Reset all keys to prevent immediate restart
                Object.keys(this.inputHandler.keys).forEach(key => {
                    this.inputHandler.keys[key] = false;
                });
            }
        } else {
            // Force restart with R key (both lowercase and uppercase) when not game over
            if (this.inputHandler.isKeyPressed('r') || this.inputHandler.isKeyPressed('R')) {
                this.ui.updateDebugInfo('Force restart triggered by R key', this, this.ship, this.raceSystem.getGameInfo());
                this.restart();
            }
        }

        // Handle zoom controls with + and - keys
        if (this.inputHandler.isKeyPressed('+') || this.inputHandler.isKeyPressed('=')) {
            this.camera.zoomIn();
            this.ui.updateDebugInfo(`Zoomed in to ${this.camera.getZoomLevel().toFixed(1)}x`, this, this.ship, this.raceSystem.getGameInfo());
            // Clear the key state to prevent continuous zooming
            this.inputHandler.keys['+'] = false;
            this.inputHandler.keys['='] = false;
        }

        if (this.inputHandler.isKeyPressed('-') || this.inputHandler.isKeyPressed('_')) {
            this.camera.zoomOut();
            this.ui.updateDebugInfo(`Zoomed out to ${this.camera.getZoomLevel().toFixed(1)}x`, this, this.ship, this.raceSystem.getGameInfo());
            // Clear the key state to prevent continuous zooming
            this.inputHandler.keys['-'] = false;
            this.inputHandler.keys['_'] = false;
        }

        // TEST: Play checkpoint sound with 'C' key (for testing)
        if (this.inputHandler.isKeyPressed('c') || this.inputHandler.isKeyPressed('C')) {
            console.log('TEST: Playing checkpoint sound via C key');
            if (this.audioManager) {
                this.audioManager.play('checkpoint', true);
                this.ui.addNotification('TEST: Checkpoint sound played');
            }
            // Clear the key state
            this.inputHandler.keys['c'] = false;
            this.inputHandler.keys['C'] = false;
        }

        // Update ship controls based on key presses
        if (this.ship && this.gameStarted && !this.gameOver) {
            // Update thrust state (allow both ArrowUp and Space for thrust)
            this.ship.thrusting = this.inputHandler.isKeyPressed('ArrowUp') || this.inputHandler.isKeyPressed(' ');

            // Play or stop thrust sound based on state change
            if (this.audioManager) {
                this.audioManager.playThrustSound(this.ship.thrusting);
            }

            this.ship.rotatingLeft = this.inputHandler.isKeyPressed('ArrowLeft');
            this.ship.rotatingRight = this.inputHandler.isKeyPressed('ArrowRight');
        }

        // Add game start request on 'Space' key
        if (this.networkManager && this.inputHandler.isKeyPressed(' ') && !this.countdownActive && !this.raceSystem.gameActive) {
            console.log('Requesting game start...');
            this.networkManager.requestGameStart();
            this.inputHandler.keys[' '] = false; // Reset key state
        }

        // Debug: Press 'D' to toggle debug panel
        if (this.inputHandler.isKeyPressed('d') || this.inputHandler.isKeyPressed('D')) {
            const debugPanel = document.getElementById('debug-info');
            if (debugPanel) {
                debugPanel.classList.toggle('hidden');
            }
            this.inputHandler.keys['d'] = false;
            this.inputHandler.keys['D'] = false;
        }

        // Restart game with 'R' key
        if ((this.inputHandler.isKeyPressed('r') || this.inputHandler.isKeyPressed('R')) && this.gameStarted) {
            console.log('R key pressed! Restarting game...');
            this.restart();
            // Reset key state to prevent multiple restarts
            this.inputHandler.keys['r'] = false;
            this.inputHandler.keys['R'] = false;

            // Add notification
            this.ui.addNotification('Game restarted with R key', 2000);
        }
    }

    handleResize() {
        this.canvas.width = window.innerWidth - 40;
        this.canvas.height = window.innerHeight - 100;

        // Update camera when window is resized
        if (this.camera) {
            this.camera.canvas = this.canvas;
        }
    }

    // This method is no longer needed as checkpoints are handled by the RaceSystem

    update(deltaTime) {
        // Process input first
        this.processInput();

        // Don't update if game hasn't started
        if (!this.gameStarted) return;

        // Don't update physics if game is over
        if (this.gameOver) return;

        // Update collision timer
        if (this.collisionDisabled) {
            this.collisionTimer += deltaTime;
            if (this.collisionTimer > 2000) { // Enable collisions after 2 seconds
                this.collisionDisabled = false;
                this.ui.updateDebugInfo('Collisions enabled', this, this.ship, this.raceSystem.getGameInfo());

                // Play sound when collisions are enabled
                if (this.audioManager) {
                    this.audioManager.play('button_click');
                }
            }
        }

        // Update ship physics
        this.ship.update();

        // Update game system and check for checkpoint collisions
        const gameMessage = this.raceSystem.update(this.ship);
        if (gameMessage) {
            this.ui.updateDebugInfo(gameMessage, this, this.ship, this.raceSystem.getGameInfo());

            // Play appropriate sound based on the message
            if (this.audioManager) {
                console.log('Game message received:', gameMessage);

                if (gameMessage.includes('Checkpoint')) {
                    console.log('Playing checkpoint sound');
                    this.audioManager.play('checkpoint', true); // Force restart to ensure it plays
                } else if (gameMessage.includes('Game over')) {
                    console.log('Playing game over sound');
                    this.audioManager.play('lap_complete', true); // Reuse lap complete sound for game over
                } else if (gameMessage.includes('Game started')) {
                    console.log('Playing game start sound');
                    this.audioManager.play('race_start', true);
                }
            }
        }

        // Check for collisions with level (only if enabled)
        if (!this.collisionDisabled) {
            let fatalCollision = false;

            // Check for collisions with level boundaries
            const levelCollision = this.ship.checkCollision(this.level);
            if (levelCollision.collision) {
                if (!levelCollision.isSoft) {
                    // Hard collision is fatal
                    fatalCollision = true;
                    this.ui.updateDebugInfo('Game over - hard wall collision detected', this, this.ship, this.raceSystem.getGameInfo());

                    // Notify server about collision (deduct points)
                    if (this.networkManager) {
                        this.networkManager.sendCollision();
                    }
                } else {
                    // Soft collision - ship can land safely
                    this.ui.updateDebugInfo('Soft landing detected', this, this.ship, this.raceSystem.getGameInfo());

                    // Check if this is a true landing (very low vertical velocity)
                    const isRealLanding = Math.abs(this.ship.vy) < 0.5 && Math.abs(this.ship.vx) < 0.5;

                    // Add visual notification for soft landing
                    if (isRealLanding) {
                        this.ui.addNotification('Landed safely!', 1500);
                    } else {
                        this.ui.addNotification('Safe collision!', 1500);
                    }

                    // Play a gentle landing sound if available
                    if (this.audioManager) {
                        this.audioManager.play('button_click');
                    }
                }
            }

            // Check for collision with your own wrecking ball (fatal)
            if (!fatalCollision && !this.ship.invincible) {
                if (this.ship.wreckingBall.checkShipCollision(this.ship)) {
                    fatalCollision = true;
                    this.ui.updateDebugInfo('Game over - hit by your own wrecking ball', this, this.ship, this.raceSystem.getGameInfo());

                    // Notify server about collision (deduct points)
                    if (this.networkManager) {
                        this.networkManager.sendCollision();
                    }

                    // Play collision sound
                    if (this.audioManager) {
                        this.audioManager.play('collision');
                    }

                    // Add notification
                    this.ui.addNotification('You were destroyed by your own wrecking ball!');
                }
            }

            // Check for collisions with remote players
            if (this.networkManager && !fatalCollision) {
                for (const remotePlayer of this.networkManager.remotePlayers.values()) {
                    // Check for ship-to-ship collision
                    const shipCollision = this.ship.checkShipCollision(remotePlayer);
                    if (shipCollision.collision) {
                        if (!shipCollision.isSoft) {
                            // Hard collision is fatal
                            fatalCollision = true;
                            this.ui.updateDebugInfo('Game over - hard ship collision detected', this, this.ship, this.raceSystem.getGameInfo());

                            // Notify server about collision (deduct points)
                            if (this.networkManager) {
                                this.networkManager.sendCollision();
                            }

                            // Play collision sound
                            if (this.audioManager) {
                                this.audioManager.play('collision');
                            }

                            break;
                        } else {
                            // Soft collision - ships bump but don't explode
                            this.ui.updateDebugInfo('Soft ship collision detected', this, this.ship, this.raceSystem.getGameInfo());

                            // Add visual notification for soft collision
                            this.ui.addNotification('Ships bumped safely', 1500);

                            // Play a gentle bump sound if available
                            if (this.audioManager) {
                                this.audioManager.play('button_click');
                            }
                        }
                    }

                    // Check for your wrecking ball hitting other ships (fatal for other ship)
                    if (!remotePlayer.invincible && this.ship.wreckingBall.checkShipCollision(remotePlayer)) {
                        // Send a message to destroy the other ship
                        if (this.networkManager) {
                            this.networkManager.sendDestroyShip(remotePlayer.id);
                        }

                        // Play collision sound
                        if (this.audioManager) {
                            this.audioManager.play('collision');
                        }

                        // Add notification
                        this.ui.addNotification('Your wrecking ball destroyed another ship!');
                    }

                    // Check for other ship's wrecking ball hitting your ship (fatal for you)
                    // Only check ball-to-ship collision, not chain-to-ship
                    if (!this.ship.invincible && remotePlayer.wreckingBall && remotePlayer.wreckingBall.checkShipCollision) {
                        if (remotePlayer.wreckingBall.checkShipCollision(this.ship)) {
                            fatalCollision = true;
                            this.ui.updateDebugInfo('Game over - hit by other player\'s wrecking ball', this, this.ship, this.raceSystem.getGameInfo());
                            break;
                        }
                    }

                    // Check for ball-to-ball collisions (they stick together)
                    if (remotePlayer.wreckingBall) {
                        this.ship.wreckingBall.checkBallCollision(remotePlayer.wreckingBall);
                    }
                }
            }

            // Handle fatal collision
            if (fatalCollision) {
                this.gameOver = true;

                // Play collision sound
                if (this.audioManager) {
                    this.audioManager.play('collision');
                    this.audioManager.stop('thrust'); // Stop thrust sound if it was playing
                }
            }
        }

        // Update camera position to follow the ship
        this.camera.update(this.ship);

        // Send position updates if connected to network
        if (this.networkManager && this.gameStarted && !this.gameOver) {
            this.networkManager.sendPosition();
        }

        // Update remote players if any
        if (this.networkManager) {
            for (const remotePlayer of this.networkManager.remotePlayers.values()) {
                remotePlayer.update(deltaTime);
            }
        }
    }

    // These methods are now handled by the Camera and RaceSystem classes

    render() {
        // Clear canvas
        this.renderer.clear();

        // Draw level
        this.renderer.drawLevel(this.level, this.camera);

        // Draw checkpoints
        const checkpoints = this.raceSystem.getCheckpoints();
        this.renderer.drawCheckpoints(checkpoints, this.raceSystem.activeCheckpoint, this.raceSystem.gameActive, this.camera);

        // Draw ship (only if game has started)
        if (this.gameStarted) {
            this.renderer.drawShip(this.ship, this.camera);
        }

        // Draw game information
        const gameInfo = this.raceSystem.getGameInfo();
        if (gameInfo.active) {
            //this.ui.drawGameInfo(gameInfo);
        }

        // Draw minimap
        this.ui.drawMinimap(this.level, this.ship, this.camera, this.gameWidth, this.gameHeight,
                          checkpoints);

        // Draw start message if game hasn't started
        if (!this.gameStarted) {
            this.renderer.drawStartScreen();
        }

        // Draw game over message if game is over
        if (this.gameOver) {
            this.renderer.drawGameOverScreen();
        }

        // Draw FPS counter
        this.renderer.drawFPS(this.fps);

        // Draw collision status
        if (this.gameStarted && !this.gameOver) {
            this.renderer.drawCollisionStatus(this.collisionDisabled);
        }

        // Draw remote players with zoom
        if (this.networkManager) {
            this.renderer.ctx.save();
            // Apply zoom transformation
            this.renderer.ctx.scale(this.camera.getZoomLevel(), this.camera.getZoomLevel());

            for (const remotePlayer of this.networkManager.remotePlayers.values()) {
                remotePlayer.draw(this.renderer.ctx, this.camera.x, this.camera.y);
            }

            this.renderer.ctx.restore();
        }

        // Draw pre-match countdown if active (top right corner)
        if (this.preMatchCountdownActive) {
            this.ui.drawPreMatchCountdown(this.preMatchCountdownValue);
        }

        // Draw final countdown if active (center of screen)
        if (this.countdownActive) {
            this.drawCountdown();
        }

        // Draw notifications
        this.ui.drawNotifications();

        // Draw match timer in top right if game is active (draw timer BEFORE player positions)
        if (this.raceSystem && this.raceSystem.gameActive) {
            this.ui.drawMatchTimer(this.raceSystem.getTimeRemaining());
        } else if (this.preMatchCountdownActive) {
            // Draw pre-match timer if countdown is active
            this.ui.drawPreMatchTimer(this.preMatchCountdownValue);

            // Help panel is now only shown on the start screen
        }

        // Draw player positions panel AFTER timer to prevent overlap
        if (this.networkManager) {
            const gameInfo = this.raceSystem.getGameInfo();
            this.ui.drawPlayerPositions(this.networkManager, this.ship, gameInfo);
        }
    }

    drawCountdown() {
        const ctx = this.renderer.ctx;
        const canvas = this.canvas;

        ctx.save();

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw countdown number or "GO!"
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add glow effect
        ctx.shadowColor = '#f39c12';
        ctx.shadowBlur = 20;

        if (this.countdownValue === 0) {
            ctx.fillStyle = '#2ecc71'; // Green
            ctx.fillText('GO!', canvas.width / 2, canvas.height / 2);
        } else {
            ctx.fillStyle = '#f39c12'; // Orange
            ctx.fillText(this.countdownValue.toString(), canvas.width / 2, canvas.height / 2);
        }

        ctx.restore();
    }

    // These methods are now handled by the Renderer and UI classes

    gameLoop(timestamp) {
        // Calculate delta time and FPS
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Update FPS counter every 10 frames
        this.frameCount++;
        if (this.frameCount >= 10) {
            this.fps = 1000 / (deltaTime || 1); // Avoid division by zero
            this.frameCount = 0;
        }

        // Update game state
        this.update(deltaTime);

        // Render game
        this.render();

        // Update debug info periodically
        if (Math.random() < 0.02) { // Update roughly every 50 frames
            try {
                const gameInfo = this.raceSystem.getGameInfo();
                this.ui.updateDebugInfo('Game running', this, this.ship, gameInfo);
            } catch (error) {
                console.error('Error updating debug info:', error);
                this.ui.updateDebugInfo('Error in game loop: ' + error.message, this, this.ship, { active: false, points: 0, timeRemaining: 0 });
            }
        }

        // Request next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    restart() {
        console.log('Game restarting...'); // Debug log

        // DO NOT create a new level - keep the existing one
        // The level should only change when a new match begins

        // Generate random position for ship respawn
        const margin = 500; // Keep away from edges
        const randomX = margin + Math.random() * (this.gameWidth - 2 * margin);
        const randomY = margin + Math.random() * (this.gameHeight - 2 * margin);

        console.log(`Respawning at random position: ${randomX}, ${randomY}`);

        // Save the current ship color if it exists
        const shipColor = this.ship ? this.ship.color : '#3498db';

        // Reset ship at random position
        this.ship = new Ship(randomX, randomY);

        // Restore ship color
        this.ship.color = shipColor;

        // Make sure the ship is not in landed state when respawning
        this.ship.landed = false;

        // Make ship invincible for 5 seconds after respawn
        this.ship.invincible = true;

        // Set a timeout to remove invincibility
        setTimeout(() => {
            if (this.ship) {
                this.ship.invincible = false;
                // No notification for invincibility ending - the shield visual is enough
            }
        }, 5000);

        // Set level reference for the ship (needed for wrecking ball collision)
        this.ship.level = this.level;

        // Center camera on the ship
        if (this.camera && this.camera.centerOn) {
            this.camera.centerOn(this.ship.x, this.ship.y);
        } else {
            // Fallback if centerOn method is not available
            this.camera.x = this.ship.x - (this.canvas.width / 2 / this.camera.zoomLevel);
            this.camera.y = this.ship.y - (this.canvas.height / 2 / this.camera.zoomLevel);
        }

        // Save the current active checkpoint
        const activeCheckpoint = this.raceSystem.activeCheckpoint;
        const gameActive = this.raceSystem.gameActive;
        const points = this.raceSystem.points;

        // Reset race system but preserve active checkpoint
        this.raceSystem.reset();

        // Update level reference but don't reinitialize checkpoints
        this.raceSystem.setLevel(this.level, false);

        // Update ship's level reference to ensure collision detection works
        this.ship.level = this.level;
        if (this.ship.wreckingBall) {
            this.ship.wreckingBall.level = this.level;
        }

        // Restore game state
        this.raceSystem.gameActive = gameActive;
        this.raceSystem.points = points;

        // If there was an active checkpoint, reactivate it
        if (activeCheckpoint !== -1) {
            this.raceSystem.activeCheckpoint = activeCheckpoint;
            if (this.raceSystem.checkpoints[activeCheckpoint]) {
                this.raceSystem.checkpoints[activeCheckpoint].active = true;
                this.raceSystem.checkpoints[activeCheckpoint].color = '#f1c40f'; // Yellow for active

                // Add notification about active checkpoint (with delay to avoid overlap)
                const checkpointNumber = this.raceSystem.checkpoints[activeCheckpoint].number;
                setTimeout(() => {
                    this.ui.addNotification(`Checkpoint ${checkpointNumber} is still active!`, 3000);
                }, 1500);
            } else {
                // If the checkpoint doesn't exist (new level has different number of checkpoints)
                // activate a random one
                this.raceSystem.activateRandomCheckpoint();

                // Add notification about new active checkpoint (with delay to avoid overlap)
                const newActiveIndex = this.raceSystem.activeCheckpoint;
                if (newActiveIndex !== -1) {
                    const newCheckpointNumber = this.raceSystem.checkpoints[newActiveIndex].number;
                    setTimeout(() => {
                        this.ui.addNotification(`New active checkpoint: ${newCheckpointNumber}`, 3000);
                    }, 2000);
                }
            }
        } else if (gameActive) {
            // If game is active but no checkpoint was active, activate a random one
            this.raceSystem.activateRandomCheckpoint();

            // Add notification about new active checkpoint (with delay to avoid overlap)
            const newActiveIndex = this.raceSystem.activeCheckpoint;
            if (newActiveIndex !== -1) {
                const newCheckpointNumber = this.raceSystem.checkpoints[newActiveIndex].number;
                setTimeout(() => {
                    this.ui.addNotification(`New active checkpoint: ${newCheckpointNumber}`, 3000);
                }, 2000);
            }
        }

        // Reset game state
        this.gameOver = false;
        this.gameStarted = true; // Ensure game is started after restart

        // Reset any other game state variables
        if (this.audioManager) {
            // Stop any sounds that might be playing
            this.audioManager.stop('thrust');
        }

        // Disable collisions temporarily after restart
        this.collisionDisabled = true;
        this.collisionTimer = 0;

        // Re-enable collisions after 2 seconds
        setTimeout(() => {
            this.collisionDisabled = false;
            this.ui.addNotification('Collision detection enabled', 2000);
        }, 2000);

        this.ui.updateDebugInfo('Game restarted. You are invincible for 5 seconds.',
                              this, this.ship, this.raceSystem.getGameInfo());

        // Add notification about respawn and invincibility
        setTimeout(() => {
            this.ui.addNotification('Respawned at random location! You are invincible for 5 seconds.', 3000);
        }, 0);

        // Add notification about preserved points (with delay to avoid overlap)
        if (points > 0) {
            setTimeout(() => {
                this.ui.addNotification(`Your points (${points}) have been preserved.`, 3000);
            }, 3500);
        }
    }

    initMultiplayer() {
        this.networkManager = new NetworkManager(this);
        this.networkManager.connect();
    }

    startPreMatchCountdown(value) {
        this.preMatchCountdownActive = true;
        this.preMatchCountdownValue = value || 30;

        // Allow controls during countdown
        this.controlsEnabled = true;

        // Reset ship movement
        if (this.ship) {
            this.ship.thrusting = false;
            this.ship.rotatingLeft = false;
            this.ship.rotatingRight = false;
        }

        // Play countdown start sound
        if (this.audioManager) {
            this.audioManager.play('countdown');
        }
    }

    updatePreMatchCountdown(value) {
        this.preMatchCountdownValue = value;

        // Play countdown sound for each 10-second mark
        if (this.audioManager) {
            if (value === 30 || value === 20 || value === 10) {
                this.audioManager.play('countdown');
            }
        }
    }

    startCountdown(value) {
        // Clear any existing countdown timeout to prevent issues
        if (this.countdownTimeout) {
            clearTimeout(this.countdownTimeout);
        }

        this.countdownActive = true;
        this.countdownValue = value || 5;
        this.preMatchCountdownActive = false; // Ensure pre-match countdown is disabled
        console.log('Starting countdown with value:', this.countdownValue);

        // Allow controls during countdown
        this.controlsEnabled = true;

        // Reset ship movement
        if (this.ship) {
            this.ship.thrusting = false;
            this.ship.rotatingLeft = false;
            this.ship.rotatingRight = false;
        }

        // Play countdown start sound
        if (this.audioManager) {
            this.audioManager.play('countdown');
        }

        // Safety timeout to clear countdown if it gets stuck
        this.countdownTimeout = setTimeout(() => {
            if (this.countdownActive) {
                console.log('Safety timeout: clearing stuck countdown');
                this.countdownActive = false;
            }
        }, 10000); // 10 seconds max for any countdown
    }

    updateCountdown(value) {
        this.countdownValue = value;
        console.log('Countdown updated to:', value);

        // Play countdown sound for each number
        if (this.audioManager) {
            if (value > 0) {
                this.audioManager.play('countdown');
            } else if (value === 0) {
                // Play GO! sound
                this.audioManager.play('countdown_go');

                // Clear countdown immediately to prevent it from getting stuck
                setTimeout(() => {
                    this.countdownActive = false;
                    console.log('Countdown cleared after GO!');
                }, 1000);
            }
        }
    }

    startGame(matchDuration, levelData = null) {
        console.log('Game.startGame() called');
        // Enable controls
        this.controlsEnabled = true;

        // Make sure game is started
        this.gameStarted = true;

        // Ensure countdown is cleared
        this.countdownActive = false;
        this.preMatchCountdownActive = false;

        // If server provided level data, create a new level with it
        if (levelData) {
            console.log('Creating new level from server data');
            this.level = new Level(this.gameWidth, this.gameHeight, levelData);

            // Force checkpoint reinitialization when a new match starts
            this.raceSystem.setLevel(this.level, true);

            // Update ship's level reference to ensure collision detection works with new level
            if (this.ship) {
                this.ship.level = this.level;
                if (this.ship.wreckingBall) {
                    this.ship.wreckingBall.level = this.level;
                }
            }
        }

        // Start the game with the specified match duration
        this.raceSystem.startGame(matchDuration);

        // Play game start sound
        if (this.audioManager) {
            this.audioManager.play('race_start');
        }

        // Reset game over state if it was set
        this.gameOver = false;

        // Add notification
        this.ui.addNotification('Game started! Collect points!', 3000);
    }

    endGame(winners) {
        // Show celebration UI with winners
        this.showCelebration(winners);

        // Play celebration sound
        if (this.audioManager) {
            this.audioManager.play('lap_complete');
        }
    }

    showCelebration(winners) {
        // Display winner celebration UI
        if (winners && winners.length > 0) {
            // Create a message about the winner(s)
            let message = '';
            if (winners.length === 1) {
                const winner = winners[0];
                message = `${winner.name} wins with ${winner.points} points!`;
            } else {
                message = 'It\'s a tie! Winners: ' + winners.map(w => `${w.name} (${w.points} pts)`).join(', ');
            }

            // Show the message as a notification
            this.ui.addNotification(message, 5000); // Show for 5 seconds
        }
    }
}






