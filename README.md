# 🧩 Smelinx

**Smelinx** is an open-source **API lifecycle management platform**.  
It helps teams **register APIs, track versions, schedule deprecations, and notify consumers automatically**—so you ship faster while keeping clients aligned.

- ✅ Open-source • Self-hostable • Secure  
- 📬 Automated notices via [SendGrid](https://sendgrid.com)  
- 🛡️ Enterprise-friendly with role-based access control  
- 🚀 Deployable in minutes (Docker + Caddy + HTTPS)  

---

## ✨ Features

- **Centralized Registry** – Manage all your APIs with owners, metadata, and contacts.  
- **Version Lifecycle** – Mark versions as _Active_, _Deprecated_, or _Sunset_ with clear timelines.  
- **Automated Notices** – Send deprecation/sunset emails with delivery logs.  
- **Access Control** – Roles for owners, admins, and members.  
- **Insights & Adoption** – Track migrations and consumer adoption.  
- **Consumer Directory** – Store client contacts per API for precise updates.  

---


## 🏗️ Tech Stack

- **Frontend** – Next.js (App Router) + TailwindCSS  
- **Backend** – Go + chi router  
- **Database** – SQLite (Postgres optional)  
- **Email** – SendGrid integration  
- **Deployment** – Docker + Caddy (auto HTTPS via Let’s Encrypt)  

---

## 🔧 Local Development

### 1. Clone repository
```bash
git clone https://github.com/Niranjini-Kathiravan/smelinx.git
cd smelinx
```

### 2. Start frontend
```bash
cd smelinx-web
pnpm install
pnpm dev
```

Frontend runs at 👉 http://localhost:3000  

### 3. Start backend
```bash
cd ../smelinx-api
go run cmd/api/main.go
```

Backend runs at 👉 http://localhost:8080  

---

## 🚀 Deployment (EC2 + Docker + Route 53)

### Prerequisites
- AWS account with a **Route 53** domain (`smelinx.com`)  
- EC2 instance (Ubuntu 22.04, `t3.small` recommended)  
- Elastic IP attached  

---

### 1. Configure DNS (Route 53)
```
A     smelinx.com       → <Elastic IP>
A     api.smelinx.com   → <Elastic IP>
CNAME www.smelinx.com   → smelinx.com
```

---

### 2. Environment Files

**Backend (`smelinx-api/.env`)**
```dotenv
PORT=8080
COOKIE_DOMAIN=smelinx.com
CORS_ORIGINS=https://smelinx.com

SENDGRID_API_KEY=your-key
SENDGRID_FROM=notifications@smelinx.com
SENDGRID_FROM_NAME=Smelinx Notifications
```

**Frontend (`smelinx-web/.env.production`)**
```dotenv
NEXT_PUBLIC_API_URL=https://api.smelinx.com
```

---

### 3. Reverse Proxy with Caddy

`Caddyfile`
```caddy
smelinx.com, www.smelinx.com {
  encode zstd gzip
  reverse_proxy web:3000
}

api.smelinx.com {
  encode zstd gzip
  reverse_proxy api:8080
}
```

Caddy handles **SSL certificates automatically** via Let’s Encrypt.  

---

### 4. Docker Compose Setup

`docker-compose.yml`
```yaml
version: "3.9"
services:
  api:
    build: ./smelinx-api
    env_file: ./smelinx-api/.env
    volumes:
      - ./smelinx-api/data:/app/data
    expose:
      - "8080"
    restart: unless-stopped

  web:
    build:
      context: ./smelinx-web
      args:
        - NEXT_TELEMETRY_DISABLED=1
    env_file: ./smelinx-web/.env.production
    expose:
      - "3000"
    depends_on:
      - api
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web
      - api
    restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:
```

---

### 5. Deploy
```bash
docker compose build
docker compose up -d
```

Access your app at 👉 https://smelinx.com  

---

## 🗂️ Data Persistence

- SQLite DB stored at: `smelinx-api/data/smelinx.db`  
- Backup example:
```bash
cp smelinx-api/data/smelinx.db backups/smelinx-$(date +%F-%H%M).db
```

---

## 🛡️ License
Licensed under the [MIT License](LICENSE).  

---

## 🌐 Links

- 🌍 Website: [https://smelinx.com](https://smelinx.com)  
- 💻 GitHub: [Smelinx Repository](https://github.com/Niranjini-Kathiravan/smelinx)  
