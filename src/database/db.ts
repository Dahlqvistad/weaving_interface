// src/database/db.ts
import * as sqlite3 from 'sqlite3';
import { openDatabase } from './connection';

// Keep one opened connection and reuse it
let dbPromise: Promise<sqlite3.Database> | null = null;

export function getDb(): Promise<sqlite3.Database> {
    if (!dbPromise) dbPromise = openDatabase();
    return dbPromise;
}

// Promise helpers so models can `await` queries without callback types everywhere
export function all<T = any>(sql: string, params: any[] = []) {
    return getDb().then(
        (db) =>
            new Promise<T[]>((resolve, reject) => {
                db.all(sql, params, (err: Error | null, rows: any[]) => {
                    if (err) reject(err);
                    else resolve(rows as T[]);
                });
            })
    );
}

export function get<T = any>(sql: string, params: any[] = []) {
    return getDb().then(
        (db) =>
            new Promise<T | undefined>((resolve, reject) => {
                db.get(sql, params, (err: Error | null, row: any) => {
                    if (err) reject(err);
                    else resolve((row as T) ?? undefined);
                });
            })
    );
}

export function run(sql: string, params: any[] = []) {
    return getDb().then(
        (db) =>
            new Promise<void>((resolve, reject) => {
                db.run(
                    sql,
                    params,
                    function (this: sqlite3.RunResult, err: Error | null) {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            })
    );
}
