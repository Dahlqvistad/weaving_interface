ipcMain.handle('fabric-getName', async (event, articleNumber) => {
    const { FabricModel } = await import('./database/models/Fabric');
    return await FabricModel.getName(articleNumber);
});
import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import 'handsontable/dist/handsontable.full.min.css';
import { initDatabase } from './database/init';
import { ipcMain } from 'electron';
import { startHttpServer } from './http-server';
import { FabricModel } from './database/models/Fabric';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

// START HTTP SERVER IMMEDIATELY - SEPARATE FROM WINDOW CREATION
console.log('🚀 Starting HTTP server initialization...');
initDatabase()
    .then(() => {
        console.log('✅ Database fully initialized');
        startHttpServer();
        console.log('🌐 HTTP server should be accessible now!');
    })
    .catch((error) => {
        console.error('❌ Database setup error:', error);
    });

// Declare the Vite constants
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Machine handlers
ipcMain.handle('machine-getAll', async () => {
    const { MachineModel } = await import('./database/models/Machine');
    return await MachineModel.getAll();
});

ipcMain.handle('machine-getById', async (event, id) => {
    const { MachineModel } = await import('./database/models/Machine');
    return await MachineModel.getById(id);
});

ipcMain.handle('machine-create', async (event, data) => {
    const { MachineModel } = await import('./database/models/Machine');
    return await MachineModel.create(data);
});

ipcMain.handle('machine-update', async (event, id, data) => {
    const { MachineModel } = await import('./database/models/Machine');
    return await MachineModel.update(id, data);
});

ipcMain.handle('machine-delete', async (event, id) => {
    const { MachineModel } = await import('./database/models/Machine');
    return await MachineModel.delete(id);
});

// Fabric handlers
ipcMain.handle('fabric-getAll', async () => {
    const { FabricModel } = await import('./database/models/Fabric');
    return await FabricModel.getAll();
});

ipcMain.handle('fabric-getById', async (event, id) => {
    const { FabricModel } = await import('./database/models/Fabric');
    return await FabricModel.getById(id);
});

ipcMain.handle('fabric-create', async (event, data) => {
    const { FabricModel } = await import('./database/models/Fabric');
    return await FabricModel.create(data);
});

ipcMain.handle('fabric-update', async (event, id, data) => {
    const { FabricModel } = await import('./database/models/Fabric');
    return await FabricModel.update(id, data);
});

ipcMain.handle('fabric-delete', async (event, id) => {
    const { FabricModel } = await import('./database/models/Fabric');
    return await FabricModel.delete(id);
});
ipcMain.handle('fabric-getByArticleNumber', async (event, articleNumber) => {
    return await FabricModel.getByArticleNumber(articleNumber);
});

// MachineRaw handlers
ipcMain.handle('machineRaw-getAll', async () => {
    const { MachineRawModel } = await import('./database/models/MachineRaw');
    return await MachineRawModel.getAll();
});

ipcMain.handle('machineRaw-getByMachine', async (event, machineId, limit) => {
    const { MachineRawModel } = await import('./database/models/MachineRaw');
    return await MachineRawModel.getByMachine(machineId, limit);
});

ipcMain.handle('machineRaw-create', async (event, data) => {
    const { MachineRawModel } = await import('./database/models/MachineRaw');
    return await MachineRawModel.create(data);
});

ipcMain.handle(
    'machineRaw-getByDateRange',
    async (event, machineId, startDate, endDate) => {
        const { MachineRawModel } = await import(
            './database/models/MachineRaw'
        );
        return await MachineRawModel.getByDateRange(
            machineId,
            startDate,
            endDate
        );
    }
);

const createWindow = () => {
    console.log('🪟 Creating browser window...');

    // WINDOW CREATION IS NOW SEPARATE AND CANNOT BLOCK HTTP SERVER
    app.whenReady()
        .then(async () => {
            const displays = screen.getAllDisplays();
            const externalDisplay =
                displays.length > 1 ? displays[1] : displays[0];

            const mainWindow = new BrowserWindow({
                width: 1920,
                height: 1080,
                x:
                    externalDisplay.bounds.x +
                    (externalDisplay.bounds.width - 1920) / 2,
                y:
                    externalDisplay.bounds.y +
                    (externalDisplay.bounds.height - 1080) / 2,
                webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    nodeIntegration: true,
                },
                titleBarStyle: 'default',
                title: 'Vävdator', // Set the window title
                icon: path.join(__dirname, 'src/images/app-icon.png'), // Adjust path as needed
            });

            if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
                mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
            } else {
                mainWindow.loadFile(
                    path.join(
                        __dirname,
                        `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
                    )
                );
            }

            mainWindow.webContents.openDevTools();
            console.log('✅ Browser window created successfully');
        })
        .catch((error) => {
            console.error('❌ Window creation error:', error);
        });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
