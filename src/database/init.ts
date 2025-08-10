import { db } from './connection';
import { seedMachines, seedMachineRawData, seedFabrics } from './seed';

export const initDatabase = (): Promise<void> => {
    return new Promise((resolve, reject) => {
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

        db.serialize(() => {
            let completedTables = 0;
            const totalTables = 2; // Changed from 3 to 2
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
                        // await seedMachines();
                        // await seedFabrics(); // This will now create JSON file
                        // await seedMachineRawData();
                        resolve();
                    } catch (seedError) {
                        reject(seedError);
                    }
                }
            };

            db.run(createMachinesTable, checkCompletion);
            db.run(createMachineRawTable, checkCompletion);
            // Removed: db.run(createFabricsTable, checkCompletion);
        });
    });
};
