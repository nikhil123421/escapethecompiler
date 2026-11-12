# Escape the Compiler — Rebuild Plan

Status: proposal for review
Last updated: 2026-11-12

---

## 1. Where we are today

| Today | Reality |
|---|---|
| `index.html` | 279 lines: markup, CSS, game logic, scoring, leaderboard, all in one file |
| Passcode `REBOOT`, final code `9463` | Literal strings in the page source |
| Room tests | Run in the browser with `new Function(...)` |
| Timers | Derived from the visitor's own `Date.now()` |
| State and leaderboard | `localStorage`, so per-device and per-browser |
| Publishing | Static GitHub Pages, no build step, no tests |

Good news: the game design is finished and coherent — five rooms, hints, speed bonus, code
pieces, a final lock. We are not redesigning the game. We are keeping every rule, moving the
trusted parts to a server, and giving the whole thing a real interface.

### What the rewrite fixes

1. **Cheating is trivial today.** Anyone can open dev tools and read every test and answer.
   Tests, hints, passcodes and scoring move to the backend.
2. **Timers are not real.** A team can change their system clock, or the game only runs while
   the tab is open. The server owns `started_at`, room deadlines and the final time.
3. **The leaderboard is not shared.** It becomes a real, live, multi-team board.
4. **`new Function` can freeze a laptop.** An infinite loop hangs the tab. The new runner has a
   hard time limit and memory cap, and the room simply reports "timed out".
5. **No teams page, no history, no organizer tools.** All three become first-class.
6. **The UI is functional but flat.** New design system, real editor, real test output,
   responsive layout, motion that means something.

Nothing worth migrating: the old board lives in each visitor's `localStorage`, so the new board
starts empty. The old page stays reachable at `/legacy` during the transition.

---

## 2. Product spec (v2)

### Roles

| Role | Can do |
|---|---|
| **Team** | Log in with team code + name + event passcode, resume their run, solve rooms, use hints, escape |
| **Spectator** | Open `/leaderboard` and `/teams` with no login |
| **Organizer** | Log in with an organizer passcode, create/reset teams, watch submissions, reset an event |

### Pages

| Route | Page | Auth |
|---|---|---|
| `/` | Landing — hero, rules, room preview, live top-3 strip | public |
| `/login` | Team login | public |
| `/play` | Game dashboard: rooms rail, editor, test output, timers, code pieces, final lock | team |
| `/leaderboard` | Live ranking, podium, filters | public |
| `/teams` | Every team, progress pips, status, search | public |
| `/teams/:teamId` | One team's per-room timeline | public |
| `/admin` | Organizer console | organizer |
| `/legacy` | The current single-file game, frozen | public |

`/leaderboard` and `/teams` share one "Compete" section in the top nav with a tab switcher, so
it reads as one destination but both views are deep-linkable.

### Rules (unchanged, now enforced server-side)

- 90 minutes total from first login.
- 15 minutes per room, starting when the room is first opened.
- +100 per solved room, +30 if solved within 10 minutes of opening.
- −20 per hint used, 3 hints per room.
- +50 for escaping.
- A room that runs out of time closes with no points, but its code piece is still revealed.
- Ties broken by faster finish time.

Two small rule decisions I recommend (flagged again in §15): floor the score at 0, and add a
**first-login claim** on a team code so a stranger holding the event passcode cannot log in as
an existing team.

---

