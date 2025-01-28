#!/bin/bash
#sudo chmod +x ubuntu_server_deploy.sh && ./ubuntu_server_deploy.sh
sudo apt update -y
sudo apt -o APT::Get::Always-Include-Phased-Updates=true upgrade -y

# Load .env
sudo apt install -y dos2unix
dos2unix .env
sudo chmod +r .env
source .env

# Get nginx SSL certificate
if sudo test ! -f "/etc/letsencrypt/live/${ALLOWED_HOST}/fullchain.pem" || sudo test ! -f "/etc/letsencrypt/live/${ALLOWED_HOST}/privkey.pem"; then
    sudo rm -rf "/etc/letsencrypt/live/${ALLOWED_HOST}"
    sudo apt purge -y nginx certbot python3-certbot-nginx
    sudo apt install -y nginx certbot python3-certbot-nginx
    sudo certbot --nginx -d $ALLOWED_HOST --email $EMAIL_HOST_USER --agree-tos --no-eff-email
fi
sudo systemctl stop nginx

# Get postgresql SSL certificate
if sudo test ! -f /etc/ssl/private/postgresdb.key || sudo test ! -f /etc/ssl/certs/postgresdb.crt; then
    sudo rm -rf /etc/ssl/private/postgresdb.key /etc/ssl/certs/postgresdb.crt
    sudo openssl genrsa -aes256 -passout pass:$SSL_PASSPHRASE -out /etc/ssl/private/postgresdb.key 2048
    sudo openssl req -new -key /etc/ssl/private/postgresdb.key -passin pass:$SSL_PASSPHRASE -out /etc/ssl/certs/postgresdb.csr
    sudo openssl x509 -req -in /etc/ssl/certs/postgresdb.csr -signkey /etc/ssl/private/postgresdb.key -passin pass:$SSL_PASSPHRASE -out /etc/ssl/certs/postgresdb.crt -days 365
    sudo rm -rf /etc/ssl/certs/postgresdb.csr
    sudo chmod 600 /etc/ssl/private/postgresdb.key
    sudo chmod 600 /etc/ssl/certs/postgresdb.crt
    sudo chown 999:999 /etc/ssl/private/postgresdb.key
    sudo chown 999:999 /etc/ssl/certs/postgresdb.crt
fi

# Install Docker
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Run Docker
sudo service docker start
bash -c 'sudo docker compose down && sudo docker compose up -d --build'
