// levelGenerator.js - Server-side level generation

class LevelGenerator {
  constructor() {
    this.seed = Date.now(); // Default seed
    this.levelType = 'technical'; // Default to technical level type
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

  setLevelType(type) {
    this.levelType = type; // 'open' or 'technical'
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
      obstacles: [],
      isNewMatch: true  // Add this flag to indicate it's a complete new level
    };

    // Add boundaries
    this.addBoundaries(levelData);

    if (this.levelType === 'technical') {
      this.generateTechnicalLevel(levelData);
    } else {
      // Original 'open' level style
      this.addRandomObstacles(levelData, 15);
    }

    return levelData;
  }

  generateTechnicalLevel(levelData) {
    const gridSize = 400; // Size of each grid cell
    const pathWidth = 150; // Width of the corridors

    // Create a grid of walls
    for (let x = gridSize; x < levelData.width; x += gridSize) {
      for (let y = gridSize; y < levelData.height; y += gridSize) {
        // Don't place walls in the center safe zone
        const distFromCenter = Math.sqrt(
          Math.pow(x - levelData.width/2, 2) + 
          Math.pow(y - levelData.height/2, 2)
        );
        
        if (distFromCenter < 300) continue;

        // Randomly decide whether to place vertical or horizontal walls
        if (this.random() < 0.7) { // 70% chance to place a wall
          if (this.random() < 0.5) {
            // Vertical wall with gap
            const gapY = y + this.randomBetween(-gridSize/4, gridSize/4);
            
            // Wall segments above and below the gap
            levelData.segments.push({
              x1: x,
              y1: y - gridSize/2,
              x2: x,
              y2: gapY - pathWidth/2,
              isBoundary: false
            });
            
            levelData.segments.push({
              x1: x,
              y1: gapY + pathWidth/2,
              x2: x,
              y2: y + gridSize/2,
              isBoundary: false
            });
          } else {
            // Horizontal wall with gap
            const gapX = x + this.randomBetween(-gridSize/4, gridSize/4);
            
            // Wall segments left and right of the gap
            levelData.segments.push({
              x1: x - gridSize/2,
              y1: y,
              x2: gapX - pathWidth/2,
              y2: y,
              isBoundary: false
            });
            
            levelData.segments.push({
              x1: gapX + pathWidth/2,
              y1: y,
              x2: x + gridSize/2,
              y2: y,
              isBoundary: false
            });
          }
        }
      }
    }

    // Add a few random obstacles in larger open areas
    this.addRandomObstacles(levelData, 5);
  }

  // Add level boundaries
  addBoundaries(levelData) {
    const thickness = 20;

    // Top boundary
    levelData.segments.push({
      x1: 0,
      y1: 0,
      x2: levelData.width,
      y2: 0,
      isBoundary: true,
      thickness: thickness,
      permanent: true
    });

    // Bottom boundary
    levelData.segments.push({
      x1: 0,
      y1: levelData.height,
      x2: levelData.width,
      y2: levelData.height,
      isBoundary: true,
      thickness: thickness,
      permanent: true
    });

    // Left boundary
    levelData.segments.push({
      x1: 0,
      y1: 0,
      x2: 0,
      y2: levelData.height,
      isBoundary: true,
      thickness: thickness,
      permanent: true
    });

    // Right boundary
    levelData.segments.push({
      x1: levelData.width,
      y1: 0,
      x2: levelData.width,
      y2: levelData.height,
      isBoundary: true,
      thickness: thickness,
      permanent: true
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

  regenerateObstacles(width, height) {
    // Initialize random generator with current seed
    this.random = this.createSeededRandom(this.seed);

    // Create new level data structure
    const levelData = {
      width: width,
      height: height,
      segments: [],
      obstacles: [],
      isNewMatch: false  // This is just an obstacle refresh
    };

    // Add boundaries first
    this.addBoundaries(levelData);

    // Store the boundary segments
    const boundarySegments = levelData.segments.filter(s => s.permanent);

    if (this.levelType === 'technical') {
      this.generateTechnicalLevel(levelData);
    } else {
      this.addRandomObstacles(levelData, 15);
    }

    // Ensure boundaries are preserved by adding them back
    levelData.segments = [
      ...boundarySegments,
      ...levelData.segments.filter(s => !s.permanent)
    ];

    return levelData;
  }
}

module.exports = LevelGenerator;
