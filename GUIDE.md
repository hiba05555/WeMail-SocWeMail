# WeMail — Guide Complet de l'Équipe

> **ENSA Marrakech** | Saad · Ismail · Wiam · Hiba · Malika | 14 Mars 2026

---

## Table des matières

1. Prérequis
2. Clone et structure
3. Configuration
4. Lancement des services
5. Vérification
6. Créer les comptes
7. SOC Platform
8. Simuler des attaques
9. Structure du projet
10. Troubleshooting

---

## 1. Prérequis

Installe ces outils avant de commencer :

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verifier les versions
docker --version        # >= 24.0
docker compose version  # >= 2.0
node --version          # >= 18
git --version
```

---

## 2. Clone et structure

```bash
git clone git@github.com:hiba05555/WeMail-SocWeMail.git
cd WeMail-SocWeMail
```

Structure du repo :

```
WeMail-SocWeMail/
├── api-gateway/              # Spring Boot :8080
├── auth-service/             # FastAPI :8001
├── email-service/            # FastAPI :8002
├── chat-service/             # Node.js :3001
├── calendar-service/         # Node.js :3002
├── file-storage-service/     # FastAPI :8003
├── notification-service/     # Node.js :3003
├── frontend/wemail-frontend/ # React :5173
├── soc-platform/backend/     # FastAPI :8888
├── soc-platform/frontend/    # React :3100
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## 3. Lancement des services

### Backend (Docker)

```bash
docker compose up -d
```

Attendre 30 secondes que tous les services demarrent.

### Frontend WeMail

```bash
cd frontend/wemail-frontend
npm install && npm run dev
```

Ouvre http://localhost:5173

### SOC Dashboard

```bash
cd soc-platform/frontend
npm install && npm run dev -- --port 3100
```

Ouvre http://localhost:3100

---

## 4. Verification

```bash
docker compose ps
curl http://localhost:8001/health
curl http://localhost:8888/health
```

---

## 5. Creer les comptes

```bash
for user in "saad,saad,Saad,admin123" "hiba,hiba,Hiba,hiba123" "ismail,ismail,Ismail,ismail123" "wiam,wiam,Wiam,wiam123" "malika,malika,Malika,malika123"; do
  IFS=',' read -r email username fullname password <<< "$user"
  curl -s -X POST http://localhost:8001/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}@wemail.io\",\"username\":\"${username}\",\"full_name\":\"${fullname}\",\"password\":\"${password}\"}"
  echo ""
done
```

---

## 6. SOC Platform

### Attaques detectees

| Regle | Declencheur | Severite |
|-------|-------------|----------|
| brute_force | 5+ logins echoues en 60s | CRITICAL |
| sql_injection | OR 1=1 dans les champs | CRITICAL |
| xss | script dans les champs | HIGH |
| mass_registration | 3+ comptes en 60s | HIGH |
| large_file_upload | Fichier > 50MB | MEDIUM |
| path_traversal | ../ dans les URLs | HIGH |
| cmd_injection | ;ls dans les champs | CRITICAL |

---

## 7. Simuler des attaques

### Brute Force

```bash
for i in {1..6}; do
  curl -s -X POST http://localhost:8888/api/logs \
    -H "Content-Type: application/json" \
    -d '{"service":"auth","event_type":"login_failed","ip":"192.168.1.100","email":"test@wemail.io","details":{}}'
done
```

### SQL Injection

```bash
cat > /tmp/sqli.json << EOF2
{"service":"email","event_type":"email_sent","ip":"10.0.0.1","email":"test@wemail.io","details":{"subject":"test OR 1=1 --"}}
EOF2
curl -s -X POST http://localhost:8888/api/logs -H "Content-Type: application/json" -d @/tmp/sqli.json
```

### Verifier les alertes

```bash
curl -s http://localhost:8888/api/alerts | python3 -m json.tool
```

---

## 8. Structure des services

### Ports

| Service | Port | Tech |
|---------|------|------|
| Frontend WeMail | 5173 | React |
| API Gateway | 8080 | Spring Boot |
| Auth Service | 8001 | FastAPI |
| Email Service | 8002 | FastAPI |
| Chat Service | 3001 | Node.js |
| Calendar Service | 3002 | Node.js |
| File Storage | 8003 | FastAPI |
| Notification | 3003 | Node.js |
| SOC Backend | 8888 | FastAPI |
| SOC Dashboard | 3100 | React |
| PostgreSQL | 5432 | - |
| MongoDB | 27017 | - |
| Redis | 6379 | - |
| MinIO | 9000 | - |

---

## 9. Troubleshooting

### Container en erreur

```bash
docker compose logs auth-service --tail=30
docker rm -f wemail-auth && docker compose up -d auth-service
```

### Failed to fetch dans le frontend

```bash
docker compose up -d
curl http://localhost:8080/actuator/health
```

### CORS error

```bash
docker compose up -d --build auth-service email-service file-storage-service
```

### Gateway lent a demarrer

Spring Boot prend 30-60 secondes. Normal.

```bash
sleep 30 && curl http://localhost:8080/actuator/health
```

### Tout reinitialiser

```bash
docker compose down -v
docker compose up -d
```

---

## 10. Commandes utiles

```bash
docker compose up -d              # Demarrer tout
docker compose down               # Arreter tout
docker compose ps                 # Etat des services
docker compose logs -f            # Logs en temps reel
docker compose restart <service>  # Redemarrer un service
docker compose up -d --build <s>  # Rebuild apres modif
```

---

*WeMail SOC Platform — ENSA Marrakech — 2026*
