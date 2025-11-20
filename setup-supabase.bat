@echo off
REM =============================================================================
REM Supabase Setup Script for Windows - Run this on your local machine
REM =============================================================================

echo.
echo ============================================
echo    Supabase Setup for Know Thyself MVP
echo ============================================
echo.

REM Step 1: Pull latest changes
echo Step 1: Pulling latest changes from git...
git pull origin claude/review-latest-changes-014JaQQmrm27RZ7hSzdyb4wF
if errorlevel 1 (
    echo [ERROR] Git pull failed. Please resolve any conflicts and try again.
    pause
    exit /b 1
)
echo [OK] Git pull successful
echo.

REM Step 2: Install dependencies
echo Step 2: Installing npm dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed. Please check your internet connection.
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Step 3: Create .env file
echo Step 3: Creating .env file...
(
echo # =============================================================================
echo # SUPABASE DATABASE CONNECTION
echo # =============================================================================
echo DATABASE_URL="postgresql://postgres:ParamedicInCompute@db.barxdvlwfyvhnxodwnmh.supabase.co:5432/postgres"
echo.
echo # =============================================================================
echo # API KEYS
echo # =============================================================================
echo # Add your Claude API key here
echo ANTHROPIC_API_KEY=your_api_key_here
echo.
echo # =============================================================================
echo # SERVER CONFIGURATION
echo # =============================================================================
echo PORT=3001
echo NODE_ENV=development
echo.
echo # =============================================================================
echo # FEATURES
echo # =============================================================================
echo ENABLE_CACHING=true
echo CACHE_TTL_MINUTES=5
echo LOG_LEVEL=info
) > .env
echo [OK] .env file created
echo.

REM Step 4: Generate Prisma client
echo Step 4: Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo [ERROR] Prisma generate failed. Please check the error above.
    pause
    exit /b 1
)
echo [OK] Prisma client generated
echo.

REM Step 5: Push schema to Supabase
echo Step 5: Pushing database schema to Supabase...
call npx prisma db push
if errorlevel 1 (
    echo [ERROR] Database push failed. Please check your connection string in .env
    pause
    exit /b 1
)
echo [OK] Database schema pushed to Supabase
echo.

REM Final summary
echo.
echo ================================================
echo          SUPABASE SETUP COMPLETE!
echo ================================================
echo.
echo Your database tables have been created in Supabase:
echo   [OK] Session
echo   [OK] Message
echo   [OK] VitalSignsLog
echo   [OK] PerformanceData
echo   [OK] Student
echo.
echo IMPORTANT: Don't forget to add your Claude API key to .env
echo    Edit .env and replace: your_api_key_here
echo.
echo View your database:
echo    - Supabase Dashboard: https://supabase.com/dashboard/project/barxdvlwfyvhnxodwnmh
echo    - Local Prisma Studio: npx prisma studio
echo.
echo Start your server:
echo    npm run server
echo.
echo ================================================
echo.
pause
