#!/bin/bash

# RUN DJANGO TESTS

# Change the current working directory to the root directory
cd "$(dirname "$0")"
cd ..

# Python venv path
python="$(pwd)/venv/bin/python"

# Run Django Tests
$python backend/manage.py test stratify

echo
echo "Django tests run successfully"
echo
