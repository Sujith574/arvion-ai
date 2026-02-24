# Arvion AI — One-Click Push & Deploy Script
# ============================================
# This script commits all changes, pushes to GitHub, 
# and triggers a Cloud Build deployment to Cloud Run.

Write-Host "🚀 Starting Automated Deployment Pipeline..." -ForegroundColor Cyan

# 1. Git Operations
Write-Host "📦 Committing changes..." -ForegroundColor Yellow
git add .
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Automated Deployment: $timestamp"

Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

# 2. Cloud Build Trigger (Direct)
Write-Host "☁️ Triggering Google Cloud Build..." -ForegroundColor Yellow
gcloud builds submit --config cloudbuild.yaml .

# 3. Capacitor Android Sync
Write-Host "🔄 Syncing Android Project Infrastructure..." -ForegroundColor Yellow
Set-Location frontend
npx cap sync android
Set-Location ..

Write-Host "✅ Pipeline complete! Your changes are being deployed to Cloud Run." -ForegroundColor Green
Write-Host "🌍 Vercel: If connected to GitHub, it will auto-deploy now." -ForegroundColor Cyan
Write-Host "Monitor Cloud Build at: https://console.cloud.google.com/cloud-build/builds" -ForegroundColor Gray

