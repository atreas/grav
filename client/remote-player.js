// remote-player.js
class RemotePlayer {
    constructor(id, x, y, color, name) {
      this.id = id;
      this.x = x;
      this.y = y;
      this.rotation = 0;
      this.vx = 0;
      this.vy = 0;
      this.color = color;
      this.name = name;
      this.size = 15; // Same as local ship
      this.checkpoint = 0;
      this.lap = 0;

      // For interpolation
      this.targetX = x;
      this.targetY = y;
      this.targetRotation = 0;
      this.interpolationTime = 0;

      // Create wrecking ball
      this.wreckingBall = {
        x: x,
        y: y + 120,
        size: 15,
        distance: 120
      };

      // Add properties needed for collision detection and physics
      this.mass = 1; // Same mass as local ship for collision physics

      // Create trail
      this.trail = [];
      this.maxTrailLength = 20; // Shorter than local player for performance
    }

    updateFromServer(data) {
      // Set target values for interpolation
      this.targetX = data.x;
      this.targetY = data.y;
      this.targetRotation = data.rotation;
      this.vx = data.vx;
      this.vy = data.vy;

      // Reset interpolation timer
      this.interpolationTime = 0;
    }

    update(deltaTime) {
      // Interpolate position and rotation
      const interpolationDuration = 100; // ms
      this.interpolationTime += deltaTime;
      const t = Math.min(1, this.interpolationTime / interpolationDuration);

      // Linear interpolation for position
      this.x += (this.targetX - this.x) * t;
      this.y += (this.targetY - this.y) * t;

      // Handle rotation interpolation (accounting for wrapping)
      let rotDiff = this.targetRotation - this.rotation;
      if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      this.rotation += rotDiff * t;

      // Update wrecking ball position
      this.updateWreckingBall();

      // Update trail
      this.updateTrail();
    }

    updateWreckingBall() {
      // Simple physics for the wrecking ball
      const angle = this.rotation + Math.PI; // Behind the ship
      const targetX = this.x + Math.cos(angle) * this.wreckingBall.distance;
      const targetY = this.y + Math.sin(angle) * this.wreckingBall.distance;

      // Smooth movement
      this.wreckingBall.x += (targetX - this.wreckingBall.x) * 0.1;
      this.wreckingBall.y += (targetY - this.wreckingBall.y) * 0.1;
    }

    // Add collision detection methods to the remote player's wrecking ball
    initWreckingBallCollision() {
      if (!this.wreckingBall.checkShipCollision) {
        // Add the checkShipCollision method to the wrecking ball
        this.wreckingBall.checkShipCollision = (ship) => {
          // Calculate distance between ball and ship
          const dx = this.wreckingBall.x - ship.x;
          const dy = this.wreckingBall.y - ship.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Check if ball and ship are close enough to collide
          const collisionThreshold = this.wreckingBall.size * 1.4 + ship.size; // 1.4 to account for spikes

          if (distance < collisionThreshold) {
            console.log('Remote wrecking ball collision with ship detected!', distance);
            return true;
          }

          return false;
        };
      }
    }

    updateTrail() {
      // Add new trail particle
      if (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5) {
        this.trail.push({
          x: this.x,
          y: this.y,
          alpha: 0.7,
          size: 5
        });

        // Limit trail length
        if (this.trail.length > this.maxTrailLength) {
          this.trail.shift();
        }
      }

      // Update existing particles
      for (let i = 0; i < this.trail.length; i++) {
        this.trail[i].alpha -= 0.01;
        this.trail[i].size *= 0.95;
      }

      // Remove faded particles
      this.trail = this.trail.filter(particle => particle.alpha > 0);
    }

    draw(ctx, cameraX, cameraY) {
      // Draw trail - pass ctx as the first parameter
      this.drawTrail(ctx, cameraX, cameraY);

      // Draw wrecking ball and chain - also pass ctx
      this.drawWreckingBall(ctx, cameraX, cameraY);

      // Draw ship
      ctx.save();

      // Position
      const screenX = this.x - cameraX;
      const screenY = this.y - cameraY;

      ctx.translate(screenX, screenY);
      ctx.rotate(this.rotation);

      // Draw triangle ship
      ctx.beginPath();
      ctx.moveTo(0, -this.size);
      ctx.lineTo(-this.size / 2, this.size / 2);
      ctx.lineTo(this.size / 2, this.size / 2);
      ctx.closePath();

      // Fill with player color
      ctx.fillStyle = this.color;
      ctx.fill();

      // Outline
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw player name
      ctx.rotate(-this.rotation); // Unrotate for text
      ctx.font = '12px Arial';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, 0, -this.size - 10);

      ctx.restore();
    }

    drawTrail(ctx, cameraX, cameraY) {
      ctx.save();

      for (const particle of this.trail) {
        const screenX = particle.x - cameraX;
        const screenY = particle.y - cameraY;

        ctx.beginPath();
        ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 100, 50, ${particle.alpha})`;
        ctx.fill();
      }

      ctx.restore();
    }

    drawWreckingBall(ctx, cameraX, cameraY) {
      ctx.save();

      // Draw chain
      const shipScreenX = this.x - cameraX;
      const shipScreenY = this.y - cameraY;
      const ballScreenX = this.wreckingBall.x - cameraX;
      const ballScreenY = this.wreckingBall.y - cameraY;

      ctx.beginPath();
      ctx.moveTo(shipScreenX, shipScreenY);
      ctx.lineTo(ballScreenX, ballScreenY);
      ctx.strokeStyle = '#777';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw ball
      ctx.beginPath();
      ctx.arc(ballScreenX, ballScreenY, this.wreckingBall.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }
  }
