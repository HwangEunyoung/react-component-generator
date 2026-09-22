## Operational Commands

- Package manager: **bun only** (`bun.lock` present). Do not use npm/yarn/pnpm.
- Install: `bun install`
- Dev (API + frontend together): `bun run dev`
- API server only (port 3002, hot reload): `bun run server`
- Build: `bun run build` (runs `tsc -b` then `vite build` — type errors fail the build)
- Lint: `bun run lint`
- Test (single run): `bun run test`
- Test (watch): `bun run test:watch`
- Frontend proxies `/api/*` to `http://localhost:3002` (`vite.config.ts:9-14`). The API server must be running separately in `dev` — it is not started by Vite itself.

## Golden Rules

### Immutable

- Never commit `.env` or print its contents. It holds `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` and is already gitignored (`.gitignore`) — keep it that way.
- Never log or persist the request body of `POST /api/generate` (`server/index.ts:159-190`). It can carry a user-supplied `apiKey` in plaintext (`src/hooks/useComponentGenerator.ts:26`), and `Access-Control-Allow-Origin: '*'` (`server/index.ts:51-55`) means this endpoint accepts cross-origin requests from anywhere.

### Team-specific rules (evidence-based)

- **Security boundary — client key overrides server key.** `resolveApiKey` (`server/index.ts:64-66`) returns `clientKey || ENV_KEYS[provider] || null`, so a request-supplied `apiKey` always wins over the server's `.env` key. This is intentional (lets users bring their own key), but it means the `/api/generate` handler must never widen what it echoes back or logs, since it may be forwarding a real user secret through an open-CORS endpoint.
- **Asymmetry — Anthropic has no model fallback, Google does.** `callGoogle` wraps every attempt in `withModelFallback(GOOGLE_MODELS, ...)` (`server/index.ts:134-136`), trying `gemini-3.1-flash-lite` then `gemini-3.5-flash`. `callAnthropic` (`server/index.ts:68-96`) calls a single hardcoded model with no retry/fallback path. Don't assume the two provider paths behave the same — if you add fallback/retry logic, decide explicitly whether it belongs on one path or both.
- **Hard constraint — generated code contract.** `SYSTEM_PROMPT` (`server/index.ts:7-49`) requires AI output to: use no `import` statements (React is a global), use no TypeScript syntax, and end with a `render(<Component />)` call. This is not stylistic — `LivePreview` renders that code through `react-live`'s `noInline` mode (`src/components/LivePreview.tsx:14`), which has no module system and only paints when `render()` is called. Changing the prompt's contract without updating `LivePreview` (or vice versa) breaks every generated component.
- **Double defense — two independent normalizers guard the render contract.** Even though the prompt asks for clean output, `server/generator.ts` still runs `stripCodeFences` (strips stray markdown fences) and `ensureRenderCall` (injects a `render()` call if the model forgot one) before any code reaches the client (`server/index.ts:188`). Removing either function reintroduces a class of bug the other doesn't cover — fence-stripping doesn't guarantee a `render()` call, and `render()`-injection doesn't clean fences.
- **Test boundary — side-effect-free logic only.** `server/generator.ts` and `server/fallback.ts` are pure functions with dedicated test files (`server/generator.test.ts`, `server/fallback.test.ts`); the module comment says why: "부수효과(Bun.serve 등)가 없어 단위 테스트가 가능하다" (`server/generator.ts:1-2`). `server/index.ts` (the `Bun.serve` handler) has no test file. When adding logic that needs unit tests, extract it into a pure function in `generator.ts`/`fallback.ts` rather than inlining it into the `fetch` handler.

## Project Context

Prompt-to-React-component generator: user describes a UI, an LLM (Anthropic Claude or Google Gemini, user's choice) generates a single self-contained React component, which is rendered live and shown as code.

Tech stack: React 19, TypeScript, Vite, Bun (API proxy server), react-live (runtime rendering), Vitest + Testing Library.

## Standards & References

- See `README.md` for setup/usage instructions — not duplicated here.
- Commit messages: no established convention in history yet: use concise, present-tense summaries.
- **Maintenance policy:** if you find code that contradicts a Golden Rule above (e.g., Anthropic gains a fallback path, or CORS is restricted), update this file in the same change rather than leaving it stale.

## Context Map

- **[API/provider changes (server)](./server/AGENTS.md)** — touching `server/index.ts`, `server/generator.ts`, `server/fallback.ts`, the system prompt, or provider/API-key handling.
- **[UI/preview changes (frontend)](./src/AGENTS.md)** — touching React components, the generation hook, or the `react-live` preview pipeline.
