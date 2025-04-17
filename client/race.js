class RaceSystem {
    constructor(gameWidth, gameHeight, game) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.game = game; // Reference to the game
        this.checkpoints = [];
        this.activeCheckpoint = -1; // Index of the currently active checkpoint
        this.points = 0; // Player's points
        this.gameStartTime = 0; // When the game started
        this.gameActive = false; // Whether the game is active
        this.level = null; // Will be set by the game
        this.timeRemaining = 0; // Time remaining in the match (in milliseconds)
        this.matchDuration = 300000; // Default match duration: 5 minutes
        this.preMatchCountdown = 30; // Default pre-match countdown: 30 seconds

        // Checkpoints will be initialized after level is set
    }

    setLevel(level, forceReinitialize = false) {
        // Store the old level reference
        const oldLevel = this.level;

        // Update level reference
        this.level = level;

        // Only initialize checkpoints if:
        // 1. This is the first time setting a level (oldLevel is null)
        // 2. We're explicitly told to reinitialize (new match starting)
        // 3. The level dimensions have changed
        if (oldLevel === null || forceReinitialize ||
            (oldLevel && (oldLevel.getWidth() !== level.getWidth() ||
                         oldLevel.getHeight() !== level.getHeight()))) {
            console.log('Initializing new checkpoints');
            this.initializeCheckpoints();
        } else {
            console.log('Keeping existing checkpoints');
        }
    }

    // Check if a checkpoint would collide with any wall
    checkpointCollidesWithWalls(x, y, radius) {
        if (!this.level) return false;

        const segments = this.level.getSegments();
        for (const segment of segments) {
            // Calculate distance from checkpoint center to segment
            const distance = this.distanceToSegment(
                x, y,
                segment.x1, segment.y1,
                segment.x2, segment.y2
            );

            // If distance is less than radius, there's a collision
            if (distance < radius) {
                return true;
            }
        }

        return false;
    }

    // Calculate distance from point to line segment (same as in Ship class)
    distanceToSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    initializeCheckpoints() {
        // Clear any existing checkpoints
        this.checkpoints = [];

        // Create checkpoints spread around the map
        const numCheckpoints = 6;
        const margin = 300; // Keep checkpoints away from the edges
        const checkpointRadius = 80;

        // First checkpoint is always near the center (starting area)
        const centerX = this.gameWidth / 2;
        const centerY = this.gameHeight / 2;

        // Add first checkpoint near the center
        this.checkpoints.push({
            x: centerX,
            y: centerY + 200, // A bit below center
            radius: checkpointRadius,
            color: '#3498db', // Blue for inactive checkpoint
            number: 1,
            active: false
        });

        // Create remaining checkpoints in random positions around the map
        for (let i = 1; i < numCheckpoints; i++) {
            let x, y;
            let validPosition = false;
            let attempts = 0;

            // Try to find a valid position that's not too close to other checkpoints and doesn't collide with walls
            while (!validPosition && attempts < 100) { // Increased max attempts
                attempts++;

                // Generate random position within bounds
                x = margin + Math.random() * (this.gameWidth - 2 * margin);
                y = margin + Math.random() * (this.gameHeight - 2 * margin);

                // Check distance from other checkpoints
                validPosition = true;

                // Check if too close to other checkpoints
                for (const checkpoint of this.checkpoints) {
                    const dx = x - checkpoint.x;
                    const dy = y - checkpoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Ensure checkpoints are not too close to each other
                    if (distance < checkpointRadius * 4) {
                        validPosition = false;
                        break;
                    }
                }

                // Check if checkpoint collides with any walls
                if (validPosition && this.checkpointCollidesWithWalls(x, y, checkpointRadius)) {
                    validPosition = false;
                }
            }

            // If we couldn't find a valid position after max attempts, place it anyway
            // but with a smaller radius to reduce chance of wall collision
            const finalRadius = attempts >= 100 ? checkpointRadius * 0.7 : checkpointRadius;

            // Add the checkpoint
            this.checkpoints.push({
                x: x,
                y: y,
                radius: finalRadius,
                color: '#3498db', // Blue for inactive checkpoints
                number: i + 1,
                active: false
            });
        }
    }

    update(ship) {
        // Don't check checkpoints if game isn't active
        if (!this.gameActive) {
            // Game is not active, no updates needed
            return null;
        }

        // Game is ongoing, no time limit

        // If no active checkpoint, activate one
        if (this.activeCheckpoint === -1) {
            this.activateRandomCheckpoint();
        }

        // Check if ship has reached the active checkpoint
        if (this.activeCheckpoint !== -1) {
            const checkpoint = this.checkpoints[this.activeCheckpoint];
            const distance = Math.sqrt(
                Math.pow(ship.x - checkpoint.x, 2) +
                Math.pow(ship.y - checkpoint.y, 2)
            );

            // Log distance to active checkpoint (occasionally)
            if (Math.random() < 0.01) { // Log only 1% of the time to avoid console spam
                console.log(`Distance to active checkpoint ${checkpoint.number}: ${distance.toFixed(2)}, ` +
                           `Threshold: ${(checkpoint.radius + ship.size).toFixed(2)}`);
            }

            if (distance < checkpoint.radius + ship.size) {
                // Player reached the active checkpoint
                console.log(`🏁 Active checkpoint ${checkpoint.number} reached! Distance: ${distance.toFixed(2)}`);

                // Award 1 point
                this.points += 1;

                // Deactivate current checkpoint
                checkpoint.active = false;
                checkpoint.color = '#3498db'; // Blue for inactive

                // Activate a new random checkpoint
                this.activateRandomCheckpoint();

                // If we have a network manager, send point update to server
                if (this.game && this.game.networkManager) {
                    // Send point update to server
                    this.game.networkManager.sendPointUpdate(this.points);
                }

                // This is the message that triggers the checkpoint sound!
                const message = `Checkpoint reached! +1 point (${this.points} total)`;
                console.log(`Returning message: "${message}"`);
                return message;
            }
        }

        return null;
    }

    startGame(matchDuration) {
        this.gameActive = true;
        this.gameStartTime = performance.now();
        this.points = 0;
        this.activeCheckpoint = -1; // No active checkpoint yet

        // Set match duration if provided
        if (matchDuration) {
            this.matchDuration = matchDuration;
        }

        // Initialize time remaining to full match duration
        this.timeRemaining = this.matchDuration;

        // Reset all checkpoints
        this.checkpoints.forEach(checkpoint => {
            checkpoint.active = false;
            checkpoint.color = '#3498db'; // Blue for inactive
        });

        // Activate a random checkpoint
        this.activateRandomCheckpoint();

        return 'Game started! Collect points by reaching checkpoints and destroying other ships!';
    }

    activateRandomCheckpoint() {
        // Deactivate current checkpoint if there is one
        if (this.activeCheckpoint !== -1) {
            this.checkpoints[this.activeCheckpoint].active = false;
            this.checkpoints[this.activeCheckpoint].color = '#3498db'; // Blue for inactive
        }

        // Choose a random checkpoint
        this.activeCheckpoint = Math.floor(Math.random() * this.checkpoints.length);

        // Activate the chosen checkpoint
        this.checkpoints[this.activeCheckpoint].active = true;
        this.checkpoints[this.activeCheckpoint].color = '#f1c40f'; // Yellow for active

        console.log(`Activated checkpoint ${this.checkpoints[this.activeCheckpoint].number}`);
    }

    addPoints(amount) {
        this.points += amount;

        // If we have a network manager, send point update to server
        if (this.game && this.game.networkManager) {
            this.game.networkManager.sendPointUpdate(this.points);
        }

        return this.points;
    }

    // Set points directly (used for server synchronization)
    setPoints(points) {
        console.log(`RaceSystem: Setting points from ${this.points} to ${points}`);
        this.points = points;
        return this.points;
    }

    getTimeRemaining() {
        return this.timeRemaining;
    }

    updateTimeRemaining(timeRemaining) {
        this.timeRemaining = timeRemaining;
    }

    getGameInfo() {
        return {
            active: this.gameActive,
            points: this.points,
            timeRemaining: this.timeRemaining,
            activeCheckpoint: this.activeCheckpoint,
            checkpointCount: this.checkpoints.length,
            activeCheckpointNumber: this.activeCheckpoint !== -1 ? this.checkpoints[this.activeCheckpoint].number : 0
        };
    }

    getCheckpoints() {
        return this.checkpoints;
    }

    reset() {
        this.gameActive = false;
        this.points = 0;

        // Only reset the active checkpoint, but don't regenerate checkpoints
        // This ensures checkpoint positions remain consistent during a match
        if (this.activeCheckpoint !== -1) {
            this.checkpoints[this.activeCheckpoint].active = false;
            this.checkpoints[this.activeCheckpoint].color = '#3498db'; // Blue for inactive
        }
        this.activeCheckpoint = -1;
    }
}


