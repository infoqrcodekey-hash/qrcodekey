# ============================================
# SETUP SCRIPT - Run this ONCE to organize files
# Right-click → Run with PowerShell
# ============================================

Write-Host ""
Write-Host "Setting up QR Tracking System..." -ForegroundColor Cyan
Write-Host ""

# Create all folders
$folders = @(
    "backend\config",
    "backend\controllers",
    "backend\middleware",
    "backend\models",
    "backend\routes",
    "backend\services",
    "backend\utils",
    "frontend\src\pages\scan",
    "frontend\src\pages\map",
    "frontend\src\lib",
    "frontend\src\context",
    "frontend\src\styles"
)

foreach ($f in $folders) {
    New-Item -ItemType Directory -Force -Path $f | Out-Null
}
Write-Host "Folders created!" -ForegroundColor Green

# Move backend files
$moves = @{
    # Backend root
    "server.js" = "backend\server.js"
    ".env.example" = "backend\.env.example"
    ".gitignore" = "backend\.gitignore"
    "package.json" = "backend\package.json"

    # Config
    "db.js" = "backend\config\db.js"

    # Models
    "User.js" = "backend\models\User.js"
    "QRCode.js" = "backend\models\QRCode.js"
    "ScanLog.js" = "backend\models\ScanLog.js"

    # Controllers
    "authController.js" = "backend\controllers\authController.js"
    "qrController.js" = "backend\controllers\qrController.js"
    "trackController.js" = "backend\controllers\trackController.js"
    "adminController.js" = "backend\controllers\adminController.js"
    "paymentController.js" = "backend\controllers\paymentController.js"
    "otpController.js" = "backend\controllers\otpController.js"
    "exportController.js" = "backend\controllers\exportController.js"

    # Middleware
    "validator.js" = "backend\middleware\validator.js"
    "rateLimiter.js" = "backend\middleware\rateLimiter.js"

    # Services
    "notificationService.js" = "backend\services\notificationService.js"
    "locationService.js" = "backend\services\locationService.js"

    # Utils
    "seed.js" = "backend\utils\seed.js"

    # Frontend root
    "next.config.js" = "frontend\next.config.js"
    "tailwind.config.js" = "frontend\tailwind.config.js"
    "postcss.config.js" = "frontend\postcss.config.js"

    # Frontend styles
    "globals.css" = "frontend\src\styles\globals.css"

    # Frontend context
    "AuthContext.js" = "frontend\src\context\AuthContext.js"

    # Frontend lib
    "api.js" = "frontend\src\lib\api.js"
    "socket.js" = "frontend\src\lib\socket.js"
    "gps.js" = "frontend\src\lib\gps.js"

    # Frontend pages
    "_app.js" = "frontend\src\pages\_app.js"
    "index.js" = "frontend\src\pages\index.js"
    "login.js" = "frontend\src\pages\login.js"
    "register.js" = "frontend\src\pages\register.js"
    "generate.js" = "frontend\src\pages\generate.js"
    "track.js" = "frontend\src\pages\track.js"
    "dashboard.js" = "frontend\src\pages\dashboard.js"
    "profile.js" = "frontend\src\pages\profile.js"
    "pricing.js" = "frontend\src\pages\pricing.js"
    "scanner.js" = "frontend\src\pages\scanner.js"
    "forgot-password.js" = "frontend\src\pages\forgot-password.js"
}

$moved = 0
foreach ($item in $moves.GetEnumerator()) {
    if (Test-Path $item.Key) {
        Move-Item -Force $item.Key $item.Value
        $moved++
    }
}

# Handle duplicate/renamed files
# auth.js could be routes/auth or middleware/auth
if (Test-Path "auth.js") { Move-Item -Force "auth.js" "backend\routes\auth.js" }
if (Test-Path "auth1.js") { Move-Item -Force "auth1.js" "backend\middleware\auth.js" }

# qr.js route
if (Test-Path "qr.js") { Move-Item -Force "qr.js" "backend\routes\qr.js" }

# track route (track1 is the route, track is the page)
if (Test-Path "track1.js") { Move-Item -Force "track1.js" "backend\routes\track.js" }

# admin route
if (Test-Path "admin.js") { Move-Item -Force "admin.js" "backend\routes\admin.js" }

# payment route
if (Test-Path "payment.js") { Move-Item -Force "payment.js" "backend\routes\payment.js" }

# otp route
if (Test-Path "otp.js") { Move-Item -Force "otp.js" "backend\routes\otp.js" }

# export route
if (Test-Path "export.js") { Move-Item -Force "export.js" "backend\routes\export.js" }

# [qrId].js files - scan and map pages
if (Test-Path "[qrId].js") { Move-Item -Force "[qrId].js" "frontend\src\pages\scan\[qrId].js" }
if (Test-Path "[qrId]1.js") { Move-Item -Force "[qrId]1.js" "frontend\src\pages\map\[qrId].js" }

# env files
if (Test-Path "env.example") { Move-Item -Force "env.example" "backend\.env.example" }
if (Test-Path "env1.example") { Move-Item -Force "env1.example" "frontend\.env.example" }

# gitignore files
if (Test-Path "gitignore") { Move-Item -Force "gitignore" "backend\.gitignore" }
if (Test-Path "gitignore1") { Move-Item -Force "gitignore1" "frontend\.gitignore" }

# package.json - if there's a duplicate
if (Test-Path "package1.json") { Move-Item -Force "package1.json" "frontend\package.json" }

# Copy .env.example to .env for backend
if (Test-Path "backend\.env.example") {
    Copy-Item "backend\.env.example" "backend\.env" -Force
}

# Copy .env.example to .env.local for frontend
if (Test-Path "frontend\.env.example") {
    Copy-Item "frontend\.env.example" "frontend\.env.local" -Force
}

Write-Host "$moved files organized!" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open Terminal in VS Code (Ctrl + backtick)" -ForegroundColor White
Write-Host "  2. Type: cd backend" -ForegroundColor White
Write-Host "  3. Type: npm install" -ForegroundColor White
Write-Host "  4. Edit backend\.env file (add MongoDB URI)" -ForegroundColor White
Write-Host "  5. Type: npm run seed" -ForegroundColor White
Write-Host "  6. Type: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
