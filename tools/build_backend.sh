#!/bin/bash

# BUILD BACKEND

# Admin request
[ "$EUID" -ne 0 ] && exec sudo "$0" "$@"

# Change the current working directory to the root directory
cd "$(dirname "$0")"
cd ..

# Python version
version=$(cat tools/python_version.txt | awk -F. '{print $1"."$2}')

# Create Python venv
sudo apt install -y python$version-venv
sudo mkdir venv
python$version -m venv venv
source "$(pwd)/venv/bin/activate"
sudo chmod -R 777 venv

# New Python venv path
python="$(pwd)/venv/bin/python"

# Check Python venv version
$python --version

# Install pip
sudo apt install -y wget
wget https://bootstrap.pypa.io/get-pip.py
sudo $python get-pip.py
sudo rm -rf get-pip.py

# Install libraries listed in tools/python_requirements.txt
$python -m pip install -U -r tools/python_requirements.txt

# List installed libraries
$python -m pip list

# Install and configure PostgreSQL Database
PG_VERSION=$(cat tools/postgresql_version.txt | awk -F. '{print $1}')
DB_NAME=stratify_db
DB_USER=admin
DB_PASSWORD=1234

# Stop and start PostgreSQL server
sudo systemctl stop postgresql
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo systemctl status postgresql &
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';"

# Configure Database and Roles as postgres user
sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
ALTER ROLE $DB_USER SET client_encoding TO 'utf8';
ALTER ROLE $DB_USER SET default_transaction_isolation TO 'read committed';
ALTER ROLE $DB_USER SET timezone TO 'UTC';
ALTER ROLE $DB_USER CREATEDB;
CREATE DATABASE $DB_NAME WITH OWNER $DB_USER;
\c $DB_NAME
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;
EOF

# Create Django project
#mkdir backend
#cd backend
#django-admin startproject backend .
# Start app
#$python manage.py startapp stratify
#cd ..
# Make migrations
$python backend/manage.py makemigrations stratify
# Migrate
$python backend/manage.py migrate
# Create superuser
$python backend/manage.py createsuperuser

# Stop PostgreSQL server
sudo systemctl stop postgresql

echo
echo "Backend built."
echo
read -p "Press Enter to continue..."
