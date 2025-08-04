declare global {
    interface Window {
        dbAPI: {
            machine: {
                getAll: () => Promise<any[]>;
                getById: (id: number) => Promise<any>;
                create: (data: any) => Promise<number>;
                update: (id: number, data: any) => Promise<void>;
                delete: (id: number) => Promise<void>;
            };
            fabric: {
                getAll: () => Promise<any[]>;
                getById: (id: number) => Promise<any>;
                create: (data: any) => Promise<number>;
                update: (id: number, data: any) => Promise<void>;
                delete: (id: number) => Promise<void>;
            };
            machineRaw: {
                getAll: () => Promise<any[]>;
                getByMachine: (
                    machineId: number,
                    limit?: number
                ) => Promise<any[]>;
                create: (data: any) => Promise<number>;
                getByDateRange: (
                    machineId: number,
                    startDate: string,
                    endDate: string
                ) => Promise<any[]>;
            };
        };
    }
}

export {};
