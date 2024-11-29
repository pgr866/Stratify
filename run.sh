#!/bin/bash

# RUN SERVERS

# Change the current working directory to the directory where the bash script is located
cd "$(dirname "$0")"

# Run PostgreSQL server
sudo systemctl stop postgresql
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql &

# Python venv path
python="$(pwd)/venv/bin/python"

# Run Django server
gnome-terminal -- bash -c "$python backend/manage.py runserver; exec bash"

# Run Node.js server
cd frontend
gnome-terminal -- bash -c "npm run dev; exec bash"
