# Habit Tracker To-Do

A habit and to-do tracker built with FastAPI, SQLModel, and Svelte.

## Prerequisites

- Python 3.x
- Node.js

## Setup

### Backend

1. Create and activate a virtual environment:

   ```bash
   python -m venv .env
   # Windows
   .env\Scripts\activate
   # macOS/Linux
   source .env/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

### Frontend

```bash
cd frontend
npm install
```

## Running

### Development

Run the backend and frontend dev server separately:

```bash
uvicorn main:app --reload
```

```bash
cd frontend
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173).

### Production

Build the frontend first, then serve everything from FastAPI:

```bash
cd frontend
npm run build
cd ..
uvicorn main:app
```

The app will be available at [http://localhost:8000](http://localhost:8000).

When `frontend/dist/` exists, FastAPI serves the Svelte build as static files and skips the dev CORS middleware. When it doesn't, FastAPI falls back to allowing the Vite dev server on `:5173`.

Interactive API docs are at [http://localhost:8000/docs](http://localhost:8000/docs).
