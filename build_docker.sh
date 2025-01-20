#!/bin/bash
# Add Docker's official GPG key:
sudo apt update -y
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update -y
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

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
sudo openssl rsa -in /etc/ssl/private/postgresdb.key -passin pass:$SSL_PASSPHRASE -out /etc/ssl/private/postgresdb.key
sudo openssl req -new -key /etc/ssl/private/postgresdb.key -passin pass:$SSL_PASSPHRASE -out /etc/ssl/certs/postgresdb.csr
sudo openssl x509 -req -in /etc/ssl/certs/postgresdb.csr -signkey /etc/ssl/private/postgresdb.key -passin pass:$SSL_PASSPHRASE -out /etc/ssl/certs/postgresdb.crt -days 365
sudo rm -rf /etc/ssl/certs/postgresdb.csr
sudo chmod 600 /etc/ssl/private/postgresdb.key
sudo chmod 600 /etc/ssl/certs/postgresdb.crt
sudo chown 999:999 /etc/ssl/private/postgresdb.key
sudo chown 999:999 /etc/ssl/certs/postgresdb.crt

# Install Docker Compose
sudo apt install -y docker-compose
git clone git@github.com:pgr866/TFG.git
cd TFG
sudo docker-compose up -d --build
