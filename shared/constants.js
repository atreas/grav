// shared/constants.js
// Game constants shared between client and server

// Game dimensions
const GAME_WIDTH = 4000;
const GAME_HEIGHT = 3000;

// Ship properties
const SHIP_SIZE = 15;
const ROTATION_SPEED = 0.08;
const THRUST_POWER = 0.15;
const DRAG = 0.99;
const GRAVITY = 0.05;

// Wrecking ball properties
const BALL_DISTANCE = 120;
const BALL_SIZE = 15;

// Match settings
const MATCH_DURATION = 300000; // 5 minutes in milliseconds
const COUNTDOWN_DURATION = 5000; // 5 seconds in milliseconds
const CELEBRATION_DURATION = 5000; // 5 seconds in milliseconds
const INTERMISSION_DURATION = 30000; // 30 seconds in milliseconds

// Points
const CHECKPOINT_POINTS = 1;
const DESTROY_POINTS = 5;
const CRASH_PENALTY = 2;

// Win conditions
const WIN_POINTS = 11;
const WIN_MARGIN = 2;

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GAME_WIDTH,
        GAME_HEIGHT,
        SHIP_SIZE,
        ROTATION_SPEED,
        THRUST_POWER,
        DRAG,
        GRAVITY,
        BALL_DISTANCE,
        BALL_SIZE,
        MATCH_DURATION,
        COUNTDOWN_DURATION,
        CELEBRATION_DURATION,
        INTERMISSION_DURATION,
        CHECKPOINT_POINTS,
        DESTROY_POINTS,
        CRASH_PENALTY,
        WIN_POINTS,
        WIN_MARGIN
    };
}
