# EventHub — Gestion d'Evenements & Inscriptions

Application PERN (PostgreSQL, Express, React, Node.js) pour gerer des evenements,
des participants et leurs inscriptions, avec un dashboard de statistiques.

## 1. Architecture

```
tython/
  backend/     API REST (Node.js + Express + PostgreSQL)
  frontend/    Application React (Vite)
  docker-compose.yml
```

## 2. Conception — Schema de base de donnees (ERD)

```mermaid
erDiagram
    USERS ||--o{ EVENTS : "cree"
    EVENTS ||--o{ REGISTRATIONS : "recoit"
    PARTICIPANTS ||--o{ REGISTRATIONS : "souscrit"

    USERS {
        uuid id PK
        text full_name
        text email "UNIQUE, NOT NULL"
        text password_hash
        text role "CHECK admin|staff"
        timestamptz created_at
    }

    EVENTS {
        uuid id PK
        text title
        text description
        text location
        timestamptz event_date
        int max_participants "CHECK > 0"
        text status "CHECK draft|published|cancelled"
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    PARTICIPANTS {
        uuid id PK
        text full_name
        text email "UNIQUE, NOT NULL"
        text phone
        timestamptz created_at
    }

    REGISTRATIONS {
        uuid id PK
        uuid event_id FK
        uuid participant_id FK
        text status "CHECK pending|confirmed|cancelled"
        timestamptz created_at
    }
```

Le script SQL complet (tables, contraintes, index, trigger `updated_at`) se trouve dans
[backend/db/schema.sql](backend/db/schema.sql).

### Contraintes

- `users.email` UNIQUE, `users.role` CHECK (`admin`, `staff`)
- `events.max_participants` CHECK (`> 0`), `events.status` CHECK (`draft`, `published`, `cancelled`)
- `participants.email` UNIQUE
- `registrations (event_id, participant_id)` UNIQUE — empeche une double inscription
- `registrations.status` CHECK (`pending`, `confirmed`, `cancelled`)
- Toutes les FK sont `NOT NULL`, y compris `events.created_by` (`ON DELETE CASCADE` : supprimer un
  compte staff supprime ses evenements, qui a leur tour suppriment leurs inscriptions)

### Index recommandes

- `events(status)`, `events(event_date)`, `events(created_by)` — filtrage et tri frequents
- `participants(lower(full_name))`, `participants(lower(email))` — recherche insensible a la casse
- `registrations(event_id)`, `registrations(participant_id)`, `registrations(status)`, `registrations(created_at)`
  — jointures et comptages de capacite/dashboard

## 3. Regles metier implementees

1. **Impossible de s'inscrire sur un evenement non publie** (`POST /api/registrations` -> 400 si `status != 'published'`).
2. **Un participant ne peut pas s'inscrire deux fois** au meme evenement (contrainte UNIQUE + verification applicative -> 409).
3. **Capacite maximale respectee** : si `registrations non annulees >= max_participants` -> 409 (verrouillage `SELECT ... FOR UPDATE` pour eviter les conditions de course).
4. **Annulation en cascade** : passer un evenement en `cancelled` repasse automatiquement toutes ses inscriptions en `cancelled`.

### Isolation des donnees par role

- **staff** : ne voit et ne gere que les evenements qu'il a lui-meme crees (liste, detail, modification,
  changement de statut, suppression, inscriptions). Toute tentative d'acces a un evenement d'un
  autre staff renvoie `403`.
- **admin** : voit et gere tous les evenements, quel que soit leur createur (colonne "Cree par"
  affichee dans la liste), et accede en plus a la page **Gestion du staff** (`/staff`) : liste des
  comptes staff (date de creation, nombre d'evenements, nombre de participants), creation d'un
  nouveau compte staff, reinitialisation de mot de passe, et suppression d'un compte staff (cascade
  sur ses evenements et inscriptions).

## 4. Installation

### Option A — Docker Compose (recommande)

Pre-requis : Docker Desktop.

```bash
docker compose up --build
```

Cela demarre PostgreSQL, applique le schema, insere les donnees de demonstration (seed, uniquement
si la base est vide) et lance le backend (port 4000) et le frontend (port 5173).

