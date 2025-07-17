#!/bin/sh

# Set environment variables
export PATH="/usr/local/bin:$PATH"

# Start sandbox-api in the background
/usr/local/bin/sandbox-api &

# Function to wait for port to be available
wait_for_port() {
    local port=$1
    local timeout=30
    local count=0

    echo "Waiting for port $port to be available..."

    while ! nc -z localhost $port; do
        sleep 1
        count=$((count + 1))
        if [ $count -gt $timeout ]; then
            echo "Timeout waiting for port $port"
            exit 1
        fi
    done

    echo "Port $port is now available"
}

# Wait for port 8080 to be available
wait_for_port 8080

# Do some execution here
# Example
echo "Running Next.js dev server..."
curl http://localhost:8080/process -X POST -d '{"name": "dev-server", "workingDir": "/app", "command": "npm run dev", "waitForCompletion": false}' -H "Content-Type: application/json"


wait

