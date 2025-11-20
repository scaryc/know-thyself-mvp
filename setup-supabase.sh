#!/bin/bash
# =============================================================================
# Supabase Setup Script - Run this on your local machine
# =============================================================================

echo "🚀 Starting Supabase Setup..."
echo ""

# Step 1: Pull latest changes
echo "📥 Step 1: Pulling latest changes from git..."
git pull origin claude/review-latest-changes-014JaQQmrm27RZ7hSzdyb4wF
if [ $? -ne 0 ]; then
    echo "❌ Git pull failed. Please resolve any conflicts and try again."
    exit 1
fi
echo "✅ Git pull successful"
echo ""

# Step 2: Install dependencies
echo "📦 Step 2: Installing npm dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ npm install failed. Please check your internet connection and try again."
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Step 3: Create .env file
echo "📝 Step 3: Creating .env file..."
cat > .env << 'EOF'
# =============================================================================
# SUPABASE DATABASE CONNECTION
# =============================================================================
DATABASE_URL="postgresql://postgres:ParamedicInCompute@db.barxdvlwfyvhnxodwnmh.supabase.co:5432/postgres"

# =============================================================================
# API KEYS
# =============================================================================
# Add your Claude API key here
ANTHROPIC_API_KEY=your_api_key_here

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
PORT=3001
NODE_ENV=development

# =============================================================================
# FEATURES
# =============================================================================
ENABLE_CACHING=true
CACHE_TTL_MINUTES=5
LOG_LEVEL=info
EOF
echo "✅ .env file created"
echo ""

# Step 4: Generate Prisma client
echo "🔧 Step 4: Generating Prisma client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Prisma generate failed. Please check the error above."
    exit 1
fi
echo "✅ Prisma client generated"
echo ""

# Step 5: Push schema to Supabase
echo "☁️  Step 5: Pushing database schema to Supabase..."
npx prisma db push
if [ $? -ne 0 ]; then
    echo "❌ Database push failed. Please check your connection string in .env"
    exit 1
fi
echo "✅ Database schema pushed to Supabase"
echo ""

# Step 6: Verify connection
echo "🔍 Step 6: Testing server connection..."
echo "Starting server for 5 seconds to verify connection..."
timeout 5 npm run server 2>&1 | grep -E "(Connected|running|Error)" || true
echo ""

# Final summary
echo "================================================"
echo "✅ SUPABASE SETUP COMPLETE!"
echo "================================================"
echo ""
echo "Your database tables have been created in Supabase:"
echo "  ✓ Session"
echo "  ✓ Message"
echo "  ✓ VitalSignsLog"
echo "  ✓ PerformanceData"
echo "  ✓ Student"
echo ""
echo "📌 IMPORTANT: Don't forget to add your Claude API key to .env"
echo "   Edit .env and replace: your_api_key_here"
echo ""
echo "🌐 View your database:"
echo "   • Supabase Dashboard: https://supabase.com/dashboard/project/barxdvlwfyvhnxodwnmh"
echo "   • Local Prisma Studio: npx prisma studio"
echo ""
echo "🚀 Start your server:"
echo "   npm run server"
echo ""
echo "================================================"
