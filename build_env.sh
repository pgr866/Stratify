#!/bin/bash

# BUILD ENVIRONMENT

echo Installing Python...
cd tools
./install_python.sh

echo Installing PostgreSQL...
./install_postgresql.sh

echo Building Backend...
./build_backend.sh

echo Installing Node.js...
./install_node.sh

echo Building Frontend...
./build_frontend.sh

echo
echo "Environment setup completed."
echo
read -p "Press Enter to continue..."
