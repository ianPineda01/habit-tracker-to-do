from datetime import date
from sqlmodel import Field, SQLModel


class ToDo(SQLModel, table=True):
    __tablename__ = "to_do" # type: ignore[assignment]

    name: str = Field(primary_key=True)


class Habit(SQLModel, table=True):
    __tablename__ = "habit_table" # type: ignore[assignment]

    id: int | None = Field(default=None, primary_key=True)
    completion_date: date
    name: str = Field(foreign_key="to_do.name")
