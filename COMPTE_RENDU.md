# TD Final - CloudShop - Compte Rendu

## Partie 1 : Conteneurisation Docker

### Architecture
5 microservices conteneurisés :
- **Frontend** : React + Vite servi par Nginx
- **API Gateway** : Node.js Express (port 8080)
- **Auth Service** : Node.js Express (port 8081)
- **Products API** : Python FastAPI (port 8082)
- **Orders API** : Go (port 8083)

### Dockerfiles

| Service | Type | Base Image | Optimisation |
|---------|------|------------|--------------|
| Frontend | Multi-stage | node:20-alpine → nginx:alpine | Build React puis serve statique |
| API Gateway | Single | node:20-alpine | User non-root, healthcheck |
| Auth Service | Single | node:20-alpine | User non-root, healthcheck |
| Products API | Multi-stage | python:3.11-slim | Séparation build/runtime |
| Orders API | Multi-stage | golang:1.21-alpine → alpine | Binary statique |

### Sécurité appliquée
- Utilisateur non-root (appuser:1001)
- Healthchecks configurés
- .dockerignore pour exclure fichiers inutiles

### Taille des images


| Image | Taille | Cible TD |
|-------|--------|----------|
| frontend | ~20.7MB | < 50MB ✅ |
| api-gateway | ~94.8MB | < 150MB ✅ |
| auth-service | ~94.7MB | < 150MB ✅ |
| products-api | ~106MB | < 180MB ✅ |
| orders-api | ~6.77MB | < 20MB ✅ |

### Docker Compose
- Network `cloudshop-net` (bridge)
- Volume persistant `postgres-data`
- Healthchecks et depends_on
- Variables via fichier `.env`

### Validation
```bash
# Build
docker compose build

# Démarrer
docker compose up -d

# Vérifier
docker compose ps

# Tester endpoints
curl http://localhost:3000        # Frontend
curl http://localhost:8080/health # API Gateway
curl http://localhost:8081/health # Auth
curl http://localhost:8082/health # Products
curl http://localhost:8083/health # Orders
```

---

## Partie 2 : Kubernetes

### Structure des manifests
```
k8s/
├── namespaces/cloudshop-prod.yaml 
├── configs/
│   ├── configmaps/app-config.yaml
│   └── secrets/db-credentials.yaml, jwt-secret.yaml
├── statefulsets/postgres.yaml
├── deployments/ (5 fichiers)
├── services/services.yaml
└── ingress/ingress.yaml
```

### Ressources créées

| Type | Ressource | Description |
|------|-----------|-------------|
| Namespace | cloudshop-prod | Isolation de l'application |
| ConfigMap | app-config | URLs des services internes |
| Secret | db-credentials | Credentials PostgreSQL (base64) |
| Secret | jwt-secret | Clé JWT |
| StatefulSet | postgres | PostgreSQL avec PVC 1Gi |
| Deployment | frontend, api-gateway, auth-service, products-api, orders-api | 2 replicas chacun |
| Service | 5 ClusterIP | Exposition interne |
| Ingress | shop.local, api.local | Routing externe |

### Configuration des Deployments
- Requests/Limits CPU et mémoire
- Liveness et Readiness probes
- imagePullPolicy: Never (images locales)

### Création du cluster Kind
```bash
kind create cluster --name cloudshop
kubectl cluster-info --context kind-cloudshop
```

### Chargement des images dans Kind
```bash
kind load docker-image td-jour6-frontend:latest --name cloudshop
kind load docker-image td-jour6-api-gateway:latest --name cloudshop
kind load docker-image td-jour6-auth-service:latest --name cloudshop
kind load docker-image td-jour6-products-api:latest --name cloudshop
kind load docker-image td-jour6-orders-api:latest --name cloudshop
```

### Déploiement
```bash
kubectl apply -f k8s/namespaces/
kubectl apply -f k8s/configs/configmaps/
kubectl apply -f k8s/configs/secrets/
kubectl apply -f k8s/statefulsets/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress/
kubectl get pods -n cloudshop-prod
```

## Partie 3 : GitOps (ArgoCD)

### Structure
```
argocd/
├── application.yaml   # Définition de l'app à déployer
└── project.yaml       # Projet ArgoCD (permissions)
```

### Installation ArgoCD
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### Accès à l'UI
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Ouvrir https://127.0.0.1:8080
# User: admin
# Password: BLyuWuL0UK6T69NI
```

### Déploiement de l'application
```bash
kubectl apply -f argocd/project.yaml
kubectl apply -f argocd/application.yaml
```

### Fonctionnalités clés
- **Sync automatique** : `selfHeal: true` corrige les dérives
- **Prune** : Supprime les ressources non présentes dans Git
- **Rollback** : Retour à une version précédente en 1 clic

## Partie 4 : Observabilité
*À compléter*

## Partie 5 : Sécurité & SRE
*À compléter*
