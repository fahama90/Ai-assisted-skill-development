# AI Assist backend

FastAPI service powering the AI coach, skill evaluation, and curated video catalog.

## Run

```bash
pip install -r requirements.txt

# create your env file (see .env.example)
cp .env.example .env
# then set GEMINI_API_KEY in .env

python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Serves on `http://localhost:8001`. With `GEMINI_API_KEY` set, chat and evaluation use Google Gemini; without it, the service falls back to demo responses so every endpoint stays usable.

## Endpoints

- `GET /health` — service health + AI provider status
- `GET /api/v1/videos/{skill}` — curated YouTube videos for a skill
- `POST /api/v1/chat` — AI coach conversation
- `POST /api/v1/evaluate` — AI evaluation of a conversation or scenario answer
