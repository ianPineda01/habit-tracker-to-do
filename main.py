from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import Session, select
from database import create_db, get_session
from models import ToDo

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db()
    yield

app = FastAPI(lifespan=lifespan)

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
