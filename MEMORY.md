# Project Memory
Last updated: 2026-06-02

## Architecture
- **MailMentor**: AI-powered multi-account email client. Next.js 14 App Router, TypeScript, Tailwind, zustand, framer-motion.
- **Mail providers** (multi-account, simultaneous): Gmail (Google OAuth) + Outlook / Microsoft 365 / personal @outlook.com (Microsoft Entra ID / Azure AD). Active account drives a single inbox view; switch via sidebar pill.
- **LLM**: Groq `llama-3.3-70b-versatile` by default. OpenAI-compatible SDK; swap provider with `AI_BASE_URL`/`AI_MODEL`/`AI_API_KEY` env vars (OpenRouter, Cerebras, etc.).
- **Auth model**: NextAuth v4 JWT. `accounts: LinkedAccount[]` + `activeAccountId` in token/session. Re-linking same account refreshes tokens; new sign-in appends to array; switch via `useSession().update({ activeAccountId })` (triggers `jwt` callback with `trigger: "update"`).
- **Provider abstraction**: `src/lib/account.ts` — `requireActiveAccount()`, `listMessages()`, `getMessage()`, `setUnread()`, `sendReply()`, `fetchCorpus()`. Throws `NoActiveAccountError` / `UnsupportedProviderError`. Dispatches to `src/lib/gmail/*` or `src/lib/outlook/*`.
- **Database**: Vercel Postgres via Prisma 6.19.3. Pin 6.x — 7.x had breaking schema config changes. 10 models: User, Account, Session, VerificationToken, ProfileMirror, TaskMirror, Connector, Recipe, PendingAction, ActionLog.
- **Token storage**: AES-256-GCM ciphertext, scrypt-derived 32-byte key from `AUTH_SECRET` with salt `"mailmentor-v1"`. Format `<ivHex>:<tagHex>:<encHex>`.
- **Tier 3 — Recipe framework**: User describes an automation in plain English → LLM parser emits a Zod-validated Recipe (trigger + conditions + actions) → recipe engine runs against the active inbox on every mount, queues matches as `PendingAction` rows → user approves/denies in a side panel. Trust model: "Suggest, never act."
- **Tier 3 — Connectors**: registered in `src/lib/connectors/registry.ts`; OAuth tokens stored encrypted in `Connector` table. v1 implements Google Calendar (read free/busy, create events, propose slots).
- **Trigger model**: "On app open / scheduled" — no Gmail Pub/Sub or Graph webhooks. Vercel Cron will handle scheduled recipes (v1.1).
- **UI placement**: Sidebar slide-over panels (Pending / Recipes / Connectors) modeled on the existing `ProfilePanel` slide-over.

