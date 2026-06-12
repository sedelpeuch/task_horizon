# TaskHorizon

Projet de portfolio personnel pour démontrer des compétences **backend et DevOps** : conception d'API REST, conteneurisation, orchestration Kubernetes multi-environnement et automatisation CI/CD complète.

## Contexte

La plupart des projets professionnels impliquent une infrastructure existante, des contraintes organisationnelles et rarement l'opportunité de concevoir un pipeline de bout en bout. TaskHorizon est une application de gestion de tâches Kanban construite from scratch pour servir de terrain d'expérimentation : elle n'a pas d'ambition produit, mais elle contraint à prendre de vraies décisions d'architecture — choix de la stack, stratégie de déploiement multi-environnement, gestion des secrets, résilience en production.

L'interface web React existe comme support fonctionnel pour rendre l'application utilisable ; elle n'est pas l'objet du projet.

---

## API REST avec FastAPI

L'API expose quatre ressources — utilisateurs, tâches, colonnes, étiquettes — via des endpoints versionnés sous le préfixe `/api/v1/`. Le versionnage est appliqué dès le départ : ajouter `/api/v2/` plus tard ne cassera rien de l'existant.

### Architecture en couches

Le code suit une séparation stricte entre responsabilités. Les schemas Pydantic (`TaskCreate`, `TaskUpdate`, `TaskResponse`) forment une couche de validation et de sérialisation indépendante des modèles ORM SQLAlchemy. L'API ne retourne jamais directement un objet ORM — ce qui évite d'exposer accidentellement des champs internes, des relations lazy-loaded ou des détails d'implémentation base de données.

La session SQLAlchemy est injectée dans chaque endpoint via le système de dépendances de FastAPI. Chaque requête obtient une session propre, ouverte au début du traitement et fermée à la fin, même en cas d'exception — le pattern classique de session-per-request.

### Initialisation et état initial

Au démarrage de l'application, un gestionnaire de cycle de vie (`lifespan`) appelle `init_db()` : il crée les tables si elles n'existent pas et insère les trois colonnes par défaut du Kanban (Todo, In Progress, Done) si elles sont absentes. C'est volontairement minimal — une migration Alembic remplacerait cette logique dans un projet à plus long terme.

### Logique métier : déplacement de tâches

Le cas le plus intéressant côté logique est le déplacement de tâches. L'endpoint `POST /tasks/{id}/move` gère deux scénarios distincts : un réordonnancement au sein de la même colonne et un déplacement vers une autre colonne. Dans les deux cas, les positions des tâches adjacentes sont recalculées dans la même transaction pour garantir la cohérence de l'ordre d'affichage — un update en cascade sans ORM magic.

### Gestion des avatars

Les avatars utilisateurs sont stockés et transportés encodés en base64. La conversion est encapsulée dans un `model_validator` Pydantic : le schéma décode à la lecture, re-encode à l'écriture. La logique de transformation ne fuit pas dans les endpoints.

### Le problème du slash final

FastAPI redirige par défaut toute requête vers `/api/v1/users` (sans slash) vers `/api/v1/users/` (avec slash) via une réponse HTTP 307. Ce comportement interagit mal avec les proxys nginx : la redirection `Location` utilise `$host` sans le port, ce qui génère une URL incorrecte quand l'application tourne derrière un port-forward ou un ingress non standard. La solution retenue est de désactiver `redirect_slashes` au niveau de l'application et de définir toutes les routes sans slash terminal — une décision au niveau de l'API plutôt qu'une rustine proxy.

---

## Helm chart multi-environnement

C'est le cœur du projet. Un chart unique gère trois environnements aux topologies radicalement différentes, tous dans le même namespace Kubernetes `taskhorizon`.

### Isolation dans un namespace partagé

La cohabitation de `taskhorizon-test`, `taskhorizon-staging` et `taskhorizon-prod` dans le même namespace impose une discipline stricte sur les sélecteurs. Chaque ressource porte le `Release.Name` comme préfixe, et les `selectorLabels` de chaque Deployment incluent `app.kubernetes.io/instance: {{ .Release.Name }}`. Sans ça, un Service staging pourrait router du trafic vers des pods test — le genre d'erreur invisible jusqu'au mauvais moment.

### Trois stratégies de persistance

La divergence la plus structurante entre environnements concerne la base de données :

- En **test**, PostgreSQL tourne sans aucun volume. Les données sont écrites dans la couche container et disparaissent au redémarrage du pod. C'est voulu : l'environnement est jetable, les tests doivent partir d'un état propre.
- En **staging**, un StatefulSet PostgreSQL avec un `PersistentVolumeClaim` de 5 Gi garantit la persistance entre déploiements. Le chart crée le PVC via `volumeClaimTemplates` dans le StatefulSet — la section entière est conditionnelle selon `postgres.pvc.enabled`.
- En **prod**, il n'y a pas de pod PostgreSQL. L'application se connecte à une instance RDS AWS. Le chart ne crée pas de Secret pour les credentials — ils sont provisionnés hors-bande par l'équipe ops dans un Secret Kubernetes pré-existant, et le chart se contente de le référencer.

