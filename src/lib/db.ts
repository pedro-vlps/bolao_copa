import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

const dataDirectory = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
fs.mkdirSync(dataDirectory, { recursive: true });

const databasePath = path.join(dataDirectory, "bolao.sqlite");

export const db = new DatabaseSync(databasePath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

export const now = () => new Date().toISOString();

export type NamedParams = Record<string, SQLInputValue>;

export const run = (sql: string, params?: NamedParams) =>
  db.prepare(sql).run(params ?? {});

export const get = <T>(sql: string, params?: NamedParams) =>
  db.prepare(sql).get(params ?? {}) as T | undefined;

export const all = <T>(sql: string, params?: NamedParams) =>
  db.prepare(sql).all(params ?? {}) as T[];

export const transaction = <T>(callback: () => T) => {
  run("BEGIN");

  try {
    const result = callback();
    run("COMMIT");
    return result;
  } catch (error) {
    run("ROLLBACK");
    throw error;
  }
};

export const initDatabase = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      confederation TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tournament_groups (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (tournament_id, code),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tournament_teams (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      tournament_group_id TEXT NOT NULL,
      slot_code TEXT NOT NULL,
      seed_number INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (tournament_id, team_id),
      UNIQUE (tournament_id, slot_code),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (tournament_group_id) REFERENCES tournament_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      match_number INTEGER NOT NULL,
      stage TEXT NOT NULL,
      round_name TEXT NOT NULL,
      stage_order INTEGER NOT NULL,
      matchday INTEGER,
      tournament_group_id TEXT,
      kickoff_at TEXT NOT NULL,
      venue TEXT,
      city TEXT,
      home_team_id TEXT,
      away_team_id TEXT,
      home_team_label TEXT,
      away_team_label TEXT,
      source_home TEXT,
      source_away TEXT,
      home_score INTEGER,
      away_score INTEGER,
      home_penalty_score INTEGER,
      away_penalty_score INTEGER,
      winner_team_id TEXT,
      qualified_team_id TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (tournament_id, match_number),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (tournament_group_id) REFERENCES tournament_groups(id) ON DELETE SET NULL,
      FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE SET NULL,
      FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE SET NULL,
      FOREIGN KEY (winner_team_id) REFERENCES teams(id) ON DELETE SET NULL,
      FOREIGN KEY (qualified_team_id) REFERENCES teams(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS match_predictions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      match_id TEXT NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      home_penalty_score INTEGER,
      away_penalty_score INTEGER,
      predicted_qualified_team_id TEXT,
      points_awarded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (user_id, match_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (predicted_qualified_team_id) REFERENCES teams(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS group_predictions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tournament_group_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      predicted_position INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (user_id, tournament_group_id, team_id),
      UNIQUE (user_id, tournament_group_id, predicted_position),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tournament_group_id) REFERENCES tournament_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pool_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      invite_code TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL,
      tournament_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pool_group_id TEXT NOT NULL,
      role TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      UNIQUE (user_id, pool_group_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (pool_group_id) REFERENCES pool_groups(id) ON DELETE CASCADE
    );
  `);
};
