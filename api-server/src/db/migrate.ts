import { sql } from "./client";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS agents (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL,
  model           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'offline',
  skills          TEXT[] DEFAULT '{}',
  tasks_completed INTEGER DEFAULT 0,
  response_rate   NUMERIC DEFAULT 0,
  avg_response_ms NUMERIC DEFAULT 0,
  reports         TEXT[] DEFAULT '{}',
  reports_to      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT,
  created_by_agent TEXT REFERENCES agents(id),
  assignee_type    TEXT NOT NULL CHECK (assignee_type IN ('agent','human')),
  assignee_id      TEXT NOT NULL,
  assignee_name    TEXT NOT NULL,
  priority         TEXT NOT NULL CHECK (priority IN ('high','medium','low')),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','in-progress','done','delegated')),
  due_date         TIMESTAMPTZ,
  tags             TEXT[] DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS task_delegations (
  id          SERIAL PRIMARY KEY,
  task_id     TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  from_id     TEXT NOT NULL,
  to_id       TEXT NOT NULL,
  proposed_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  reason      TEXT,
  status      TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED'))
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT UNIQUE NOT NULL,
  role           TEXT DEFAULT 'user' CHECK (role IN ('admin','user')),
  alerts_enabled BOOLEAN DEFAULT TRUE,
  alert_email    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_passwords (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS openclaw_agent_config (
  agent_id TEXT PRIMARY KEY,
  model    TEXT NOT NULL DEFAULT '',
  tools    TEXT[] DEFAULT '{}'
);

-- Drop FK so tasks can reference agent IDs that no longer live in Postgres
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_agent_fkey;
`;

export async function migrate(): Promise<void> {
  await sql.unsafe(SCHEMA);
}