> Le service `postgres` est expose sur le port hote `5433` (`5433:5432`) pour eviter tout conflit
> avec un PostgreSQL local deja installe sur le port 5432 par defaut. Cela n'affecte que l'acces
> depuis votre machine (ex. via psql) : le backend communique avec `postgres:5432` sur le reseau
> Docker interne, inchange.

> Le seed est sans danger a chaque redemarrage : il ne s'execute que si la base est vide (verifie
> le nombre d'utilisateurs). Redemarrer ou reconstruire les conteneurs ne supprime donc jamais les
> donnees reelles saisies dans l'application. Pour forcer une reinitialisation complete aux
> donnees de demonstration : `docker compose exec backend npm run db:reseed`.

Ouvrez http://localhost:5173.

### Option B — Installation manuelle

**Pre-requis** : Node.js 18+, PostgreSQL 13+.

```bash
# 1. Base de donnees
createdb eventhub   # ou toute methode equivalente (pgAdmin, psql, etc.)

# 2. Backend
cd backend
cp .env.example .env     # ajustez DATABASE_URL / JWT_SECRET si besoin
npm install
npm run db:migrate       # applique backend/db/schema.sql
npm run db:seed          # insere les donnees de demonstration
npm run dev              # http://localhost:4000

# 3. Frontend (nouveau terminal)
cd frontend
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

### Variables d'environnement

**backend/.env**

| Variable | Description | Exemple |
|---|---|---|
| `PORT` | Port d'ecoute de l'API | `4000` |
| `DATABASE_URL` | Chaine de connexion PostgreSQL | `postgresql://eventhub:eventhub@localhost:5432/eventhub` |
| `JWT_SECRET` | Secret de signature JWT | chaine aleatoire longue |
| `JWT_EXPIRES_IN` | Duree de validite du token | `8h` |

**frontend/.env**

| Variable | Description | Exemple |
|---|---|---|
| `VITE_API_URL` | URL de base de l'API | `http://localhost:4000/api` |

### Comptes de demonstration (apres seed)

| Role | Email | Mot de passe |
|---|---|---|
| admin | admin@eventhub.com | admin123 |
| staff | staff@eventhub.com | staff123 |

## 5. Scripts utiles (backend)

| Commande | Effet |
|---|---|
| `npm run dev` | Demarre l'API avec rechargement automatique (nodemon) |
| `npm start` | Demarre l'API en mode production |
| `npm run db:migrate` | Applique `db/schema.sql` |
| `npm run db:seed` | Insere les donnees de demonstration (1 admin, 1 staff, 5 evenements, 10 participants, 20 inscriptions) — ne fait rien si la base contient deja des donnees |
| `npm run db:reseed` | Comme `db:seed` mais force la reinitialisation (`TRUNCATE`) meme si la base contient deja des donnees |
| `npm test` | Lance les tests Jest/Supertest (necessite une base migree + seedee) |

## 6. API REST

Documentation interactive Swagger disponible sur `http://localhost:4000/api/docs`
une fois le backend demarre (spec : [backend/openapi.json](backend/openapi.json)).

### Auth

| Methode | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Connexion, retourne un JWT |
| GET | `/api/auth/me` | Utilisateur courant (JWT requis) |

### Evenements

| Methode | Route | Role | Description |
|---|---|---|---|
| POST | `/api/events` | admin, staff | Creer un evenement (statut `draft` par defaut) |
| GET | `/api/events?status=&date=&search=` | authentifie | Liste avec filtres + pagination |
| GET | `/api/events/:id` | authentifie | Detail + liste des inscriptions |
| PUT | `/api/events/:id` | admin, staff | Mise a jour des champs |
| PATCH | `/api/events/:id/status` | admin, staff | Changement de statut (`draft`→`published`→`cancelled`) |

### Participants

| Methode | Route | Role | Description |
|---|---|---|---|
| POST | `/api/participants` | admin, staff | Creer un participant (email unique) |
| GET | `/api/participants?search=` | authentifie | Recherche par nom ou email |
| GET | `/api/participants/:id` | authentifie | Detail |
| PUT | `/api/participants/:id` | admin, staff | Mise a jour |

### Inscriptions

