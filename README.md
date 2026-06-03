# MailMentor

An AI-powered email assistant. Reads your real Gmail, summarizes threads, extracts tasks, and drafts replies. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, zustand, NextAuth, and an OpenAI-compatible LLM (Groq by default).

> **Design:** Saffron & Moss — Inter Variable + Fraunces italic serif, warm saffron accent on a static radial wash, moss accent in two places (unread ring + VIP marker), frosted-glass surfaces, and spring motion. A custom command palette (`⌘K`) ties it all together.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → you'll be redirected to `/signin` → click **Continue with Google** → grant the Gmail scopes → land in `/inbox`.

## What's in the box

- **OAuth sign-in** with Google (NextAuth.js v4)
- **Real Gmail** — list, read, mark-as-read, and send replies via the Gmail API
- **3-panel inbox** at `/inbox` — sidebar, importance-sorted list, Smart Assistant pane
- **AI** powered by an OpenAI-compatible endpoint (default: **Groq** free tier, 14,400 req/day, no card) — summarize, extract tasks, draft replies
- **Reply-mode toggle** — always-reply (default) or decline-if-unrelated, per session, persisted in `localStorage`
- **Global tasks** at `/tasks` with done-toggles and source-email deep-links
- **Auto-persistence** — tasks extracted from any email land in the global list
- **30s polling** + manual refresh button in the inbox header
- **Command palette** (`⌘K`) for navigation, search, and quick actions
- **Toast notifications** on every AI action
- **Keyboard shortcuts** — `j` / `k` to move, `r` to refresh, `g i` / `g t` / `g m` to jump
- **User profile** — auto-generated from your last 100 emails (sent + received) on first sign-in; injected into every AI call so summaries and replies match your voice, your projects, and the people you work with. View + edit in the sidebar profile chip.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open command palette |
| `j` | Next email in list |
| `k` | Previous email in list |
| `r` | Refresh inbox |
| `g i` | Go to Inbox |
| `g t` | Go to Tasks |
| `g m` | Toggle Important view |
| `Esc` | Close command palette |

Shortcuts are ignored when an input or textarea is focused.

## Design system

| Token | Value | Usage |
|---|---|---|
| `--primary` | `36 65% 55%` | Saffron accent (`#d6a341`) |
| `--moss` | `95 22% 42%` | Moss accent (`#6e7d3f`) — unread ring, VIP marker, profile "relationship" |
| `--surface-elevated` | warm zinc @ 70% | Frosted backgrounds (`.surface-glass`) |
| `--border-soft` | white @ 6% | Hairline dividers (`.border-soft`) |
| `--serif` | Fraunces italic | Subject lines, headlines, empty states |

The background is a single static warm radial wash with a faint noise overlay. The Smart Assistant uses a distinct **frosted surface** (`bg-card/50 backdrop-blur-xl`) with a top-edge hairline that warms when the AI is working.

## Setup (one-time)

### 1. Google Cloud — OAuth client

1. Go to https://console.cloud.google.com
2. Create (or pick) a project, e.g. `MailMentor`
3. **APIs & Services → Library** → enable **Gmail API**
4. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - Fill in the required app name + support email
   - Add scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`, `openid`, `email`, `profile`
   - **Test users → + ADD USERS → add the exact Gmail address you'll sign in with**
     ⚠️ Skipping this step gives you `Error 403: access_denied` at sign-in.
5. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `MailMentor local`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - Copy the **Client ID** and **Client secret**

### 2. AI provider — Groq (free, no credit card)

1. Go to https://console.groq.com/keys
2. Click **Create API key** → copy it (it starts with `gsk_…`)
3. Paste it into `.env.local` as `AI_API_KEY=…`

The default model is `llama-3.3-70b-versatile` (very fast, 30 RPM, 14,400 req/day). To swap to a different OpenAI-compatible provider, change the three env vars:

| Var | Default | Examples |
|---|---|---|
| `AI_BASE_URL` | `https://api.groq.com/openai/v1` | `https://openrouter.ai/api/v1`, `https://api.cerebras.ai/v1` |
| `AI_MODEL` | `llama-3.3-70b-versatile` | `meta-llama/llama-3.3-70b-instruct:free`, `openai/gpt-oss-120b:free` |
| `AI_API_KEY` | _(your key)_ | any OpenAI-format key |

