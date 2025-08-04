import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import 'handsontable/dist/handsontable.full.min.css';
import { initDatabase } from './database/init';
import { ipcMain } from 'electron';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

// Add to your imports

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
    app.whenReady().then(async () => {
        try {
            await initDatabase(); // This now handles both tables AND seeding
            console.log('Database fully initialized');
        } catch (error) {
            console.error('Database setup error:', error);
        }

        const displays = screen.getAllDisplays();
        const externalDisplay = displays.length > 1 ? displays[1] : displays[0]; // Use the second screen if it exists, otherwise fallback to the primary screen

        const mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            x:
                externalDisplay.bounds.x +
                (externalDisplay.bounds.width - 800) / 2, // Center the window on the external display
            y:
                externalDisplay.bounds.y +
                (externalDisplay.bounds.height - 600) / 2,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: true,
            },
            titleBarStyle: 'default',
            // backgroundColor: '#292c34',
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
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
