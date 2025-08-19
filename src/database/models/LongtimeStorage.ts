import { all, get, run } from '../db';

export interface LongtimeStorageData {
    id?: number;
    machine_id: number;
    hour: string; // ISO string, e.g. '2025-08-12T14:00:00'
    total_skott: number;
    total_meter: number;
    uptime: number;
    downtime: number;
    fabric_id: number;
}

export const LongtimeStorageModel = {
    async getAll(): Promise<LongtimeStorageData[]> {
        return all<LongtimeStorageData>(
            'SELECT * FROM longtime_storage ORDER BY hour DESC'
        );
    },

    async getByMachineAndHour(
        machine_id: number,
        time: string
    ): Promise<LongtimeStorageData | null> {
        const row = await get<LongtimeStorageData>(
            'SELECT * FROM longtime_storage WHERE machine_id = ? AND time = ?',
            [machine_id, time]
        );
        return row ?? null;
    },

    async createOrUpdate(data: Omit<LongtimeStorageData, 'id'>): Promise<void> {
        await run(
            `
    INSERT INTO longtime_storage (machine_id, time, total_skott, total_meter, uptime, downtime, fabric_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(machine_id, time, fabric_id) DO UPDATE SET
        total_skott = excluded.total_skott,
        total_meter = excluded.total_meter,
        uptime = excluded.uptime,
        downtime = excluded.downtime,
        fabric_id = excluded.fabric_id
    `,
            [
                data.machine_id,
                data.hour,
                data.total_skott,
                data.total_meter,
                data.uptime,
                data.downtime,
                data.fabric_id,
            ]
        );
    },

    async deleteOlderThan(hoursAgo: number): Promise<void> {
        const cutoff = new Date(
            Date.now() - hoursAgo * 60 * 60 * 1000
        ).toISOString();
        await run('DELETE FROM longtime_storage WHERE time < ?', [cutoff]);
    },

    // ...existing code...

    async getFiltered(filters: {
        fabric_id?: number;
        machine_id?: number;
        start?: string;
        end?: string;
        sort?: string;
        time_format?: 'hour' | 'day' | 'week';
    }): Promise<LongtimeStorageData[]> {
        let groupBy = 'time';
        if (filters.time_format === 'day') {
            groupBy = 'substr(time, 1, 10)'; // 'YYYY-MM-DD'
        } else if (filters.time_format === 'week') {
            groupBy = "strftime('%Y-W%W', time)"; // 'YYYY-Www'
        }

        let query = `
            SELECT 
                MIN(id) as id,
                machine_id,
                ${groupBy} as time,
                SUM(total_skott) as total_skott,
                SUM(total_meter) as total_meter,
                SUM(uptime) as uptime,
                SUM(downtime) as downtime,
                fabric_id
            FROM longtime_storage
            WHERE 1=1
        `;
        const params: any[] = [];

        if (filters.fabric_id !== undefined) {
            query += ' AND fabric_id = ?';
            params.push(filters.fabric_id);
        }
        if (filters.machine_id !== undefined) {
            query += ' AND machine_id = ?';
            params.push(filters.machine_id);
        }
        if (filters.start) {
            query += ' AND time >= ?';
            params.push(filters.start);
        }
        if (filters.end) {
            query += ' AND time <= ?';
            params.push(filters.end);
        }

        query += ` GROUP BY machine_id, fabric_id, ${groupBy} `;

        if (filters.sort) {
            const allowedSorts = [
                'time',
                'fabric_id',
                'machine_id',
                'total_skott',
                'total_meter',
            ];
            if (allowedSorts.includes(filters.sort)) {
                query += ` ORDER BY ${filters.sort} DESC`;
            } else {
                query += ' ORDER BY time DESC';
            }
        } else {
            query += ' ORDER BY time DESC';
        }

        return all<LongtimeStorageData>(query, params);
    },

    // ...existing code...
};