### 3. (Optional) Microsoft / Outlook support

MailMentor supports linking **any number of Gmail + Outlook / Microsoft 365 accounts simultaneously**. Skip this section if you only need Gmail — the Microsoft sign-in button stays hidden until these env vars are set.

1. Go to https://portal.azure.com → **Microsoft Entra ID** → **App registrations** → **New registration**
   - Name: `MailMentor (local)`
   - Supported account types: **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)**
   - Redirect URI: **Web** → `http://localhost:3000/api/auth/callback/azure-ad`
2. Once created, copy the **Application (client) ID** and **Directory (tenant) ID** from the Overview page.
3. **Certificates & secrets → Client secrets → New client secret** → copy the **Value** (not the Secret ID).
4. **API permissions → Add a permission → Microsoft Graph → Delegated permissions** and add: `User.Read`, `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `offline_access`, `openid`, `profile`, `email`.
   - Click **Grant admin consent for…** if your org requires it (personal accounts skip this step).
5. Fill in `.env.local`:

```bash
AZURE_AD_CLIENT_ID=<application client id>
AZURE_AD_CLIENT_SECRET=<client secret value>
AZURE_AD_TENANT_ID=common   # "common" supports both work/school + personal
```

Restart `npm run dev`. The "Continue with Microsoft" button now appears on the sign-in page (it shows up *automatically* once both `AZURE_AD_CLIENT_ID` and `AZURE_AD_CLIENT_SECRET` are set — no extra flag needed). The sidebar shows a multi-account switcher that lists every Gmail + Outlook account you've linked.

### 4. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
# (optional) Outlook — leave both empty to hide the Microsoft sign-in button:
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=common
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=<run: openssl rand -base64 32>
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.3-70b-versatile
AI_API_KEY=gsk_xxxxx
```

If `AI_API_KEY` is missing, AI features disable with a console warning. Real errors (bad key, quota exhausted, malformed response) surface as a red toast with the actual error message.

## Architecture

```
src/
├── app/
│   ├── (app)/                       # auth-required route group
│   │   ├── layout.tsx               # session guard + sidebar shell + CommandK + shortcuts
│   │   ├── inbox/page.tsx           # 3-panel layout
│   │   └── tasks/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/      # NextAuth handler (Google + optional Azure AD)
│   │   ├── auth/unlink/             # POST → remove a linked account
│   │   ├── mail/                    # provider-routed, active account only
│   │   │   ├── messages/            # GET list, GET /:id, PATCH /:id (read toggle)
│   │   │   └── send/                # POST send reply
│   │   ├── ai/
│   │   │   ├── summarize/           # POST → LLM summarize + tasks
│   │   │   └── reply/               # POST → LLM draft
│   │   └── profile/
│   │       └── generate/            # POST → fetch 50+50 emails, LLM extracts profile
│   ├── signin/page.tsx              # Google + (optional) Microsoft buttons
│   ├── layout.tsx                   # root: fonts + GradientBg + Providers
│   ├── globals.css                  # design tokens, animations, utilities
│   └── page.tsx                     # redirect to /inbox
├── components/
│   ├── Brand.tsx                    # SVG mark + wordmark
│   ├── GradientBg.tsx               # fixed aurora mesh + noise
│   ├── Skeleton.tsx                 # shimmer placeholders
│   ├── Toast.tsx                    # toast provider + useToast
│   ├── CommandK.tsx                 # ⌘K command palette
│   ├── AccountSwitcher.tsx          # multi-account pill in sidebar
│   ├── ProfilePanel.tsx             # view + edit + refresh user profile
│   ├── Sidebar.tsx
│   ├── EmailList.tsx
│   ├── EmailListItem.tsx
│   ├── SmartAssistant.tsx           # frosted AI surface
│   ├── TaskCard.tsx
│   ├── Providers.tsx
│   └── ui/                          # shadcn primitives
├── hooks/
│   ├── useEmails.ts                 # SWR list w/ 30s refresh, re-keys on activeAccountId
│   ├── useEmail.ts                  # SWR single (full body on demand)
│   └── useKeyboardShortcuts.ts      # single keys + g x chords
├── lib/
│   ├── auth.ts                      # NextAuth config: multi-account JWT + per-provider refresh
│   ├── ai.ts                        # OpenAI-compatible client + Zod validation + retry
│   ├── account.ts                   # provider-agnostic abstraction: list/get/send/setUnread/corpus
│   ├── profile.ts                   # Zod UserProfile schema + buildProfileContext()
│   ├── gmail/
│   │   ├── client.ts                # googleapis OAuth2 + Gmail v1
│   │   ├── parse.ts                 # MIME → Email type
│   │   ├── profile-source.ts        # 50 sent + 50 received for profile corpus
│   │   └── send.ts                  # RFC822 builder + users.messages.send
│   ├── outlook/                     # Microsoft Graph client (parallel to gmail/)
│   │   ├── client.ts                # Bearer + JSON fetch wrapper
│   │   ├── parse.ts                 # Graph message → Email type
│   │   ├── send.ts                  # me/sendMail or reply
│   │   └── profile-source.ts        # sentItems + inbox for profile corpus
│   ├── importance.ts                # VIP +10, keyword +5, reply +3
│   ├── vipSenders.ts                # boss / client / spouse
│   └── utils.ts
│   ├── importance.ts                # VIP +10, keyword +5, reply +3
│   ├── vipSenders.ts                # boss / client / spouse
│   └── utils.ts
├── store/
│   ├── emailStore.ts                # selectedEmailId + readIds + generateReplyToken
│   ├── profileStore.ts              # UserProfile (localStorage-persisted, 7d stale)
│   └── taskStore.ts                 # global tasks
└── types/
    ├── index.ts                     # Email, Task, etc.
    └── next-auth.d.ts               # session token augmentation
```

