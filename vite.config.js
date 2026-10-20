import { defineConfig } from 'vite';
// Game is index.html (pad.html is the controller test page, dev only).
export default defineConfig({ base: './', build: { target: 'es2022', chunkSizeWarningLimit: 1200 } });
