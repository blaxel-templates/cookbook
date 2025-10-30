#!/bin/sh

# Pre-warm Next.js .next cache script
# This script starts the dev server, waits for successful compilation, then gracefully shuts down

set -e

TIMEOUT=${PREWARM_TIMEOUT:-30}
PORT=${PORT:-3000}
CHECK_INTERVAL=2
ELAPSED=0

echo "🚀 Starting Next.js cache pre-warming..."
echo "   Timeout: ${TIMEOUT}s"
echo "   Port: ${PORT}"

# Start npm run dev in background and capture its PID
npm run dev &
DEV_PID=$!

# Function to cleanup on exit
cleanup() {
    if [ -n "$DEV_PID" ] && kill -0 $DEV_PID 2>/dev/null; then
        echo "🛑 Stopping dev server (PID: $DEV_PID)..."
        kill -TERM $DEV_PID
        wait $DEV_PID 2>/dev/null || true
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Wait for the server to be ready
echo "⏳ Waiting for Next.js to compile..."

while [ $ELAPSED -lt $TIMEOUT ]; do
    # Check if .next directory exists and has content
    if [ -d ".next" ] && [ -n "$(ls -A .next 2>/dev/null)" ]; then
        # Check if the server is responding (optional, requires curl)
        if command -v curl >/dev/null 2>&1; then
            if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}" | grep -q "200\|404"; then
                echo "✅ Next.js server is ready and .next cache is populated!"

                # Optional: Make a few requests to warm up more pages
                echo "📦 Warming up additional routes..."
                curl -s "http://localhost:${PORT}/" > /dev/null 2>&1 || true
                curl -s "http://localhost:${PORT}/api/generate" > /dev/null 2>&1 || true

                # List cache contents
                echo "📂 .next cache contents:"
                du -sh .next/* 2>/dev/null | head -10 || true

                # Success - exit gracefully
                exit 0
            fi
        else
            # If curl is not available, just check for .next directory
            if [ -f ".next/BUILD_ID" ]; then
                echo "✅ .next cache created successfully (BUILD_ID found)"
                echo "📂 .next cache contents:"
                ls -la .next/ 2>/dev/null | head -10 || true
                exit 0
            fi
        fi
    fi

    # Check if dev process is still running
    if ! kill -0 $DEV_PID 2>/dev/null; then
        echo "⚠️  Dev server stopped unexpectedly"
        exit 1
    fi

    sleep $CHECK_INTERVAL
    ELAPSED=$((ELAPSED + CHECK_INTERVAL))
    echo "   ... ${ELAPSED}s elapsed"
done

echo "⏱️  Timeout reached after ${TIMEOUT}s"

# Check final state
if [ -d ".next" ] && [ -n "$(ls -A .next 2>/dev/null)" ]; then
    echo "✅ .next cache was created (may be partial)"
    echo "📂 .next cache contents:"
    ls -la .next/ 2>/dev/null | head -10 || true
    exit 0
else
    echo "⚠️  .next cache was not created"
    exit 1
fi
