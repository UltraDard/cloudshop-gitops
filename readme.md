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

# tester avec trivy
```bash
trivy image -q td-jour6-frontend:latest | findstr "Total"
trivy image -q td-jour6-api-gateway:latest | findstr "Total"
trivy image -q td-jour6-auth-service:latest | findstr "Total"
trivy image -q td-jour6-products-api:latest | findstr "Total"
trivy image -q td-jour6-orders-api:latest | findstr "Total"
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
| Composant | Outil | Statut |
|-----------|-------|--------|
| Metrics Server | Prometheus | Opérationnel ✅ |
| Visualisation | Grafana | Opérationnel ✅ |
| Alerting | Alertmanager | Opérationnel ✅ |

### Installation via Helm
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
kubectl create namespace monitoring
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false \
  --set grafana.adminPassword=admin123
```

### Accès aux outils
- **Prometheus** : `kubectl port-forward svc/prometheus-operated 9090:9090 -n monitoring` ([http://localhost:9090](http://localhost:9090))
- **Grafana** : `kubectl port-forward svc/prometheus-grafana 3001:80 -n monitoring` ([http://localhost:3001](http://localhost:3001))
  - User: `admin` / Password: `admin123`
- **Alertmanager** : `kubectl port-forward svc/prometheus-kube-prometheus-alertmanager 9093:9093 -n monitoring` ([http://localhost:9093](http://localhost:9093))

### Configuration effectuée
- **ServiceMonitors** : Créés pour les 4 microservices backend pour le scraping automatique des métriques `/metrics`.
- **Alerting Rules** : Alertes configurées pour HighErrorRate, HighLatencyP95, PodCrashLooping, et PodNotReady.
- **Dashboards** : Importation automatique du dashboard "CloudShop - Overview" via ConfigMap.

## Partie 5 : Sécurité & SRE

### Policy as Code (Kyverno)
- **Installation** : Kyverno déployé en mode Admission Controller pour le filtrage en amont des déploiements.
- **Policies implémentées** :
  - `disallow-latest-tag` : Interdiction stricte de l'usage du tag `:latest` (testé et bloqué).
  - `require-resources` : Obligation de définir les `requests` et `limits` (CPU/RAM).
  - `disallow-privileged` : Blocage des conteneurs privilégiés pour réduire la surface d'attaque.
- **Validation** : Tentative de déploiement de `nginx:latest` bloquée par webhook.

### Runtime Security (Falco)
- **Installation** : Falco déployé via Helm.
- **Règles personnalisées** :
  - Détection d'ouverture de shell interactif dans les conteneurs frontend/gateway.
  - Surveillance des écritures dans `/root` et lecture des fichiers sensibles (`/etc/shadow`).
  - Alertes sur les connexions réseau sortantes inattendues.

### CI/CD Sécurisé (Cosign)
- **Signature d'images** : Workflow GitHub Actions (`.github/workflows/docker-ci.yml`) intégrant la signature via Cosign pour chaque changement.
- **Vérification** : ClusterPolicy Kyverno en place pour n'accepter que les images signées par la clé publique de l'organisation.

### SLO & Error Budget
- **Objectif** : 99.9% de disponibilité calculé via Prometheus.
- **Visualisation** : Dashboard Grafana dédié affichant l'Error Budget (en % et minutes) et le Burn Rate.
- **Requêtes PromQL** : Définition des taux d'erreur sur 30j pour le calcul automatique de la fiabilité.

### Chaos Engineering (Litmus)
- **Expérience** : Suppression aléatoire de pods (`pod-delete`) sur le service frontend.
- **Résultat** : Kubernetes a automatiquement recréé les pods, maintenant la disponibilité (probe HTTP 200 passée avec succès).
