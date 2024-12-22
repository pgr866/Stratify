#!/bin/bash

# FRONTEND FRONTEND

# Change the current working directory to the root directory
cd "$(dirname "$0")"
cd ..

# Uncomment all to create a new Vite.js project
#sudo rm -rf frontend
#npm create vite@latest frontend -- --template react-ts
# Node.js configuration
cd frontend
npm i
#npm i react-router-dom react-hook-form axios js-cookie @react-oauth/google lightweight-charts lucide-react
#npm i -D autoprefixer postcss tailwindcss @types/node
#npx tailwindcss init -p

# Configure shadcnui for vite: follow https://ui.shadcn.com/docs/
#npx shadcn@latest init
#npx shadcn@latest add button calendar card dialog input label popover scroll-area toast

echo
echo "Frontend built."
echo
read -p "Press Enter to continue..."
