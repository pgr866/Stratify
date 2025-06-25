# 🚀 Stratify: Full Stack Platform for Algorithmic Crypto Trading Strategies

## 🌟 Introduction
Welcome to **Stratify**, a full stack web application developed as part of a Bachelor's Final Project at the University of Almería. This platform is designed to facilitate the **creation, simulation, and execution of algorithmic trading strategies** on cryptocurrency markets. It aims to **democratize access** to automated investment tools through an intuitive interface and powerful backend services.

## 🛠️ Technologies Used

- ⚛️ **Frontend**: React (Vite + TypeScript), Tailwind CSS, Shadcn/ui  
- 🐍 **Backend**: Django REST Framework (Python)  
- 🐘 **Database**: PostgreSQL  
- 🔐 **Authentication**: JWT, Google OAuth, GitHub OAuth, Email verification via SMTP  
- 🔄 **Exchange Integration**: CCXT (CryptoCurrency eXchange Trading Library)  
- 📊 **Technical Indicators**: TA-Lib  
- 🧠 **Graphical Visualization**: Lightweight Charts  
- 🔄 **Cache**: Redis  
- 🐳 **Containers**: Docker  
- 🌐 **Web Server**: Nginx  
- ☁️ **Deployment**: Microsoft Azure (Ubuntu Server)  
- 🔒 **Security**: SSL/TLS, secure cookie-based token persistence

## 🚀 Quick Start

### 1️⃣ Requirements
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.
- A `.env` file with appropriate credentials and secrets (see below).

### 2️⃣ Environment Variables (`.env` template)
```env
DEBUG=True
SECRET_KEY='your-django-secret-key'
ALLOWED_HOSTS=your-domain.com

DB_NAME=stratify_db
DB_USER=admin
DB_PASSWORD=your-secure-password

EMAIL_HOST_USER=example@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

REDIS_PASSWORD=your-redis-password

VITE_GOOGLE_CLIENT_ID=your-google-client-id
GITHUB_CLIENT_SECRET=your-github-secret
```

## 🏗️ Deployment

### 🛠️ Production (Ubuntu + Azure)
- Set `DEBUG=False` in your `.env`.
- Run the secure setup script on your Azure VM:
```bash
sudo chmod +x secure_ubuntu_server.sh && ./secure_ubuntu_server.sh
```
- Run the deployment script:
```bash
sudo chmod +x ubuntu_server_deploy.sh && ./ubuntu_server_deploy.sh
```

### 👨‍💻 Development
- Set `DEBUG=True`
- Uncomment ports and develop blocks in `docker-compose.yml`.
- Start the app:
```bash
docker compose up --build --watch
```

## 📐 Features Overview

### ✅ User Authentication
- Sign up/login with JWT, OAuth (Google & GitHub), and email verification.
- Secure token storage via HTTP-only cookies.

### 📈 Strategy Management
- Create/edit trading strategies with visual rule configuration.
- View Japanese candlestick charts and overlay technical indicators.

### 📊 Execution & Metrics
- Real-time and simulated trading via CCXT API.
- View detailed reports and performance metrics post-execution.

### 🧪 API & Usability Testing
- API endpoints tested using Postman.
- Usability evaluated through user studies.

## 💡 Motivation
Stratify was created to empower non-technical users by lowering barriers to algorithmic crypto trading. It transforms the volatility of crypto markets into an accessible opportunity by providing a simple, educational, and secure platform.

## 📚 Academic Context
This project was developed as a **Bachelor’s Thesis (TFG)** at the University of Almería (2024/2025), by Pablo Gómez Rivas under the supervision of **Manel Mena Vicente** and **Luis Fernando Iribarne Martínez**.
