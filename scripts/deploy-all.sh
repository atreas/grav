#!/bin/bash

# Script to commit and push all server changes and deploy client files
# Usage: bash scripts/deploy-all.sh "Your commit message"

# Check if commit message is provided
if [ -z "$1" ]; then
  echo "Error: Please provide a commit message."
  echo "Usage: bash scripts/deploy-all.sh \"Your commit message\""
  exit 1
fi

COMMIT_MESSAGE="$1"

# Step 1: Commit and push server changes
echo "===== Step 1: Committing and pushing server changes ====="
git add .
git commit -m "$COMMIT_MESSAGE"
git push origin main

# Check if the push was successful
if [ $? -ne 0 ]; then
  echo "Error: Failed to push GitHub. Aborting deployment."
  exit 1
fi

# Step 2: Prepare client files for deployment
echo "===== Step 2: Preparing client files for deployment ====="
bash scripts/prepare-deployment.sh

# Step 3: Create and push gh-pages branch
echo "===== Step 3: Deploying client files to GitHub Pages ====="

# Check if gh-pages-new branch exists and delete it if it does
if git show-ref --verify --quiet refs/heads/gh-pages-new; then
  git branch -D gh-pages-new
fi

# Create a new gh-pages-new branch
git checkout -b gh-pages-new

# Remove everything except the deploy directory
git rm -rf .
rm -f README.md  # Explicitly remove README.md

# Copy the prepared deployment files
cp -r deploy/* .
rm -rf deploy

# Copy shared files directly to root
cp shared/constants.js .
cp shared/utils.js .

# Add .nojekyll file to prevent Jekyll processing
touch .nojekyll

# Create a minimal index.html that redirects to the game if it doesn't exist
if [ ! -f index.html ]; then
  cat > index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url='client/index.html'" />
</head>
<body>
    <p>Please wait while you're redirected to the game...</p>
</body>
</html>
EOF
fi

# Add all files
git add -A

# Commit changes
git commit -m "Deploy client: $COMMIT_MESSAGE"

# Force push to gh-pages
git push -f origin gh-pages-new:gh-pages

# Step 4: Return to main branch
echo "===== Step 4: Returning to main branch ====="
git checkout main

# Clean up
rm -rf deploy

echo "===== Deployment complete! ====="
echo "Server code pushed to main branch"
echo "Client code deployed to gh-pages branch"
echo "Visit https://atreas.github.io/grav/ to see your deployed game"
