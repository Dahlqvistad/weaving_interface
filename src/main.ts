// src/main.ts
import { app, BrowserWindow, screen, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { promises as fs } from 'node:fs'; // ← Promise API (readFile/writeFile/mkdir)
import * as fss from 'node:fs'; // ← Sync API for appendFileSync/mkdirSync if needed
import * as XLSX from 'xlsx';

// ---- Logging to a file in userData (so we can see failures in packaged app)
function log(msg: string) {
    const when = new Date().toISOString();
    try {
        const p = path.join(app.getPath('userData'), 'main.log');
        fss.appendFileSync(p, `[${when}] ${msg}\n`);
    } catch {}
    // still mirror to console for dev
    // eslint-disable-next-line no-console
    console.log(msg);
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    if (process.platform === 'win32' && require('electron-squirrel-startup')) {
        app.quit();
    }
} catch {
    /* noop if module not present */
}

// Vite constants provided by @electron-forge/plugin-vite
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Lazy imports to avoid early Node resolution before app is ready
async function initDatabase(): Promise<void> {
    const { initDatabase } = await import('./database/init');
    await initDatabase();
}

async function startHttp(): Promise<void> {
    const { startHttpServer } = await import('./http-server');
    await startHttpServer();
}

// ---------------- IPC HANDLERS ----------------

// Machine handlers
ipcMain.handle('machine-getAll', async () => {
    const { MachineModel } = await import('./database/models/Machine');
    return MachineModel.getAll();
});

ipcMain.handle('machine-getById', async (_event, id) => {
    const { MachineModel } = await import('./database/models/Machine');
    return MachineModel.getById(id);
});

ipcMain.handle('machine-create', async (_event, data) => {
    const { MachineModel } = await import('./database/models/Machine');
    return MachineModel.create(data);
});

ipcMain.handle('machine-update', async (_event, id, data) => {
    const { MachineModel } = await import('./database/models/Machine');
    return MachineModel.update(id, data);
});

ipcMain.handle('machine-delete', async (_event, id) => {
    const { MachineModel } = await import('./database/models/Machine');
    return MachineModel.delete(id);
});

// Fabric handlers
ipcMain.handle('fabric-getAll', async () => {
    const { FabricModel } = await import('./database/models/Fabric');
    return FabricModel.getAll();
});

ipcMain.handle('fabric-getById', async (_event, id) => {
    const { FabricModel } = await import('./database/models/Fabric');
    return FabricModel.getById(id);
});

ipcMain.handle('fabric-create', async (_event, data) => {
    const { FabricModel } = await import('./database/models/Fabric');
    return FabricModel.create(data);
});

ipcMain.handle('fabric-update', async (_event, id, data) => {
    const { FabricModel } = await import('./database/models/Fabric');
    return FabricModel.update(id, data);
});

ipcMain.handle('fabric-delete', async (_event, id) => {
    const { FabricModel } = await import('./database/models/Fabric');
    return FabricModel.delete(id);
});

ipcMain.handle('fabric-getByArticleNumber', async (_event, articleNumber) => {
    const { FabricModel } = await import('./database/models/Fabric');
    return FabricModel.getByArticleNumber(articleNumber);
});

ipcMain.handle('fabric-getName', async (_event, articleNumber) => {
    const { FabricModel } = await import('./database/models/Fabric');
    return FabricModel.getName(articleNumber);
});

// MachineRaw handlers
ipcMain.handle('machineRaw-getAll', async () => {
    const { MachineRawModel } = await import('./database/models/MachineRaw');
    return MachineRawModel.getAll();
});

ipcMain.handle('machineRaw-getByMachine', async (_event, machineId, limit) => {
    const { MachineRawModel } = await import('./database/models/MachineRaw');
    return MachineRawModel.getByMachine(machineId, limit);
});

ipcMain.handle('machineRaw-create', async (_event, data) => {
    const { MachineRawModel } = await import('./database/models/MachineRaw');
    return MachineRawModel.create(data);
});

ipcMain.handle(
    'machineRaw-getByDateRange',
    async (_event, machineId, startDate, endDate) => {
        const { MachineRawModel } = await import(
            './database/models/MachineRaw'
        );
        return MachineRawModel.getByDateRange(machineId, startDate, endDate);
    }
);

// ---------------- Fabrics import/serve via IPC ----------------
type Fabric = {
    article_number: string | number;
    name: string;
    color?: string;
    width?: string | number;
    skott_per_meter?: number;
};

function getDataDir() {
    const dir = path.join(app.getPath('userData'), 'data');
    fss.mkdirSync(dir, { recursive: true });
    return dir;
}

function normalizeHeader(h?: string) {
    return String(h || '')
        .toLowerCase()
        .replace(/\s|_/g, '');
}

function parseWorkbookToFabrics(filePath: string): Fabric[] {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
    if (!rows.length) return [];

    // map headers flexibly
    const hdrs = Object.keys(rows[0]).map(normalizeHeader);
    const find = (keys: string[]) => {
        const idx = hdrs.findIndex((h) => keys.includes(h));
        return idx >= 0 ? Object.keys(rows[0])[idx] : undefined;
    };
    const colArticle = find([
        'artnr',
        'artikelnummer',
        'articlenumber',
        'article',
        'artikel',
        'artnr.',
        'artno',
    ]);
    const colName = find(['namn', 'name', 'tyg', 'fabric']);
    const colColor = find(['farg', 'färg', 'color', 'colour']);
    const colWidth = find(['bredd', 'width']);
    const colSpm = find([
        'skottpermeter',
        'skottpermet',
        'spm',
        'pickspermeter',
        'picks/m',
    ]);

    return rows
        .map((r) => ({
            article_number: colArticle ? r[colArticle] ?? '' : '',
            name: colName ? r[colName] ?? '' : '',
            color: colColor ? r[colColor] ?? '' : undefined,
            width: colWidth ? r[colWidth] ?? '' : undefined,
            skott_per_meter: colSpm
                ? Number(r[colSpm]) || undefined
                : undefined,
        }))
        .filter(
            (f) => String(f.article_number).trim() || String(f.name).trim()
        );
}

// Pick file, parse, save JSON
ipcMain.handle('fabrics-import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Importera tyger (.xlsx)',
        filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
        properties: ['openFile'],
    });
    if (canceled || !filePaths[0]) return { ok: false, reason: 'cancelled' };

    const fabrics = parseWorkbookToFabrics(filePaths[0]);
    const dir = getDataDir();
    await fs.writeFile(
        path.join(dir, 'parsed_metervara.json'),
        JSON.stringify(fabrics, null, 2),
        'utf8'
    );
    await fs.writeFile(
        path.join(dir, 'fabrics.json'),
        JSON.stringify(fabrics, null, 2),
        'utf8'
    );

    return { ok: true, count: fabrics.length };
});

