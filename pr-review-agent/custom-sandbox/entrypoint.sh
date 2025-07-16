#!/bin/sh

# Set environment variables
export PATH="/usr/local/bin:$PATH"
export SHELL="/bin/bash"

if [ -z "$REPOSITORY_URL" ]; then
    echo "REPOSITORY_URL is not set"
    exit 1
fi
if [ -z "$REPOSITORY_BRANCH" ]; then
    REPOSITORY_BRANCH="main"
fi


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

# Execute curl command
echo "Running git clone of application"
COMMAND="git clone $REPOSITORY_URL -b $REPOSITORY_BRANCH repository"
curl http://localhost:8080/process \
    -X POST -d "{\"name\": \"clone-repository\", \"workingDir\": \"/app\", \"command\": \"$COMMAND\", \"waitForCompletion\": false}" \
    -H "Content-Type: application/json"
wait

