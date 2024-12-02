#!/bin/bash

# RUN SERVERS

# Change the current working directory to the root directory
cd "$(dirname "$0")"

# Python venv path
python="$(pwd)/backend/venv/bin/python"

# Run PostgreSQL and Django servers
gnome-terminal -- bash -c "sudo systemctl stop postgresql; clear; sudo systemctl start postgresql; gnome-terminal -- bash -c '$python backend/manage.py runserver; exec bash'; sudo systemctl status postgresql; exec bash"

# Run Node.js server
cd frontend
gnome-terminal -- bash -c "npm run dev; exec bash"
