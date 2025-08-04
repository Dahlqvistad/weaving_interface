import { db } from './connection';
import { seedMachines } from './seed';

export const initDatabase = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const createMachinesTable = `
      CREATE TABLE IF NOT EXISTS machines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip TEXT NOT NULL,
        status INTEGER NOT NULL,
        meter_idag INTEGER NOT NULL,
        driftstatus INTEGER NOT NULL
      );
    `;

        const createFabricsTable = `
      CREATE TABLE IF NOT EXISTS fabrics (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        pattern TEXT NOT NULL,
        color TEXT NOT NULL,
        width REAL NOT NULL,
        skott_per_meter REAL NOT NULL
      );
    `;

        //     const createProductionTable = `
        //   CREATE TABLE IF NOT EXISTS production (
        //     id INTEGER PRIMARY KEY AUTOINCREMENT,
        //     machine_id INTEGER NOT NULL,
        //     fabric_id INTEGER NOT NULL,
        //     date TEXT NOT NULL,
        //     skott INTEGER NOT NULL,
        //     meters REAL NOT NULL,
        //     production_code TEXT,
        //     created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        //     FOREIGN KEY (machine_id) REFERENCES machines(id),
        //     FOREIGN KEY (fabric_id) REFERENCES fabrics(id)
        //   );

        // `;

        const createMachineRawTable = `
      CREATE TABLE IF NOT EXISTS machine_raw (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        machine_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        value INTEGER NOT NULL,
        fabric_id INTEGER,
        meta TEXT,
        FOREIGN KEY(machine_id) REFERENCES machines(id),
        FOREIGN KEY(fabric_id) REFERENCES fabrics(id)
      );
    `;
        //     const createProductionSummaryTable = `
        // CREATE TABLE IF NOT EXISTS production_summary (
        //     id INTEGER PRIMARY KEY AUTOINCREMENT,
        //     machine_id TEXT NOT NULL,
        //     fabric_id INTEGER,
        //     date TEXT NOT NULL,                -- t.ex. "2025-08-03"
        //     total_skott INTEGER NOT NULL,
        //     meters REAL NOT NULL,
        //     uptime_minutes INTEGER NOT NULL,   -- maskinen aktiv
        //     downtime_minutes INTEGER NOT NULL, -- maskinen stilla
        //     calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        //     FOREIGN KEY(machine_id) REFERENCES machines(id),
        //     FOREIGN KEY(fabric_id) REFERENCES fabrics(id)
        //     );
        //     `;

        db.serialize(() => {
            let completedTables = 0;
            const totalTables = 3;
            let hasError = false;

            const checkCompletion = async (err?: Error) => {
                if (err && !hasError) {
                    hasError = true;
                    reject(err);
                    return;
                }
                completedTables++;
                if (completedTables === totalTables && !hasError) {
                    console.log('All database tables created successfully');

                    // Now seed the database if it's empty
                    try {
                        await seedMachines();
                        resolve();
                    } catch (seedError) {
                        reject(seedError);
                    }
                }
            };

            db.run(createMachinesTable, checkCompletion);
            db.run(createFabricsTable, checkCompletion);
            db.run(createMachineRawTable, checkCompletion);
        });
    });
};
