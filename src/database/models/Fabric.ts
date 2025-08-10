import { promises as fs } from 'fs';
import path from 'path';

export interface FabricData {
    id: number;
    name: string;
    pattern: string;
    colors: Record<string, number>; // article numbers as keys, quantities as values
    width: number;
    skott_per_meter: number;
}

const FABRICS_FILE_PATH = path.join(process.cwd(), 'data', 'fabrics.json');

// Ensure the data directory exists
const ensureDataDirectory = async () => {
    const dataDir = path.dirname(FABRICS_FILE_PATH);
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
};

// Load fabrics from JSON file
const loadFabrics = async (): Promise<FabricData[]> => {
    try {
        await ensureDataDirectory();
        const data = await fs.readFile(FABRICS_FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is empty, return empty array
        return [];
    }
};

// Save fabrics to JSON file
const saveFabrics = async (fabrics: FabricData[]): Promise<void> => {
    await ensureDataDirectory();
    await fs.writeFile(FABRICS_FILE_PATH, JSON.stringify(fabrics, null, 2));
};

export const FabricModel = {
    // Get concatenated name and color for an article number
    getName: async (articleNumber: number): Promise<string | null> => {
        const data = await fs.readFile(FABRICS_FILE_PATH, 'utf-8');
        const fabrics = JSON.parse(data);
        for (const pattern in fabrics) {
            for (const width in fabrics[pattern]) {
                const fabric = fabrics[pattern][width];
                for (const color in fabric.colors) {
                    const value = fabric.colors[color];
                    if (Number(value) === Number(articleNumber)) {
                        return `${fabric.name}, ${color}`;
                    }
                }
            }
        }
        return null;
    },
    getAll: async (): Promise<FabricData[]> => {
        return await loadFabrics();
    },

    getById: async (id: number): Promise<FabricData | null> => {
        const fabrics = await loadFabrics();
        return fabrics.find((fabric) => fabric.id === id) || null;
    },

    create: async (data: Omit<FabricData, 'id'>): Promise<number> => {
        const fabrics = await loadFabrics();
        const newId =
            fabrics.length > 0 ? Math.max(...fabrics.map((f) => f.id)) + 1 : 1;
        const newFabric = { ...data, id: newId };
        fabrics.push(newFabric);
        await saveFabrics(fabrics);
        return newId;
    },

    update: async (id: number, data: Partial<FabricData>): Promise<void> => {
        const fabrics = await loadFabrics();
        const index = fabrics.findIndex((fabric) => fabric.id === id);
        if (index === -1) {
            throw new Error(`Fabric with id ${id} not found`);
        }
        fabrics[index] = { ...fabrics[index], ...data };
        await saveFabrics(fabrics);
    },
    // Find fabric info by article number from nested JSON
    getByArticleNumber: async (
        articleNumber: number
    ): Promise<{
        name: string;
        width: number;
        skott_per_meter: number;
        color: string;
        pattern: string;
        article_number: number;
    } | null> => {
        // Read the raw nested JSON
        const data = await fs.readFile(FABRICS_FILE_PATH, 'utf-8');
        const fabrics = JSON.parse(data);
        let checked = 0;
        let found = false;
        for (const pattern in fabrics) {
            for (const width in fabrics[pattern]) {
                const fabric = fabrics[pattern][width];
                for (const color in fabric.colors) {
                    checked++;
                    const value = fabric.colors[color];
                    // Debug log for every check

                    if (Number(value) === Number(articleNumber)) {
                        found = true;

                        return {
                            name: fabric.name,
                            width: fabric.width,
                            skott_per_meter: fabric.skott_per_meter,
                            color,
                            pattern,
                            article_number: articleNumber,
                        };
                    }
                }
            }
        }
        if (!found) {
            console.warn(
                `[FabricModel.getByArticleNumber] No match found for articleNumber=${articleNumber}. Checked ${checked} colors.`
            );
        }
        return null;
    },

    delete: async (id: number): Promise<void> => {
        const fabrics = await loadFabrics();
        const filteredFabrics = fabrics.filter((fabric) => fabric.id !== id);
        await saveFabrics(filteredFabrics);
    },
};
