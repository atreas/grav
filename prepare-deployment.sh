#!/bin/bash

# Create client directory if it doesn't exist
mkdir -p client

# Copy client-side files to client directory
cp server/index.html client/
cp server/style.css client/
cp server/audio.js client/
cp server/camera.js client/
cp server/game.js client/
cp server/input.js client/
cp server/level.js client/
cp server/network.js client/
cp server/remote-player.js client/
cp server/renderer.js client/
cp server/ship.js client/
cp server/ui.js client/
cp server/wreckingBall.js client/
cp server/race.js client/

# Create sounds directory in client
mkdir -p client/sounds

# Copy sound files
cp -r server/sounds/* client/sounds/

# Create a modified server.js for the client that points to the deployed server
cat > client/server-config.js << EOF
// Configuration for the deployed game
const SERVER_URL = 'https://grav-server.onrender.com'; // Update this with your Render URL when deployed
EOF

# Create a modified index.html that uses the server-config.js
sed 's|<script src="/socket.io/socket.io.js"></script>|<script src="https://cdn.socket.io/4.4.1/socket.io.min.js"></script>\n    <script src="server-config.js"></script>|g' server/index.html > client/index.html

# Create a modified network.js that uses the SERVER_URL
sed 's|this.socket = io();|this.socket = io(SERVER_URL);|g' server/network.js > client/network.js

echo "Deployment files prepared. Client files are in the 'client' directory."