| Methode | Route | Role | Description |
|---|---|---|---|
| POST | `/api/registrations` | admin, staff | Inscrire un participant (regles metier appliquees) |
| GET | `/api/registrations?eventId=&participantId=&status=` | authentifie | Liste filtree + pagination |
| PATCH | `/api/registrations/:id/status` | admin, staff | Changer le statut (`pending`/`confirmed`/`cancelled`) |

### Dashboard

| Methode | Route | Description |
|---|---|---|
| GET | `/api/dashboard/stats` | Nombre total d'evenements, evenements publies, inscriptions du jour, top 5 evenements les plus remplis |

### Formulaire public (sans authentification)

Chaque evenement dispose de son propre lien public (`/register/:id` cote frontend) que l'admin
peut copier depuis le popup de l'evenement et transmettre a un invite. Le formulaire cree le
participant s'il n'existe pas encore (email unique) puis l'inscrit, en appliquant les memes
regles metier (evenement publie, pas de doublon, capacite maximale).

| Methode | Route | Description |
|---|---|---|
| GET | `/api/public/events/:id` | Informations publiques de l'evenement (sans auth) |
| POST | `/api/public/events/:id/register` | Auto-inscription d'un invite (sans auth) |

### Utilisateurs (admin uniquement)

| Methode | Route | Description |
|---|---|---|
| POST | `/api/users` | Creer un compte staff (ou admin) |
| GET | `/api/users?role=` | Lister les utilisateurs avec `totalEvents` / `totalParticipants` agreges |
| PATCH | `/api/users/:id/reset-password` | Reinitialiser le mot de passe d'un compte staff |
| DELETE | `/api/users/:id` | Supprimer un compte staff (cascade sur ses evenements/inscriptions) |

### Codes d'erreur

`400` validation (Zod) · `401` non authentifie / identifiants invalides · `403` role insuffisant ·
`404` ressource introuvable · `409` conflit (email/inscription deja existants, evenement complet) · `500` erreur serveur.

## 7. Frontend

Pages : **Login**, **Dashboard** (statistiques), **Evenements** (liste + filtres + creation ; les
actions **Ouvrir**, **Modifier**, **Publier**, **Supprimer** sont sur chaque ligne), **Participants**
(liste, recherche, creation/edition), **Gestion du staff** (`/staff`, admin uniquement), et la page
publique **Formulaire d'inscription** (`/register/:id`, sans authentification).

Le detail d'un evenement (infos completes, changement de statut, lien public a copier, liste des
inscriptions avec changement de statut) s'ouvre dans un popup depuis la liste des evenements
plutot que sur une page dediee.

L'authentification JWT est stockee dans `localStorage` et injectee automatiquement sur chaque
requete via un intercepteur Axios ; une reponse `401` redirige vers `/login`.

## 8. Tests backend (bonus)

```bash
cd backend
npm run db:migrate
npm run db:seed
npm test
```

[backend/tests/registrations.test.js](backend/tests/registrations.test.js) verifie les 4 regles
metier obligatoires (inscription sur evenement non publie, doublon, capacite maximale, cascade
d'annulation). [backend/tests/health.test.js](backend/tests/health.test.js) est un test de fumee
qui ne necessite pas de base de donnees.

## 9. Donnees de test (seed)

`npm run db:seed` insere :

- 1 utilisateur `admin` + 1 utilisateur `staff`
- 5 evenements : 3 `published`, 1 `draft`, 1 `cancelled`
- 10 participants
- 20 inscriptions reparties entre statuts `pending`, `confirmed` et `cancelled`
  (y compris les inscriptions de l'evenement annule, toutes passees a `cancelled`)

Le script ne s'execute que si la base est vide (il ne touche rien si des utilisateurs existent
deja) : il peut etre relance sans danger. Pour forcer une reinitialisation complete malgre des
donnees existantes : `npm run db:reseed` (vide les tables via `TRUNCATE ... CASCADE` puis reinsere
les donnees de demonstration).

## 10. Bonus implementes

- ✅ Docker Compose (postgres + backend + frontend)
- ✅ Swagger / OpenAPI (`/api/docs`)
- ✅ Tests backend (Jest + Supertest)
- ✅ Pagination sur `/api/events`, `/api/participants` et `/api/registrations` (`page`, `pageSize` + metadonnees `pagination.total`)
#   t y t h o n - p r o j e c t - T e s t  
 