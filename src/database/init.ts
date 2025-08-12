// src/database/init.ts
import type sqlite3 from 'sqlite3';
import { openDatabase } from './connection';
// If you want to seed, keep these imports and make sure seed functions accept (db)
// import { seedMachines, seedMachineRawData, seedFabrics } from './seed'

// small promise helper
function run(db: sqlite3.Database, sql: string, params: any[] = []) {
    return new Promise<void>((resolve, reject) => {
        db.run(sql, params, (err) => (err ? reject(err) : resolve()));
    });
}

export async function initDatabase(): Promise<void> {
    const db = await openDatabase();

    // Ensure FK constraints
    await run(db, 'PRAGMA foreign_keys = ON');

    const createMachinesTable = `
    CREATE TABLE IF NOT EXISTS machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 0, -- 0 = inactive, 1 = active
      fabric_id INTEGER,
      skott_idag INTEGER NOT NULL DEFAULT 0,
      meter_idag INTEGER NOT NULL DEFAULT 0,
      skott_fabric INTEGER NOT NULL DEFAULT 0,
      uptime INTEGER NOT NULL DEFAULT 0,
      downtime INTEGER NOT NULL DEFAULT 0
    );
  `;

    const createMachineRawTable = `
    CREATE TABLE IF NOT EXISTS machine_raw (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      event_type TEXT NOT NULL,
      value INTEGER NOT NULL,
      meta TEXT,
      FOREIGN KEY(machine_id) REFERENCES machines(id)
    );
    
  `;
    const createLongtimeStorage = `
    CREATE TABLE IF NOT EXISTS longtime_storage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        machine_id INTEGER NOT NULL,
        hour TEXT NOT NULL,
        total_skott INTEGER DEFAULT 0,
        total_meter REAL DEFAULT 0,
        uptime INTEGER DEFAULT 0,
        downtime INTEGER DEFAULT 0
    )
    `;

    await run(db, createMachinesTable);
    await run(db, createMachineRawTable);
    await run(db, createLongtimeStorage);

    // ---- Seeding (optional) ----
    // If your seed functions previously used a global db, refactor them to accept (db: sqlite3.Database)
    // and then uncomment these lines:
    // await seedMachines(db)
    // await seedFabrics(db)
    // await seedMachineRawData(db)

    // done
}
