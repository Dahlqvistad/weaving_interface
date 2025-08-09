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

const FABRICS_FILE_PATH = path.join(__dirname, '../fabrics.json');

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

    delete: async (id: number): Promise<void> => {
        const fabrics = await loadFabrics();
        const filteredFabrics = fabrics.filter((fabric) => fabric.id !== id);
        await saveFabrics(filteredFabrics);
    },
};
