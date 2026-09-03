# `@sardrobe/frontend`

Astro serves Sardrobe's public pages and authenticated React application. The
frontend Worker:

- protects authenticated app routes;
- forwards `/api/*` to the private backend through a service binding;
- streams immutable background-removal assets from a private R2 binding;
- applies the production security and cross-origin-isolation headers required by ONNX Runtime Web.

WebMCP tools live in `src/features/webmcp`; the optional desktop-only local AI
runtime lives in `src/features/local-ai`. Use the repository-level
[local setup](../../README.md#run-it-locally) and
[deployment guide](../../docs/DEPLOYMENT.md).
