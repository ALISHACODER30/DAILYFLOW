from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import logic

app = FastAPI(title="DailyPulse API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(logic.LogicError)
async def logic_error_handler(request, exc: logic.LogicError):
    return JSONResponse(status_code=exc.status, content={"detail": exc.message})


class TaskIn(BaseModel):
    title: str


@app.get("/briefing")
def briefing(refresh: bool = False):
    return logic.get_briefing(force=refresh)


@app.get("/web-tip")
def web_tip(variant: int = 0):
    return logic.get_web_tip(variant)


@app.get("/ai-news")
def ai_news():
    return logic.get_ai_news()


@app.get("/tasks")
def list_tasks():
    return logic.get_tasks()


class BreakdownIn(BaseModel):
    task_description: str


@app.post("/tasks")
def add_task(body: TaskIn):
    return logic.create_task(body.title)


@app.post("/tasks/breakdown")
def breakdown(body: BreakdownIn):
    return logic.breakdown_task(body.task_description)


@app.put("/tasks/{task_id}/complete")
def complete_task(task_id: str):
    return logic.complete_task(task_id)


@app.delete("/tasks/{task_id}")
def delete_task(task_id: str):
    return logic.delete_task(task_id)


@app.get("/standup")
def standup():
    return logic.get_standup()


@app.get("/insights")
def insights():
    return logic.get_insights()
