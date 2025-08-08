import sqlite3 from 'sqlite3';
import { app } from 'electron';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';
const dbPath = isDev
    ? path.join(__dirname, '../../weaving_database.db')
    : path.join(app.getPath('userData'), 'weaving_database.db');

export const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
    }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Close database on app exit
export const closeDatabase = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};
