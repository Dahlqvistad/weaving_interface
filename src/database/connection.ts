// src/database/connection.ts
import sqlite3pkg from 'sqlite3';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

const sqlite3 = sqlite3pkg.verbose();

/** Optional: allow overriding the DB path in dev/tests via env */
function envDbPath(): string | undefined {
    return process.env.WEAVING_DB_PATH || process.env.DB_PATH || undefined;
}

/** Ensure Electron is ready before using app.getPath */
async function ensureAppReady() {
    if (!app.isReady()) await app.whenReady();
}

/** Resolve a writable DB path (works in dev & prod) */
export async function getDbPath(): Promise<string> {
    await ensureAppReady();

    const override = envDbPath();
    if (override) return override;

    // Always use userData so it’s writable outside the asar
    const dir = app.getPath('userData');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'weaving_database.db');
}

/** Open the database (creates file if it doesn’t exist) */
export async function openDatabase(): Promise<sqlite3pkg.Database> {
    const dbPath = await getDbPath();

    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(
            dbPath,
            sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
            (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                    return;
                }
                console.log('Connected to SQLite database at:', dbPath);
                // Enable foreign keys
                db.run('PRAGMA foreign_keys = ON');
                resolve(db);
            }
        );
    });
}

/** Close helper */
export function closeDatabase(db: sqlite3pkg.Database): Promise<void> {
    return new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
    });
}
