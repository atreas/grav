class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    clear() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawLevel(level, camera) {
        // Draw level with zoom
        this.ctx.save();

        // Apply zoom transformation
        this.ctx.scale(camera.getZoomLevel(), camera.getZoomLevel());

        // Draw level at adjusted position
        level.draw(this.ctx, camera.x, camera.y);

        this.ctx.restore();
    }

    drawShip(ship, camera) {
        // Draw ship with zoom
        this.ctx.save();

        // Apply zoom transformation
        this.ctx.scale(camera.getZoomLevel(), camera.getZoomLevel());

        // Draw ship at adjusted position
        ship.draw(this.ctx, camera.x, camera.y);

        this.ctx.restore();
    }

    drawCheckpoints(checkpoints, currentCheckpoint, raceActive, camera) {
        this.ctx.save();

        // Apply zoom transformation
        this.ctx.scale(camera.getZoomLevel(), camera.getZoomLevel());

        // Draw each checkpoint
        for (let i = 0; i < checkpoints.length; i++) {
            const checkpoint = checkpoints[i];

            // Calculate screen position with zoom
            const screenX = checkpoint.x - camera.x;
            const screenY = checkpoint.y - camera.y;

            // Skip if checkpoint is off-screen (accounting for zoom)
            const scaledRadius = checkpoint.radius / camera.getZoomLevel();
            if (screenX < -scaledRadius || screenX > this.canvas.width / camera.getZoomLevel() + scaledRadius ||
                screenY < -scaledRadius || screenY > this.canvas.height / camera.getZoomLevel() + scaledRadius) {
                continue;
            }

            // Draw checkpoint circle
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, checkpoint.radius, 0, Math.PI * 2);

            // Style based on checkpoint status
            if (i === currentCheckpoint && raceActive) {
                // Current checkpoint - pulsing effect
                const pulseSize = Math.sin(performance.now() / 200) * 0.2 + 0.8;
                this.ctx.lineWidth = 5 * pulseSize;
                this.ctx.strokeStyle = '#f1c40f'; // Yellow
                this.ctx.setLineDash([15, 10]);
            } else if (checkpoint.reached) {
                // Reached checkpoint
                this.ctx.lineWidth = 3;
                this.ctx.strokeStyle = '#2ecc71'; // Green
                this.ctx.setLineDash([]);
            } else {
                // Unreached checkpoint
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = checkpoint.color;
                this.ctx.setLineDash([10, 10]);
            }

            this.ctx.stroke();

            // Draw checkpoint number
            this.ctx.font = '24px Arial';
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(checkpoint.number.toString(), screenX, screenY);

            // Reset line dash
            this.ctx.setLineDash([]);
        }

        this.ctx.restore();
    }

    drawStartScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.font = '48px Arial';
        this.ctx.fillStyle = '#3498db';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Triangle Ship Game', this.canvas.width / 2, this.canvas.height / 2 - 50);

        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('Press any arrow key to start', this.canvas.width / 2, this.canvas.height / 2 + 20);
    }

    drawGameOverScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.font = '48px Arial';
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Game Over', this.canvas.width / 2, this.canvas.height / 2 - 50);

        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 20);
    }

    drawFPS(fps) {
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`FPS: ${fps.toFixed(1)}`, this.canvas.width - 10, 20);
    }

    drawCollisionStatus(collisionDisabled) {
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = collisionDisabled ? '#2ecc71' : '#e74c3c';
        this.ctx.fillText(
            collisionDisabled ? 'Safe Mode: ON' : 'Collisions: ON',
            10, this.canvas.height - 10
        );
    }
}
