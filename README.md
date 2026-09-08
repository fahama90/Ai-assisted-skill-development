# AI Assist (AAS) — AI-Assisted Skill Development Platform

An AI-powered learning platform that helps users build three core career skills — **Communication, Leadership, and Project Management** — through an AI coach, interactive scenario practice, and curated video mentors.

Built for hackathon submission.

## What it does

- **Role-based dashboards** — distinct experiences for Students, Teachers, and Admins
- **AI coach chat** — practice real conversations (e.g. a five-minute project update) with instant Gemini-powered coaching
- **Scenario practice with AI evaluation** — realistic decision-making scenarios scored by AI, with strengths and improvement areas
- **Real video mentors** — curated TED/Stanford/YouTube videos embedded and playable inside each skill dashboard
- **Personalized onboarding** — pick your skills and proficiency level (Beginner / Intermediate / Advanced)

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, custom CSS |
| Backend | FastAPI, Pydantic v2, Uvicorn |
| AI | Google Gemini (`gemini-3.6-flash`) via backend proxy |
| Video | YouTube embed player |

## How to run

### 1. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt

# create your env file (see .env.example)
cp .env.example .env
# then set GEMINI_API_KEY in .env

python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

The backend serves on `http://localhost:8001`.

> Without a Gemini key the app still runs — it falls back to demo coaching responses so every feature remains usable.

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend talks to the backend at `http://localhost:8001` (override with `NEXT_PUBLIC_API_URL`).

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service health + AI provider status |
| GET | `/api/v1/videos/{skill}` | Curated YouTube videos per skill |
| POST | `/api/v1/chat` | AI coach conversation |
| POST | `/api/v1/evaluate` | AI evaluation of conversation or scenario answer |

## Project structure

```
backend/    FastAPI app (Gemini integration, video catalog, evaluation)
frontend/   Next.js app (login, signup, role dashboards, chat, video player)
```
