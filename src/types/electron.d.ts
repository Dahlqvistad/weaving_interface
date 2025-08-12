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
                getByArticleNumber: (articleNumber: number) => Promise<any>;
                getName: (articleNumber: number) => Promise<string | null>;
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
        metervaraAPI: {
            getAll: () => Promise<
                Array<{ article_number: string | number; name: string }>
            >;
        };
    }
}

export {};
