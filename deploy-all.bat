@echo off
REM Script to commit and push all server changes and deploy client files
REM Usage: deploy-all.bat "Your commit message"

REM Check if commit message is provided
if "%~1"=="" (
  echo Error: Please provide a commit message.
  echo Usage: deploy-all.bat "Your commit message"
  exit /b 1
)

set COMMIT_MESSAGE=%~1

REM Step 1: Commit and push server changes
echo ===== Step 1: Committing and pushing server changes =====
git add .
git commit -m "%COMMIT_MESSAGE%"
git push origin main

REM Check if the push was successful
if %ERRORLEVEL% neq 0 (
  echo Error: Failed to push changes to GitHub. Aborting deployment.
  exit /b 1
)

REM Step 2: Prepare client files for deployment
echo ===== Step 2: Preparing client files for deployment =====
bash prepare-deployment.sh

REM Step 3: Create and push gh-pages branch
echo ===== Step 3: Deploying client files to GitHub Pages =====

REM Check if gh-pages-new branch exists and delete it if it does
git show-ref --verify --quiet refs/heads/gh-pages-new
if %ERRORLEVEL% equ 0 (
  git branch -D gh-pages-new
)

REM Create a new gh-pages-new branch
git checkout -b gh-pages-new
git rm -rf .
git checkout main -- client
xcopy /E /Y client\* .
rmdir /S /Q client
type nul > .nojekyll
git add .
git commit -m "Deploy client: %COMMIT_MESSAGE%"
git push -f origin gh-pages-new:gh-pages

REM Step 4: Return to main branch
echo ===== Step 4: Returning to main branch =====
git checkout main

echo ===== Deployment complete! =====
echo Server changes pushed to main branch
echo Client files deployed to GitHub Pages
echo Your game should be available at: https://atreas.github.io/grav/
