# Kapa

Turn a website into an iOS and Android app, built in the cloud.

Give Kapa a URL, an app name, an icon and a few options. It generates a Capacitor project from a template, sends it to EAS Build, and gives you back an `.ipa` and an `.apk`. No Xcode, no Mac, no local build machine.

> Status: prototype. The form, the API, the build queue and the code generator work end to end in development. It has not been run in production.

## How it works

1. **Web app** (`apps/web`): a Next.js form to describe the app (URL, name, bundle ID, icon), then a page that follows the build live.
2. **API** (`apps/api`): an Express server that stores apps and builds in Postgres (Prisma) and queues each build with BullMQ on Redis.
3. **Builder** (`packages/builder`): fills the Capacitor template with the app settings and resizes the icon for each platform.
4. **Build worker**: sends the generated project to EAS Build, receives the result through a signed webhook, and stores the artefacts on S3.

```
apps/
  web/                  Next.js frontend
  api/                  Express API, queue worker, Prisma schema
packages/
  builder/              Project generator (templates, icons, EAS config)
  template-capacitor/   Capacitor app template
  shared/               TypeScript types shared by the web app and the API
infra/                  Docker Compose for Postgres and Redis
```

`PLAN_APP_BUILDER_SAAS.md` is the original architecture plan, written (in French) to split the work between parallel coding agents.

## Stack

Next.js · Express · TypeScript · Prisma + PostgreSQL · BullMQ + Redis · Capacitor · EAS Build · S3 · Clerk · pnpm workspaces

## Getting started

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d
cp apps/api/.env.example apps/api/.env
pnpm db:push
pnpm dev:api
pnpm dev:web
```

Set `AUTH_DEV_BYPASS=true` in `apps/api/.env` to use the API locally without a Clerk account.

## Security notes

- Every API route requires a Clerk token. The mock user for local development is off by default, needs `AUTH_DEV_BYPASS=true`, and never works when `NODE_ENV=production`.
- EAS webhooks are verified with an HMAC signature. In production, a webhook is rejected when `EAS_WEBHOOK_SECRET` is missing.
- The credentials in `infra/docker-compose.yml` and `.env.example` are local placeholders. Use real secrets from your host's secret store in production, never from the repository.

## License

[MIT](LICENSE) © 2026 Adrien Balcioglu
