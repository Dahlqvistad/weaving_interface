// src/database/models/MachineRaw.ts
import { all, get, run, getDb } from '../db';

export interface MachineRawData {
    id?: number;
    machine_id: number;
    timestamp: string; // store ISO 8601 strings: new Date().toISOString()
    event_type: string;
    value: number;
    meta?: string | null;
}

export const MachineRawModel = {
    async getAll(): Promise<MachineRawData[]> {
        return all<MachineRawData>(
            'SELECT * FROM machine_raw ORDER BY timestamp DESC'
        );
    },

    async getByMachine(
        machineId: number,
        limit?: number
    ): Promise<MachineRawData[]> {
        const lim = typeof limit === 'number' && limit > 0 ? limit : 1000;
        return all<MachineRawData>(
            'SELECT * FROM machine_raw WHERE machine_id = ? ORDER BY timestamp DESC LIMIT ?',
            [machineId, lim]
        );
    },

    async create(data: Omit<MachineRawData, 'id'>): Promise<number> {
        // Need last inserted ID → use stmt.run() with function callback
        const db = await getDb();
        const sql = `
      INSERT INTO machine_raw (machine_id, timestamp, event_type, value, meta)
      VALUES (?, ?, ?, ?, ?)
    `;
        const params = [
            data.machine_id,
            data.timestamp,
            data.event_type,
            data.value,
            data.meta ?? null,
        ];

        const id: number = await new Promise((resolve, reject) => {
            const stmt = db.prepare(sql);
            stmt.run(params, function (this: any, err: Error | null) {
                if (err) reject(err);
                else resolve(this.lastID as number);
            });
            stmt.finalize();
        });
        return id;
    },

    async getByDateRange(
        machineId: number,
        startDate: string, // ISO string expected
        endDate: string // ISO string expected
    ): Promise<MachineRawData[]> {
        return all<MachineRawData>(
            `
      SELECT * FROM machine_raw
      WHERE machine_id = ?
        AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
      `,
            [machineId, startDate, endDate]
        );
    },
};
