import { defineConfig } from 'vite';
// Game is index.html; look.html is the frozen painted-3D look demo (dev only, not part of the build).
// PT-077: sql.js (the stats database) is loaded by a dynamic import; naming it here makes the dev server prepare it at start instead of reloading the page the first time the game asks for it.
export default defineConfig({ base: './', build: { target: 'es2022', chunkSizeWarningLimit: 1200 }, optimizeDeps: { include: ['sql.js'] } });
