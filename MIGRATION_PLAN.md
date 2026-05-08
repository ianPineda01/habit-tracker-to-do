# Migration Plan: SvelteKit → FastAPI + Svelte

## Overview

Port the habit tracker from a SvelteKit monolith (server + client together) to a
**FastAPI REST backend** and a **standalone Svelte SPA frontend**. The database
(SQLite via `better-sqlite3`) is replaced by **SQLite via Python's `sqlite3`** or
`aiosqlite` for async access.

---

## Current Architecture

```
SvelteKit (Node.js)
├── File-based routing  (+page.server.ts handles both data loading and mutations)
├── SQLite (better-sqlite3)
└── SSR + form actions (no explicit REST layer)
```

**Pages & server logic:**

| Route | Load | Actions |
|---|---|---|
| `/` | Fetch todos + today's habits | `toggle` — insert/delete habit record |
| `/add` | — | `default` — insert new todo, redirect |
| `/calendar` | Fetch month's habit counts + todo total | — |

**DB Schema:**

```sql
-- Core to-do items
CREATE TABLE todos (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- Daily completion records
CREATE TABLE habits (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  date     TEXT NOT NULL,           -- YYYY-MM-DD
  to_do_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE
);
```

---

## Target Architecture

```
┌─────────────────────────┐       HTTP / JSON        ┌──────────────────────────┐
│   Svelte SPA (Vite)     │ ◄────────────────────── │   FastAPI (Python)        │
│   localhost:5173 (dev)  │ ──────────────────────► │   localhost:8000          │
│                         │                          │   /api/...                │
│  - No SvelteKit         │                          │   SQLite (aiosqlite)      │
│  - fetch() for data     │                          │   Alembic migrations      │
└─────────────────────────┘                          └──────────────────────────┘
```

**Dev:** Vite proxies `/api` → `localhost:8000` (no CORS issues).  
**Prod:** Serve Svelte's `dist/` as FastAPI static files, or deploy separately.

---

## Repository Layout (after migration)

```
habit-tracker-to-do/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── database.py              # DB connection & table creation
│   ├── models.py                # SQLAlchemy / raw SQL models
│   ├── routers/
│   │   ├── todos.py             # GET/POST /api/todos
│   │   └── habits.py            # POST/DELETE /api/habits, GET /api/calendar
│   ├── schemas.py               # Pydantic request/response models
│   ├── requirements.txt
│   └── habits.db                # SQLite file (gitignored)
└── frontend/
    ├── src/
    │   ├── main.ts              # Svelte app mount
    │   ├── App.svelte           # Root component + client-side router
    │   ├── lib/
    │   │   └── api.ts           # Typed fetch wrappers
    │   ├── pages/
    │   │   ├── Home.svelte      # Replaces src/routes/+page.svelte
    │   │   ├── AddTodo.svelte   # Replaces src/routes/add/+page.svelte
    │   │   └── Calendar.svelte  # Replaces src/routes/calendar/+page.svelte
    │   └── stores/
    │       └── todos.ts         # Svelte store for shared state (optional)
    ├── index.html
    ├── vite.config.ts           # Proxy /api → localhost:8000
    ├── package.json
    └── tsconfig.json
```

---

## Phase 1 — FastAPI Backend

### 1.1 Setup

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows PowerShell
pip install fastapi uvicorn aiosqlite pydantic
pip freeze > requirements.txt
```

### 1.2 `database.py`

```python
import aiosqlite, os

DB_PATH = os.path.join(os.path.dirname(__file__), "habits.db")

