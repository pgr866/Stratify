#!/bin/bash

# INSTALL NODE.JS

# Admin request
[ "$EUID" -ne 0 ] && exec sudo "$0" "$@"

# Change the current working directory to tools directory
cd "$(dirname "$0")"

# Node.js version
version=$(cat nodejs_version.txt | awk -F. '{print $1}')

# Add the NodeSource repository for the specified version
wget -qO- https://deb.nodesource.com/setup_$version.x | sudo -E bash -

# Update apt packages
sudo apt update -y

# Download and install Node.js
sudo apt install -y nodejs

# Check Node.js version
node -v

echo
echo "Node.js $version installed."
echo
read -p "Press Enter to continue..."
