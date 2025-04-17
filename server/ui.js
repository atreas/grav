class UI {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.debugElement = document.getElementById('debug-info');
    }

    drawRaceInfo(raceInfo) {
        if (!raceInfo.active && raceInfo.laps === 0) return;

        this.ctx.save();

        // Draw race information panel
        const panelWidth = 200;
        const panelHeight = 120;
        const panelX = this.canvas.width - panelWidth - 20;
        const panelY = 20;

        // Panel background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // Race information text
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        // Current lap
        this.ctx.fillText(`Lap: ${raceInfo.laps}`, panelX + 15, panelY + 15);

        // Current checkpoint
        this.ctx.fillText(`Checkpoint: ${raceInfo.currentCheckpoint}/${raceInfo.checkpointCount}`,
                         panelX + 15, panelY + 40);

        // Current lap time
        this.ctx.fillText(`Current: ${(raceInfo.currentLapTime / 1000).toFixed(2)}s`,
                         panelX + 15, panelY + 65);

        // Best lap time
        if (raceInfo.bestLapTime < Infinity) {
            this.ctx.fillText(`Best: ${(raceInfo.bestLapTime / 1000).toFixed(2)}s`,
                             panelX + 15, panelY + 90);
        } else {
            this.ctx.fillText('Best: --.-s', panelX + 15, panelY + 90);
        }

        this.ctx.restore();
    }

    drawMinimap(level, ship, camera, gameWidth, gameHeight, checkpoints, currentCheckpoint) {
        this.ctx.save();

        // Minimap dimensions and position
        const mapSize = 200; // Larger minimap for better visibility
        const mapX = this.canvas.width - mapSize - 20; // Position from right
        const mapY = this.canvas.height - mapSize - 20; // Position from bottom
        const mapPadding = 10; // Padding inside the minimap

        // Calculate scale factor for the minimap
        const scaleX = (mapSize - mapPadding * 2) / gameWidth;
        const scaleY = (mapSize - mapPadding * 2) / gameHeight;
        const scale = Math.min(scaleX, scaleY);

        // Draw minimap background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // Darker background for better contrast
        this.ctx.fillRect(mapX, mapY, mapSize, mapSize);
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 3; // Thicker border
        this.ctx.strokeRect(mapX, mapY, mapSize, mapSize);

        // Add minimap title
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('MINIMAP', mapX + mapSize/2, mapY - 5);

        // Set up the minimap coordinate system
        this.ctx.translate(mapX + mapPadding, mapY + mapPadding);
        this.ctx.scale(scale, scale);

        // Draw the track on the minimap
        this.drawMinimapTrack(level);

        // Draw checkpoints on minimap
        this.drawMinimapCheckpoints(checkpoints, currentCheckpoint);

        // Draw the ship on the minimap
        if (ship) {
            // Draw wrecking ball first (if it exists)
            if (ship.wreckingBall) {
                this.drawMinimapWreckingBall(ship.wreckingBall);
            }

            // Then draw the ship
            this.drawMinimapShip(ship);
        }

        // Draw the current view area on the minimap
        this.drawMinimapViewArea(camera, scale);

        this.ctx.restore();
    }

    drawMinimapTrack(level) {
        // Draw all level segments on the minimap
        const segments = level.getSegments();

        // Thicker line width for better visibility
        this.ctx.lineWidth = 8 / Math.min(level.getWidth(), level.getHeight()) * 1000;

        // Draw all segments
        for (const segment of segments) {
            // Determine if this is a boundary segment
            const isBoundary =
                (segment.x1 === 0 && segment.x2 === 0) || // Left boundary
                (segment.x1 === level.getWidth() && segment.x2 === level.getWidth()) || // Right boundary
                (segment.y1 === 0 && segment.y2 === 0) || // Top boundary
                (segment.y1 === level.getHeight() && segment.y2 === level.getHeight()); // Bottom boundary

            // Use different colors for boundaries vs obstacles
            this.ctx.strokeStyle = isBoundary ? '#ff5555' : '#2ecc71';

            this.ctx.beginPath();
            this.ctx.moveTo(segment.x1, segment.y1);
            this.ctx.lineTo(segment.x2, segment.y2);
            this.ctx.stroke();
        }
    }

    drawMinimapCheckpoints(checkpoints, currentCheckpoint) {
        // Draw checkpoints on the minimap
        for (let i = 0; i < checkpoints.length; i++) {
            const checkpoint = checkpoints[i];

            // Draw checkpoint circle with outline
            this.ctx.beginPath();
            this.ctx.arc(checkpoint.x, checkpoint.y, checkpoint.radius, 0, Math.PI * 2);

            // Style based on checkpoint status
            if (i === currentCheckpoint) {
                // Current checkpoint - more visible
                this.ctx.fillStyle = 'rgba(241, 196, 15, 0.7)'; // Yellow, more opaque
                this.ctx.strokeStyle = '#f1c40f'; // Yellow outline
                this.ctx.lineWidth = 5 / Math.min(checkpoint.x, checkpoint.y) * 100;
            } else if (checkpoint.reached) {
                this.ctx.fillStyle = 'rgba(46, 204, 113, 0.7)'; // Green, more opaque
                this.ctx.strokeStyle = '#2ecc71'; // Green outline
                this.ctx.lineWidth = 3 / Math.min(checkpoint.x, checkpoint.y) * 100;
            } else {
                this.ctx.fillStyle = 'rgba(52, 152, 219, 0.5)'; // Blue, semi-transparent
                this.ctx.strokeStyle = '#3498db'; // Blue outline
                this.ctx.lineWidth = 3 / Math.min(checkpoint.x, checkpoint.y) * 100;
            }

            this.ctx.fill();
            this.ctx.stroke();

            // Add checkpoint number for better identification
            this.ctx.font = '80px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(checkpoint.number.toString(), checkpoint.x, checkpoint.y);
        }
    }

    drawMinimapWreckingBall(wreckingBall) {
        this.ctx.save();

        // Draw the wrecking ball
        this.ctx.beginPath();
        this.ctx.arc(wreckingBall.x, wreckingBall.y, wreckingBall.size * 1.4, 0, Math.PI * 2);

        // Wrecking ball color with pulsing effect
        const pulseIntensity = Math.sin(performance.now() / 300) * 0.2 + 0.8;
        this.ctx.fillStyle = `rgba(150, 150, 150, ${pulseIntensity})`; // Gray with pulsing opacity
        this.ctx.fill();

        // Draw the chain connecting ship to ball
        this.ctx.beginPath();
        this.ctx.moveTo(wreckingBall.ship.x, wreckingBall.ship.y);
        this.ctx.lineTo(wreckingBall.x, wreckingBall.y);
        this.ctx.strokeStyle = '#aaa';
        this.ctx.lineWidth = 5;
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawMinimapShip(ship) {
        this.ctx.save();

        // Translate to ship position
        this.ctx.translate(ship.x, ship.y);
        this.ctx.rotate(ship.rotation);

        // Draw a triangle for the ship
        const shipSize = 60; // Make the ship larger on the minimap for better visibility
        this.ctx.beginPath();
        this.ctx.moveTo(0, -shipSize);
        this.ctx.lineTo(-shipSize / 2, shipSize / 2);
        this.ctx.lineTo(shipSize / 2, shipSize / 2);
        this.ctx.closePath();

        // Ship color with pulsing effect for visibility
        const pulseIntensity = Math.sin(performance.now() / 200) * 0.2 + 0.8;
        this.ctx.fillStyle = `rgba(231, 76, 60, ${pulseIntensity})`; // Red with pulsing opacity
        this.ctx.fill();

        // Add outline for better visibility
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawMinimapViewArea(camera, scale) {
        // Draw a rectangle representing the current view area
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2 / scale;
        this.ctx.setLineDash([5 / scale, 5 / scale]);

        // Calculate the view area in game coordinates
        const viewX = camera.x;
        const viewY = camera.y;
        const viewWidth = this.canvas.width;
        const viewHeight = this.canvas.height;

        // Draw the view area rectangle
        this.ctx.strokeRect(viewX, viewY, viewWidth, viewHeight);

        // Reset line dash
        this.ctx.setLineDash([]);
    }

    updateDebugInfo(message, gameState, ship, raceInfo) {
        if (!this.debugElement) return;

        // Calculate ship velocity
        const shipVelocity = ship ? Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy) : 0;

        // Get current camera zoom level
        const cameraZoom = gameState.camera ? gameState.camera.getZoomLevel() : 1.0;

        // Calculate particle count
        const particleCount = ship ? ship.trail.length : 0;

        // Race information
        let raceInfoHtml = '';
        if (raceInfo.active) {
            raceInfoHtml = `
                <div>Race Active: Lap ${raceInfo.laps + 1}</div>
                <div>Current Lap: ${(raceInfo.currentLapTime / 1000).toFixed(2)}s</div>
                <div>Best Lap: ${raceInfo.bestLapTime < Infinity ? (raceInfo.bestLapTime / 1000).toFixed(2) + 's' : '--.-s'}</div>
                <div>Next Checkpoint: ${raceInfo.currentCheckpoint + 1}</div>
            `;
        } else if (!gameState.gameStarted) {
            raceInfoHtml = '<div>Race: Not Started</div>';
        } else {
            raceInfoHtml = '<div>Race: Pass through the yellow checkpoint to start</div>';
        }

        this.debugElement.innerHTML = `
            <div>${message}</div>
            <div>Game State: ${gameState.gameStarted ? 'Started' : 'Not Started'}, ${gameState.gameOver ? 'Game Over' : 'Playing'}</div>
            <div>Ship Position: X=${Math.round(ship?.x || 0)}, Y=${Math.round(ship?.y || 0)}</div>
            <div>Velocity: ${shipVelocity.toFixed(2)} (No Speed Limit)</div>
            <div>Controls: Left=${gameState.inputHandler.isKeyPressed('ArrowLeft') ? 'ON' : 'OFF'}, Right=${gameState.inputHandler.isKeyPressed('ArrowRight') ? 'ON' : 'OFF'}, Thrust=${gameState.inputHandler.isKeyPressed('ArrowUp') ? 'ON' : 'OFF'}</div>
            <div>Collisions: ${gameState.collisionDisabled ? 'Disabled' : 'Enabled'}</div>
            <div>Camera Zoom: ${cameraZoom.toFixed(1)}x (Use + and - keys to zoom)</div>
            <div>Particles: ${particleCount}</div>
            <div>FPS: ${gameState.fps.toFixed(1)}</div>
            ${raceInfoHtml}
        `;
    }
}
