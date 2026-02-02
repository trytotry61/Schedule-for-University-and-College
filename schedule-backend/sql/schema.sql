-- Таблица групп
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Таблица занятий
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id),
  day INTEGER NOT NULL,            -- 0 = Пн, 1 = Вт ...
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject TEXT NOT NULL,
  teacher_id INTEGER REFERENCES users(id),
  teacher TEXT NOT NULL,
  room TEXT NOT NULL,
  type TEXT NOT NULL,              -- lecture / practice
  week INTEGER NOT NULL            -- 0 = каждая, 1 = чётная, 2 = нечётная
);
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  group_id INTEGER REFERENCES groups(id),
  role TEXT NOT NULL DEFAULT 'student'
);
