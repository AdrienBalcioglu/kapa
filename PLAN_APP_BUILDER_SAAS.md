# Plan Architecture — App Builder SaaS (Webview → iOS/Android)
> Document de travail pour Claude Code — architecture multi-agents parallèles

---

## Vision produit

Un SaaS qui permet à n'importe qui de :
1. Donner une URL + configurer quelques options (push notifs, splash screen, icône, etc.)
2. Recevoir un `.ipa` (iOS) et `.apk` (Android) buildés dans le cloud
3. Sans Xcode, sans Mac, sans serveur local

**Stack technique retenu :**
- Frontend : Next.js (TypeScript)
- Backend API : Node.js / Express (TypeScript)
- Template app mobile : Capacitor + Expo (généré dynamiquement)
- Build cloud : EAS Build (Expo Application Services)
- Base de données : PostgreSQL (via Prisma)
- Queue : BullMQ (Redis)
- Storage : S3 (artefacts de build)
- Auth : Clerk ou NextAuth

---

## Structure des dossiers du monorepo

```
/
├── apps/
│   ├── web/                  # Next.js frontend (Agent A)
│   └── api/                  # Express backend (Agent B)
├── packages/
│   ├── template-capacitor/   # Template app mobile (Agent C)
│   ├── builder/              # Logique de génération de code (Agent C)
│   └── shared/               # Types TypeScript partagés (Agent D)
├── infra/                    # Docker, config (Agent D)
├── PLAN_APP_BUILDER_SAAS.md
└── package.json              # Workspace root (pnpm)
```

---

## Découpage en agents parallèles

### ⚠️ Règle fondamentale pour le multi-agent
Chaque agent travaille dans son dossier exclusif. Les points de contact (interfaces TypeScript) sont définis dans `packages/shared` et doivent être créés EN PREMIER par Agent D avant que les autres agents démarrent.

---

## PHASE 0 — Bootstrapping (Séquentiel, AVANT tout le reste)

**Qui : Agent D (ou toi manuellement)**

```bash
# 1. Init monorepo pnpm
pnpm init
pnpm add -w -D typescript @types/node

# 2. Créer les workspaces
mkdir -p apps/web apps/api packages/template-capacitor packages/builder packages/shared infra

# 3. pnpm-workspace.yaml
echo "packages:\n  - 'apps/*'\n  - 'packages/*'" > pnpm-workspace.yaml
```

**Livrable Phase 0 :** Le fichier `packages/shared/src/index.ts` avec tous les types partagés (voir ci-dessous). Ce fichier est le contrat entre tous les agents.

```typescript
// packages/shared/src/index.ts

export interface AppConfig {
  id: string;
  userId: string;
  appName: string;
  bundleId: string;           // ex: com.monsite.app
  url: string;                // URL du site web à encapsuler
  splashColor: string;        // hex
  iconBase64?: string;        // PNG 1024x1024
  pushNotifications: boolean;
  sessionMode: 'cookie' | 'jwt' | 'none';
  platforms: ('ios' | 'android')[];
  createdAt: Date;
}

export interface BuildJob {
  id: string;
  appConfigId: string;
  status: BuildStatus;
  platform: 'ios' | 'android';
  easBuildId?: string;
  downloadUrl?: string;
  logs?: string;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export type BuildStatus =
  | 'pending'
  | 'generating'    // génération du code Capacitor
  | 'queued'        // envoyé à EAS
  | 'building'      // EAS build en cours
  | 'success'
  | 'failed';

export interface BuildJobEvent {
  jobId: string;
  status: BuildStatus;
  progress?: number;
  message?: string;
}

export interface GenerateAppPayload {
  config: AppConfig;
  jobId: string;
}

export interface EASBuildResult {
  easBuildId: string;
  status: string;
  artifacts?: {
    buildUrl?: string;
    applicationArchiveUrl?: string;
  };
}

export const API_ROUTES = {
  CREATE_APP: '/api/apps',
  GET_APP: '/api/apps/:id',
  LIST_APPS: '/api/apps',
  START_BUILD: '/api/builds',
  GET_BUILD: '/api/builds/:id',
  BUILD_WEBHOOK: '/api/webhooks/eas',
} as const;
```

---

## AGENT A — Frontend Next.js (`apps/web`)

**Dossier exclusif :** `apps/web/`
**Dépendances :** `packages/shared` (types uniquement)
**Ne touche pas à :** `apps/api`, `packages/builder`, `packages/template-capacitor`

