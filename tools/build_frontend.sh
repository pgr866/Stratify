#!/bin/bash

# FRONTEND FRONTEND

# Change the current working directory to the root directory
cd "$(dirname "$0")"
cd ..

# Node.js configuration
#npm create vite@latest frontend -- --template react-ts
#cp -f tools/package.json frontend/package.json
cd frontend
npm install
#npm install react-router-dom react-hook-form react-hot-toast axios js-cookie @react-oauth/google react-select rsuite lightweight-charts
#npm install -D autoprefixer postcss tailwindcss
#npx tailwindcss init -p
# Configure shadcnui
#npx shadcn@latest init
#npx shadcn@latest add button dropdown-menu

echo
echo "Frontend built."
echo
read -p "Press Enter to continue..."
