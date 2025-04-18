#!/bin/bash

echo "Flattening project structure..."

# Client restructuring
echo "Restructuring client files..."
mkdir -p client/assets/sounds
mv client/src/audio/*.js client/
mv client/src/game/*.js client/
mv client/src/rendering/*.js client/
mv client/src/network/*.js client/
mv client/src/main.js client/
rm -rf client/src

# Server restructuring
echo "Restructuring server files..."
mv server/src/game/*.js server/
mv server/src/server.js server/
rm -rf server/src

# Remove any remaining duplicate files
echo "Removing duplicate files..."
rm -f audio.js
rm -f camera.js
rm -f game.js
rm -f input.js
rm -f level.js
rm -f network.js
rm -f race.js
rm -f remote-player.js
rm -f renderer.js
rm -f ship.js
rm -f ui.js
rm -f wreckingBall.js
rm -f index.html
rm -f style.css
rm -f server-config.js

echo "Cleanup complete!"

