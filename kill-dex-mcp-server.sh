#!/bin/zsh
# kill-dex-mcp-server.sh
# Kills any running Dex MCP server (node dist/index.js) in this project directory

PIDS=$(ps aux | grep 'node dist/index.js' | grep 'dex-mcp-server' | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
  echo "No Dex MCP server process found."
else
  echo "Killing Dex MCP server process(es): $PIDS"
  kill $PIDS
fi