## Recent Work (2026-06-02)
**Tier 3 build — 5 days, all 16 todos complete:**
- **Day 1**: `prisma/schema.prisma` (10 models), `db.server.ts` (client singleton), `user.server.ts` (`requireUser`/`getOrCreateUserByEmail`), `crypto.server.ts` (AES-256-GCM `encryptToken`/`decryptToken`). Endpoints: `/api/profile/store` (GET/PUT), `/api/tasks` (GET/POST), `/api/tasks/[id]` (PATCH/DELETE). `Connector.accessToken` and `scope` made nullable in schema after Prisma regen.
- **Day 2**: `lib/recipe/schema.ts` (Zod `RecipeSchema`, `RecipeDraftSchema`, `TriggerSchema` discriminated union, `ConditionSchema`, `ActionSchema` 7-type union). `lib/recipe/parser.ts` (`parseRecipeFromNL`, one auto-retry on Zod fail). `lib/recipe/evaluator.ts` (`emailMatchesRecipe`, `findMatchingRecipes`). `lib/ai.ts` `chatCompletion()` exported. Endpoints: `/api/recipes` (GET/POST), `/api/recipes/[id]` (PATCH/DELETE).
- **Day 3**: `lib/recipe/engine.ts` (`runRecipesForEmail`, `previewRecipeForEmail`, `runScheduledRecipes`). `lib/recipe/run-action.ts` (`LooseRecipeAction` for runtime). `lib/recipe/action-registry.ts` extended with `PREVIEW_HANDLERS` + `registerPreviewHandler()`. UI: `PendingActionsPanel`, `RecipePanel` (with NL composer + 4 seed templates), `ConnectorsPanel` — all 3 mounted in `Sidebar` under new "Automation" section with count badges. Endpoints: `/api/pending-actions` (GET/POST), `/api/pending-actions/[id]/approve` (POST), `/api/pending-actions/[id]/deny` (POST), `/api/recipes/run-for-inbox` (POST, called on inbox mount).
- **Day 4**: `lib/connectors/google-calendar.ts` — `findFreeSlots` (free/busy.query + working-hours walk, weekends skipped, 30-min granularity, up to 5 slots), `createEvent` (Meet link optional), `getValidAccessToken` (auto-refresh via `oauth2.googleapis.com/token`). Endpoints: `/api/connectors/[provider]/connect|disconnect` (re-uses user's Google session tokens, encrypts and copies). Prisma `Connector.scope` column added.
- **Day 5**: `lib/recipe/actions/ai-draft-reply.ts` — auto-detects meeting requests (`meet`/`schedule`/`call`/etc. keywords) and looks up Calendar slots itself, falling back to priorResults chain. `lib/recipe/voice.ts` — `applyUserVoice` reuses the existing sign-off chain. `lib/recipe/actions/preview-handlers.ts` — wires `calendar.propose_slots` + `ai.draft_reply` preview handlers. Engine now copies `result.data` into `payload` for `ai.draft_reply` so the approve endpoint can re-use the full draft without re-running the LLM. Approve endpoint special-cases `ai.draft_reply` to call `sendReply()` directly. `lib/recipe/seed.ts` — 4 starter recipes (meeting requests, boss emails, newsletter archive, PR outreach). RecipePanel composer shows seeds as one-click templates. PendingActionsPanel card for draft-reply shows full body (line-clamp 4, expand toggle) and "Send" button.
- **Build status**: `npm run build` green, `npm run lint` clean. 23 routes (was 13 at end of Multi-Account build). Bundle `/inbox` 10.5kB, `/signin` 5.2kB, `/tasks` 2.51kB.

## Preferences
- Code style: minimal comments. Modern TS strict. No emojis. Short, calm copy. Spring physics + stagger reveal + blur-reveal for animations.
- Project root: `C:\Users\minh\Documents\freebies\mailmentor`.
- `npm run build` and `npm run lint` must pass before considering any task complete.
- Token storage at rest: AES-256-GCM encrypted.
- Use `server-only` import marker in all server modules that touch the DB or secrets.
- 5-day build pattern (1 day per major surface). 16-todo structure.

## Open Items
- **Outlook live test**: user must add 8 delegated API permissions to the Azure AD app `MailMentor (local)` (client ID `1c004d91-de68-434d-8f92-97f5a967771b`). The direct portal link: `https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/ResourceAccess/appId/1c004d91-de68-434d-8f92-97f5a967771b`. — if sign-in fails with `AADSTS7000215`, the user may have copied the Secret ID instead of the Value column.
- **Vercel Cron** for scheduled recipes — not wired yet; v1.1 task. Add `vercel.json` with `{ "crons": [{ "path": "/api/recipes/run-scheduled", "schedule": "0 * * * *" }] }`.
- **Connector consent screen for expired tokens**: v1 returns 401 ("re-link Google") when Calendar OAuth token is expired. Future v1.1: add `/api/connectors/[provider]/callback` route + Google OAuth flow that re-grants the Calendar scope without re-doing Gmail sign-in.
- **Profile staleness**: 7-day threshold in `profileStore.isStale()`. ProfileBootstrap re-runs on mount when stale. Could add manual "force rebuild" hook from sidebar chip.
- **n+1 message fetch**: Gmail list issues `users.messages.get` per id in parallel. Acceptable for 50-message inbox; would batch with `users.messages.batchGet` for >100.
- **Recipe list state**: RecipePanel only shows saved recipes; for v1 we don't show "currently disabled" / "last fired" timeline. Could be a follow-up detail page.
- **Connector Slack/Notion**: in registry with 501-not-implemented stubs. Real implementations deferred.

## Recent Work (2026-06-03)
- **Outlook OAuth callback route**: Created `src/app/api/connectors/outlook/callback/route.ts` — exchanges Microsoft code for tokens, fetches profile from Graph API, stores encrypted tokens in Connector table via upsert.
- **Middleware updated**: Both callback routes (`gmail`, `outlook`) added as public routes.
- **Clerk webhook endpoint**: Created `src/app/api/webhooks/clerk/route.ts` — verifies webhook via `@clerk/nextjs/webhooks`, handles `user.created`/`user.updated`/`user.deleted` to sync Clerk users to local User table.
- **User model**: Added `clerkId` (optional, unique) field — `prisma db push` applied.
- **Multi-account switching**: Added `preferredProvider` param to `requireActiveAccount()` — maps `"gmail"`→`"google"`, `"outlook"`→`"azure-ad"` provider names. All 6 API routes updated to read `accountId` from query params/body.
- **AccountSwitcher fix**: Helper functions now handle `"gmail"`/`"outlook"` provider names from connector registry (not just `"google"`/`"azure-ad"`).
- **Build**: 24 routes, passes cleanly.
- **DB**: `clerkId` column added to User table, Prisma client regenerated.

## Key Decisions (new)
- Clerk webhook uses `@clerk/nextjs/webhooks` `verifyWebhook()` — reads `CLERK_WEBHOOK_SIGNING_SECRET` env var.
- `clerkId` on User model enables clean `user.deleted` handling (Clerk delete events only include user ID, not email).
- Multi-account switching: client-side hooks pass `?accountId=gmail` to API routes; server-side `requireActiveAccount()` matches by provider name.

## Verified 2026-06-03
- `prisma db push --accept-data-loss` applied — `clerkId` column added to User table.
- `npm run build` passes — 24 routes (new: `/api/webhooks/clerk`).
- All 6 API routes read `accountId` query param for multi-account switching.
