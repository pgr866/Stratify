#!/bin/bash

# FRONTEND BACKEND

# Change the current working directory to the root directory
cd "$(dirname "$0")"
cd ..

# Node.js configuration: React, JavaScript
#npm create vite@latest frontend
#cp -f tools/package.json frontend/package.json
cd frontend
npm install
#npm install react-router-dom react-hot-toast axios js-cookie @react-oauth/google react-hook-form react-select rsuite lightweight-charts
#npm install -D tailwindcss postcss autoprefixer @babel/plugin-proposal-private-property-in-object
#npx tailwindcss init -p

echo
echo "Frontend built."
echo
read -p "Press Enter to continue..."