### Prompt de démarrage pour Claude Code (Agent A)

```
Tu travailles UNIQUEMENT dans le dossier apps/web/.
Les types TypeScript sont dans packages/shared/src/index.ts — importe-les, ne les modifie pas.
L'API backend tourne sur http://localhost:3001 — utilise les constantes API_ROUTES de shared.

Crée une application Next.js 14 (App Router, TypeScript, Tailwind) avec les pages suivantes :
```

### Pages à créer

**1. `/` — Landing page**
- Hero : "Transformez votre site web en app mobile en 5 minutes"
- CTA → `/create`
- Features : no-code, cloud build, iOS + Android

**2. `/create` — Formulaire de création d'app**
- Champs : App Name, Bundle ID (auto-généré depuis le nom), URL du site
- Upload icône (PNG 1024x1024)
- Color picker splash screen
- Toggle : Push Notifications activées
- Select : Session mode (cookie / JWT / none)
- Checkboxes : iOS, Android, ou les deux
- Validation côté client avec `zod`
- Submit → POST `/api/apps` puis redirect vers `/builds/:id`

**3. `/dashboard` — Liste des apps de l'utilisateur**
- Cards avec nom, URL, statut du dernier build
- Bouton "Nouveau build"

**4. `/builds/:id` — Suivi de build en temps réel**
- Timeline des statuts : pending → generating → queued → building → success/failed
- Log viewer (streaming via SSE ou polling toutes les 3s)
- Bouton download `.ipa` / `.apk` quand status = success
- Auto-refresh jusqu'à completion

### Composants à créer

```
apps/web/
├── app/
│   ├── page.tsx                    # Landing
│   ├── create/page.tsx             # Formulaire
│   ├── dashboard/page.tsx          # Liste apps
│   └── builds/[id]/page.tsx        # Suivi build
├── components/
│   ├── AppForm/
│   │   ├── AppForm.tsx
│   │   ├── IconUpload.tsx
│   │   └── BundleIdField.tsx       # Auto-génère com.xxx.yyy
│   ├── BuildTracker/
│   │   ├── BuildTracker.tsx
│   │   ├── StatusTimeline.tsx
│   │   └── LogViewer.tsx
│   └── ui/                         # Button, Input, Card, etc.
├── hooks/
│   ├── useBuildStatus.ts           # Polling ou SSE
│   └── useAppConfig.ts
└── lib/
    ├── api.ts                      # Fonctions fetch vers le backend
    └── validations.ts              # Schémas Zod
```

### Détails techniques Agent A

```typescript
// hooks/useBuildStatus.ts
// Polling toutes les 3s tant que status != 'success' | 'failed'
export function useBuildStatus(buildId: string) {
  const [build, setBuild] = useState<BuildJob | null>(null);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/builds/${buildId}`);
      const data: BuildJob = await res.json();
      setBuild(data);
      if (data.status === 'success' || data.status === 'failed') {
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [buildId]);
  
  return build;
}
```

---

## AGENT B — Backend API (`apps/api`)

**Dossier exclusif :** `apps/api/`
**Dépendances :** `packages/shared` (types), BullMQ, Prisma, Redis
**Ne touche pas à :** `apps/web`, `packages/template-capacitor`

### Prompt de démarrage pour Claude Code (Agent B)

```
Tu travailles UNIQUEMENT dans le dossier apps/api/.
Les types TypeScript sont dans packages/shared/src/index.ts.
Tu dois créer une API Express qui :
1. Gère les AppConfig en base (Prisma + PostgreSQL)
2. Crée des BuildJob et les envoie dans une queue BullMQ
3. Expose un webhook pour recevoir les updates EAS
4. Expose les endpoints définis dans API_ROUTES (packages/shared)
```

### Structure API

```
apps/api/
├── src/
│   ├── index.ts                    # Express app + listen
│   ├── routes/
│   │   ├── apps.ts                 # CRUD AppConfig
│   │   ├── builds.ts               # Create + Get builds
│   │   └── webhooks.ts             # EAS webhook handler
│   ├── services/
│   │   ├── BuildService.ts         # Logique métier build
│   │   ├── EASService.ts           # Appels API EAS
│   │   └── StorageService.ts       # Upload/download S3
│   ├── workers/
│   │   └── buildWorker.ts          # BullMQ worker
│   ├── db/
│   │   ├── prisma.ts               # Client Prisma
│   │   └── schema.prisma           # Modèles DB
│   └── middleware/
│       ├── auth.ts                 # Vérification JWT
│       └── errorHandler.ts
├── package.json
└── tsconfig.json
```

### Schema Prisma

```prisma
// apps/api/src/db/schema.prisma

