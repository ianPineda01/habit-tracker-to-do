# Habit Tracker To-Do

A habit and to-do tracker built with FastAPI and SQLModel.

## Prerequisites

- Python 3.x

## Setup

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

## Running

```bash
uvicorn main:app --reload
```

The API will be available at [http://localhost:8000](http://localhost:8000).

Interactive API docs are at [http://localhost:8000/docs](http://localhost:8000/docs).
