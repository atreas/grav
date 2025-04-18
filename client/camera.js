class Camera {
    constructor(canvas, levelWidth, levelHeight) {
        this.canvas = canvas;
        this.levelWidth = levelWidth;
        this.levelHeight = levelHeight;
        this.x = 0;
        this.y = 0;

        // Zoom properties
        this.zoomLevel = 0.6; // Default zoom level (0.6 = 60%, three levels zoomed out from original)
        this.minZoom = 0.2;  // Maximum zoom out (20% - shows the whole map)
        this.maxZoom = 2.0;  // Maximum zoom in (200%)
        this.zoomStep = 0.1; // How much to change zoom per key press
    }

    update(target) {
        // If at minimum zoom (showing whole map), center the camera and return
        if (this.zoomLevel <= this.minZoom) {
            this.x = this.levelWidth / 2 - (this.canvas.width / 2 / this.zoomLevel);
            this.y = this.levelHeight / 2 - (this.canvas.height / 2 / this.zoomLevel);
            return;
        }

        // Calculate the visible area in world coordinates
        const visibleWidth = this.canvas.width / this.zoomLevel;
        const visibleHeight = this.canvas.height / this.zoomLevel;

        // Calculate target position (center of screen)
        const targetX = target.x - visibleWidth / 2;
        const targetY = target.y - visibleHeight / 2;

        // Calculate bounds for camera movement
        const minX = -visibleWidth * 0.1; // Allow slight overflow
        const minY = -visibleHeight * 0.1;
        const maxX = this.levelWidth - visibleWidth * 0.9;
        const maxY = this.levelHeight - visibleHeight * 0.9;

        // Smoothly move towards target position
        const smoothFactor = 0.1;
        this.x += (targetX - this.x) * smoothFactor;
        this.y += (targetY - this.y) * smoothFactor;

        // Clamp camera position to level bounds
        this.x = Math.max(minX, Math.min(this.x, maxX));
        this.y = Math.max(minY, Math.min(this.y, maxY));

        // Debug info
        console.log(`Camera: ${Math.round(this.x)},${Math.round(this.y)} Level: ${this.levelWidth},${this.levelHeight}`);
    }

    // Convert world coordinates to screen coordinates with zoom
    worldToScreen(x, y) {
        // Calculate the center of the screen
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Apply zoom transformation
        const zoomedX = (x - this.x) * this.zoomLevel;
        const zoomedY = (y - this.y) * this.zoomLevel;

        // Center the zoomed view
        return {
            x: centerX + (zoomedX - centerX),
            y: centerY + (zoomedY - centerY)
        };
    }

    // Zoom in (increase zoom level)
    zoomIn() {
        this.zoomLevel = Math.min(this.maxZoom, this.zoomLevel + this.zoomStep);
        console.log(`Zoomed in to ${this.zoomLevel.toFixed(1)}x`);
    }

    // Zoom out (decrease zoom level)
    zoomOut() {
        this.zoomLevel = Math.max(this.minZoom, this.zoomLevel - this.zoomStep);
        console.log(`Zoomed out to ${this.zoomLevel.toFixed(1)}x`);
    }

    // Get current zoom level
    getZoomLevel() {
        return this.zoomLevel;
    }

    // Center the camera on a specific position
    centerOn(x, y) {
        // Calculate the position to center the camera on the given coordinates
        this.x = x - (this.canvas.width / 2 / this.zoomLevel);
        this.y = y - (this.canvas.height / 2 / this.zoomLevel);

        // Calculate the maximum allowed camera positions
        const maxX = this.levelWidth - (this.canvas.width / this.zoomLevel);
        const maxY = this.levelHeight - (this.canvas.height / this.zoomLevel);

        // Only apply clamping if not fully zoomed out
        if (this.zoomLevel > this.minZoom * 1.5) {
            const margin = 200;
            
            // Clamp X position
            if (this.x < -margin) {
                this.x = -margin;
            } else if (this.x > maxX + margin) {
                this.x = maxX + margin;
            }
            
            // Clamp Y position
            if (this.y < -margin) {
                this.y = -margin;
            } else if (this.y > maxY + margin) {
                this.y = maxY + margin;
            }
        }
    }

    // Add a debug method to visualize boundaries
    drawDebug(ctx) {
        ctx.save();
        ctx.scale(this.zoomLevel, this.zoomLevel);
        
        // Draw level boundaries
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2 / this.zoomLevel;
        ctx.strokeRect(-this.x, -this.y, this.levelWidth, this.levelHeight);
        
        // Draw visible area
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.strokeRect(0, 0, this.canvas.width / this.zoomLevel, this.canvas.height / this.zoomLevel);
        
        ctx.restore();
    }
}
