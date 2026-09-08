CREATE TABLE IF NOT EXISTS project_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL UNIQUE,
  proposal_id INTEGER NOT NULL UNIQUE,
  freelancer_id INTEGER NOT NULL,
  start_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK(status IN (
      'in_progress',
      'submitted',
      'revision_requested',
      'completed'
    )),
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id)
    REFERENCES projects(id)
    ON DELETE CASCADE,

  FOREIGN KEY (proposal_id)
    REFERENCES proposals(id)
    ON DELETE CASCADE,

  FOREIGN KEY (freelancer_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_executions_freelancer
ON project_executions(freelancer_id);

CREATE INDEX IF NOT EXISTS idx_project_executions_status
ON project_executions(status);

CREATE INDEX IF NOT EXISTS idx_project_executions_due_at
ON project_executions(due_at);


CREATE TABLE IF NOT EXISTS project_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id INTEGER NOT NULL,
  freelancer_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  message TEXT NOT NULL,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK(status IN (
      'submitted',
      'accepted',
      'revision_requested'
    )),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (execution_id)
    REFERENCES project_executions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (freelancer_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  UNIQUE(execution_id, version)
);

CREATE INDEX IF NOT EXISTS idx_project_deliveries_execution
ON project_deliveries(execution_id);

CREATE INDEX IF NOT EXISTS idx_project_deliveries_status
ON project_deliveries(status);


CREATE TABLE IF NOT EXISTS project_revision_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_id INTEGER NOT NULL,
  delivery_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK(status IN (
      'open',
      'resolved'
    )),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,

  FOREIGN KEY (execution_id)
    REFERENCES project_executions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (delivery_id)
    REFERENCES project_deliveries(id)
    ON DELETE CASCADE,

  FOREIGN KEY (client_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_revision_requests_execution
ON project_revision_requests(execution_id);

CREATE INDEX IF NOT EXISTS idx_revision_requests_status
ON project_revision_requests(status);


CREATE TABLE IF NOT EXISTS project_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  execution_id INTEGER,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id)
    REFERENCES projects(id)
    ON DELETE CASCADE,

  FOREIGN KEY (execution_id)
    REFERENCES project_executions(id)
    ON DELETE SET NULL,

  FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_events_project
ON project_events(project_id);

CREATE INDEX IF NOT EXISTS idx_project_events_execution
ON project_events(execution_id);

CREATE INDEX IF NOT EXISTS idx_project_events_created
ON project_events(created_at);