async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")
        yield db

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS todos (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS habits (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                date     TEXT NOT NULL,
                to_do_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE
            )
        """)
        await db.commit()
```

### 1.3 `schemas.py`

```python
from pydantic import BaseModel

class TodoCreate(BaseModel):
    name: str

class TodoOut(BaseModel):
    id: int
    name: str
    done: bool = False   # injected by the todos router

class HabitToggle(BaseModel):
    todo_id: int
    date: str            # YYYY-MM-DD

class DayCount(BaseModel):
    date: str
    count: int

class CalendarOut(BaseModel):
    habit_counts: list[DayCount]
    total_todos: int
    today: str
```

### 1.4 `routers/todos.py`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/todos` | Return all todos with `done` flag for today |
| `POST` | `/api/todos` | Create a new todo |

```python
@router.get("/", response_model=list[TodoOut])
async def list_todos(db=Depends(get_db)):
    today = date.today().isoformat()
    rows = await db.execute_fetchall("""
        SELECT t.id, t.name,
               CASE WHEN h.id IS NOT NULL THEN 1 ELSE 0 END AS done
        FROM todos t
        LEFT JOIN habits h ON h.to_do_id = t.id AND h.date = ?
    """, (today,))
    return [dict(r) for r in rows]

@router.post("/", response_model=TodoOut, status_code=201)
async def create_todo(body: TodoCreate, db=Depends(get_db)):
    cur = await db.execute("INSERT INTO todos (name) VALUES (?)", (body.name,))
    await db.commit()
    return {"id": cur.lastrowid, "name": body.name, "done": False}
```

### 1.5 `routers/habits.py`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/habits` | Mark todo as done for a date |
| `DELETE` | `/api/habits` | Unmark todo for a date |
| `GET` | `/api/calendar` | Return monthly habit counts |

```python
@router.post("/")
async def mark_done(body: HabitToggle, db=Depends(get_db)):
    await db.execute(
        "INSERT INTO habits (date, to_do_id) VALUES (?, ?)",
        (body.date, body.todo_id)
    )
    await db.commit()
    return {"status": "done"}

@router.delete("/")
async def mark_undone(body: HabitToggle, db=Depends(get_db)):
    await db.execute(
        "DELETE FROM habits WHERE date = ? AND to_do_id = ?",
        (body.date, body.todo_id)
    )
    await db.commit()
    return {"status": "undone"}

@router.get("/calendar", response_model=CalendarOut)
async def calendar(db=Depends(get_db)):
    today = date.today()
    start = today.replace(day=1).isoformat()
    end = today.isoformat()
    rows = await db.execute_fetchall("""
        SELECT date, COUNT(*) AS count
        FROM habits
        WHERE date >= ? AND date <= ?
        GROUP BY date
    """, (start, end))
    total = await db.execute_fetchone("SELECT COUNT(*) AS n FROM todos")
    return {
        "habit_counts": [dict(r) for r in rows],
        "total_todos": total["n"],
        "today": today.isoformat(),
    }
```

### 1.6 `main.py`

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from .database import init_db
from .routers import todos, habits

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(lifespan=lifespan)
app.include_router(todos.router, prefix="/api/todos")
app.include_router(habits.router, prefix="/api/habits")

# Prod: serve built Svelte SPA
# app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="spa")
```

Run with:

```bash
uvicorn backend.main:app --reload --port 8000
```

---

## Phase 2 — Svelte SPA Frontend

### 2.1 Setup

```bash
# From the repo root
npm create vite@latest frontend -- --template svelte-ts
cd frontend
npm install
```

Remove all SvelteKit-specific packages (`@sveltejs/kit`, adapter-auto, etc.) — they
are not needed for a plain Svelte + Vite app.

### 2.2 `vite.config.ts` — dev proxy

```ts
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

### 2.3 `src/lib/api.ts` — typed fetch helpers

```ts
const BASE = '/api'

export type Todo = { id: number; name: string; done: boolean }
export type DayCount = { date: string; count: number }
export type CalendarData = { habit_counts: DayCount[]; total_todos: number; today: string }

export const api = {
  getTodos: (): Promise<Todo[]> =>
    fetch(`${BASE}/todos`).then(r => r.json()),

  createTodo: (name: string): Promise<Todo> =>
    fetch(`${BASE}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(r => r.json()),

  markDone: (todo_id: number, date: string) =>
    fetch(`${BASE}/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todo_id, date }),
    }),

  markUndone: (todo_id: number, date: string) =>
    fetch(`${BASE}/habits`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todo_id, date }),
    }),

  getCalendar: (): Promise<CalendarData> =>
    fetch(`${BASE}/habits/calendar`).then(r => r.json()),
}
```

### 2.4 Client-side Routing

Since there's no SvelteKit, add a lightweight router. Options:

- **`svelte-spa-router`** (hash-based, zero config) — recommended for this app's size
- `@mefodica/svelte-router` (history-mode, more setup)

```bash
npm install svelte-spa-router
```

`App.svelte`:

```svelte
<script lang="ts">
  import Router from 'svelte-spa-router'
  import Home from './pages/Home.svelte'
  import AddTodo from './pages/AddTodo.svelte'
  import Calendar from './pages/Calendar.svelte'

  const routes = {
    '/': Home,
    '/add': AddTodo,
    '/calendar': Calendar,
  }
</script>

<Router {routes} />
```

### 2.5 `pages/Home.svelte`

Replaces `src/routes/+page.svelte` + `+page.server.ts`.

- On mount: call `api.getTodos()`, store in local `$state`
- Toggle: call `api.markDone` / `api.markUndone` based on current `done` flag,
  then flip state locally (optimistic UI) or re-fetch
- Navigation links: use `<a href="#/calendar">` and `<a href="#/add">` (hash routing)

### 2.6 `pages/AddTodo.svelte`

Replaces `src/routes/add/`.

- Controlled input bound to `$state`
- On submit: call `api.createTodo(name)`, then navigate to `#/`
- Use `import { push } from 'svelte-spa-router'` for programmatic navigation

### 2.7 `pages/Calendar.svelte`

Replaces `src/routes/calendar/`.

- On mount: call `api.getCalendar()`
- Calendar grid logic is pure JS/TS — copy from existing component, remove
  SvelteKit-specific imports (`$props`, `PageData`)
- Replace SvelteKit props pattern with standard Svelte `onMount` + local state

---

## Phase 3 — Data Migration

If there is existing data in the SvelteKit SQLite file (`/src/lib/server/habits.db`
or wherever it lives), migrate it:

```bash
# Export from old DB
sqlite3 old.db ".dump todos" > todos.sql
sqlite3 old.db ".dump habits" > habits.sql

# Import into new DB
sqlite3 backend/habits.db < todos.sql
sqlite3 backend/habits.db < habits.sql
```

---

## Phase 4 — Production Build

### 4a — Separate deployments (simplest)

- Deploy FastAPI to any Python host (Railway, Render, Fly.io)
- Deploy Svelte `dist/` to Vercel / Netlify / Cloudflare Pages
- Set `VITE_API_BASE` env var to the FastAPI URL; update `api.ts` to read it

### 4b — Single-server deployment

1. Build Svelte: `npm run build` → `frontend/dist/`
2. In `main.py`, uncomment the `StaticFiles` mount
3. FastAPI serves both the API and the SPA from one process

---

## Migration Checklist

### Backend
- [ ] Create `backend/` directory and virtual environment
- [ ] Implement `database.py` with `init_db` and `get_db`
- [ ] Define Pydantic schemas in `schemas.py`
- [ ] Implement `routers/todos.py` (GET + POST)
- [ ] Implement `routers/habits.py` (POST + DELETE + calendar GET)
- [ ] Wire up `main.py` with lifespan and routers
- [ ] Verify API with `uvicorn` + curl / FastAPI docs at `/docs`

### Frontend
- [ ] Scaffold plain Svelte + Vite project in `frontend/`
- [ ] Add Vite proxy config
- [ ] Write `lib/api.ts` typed fetch helpers
- [ ] Install and configure `svelte-spa-router`
- [ ] Port `Home.svelte` — fetch on mount, toggle via API
- [ ] Port `AddTodo.svelte` — form submit via API, programmatic redirect
- [ ] Port `Calendar.svelte` — fetch on mount, preserve grid/color logic
- [ ] Remove all `+page.server.ts`, SvelteKit imports, and form action patterns

### Cutover
- [ ] Migrate SQLite data if needed (Phase 3)
- [ ] Run both servers in dev, verify full flow end-to-end
- [ ] Remove old SvelteKit source tree (`src/routes/`, `src/lib/server/`)
- [ ] Remove SvelteKit deps from `package.json`
- [ ] Update `README.md`

---

## Key Differences to Keep in Mind

| SvelteKit concept | FastAPI + Svelte equivalent |
|---|---|
| `+page.server.ts` `load()` | `onMount(() => api.getTodos())` in the component |
| Form `action` (POST) | `fetch` POST/DELETE in event handler |
| `redirect(303, '/')` | `push('/')` from `svelte-spa-router` |
| `$props()` / `PageData` | Standard Svelte `let` / `$state` |
| SSR | CSR only (SPA) — fine for a personal app |
| Adapter auto (Node/Vercel) | `uvicorn` (Python ASGI server) |