model AppConfig {
  id                String     @id @default(cuid())
  userId            String
  appName           String
  bundleId          String     @unique
  url               String
  splashColor       String     @default("#FFFFFF")
  iconPath          String?    // chemin S3
  pushNotifications Boolean    @default(false)
  sessionMode       String     @default("cookie")
  platforms         String[]   // ["ios", "android"]
  createdAt         DateTime   @default(now())
  builds            BuildJob[]
}

model BuildJob {
  id            String      @id @default(cuid())
  appConfigId   String
  appConfig     AppConfig   @relation(fields: [appConfigId], references: [id])
  status        String      @default("pending")
  platform      String      // "ios" | "android"
  easBuildId    String?
  downloadUrl   String?
  logs          String?
  errorMessage  String?
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime    @default(now())
}
```

### BuildWorker — Logique principale

```typescript
// apps/api/src/workers/buildWorker.ts
// Ce worker est le cœur du système

async function processBuildJob(job: Job<GenerateAppPayload>) {
  const { config, jobId } = job.data;
  
  // 1. Update status → 'generating'
  await updateBuildStatus(jobId, 'generating');
  
  // 2. Appeler le package builder pour générer le code Capacitor
  // Import depuis packages/builder
  const appDir = await generateCapacitorApp(config);
  
  // 3. Update status → 'queued'
  await updateBuildStatus(jobId, 'queued');
  
  // 4. Appeler EAS Build API
  const easResult = await EASService.triggerBuild(appDir, config.platforms[0]);
  
  // 5. Sauvegarder l'EAS build ID
  await saveBuildId(jobId, easResult.easBuildId);
  
  // 6. Polling EAS jusqu'à completion (ou attendre webhook)
  // Le webhook /api/webhooks/eas mettra à jour le statut final
}
```

### EASService — Appels API EAS

```typescript
// apps/api/src/services/EASService.ts

export class EASService {
  private static baseUrl = 'https://api.expo.dev/v2';
  
