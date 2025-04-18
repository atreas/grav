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
        // Create solid boundaries around the level
        const margin = 50; // Margin from the edge
        const thickness = 20; // Thickness of the boundary walls

        // Top boundary
        this.segments.push({
            x1: 0,
            y1: 0,
            x2: this.width,
            y2: 0
        });

        // Bottom boundary
        this.segments.push({
            x1: 0,
            y1: this.height,
            x2: this.width,
            y2: this.height
        });

        // Left boundary
        this.segments.push({
            x1: 0,
            y1: 0,
            x2: 0,
            y2: this.height
        });

        // Right boundary
        this.segments.push({
            x1: this.width,
            y1: 0,
            x2: this.width,
            y2: this.height
        });
    }

    /*
    createFigureEight() {
        // Parameters for the figure-eight
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radiusX = this.width / 3; // Larger radius
        const radiusY = this.height / 3; // Larger radius
        const numPoints = 60; // More points for smoother curve

        // Generate points for a figure-eight (lemniscate of Bernoulli)
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            const t = (i / numPoints) * Math.PI * 2;
            const denominator = 1 + Math.sin(t) * Math.sin(t);

            // Parametric equation for figure-eight
            const x = centerX + (radiusX * Math.cos(t) * Math.sin(t)) / denominator;
            const y = centerY + (radiusY * Math.sin(t) * Math.cos(t)) / denominator;

            points.push({ x, y });
        }

        // Create segments from points with a gap for the track width
        const trackWidth = 150; // Wider track to accommodate the wrecking ball
        const innerPoints = [];
        const outerPoints = [];

        // Generate inner and outer track points
        for (let i = 0; i < points.length; i++) {
            const curr = points[i];
            const next = points[(i + 1) % points.length];

            // Calculate normal vector
            const dx = next.x - curr.x;
            const dy = next.y - curr.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = -dy / len; // Normal x component
            const ny = dx / len;  // Normal y component

            // Create inner and outer points
            innerPoints.push({
                x: curr.x + nx * trackWidth / 2,
                y: curr.y + ny * trackWidth / 2
            });

            outerPoints.push({
                x: curr.x - nx * trackWidth / 2,
                y: curr.y - ny * trackWidth / 2
            });
        }

        // Create inner track segments
        for (let i = 0; i < innerPoints.length; i++) {
            const p1 = innerPoints[i];
            const p2 = innerPoints[(i + 1) % innerPoints.length];

            this.segments.push({
                x1: p1.x,
                y1: p1.y,
                x2: p2.x,
                y2: p2.y
            });
        }

        // Create outer track segments
        for (let i = 0; i < outerPoints.length; i++) {
            const p1 = outerPoints[i];
            const p2 = outerPoints[(i + 1) % outerPoints.length];

            this.segments.push({
                x1: p1.x,
                y1: p1.y,
                x2: p2.x,
                y2: p2.y
            });
        }

        // Add some platforms inside the figure-eight
        this.addPlatforms();
    }
    */

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
        // Draw the figure-eight track and obstacles
        ctx.lineWidth = 8; // Thicker walls for better visibility

        for (const segment of this.segments) {
            // Determine if this is a boundary segment
            const isBoundary =
                (segment.x1 === 0 && segment.x2 === 0) || // Left boundary
                (segment.x1 === this.width && segment.x2 === this.width) || // Right boundary
                (segment.y1 === 0 && segment.y2 === 0) || // Top boundary
                (segment.y1 === this.height && segment.y2 === this.height); // Bottom boundary

            // Use different colors for boundaries vs obstacles
            ctx.strokeStyle = isBoundary ? '#ff5555' : '#2ecc71';

            ctx.beginPath();
            ctx.moveTo(segment.x1 - cameraX, segment.y1 - cameraY);
            ctx.lineTo(segment.x2 - cameraX, segment.y2 - cameraY);
            ctx.stroke();
        }

        // Draw a grid for reference
        this.drawGrid(ctx, cameraX, cameraY);
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
