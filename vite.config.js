import { defineConfig } from 'vite';
// Game is index.html; look.html is the frozen painted-3D look demo (dev only, not part of the build).
export default defineConfig({ base: './', build: { target: 'es2022', chunkSizeWarningLimit: 1200 } });
