// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('dbAPI', {
    // Machine methods
    machine: {
        getAll: () => ipcRenderer.invoke('machine-getAll'),
        getById: (id: number) => ipcRenderer.invoke('machine-getById', id),
        create: (data: any) => ipcRenderer.invoke('machine-create', data),
        update: (id: number, data: any) =>
            ipcRenderer.invoke('machine-update', id, data),
        delete: (id: number) => ipcRenderer.invoke('machine-delete', id),
    },
    // Fabric methods
    fabric: {
        getAll: () => ipcRenderer.invoke('fabric-getAll'),
        getById: (id: number) => ipcRenderer.invoke('fabric-getById', id),
        create: (data: any) => ipcRenderer.invoke('fabric-create', data),
        update: (id: number, data: any) =>
            ipcRenderer.invoke('fabric-update', id, data),
        getByArticleNumber: (articleNumber: number) =>
            ipcRenderer.invoke('fabric-getByArticleNumber', articleNumber),
        getName: (articleNumber: number) =>
            ipcRenderer.invoke('fabric-getName', articleNumber),
        delete: (id: number) => ipcRenderer.invoke('fabric-delete', id),
    },
    // MachineRaw methods
    machineRaw: {
        getAll: () => ipcRenderer.invoke('machineRaw-getAll'),
        getByMachine: (machineId: number, limit?: number) =>
            ipcRenderer.invoke('machineRaw-getByMachine', machineId, limit),
        create: (data: any) => ipcRenderer.invoke('machineRaw-create', data),
        getByDateRange: (
            machineId: number,
            startDate: string,
            endDate: string
        ) =>
            ipcRenderer.invoke(
                'machineRaw-getByDateRange',
                machineId,
                startDate,
                endDate
            ),
    },
});
window.addEventListener('DOMContentLoaded', () => {
    // Create a link element for the Tailwind CSS file
    const spinner = document.createElement('div');
    spinner.className =
        'spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full';
    spinner.style.position = 'fixed';
    spinner.style.top = '50%';
    spinner.style.left = '50%';
    spinner.style.transform = 'translate(-50%, -50%)';
    spinner.style.borderTopColor = 'transparent'; // Make the top border transparent
    document.body.appendChild(spinner);
});
