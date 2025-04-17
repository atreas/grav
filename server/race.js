class RaceSystem {
    constructor(gameWidth, gameHeight, game) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.game = game; // Reference to the game
        this.checkpoints = [];
        this.currentCheckpoint = 0;
        this.laps = 0;
        this.raceStartTime = 0;
        this.lastLapTime = 0;
        this.bestLapTime = Infinity;
        this.checkpointTimes = [];
        this.raceActive = false;
        this.level = null; // Will be set by the game

        // Checkpoints will be initialized after level is set
    }

    setLevel(level) {
        this.level = level;
        this.initializeCheckpoints();
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
            color: '#f1c40f', // Yellow for the first checkpoint
            number: 1,
            reached: false
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
                color: '#3498db', // Blue for regular checkpoints
                number: i + 1,
                reached: false
            });
        }
    }

    update(ship) {
        // Don't check checkpoints if race isn't active
        if (!this.raceActive) {
            // Start the race when the ship passes through the first checkpoint
            const checkpoint = this.checkpoints[0];
            const distance = Math.sqrt(
                Math.pow(ship.x - checkpoint.x, 2) +
                Math.pow(ship.y - checkpoint.y, 2)
            );

            if (distance < checkpoint.radius + ship.size) {
                this.startRace();
            }
            return;
        }

        // Check if ship has reached the current checkpoint
        const checkpoint = this.checkpoints[this.currentCheckpoint];
        const distance = Math.sqrt(
            Math.pow(ship.x - checkpoint.x, 2) +
            Math.pow(ship.y - checkpoint.y, 2)
        );

        if (distance < checkpoint.radius + ship.size) {
            // Mark checkpoint as reached
            checkpoint.reached = true;

            // Record checkpoint time
            const now = performance.now();
            this.checkpointTimes.push(now);

            // Move to next checkpoint
            this.currentCheckpoint = (this.currentCheckpoint + 1) % this.checkpoints.length;

            // If we've reached the first checkpoint again, complete a lap
            if (this.currentCheckpoint === 0) {
                this.completeLap();
            }

            // If we have a network manager, send checkpoint update to server
            if (this.game && this.game.networkManager) {
                // Send checkpoint update to server
                this.game.networkManager.sendCheckpointUpdate(this.currentCheckpoint, this.laps);
            }

            return `Checkpoint ${checkpoint.number} reached!`;
        }

        return null;
    }

    startRace() {
        this.raceActive = true;
        this.raceStartTime = performance.now();
        this.laps = 0;
        this.currentCheckpoint = 1; // Move to the next checkpoint
        this.checkpointTimes = [this.raceStartTime];
        this.checkpoints[0].reached = true;
        return 'Race started! Complete the figure-eight track.';
    }

    completeLap() {
        this.laps++;
        const now = performance.now();
        const lapTime = now - (this.lastLapTime || this.raceStartTime);
        this.lastLapTime = now;

        // Check if this is a new best lap
        let message;
        if (lapTime < this.bestLapTime) {
            this.bestLapTime = lapTime;
            message = `New best lap! Time: ${(lapTime / 1000).toFixed(2)} seconds`;
        } else {
            message = `Lap ${this.laps} completed! Time: ${(lapTime / 1000).toFixed(2)} seconds`;
        }

        // Reset checkpoint reached status
        this.checkpoints.forEach(checkpoint => {
            checkpoint.reached = false;
        });
        this.checkpoints[0].reached = true; // First checkpoint is reached when completing a lap

        return message;
    }

    getCurrentLapTime() {
        if (!this.raceActive) return 0;

        const now = performance.now();
        return now - (this.lastLapTime || this.raceStartTime);
    }

    getRaceInfo() {
        return {
            active: this.raceActive,
            laps: this.laps,
            currentCheckpoint: this.currentCheckpoint,
            checkpointCount: this.checkpoints.length,
            currentLapTime: this.getCurrentLapTime(),
            bestLapTime: this.bestLapTime
        };
    }

    getCheckpoints() {
        return this.checkpoints;
    }

    reset() {
        this.raceActive = false;
        this.laps = 0;
        this.currentCheckpoint = 0;
        this.bestLapTime = Infinity;
        this.checkpoints.forEach(checkpoint => {
            checkpoint.reached = false;
        });
    }
}