## 3. Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + TypeScript (strict) + Vite | Fast dev server, the stack you asked for, easy to deploy as static files |
| Styling | Tailwind CSS v4 (`@theme` tokens) | Design tokens live in CSS, no config file, no runtime CSS-in-JS |
| Components | Hand-rolled primitives in `components/ui` (shadcn-style, no CLI dependency) | ~10 small components we fully own and can read |
| Data fetching | TanStack Query v5 | Caching, retries, background refresh for the live board |
| Routing | React Router v7 | Nested layout + protected routes |
| Editor | CodeMirror 6 (`@uiw/react-codemirror`) | Much lighter than Monaco, proper JS highlighting, mobile-friendly |
| Motion | `framer-motion` (sparingly) | Page/card transitions, code-piece unlock, podium |
| Icons | `lucide-react` | Consistent, tree-shakeable |
| Toasts | `sonner` | Tiny, accessible |
| Backend | Python 3.13 + FastAPI + Pydantic v2 | Typed, auto OpenAPI docs, tiny to read |
| DB client | `supabase-py` (service role) | Plain `.table(...).select(...)` calls — no ORM magic to learn |
| Database | Supabase Postgres | Managed Postgres, SQL migrations, free tier is plenty |
| Code runner | `quickjs` embedded interpreter | No network, no filesystem, hard time/memory limits, ~40 lines of code |
| Auth | JWT (HS256) issued by FastAPI | No email friction at an event; `pyjwt` is 20 lines |
| Backend tests | pytest + httpx | Fast, readable |
| Frontend tests | Vitest + Testing Library, Playwright for one E2E happy path | Confidence without ceremony |