## Gmail scopes used

| Scope | Why |
|---|---|
| `gmail.readonly` | List + read message bodies |
| `gmail.send` | Send replies from the Smart Assistant |
| `gmail.modify` | Mark messages as read |
| `openid email profile` | Sign-in basics |

## Microsoft / Outlook scopes used

| Scope | Why |
|---|---|
| `Mail.Read` | List + read message bodies |
| `Mail.ReadWrite` | Mark messages as read |
| `Mail.Send` | Send replies from the Smart Assistant |
| `User.Read` | Profile info for the account switcher |
| `offline_access openid profile email` | Sign-in + refresh tokens |

## Multi-account model

- The NextAuth session stores a `accounts: LinkedAccount[]` array plus an `activeAccountId` pointer.
- Linking a new account is automatic: signing in with a different provider *adds* it to the array and sets it active. Re-linking the same account *refreshes* its tokens.
- Switching accounts is a client-side `useSession().update({ activeAccountId })` call that triggers a `jwt` callback refresh. SWR re-keys on the active id, so the inbox refetches from the new provider instantly.
- The `/api/mail/*` routes resolve the active account from the JWT, then dispatch to `lib/gmail/*` or `lib/outlook/*` via the provider-agnostic `lib/account.ts` abstraction.
- Unlinking an account posts to `/api/auth/unlink`. The route refuses to remove the last remaining account (sign out via the sidebar instead).

## Notes

- All state is in-memory except the user profile (which is localStorage-persisted and survives refresh). Tasks, read state, and selection live in zustand stores — no DB.
- `vipSenders.ts` is a static list you can edit to re-rank your inbox.
- The 30s polling only fires while the inbox tab is focused (`revalidateOnFocus` is on).
- The default LLM is `llama-3.3-70b-versatile` on Groq. Swap provider with the `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` env vars — anything OpenAI-compatible works (OpenRouter, Cerebras, etc.). Replies from open models are post-processed to strip leading "Sure," and code-fence wrappers that Llama-class models occasionally add.
- The AI client retries up to 3 times on transient `503` / `429` / `504` errors (exponential backoff: 500ms → 1s → 2s). Real errors — bad key, quota exhausted permanently, malformed response, Zod validation failure — surface immediately as a red toast with the actual error message.
- The Smart Assistant's `generateReplyToken` in `emailStore` lets the command palette and global shortcuts trigger a reply draft for the currently-selected email, even though the Smart Assistant lives in a separate sibling tree.
- The user profile is built from your last 50 sent + 50 received emails. Generation runs once on first sign-in, refreshes when older than 7 days, and can be rebuilt manually from the sidebar profile chip. Profile data lives only in your browser's `localStorage` (`mailmentor.profile.v1`) — it is sent to the server only as part of the prompt context for AI calls, never stored.
