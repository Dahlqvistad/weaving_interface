// src/utils/paths.ts
import { app } from 'electron';
import path from 'node:path';

export function getAssetPath(...segments: string[]) {
    // In dev, __dirname is somewhere under src/.vite/build; go up to project root if needed.
    // Adjust '../../' if your main build ends up deeper.
    const devBase = path.join(__dirname, '..', '..'); // project root-ish
    const prodBase = process.resourcesPath; // .../Contents/Resources
    const base = app.isPackaged ? prodBase : devBase;
    return path.join(base, ...segments);
}
