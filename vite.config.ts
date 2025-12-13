import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  // Development server uses '/', production builds use the repository path for GitHub Pages.
  base: mode === 'development' ? '/' : '/tieliikennevideowall/',
  plugins: [react()],
}));
