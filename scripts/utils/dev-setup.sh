#!/bin/bash

# 🚀 Development Environment Setup Script
# Ensures optimal development environment for Rowan app

echo "🚀 Setting up Rowan development environment..."

# Check if Docker Desktop is running
if ! docker info >/dev/null 2>&1; then
    echo "🐳 Starting Docker Desktop..."
    open -a "Docker Desktop"
    echo "   Waiting for Docker to start..."

    # Wait for Docker to be ready (max 60 seconds)
    counter=0
    while ! docker info >/dev/null 2>&1 && [ $counter -lt 60 ]; do
        sleep 2
        counter=$((counter + 2))
        echo "   Still waiting... (${counter}s)"
    done

    if docker info >/dev/null 2>&1; then
        echo "   ✅ Docker Desktop is now running!"
    else
        echo "   ❌ Docker failed to start within 60 seconds"
        echo "   💡 You can still work without Docker for remote operations"
    fi
else
    echo "✅ Docker Desktop is already running!"
fi

# Check Supabase CLI connection
echo ""
echo "🔍 Testing Supabase CLI connection..."
if npx supabase projects list >/dev/null 2>&1; then
    echo "✅ Supabase CLI connected successfully!"
else
    echo "❌ Supabase CLI connection failed"
    echo "💡 Check your internet connection and Supabase credentials"
fi

# Validate database tables
echo ""
echo "🗄️  Validating database setup..."
npm run validate-db

echo ""
echo "🎉 Development environment ready!"
echo ""
echo "📋 Available commands:"
echo "  npm run dev              - Start development server"
echo "  npm run validate-db      - Validate database setup"
echo "  npx supabase migration list  - Check migration status"
echo "  npx supabase db push     - Push migrations to remote"
echo ""