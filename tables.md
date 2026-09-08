# Nexus PostgreSQL tables

Run this schema in PostgreSQL once database credentials are approved. The current frontend intentionally uses hardcoded demo data.

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  age SMALLINT,
  grade VARCHAR(80),
  theme_preference VARCHAR(10) NOT NULL DEFAULT 'dark' CHECK (theme_preference IN ('light', 'dark')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE skills (
  id SMALLSERIAL PRIMARY KEY,
  slug VARCHAR(40) NOT NULL UNIQUE CHECK (slug IN ('communication', 'leadership', 'project')),
  name VARCHAR(100) NOT NULL,
  description TEXT
);

INSERT INTO skills (slug, name, description) VALUES
  ('communication', 'Communication Skills', 'English communication practice and evaluation'),
  ('leadership', 'Leadership Management', 'Scenario-based leadership decisions'),
  ('project', 'Project Management', 'Project planning and decision scenarios')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id SMALLINT NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  self_assessed_proficiency VARCHAR(20) NOT NULL CHECK (self_assessed_proficiency IN ('beginner', 'intermediate', 'advanced')),
  current_proficiency VARCHAR(20) NOT NULL CHECK (current_proficiency IN ('beginner', 'intermediate', 'advanced')),
  mastery_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (mastery_score >= 0 AND mastery_score <= 100),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, skill_id)
);

CREATE TABLE learning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id SMALLINT NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  task_date DATE NOT NULL,
  task_type VARCHAR(30) NOT NULL CHECK (task_type IN ('scenario', 'mcq', 'conversation')),
  proficiency VARCHAR(20) NOT NULL CHECK (proficiency IN ('beginner', 'intermediate', 'advanced')),
  title VARCHAR(255) NOT NULL,
  prompt TEXT NOT NULL,
  options JSONB,
  task_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation_provider VARCHAR(50) NOT NULL DEFAULT 'demo',
  is_demo BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_progress', 'completed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, skill_id, task_date)
);

CREATE TABLE task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES learning_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_option VARCHAR(10),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, user_id)
);

CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_submission_id UUID REFERENCES task_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id SMALLINT NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('improved', 'consistent', 'decreased')),
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  improvement_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  feedback TEXT NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'demo',
  is_demo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE proficiency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_skill_id UUID NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,
  evaluation_id UUID REFERENCES evaluations(id) ON DELETE SET NULL,
  previous_proficiency VARCHAR(20) NOT NULL,
  new_proficiency VARCHAR(20) NOT NULL,
  previous_score NUMERIC(5,2) NOT NULL,
  new_score NUMERIC(5,2) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE communication_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id SMALLINT NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  scenario_prompt TEXT NOT NULL,
  proficiency VARCHAR(20) NOT NULL CHECK (proficiency IN ('beginner', 'intermediate', 'advanced')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE communication_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES communication_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE video_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id SMALLINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency VARCHAR(20) NOT NULL CHECK (proficiency IN ('beginner', 'intermediate', 'advanced')),
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'youtube',
  duration_seconds INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_skills_user_active ON user_skills(user_id, active);
CREATE INDEX idx_learning_tasks_user_date ON learning_tasks(user_id, task_date DESC);
CREATE INDEX idx_evaluations_user_skill ON evaluations(user_id, skill_id, created_at DESC);
CREATE INDEX idx_communication_messages_session ON communication_messages(session_id, created_at);
```

## Production integration order

1. Configure `DATABASE_URL` in `backend/.env`.
2. Replace the temporary frontend browser state with the FastAPI endpoints.
3. Add a secure password hashing provider and JWT or cookie session layer.
4. Enable an approved AI provider for task generation/evaluation and YouTube Data API for recommendations.
