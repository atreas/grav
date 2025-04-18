#!/bin/bash

# Create deployment directory if it doesn't exist
mkdir -p deploy
mkdir -p deploy/shared

# Clean up any existing files
rm -rf deploy/*

# Create directory structure
mkdir -p deploy/assets/sounds

# Copy client files
cp client/*.html deploy/
cp client/*.css deploy/
cp client/*.js deploy/
cp client/config.js deploy/

# Copy shared files
cp shared/*.js deploy/shared/

# Copy sound files
cp -r client/assets/sounds/* deploy/assets/sounds/

# Update config.js to use the production server URL
RENDER_URL="https://grav-server.onrender.com"

cat > deploy/config.js << EOF
// Configuration for the deployed game
const SERVER_URL = '$RENDER_URL'; // Render server URL for production
// const SERVER_URL = 'http://localhost:3001'; // Uncomment for local development

// Debug settings
const DEBUG_MODE = false; // Set to true to enable debug features

// Display settings
const DEFAULT_ZOOM = 0.5; // Default zoom level
EOF

echo "Deployment files prepared. Files are in the 'deploy' directory."
