import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import { pluginExposeRenderer } from './vite.base.config';
import path from 'node:path';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config
export default defineConfig((env) => {
    const forgeEnv = env as ConfigEnv<'renderer'>;
    const { root, mode, forgeConfigSelf } = forgeEnv;
    const name = forgeConfigSelf.name ?? '';

    return {
        root,
        mode,
        base: './', // critical so CSS/JS load via file:// in packaged app
        build: {
            outDir: `.vite/renderer/${name}`,
            emptyOutDir: true,
        },
        plugins: [svgr(), pluginExposeRenderer(name)],
        resolve: {
            preserveSymlinks: true,
        },
        clearScreen: false,
    } as UserConfig;
});