Rejected on purpose: SQLAlchemy (an ORM hides the SQL you'd want to learn here), Supabase Auth
(email/magic links are painful for a room full of students), Supabase Realtime (we'd have to
expose the DB to the browser; polling at 5s is indistinguishable at this scale), Monaco
(heavyweight), Next.js (we need a static SPA and a separate Python API, not SSR).

---

## 4. Architecture

```
Browser (React SPA)
   |
   |  HTTPS + JSON, Bearer JWT
   v
FastAPI  ------------------------------->  Supabase Postgres
  routers/      (thin)                        events
  services/     (all logic)                   teams
  content/      (5 rooms, tests, hints)       room_progress
  services/js_runner.py -> QuickJS sandbox    submissions
   |
   +--> JWT (team id, role, event id)
```

**Trust boundary:** the browser is untrusted. It never sees tests, expected outputs, hint text
(it asks for the next hint), other teams' code, or the passcode hash. It receives deadlines and
renders countdowns, but the server decides every outcome.

**No direct browser → Supabase access.** The frontend only talks to FastAPI. Supabase RLS is
enabled with **no policies for `anon`/`authenticated`**, so only the service-role key (held by
the backend, server-side env only) can read or write. That keeps one authorization model in one
place instead of splitting it between RLS policies and Python.

Because `supabase-py` is synchronous, game routes are plain `def` (not `async def`). FastAPI runs
them in a threadpool, so there is no event-loop blocking and no async/await noise to read.

---

## 5. Data model

Five tables, no cleverness. Room definitions are **not** in the database — they are versioned
Python data in `backend/app/content/rooms.py` (tests and hints belong in code review, not in a
spreadsheet).

```
events 1---* teams 1---* room_progress
                 1---* submissions
```

```sql
create table events (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,            -- 'spring-2026'
  name           text not null,
  passcode_hash  text not null,                   -- bcrypt
  total_seconds  int  not null default 5400,      -- 90 min
  room_seconds   int  not null default 900,       -- 15 min
  starts_at      timestamptz,
  ends_at        timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table teams (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  code        text not null,                      -- 'TEAM03'
  name        text not null,
  members     text[] not null default '{}',       -- optional roster for the teams page
  started_at  timestamptz,                        -- set once, at first login
  finished_at timestamptz,                        -- set on escape or expiry
  escaped     boolean not null default false,
  status      text not null default 'racing'
              check (status in ('racing', 'escaped', 'expired')),
  final_attempts int not null default 0,
  created_at  timestamptz not null default now(),
  unique (event_id, code)
);

create table room_progress (
  team_id    uuid not null references teams(id) on delete cascade,
  room_id    text not null,                       -- 'stack', 'array', ...
  opened_at  timestamptz,
  solved_at  timestamptz,
  hints_used int not null default 0,
  timed_out  boolean not null default false,
  primary key (team_id, room_id)
);

create table submissions (
  id            bigint generated always as identity primary key,
  team_id       uuid not null references teams(id) on delete cascade,
  room_id       text not null,
  code          text not null,                    -- kept for organizer review / post-mortem
  passed        boolean not null,
  tests_passed  int not null,
  tests_total   int not null,
  error         text,
  created_at    timestamptz not null default now()
);

create index on submissions (team_id, room_id, created_at desc);
create index on teams (event_id, status);
```

Notes:

- `room_progress` rows are created lazily on first open. "Not opened" is the absence of a row.
- Score is **not** stored. It is derived from `room_progress` + `teams` by one Python function, so
  there is one source of truth and no cache to invalidate.
- Timestamps are `timestamptz`, always UTC. Only the browser formats to local time.
- Migration files: `supabase/migrations/0001_init.sql`, `0002_seed_event.sql`
  (seed one event, passcode `REBOOT` hashed, five team codes `TEAM01`–`TEAM10`).

---

## 6. Backend blueprint

```
backend/
  app/
    main.py                 # create_app, CORS, routers, exception handlers
    config.py               # pydantic-settings: env vars, typed
    db.py                   # supabase client factory
    deps.py                 # get_current_team / get_current_organizer / get_event
    errors.py               # ApiError + one handler -> {"code", "message"}
    schemas.py              # Pydantic request/response models
    routers/
      auth.py               # login, organizer login, me
      rooms.py              # public room list
      game.py               # state, open, run, hint, final
      leaderboard.py        # ranking
      teams.py              # public team list + detail
      admin.py              # organizer: teams CRUD, reset, submissions
    services/
      timers.py             # deadlines, timeout detection, "is it over"
      scoring.py            # the only place the score formula exists
      game.py               # state assembly, solve/hint/final logic
      js_runner.py          # QuickJS sandbox, returns test results
    content/
      rooms.py              # the 5 rooms: prompt, starter code, tests, hints, piece
  tests/
    test_scoring.py
    test_js_runner.py
    test_game_flow.py
  requirements.txt
  .env.example
  Dockerfile
```

### Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | liveness + DB reachable |
| POST | `/api/auth/login` | — | `{team_code, team_name, passcode}` → token + team |
| POST | `/api/auth/organizer` | — | `{passcode}` → token |
| GET | `/api/auth/me` | team/organizer | current identity |
| GET | `/api/rooms` | — | public room metadata (no tests, no hints) |
| GET | `/api/game/state` | team | everything the play page needs, incl. `server_time` |
| POST | `/api/game/rooms/{room_id}/open` | team | stamps `opened_at` on first open |
| POST | `/api/game/rooms/{room_id}/run` | team | `{code}` → per-test results, solves the room |
| POST | `/api/game/rooms/{room_id}/hint` | team | reveals the next hint, −20 |
| POST | `/api/game/final` | team | `{code, word}` → escape (+50) |
| GET | `/api/leaderboard` | — | ranked rows + aggregate stats |
| GET | `/api/teams` | — | teams with progress summary |
| GET | `/api/teams/{id}` | — | per-room timeline for one team |
| POST | `/api/admin/teams` | organizer | create teams + codes |
| PATCH | `/api/admin/teams/{id}` | organizer | rename, edit roster, fix status |
| POST | `/api/admin/teams/{id}/reset` | organizer | wipe progress, keep the team |
| GET | `/api/admin/submissions` | organizer | recent submissions, optional filters |
| POST | `/api/admin/events/{id}/reset` | organizer | new run for everyone |

Errors are one shape, so the frontend can branch on a code instead of parsing prose:

```json
{"code": "room_closed", "message": "The 15 minutes for this room are over."}
```

`room_closed`, `event_over`, `room_solved`, `already_claimed`, `no_hints_left`,
`bad_passcode`, `too_fast` (rate limit), `not_found`, `not_authenticated`.

### Server-side clock rules

- `teams.started_at` is set once, on first successful login.
- `event_deadline = started_at + total_seconds`.
- `room_deadline = opened_at + room_seconds`.
- `GET /api/game/state` and every write first call `timers.refresh(team)`, which marks rooms
  `timed_out` and expires the team if a deadline passed. So an abandoned tab still loses.
- Responses include `server_time` and ISO deadlines; the UI counts down locally and re-syncs on
  every refetch (no drift, no clock trust).

### The runner

```python
def run_tests(code: str, room: Room) -> RunResult:
    """Run the player's JavaScript against the room's hidden tests, in a sandbox."""
    if len(code) > 20_000:
        return RunResult.error("Your code is too long.")
    ctx = quickjs.Context()
    ctx.set_memory_limit(32 * 1024 * 1024)
    ctx.set_time_limit(2)            # seconds; raises InterruptedError on a hot loop
    ctx.eval(code)                   # user code only defines their function
    ...
```

Each test case is evaluated as `JSON.stringify(<fn>(...args))` inside the sandbox and compared
to the expected value in Python, so results are JSON-safe and the expected values never enter
the sandbox. `syntax error`, `not a function`, `threw`, `wrong answer`, and `timeout` are
distinct outcomes — that distinction is what makes the test panel useful.

Rate limit: reject a `run` if the team's last submission for that room was under 1.5 s ago, and
cap submissions per room at 100. Both checks read the DB, so they survive multiple workers.

### Scoring

`services/scoring.py` is the only implementation, documented in one screen:

```
solved            = 100 * rooms_solved
speed_bonus       = 30 * rooms_solved_under_10_min
hint_penalty      = 20 * hints_used
escape_bonus      = 50 if escaped
total             = max(0, solved + speed_bonus - hint_penalty + escape_bonus)
sort_key          = (-total, finished_at or infinity, started_at)
```

---

## 7. Frontend blueprint

```
frontend/
  src/
    main.tsx
    App.tsx                      # router + providers
    routes.tsx                   # route table, lazy pages
    styles/index.css             # @import "tailwindcss" + @theme tokens
    lib/
      api.ts                     # fetch wrapper: base URL, JWT, ApiError
      auth.ts                    # token storage + useAuth
      queryClient.ts
      format.ts                  # mm:ss, relative time, ordinal
      cn.ts                      # clsx + tailwind-merge
    types/api.ts                 # generated from OpenAPI (openapi-typescript)
    components/
      layout/AppShell.tsx, SiteHeader.tsx, SiteFooter.tsx, GridBackdrop.tsx
      ui/button.tsx, card.tsx, input.tsx, tabs.tsx, badge.tsx, dialog.tsx,
         progress-ring.tsx, skeleton.tsx, toast.tsx, empty-state.tsx
      game/RoomRail.tsx, RoomCard.tsx, CodeEditor.tsx, RunBar.tsx,
           TestResults.tsx, HintPanel.tsx, CodePieces.tsx, FinalLock.tsx,
           GameHeader.tsx, TimerPill.tsx
      leaderboard/Podium.tsx, LeaderboardTable.tsx, RankBadge.tsx, LiveIndicator.tsx
      teams/TeamCard.tsx, TeamFilters.tsx, ProgressPips.tsx
    pages/
      LandingPage.tsx, LoginPage.tsx, PlayPage.tsx, LeaderboardPage.tsx,
      TeamsPage.tsx, TeamDetailPage.tsx, AdminPage.tsx, NotFoundPage.tsx
    hooks/
      useGameState.ts, useCountdown.ts, useLeaderboard.ts, useTeams.ts, useRunTests.ts
```

Route-level `lazy()` keeps the initial bundle small; CodeMirror loads only on `/play`.

### Data flow

- One `GET /api/game/state` query keyed by team, refetched every 15 s and after every mutation.
  Mutations (open/run/hint/final) return the new state, so the UI never guesses.
- `useCountdown` derives remaining time from `deadline - (serverTime + elapsedSinceFetch)`,
  ticking locally at 1 Hz.
- Leaderboard polls every 5 s with `refetchInterval`, pauses when the tab is hidden.
- Team token in `localStorage` under `etc.token` (survives refresh on a shared laptop until
  "Leave team" is pressed).

### Design direction — "Terminal Noir"

A dark control-room interface: deep graphite, hairline borders, one electric accent, and mono
labels for anything the system is "saying". Confident and quiet, not neon soup.

**Palette** (Tailwind v4 `@theme` tokens)

| Token | Dark (default) | Light ("paper", phase 6) |
|---|---|---|
| `--color-bg` | `#08090C` | `#F6F7FA` |
| `--color-surface` | `#0F1117` | `#FFFFFF` |
| `--color-elevated` | `#161922` | `#FFFFFF` |
| `--color-line` | `#232734` | `#E2E5EE` |
| `--color-ink` | `#EDEFF5` | `#0B0D12` |
| `--color-muted` | `#8B93A7` | `#5A6274` |
| `--color-accent` | `#C8F751` (signal lime) | `#4D7C0F` |
| `--color-cyan` | `#6EE7F9` | `#0E7490` |
| `--color-violet` | `#8B7CF6` | `#6D28D9` |
| `--color-danger` | `#FF7A6B` | `#B42318` |
| `--color-warn` | `#F5C451` | `#B54708` |

**Type:** Space Grotesk for display, Inter for body, JetBrains Mono for code, labels, timers and
numbers. Timers use `font-variant-numeric: tabular-nums` so digits don't jitter. Self-hosted via
`@fontsource` — venue Wi-Fi should not be able to break the typography.

**Surfaces:** 1px `--color-line` borders, 14 px radius on cards, 10 px on controls, an inset
1px highlight on the top edge, and a soft ambient shadow. No heavy drop shadows.

**Background:** a fixed grid at 3% opacity, two blurred radial blooms (lime top-left, violet
bottom-right), and a 2% noise overlay. It reads as depth without hurting contrast.

**Motion rules:** 150–250 ms, `ease-out`, and only for meaning — card entrance stagger, room
solved check, code-piece unlock flip, podium bars growing, timer turning amber then red under
60 s. Everything respects `prefers-reduced-motion`.

**Signature details**

- Hero: a terminal window that types out the "system crashed" message, then a lime cursor blinks.
- Code pieces: five vault slots; solving a room flips the slot with a soft glow and a short
  sound (muted by default).
- Test results: each case is a row that slides in with a check or cross, and failures show
  `expected` vs `got` in mono.
- Escape: confetti burst, `+50` floating, and the score number rolls up.
- Leaderboard: top-3 podium, live dot with "updated 2s ago", the viewer's own team pinned and
  highlighted in the table.
- Empty states have a tiny terminal line (`$ waiting for teams...`) rather than a blank box.

**Accessibility:** visible focus rings on every interactive element, 4.5:1 text contrast, no
colour-only status (icon or label always accompanies it), full keyboard play path, and the
editor reachable by keyboard.

---

## 8. Page sketches

```
Landing
+--------------------------------------------------------------+
| ET C   Escape the Compiler        Leaderboard  Teams  [Log in]|
+--------------------------------------------------------------+
|  [ system crashed ]                                           |
|  ESCAPE THE COMPILER                              +---------+ |
|  Five rooms. One compiler. 90 minutes.            | terminal| |
|  [ Enter the system ]  [ Watch live board ]       |  _      | |
|                                                   +---------+ |
|  [5 rooms] [15 min/room] [90 min] [teams of 3-4]              |
|  ---- live strip: 1 NullPtr 260  .  2 Stack Overflow 210 ---- |
|  How it works  (4 numbered steps)     The five rooms (table)   |
+--------------------------------------------------------------+
```

```
Play (desktop)
+------------------------------------------------------------------+
| Null Pointer Exception (TEAM03)      90:00    Room 12:04  260    |
+----------------+-------------------------------------------------+
| 1 Stack   done |  Room 2 - Array Room          Binary search     |
| 2 Array   now  |  Find target in a rotated sorted array.         |
| 3 Graph        |  +-------------------------------------------+  |
| 4 Debug        |  | 1  function searchRotated(arr, target) {  |  |
| 5 Cipher       |  | 2    let lo = 0, hi = arr.length - 1;     |  |
|                |  | 3    /* your code */                      |  |
| Pieces:        |  +-------------------------------------------+  |
| [9][4][?][?][?]|  [ Run tests  Cmd+Enter ] [Hint -20] [Reset] |
|                |  > Test 1 passed   Test 2 failed: expected 4   |
+----------------+-------------------------------------------------+
|  [Final lock available: enter 4 digits + password]               |
+------------------------------------------------------------------+
```

```
Leaderboard
+--------------------------------------------------------------+
|  Leaderboard | Teams                     LIVE . updated 2s ago|
+--------------------------------------------------------------+
|            [2]            [1]            [3]                  |
|         Stack Over    Null Pointer     Segfault              |
|           210            260             180                  |
+--------------------------------------------------------------+
| #  Team                Solved   Hints  Time    Score          |
| 1  Null Pointer (T03)  ****-    1      61:20   260            |
| 2  Stack Over (T01)    ****-    3      74:05   210            |
| 3  Segfault (T07)      ***--    0      --      180            |
+--------------------------------------------------------------+
| Filters: All | Escaped | Racing        Search: [          ]   |
+--------------------------------------------------------------+
```

```
Teams (mobile)
+---------------------+
| Teams          [=]  |
| [search...........] |
| +-----------------+ |
| | Null Pointer    | |
| | TEAM03 . racing | |
| | ****-   260 pts | |
| | 61:20    1 hint | |
| +-----------------+ |
| +-----------------+ |
| | Segfault        | |
| | TEAM07 . expired| |
...

Mobile play uses a bottom tab bar: Rooms | Code | Tests | Final.
```

---

## 9. Build phases

Estimates assume one developer with AI pairing; treat them as ranges, not promises.

| # | Phase | Deliverable | Est. |
|---|---|---|---|
| 0 | Foundations | Repo split (`frontend/`, `backend/`, `supabase/`, `legacy/`), Vite + TS + Tailwind running, FastAPI `/api/health` running, `.env.example`, lint/format scripts, README rewritten | 0.5 d |
| 1 | Data | Supabase project, migrations applied, seed event + 10 teams, `db.py` + health check hitting the DB | 0.5–1 d |
| 2 | Backend core | Auth + JWT, room content, `state`, `open`, `hint`, `run` + QuickJS runner, scoring, `final`, pytest suite | 2–3 d |
| 3 | Frontend shell | Tokens, UI primitives, router, auth gate, landing, login, 404 | 1.5–2 d |
| 4 | Play experience | Dashboard layout, CodeMirror, run results, timers, hints, code pieces, final lock, mobile layout | 3–4 d |
| 5 | Compete | Leaderboard + teams + team detail endpoints and pages, polling, podium, filters | 1.5–2 d |
| 6 | Organizer + polish | Admin console, light theme, sounds/confetti, a11y pass, skeletons, empty states | 1.5–2 d |
| 7 | Ship | Deploy FE + BE, CI, 20-simulated-team load test, runbook, `/legacy` redirect | 1 d |

**MVP cut line: end of phase 5.** That is a complete, honest, good-looking game with a real
shared leaderboard. Phases 6–7 are the difference between "works" and "runs at an event".

Acceptance criteria worth writing down now:

- A team can log in on two laptops and see the same state (server-authoritative).
- Killing a tab mid-room does not pause that room's clock.
- An infinite loop in submitted code returns "timed out" in under ~3 s.
- A team that never opens room 5 still appears on the leaderboard as `racing`/`expired`.
- The leaderboard updates within 5 s of another team escaping.
- Play page is usable at 390 px wide.
- Every page has a skeleton and an empty state.

---

## 10. Testing

**Backend (pytest)** — pure unit tests for scoring and for the runner (correct, wrong, syntax
error, throw, wrong arity, infinite loop, oversized code), plus a flow test: login → open →
fail → hint → pass → state → final → leaderboard position, against a throwaway event.

**Frontend (Vitest)** — formatters, countdown maths, `ApiError` → message mapping, rank display.

**E2E (Playwright, one spec)** — seed team, solve room 1 with the known answer, refresh mid-room,
confirm timer continuity, check leaderboard row.

**Manual, before the event** — projector at 1280×720, a phone, a 3G throttle, 15 tabs open,
and two teams racing at once.

---

## 11. Deployment

| Piece | Where | Notes |
|---|---|---|
| Frontend | Vercel or Netlify | Static build, `VITE_API_URL` env, SPA fallback to `index.html` |
| Backend | Render / Fly.io / Railway (Docker) | Free tiers sleep; add a keep-alive ping during the event |
| Database | Supabase cloud | Free tier is ample; take a backup before the event |
| CI | GitHub Actions | `ruff` + `pytest` + `tsc --noEmit` + `vitest` + `vite build` |
| Old site | Keep GitHub Pages on `/legacy` | Then swap the repo Pages source or add a redirect |

Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `ORGANIZER_PASSCODE`,
`CORS_ORIGINS`. The service-role key is **backend only** — never a `VITE_` variable.

CORS is an explicit allowlist (`http://localhost:5173` + the deployed origin), not `*`.

---

## 12. How the backend stays readable

Rules I will follow, since you asked for code you can actually read:

1. **One job per file.** Routers parse and delegate; services hold the logic; `content/` holds
   data. No 400-line modules.
2. **Explicit over clever.** No decorators that rewrite behaviour, no metaclasses, no ORM
   relationship magic, no `**kwargs` plumbing.
3. **Type hints everywhere**, Pydantic models for every request and response, so the shapes are
   visible in one place.
4. **Docstrings say why.** Code says what; comments explain the non-obvious decision.
5. **Small functions** with names that read like sentences: `mark_expired_rooms(team)`,
   `score_for(team_progress)`.
6. **Errors as codes**, handled once in `errors.py`.
7. **SQL lives in migrations**, read once, obvious column names.

The tone, concretely:

```python
# routers/game.py — thin
@router.post("/rooms/{room_id}/run", response_model=RunResponse)
def run_room(room_id: str, body: RunRequest,
             team: Team = Depends(get_current_team)):
    return game.run_room_code(team, room_id, body.code)


# services/game.py — the actual work, readable on its own
def run_room_code(team: Team, room_id: str, code: str) -> RunResponse:
    room = get_room(room_id)
    progress = ensure_progress(team, room_id)

    if progress.solved_at:
        raise ApiError("room_solved", "You already solved this room.")
    if progress.timed_out:
        raise ApiError("room_closed", "The 15 minutes for this room are over.")

    result = js_runner.run_tests(code, room)
    save_submission(team, room_id, code, result)

    if result.all_passed:
        progress.solved_at = utcnow()
        save_progress(progress)
    return RunResponse(result=result, state=build_state(team))
```

---

## 13. Decisions to confirm before I start

I have picked a default for each; tell me which to change and I will fold it in.

1. **Code runs on the server** in QuickJS, tests hidden (default) — or keep execution in the
   browser and accept that tests are visible?
2. **Auth is team code + event passcode → JWT** (default), with first-login claim on a team code.
   Alternative: per-team PIN printed on a card, or Supabase Auth with emails.
3. **One active event**, but the schema supports many (`events` table). OK?
4. **`/leaderboard` and `/teams` are public** (no login) so spectators can watch — and should the
   teams page show member names, or only team names?
5. **Score floors at 0**, and a room solved after its 15 minutes scores nothing.
6. **Organizer console in phase 6** (not MVP) — fine, or do you need it on day one?
7. **Deployment**: do you already have a Supabase project, and a Vercel/Render account? Free
   tier only, or is a small paid tier acceptable for the event weekend?

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| `quickjs` package is less mature than Node | It is behind one interface (`run_tests`); fallback is a `node` subprocess with the same signature |
| Free-tier backend cold start ruins a live event | Keep-alive ping, or a paid instance for the event window |
| Shared event passcode lets someone log in as another team | First-login claim + organizer reset; optional per-team PIN |
| Venue Wi-Fi drops | Local countdown keeps ticking, mutations retry, drafts saved in `localStorage`, offline banner |
| Design scope creep | Tokens + 10 primitives first; no page-specific CSS until phase 6 |
| Supabase service key leaks | Backend-only env, never `VITE_`, no client-side Supabase SDK |
| Time zone confusion | Store UTC, format in the browser only |

---

## 15. Definition of done

- [ ] No secrets, tests, expected outputs or hints in the frontend bundle.
- [ ] Server owns every timer, score and solve.
- [ ] Login → 5 rooms → final lock → leaderboard works end to end on desktop and mobile.
- [ ] Leaderboard and teams pages are public, live within 5 s, and correct for expired teams.
- [ ] Backend has tests for scoring, runner edge cases and the happy path; CI is green.
- [ ] Design tokens only — no hard-coded hex in components.
- [ ] Lighthouse ≥ 95 accessibility and performance on `/` and `/leaderboard`.
- [ ] README explains setup in under 10 commands.
- [ ] `/legacy` still serves the old game until the new one has survived a real session.
