class WreckingBall {
    constructor(ship, distance) {
        // Reference to the ship
        this.ship = ship;

        // Distance from ship (chain length)
        this.distance = distance || 100;

        // Position (will be calculated based on ship position and physics)
        this.x = ship.x;
        this.y = ship.y + this.distance;

        // Velocity
        this.vx = 0;
        this.vy = 0;

        // Ball properties
        this.size = ship.size; // Same size as the ship
        this.mass = 5; // Heavier than the ship for physics simulation

        // Physics properties
        this.gravity = 0.1; // Stronger gravity effect on the ball
        this.drag = 0.995; // Slightly less drag than the ship
    }

    update() {

        // Apply gravity
        this.vy += this.gravity;

        // Apply drag
        this.vx *= this.drag;
        this.vy *= this.drag;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Calculate distance to ship
        const dx = this.x - this.ship.x;
        const dy = this.y - this.ship.y;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);

        // If the ball is too far from the ship, apply chain force
        if (currentDistance > this.distance) {
            // Normalize direction vector
            const nx = dx / currentDistance;
            const ny = dy / currentDistance;

            // Calculate chain force (stronger the further it is)
            const chainForce = (currentDistance - this.distance) * 0.05;

            // Apply chain force to ball (pulling it back)
            this.vx -= nx * chainForce;
            this.vy -= ny * chainForce;

            // Apply opposite force to ship (ball pulling the ship)
            this.ship.vx += nx * chainForce / this.mass;
            this.ship.vy += ny * chainForce / this.mass;

            // Correct position to maintain maximum distance
            const correction = (currentDistance - this.distance) * 0.1;
            this.x -= nx * correction;
            this.y -= ny * correction;
        }
    }

    draw(ctx, cameraX, cameraY) {
        // Draw chain first
        this.drawChain(ctx, cameraX, cameraY);

        // Draw the ball
        ctx.save();

        // Position relative to camera
        const screenX = this.x - cameraX;
        const screenY = this.y - cameraY;

        // Draw the spiked ball
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);

        // Ball gradient
        const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, this.size
        );
        gradient.addColorStop(0, '#777');
        gradient.addColorStop(1, '#333');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw spikes
        const spikeCount = 12;
        const spikeLength = this.size * 0.4;

        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2;
            const innerX = screenX + Math.cos(angle) * this.size;
            const innerY = screenY + Math.sin(angle) * this.size;
            const outerX = screenX + Math.cos(angle) * (this.size + spikeLength);
            const outerY = screenY + Math.sin(angle) * (this.size + spikeLength);

            ctx.beginPath();
            ctx.moveTo(innerX, innerY);
            ctx.lineTo(outerX, outerY);
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();
    }

    drawChain(ctx, cameraX, cameraY) {
        // Draw chain connecting ship to ball
        ctx.save();

        // Ship and ball positions relative to camera
        const shipScreenX = this.ship.x - cameraX;
        const shipScreenY = this.ship.y - cameraY;
        const ballScreenX = this.x - cameraX;
        const ballScreenY = this.y - cameraY;

        // Calculate chain segments
        const segments = 10;
        const dx = (ballScreenX - shipScreenX) / segments;
        const dy = (ballScreenY - shipScreenY) / segments;

        // Draw chain segments with a slight wave effect
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 3;

        for (let i = 0; i < segments; i++) {
            const startX = shipScreenX + dx * i;
            const startY = shipScreenY + dy * i;
            const endX = shipScreenX + dx * (i + 1);
            const endY = shipScreenY + dy * (i + 1);

            // Add a slight wave effect based on time
            const waveAmplitude = 5;
            const waveFrequency = 0.005;
            const waveOffset = Math.sin((performance.now() * waveFrequency) + (i / segments) * Math.PI * 2) * waveAmplitude;

            // Calculate perpendicular direction for wave
            const perpX = -dy / Math.sqrt(dx * dx + dy * dy);
            const perpY = dx / Math.sqrt(dx * dx + dy * dy);

            // Apply wave offset
            const midX = (startX + endX) / 2 + perpX * waveOffset;
            const midY = (startY + endY) / 2 + perpY * waveOffset;

            // Draw chain segment
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Check collision with level boundaries
    checkCollision(level) {
        const segments = level.getSegments();
        let collision = false;

        for (const segment of segments) {
            // Calculate distance to segment
            const distance = this.distanceToSegment(
                this.x, this.y,
                segment.x1, segment.y1,
                segment.x2, segment.y2
            );

            // Check for collision with the ball including spikes
            if (distance < this.size * 1.4) { // 1.4 to account for spikes
                collision = true;
                break;
            }
        }

        return collision;
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
}
