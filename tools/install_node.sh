#!/bin/bash

# INSTALL NODE.JS

# Change the current working directory to tools directory
cd "$(dirname "$0")"

# Node.js version
version=$(cat node_version.txt | awk -F. '{print $1}')

# Download and install Node.js
sudo apt install -y nodejs npm

# Check Node.js version
node -v

echo
echo "Node.js %version% installed."
echo
read -p "Press Enter to continue..."
