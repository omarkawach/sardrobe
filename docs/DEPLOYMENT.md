# Deploy your Sardrobe fork to Cloudflare

Sardrobe deploys two Workers into your Cloudflare account:

- `sardrobe` serves the site, protects `/app`, streams model objects from a private R2 binding, and forwards `/api/*` through a service binding.
- `sardrobe-backend` runs Better Auth and the Hono API with D1, R2, Images, and Rate Limiting bindings.

The checked-in `wrangler.jsonc` files are account-neutral. Wrangler uses the account selected by `wrangler login`, automatically provisions the backend D1 database and media bucket, and writes their generated identifiers back to your fork. The backend has no public route.

You do not need access to the official Sardrobe development or production environments. Pull requests run against the generic configuration; the project owner handles deployments to `dev.sardrobe.com` and `sardrobe.com` separately.

## 1. Choose names

The defaults are fine when they are available in your account. Otherwise edit:

- `name` in both Wrangler files;
- `services[0].service` in `apps/frontend/wrangler.jsonc` so it exactly matches the backend Worker name;
- `r2_buckets[0].bucket_name` in `apps/frontend/wrangler.jsonc` if `sardrobe-models` already exists;
- the rate-limit `namespace_id` if `1001` is already used by another binding.

Do not add an `account_id` unless you deliberately need to override the account selected by Wrangler.

Before publishing your fork, replace the operator, contact, domain, and support-link details in `apps/frontend/src/pages/privacy.astro`, `apps/frontend/src/pages/terms.astro`, and `apps/frontend/src/components/SiteFooter.astro`. Those files describe the original Sardrobe service and are not a ready-made policy for another operator.

Local AI needs no deployment secret or Cloudflare AI service. When a user enables it on a compatible desktop browser, the browser downloads SmolVLM from Hugging Face and runs it locally with WebGPU. Sardrobe does not expose or load Local AI on phones and tablets. If you change the model or download host, update the privacy disclosure, attribution, and content-security policy together. Sardrobe intentionally has no hosted inference fallback.

## 2. Configure Google

In Google Cloud Console:

1. Create or select a project.
2. Configure the OAuth consent screen.
3. Create an OAuth client with application type **Web application**.
4. Add `http://localhost:4321/api/auth/callback/google` as a local authorized redirect URI.
5. After the first frontend deployment, add `https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/api/auth/callback/google`, or your custom-domain equivalent.

The frontend forwards the trusted public host to the private backend, and Better Auth uses it to build the callback URL. The localhost value in the generic backend config is only a fallback for local or direct requests.

Reference: [Better Auth's Google provider guide](https://better-auth.com/docs/authentication/google).

## 3. Prepare the background-removal model

The pretrained checkpoint and generated ONNX file are intentionally not committed. The upstream project does not state a separate license for its externally hosted checkpoint, so obtain it from the DIS authors and review the terms before redistributing it.

Follow [`packages/background-remover/tooling/README.md`](../packages/background-remover/tooling/README.md) to export and validate the model. The production path expects:

```text
isnet-general-use-1024-webgpu-v2/
  manifest.json
  isnet-general-use-1024-webgpu-v2.onnx
```

Create the private model bucket from the repository root:

```sh
pnpm --filter @sardrobe/frontend exec wrangler r2 bucket create sardrobe-models
```

Upload the validated files:

```sh
pnpm --filter @sardrobe/frontend exec wrangler r2 object put "sardrobe-models/isnet-general-use-1024-webgpu-v2/isnet-general-use-1024-webgpu-v2.onnx" --file ../../packages/background-remover/tooling/build/isnet-general-use-1024-webgpu-v2.onnx --content-type application/octet-stream --cache-control "public, max-age=31536000, immutable"

pnpm --filter @sardrobe/frontend exec wrangler r2 object put "sardrobe-models/isnet-general-use-1024-webgpu-v2/manifest.json" --file ../../packages/background-remover/tooling/build/manifest.json --content-type application/json --cache-control "public, max-age=31536000, immutable"
```

The bucket stays private. The frontend Worker streams `/models/*` from its binding, so no public R2 domain or CORS policy is required. For another immutable release path, update `apps/frontend/.env.production` and the uploaded object keys together.

## 4. First deployment

Sign in once:

```sh
pnpm --filter @sardrobe/backend exec wrangler login
```

Add the three secrets through Wrangler's interactive prompt. These commands can create the backend Worker draft before its first deployment:

```sh
pnpm --filter @sardrobe/backend exec wrangler secret put BETTER_AUTH_SECRET
pnpm --filter @sardrobe/backend exec wrangler secret put GOOGLE_CLIENT_ID
pnpm --filter @sardrobe/backend exec wrangler secret put GOOGLE_CLIENT_SECRET
```

Use a fresh random value of at least 32 bytes for `BETTER_AUTH_SECRET`. Never put secret values in a Wrangler config, command argument, or committed file.

Bootstrap the Workers and database:

```sh
pnpm deploy:bootstrap
```

Bootstrap deploys the backend first so Wrangler can provision D1, applies the migrations, then builds and deploys the frontend. Wrangler may write generated D1 and R2 identifiers into `apps/backend/wrangler.jsonc`; commit those identifiers in your fork so the config remains its deployment source of truth.

Copy the frontend URL printed by Wrangler. Set it in both places below:

```dotenv
# apps/frontend/.env.production
PUBLIC_APP_URL=https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev
```

```jsonc
// apps/frontend/wrangler.jsonc
"PUBLIC_APP_URL": "https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev"
```

Add the matching Google callback URL, then redeploy the frontend:

```sh
pnpm --filter @sardrobe/frontend deploy
```

## 5. Later releases

After bootstrap, use:

```sh
pnpm deploy
```

The release command applies D1 migrations before deploying new backend code, then deploys the frontend. Schema changes should remain backward-compatible for the duration of the rollout; use an expand-and-contract migration when removing or renaming data used by the previous Worker version.

## 6. Use a custom domain

Attach the custom domain to the frontend Worker in Cloudflare, then:

1. Add `https://YOUR-DOMAIN/api/auth/callback/google` to the Google OAuth client.
2. Set `PUBLIC_APP_URL=https://YOUR-DOMAIN` in `apps/frontend/.env.production` and in the frontend Wrangler variables.
3. Build and deploy again with `pnpm --filter @sardrobe/frontend deploy`.

The backend remains private behind the service binding.

## Optional: Sentry

Sentry is disabled when no DSN is configured.

- Backend and frontend Worker: add `SENTRY_DSN` as a non-secret Wrangler variable.
- Browser: set `PUBLIC_SENTRY_DSN` in `apps/frontend/.env.production`.
- Source-map upload: set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` only in the build environment.

Do not commit the auth token.

## Verify before deployment

```sh
pnpm check
pnpm audit --prod
```

`pnpm check` includes application tests, production builds, and Wrangler dry-runs against the generic fork configuration. After deployment, verify sign-in, one model-backed import, a saved cutout, and account deletion.

Cloudflare's current configuration, automatic provisioning, service-binding, and secret guidance is in the [Wrangler configuration documentation](https://developers.cloudflare.com/workers/wrangler/configuration/).

## Official Sardrobe deployments

The repository also contains `wrangler.sardrobe.jsonc` files so the project owner can reproduce the existing development and production bindings. They are not part of the contributor or fork workflow and do not contain secret values.

Only the project owner should run:

```sh
pnpm deploy:sardrobe:development
pnpm deploy:sardrobe:production
```

Both commands migrate the selected database before deploying its backend and frontend Workers. Contributors never need Sardrobe account access to build, test, or propose changes.
