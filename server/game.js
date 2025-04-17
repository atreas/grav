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

        // Network-related properties
        this.networkManager = null;
        this.countdownActive = false;
        this.countdownValue = 5;
    }

    init() {
        // Set up canvas
        this.canvas = document.getElementById('gameCanvas');
        this.canvas.width = window.innerWidth - 40;
        this.canvas.height = window.innerHeight - 100;

        // Create level
        this.level = new Level(this.gameWidth, this.gameHeight);

        // Create ship at the center of the figure-eight
        this.ship = new Ship(this.gameWidth / 2, this.gameHeight / 2);

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

        // Set up event listener for window resize
        window.addEventListener('resize', this.handleResize.bind(this));

        // Initialize multiplayer
        this.initMultiplayer();

        // Set initial debug info
        this.ui.updateDebugInfo('Game initialized. Press any arrow key to start.',
                              this, this.ship, this.raceSystem.getRaceInfo());

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
            this.ui.updateDebugInfo('Game started with arrow key', this, this.ship, this.raceSystem.getRaceInfo());
        }

        // Restart game with R key (both lowercase and uppercase)
        if (this.inputHandler.isKeyPressed('r') || this.inputHandler.isKeyPressed('R')) {
            if (this.gameOver) {
                this.ui.updateDebugInfo('Restart triggered by R key (game over state)', this, this.ship, this.raceSystem.getRaceInfo());
                this.restart();
            } else {
                // Force restart with uppercase R
                if (this.inputHandler.isKeyPressed('R')) {
                    this.ui.updateDebugInfo('Force restart triggered by uppercase R key', this, this.ship, this.raceSystem.getRaceInfo());
                    this.restart();
                }
            }
        }

        // Handle zoom controls with + and - keys
        if (this.inputHandler.isKeyPressed('+') || this.inputHandler.isKeyPressed('=')) {
            this.camera.zoomIn();
            this.ui.updateDebugInfo(`Zoomed in to ${this.camera.getZoomLevel().toFixed(1)}x`, this, this.ship, this.raceSystem.getRaceInfo());
            // Clear the key state to prevent continuous zooming
            this.inputHandler.keys['+'] = false;
            this.inputHandler.keys['='] = false;
        }

        if (this.inputHandler.isKeyPressed('-') || this.inputHandler.isKeyPressed('_')) {
            this.camera.zoomOut();
            this.ui.updateDebugInfo(`Zoomed out to ${this.camera.getZoomLevel().toFixed(1)}x`, this, this.ship, this.raceSystem.getRaceInfo());
            // Clear the key state to prevent continuous zooming
            this.inputHandler.keys['-'] = false;
            this.inputHandler.keys['_'] = false;
        }

        // Update ship controls based on key presses
        if (this.ship && !this.countdownActive && this.gameStarted && !this.gameOver) {
            this.ship.thrusting = this.inputHandler.isKeyPressed('ArrowUp');
            this.ship.rotatingLeft = this.inputHandler.isKeyPressed('ArrowLeft');
            this.ship.rotatingRight = this.inputHandler.isKeyPressed('ArrowRight');
        }

        // Add race start request on 'Space' key
        if (this.networkManager && this.inputHandler.isKeyPressed(' ') && !this.countdownActive && !this.raceSystem.raceActive) {
            this.networkManager.requestRaceStart();
            this.inputHandler.keys[' '] = false; // Reset key state
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
                this.ui.updateDebugInfo('Collisions enabled', this, this.ship, this.raceSystem.getRaceInfo());
            }
        }

        // Update ship physics
        this.ship.update();

        // Update race system and check for checkpoint collisions
        const raceMessage = this.raceSystem.update(this.ship);
        if (raceMessage) {
            this.ui.updateDebugInfo(raceMessage, this, this.ship, this.raceSystem.getRaceInfo());
        }

        // Check for collisions with level (only if enabled)
        if (!this.collisionDisabled && this.ship.checkCollision(this.level)) {
            this.gameOver = true;
            this.ui.updateDebugInfo('Game over - collision detected', this, this.ship, this.raceSystem.getRaceInfo());
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
        this.renderer.drawCheckpoints(checkpoints, this.raceSystem.currentCheckpoint, this.raceSystem.raceActive, this.camera);

        // Draw ship (only if game has started)
        if (this.gameStarted) {
            this.renderer.drawShip(this.ship, this.camera);
        }

        // Draw race information
        const raceInfo = this.raceSystem.getRaceInfo();
        if (raceInfo.active || raceInfo.laps > 0) {
            this.ui.drawRaceInfo(raceInfo);
        }

        // Draw minimap
        this.ui.drawMinimap(this.level, this.ship, this.camera, this.gameWidth, this.gameHeight,
                          checkpoints, this.raceSystem.currentCheckpoint);

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

        // Draw remote players
        if (this.networkManager) {
            for (const remotePlayer of this.networkManager.remotePlayers.values()) {
                remotePlayer.draw(this.renderer.ctx, this.camera.x, this.camera.y);
            }
        }

        // Draw countdown if active
        if (this.countdownActive) {
            this.drawCountdown();
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
            this.ui.updateDebugInfo('Game running', this, this.ship, this.raceSystem.getRaceInfo());
        }

        // Request next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    restart() {
        console.log('Game restarting...'); // Debug log

        // Create a new level with different random obstacles
        this.level = new Level(this.gameWidth, this.gameHeight);

        // Reset ship
        this.ship = new Ship(this.gameWidth / 2, this.gameHeight / 2);

        // Reset camera
        this.camera.x = 0;
        this.camera.y = 0;

        // Reset race system with the new level
        this.raceSystem.reset();
        this.raceSystem.setLevel(this.level);

        // Reset game state
        this.gameOver = false;
        this.gameStarted = true; // Ensure game is started after restart

        // Disable collisions temporarily after restart
        this.collisionDisabled = true;
        this.collisionTimer = 0;

        this.ui.updateDebugInfo('Game restarted. Safe mode enabled for 2 seconds.',
                              this, this.ship, this.raceSystem.getRaceInfo());
    }

    initMultiplayer() {
        this.networkManager = new NetworkManager(this);
        this.networkManager.connect();
    }

    startCountdown(value) {
        this.countdownActive = true;
        this.countdownValue = value || 5;

        // Disable controls during countdown
        this.controlsEnabled = false;

        // Reset ship movement
        if (this.ship) {
            this.ship.thrusting = false;
            this.ship.rotatingLeft = false;
            this.ship.rotatingRight = false;
        }
    }

    updateCountdown(value) {
        this.countdownValue = value;
        if (value === 0) {
            // "GO!" will be displayed briefly
            setTimeout(() => {
                this.countdownActive = false;
            }, 1000);
        }
    }

    startRace() {
        // Enable controls
        this.controlsEnabled = true;

        // Start the race
        this.raceSystem.startRace();
    }
}






