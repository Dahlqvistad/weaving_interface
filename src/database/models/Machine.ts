import { db } from '../connection';

export interface MachineData {
    id?: number;
    name: string;
    last_active?: string;
    ip: string;
    status: number;
    fabric_id?: number; // ADD THIS
    meter_idag?: number;
    meter_fabric?: number; // ADD THIS
    uptime?: number; // ADD THIS
    downtime?: number; // ADD THIS
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
                INSERT INTO machines (name, ip, status, fabric_id, meter_idag, meter_fabric, uptime, downtime) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(
                [
                    data.name,
                    data.ip,
                    data.status || 0,
                    data.fabric_id,
                    data.meter_idag || 0,
                    data.meter_fabric || 0,
                    data.uptime || 0,
                    data.downtime || 0,
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
                fabric_id = COALESCE(?, fabric_id),
                meter_idag = COALESCE(?, meter_idag),
                meter_fabric = COALESCE(?, meter_fabric),
                uptime = COALESCE(?, uptime),
                downtime = COALESCE(?, downtime),
                last_active = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            stmt.run(
                [
                    data.name,
                    data.ip,
                    data.status,
                    data.fabric_id,
                    data.meter_idag,
                    data.meter_fabric,
                    data.uptime,
                    data.downtime,
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