### Gestion des secrets sans fuite dans les ConfigMaps

L'URL de connexion à la base est assemblée au runtime par le kubelet via substitution de variables d'environnement Kubernetes (`$(DB_USER)`, `$(DB_PASSWORD)`). Le mot de passe est lu depuis un Secret, jamais depuis un ConfigMap. Cette approche évite de stocker des credentials en clair dans des ressources lisibles sans restriction par défaut.

En staging, le mot de passe est injecté au moment du déploiement via `--set db.password=…` dans la commande Helm — il ne réside pas dans les fichiers de values versionnés. En prod, le Secret pré-existant est simplement référencé par nom.

### Résilience et autoscaling

En staging, des `PodDisruptionBudget` garantissent qu'au moins un pod API et un pod web restent disponibles pendant une opération de maintenance ou une mise à jour de nœud. En prod, les Deployments ne définissent pas de valeur `replicas` fixe : la présence d'un `HorizontalPodAutoscaler` (CPU 70 %) contrôle le nombre de pods. Spécifier `replicas` dans le Deployment et activer un HPA simultanément crée un conflit — les deux ressources se disputent le contrôle, avec des comportements imprévisibles lors des rollbacks.

### Le problème du proxy nginx

Le frontend nginx proxifie les requêtes `/api/` vers le service API interne. L'URL de destination est générée dynamiquement dans un ConfigMap Helm à partir du nom de release (`taskhorizon-test-api:8000`, `taskhorizon-prod-api:8000`). Le Deployment web porte une annotation de checksum sur ce ConfigMap : tout changement de configuration nginx déclenche automatiquement un rolling restart sans intervention manuelle.

---

## Pipeline CI/CD

Quatre workflows GitHub Actions couvrent le cycle complet du code au cluster.

### Chaînage et promotion

Les workflows sont enchaînés par `workflow_run` plutôt que par des jobs dans le même fichier. Cette séparation des responsabilités permet de rejouer un déploiement sans relancer le build, et de bloquer la promotion si un environnement amont échoue.

```text
push main  →  CI (build + test + push :main)
           →  deploy-test

push tag vX.Y.Z  →  build + push :vX.Y.Z
                 →  deploy-staging
                 →  deploy-prod  (approbation manuelle)
```

### Approbation manuelle en production

Le workflow `deploy-prod` est associé à un environnement GitHub `production` avec protection par révision obligatoire. Le pipeline s'arrête après staging et attend une approbation explicite avant de toucher la production. C'est le comportement standard attendu pour un système en production.

### Secrets et credentials

| Secret GitHub | Usage |
| --- | --- |
| `KUBECONFIG` | Accès cluster Kubernetes (encodé en base64) |
| `STAGING_DB_PASSWORD` | Injecté via `--set` uniquement au déploiement staging |

En production, aucun secret de base de données ne transite par GitHub Actions — le Secret RDS est déjà sur le cluster.

---

## Structure

```
task_horizon/
├── api/                        # Backend FastAPI + PostgreSQL
│   ├── src/taskhorizon/
│   │   ├── api/v1/endpoints/   # users, tasks, columns, labels
│   │   ├── main.py
│   │   ├── models.py
│   │   └── db.py
│   ├── tests/
│   └── Dockerfile
├── web/                        # Interface React (support fonctionnel)
│   └── Dockerfile              # Multi-stage builder → nginx
├── helm/taskhorizon/           # Chart multi-environnement
│   ├── values.yaml             # Base — toujours chargé
│   ├── values-test.yaml
│   ├── values-staging.yaml
│   └── values-prod.yaml
├── .github/workflows/          # CI/CD complet
└── docker-compose.yml
```

---

## Démarrage local

```bash
cp .env.example .env
docker compose up
```

| Service | URL |
| --- | --- |
| API + Swagger | <http://localhost:8000/docs> |
| Interface web | <http://localhost:5173> |

Déploiement sur Minikube (env test) :

```bash
eval $(minikube docker-env)
docker build -t ghcr.io/sedelpeuch/task_horizon/api:main ./api
docker build --target prod -t ghcr.io/sedelpeuch/task_horizon/web:main ./web

helm upgrade --install taskhorizon-test ./helm/taskhorizon \
  -f helm/taskhorizon/values-test.yaml \
  -n taskhorizon --create-namespace
```

---

## Qualité

Pre-commit hooks actifs : Ruff, Black, validation YAML, trailing whitespace. Tests backend avec couverture via pytest.

---

## Licence

MIT
