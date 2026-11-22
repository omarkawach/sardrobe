<p align="center">
  <img src="apps/frontend/public/logo.png" alt="Sardrobe logo" width="96" />
</p>

<h1 align="center">Sardrobe</h1>

<p align="center">
  <strong>Open-source AI digital wardrobe with local image processing.</strong>
</p>

<p align="center">
  <a href="https://sardrobe.com"><img alt="Open Sardrobe" src="https://img.shields.io/badge/OPEN-SARDROBE.COM-2f2f2b?style=for-the-badge" /></a>
  <a href="https://www.producthunt.com/products/sardrobe"><img alt="Sardrobe on Product Hunt" src="https://img.shields.io/badge/PRODUCT_HUNT-SARDROBE-DA552F?style=for-the-badge&amp;logo=producthunt&amp;logoColor=white" /></a>
  <a href="#cloudflare-deployment"><img alt="Cloudflare Workers" src="https://img.shields.io/badge/CLOUDFLARE-WORKERS-F38020?style=for-the-badge&amp;logo=cloudflare&amp;logoColor=white" /></a>
  <a href="#on-device-planning-ai"><img alt="On-device planning AI" src="https://img.shields.io/badge/AI-ON_DEVICE-6C5CE7?style=for-the-badge" /></a>
  <a href="#webmcp"><img alt="WebMCP enabled" src="https://img.shields.io/badge/WEBMCP-ENABLED-147D64?style=for-the-badge" /></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/LICENSE-MIT-2f2f2b?style=for-the-badge" /></a>
</p>

<p align="center">
  <a href="#main-functions">Features</a>
  ·
  <a href="#local-installation">Local installation</a>
  ·
  <a href="#cloudflare-deployment">Cloudflare deployment</a>
</p>

<p align="center">
  <a href="https://www.buymeacoffee.com/omarkawach"><img alt="Buy me a coffee" src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&amp;emoji=%E2%98%95&amp;slug=omarkawach&amp;button_colour=FFDD00&amp;font_colour=000000&amp;font_family=Lato&amp;outline_colour=000000&amp;coffee_colour=ffffff" /></a>
</p>

![Sardrobe application overview](apps/frontend/public/banner.png)

Sardrobe is an open-source digital wardrobe. Use it to catalog clothes, create outfits, and prepare packing lists.

Sardrobe processes original clothing photos in the browser. It uploads only the final WebP cutouts to the configured Cloudflare R2 bucket. If you self-host Sardrobe, the application data stays in your Cloudflare account.

Optional AI functions run in supported desktop browsers. They do not use a hosted model API.

## Main functions

- Import multiple clothing photos.
- Remove photo backgrounds in the browser.
- Review and edit imported items before you save them.
- Add item names, categories, colors, seasons, occasions, brands, and notes.
- Search, filter, group, edit, and delete wardrobe items.
- Arrange wardrobe items on an outfit canvas.
- Save and edit outfits.
- Create packing plans with dates, outfits, items, notes, and packed states.
- Sign in with Google.
- Use native WebMCP tools in a compatible browser and agent.

## WebMCP

Sardrobe registers every tool through the imperative `document.modelContext.registerTool()` API, typed with `webmcp-types`. The official `@w3c/webmcp-polyfill` supplies the API in secure browsers without native support and preserves existing native implementations. Sardrobe does not use the declarative WebMCP form API.

Use one of these environments:

- ChatGPT's in-app browser, which supports WebMCP without additional browser configuration;
- Google Chrome 149 or a later version with `chrome://flags/#enable-webmcp-testing` enabled and a WebMCP-compatible agent.

Restart Chrome after you enable the flag. Chrome without a compatible agent cannot call the tools.

The tools use the same session and server authorization as the user interface. Mutation tools register while their corresponding editor is open and share its validation, confirmation rules, and save handlers. Sardrobe does not require an MCP relay, an extension, or a separate agent credential. The polyfill supplies the page API; calling it from an agent still requires a compatible browser or agent integration.

Read the [WebMCP agent guide](apps/frontend/public/.well-known/sardrobe-agent-guide.md) for the tool list and safe workflows.

## On-device planning AI

