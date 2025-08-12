import { all, get, run } from '../db';

export interface LongtimeStorageData {
    id?: number;
    machine_id: number;
    hour: string; // ISO string, e.g. '2025-08-12T14:00:00'
    total_skott: number;
    total_meter: number;
    uptime: number;
    downtime: number;
}

export const LongtimeStorageModel = {
    async getAll(): Promise<LongtimeStorageData[]> {
        return all<LongtimeStorageData>(
            'SELECT * FROM longtime_storage ORDER BY hour DESC'
        );
    },

    async getByMachineAndHour(
        machine_id: number,
        hour: string
    ): Promise<LongtimeStorageData | null> {
        const row = await get<LongtimeStorageData>(
            'SELECT * FROM longtime_storage WHERE machine_id = ? AND hour = ?',
            [machine_id, hour]
        );
        return row ?? null;
    },

    async createOrUpdate(data: Omit<LongtimeStorageData, 'id'>): Promise<void> {
        await run(
            `
            INSERT INTO longtime_storage (machine_id, hour, total_skott, total_meter, uptime, downtime)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(machine_id, hour) DO UPDATE SET
                total_skott = excluded.total_skott,
                total_meter = excluded.total_meter,
                uptime = excluded.uptime,
                downtime = excluded.downtime
            `,
            [
                data.machine_id,
                data.hour,
                data.total_skott,
                data.total_meter,
                data.uptime,
                data.downtime,
            ]
        );
    },

    async deleteOlderThan(hoursAgo: number): Promise<void> {
        const cutoff = new Date(
            Date.now() - hoursAgo * 60 * 60 * 1000
        ).toISOString();
        await run('DELETE FROM longtime_storage WHERE hour < ?', [cutoff]);
    },
};
