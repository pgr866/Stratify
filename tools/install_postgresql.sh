#!/bin/bash

# INSTALL POSTGRESQL

# Admin request
[ "$EUID" -ne 0 ] && exec sudo "$0" "$@"

# Change the current working directory to tools directory
cd "$(dirname "$0")"

# Install PostgreSQL Database
version=$(cat postgresql_version.txt | awk -F. '{print $1}')

# Add the PostgreSQL APT repository for the specified distribution
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import the PostgreSQL public GPG key to verify the repository
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update apt packages
sudo apt update -y

# Install PostgreSQL
sudo apt install -y postgresql-$version postgresql-contrib

# Check PostgreSQL version
psql --version

echo
echo PostgreSQL $version installed.
echo
read -p "Press Enter to continue..."