  static async triggerBuild(projectDir: string, platform: 'ios' | 'android') {
    // 1. S'assurer que le projet est initialisé avec eas.json
    // 2. POST https://api.expo.dev/v2/projects/{projectId}/builds
    // Headers: Authorization: Bearer {EAS_TOKEN}
    // Body: { platform, profile: "production" }
    
    const response = await fetch(`${this.baseUrl}/projects/${PROJECT_ID}/builds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EAS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ platform, profile: 'production' })
    });
    
    return response.json() as Promise<EASBuildResult>;
  }
  
  static async getBuildStatus(easBuildId: string) {
    const response = await fetch(`${this.baseUrl}/builds/${easBuildId}`, {
      headers: { 'Authorization': `Bearer ${process.env.EAS_TOKEN}` }
    });
    return response.json();
  }
}
```

### Variables d'environnement API

```env
# apps/api/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/appbuilder
REDIS_URL=redis://localhost:6379
EAS_TOKEN=your_eas_token
EAS_PROJECT_ID=your_expo_project_id
S3_BUCKET=appbuilder-artifacts
S3_REGION=eu-west-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
JWT_SECRET=xxx
PORT=3001
```

---

## AGENT C — Builder + Template Capacitor (`packages/`)

**Dossiers exclusifs :** `packages/builder/` et `packages/template-capacitor/`
**Dépendances :** `packages/shared` (types uniquement)
**Ne touche pas à :** `apps/web`, `apps/api`

### Prompt de démarrage pour Claude Code (Agent C)

```
Tu travailles dans packages/builder/ et packages/template-capacitor/.
Ton job : prendre un objet AppConfig (type depuis packages/shared) et générer
un projet Capacitor complet dans un dossier temporaire /tmp/builds/{appId}/,
prêt à être envoyé à EAS Build.
```

### Template Capacitor

```
packages/template-capacitor/
├── src/
│   └── index.html              # Fichier HTML avec la webview (TEMPLATE)
├── capacitor.config.template.ts  # Config Capacitor avec placeholders
├── package.template.json       # package.json avec placeholders
├── eas.json                    # Config EAS Build (fixed)
├── ios/                        # Projet iOS pré-configuré (vide, généré par cap sync)
└── android/                    # Projet Android pré-configuré
```

**Fichier clé : `src/index.html` (template)**
```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{APP_NAME}}</title>
  <style>
    * { margin: 0; padding: 0; }
    body { background: {{SPLASH_COLOR}}; }
    iframe {
      width: 100vw;
      height: 100vh;
      border: none;
    }
  </style>
</head>
<body>
  <iframe 
    id="webview"
    src="{{APP_URL}}"
    allow="camera; microphone; geolocation"
  ></iframe>
  
  <script>
    // Communication bidirectionnelle avec le site web
    window.addEventListener('message', function(event) {
      if (event.data.type === 'session_token') {
        // Stocker le token via Capacitor Preferences
        window.Capacitor?.Plugins?.Preferences?.set({
          key: 'session_token',
          value: event.data.token
        });
      }
    });
  </script>
</body>
</html>
```

**`capacitor.config.template.ts`**
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '{{BUNDLE_ID}}',
  appName: '{{APP_NAME}}',
  webDir: 'src',
  server: {
    // Pour webview externe, on utilise allowNavigation
    allowNavigation: ['{{APP_URL_DOMAIN}}']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '{{SPLASH_COLOR}}',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
```

### Package Builder

```
packages/builder/
├── src/
│   ├── index.ts                # Export principal : generateCapacitorApp()
│   ├── templateEngine.ts       # Remplacement des placeholders
│   ├── fileGenerator.ts        # Copie + génère les fichiers
│   ├── iconProcessor.ts        # Redimensionne l'icône (sharp)
│   └── easConfig.ts            # Génère eas.json selon les platforms
└── package.json
```

**Fonction principale**
```typescript
// packages/builder/src/index.ts

import { AppConfig } from '@app-builder/shared';
import fs from 'fs-extra';
import path from 'path';

export async function generateCapacitorApp(config: AppConfig): Promise<string> {
  const outputDir = `/tmp/builds/${config.id}`;
  const templateDir = path.resolve(__dirname, '../../template-capacitor');
  
  // 1. Copier le template dans le dossier de build
  await fs.copy(templateDir, outputDir);
  
  // 2. Remplacer les placeholders dans tous les fichiers
  await replaceInFile(`${outputDir}/src/index.html`, {
    '{{APP_NAME}}': config.appName,
    '{{APP_URL}}': config.url,
    '{{SPLASH_COLOR}}': config.splashColor,
  });
  
  await replaceInFile(`${outputDir}/capacitor.config.ts`, {
    '{{BUNDLE_ID}}': config.bundleId,
    '{{APP_NAME}}': config.appName,
    '{{APP_URL_DOMAIN}}': new URL(config.url).hostname,
    '{{SPLASH_COLOR}}': config.splashColor,
  });
  
  // 3. Générer package.json
  await generatePackageJson(outputDir, config);
  
  // 4. Traiter l'icône si fournie
  if (config.iconBase64) {
    await processIcon(config.iconBase64, outputDir);
  }
  
  // 5. Générer eas.json selon les platforms
  await generateEasConfig(outputDir, config.platforms);
  
  // 6. Générer app.json pour Expo
  await generateAppJson(outputDir, config);
  
  return outputDir;
}
```

**`eas.json` généré**
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "production": {
      "ios": {
        "simulator": false,
        "credentialsSource": "remote"
      },
      "android": {
        "buildType": "apk",
        "credentialsSource": "remote"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## AGENT D — Infrastructure + Shared (`packages/shared` + `infra/`)

**Dossiers exclusifs :** `packages/shared/`, `infra/`
**Travaille EN PREMIER (Phase 0)**

### Prompt de démarrage pour Claude Code (Agent D)

```
Tu travailles dans packages/shared/ et infra/.
Commence par créer packages/shared/src/index.ts avec les types définis dans le plan.
Ensuite crée infra/docker-compose.yml et infra/.env.example.
```

### docker-compose.yml

```yaml
# infra/docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: appbuilder
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Le backend API
  api:
    build: ../apps/api
    ports:
      - "3001:3001"
    env_file: ../apps/api/.env
    depends_on:
      - postgres
      - redis

  # Le frontend
  web:
    build: ../apps/web
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
```

---

## Ordre de démarrage des agents

```
PHASE 0 (séquentiel)
└── Agent D : Crée packages/shared/src/index.ts + infra/docker-compose.yml
              ⬇️ MERGE avant de continuer

PHASE 1 (parallèle — les 3 agents en même temps)
├── Agent A : apps/web/ (frontend Next.js)
├── Agent B : apps/api/ (backend Express + BullMQ)
└── Agent C : packages/builder/ + packages/template-capacitor/

PHASE 2 (intégration — séquentiel)
└── Agent unique : connecter A+B+C, tester le flow end-to-end
```

---

## Instructions pour lancer plusieurs Claude Code en parallèle

### Option 1 — Plusieurs terminaux

```bash
# Terminal 1 (Agent A)
cd apps/web
claude --context "Tu es Agent A. Travaille UNIQUEMENT dans apps/web/. 
Lis le fichier PLAN_APP_BUILDER_SAAS.md section AGENT A."

# Terminal 2 (Agent B)  
cd apps/api
claude --context "Tu es Agent B. Travaille UNIQUEMENT dans apps/api/.
Lis le fichier PLAN_APP_BUILDER_SAAS.md section AGENT B."

# Terminal 3 (Agent C)
cd packages
claude --context "Tu es Agent C. Travaille dans packages/builder/ et packages/template-capacitor/.
Lis le fichier PLAN_APP_BUILDER_SAAS.md section AGENT C."
```

### Option 2 — Git branches par agent

```bash
git checkout -b agent/frontend   # Agent A travaille ici
git checkout -b agent/backend    # Agent B travaille ici  
git checkout -b agent/builder    # Agent C travaille ici

# Merge final sur main quand chaque agent a terminé
git checkout main
git merge agent/frontend
git merge agent/backend
git merge agent/builder
```

### Règles de non-collision pour les agents

| Agent | Peut lire | Peut écrire | Ne touche JAMAIS |
|-------|-----------|-------------|------------------|
| A (Frontend) | `packages/shared` | `apps/web` | `apps/api`, `packages/builder` |
| B (Backend) | `packages/shared`, `packages/builder` | `apps/api` | `apps/web`, `packages/template-capacitor` |
| C (Builder) | `packages/shared` | `packages/builder`, `packages/template-capacitor` | `apps/web`, `apps/api` |
| D (Infra) | tout | `packages/shared`, `infra` | `apps/web`, `apps/api` |

---

## Flow complet end-to-end (à valider en Phase 2)

```
1. User remplit formulaire sur /create (Agent A)
   ↓
2. POST /api/apps → crée AppConfig en DB (Agent B)
   ↓
3. POST /api/builds → crée BuildJob + enqueue dans BullMQ (Agent B)
   ↓
4. BuildWorker pickup le job (Agent B)
   ↓
5. generateCapacitorApp(config) → /tmp/builds/{id}/ (Agent C)
   ↓
6. EASService.triggerBuild() → POST api.expo.dev (Agent B)
   ↓
7. EAS build le projet dans le cloud (externe)
   ↓
8. EAS webhook → POST /api/webhooks/eas → update BuildJob status (Agent B)
   ↓
9. Frontend polling /api/builds/:id → affiche progression (Agent A)
   ↓
10. Status = success → download URL du .ipa/.apk disponible
```

---

## Variables d'environnement nécessaires (à obtenir avant de commencer)

| Variable | Où l'obtenir |
|----------|-------------|
| `EAS_TOKEN` | expo.dev → Account Settings → Access Tokens |
| `EAS_PROJECT_ID` | expo.dev après création d'un projet |
| `DATABASE_URL` | Local via docker-compose ou Neon.tech (gratuit) |
| `REDIS_URL` | Local via docker-compose ou Upstash (gratuit) |
| `S3_BUCKET` | AWS S3 ou Cloudflare R2 (moins cher) |

---

## Points d'attention / pièges à éviter

1. **EAS nécessite un compte Expo** — il faut créer un projet sur expo.dev avant de builder
2. **Les credentials iOS** (certificats Apple) sont gérés par EAS automatiquement en mode "remote" — pas besoin de Xcode
3. **Le build Capacitor** nécessite `npx cap sync` avant d'envoyer à EAS — à intégrer dans le buildWorker
4. **Le template webview** utilise une `<iframe>` qui peut bloquer certains sites (X-Frame-Options) — prévoir une solution de fallback avec `InAppBrowser` de Capacitor
5. **CORS** — configurer le backend pour accepter les requêtes du frontend Next.js

---

*Ce plan est destiné à être donné directement à Claude Code. Chaque section "Agent X" peut être copiée-collée comme prompt de démarrage.*
