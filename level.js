class Level {
    constructor(width, height, levelData = null) {
        this.width = width;
        this.height = height;
        this.segments = [];
        this.safeZones = []; // Areas where no obstacles should be placed

        // Define a safe zone at the center for ship spawn
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const safeRadius = 200; // Larger safe radius to ensure no walls at spawn

        this.safeZones.push({
            x: centerX,
            y: centerY,
            radius: safeRadius
        });

        if (levelData) {
            // Use server-provided level data
            this.loadFromData(levelData);
        } else {
            // Create level boundaries and obstacles locally (fallback)
            this.createBoundaries();
            this.addPlatforms();
        }
    }

    // Load level from server-provided data
    loadFromData(levelData) {
        // Set dimensions if provided
        if (levelData.width) this.width = levelData.width;
        if (levelData.height) this.height = levelData.height;

        // Load segments directly
        this.segments = levelData.segments || [];
    }
    createBoundaries() {
        const thickness = 50; // Much thicker boundaries

        // Top boundary
        this.segments.push({
            x1: -thickness,
            y1: -thickness,
            x2: this.width + thickness,
            y2: -thickness,
            isBoundary: true,
            thickness: thickness
        });

        // Bottom boundary
        this.segments.push({
            x1: -thickness,
            y1: this.height + thickness,
            x2: this.width + thickness,
            y2: this.height + thickness,
            isBoundary: true,
            thickness: thickness
        });

        // Left boundary
        this.segments.push({
            x1: -thickness,
            y1: -thickness,
            x2: -thickness,
            y2: this.height + thickness,
            isBoundary: true,
            thickness: thickness
        });

        // Right boundary
        this.segments.push({
            x1: this.width + thickness,
            y1: -thickness,
            x2: this.width + thickness,
            y2: this.height + thickness,
            isBoundary: true,
            thickness: thickness
        });

        // Add a floor platform near the bottom of the level
        const floorY = this.height - 100; // 100 pixels from the bottom
        this.segments.push({
            x1: 0,
            y1: floorY,
            x2: this.width,
            y2: floorY,
            isFloor: true // Mark as floor for visual distinction
        });
    }

    addPlatforms() {
        // Add random obstacles around the map
        // Safe zone is already defined in the constructor
        this.addRandomObstacles(15); // Add 15 random obstacles
    }

    addRandomObstacles(count) {

        for (let i = 0; i < count; i++) {
            // Decide what type of obstacle to create
            const obstacleType = Math.floor(Math.random() * 4); // 0-3 different types

            // Random position for the obstacle
            let x, y;
            let isInSafeZone;

            // Keep generating positions until we find one not in a safe zone
            do {
                // Random position within the level bounds (with margin)
                const margin = 200;
                x = margin + Math.random() * (this.width - 2 * margin);
                y = margin + Math.random() * (this.height - 2 * margin);

                // Check if this position is in any safe zone
                isInSafeZone = this.safeZones.some(zone => {
                    const dx = x - zone.x;
                    const dy = y - zone.y;
                    return Math.sqrt(dx * dx + dy * dy) < zone.radius;
                });
            } while (isInSafeZone);

            // Create different types of obstacles
            switch (obstacleType) {
                case 0: // Thick line
                    this.createThickLine(x, y);
                    break;
                case 1: // Random polygon
                    this.createRandomPolygon(x, y);
                    break;
                case 2: // Star shape
                    this.createStarShape(x, y);
                    break;
                case 3: // Circular obstacle
                    this.createCircularObstacle(x, y);
                    break;
            }
        }
    }

    createThickLine(x, y) {
        const length = 100 + Math.random() * 200;
        const thickness = 20 + Math.random() * 30;
        const angle = Math.random() * Math.PI * 2;

        // Calculate endpoints of the thick line
        const dx = Math.cos(angle) * length / 2;
        const dy = Math.sin(angle) * length / 2;

        // Calculate corners of the thick line (rectangle)
        const perpX = -dy / length * thickness;
        const perpY = dx / length * thickness;

        // Four corners of the rectangle
        const points = [
            { x: x - dx + perpX, y: y - dy + perpY },
            { x: x + dx + perpX, y: y + dy + perpY },
            { x: x + dx - perpX, y: y + dy - perpY },
            { x: x - dx - perpX, y: y - dy - perpY }
        ];

        // Create segments for the rectangle
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            this.segments.push({
                x1: p1.x,
                y1: p1.y,
                x2: p2.x,
                y2: p2.y
            });
        }
    }

    createRandomPolygon(x, y) {
        const sides = 5 + Math.floor(Math.random() * 4); // 5-8 sides
        const radius = 50 + Math.random() * 100;
        const points = [];

        // Generate random points for the polygon
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const r = radius * (0.7 + Math.random() * 0.6); // Vary the radius a bit
            points.push({
                x: x + Math.cos(angle) * r,
                y: y + Math.sin(angle) * r
            });
        }

        // Create segments for the polygon
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            this.segments.push({
                x1: p1.x,
                y1: p1.y,
                x2: p2.x,
                y2: p2.y
            });
        }
    }

    createStarShape(x, y) {
        const points = 5 + Math.floor(Math.random() * 3); // 5-7 points
        const outerRadius = 80 + Math.random() * 60;
        const innerRadius = outerRadius * (0.3 + Math.random() * 0.2);
        const starPoints = [];

        // Generate points for the star
        for (let i = 0; i < points * 2; i++) {
            const angle = (i / (points * 2)) * Math.PI * 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            starPoints.push({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius
            });
        }

        // Create segments for the star
        for (let i = 0; i < starPoints.length; i++) {
            const p1 = starPoints[i];
            const p2 = starPoints[(i + 1) % starPoints.length];

            this.segments.push({
                x1: p1.x,
                y1: p1.y,
                x2: p2.x,
                y2: p2.y
            });
        }
    }

    createCircularObstacle(x, y) {
        const radius = 40 + Math.random() * 60;
        const segments = 12 + Math.floor(Math.random() * 8); // 12-20 segments
        const points = [];

        // Generate points for the circle
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius
            });
        }

        // Create segments for the circle
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            this.segments.push({
                x1: p1.x,
                y1: p1.y,
                x2: p2.x,
                y2: p2.y
            });
        }
    }

    draw(ctx, cameraX, cameraY) {
        // Draw boundaries first
        for (const segment of this.segments) {
            if (segment.isBoundary) {
                ctx.strokeStyle = '#990000'; // Darker red for boundaries
                ctx.lineWidth = segment.thickness || 20;
                
                ctx.beginPath();
                ctx.moveTo(segment.x1 - cameraX, segment.y1 - cameraY);
                ctx.lineTo(segment.x2 - cameraX, segment.y2 - cameraY);
                ctx.stroke();

                // Debug: Draw boundary points
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(segment.x1 - cameraX, segment.y1 - cameraY, 5, 0, Math.PI * 2);
                ctx.arc(segment.x2 - cameraX, segment.y2 - cameraY, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw other segments
        for (const segment of this.segments) {
            if (!segment.isBoundary) {
                ctx.strokeStyle = segment.isFloor ? '#3498db' : '#2ecc71';
                ctx.lineWidth = segment.isFloor ? 10 : 8;

                ctx.beginPath();
                ctx.moveTo(segment.x1 - cameraX, segment.y1 - cameraY);
                ctx.lineTo(segment.x2 - cameraX, segment.y2 - cameraY);
                ctx.stroke();
            }
        }

        // Draw grid last
        this.drawGrid(ctx, cameraX, cameraY);

        // Debug: Draw level dimensions
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-cameraX, -cameraY, this.width, this.height);
    }

    drawGrid(ctx, cameraX, cameraY) {
        const gridSize = 100;
        const offsetX = cameraX % gridSize;
        const offsetY = cameraY % gridSize;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = -offsetX; x < ctx.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ctx.canvas.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = -offsetY; y < ctx.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(ctx.canvas.width, y);
            ctx.stroke();
        }
    }

    getSegments() {
        return this.segments;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }
}
