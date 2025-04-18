class UI {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.debugElement = document.getElementById('debug-info');

        // Notification system
        this.notifications = [];
        this.notificationDuration = 2000; // 2 seconds
    }

    drawGameInfo(gameInfo) {
        if (!gameInfo.active) return;

        this.ctx.save();

        // Draw game information panel
        const panelWidth = 200;
        const panelHeight = 180;
        const panelX = this.canvas.width - panelWidth - 20;
        const panelY = 80; // Moved down to make room for timer

        // Panel background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // Game information text
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';

        // Points
        this.ctx.fillText(`Points: ${gameInfo.points}`, panelX + 15, panelY + 15);

        // Active checkpoint
        const checkpointText = gameInfo.activeCheckpoint !== -1 ?
            `Checkpoint ${gameInfo.activeCheckpoint + 1} active` : 'No active checkpoint';
        this.ctx.fillText(checkpointText, panelX + 15, panelY + 40);

        // Win condition
        this.ctx.fillText('Goal: 11 points', panelX + 15, panelY + 65);

        // Game rules reminder
        this.ctx.fillText('Checkpoint: +1 pt', panelX + 15, panelY + 90);
        this.ctx.fillText('Destroy ship: +5 pts', panelX + 15, panelY + 115);
        this.ctx.fillText('First to 11 pts wins', panelX + 15, panelY + 140);
        this.ctx.fillText('(with 2+ pt lead)', panelX + 15, panelY + 165);

        this.ctx.restore();
    }

    /**
     * Draw the match timer in the top right corner
     * @param {number} timeRemaining - Time remaining in milliseconds
     */
    drawMatchTimer(timeRemaining) {
        this.ctx.save();

        // Convert milliseconds to minutes and seconds
        const totalSeconds = Math.ceil(timeRemaining / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        // Format time as M:SS
        const timeString = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Draw timer background
        const timerWidth = 200;
        const timerHeight = 35;
        const timerX = this.canvas.width - timerWidth - 20;
        const timerY = 40; // Moved down 20px

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(timerX, timerY, timerWidth, timerHeight);
        this.ctx.strokeStyle = '#e74c3c'; // Red border
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(timerX, timerY, timerWidth, timerHeight);

        // Draw timer text
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(timeString, timerX + timerWidth / 2, timerY + timerHeight / 2);

        this.ctx.restore();
    }

    /**
     * Draw the pre-match countdown timer in the top right corner
     * @param {number} countdown - Countdown value in seconds
     */
    drawPreMatchTimer(countdown) {
        this.ctx.save();

        // Format countdown
        const timeString = `Battle in: ${countdown}s`;

        // Draw timer background
        const timerWidth = 200;
        const timerHeight = 35;
        const timerX = this.canvas.width - timerWidth - 20;
        const timerY = 40; // Moved down 20px

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(timerX, timerY, timerWidth, timerHeight);
        this.ctx.strokeStyle = '#f39c12'; // Orange border
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(timerX, timerY, timerWidth, timerHeight);

        // Draw timer text
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(timeString, timerX + timerWidth / 2, timerY + timerHeight / 2);

        this.ctx.restore();
    }

    /**
     * Draw the pre-match countdown in the top right corner
     * @param {number} countdown - Countdown value in seconds
     */
    drawPreMatchCountdown(countdown) {
        // Only show the countdown in the center when it's 5 seconds or less
        if (countdown <= 5) return;

        // Otherwise, the timer is shown by drawPreMatchTimer
    }

    drawMinimap(level, ship, camera, gameWidth, gameHeight, checkpoints) {
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
        this.drawMinimapCheckpoints(checkpoints);

        // Draw the ship on the minimap
        if (ship) {
            // Draw wrecking ball first (if it exists)
            if (ship.wreckingBall) {
                this.drawMinimapWreckingBall(ship.wreckingBall);
            }

            // Then draw the ship
            this.drawMinimapShip(ship);
        }

        // Draw remote players on minimap
        if (window.game && window.game.networkManager) {
            for (const remotePlayer of window.game.networkManager.remotePlayers.values()) {
                this.drawMinimapRemotePlayer(remotePlayer);
            }
        }

        // Draw the current view area on the minimap
        this.drawMinimapViewArea(camera, scale);

        this.ctx.restore();
    }

    drawMinimapTrack(level) {
        // Draw all level segments on the minimap
        const segments = level.getSegments();

        // Thicker line width for better visibility
        this.ctx.lineWidth = 15 / Math.min(level.getWidth(), level.getHeight()) * 1000; // Increased thickness

        // Draw all segments
        for (const segment of segments) {
            // Determine if this is a boundary segment
            const isBoundary =
                (segment.x1 === 0 && segment.x2 === 0) || // Left boundary
                (segment.x1 === level.getWidth() && segment.x2 === level.getWidth()) || // Right boundary
                (segment.y1 === 0 && segment.y2 === 0) || // Top boundary
                (segment.y1 === level.getHeight() && segment.y2 === level.getHeight()); // Bottom boundary

            // Use different colors for boundaries vs obstacles with higher brightness
            this.ctx.strokeStyle = isBoundary ? '#ff3333' : '#00ff00'; // Brighter colors for better visibility

            this.ctx.beginPath();
            this.ctx.moveTo(segment.x1, segment.y1);
            this.ctx.lineTo(segment.x2, segment.y2);
            this.ctx.stroke();
        }
    }

    drawMinimapCheckpoints(checkpoints) {
        // Draw checkpoints on the minimap
        for (let i = 0; i < checkpoints.length; i++) {
            const checkpoint = checkpoints[i];

            // Draw checkpoint circle with outline
            this.ctx.beginPath();
            this.ctx.arc(checkpoint.x, checkpoint.y, checkpoint.radius, 0, Math.PI * 2);

            // Style based on checkpoint status
            if (checkpoint.active) {
                // Active checkpoint - more visible
                this.ctx.fillStyle = 'rgba(241, 196, 15, 0.7)'; // Yellow, more opaque
                this.ctx.strokeStyle = '#f1c40f'; // Yellow outline
                this.ctx.lineWidth = 5 / Math.min(checkpoint.x, checkpoint.y) * 100;
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

    drawMinimapRemotePlayer(remotePlayer) {
        this.ctx.save();

        // Translate to remote player position
        this.ctx.translate(remotePlayer.x, remotePlayer.y);
        this.ctx.rotate(remotePlayer.rotation);

        // Draw a triangle for the remote player
        const shipSize = 60; // Same size as local ship on minimap
        this.ctx.beginPath();
        this.ctx.moveTo(0, -shipSize);
        this.ctx.lineTo(-shipSize / 2, shipSize / 2);
        this.ctx.lineTo(shipSize / 2, shipSize / 2);
        this.ctx.closePath();

        // Use the remote player's color
        this.ctx.fillStyle = remotePlayer.color;
        this.ctx.fill();

        // Add outline for better visibility
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Draw wrecking ball if it exists
        if (remotePlayer.wreckingBall) {
            // Draw a circle for the wrecking ball
            this.ctx.beginPath();
            this.ctx.arc(remotePlayer.wreckingBall.x - remotePlayer.x,
                         remotePlayer.wreckingBall.y - remotePlayer.y,
                         remotePlayer.wreckingBall.size * 1.4, 0, Math.PI * 2);
            this.ctx.fillStyle = '#aaa';
            this.ctx.fill();
        }

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

    updateDebugInfo(message, gameState, ship, gameInfo) {
        if (!this.debugElement) return;

        // Calculate ship velocity
        const shipVelocity = ship ? Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy) : 0;

        // Get current camera zoom level
        const cameraZoom = gameState.camera ? gameState.camera.getZoomLevel() : 1.0;

        // Calculate particle count
        const particleCount = ship ? ship.trail.length : 0;

        // Game information
        let gameInfoHtml = '';
        if (gameInfo && gameInfo.active) {
            const minutes = Math.floor(gameInfo.timeRemaining / 60000);
            const seconds = Math.floor((gameInfo.timeRemaining % 60000) / 1000);
            gameInfoHtml = `
                <div>Game Active: ${minutes}m ${seconds.toString().padStart(2, '0')}s remaining</div>
                <div>Your Points: ${gameInfo.points}</div>
                <div>Active Checkpoint: ${gameInfo.activeCheckpoint !== -1 ? gameInfo.activeCheckpoint + 1 : 'None'}</div>
                <div>Win Condition: First to 11 points with 2+ point lead or highest points when time expires</div>
            `;
        } else if (gameState.preMatchCountdownActive) {
            gameInfoHtml = `<div>Game: Starting in ${gameState.preMatchCountdownValue} seconds</div>`;
        } else if (!gameState.gameStarted) {
            gameInfoHtml = '<div>Game: Not Started</div>';
        } else {
            gameInfoHtml = '<div>Game: Waiting to start</div>';
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
            ${gameInfoHtml}
        `;

        // Add notification for important messages
        if (message.includes('Checkpoint') || message.includes('lap')) {
            this.addNotification(message);
        }
    }

    /**
     * Add a notification to be displayed on screen
     * @param {string} message - The notification message
     * @param {number} [duration=2000] - Duration in milliseconds to show the notification
     */
    addNotification(message, duration = 2000) {
        console.log(`Adding notification: ${message}`);

        // Create notification object
        const notification = {
            message: message,
            createdAt: performance.now(),
            opacity: 1.0,
            duration: duration
        };

        // Add to notifications array
        this.notifications.push(notification);

        // Limit the number of notifications
        if (this.notifications.length > 5) {
            this.notifications.shift(); // Remove oldest notification
        }
    }

    /**
     * Draw notifications on screen
     */
    drawNotifications() {
        if (this.notifications.length === 0) return;

        const now = performance.now();

        this.ctx.save();

        // Position notifications in the center top of the screen
        const startY = 100;
        const spacing = 40;

        // Process each notification
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const notification = this.notifications[i];
            const age = now - notification.createdAt;

            // Get the duration for this notification (or use default)
            const duration = notification.duration || this.notificationDuration;

            // Remove old notifications
            if (age > duration) {
                this.notifications.splice(i, 1);
                continue;
            }

            // Calculate opacity (fade out towards the end)
            if (age > duration * 0.7) {
                notification.opacity = 1.0 - ((age - (duration * 0.7)) / (duration * 0.3));
            }

            // Draw notification
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Draw text shadow for better visibility
            this.ctx.fillStyle = `rgba(0, 0, 0, ${notification.opacity * 0.7})`;
            this.ctx.fillText(notification.message, this.canvas.width / 2 + 2, startY + (i * spacing) + 2);

            // Draw text
            if (notification.message.includes('Checkpoint')) {
                this.ctx.fillStyle = `rgba(241, 196, 15, ${notification.opacity})`; // Yellow for checkpoints
            } else if (notification.message.includes('points')) {
                this.ctx.fillStyle = `rgba(46, 204, 113, ${notification.opacity})`; // Green for points
            } else if (notification.message.includes('wins')) {
                this.ctx.fillStyle = `rgba(155, 89, 182, ${notification.opacity})`; // Purple for winner announcements
            } else {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${notification.opacity})`; // White for other messages
            }

            this.ctx.fillText(notification.message, this.canvas.width / 2, startY + (i * spacing));
        }

        this.ctx.restore();
    }

    /**
     * Draw help panel with game rules
     * Only shown during the 30-second free play between matches
     */
    drawHelpPanel() {
        this.ctx.save();

        // Panel dimensions and position
        const panelWidth = 300;
        const panelHeight = 280;
        const panelX = 20;
        const panelY = 20;

        // Panel background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // Panel title
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText('GAME RULES', panelX + panelWidth / 2, panelY + 15);

        // Panel content
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('• Use arrow keys or space to thrust', panelX + 15, panelY + 50);
        this.ctx.fillText('• Collect checkpoints: +1 point', panelX + 15, panelY + 80);
        this.ctx.fillText('• Destroy other ships: +5 points', panelX + 15, panelY + 110);
        this.ctx.fillText('• Crash your ship: -2 points', panelX + 15, panelY + 140);
        this.ctx.fillText('• First to 11 points with 2+ point lead wins', panelX + 15, panelY + 170);
        this.ctx.fillText('• Match ends after 5 minutes', panelX + 15, panelY + 200);
        this.ctx.fillText('• Press R to respawn after destruction', panelX + 15, panelY + 230);
        this.ctx.fillText('• Press ~ to toggle debug panel', panelX + 15, panelY + 260);

        this.ctx.restore();
    }

    /**
     * Draw player positions panel
     * @param {Object} networkManager - The network manager with remote players
     * @param {Object} localShip - The local player's ship
     * @param {Object} gameInfo - Game information
     */
    drawPlayerPositions(networkManager, localShip, gameInfo) {
        if (!networkManager) return;

        const playerPositionsElement = document.getElementById('player-positions');
        if (!playerPositionsElement) return;

        // Get all players (local + remote)
        const players = [];

        // Add local player
        players.push({
            id: 'local',
            name: 'You',
            color: localShip.color, // Use the actual ship color
            points: gameInfo.points
        });

        // Add remote players
        for (const [id, player] of networkManager.remotePlayers) {
            players.push({
                id: id,
                name: player.name,
                color: player.color,
                points: player.points || 0
            });
        }

        // Sort players by points (descending)
        players.sort((a, b) => {
            return b.points - a.points;
        });

        // Create HTML for the positions table
        let html = '<div style="margin-bottom:5px;font-weight:bold;text-align:center;">Player Rankings</div>';
        html += '<table style="width:100%">';
        html += '<tr><th style="text-align:left">Pos</th><th style="text-align:left">Ship</th><th style="text-align:right">Points</th></tr>';

        // Add each player to the table
        players.forEach((player, index) => {
            const position = index + 1;
            let positionText = '';

            // Format position as 1st, 2nd, 3rd, etc.
            if (position === 1) positionText = '1st';
            else if (position === 2) positionText = '2nd';
            else if (position === 3) positionText = '3rd';
            else positionText = `${position}th`;

            // Create a colored ship indicator
            const shipColor = player.color;
            const isLocalPlayer = player.id === 'local';

            html += `<tr>
                <td>${positionText}</td>
                <td>
                    <div style="display:inline-block; width:0; height:0;
                        border-left:8px solid transparent;
                        border-right:8px solid transparent;
                        border-bottom:16px solid ${shipColor};
                        margin-right:5px;"></div>
                    ${isLocalPlayer ? '<strong>You</strong>' : player.name}
                </td>
                <td style="text-align:right">${player.points}</td>
            </tr>`;
        });

        html += '</table>';

        // Update the player positions element
        playerPositionsElement.innerHTML = html;
    }
}
