"""AI Assist (AAS) FastAPI backend.

This prototype uses a configured Gemini key when available and falls back to
deterministic demo responses when the key is missing or the call fails.
Real YouTube video recommendations are returned from a curated list.
"""

import json
import os
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="AI Assist API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
AI_PROVIDER = os.getenv("AI_PROVIDER", "demo")

# Initialise Gemini only when a key is present.
gemini_model = None
if GEMINI_API_KEY:
    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel("gemini-3.6-flash")
    except Exception:
        gemini_model = None


class ChatMessage(BaseModel):
    role: Literal["student", "coach"]
    text: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    skill: Literal["communication", "leadership", "project"] = "communication"
    level: Literal["Beginner", "Intermediate", "Advanced"] = "Intermediate"


class EvaluateRequest(BaseModel):
    skill: Literal["communication", "leadership", "project"]
    level: Literal["Beginner", "Intermediate", "Advanced"]
    messages: list[ChatMessage] | None = None
    scenario_title: str | None = None
    scenario_body: str | None = None
    selected_option: int | None = None
    options: list[str] | None = None


# Real curated YouTube videos for each skill. These play through the standard
# YouTube embed player inside the frontend.
VIDEOS: dict[str, list[dict[str, str]]] = {
    "communication": [
        {"id": "eIho2S0ZahI", "title": "How to speak so that people want to listen", "meta": "Julian Treasure · TED", "duration": "9:58"},
        {"id": "w-HYZv6HzAs", "title": "The skill of self confidence", "meta": "Dr. Ivan Joseph · TEDx", "duration": "17:51"},
        {"id": "HAnw168huqA", "title": "Think Fast, Talk Smart", "meta": "Matt Abrahams · Stanford GSB", "duration": "58:20"},
    ],
    "leadership": [
        {"id": "fxbCHn6gE3U", "title": "The surprising habits of original thinkers", "meta": "Adam Grant · TED", "duration": "15:27"},
        {"id": "lmyZMtPVodo", "title": "Why good leaders make you feel safe", "meta": "Simon Sinek · TED", "duration": "11:59"},
        {"id": "qp0HIF3SfI4", "title": "How great leaders inspire action", "meta": "Simon Sinek · TED", "duration": "18:04"},
    ],
    "project": [
        {"id": "rck3MnZM7cU", "title": "Project Management Simplified", "meta": "simpletivity", "duration": "11:53"},
        {"id": "Z9QbYZh1YXY", "title": "What is Agile?", "meta": "Mark Shead", "duration": "10:06"},
        {"id": "vH4NnImxKZA", "title": "The Art of Project Management", "meta": "Scott Berkun · Talks at Google", "duration": "55:08"},
    ],
}


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "mode": "ai-assist",
        "ai_provider": "gemini" if gemini_model else "demo",
    }


@app.get("/api/v1/capabilities")
def capabilities() -> dict[str, object]:
    return {
        "ai": {"provider": "gemini" if gemini_model else "demo", "is_demo": gemini_model is None},
        "videos": {"provider": "youtube", "is_demo": False},
        "database": {"provider": "not-configured", "is_demo": True},
        "roles": ["student", "teacher", "admin"],
    }


@app.get("/api/v1/videos/{skill}")
def get_videos(skill: str) -> dict[str, object]:
    return {"skill": skill, "videos": VIDEOS.get(skill, [])}


def _clean_gemini_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        if len(parts) >= 3:
            text = parts[1]
    if text.lower().startswith("json"):
        text = text[4:]
    return text.strip()


def _fallback_chat_reply(messages: list[ChatMessage]) -> str:
    last = messages[-1].text.lower() if messages else ""
    if "decision" in last or "owner" in last:
        return "Good. Now say who owns the decision and by when the team needs to commit."
    if "because" in last or "reason" in last:
        return "Nice reasoning. Try leading with the conclusion so your first sentence carries the point."
    return "That is more direct. Name the decision owner and the impact on learners to make it even stronger."


@app.post("/api/v1/chat")
def chat(req: ChatRequest) -> dict[str, str]:
    system_prompt = (
        f"You are Nia, a supportive English communication coach for a learner at {req.level} level. "
        "Keep replies short (1-2 sentences), encouraging, and focused on clarity and confidence. "
        "Scenario: guide a five-minute project update toward one clear decision."
    )

    if gemini_model and req.messages:
        try:
            history: list[dict[str, object]] = []
            for m in req.messages[:-1]:
                history.append({"role": "user" if m.role == "student" else "model", "parts": [{"text": m.text}]})
            chat_session = gemini_model.start_chat(history=history)
            last = req.messages[-1].text
            response = chat_session.send_message(system_prompt + "\n\nLearner: " + last)
            return {"reply": response.text.strip(), "provider": "gemini"}
        except Exception as e:
            return {"reply": _fallback_chat_reply(req.messages), "provider": "demo", "error": str(e)}

    return {"reply": _fallback_chat_reply(req.messages), "provider": "demo"}


@app.post("/api/v1/evaluate")
def evaluate(req: EvaluateRequest) -> dict[str, object]:
    if req.skill == "communication" and req.messages:
        transcript = "\n".join(
            f"{'Learner' if m.role == 'student' else 'Coach'}: {m.text}" for m in req.messages
        )
        prompt = (
            f"Evaluate this English communication practice conversation for a {req.level} learner.\n"
            "Give a score out of 100, an outcome (improved/consistent/decreased), "
            "2 strengths, 2 improvement areas, and a short 1-sentence feedback.\n"
            "Return STRICT JSON with keys: score, outcome, strengths, improvement_areas, feedback."
        )
        if gemini_model:
            try:
                response = gemini_model.generate_content(prompt + "\n\n" + transcript)
                data = json.loads(_clean_gemini_json(response.text))
                return {"provider": "gemini", **data}
            except Exception:
                pass
        return {
            "provider": "demo",
            "score": 76,
            "outcome": "improved",
            "strengths": ["Clear recommendation", "Specific reasoning"],
            "improvement_areas": ["Name the decision owner", "Add impact on learners"],
            "feedback": "You gave a specific recommendation and explained the reason. Next, practice naming an owner for the decision.",
        }

    # MCQ scenario evaluation for leadership / project management.
    options_text = "\n".join(f"{i}. {opt}" for i, opt in enumerate(req.options or []))
    prompt = (
        f"Evaluate this {req.skill} scenario decision for a {req.level} learner.\n"
        f"Scenario: {req.scenario_title}\n"
        f"{options_text}\n"
        f"Selected option index: {req.selected_option}\n"
        "Return STRICT JSON with keys: score (0-100), outcome ('improved'/'consistent'/'decreased'), feedback (1 sentence)."
    )
    if gemini_model:
        try:
            response = gemini_model.generate_content(prompt)
            data = json.loads(_clean_gemini_json(response.text))
            return {"provider": "gemini", **data}
        except Exception:
            pass
    return {
        "provider": "demo",
        "score": 88,
        "outcome": "improved",
        "feedback": "Strong decision. You made the trade-off visible and protected the team.",
    }
