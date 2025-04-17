class Camera {
    constructor(canvas, levelWidth, levelHeight) {
        this.canvas = canvas;
        this.levelWidth = levelWidth;
        this.levelHeight = levelHeight;
        this.x = 0;
        this.y = 0;

        // Zoom properties
        this.zoomLevel = 0.9; // Default zoom level (0.9 = 90%, one level zoomed out from original)
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

        // Get the screen coordinates of the ship with current zoom
        const screenPos = this.worldToScreen(target.x, target.y);
        const shipScreenX = screenPos.x;
        const shipScreenY = screenPos.y;

        // Calculate screen boundaries with margin (percentage of screen size)
        const marginPercent = 0.2; // 20% margin from edges
        const leftBound = this.canvas.width * marginPercent;
        const rightBound = this.canvas.width * (1 - marginPercent);
        const topBound = this.canvas.height * marginPercent;
        const bottomBound = this.canvas.height * (1 - marginPercent);

        // Calculate camera offset to keep ship in view
        let offsetX = 0;
        let offsetY = 0;

        // Adjust horizontal position if ship is too close to edges
        if (shipScreenX < leftBound) {
            offsetX = (shipScreenX - leftBound) / this.zoomLevel;
        } else if (shipScreenX > rightBound) {
            offsetX = (shipScreenX - rightBound) / this.zoomLevel;
        }

        // Adjust vertical position if ship is too close to edges
        if (shipScreenY < topBound) {
            offsetY = (shipScreenY - topBound) / this.zoomLevel;
        } else if (shipScreenY > bottomBound) {
            offsetY = (shipScreenY - bottomBound) / this.zoomLevel;
        }

        // Calculate target camera position with offset
        const baseTargetX = target.x - (this.canvas.width / 2 / this.zoomLevel);
        const baseTargetY = target.y - (this.canvas.height / 2 / this.zoomLevel);
        const targetX = baseTargetX + (offsetX * 0.5); // Apply half of the offset for smoother movement
        const targetY = baseTargetY + (offsetY * 0.5);

        // Smooth camera movement (faster when ship is near edges)
        const edgeProximity = Math.max(
            Math.abs(shipScreenX - this.canvas.width/2) / (this.canvas.width/2),
            Math.abs(shipScreenY - this.canvas.height/2) / (this.canvas.height/2)
        );
        const smoothFactor = 0.05 + (edgeProximity * 0.15); // 0.05 to 0.2 based on proximity to edge

        this.x += (targetX - this.x) * smoothFactor;
        this.y += (targetY - this.y) * smoothFactor;

        // Clamp camera to level boundaries with some margin
        // Only apply clamping if not fully zoomed out
        if (this.zoomLevel > this.minZoom * 1.5) {
            const margin = 200; // Allow camera to go slightly beyond level boundaries
            this.x = Math.max(-margin, Math.min(this.x, this.levelWidth - (this.canvas.width / this.zoomLevel) + margin));
            this.y = Math.max(-margin, Math.min(this.y, this.levelHeight - (this.canvas.height / this.zoomLevel) + margin));
        }
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

        // Clamp camera to level boundaries with some margin
        if (this.zoomLevel > this.minZoom * 1.5) {
            const margin = 200; // Allow camera to go slightly beyond level boundaries
            this.x = Math.max(-margin, Math.min(this.x, this.levelWidth - (this.canvas.width / this.zoomLevel) + margin));
            this.y = Math.max(-margin, Math.min(this.y, this.levelHeight - (this.canvas.height / this.zoomLevel) + margin));
        }
    }
}
