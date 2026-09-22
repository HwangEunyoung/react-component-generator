## Module Context

Vite + React 19 frontend: prompt input, provider/API-key selection, and a results grid that renders each generated component through `react-live` (preview tab) or as raw text (code tab). Talks to the API server only through `/api/generate` and `/api/config` (proxied by Vite, see root `AGENTS.md`).

## Tech Stack & Constraints

- React 19 function components + hooks only; no class components, no external state library (state lives in `App.tsx` and `useComponentGenerator.ts`).
- Styling is plain CSS (`App.css`, `index.css`), not CSS modules or a CSS-in-JS library — matches the constraint that *generated* components must use inline styles only (`server/index.ts:10`), so don't introduce a styling approach here that the generated-code contract doesn't also support if the two are ever meant to interoperate.

## Implementation Patterns

- Data flow is one-directional: `App.tsx` owns `apiKey`/`provider` state and calls `useComponentGenerator().generate(...)`; the hook owns the `components`/`isLoading`/`error` state and does the `fetch('/api/generate', ...)` call (`src/hooks/useComponentGenerator.ts:18-49`). New generation-related state belongs in the hook, not scattered into components.
- `ComponentCard` remounts `LivePreview` by bumping a `key` (`previewKey`, `src/components/ComponentCard.tsx:17,70`) to force a full re-render/re-mount (e.g. to replay animations) instead of trying to reset internal `react-live` state some other way.

## Testing Strategy

- Run: `bun run test` (jsdom env, config in `vite.config.ts:16-21`, setup in `src/test/setup.ts` which runs `cleanup()` after each test).
- Only `PromptInput.tsx` has a test file (`PromptInput.test.tsx`) among all `src/components/*`. `App.tsx`, `ComponentCard.tsx`, `CodeView.tsx`, `LivePreview.tsx`, and `useComponentGenerator.ts` are untested. `PromptInput` is pure/presentational (props in, callback out, no fetch); components that own network calls or `react-live` execution are not currently covered by any test.
- If asked to add tests for the untested surface, follow the existing pattern in `PromptInput.test.tsx`: Testing Library + `userEvent`, assert on rendered roles/text, not implementation details.

## Local Golden Rules

- **`LivePreview` executes AI-generated code directly in the page, unsandboxed.** `LiveProvider`/`LivePreview` from `react-live` (`src/components/LivePreview.tsx:1,14-19`) run the returned `code` string in the same DOM/JS context as the rest of the app — there is no iframe or sandbox. Do not treat the generated-code path as safe to relax (e.g. do not add `dangerouslySetInnerHTML` or `eval` elsewhere in this tree without the same scrutiny this already-accepted risk gets).
- **`apiKey`/`provider`/`components`/prompt history are persisted to `localStorage` (explicit user request, 2026-09-22).** `useLocalStorage` (`src/hooks/useLocalStorage.ts`) backs `App.tsx`'s `apiKey`/`provider` state (`rcg:apiKey`, `rcg:provider`) and `useComponentGenerator.ts`'s `components`/`promptHistory` state (`rcg:components`, `rcg:promptHistory`), so all four survive a page refresh. `apiKey` is still cleared on provider switch (`handleProviderChange`, `src/App.tsx`). **Security trade-off accepted by this request**: the plaintext API key now sits in `localStorage` on the same origin where `LivePreview` executes unsandboxed AI-generated code — an XSS there could read the key. If this is ever reverted to in-memory-only, do it only on an explicit request (mirroring how this persistence was itself explicit).
