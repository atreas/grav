class Ship {
    constructor(x, y) {
        // Position
        this.x = x;
        this.y = y;

        // Velocity
        this.vx = 0;
        this.vy = 0;

        // Acceleration
        this.ax = 0;
        this.ay = 0;

        // Ship properties
        this.rotation = 0; // in radians
        this.rotationSpeed = 0.08; // Slightly slower rotation for better control
        this.thrustPower = 0.15; // Slightly less thrust for better control
        this.size = 15; // Smaller ship for more zoomed out view

        // Physics properties
        this.drag = 0.99; // Less air resistance
        this.gravity = 0.05; // Less gravity for easier control

        // Controls
        this.thrusting = false;
        this.rotatingLeft = false;
        this.rotatingRight = false;

        // Trail effect
        this.trail = [];
        this.maxTrailLength = 60; // Increased trail length
        this.particleLifespan = 5000; // Particles stay visible for 5 seconds

        // Create wrecking ball attached to the ship
        this.wreckingBall = new WreckingBall(this, 120);

        // Add color property (default color, will be overridden by network)
        this.color = '#3498db';
    }

    update() {
        // Apply rotation with smoother control
        if (this.rotatingLeft) {
            this.rotation -= this.rotationSpeed;
        }
        if (this.rotatingRight) {
            this.rotation += this.rotationSpeed;
        }

        // Apply thrust with better control
        if (this.thrusting) {
            // Gradually increase thrust for smoother acceleration
            const thrustFactor = Math.min(1, this.vx * this.vx + this.vy * this.vy < 1 ? 1.5 : 1);
            this.ax = Math.sin(this.rotation) * this.thrustPower * thrustFactor;
            this.ay = -Math.cos(this.rotation) * this.thrustPower * thrustFactor;
        } else {
            this.ax = 0;
            this.ay = 0;
        }

        // Apply gravity (slightly less when thrusting upward)
        const gravityFactor = this.thrusting && this.ay < 0 ? 0.8 : 1.0;
        this.ay += this.gravity * gravityFactor;

        // Update velocity
        this.vx += this.ax;
        this.vy += this.ay;

        // Apply drag (air resistance)
        this.vx *= this.drag;
        this.vy *= this.drag;

        // No limit on max speed - removed velocity cap
        // Just log the current velocity for debugging
        const currentVelocity = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (Math.random() < 0.01) { // Log occasionally
            console.log('Current velocity:', currentVelocity);
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Update wrecking ball
        this.wreckingBall.update();
    }

    draw(ctx, cameraX, cameraY) {
        // Draw wrecking ball first (behind ship)
        this.wreckingBall.draw(ctx, cameraX, cameraY);

        // Draw trail (behind ship but in front of wrecking ball)
        this.drawTrail(ctx, cameraX, cameraY);

        ctx.save();

        // Translate to ship position relative to camera
        ctx.translate(this.x - cameraX, this.y - cameraY);
        ctx.rotate(this.rotation);

        // Draw the triangle ship
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(-this.size / 2, this.size / 2);
        ctx.lineTo(this.size / 2, this.size / 2);
        ctx.closePath();

        // Ship color
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw thrust flame if thrusting
        if (this.thrusting) {
            // Animated flame
            const flameSize = this.size / 2 + Math.random() * this.size / 4;

            ctx.beginPath();
            ctx.moveTo(-this.size / 3, this.size / 2);
            ctx.lineTo(0, this.size / 2 + flameSize);
            ctx.lineTo(this.size / 3, this.size / 2);
            ctx.closePath();

            // Flame gradient
            const flameGradient = ctx.createLinearGradient(0, this.size / 2, 0, this.size / 2 + flameSize);
            flameGradient.addColorStop(0, '#f39c12');
            flameGradient.addColorStop(0.7, '#e74c3c');
            flameGradient.addColorStop(1, 'rgba(231, 76, 60, 0.5)');
            ctx.fillStyle = flameGradient;
            ctx.fill();
        }

        ctx.restore();
    }

    drawTrail(ctx, cameraX, cameraY) {
        const now = performance.now();

        // Add current position to trail with timestamp
        if (this.thrusting) {
            // Add multiple particles for more effect
            for (let i = 0; i < 3; i++) { // Add 3 particles per frame when thrusting
                const spread = 0.2; // Particle spread
                this.trail.push({
                    x: this.x,
                    y: this.y,
                    rotation: this.rotation + (Math.random() - 0.5) * spread,
                    size: this.size * (0.3 + Math.random() * 0.3), // Varied sizes
                    timestamp: now,
                    color: Math.random() > 0.7 ? '#f39c12' : '#e74c3c' // Varied colors
                });
            }
        }

        // Remove particles older than lifespan
        this.trail = this.trail.filter(particle => now - particle.timestamp < this.particleLifespan);

        // Limit total particles to prevent performance issues
        if (this.trail.length > this.maxTrailLength) {
            this.trail.splice(0, this.trail.length - this.maxTrailLength);
        }

        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const particle = this.trail[i];
            const age = (now - particle.timestamp) / this.particleLifespan;
            const alpha = 1 - age; // Fade out based on age
            const size = particle.size * (1 - age * 0.7); // Shrink as they age

            ctx.save();
            ctx.translate(particle.x - cameraX, particle.y - cameraY);
            ctx.rotate(particle.rotation);

            // Draw trail particle
            ctx.beginPath();
            ctx.moveTo(-size / 6, size / 2);
            ctx.lineTo(0, size / 2 + size / 2);
            ctx.lineTo(size / 6, size / 2);
            ctx.closePath();

            // Use the particle's color with alpha
            ctx.fillStyle = particle.color.replace(')', `, ${alpha})`);
            if (!particle.color.startsWith('rgba')) {
                ctx.fillStyle = particle.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
            }
            ctx.fill();

            ctx.restore();
        }
    }

    // Check collision with level boundaries
    checkCollision(level) {
        // Check ship collision with level
        const segments = level.getSegments();
        let closestDistance = Infinity;
        let collision = false;

        for (const segment of segments) {
            // Calculate distance to segment
            const distance = this.distanceToSegment(
                this.x, this.y,
                segment.x1, segment.y1,
                segment.x2, segment.y2
            );

            // Track closest distance for debugging
            if (distance < closestDistance) {
                closestDistance = distance;
            }

            // Check for collision with reduced sensitivity
            if (distance < this.size / 4) {
                collision = true;
                console.log('Ship collision with level detected!', distance);
                break;
            }
        }

        // Check wrecking ball collision with level
        if (!collision) {
            collision = this.wreckingBall.checkCollision(level);
            if (collision) {
                console.log('Wrecking ball collision with level detected!');
            }
        }

        // Check if ship collides with its own wrecking ball
        if (!collision) {
            const dx = this.x - this.wreckingBall.x;
            const dy = this.y - this.wreckingBall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check collision with the ball including spikes
            if (distance < this.size + this.wreckingBall.size * 1.4) {
                collision = true;
                console.log('Ship collision with wrecking ball detected!', distance);
            }
        }

        // Log closest distance for debugging
        if (Math.random() < 0.01) { // Only log occasionally to avoid spam
            console.log('Closest distance:', closestDistance);
        }

        return collision;
    }

    // Calculate distance from point to line segment
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



