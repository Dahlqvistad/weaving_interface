// src/database/models/Machine.ts
import { all, get, run } from '../db';

export interface MachineData {
    id?: number;
    name: string;
    last_active?: string;
    ip: string;
    status: number;
    fabric_id?: number;
    skott_idag?: number;
    meter_idag?: number;
    skott_fabric?: number;
    uptime?: number;
    downtime?: number;
}

export const MachineModel = {
    async getAll(): Promise<MachineData[]> {
        return all<MachineData>('SELECT * FROM machines ORDER BY name');
    },

    async getById(id: number): Promise<MachineData | null> {
        const row = await get<MachineData>(
            'SELECT * FROM machines WHERE id = ?',
            [id]
        );
        return row ?? null;
    },

    async create(data: Omit<MachineData, 'id'>): Promise<number> {
        // We need last inserted id → use a small inline "run with lastID" helper
        const sql = `
      INSERT INTO machines
        (name, ip, status, fabric_id, skott_idag, meter_idag, skott_fabric, uptime, downtime, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        const params = [
            data.name,
            data.ip,
            data.status ?? 0,
            data.fabric_id ?? null,
            data.skott_idag ?? 0,
            data.meter_idag ?? 0,
            data.skott_fabric ?? 0,
            data.uptime ?? 0,
            data.downtime ?? 0,
            data.last_active ?? null,
        ];

        // Use the underlying DB directly once to read lastID
        const db = await (await import('../db')).getDb();
        const lastId: number = await new Promise((resolve, reject) => {
            const stmt = db.prepare(sql);
            stmt.run(params, function (this: any, err: Error | null) {
                if (err) reject(err);
                else resolve(this.lastID as number);
            });
            stmt.finalize();
        });
        return lastId;
    },

    async update(id: number, data: Partial<MachineData>): Promise<void> {
        await run(
            `
      UPDATE machines SET 
        name = COALESCE(?, name),
        ip = COALESCE(?, ip),
        status = COALESCE(?, status),
        fabric_id = COALESCE(?, fabric_id),
        skott_idag = COALESCE(?, skott_idag),
        meter_idag = COALESCE(?, meter_idag),
        skott_fabric = COALESCE(?, skott_fabric),
        uptime = COALESCE(?, uptime),
        downtime = COALESCE(?, downtime),
        last_active = COALESCE(?, last_active)
      WHERE id = ?
      `,
            [
                data.name ?? null,
                data.ip ?? null,
                data.status ?? null,
                data.fabric_id ?? null,
                data.skott_idag ?? null,
                data.meter_idag ?? null,
                data.skott_fabric ?? null,
                data.uptime ?? null,
                data.downtime ?? null,
                data.last_active ?? null,
                id,
            ]
        );
    },

    async delete(id: number): Promise<void> {
        await run('DELETE FROM machines WHERE id = ?', [id]);
    },
};
