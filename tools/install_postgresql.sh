#!/bin/bash

# INSTALL POSTGRESQL

# Change the current working directory to the root directory
cd "$(dirname "$0")"
cd ..

# Install PostgreSQL Database
PG_VERSION=$(cat postgresql_version.txt | awk -F. '{print $1}')
DB_NAME=stratify_db
DB_USER=admin
DB_PASSWORD=1234

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Check PostgreSQL version
psql --version

echo
echo PostgreSQL $PG_VERSION installed.
echo
read -p "Press Enter to continue..."
