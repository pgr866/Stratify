#!/bin/bash
sudo apt update -y
sudo apt upgrade -y
sudo apt install -y grub-common grub-efi-amd64-bin grub-efi-amd64-signed grub-pc grub-pc-bin grub2-common

source .env
# Get nginx SSL certificate
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d $ALLOWED_HOST --email $EMAIL_HOST_USER --agree-tos --no-eff-email
sudo systemctl stop nginx

# Get postgresql SSL certificate
sudo openssl genrsa -aes256 -passout pass:$SSL_PASSPHRASE -out /etc/ssl/private/postgresdb.key 2048
sudo openssl req -new -key /etc/ssl/private/postgresdb.key -passin pass:$SSL_PASSPHRASE -out /etc/ssl/certs/postgresdb.csr
sudo openssl x509 -req -in /etc/ssl/certs/postgresdb.csr -signkey /etc/ssl/private/postgresdb.key -passin pass:$SSL_PASSPHRASE -out /etc/ssl/certs/postgresdb.crt -days 365
sudo rm -rf /etc/ssl/certs/postgresdb.csr
sudo chmod 600 /etc/ssl/private/postgresdb.key
sudo chmod 600 /etc/ssl/certs/postgresdb.crt
sudo chown 999:999 /etc/ssl/private/postgresdb.key
sudo chown 999:999 /etc/ssl/certs/postgresdb.crt

# Install Docker Compose
sudo apt install -y docker-compose
sudo docker-compose up -d --build
