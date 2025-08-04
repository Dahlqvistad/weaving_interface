import { db } from '../connection';

export interface MachineData {
    id?: number;
    name: string;
    last_active?: string;
    ip: string;
    status: number;
    meter_idag?: number;
    driftstatus?: number;
}

export const MachineModel = {
    getAll: (): Promise<MachineData[]> => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM machines ORDER BY name', (err, rows) => {
                if (err) reject(err);
                else resolve(rows as MachineData[]);
            });
        });
    },

    getById: (id: number): Promise<MachineData | null> => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM machines WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve((row as MachineData) || null);
            });
        });
    },

    create: (data: Omit<MachineData, 'id'>): Promise<number> => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
        INSERT INTO machines (name, ip, status, meter_idag, driftstatus) 
        VALUES (?, ?, ?, ?, ?)
      `);
            stmt.run(
                [
                    data.name,
                    data.ip,
                    data.status,
                    data.meter_idag,
                    data.driftstatus,
                ],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
            stmt.finalize();
        });
    },

    update: (id: number, data: Partial<MachineData>): Promise<void> => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
        UPDATE machines SET 
        name = COALESCE(?, name),
        ip = COALESCE(?, ip),
        status = COALESCE(?, status),
        meter_idag = COALESCE(?, meter_idag),
        driftstatus = COALESCE(?, driftstatus),
        last_active = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
            stmt.run(
                [
                    data.name,
                    data.ip,
                    data.status,
                    data.meter_idag,
                    data.driftstatus,
                    id,
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
            stmt.finalize();
        });
    },

    delete: (id: number): Promise<void> => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM machines WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },
};
