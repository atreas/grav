#!/bin/bash

# Script to commit and push all server changes and deploy client files
# Usage: bash deploy-all.sh "Your commit message"

# Check if commit message is provided
if [ -z "$1" ]; then
  echo "Error: Please provide a commit message."
  echo "Usage: bash deploy-all.sh \"Your commit message\""
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
  echo "Error: Failed to push changes to GitHub. Aborting deployment."
  exit 1
fi

# Step 2: Prepare client files for deployment
echo "===== Step 2: Preparing client files for deployment ====="
bash prepare-deployment.sh

# Step 3: Create and push gh-pages branch
echo "===== Step 3: Deploying client files to GitHub Pages ====="

# Check if gh-pages-new branch exists and delete it if it does
if git show-ref --verify --quiet refs/heads/gh-pages-new; then
  git branch -D gh-pages-new
fi

# Create a new gh-pages-new branch
git checkout -b gh-pages-new
git rm -rf .
git checkout main -- client
cp -r client/* .
rm -rf client
touch .nojekyll
git add .
git commit -m "Deploy client: $COMMIT_MESSAGE"
git push -f origin gh-pages-new:gh-pages

# Step 4: Return to main branch
echo "===== Step 4: Returning to main branch ====="
git checkout main

echo "===== Deployment complete! ====="
echo "Server changes pushed to main branch"
echo "Client files deployed to GitHub Pages"
echo "Your game should be available at: https://atreas.github.io/grav/"
