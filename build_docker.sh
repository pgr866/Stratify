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

source .env
# Get nginx SSL certificate
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d $ALLOWED_HOSTS --email $EMAIL_HOST_USER --agree-tos --no-eff-email
sudo systemctl stop nginx

# Get postgresql SSL certificate
mkdir -p ./certs
sudo openssl genrsa -aes256 -passout pass:$SSL_PASSPHRASE -out ./certs/postgresdb.key 2048
sudo openssl rsa -in ./certs/postgresdb.key -passin pass:$SSL_PASSPHRASE -out ./certs/postgresdb.key
sudo openssl req -new -key ./certs/postgresdb.key -passin pass:$SSL_PASSPHRASE -out ./certs/postgresdb.csr
sudo openssl x509 -req -in ./certs/postgresdb.csr -signkey ./certs/postgresdb.key -passin pass:$SSL_PASSPHRASE -out ./certs/postgresdb.crt -days 365
rm ./certs/postgresdb.csr
sudo chmod -R 600 ./certs
sudo chown -R 999:999 ./certs

# Install Docker Compose
sudo apt install -y docker-compose
git clone git@github.com:pgr866/TFG.git
cd TFG
sudo docker-compose up -d --build
