import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const DB_PATH = process.env.DATABASE_URL ?? join(process.cwd(), 'data', 'app.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (!_db) {
		mkdirSync(dirname(DB_PATH), { recursive: true });
		_db = new Database(DB_PATH);
		_db.pragma('journal_mode = WAL');
		_db.pragma('foreign_keys = ON');
		applySchema(_db);
	}
	return _db;
}

function applySchema(db: Database.Database): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS todos (
			id   INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT    NOT NULL
		);

		CREATE TABLE IF NOT EXISTS habits (
			id        INTEGER PRIMARY KEY AUTOINCREMENT,
			date      TEXT    NOT NULL,
			to_do_id  INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE
		);
	`);
}
