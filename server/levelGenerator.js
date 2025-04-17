// levelGenerator.js - Server-side level generation

class LevelGenerator {
  constructor() {
    this.seed = Date.now(); // Default seed
  }

  // Set a specific seed for deterministic generation
  setSeed(seed) {
    this.seed = seed;
    this.random = this.createSeededRandom(seed);
  }

  // Create a seeded random number generator
  createSeededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  // Generate a random number between min and max using the seeded random function
  randomBetween(min, max) {
    return min + this.random() * (max - min);
  }

  // Generate a random integer between min and max (inclusive) using the seeded random function
  randomIntBetween(min, max) {
    return Math.floor(this.randomBetween(min, max + 1));
  }

  // Generate level data
  generateLevel(width, height) {
    // Initialize random generator with current seed
    this.random = this.createSeededRandom(this.seed);

    // Create level data structure
    const levelData = {
      width: width,
      height: height,
      segments: [],
      obstacles: []
    };

    // Add boundaries
    this.addBoundaries(levelData);

    // Add random obstacles
    this.addRandomObstacles(levelData, 15); // 15 random obstacles

    return levelData;
  }

  // Add level boundaries
  addBoundaries(levelData) {
    // Top boundary
    levelData.segments.push({
      x1: 0,
      y1: 0,
      x2: levelData.width,
      y2: 0,
      isBoundary: true
    });

    // Bottom boundary
    levelData.segments.push({
      x1: 0,
      y1: levelData.height,
      x2: levelData.width,
      y2: levelData.height,
      isBoundary: true
    });

    // Left boundary
    levelData.segments.push({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: levelData.height,
      isBoundary: true
    });

    // Right boundary
    levelData.segments.push({
      x1: levelData.width,
      y1: 0,
      x2: levelData.width,
      y2: levelData.height,
      isBoundary: true
    });
  }

  // Add random obstacles
  addRandomObstacles(levelData, count) {
    // Define safe zones where no obstacles should be placed
    const safeZones = [
      {
        x: levelData.width / 2,
        y: levelData.height / 2,
        radius: 200 // Safe zone at center for spawn
      }
    ];

    for (let i = 0; i < count; i++) {
      // Decide what type of obstacle to create (0-3)
      const obstacleType = this.randomIntBetween(0, 3);

      // Random position for the obstacle
      let x, y;
      let isInSafeZone;

      // Keep generating positions until we find one not in a safe zone
      do {
        // Random position within the level bounds (with margin)
        const margin = 200;
        x = margin + this.randomBetween(0, levelData.width - 2 * margin);
        y = margin + this.randomBetween(0, levelData.height - 2 * margin);

        // Check if this position is in any safe zone
        isInSafeZone = safeZones.some(zone => {
          const dx = x - zone.x;
          const dy = y - zone.y;
          return Math.sqrt(dx * dx + dy * dy) < zone.radius;
        });
      } while (isInSafeZone);

      // Create obstacle data
      const obstacleData = {
        type: obstacleType,
        x: x,
        y: y,
        segments: []
      };

      // Create different types of obstacles
      switch (obstacleType) {
        case 0: // Thick line
          this.createThickLine(obstacleData);
          break;
        case 1: // Random polygon
          this.createRandomPolygon(obstacleData);
          break;
        case 2: // Star shape
          this.createStarShape(obstacleData);
          break;
        case 3: // Circular obstacle
          this.createCircularObstacle(obstacleData);
          break;
      }

      // Add obstacle to level data
      levelData.obstacles.push(obstacleData);

      // Add obstacle segments to level segments
      levelData.segments = levelData.segments.concat(obstacleData.segments);
    }
  }

  // Create a thick line obstacle
  createThickLine(obstacleData) {
    const x = obstacleData.x;
    const y = obstacleData.y;
    const length = 100 + this.randomBetween(0, 200);
    const thickness = 20 + this.randomBetween(0, 30);
    const angle = this.randomBetween(0, Math.PI * 2);

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

      obstacleData.segments.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        isBoundary: false
      });
    }
  }

  // Create a random polygon obstacle
  createRandomPolygon(obstacleData) {
    const x = obstacleData.x;
    const y = obstacleData.y;
    const sides = 5 + this.randomIntBetween(0, 3); // 5-8 sides
    const radius = 50 + this.randomBetween(0, 100);
    const points = [];

    // Generate random points for the polygon
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const r = radius * (0.7 + this.randomBetween(0, 0.6)); // Vary the radius a bit
      points.push({
        x: x + Math.cos(angle) * r,
        y: y + Math.sin(angle) * r
      });
    }

    // Create segments for the polygon
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];

      obstacleData.segments.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        isBoundary: false
      });
    }
  }

  // Create a star shape obstacle
  createStarShape(obstacleData) {
    const x = obstacleData.x;
    const y = obstacleData.y;
    const points = 5 + this.randomIntBetween(0, 2); // 5-7 points
    const outerRadius = 80 + this.randomBetween(0, 60);
    const innerRadius = outerRadius * (0.3 + this.randomBetween(0, 0.2));
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

      obstacleData.segments.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        isBoundary: false
      });
    }
  }

  // Create a circular obstacle
  createCircularObstacle(obstacleData) {
    const x = obstacleData.x;
    const y = obstacleData.y;
    const radius = 40 + this.randomBetween(0, 60);
    const segments = 12 + this.randomIntBetween(0, 8); // 12-20 segments
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

      obstacleData.segments.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        isBoundary: false
      });
    }
  }
}

module.exports = LevelGenerator;
