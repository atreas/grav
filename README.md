# Grav - Multiplayer 2D Game

A multiplayer 2D game with thrust controls, gravity mechanics, and wrecking ball physics.

## Project Structure

```
grav/
├── client/                  # Client-side code
│   ├── assets/              # Static assets
│   │   └── sounds/          # Sound files
│   ├── src/                 # Client source code
│   │   ├── game/            # Game logic
│   │   ├── rendering/       # Rendering logic
│   │   ├── network/         # Network-related code
│   │   ├── audio/           # Audio-related code
│   │   └── main.js          # Entry point
│   ├── index.html           # Main HTML file
│   ├── style.css            # Main CSS file
│   └── config.js            # Client configuration
├── server/                  # Server-side code
│   ├── src/                 # Server source code
│   │   ├── game/            # Game logic
│   │   └── server.js        # Main server file
│   └── package.json         # Server dependencies
├── shared/                  # Shared code between client and server
│   ├── constants.js         # Game constants
│   └── utils.js             # Utility functions
├── scripts/                 # Build and deployment scripts
│   ├── prepare-deployment.sh
│   └── deploy-all.sh
└── package.json             # Root package.json
```

## Game Features

- Thrust controls and gravity mechanics
- Multiplayer functionality with real-time updates
- Wrecking ball physics
- Random checkpoints for scoring
- Match-based gameplay with countdown timers
- Minimap for navigation
- Sound effects and particle systems

## Deployment Instructions

### Client Deployment (GitHub Pages)

1. Run the deployment script with a commit message:
   ```
   npm run deploy-client "Your commit message"
   ```
   or
   ```
   bash scripts/deploy-all.sh "Your commit message"
   ```

2. Your game will be available at: https://atreas.github.io/grav/

### Server Deployment (Render)

1. Create a free account on [Render](https://render.com/)

2. Create a new Web Service and connect your GitHub repository

3. Configure the following settings:
   - **Name**: grav-server (or any name you prefer)
   - **Environment**: Node
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Root Directory**: `/`

4. After deployment, update the `SERVER_URL` in `client/config.js` with your Render URL

5. Redeploy the client to GitHub Pages

## Local Development

1. Install dependencies for both client and server:
   ```
   npm install
   cd server && npm install
   ```

2. Clean up duplicate files (if you've just restructured the project):
   ```
   npm run cleanup
   ```

3. Start the server:
   ```
   npm run start:server
   ```
   or for development with auto-reload:
   ```
   npm run dev:server
   ```

4. Open the client HTML file in your browser:
   ```
   open client/index.html
   ```
   or simply open `client/index.html` in your browser

## Controls

- Left/Right Arrows: Rotate ship
- Up Arrow or Space: Thrust
- R: Restart after destruction
- M: Mute/unmute
- ~: Toggle debug panel
