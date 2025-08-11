export {};

declare global {
    interface Window {
        fabricsAPI: {
            import(): Promise<{ ok: boolean; count?: number; reason?: string }>;
            getAll(): Promise<any[]>;
        };
        // add dbAPI etc if you want IntelliSense for those too
    }
}
