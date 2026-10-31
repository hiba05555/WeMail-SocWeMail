# WeMail — Plateforme e-mail d'entreprise avec SOC/SIEM intégré

> Plateforme e-mail d'entreprise en microservices, dotée d'un système SOC/SIEM maison qui détecte les attaques en temps réel et envoie des alertes automatiques.

![Docker](https://img.shields.io/badge/conteneurs-Docker-2496ED) ![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF) ![Security](https://img.shields.io/badge/s%C3%A9curit%C3%A9-SAST%20%2B%20Trivy-red)

Projet d'équipe réalisé à l'**ENSA Marrakech**.

---

## Fonctionnalités

- Messagerie avec pièces jointes (stockage objet)
- Chat en temps réel et calendrier
- Notifications
- **SOC/SIEM** : collecte des journaux de tous les services, détection d'attaques, tableau de bord d'alertes en temps réel et alertes automatiques par e-mail

---

## Architecture

```mermaid
flowchart TD
    B[Navigateur :5173] --> GW[API Gateway :8080<br/>Spring Boot]

    GW --> AUTH[Auth :8001<br/>FastAPI]
    GW --> MAIL[Email :8002<br/>FastAPI]
    GW --> CHAT[Chat :3001<br/>Node.js]
    GW --> CAL[Calendar :3002<br/>Node.js]
    GW --> FILES[Files :8003<br/>FastAPI]

    AUTH --> PG[(PostgreSQL)]
    MAIL --> PG
    CHAT --> MONGO[(MongoDB)]
    AUTH --> REDIS[(Redis)]
    MAIL --> MINIO[(MinIO)]
    FILES --> MINIO

    AUTH -. logs .-> SOC[SOC Backend :8888]
    MAIL -. logs .-> SOC
    CHAT -. logs .-> SOC
    GW -. logs .-> SOC
    SOC --> DASH[SOC Dashboard :3100]
    SOC --> ALERT[Alertes e-mail]
```

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
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

## Sécurité et DevSecOps

Pipeline exécuté à chaque push :

```
Tests → SAST (Bandit) → Build Docker → Scan Trivy → Déploiement
```

Voir `.github/workflows/ci.yml`.

- Authentification par **JWT**
- Analyse statique du code Python avec **Bandit**
- Scan des images Docker avec **Trivy**
- Supervision de sécurité centralisée par le **SOC** maison, alimenté par les journaux de tous les services

---

## Installation rapide

**Prérequis :** Docker ≥ 24, Docker Compose ≥ 2, Node.js ≥ 18, Git.

```bash
# 1. Cloner le dépôt
git clone https://github.com/hiba05555/WeMail-SocWeMail.git
cd WeMail-SocWeMail

# 2. Lancer tous les services backend
docker compose up -d

# 3. Lancer le frontend WeMail
cd frontend/wemail-frontend
npm install && npm run dev

# 4. Lancer le dashboard SOC (nouveau terminal)
cd soc-platform/frontend
npm install && npm run dev -- --port 3100
```

## Accès

| Service | URL |
|---------|-----|
| WeMail (interface) | http://localhost:5173 |
| SOC Dashboard | http://localhost:3100 |
| API Gateway | http://localhost:8080 |
| SOC Backend | http://localhost:8888 |

Pour tester, créez un compte avec le bouton **Register** de la page de connexion. Aucun identifiant n'est fourni dans ce dépôt, volontairement.

---

## Équipe

Projet réalisé à l'ENSA Marrakech par Saad, Ismail, Wiam, Hiba et Malika.

## Contact

**Hiba Chagdaly**, GitHub : [@hiba05555](https://github.com/hiba05555)
