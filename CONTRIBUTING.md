# Contributing

Thanks for helping improve Sardrobe.

Participation is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Setup

Follow the local setup in [README.md](./README.md). Install the browser used by the component tests once, then run the checks:

```sh
pnpm --filter @sardrobe/react-components exec playwright install chromium
pnpm check
```

For a faster accessibility-only pass during component work, run:

```sh
pnpm test:a11y
```

## Keep the project small

Sardrobe's shared packages are product support code, not general-purpose libraries.

- Add a shared React component only when the application uses it in more than one place or it provides an important accessibility primitive.
- Add a design token only when a checked-in component or application style consumes it.
- Prefer a local feature component over expanding the public component package speculatively.
- Keep model binaries, generated build output, credentials, and personal editor settings out of Git. The shared root `.mcp.json` is intentional AI contributor setup and must not contain secrets.

## Database changes

Change the Drizzle schema in `packages/data-ops`, generate a migration, review the SQL, and test it against local D1 before committing it. Never edit an already-applied migration.

## Pull requests

Keep pull requests focused. Explain the user-visible behavior, note schema or deployment changes, and include the checks you ran. Screenshots are helpful for visual changes.

Contributors propose changes through pull requests; they do not deploy the official Sardrobe development or production environments. If you want a live copy, deploy your fork to your own Cloudflare account using the account-neutral configuration in the [deployment guide](./docs/DEPLOYMENT.md). The repository owner's `deploy:sardrobe:*` commands and `wrangler.sardrobe.jsonc` files exist only to reproduce `dev.sardrobe.com` and `sardrobe.com` after changes are accepted.