On-device planning AI is an optional desktop feature. Enable it in the account menu. Sardrobe uses [SmolVLM-500M-Instruct](https://huggingface.co/HuggingFaceTB/SmolVLM-500M-Instruct) for outfit and trip planning.

Transformers.js and the Vercel AI SDK run the selected model with WebGPU.

On-device planning AI can:

- create an outfit draft from a text request and an optional reference image;
- create a packing-plan draft from a text request.

On-device planning AI does not identify, label, or describe wardrobe items. Enter and review item details yourself when importing or editing clothes. Image-based wardrobe recognition is experimental and is intentionally not exposed in the product; a future iteration may evaluate Google's LiteRT-LM image-input support.

The browser cache stores the model files. On-device planning AI is not available on phones or tablets.

Planning results are drafts. Review each outfit or packing plan before you save it.

## Local installation

### Requirements

- Node.js 22.23.4 or a later version (see `.node-version`)
- pnpm 12 (the exact version is pinned in `package.json`)
- A Google OAuth web client

### Procedure

1. Install the dependencies.

   ```sh
   pnpm install
   ```

2. Copy the local configuration files.

   ```sh
   cp apps/backend/.dev.vars.example apps/backend/.dev.vars
   cp apps/frontend/.env.example apps/frontend/.env
   ```

3. Add these values to `apps/backend/.dev.vars`:

   - `BETTER_AUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

   Use this command to make a suitable Better Auth secret:

   ```sh
   openssl rand -hex 32
   ```

4. Add this authorized redirect URI to the Google OAuth client:

   ```text
   http://localhost:4321/api/auth/callback/google
   ```

5. Create the local database.

   ```sh
   pnpm db:migrate:local
   ```

6. Start the application.

   ```sh
   pnpm dev
   ```

7. Open [http://localhost:4321](http://localhost:4321).

`pnpm dev` also serves the exported background-removal model on port 8790. If `packages/background-remover/tooling/build` does not contain the model files, use the [model tooling instructions](packages/background-remover/tooling/README.md).

The [`.mcp.json`](.mcp.json) file is for compatible coding agents. It connects an agent to documentation for Better Auth, Astro, Cloudflare, and Chrome DevTools. Sardrobe does not use this file at runtime.

## Cloudflare deployment

Use the [deployment instructions](docs/DEPLOYMENT.md) to deploy a fork.

The instructions include these tasks:

- provision a D1 database and an R2 media bucket;
- configure Google OAuth and Better Auth;
- export and upload the background-removal model;
- apply database migrations;
- deploy the Workers;
- configure custom domains;
- configure Sentry if you require it.

The public `wrangler.jsonc` files do not contain Sardrobe account IDs, resource IDs, domains, or secrets. Wrangler can provision resources for a different Cloudflare account.

## Technology

- Astro and React
- Hono and Cloudflare Workers
- Cloudflare D1 and R2
- Better Auth and Google OAuth
- Drizzle ORM
- Base UI
- ONNX Runtime Web
- Transformers.js
- Vercel AI SDK
- WebMCP

## Project structure

- `apps/frontend`: Astro site, React application, frontend Worker, and model route
- `apps/backend`: Hono API Worker
- `packages/data-ops`: Better Auth configuration, Drizzle schema, and D1 migrations
- `packages/background-remover`: Browser runtime and model export tools
- `packages/design-tokens`: Shared design tokens
- `packages/react-components`: Shared React components

## Development checks

Install Chromium for the component tests:

```sh
pnpm --filter @sardrobe/react-components exec playwright install chromium
```

Run individual checks:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Test the complete WebMCP workflow with your own PNG, JPEG, or WebP images:

```sh
pnpm --filter @sardrobe/frontend test:e2e:webmcp /path/to/demo-images
```

This builds the app and runs Chromium with native WebMCP disabled, exercising the official polyfill against the production frontend build and real backend Worker. It uses fresh local D1 and R2 storage and a seeded local session, processes and saves the supplied images, checks wardrobe/outfit/packing tools and their returned images, and tests validation and confirmation. Original files stay unchanged. Public background-removal model files are read from Sardrobe; no live wardrobe data or Google credentials are used. Google OAuth itself is outside this test. Results and screenshots are written to `apps/frontend/test-results/webmcp` (override with `SARDROBE_E2E_OUTPUT_DIR`).

Transformers.js stays pinned to 4.2.0 and ONNX Runtime Web to 1.29.0 because their newer WASM files exceed Cloudflare Workers' 25 MiB asset limit. Run `pnpm check:cloudflare` whenever changing these runtime versions.

Run all checks:

```sh
pnpm check
```

Start Storybook:

```sh
pnpm storybook
```

## Common questions

### Does Sardrobe upload original photos?

No. The browser processes each original photo. Sardrobe uploads only the final WebP cutout to the configured R2 bucket.

### Does Sardrobe require an AI API key?

No. The optional AI model runs in the browser. Google OAuth credentials are necessary for sign-in.

### Can I self-host Sardrobe?

Yes. Fork the repository and use the Cloudflare deployment instructions.

### Can I contribute without access to the Sardrobe Cloudflare account?

Yes. You can install the project and run all checks without access to the official development or production environments. The repository owner deploys accepted changes.

## Contributions and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you open a pull request. Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

Report a vulnerability with a private GitHub security advisory. Read [SECURITY.md](SECURITY.md) for the procedure.

## License

Sardrobe uses the [MIT License](LICENSE).

Read [`packages/background-remover/NOTICE`](packages/background-remover/NOTICE) for background-removal attribution. Read [`apps/frontend/NOTICE`](apps/frontend/NOTICE) for on-device AI attribution. The repository does not contain pretrained model weights.