// Read JSON back
ipcMain.handle('fabrics-getAll', async () => {
    try {
        const p = path.join(getDataDir(), 'parsed_metervara.json');
        const txt = await fs.readFile(p, 'utf8');
        return JSON.parse(txt);
    } catch {
        return []; // none yet
    }
});

// Metervara handlers
ipcMain.handle('metervara-getAll', async () => {
    const { MetervaraModel } = await import('./database/models/Fabric');
    return await MetervaraModel.getAll();
});

// ---------------- WINDOW ----------------
async function createWindow() {
    log('🪟 Creating browser window...');
    const displays = screen.getAllDisplays();
    const externalDisplay = displays.length > 1 ? displays[1] : displays[0];

    const mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        x: externalDisplay.bounds.x + (externalDisplay.bounds.width - 1920) / 2,
        y:
            externalDisplay.bounds.y +
            (externalDisplay.bounds.height - 1080) / 2,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        titleBarStyle: 'default',
        title: 'Vävdator',
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        const html = path.join(
            __dirname,
            `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
        );
        log(`Loading file: ${html}`);
        await mainWindow.loadFile(html);
        // mainWindow.webContents.openDevTools() // enable if needed in prod
    }

    log('✅ Browser window created successfully');
    return mainWindow;
}

// ---------------- APP LIFECYCLE ----------------
async function boot() {
    log('🚀 App boot started');
    await app.whenReady();

    // Initialize DB first so any migrations/PRAGMAs run before HTTP server starts
    try {
        log('🗄️  Initializing database...');
        await initDatabase();
        log('✅ Database initialized');
    } catch (err: any) {
        log('❌ Database setup error: ' + (err?.stack || err));
    }

    // Start HTTP server (bind to 0.0.0.0 inside startHttpServer for ESP32 on LAN)
    try {
        log('🌐 Starting HTTP server...');
        await startHttp();
        log('🌐 HTTP server started');
    } catch (err: any) {
        log('❌ HTTP server error: ' + (err?.stack || err));
    }

    await createWindow();

    app.on('activate', async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            await createWindow();
        }
    });
}

app.on('ready', () => {
    // console.log('NODE_ENV:', process.env.NODE_ENV);
    // if (process.env.NODE_ENV === 'development') {
    //     const {
    //         default: installExtension,
    //         REACT_DEVELOPER_TOOLS,
    //     } = require('electron-devtools-installer');
    //     installExtension(REACT_DEVELOPER_TOOLS)
    //         .then((name: any) => console.log(`Added Extension:  ${name}`))
    //         .catch((err: any) => console.log('An error occurred: ', err));
    // }
    void boot();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Crash guards (write to main.log so we can see issues in packaged app)
process.on('uncaughtException', (err) => {
    log('💥 uncaughtException: ' + (err?.stack || err));
});
process.on('unhandledRejection', (reason: any) => {
    log('💥 unhandledRejection: ' + (reason?.stack || reason));
});
