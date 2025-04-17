#!/bin/bash

# Create client directory if it doesn't exist
mkdir -p client

# Copy client-side files to client directory
cp index.html client/
cp style.css client/
cp audio.js client/
cp camera.js client/
cp game.js client/
cp input.js client/
cp level.js client/
cp network.js client/
cp remote-player.js client/
cp renderer.js client/
cp ship.js client/
cp ui.js client/
cp wreckingBall.js client/
cp race.js client/

# Create sounds directory in client
mkdir -p client/sounds

# Copy sound files
cp -r sounds/* client/sounds/

# Create a modified server.js for the client that points to the deployed server
# Use hardcoded Render URL
RENDER_URL="https://grav-server.onrender.com"

cat > client/server-config.js << EOF
// Configuration for the deployed game
const SERVER_URL = '$RENDER_URL'; // Your Render server URL
EOF

# Create a modified index.html that uses the server-config.js
sed 's|<script src="/socket.io/socket.io.js"></script>|<script src="https://cdn.socket.io/4.4.1/socket.io.min.js"></script>\n    <script src="server-config.js"></script>|g' index.html > client/index.html

# Create a modified network.js that uses the SERVER_URL
sed 's|this.socket = io();|this.socket = io(SERVER_URL);|g' network.js > client/network.js

echo "Deployment files prepared. Client files are in the 'client' directory."
