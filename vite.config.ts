import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Performance optimizations
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor libraries
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['motion/react'],
            'vendor-capacitor': [
              '@capacitor/core',
              '@capacitor/app', 
              '@capacitor/browser',
              '@capacitor/local-notifications',
              '@capacitor/push-notifications'
            ],
            // Split large icon library
            'vendor-icons': ['lucide-react'],
          },
        },
      },
      // Reduce chunk size warnings
      chunkSizeWarningLimit: 600,
      // Use esbuild minification (faster than terser)
      minify: 'esbuild',
      target: 'es2015',
      // Source maps only in dev
      sourcemap: mode === 'development',
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
