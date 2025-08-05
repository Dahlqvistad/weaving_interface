import { db } from '../connection';

export interface FabricData {
    id: number;
    name: string;
    pattern: string;
    color: string;
    width: number;
    skott_per_meter: number;
}

export const FabricModel = {
    getAll: (): Promise<FabricData[]> => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM fabrics ORDER BY name', (err, rows) => {
                if (err) reject(err);
                else resolve(rows as FabricData[]);
            });
        });
    },

    getById: (id: number): Promise<FabricData | null> => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM fabrics WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve((row as FabricData) || null);
            });
        });
    },

    create: (data: Omit<FabricData, 'id'>): Promise<number> => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
        INSERT INTO fabrics (name, pattern, color, width, skott_per_meter) 
        VALUES (?, ?, ?, ?, ?)
      `);
            stmt.run(
                [
                    data.name,
                    data.pattern,
                    data.color,
                    data.width,
                    data.skott_per_meter,
                ],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
            stmt.finalize();
        });
    },

    update: (id: number, data: Partial<FabricData>): Promise<void> => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
        UPDATE fabrics SET 
        name = COALESCE(?, name),
        pattern = COALESCE(?, pattern),
        color = COALESCE(?, color),
        width = COALESCE(?, width),
        skott_per_meter = COALESCE(?, skott_per_meter)
        WHERE id = ?
      `);
            stmt.run(
                [
                    data.name,
                    data.pattern,
                    data.color,
                    data.width,
                    data.skott_per_meter,
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
            db.run('DELETE FROM fabrics WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },
};
