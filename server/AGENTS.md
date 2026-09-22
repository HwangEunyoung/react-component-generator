## Module Context

Bun HTTP server (`Bun.serve`, port 3002) that proxies component-generation requests to Anthropic or Google, normalizes the LLM's text into `react-live`-executable code, and returns it to the Vite frontend (proxied via `/api/*`).

## Tech Stack & Constraints

- Runtime: Bun only (`bun --watch run server/index.ts`, `package.json:8`). Do not introduce Node-only APIs that Bun doesn't support without checking first.
- No framework — raw `Bun.serve` fetch handler (`server/index.ts:138-220`). Two routes only: `GET /api/config`, `POST /api/generate`.
- Provider calls use raw `fetch` to the Anthropic Messages API and Google Generative Language API directly — no SDK dependency for either.

## Implementation Patterns

- Keep provider HTTP calls (`callAnthropic`, `callGoogleModel`) and routing in `server/index.ts`; keep pure/testable transforms in `server/generator.ts` and `server/fallback.ts`. See Testing Strategy below — this split exists specifically to keep `index.ts` untestable-by-design content minimal.
- Error responses always map to a Korean user-facing message and go through `CORS_HEADERS` (`server/index.ts:191-212`) — new error branches should follow this pattern (check status code substring, return `Response.json` with the same header set), not throw raw errors to the client.

## Testing Strategy

- Run: `bun run test` (or `bun run test:watch`), config in `vite.config.ts:20` includes `server/**/*.test.ts`.
- Only pure functions get tests: `generator.test.ts` covers `stripCodeFences`/`ensureRenderCall`, `fallback.test.ts` covers `withModelFallback`. `server/index.ts` has zero test coverage.
- **Rule:** if new logic needs a test, extract it as a pure function into `generator.ts` or `fallback.ts` (or a new sibling file with the same "no Bun.serve side effects" property) instead of adding it directly to the `fetch` handler in `index.ts`.

## Local Golden Rules

- **Don't make `callAnthropic` and `callGoogle` symmetric by default.** `callGoogle` retries across `GOOGLE_MODELS` via `withModelFallback` (`server/index.ts:5,134-136`); `callAnthropic` is single-shot (`server/index.ts:68-96`). This is the current, intentional state — if asked to "add retry," confirm which provider(s) it should apply to rather than mirroring the other path automatically.
- **Never relax `resolveApiKey`'s precedence silently.** `clientKey || ENV_KEYS[provider] || null` (`server/index.ts:64-66`) means a request body's `apiKey` always overrides the server's own `.env` key. Any refactor of this function must preserve "request key wins," since the frontend relies on it to let users bring their own key (`src/hooks/useComponentGenerator.ts:26`).
- **Never drop `stripCodeFences` or `ensureRenderCall` from the pipeline** (`server/index.ts:188`, `server/generator.ts`). They defend against two independent LLM failure modes (stray markdown fences; missing `render()` call) and are not redundant with each other or with the system prompt.
- **`SYSTEM_PROMPT` (`server/index.ts:7-49`) is a cross-file contract, not a style preference.** It forbids `import` statements and TypeScript syntax and mandates a trailing `render(<Component />)` call because `src/components/LivePreview.tsx` executes the returned code via `react-live`'s `noInline` mode with React injected as a global and no module resolution. Any edit to the prompt's code-shape rules requires checking `LivePreview.tsx` (and vice versa).
