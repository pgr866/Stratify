# Add Docker's official GPG key:
sudo apt update
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-compose
git clone git@github.com:pgr866/TFG.git
# Get SSL certificate
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d stratify.eastus.cloudapp.azure.com
read -p "Press any key to continue..."
# Run docker-compose
cd TFG
docker-compose up -d --build
docker ps