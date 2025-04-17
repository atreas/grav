# Grav - Multiplayer 2D Game

A multiplayer 2D game with thrust controls, gravity mechanics, and wrecking ball physics.

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

1. Run the preparation script:
   ```
   npm run prepare-deployment
   ```

2. Deploy the client to GitHub Pages:
   ```
   npm run deploy-client
   ```

3. Your game will be available at: https://atreas.github.io/grav/

### Server Deployment (Render)

1. Create a free account on [Render](https://render.com/)

2. Create a new Web Service and connect your GitHub repository

3. Configure the following settings:
   - **Name**: grav-server (or any name you prefer)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `/` (or `/server` if you prefer)

4. After deployment, update the `SERVER_URL` in `client/server-config.js` with your Render URL

5. Redeploy the client to GitHub Pages

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

3. Open your browser to `http://localhost:3001`

## Controls

- Left/Right Arrows: Rotate ship
- Up Arrow or Space: Thrust
- R: Restart after destruction
- M: Mute/unmute
- ~: Toggle debug panel
