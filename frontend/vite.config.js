import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,                 // necesario para acceder desde fuera del contenedor
    port: 5173,
    strictPort: true,
    watch: { usePolling: true }, // recarga en caliente fiable en Windows/Docker Desktop
    proxy: {
      '/api': 'http://localhost:3000', // front y back están en el mismo contenedor
    },
  },
});
