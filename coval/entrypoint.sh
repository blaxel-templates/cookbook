#!/bin/sh

HOSTNAME=0.0.0.0 PORT=3000 node /app/server.js &

nginx -g "daemon off;"

wait