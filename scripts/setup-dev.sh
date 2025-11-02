#!/bin/bash
set -e

echo "🚀 Setting up Spiral Dynamics MVP development environment..."
echo ""

# Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not installed. Install from https://nodejs.org/"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not installed. Install: npm install -g pnpm"; exit 1; }

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "⚠️  Node.js 18+ required (you have $(node -v))"
  exit 1
fi

echo "✅ Node.js $(node -v) found"
echo "✅ pnpm $(pnpm -v) found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo ""

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
  echo "📝 Creating .env.local from env.example..."
  cp env.example .env.local
  echo "✅ Created .env.local"
  echo ""
  echo "⚠️  IMPORTANT: Edit .env.local with your credentials:"
  echo "   - POSTGRES_URL (required)"
  echo "   - OPENAI_API_KEY (required)"
  echo "   - AUTH_SECRET (we'll generate this for you)"
  echo ""
else
  echo "✅ .env.local already exists"
  echo ""
fi

# Generate AUTH_SECRET if not set
if ! grep -q "^AUTH_SECRET=" .env.local || grep -q "^AUTH_SECRET=$" .env.local || grep -q "^AUTH_SECRET=your-secret-here" .env.local; then
  echo "🔐 Generating AUTH_SECRET..."
  SECRET=$(openssl rand -base64 32)
  
  # Remove old AUTH_SECRET line if exists
  sed -i.bak '/^AUTH_SECRET=/d' .env.local && rm .env.local.bak
  
  # Add new AUTH_SECRET
  echo "AUTH_SECRET=$SECRET" >> .env.local
  echo "✅ Generated and added AUTH_SECRET to .env.local"
  echo ""
else
  echo "✅ AUTH_SECRET already configured"
  echo ""
fi

# Check if POSTGRES_URL is set
if ! grep -q "^POSTGRES_URL=postgresql://" .env.local; then
  echo "⚠️  POSTGRES_URL not configured"
  echo "   Get a free PostgreSQL database from:"
  echo "   - Vercel Postgres: https://vercel.com/storage/postgres"
  echo "   - Neon: https://neon.tech/"
  echo "   - Supabase: https://supabase.com/"
  echo ""
  echo "   Add the connection string to .env.local"
  echo ""
fi

# Check if OPENAI_API_KEY is set
if ! grep -q "^OPENAI_API_KEY=sk-" .env.local; then
  echo "⚠️  OPENAI_API_KEY not configured"
  echo "   Get your API key from: https://platform.openai.com/api-keys"
  echo "   Add it to .env.local"
  echo ""
fi

# Run migrations if POSTGRES_URL is set
if grep -q "^POSTGRES_URL=postgresql://" .env.local; then
  echo "🗄️  Running database migrations..."
  pnpm db:migrate || echo "⚠️  Migration failed - make sure POSTGRES_URL is correct"
  echo ""
else
  echo "⏭️  Skipping migrations (POSTGRES_URL not configured)"
  echo ""
fi

# Final instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env.local with your POSTGRES_URL and OPENAI_API_KEY"
echo "  2. Run: pnpm db:migrate  (if you skipped it)"
echo "  3. Run: pnpm dev"
echo "  4. Open: http://localhost:3000"
echo ""
echo "Optional services:"
echo "  - ChromaDB (for RAG context): Set CHROMA_URL in .env.local"
echo "  - Redis (for production cache): Set REDIS_URL in .env.local"
echo ""
echo "Docs:"
echo "  - README.md - Full documentation"
echo "  - DATAFLOW.md - System architecture"
echo "  - MVP_REVIEW.md - Implementation review"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

