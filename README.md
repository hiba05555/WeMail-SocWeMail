# WeMail — Enterprise Email Platform + Custom SOC/SIEM

> Plateforme email d'entreprise avec système SOC/SIEM intégré pour la détection d'attaques en temps réel.

**ENSA Marrakech** — Équipe : Saad · Ismail · Wiam · Hiba · Malika

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser :5173                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ API Gateway │  :8080  Spring Boot
                    └──────┬──────┘
         ┌─────────┬───────┼────────┬──────────┐
         ▼         ▼       ▼        ▼          ▼
    Auth :8001  Email   Chat     Calendar   Files
    FastAPI    :8002   :3001     :3002      :8003
               FastAPI Node.js  Node.js    FastAPI
         │                                      │
         ▼                                      ▼
    PostgreSQL                               MinIO
    MongoDB · Redis

┌─────────────────────────────────────────────────────────────┐
│                   SOC Platform                               │
│   SOC Backend :8888  ←  logs de tous les services           │
│   SOC Dashboard :3100  →  alertes temps réel                │
│   Email Alerts  →  Gmail notification automatique           │
└─────────────────────────────────────────────────────────────┘
```

---

## Prérequis

```bash
Docker >= 24.0
Docker Compose >= 2.0
Node.js >= 18
Git
```

---

## Installation rapide

```bash
# 1. Clone le repo
git clone git@github.com:hiba05555/WeMail-SocWeMail.git
cd WeMail-SocWeMail

# 2. Lance tous les services backend
docker compose up -d

# 3. Lance le frontend WeMail
cd frontend/wemail-frontend
npm install && npm run dev

# 4. Lance le SOC Dashboard (nouveau terminal)
cd soc-platform/frontend
npm install && npm run dev -- --port 3100
```

---

## Accès

| Service | URL | Description |
|---------|-----|-------------|
| WeMail Frontend | http://localhost:5173 | Interface utilisateur |
| SOC Dashboard | http://localhost:3100 | Tableau de bord sécurité |
| API Gateway | http://localhost:8080 | Point d'entrée API |
| SOC Backend | http://localhost:8888 | API détection |

---

## Comptes de test

| Email | Password | Rôle |
|-------|----------|------|
| saad@wemail.io | admin123 | API Gateway |
| hiba@wemail.io | hiba123 | Email Service |
| ismail@wemail.io | ismail123 | Auth Service |
| wiam@wemail.io | wiam123 | Chat & Calendar |
| malika@wemail.io | malika123 | Files & Notifs |

> Si les comptes n'existent pas encore, utilisez le bouton **Register** sur la page login.

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + Vite |
| API Gateway | Spring Boot 3.2 + Java 21 |
| Auth | FastAPI + PostgreSQL + JWT |
| Email | FastAPI + PostgreSQL + MinIO |
| Chat | Node.js + Socket.io + MongoDB |
| Calendar | Node.js + PostgreSQL |
| Files | FastAPI + MinIO |
| Notifications | Node.js + MongoDB |
| SOC Backend | FastAPI + MongoDB |
| SOC Frontend | React + Recharts |
| CI/CD | GitHub Actions |

---

## CI/CD Pipeline

```
git push → Tests → SAST (Bandit) → Build Docker → Trivy Scan → Deploy
```

Voir `.github/workflows/ci.yml`

---

## Repo

**https://github.com/hiba05555/WeMail-SocWeMail**
