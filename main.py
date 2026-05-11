from contextlib import asynccontextmanager
from datetime import date
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from database import create_db, get_session
from models import ToDo, Habit, HabitCreate

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db()
    yield

app = FastAPI(lifespan=lifespan)

# DEVONLY — in production the Svelte build is served statically from FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

@app.post("/todos", response_model=ToDo)
def create_todo(todo: ToDo, session: Session = Depends(get_session)):
    session.add(todo)
    session.commit()
    session.refresh(todo)
    return todo

@app.get("/todos", response_model=list[ToDo])
def list_todos(session: Session = Depends(get_session)):
    return session.exec(select(ToDo)).all()

@app.delete("/todos/{name}")
def delete_todo(name: str, session: Session = Depends(get_session)):
    todo = session.get(ToDo, name)
    if not todo:
        raise HTTPException(status_code=404, detail="ToDo not found")
    session.delete(todo)
    session.commit()
    return {"deleted": name}

@app.post("/habits", response_model=Habit)
def mark_complete(habit_in: HabitCreate, session: Session = Depends(get_session)):
    habit = Habit(name=habit_in.name, completion_date=habit_in.completion_date)
    session.add(habit)
    session.commit()
    session.refresh(habit)
    return habit

@app.get("/habits/{day}", response_model=list[Habit])
def get_completions(day: date, session: Session = Depends(get_session)):
    return session.exec(select(Habit).where(Habit.completion_date == day)).all()

@app.delete("/habits/{habit_id}")
def unmark_complete(habit_id: int, session: Session = Depends(get_session)):
    habit = session.get(Habit, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    session.delete(habit)
    session.commit()
    return {"deleted": habit_id}
