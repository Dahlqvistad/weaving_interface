import { db } from '../connection';

export interface MachineRawData {
    id?: number;
    machine_id: number;
    timestamp: string;
    event_type: string;
    value?: number;
    fabric_id?: number;
    meta?: string;
}

export const MachineRawModel = {
    getAll: (): Promise<MachineRawData[]> => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM machine_raw ORDER BY timestamp DESC',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows as MachineRawData[]);
                }
            );
        });
    },

    getByMachine: (
        machineId: number,
        limit: number = 100
    ): Promise<MachineRawData[]> => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM machine_raw WHERE machine_id = ? ORDER BY timestamp DESC LIMIT ?',
                [machineId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows as MachineRawData[]);
                }
            );
        });
    },

    create: (data: Omit<MachineRawData, 'id'>): Promise<number> => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
        INSERT INTO machine_raw (machine_id, timestamp, event_type, value, fabric_id, meta) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
            stmt.run(
                [
                    data.machine_id,
                    data.timestamp,
                    data.event_type,
                    data.value || 1,
                    data.fabric_id,
                    data.meta,
                ],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
            stmt.finalize();
        });
    },

    getByDateRange: (
        machineId: number,
        startDate: string,
        endDate: string
    ): Promise<MachineRawData[]> => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM machine_raw WHERE machine_id = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp',
                [machineId, startDate, endDate],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows as MachineRawData[]);
                }
            );
        });
    },
};
