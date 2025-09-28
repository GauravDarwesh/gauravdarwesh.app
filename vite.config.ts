import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: ['es2015', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    cssTarget: ['chrome87', 'firefox78', 'safari14', 'edge88'],
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-slot', '@radix-ui/react-toast'],
        },
      },
    },
    sourcemap: mode === 'development',
  },
  css: {
    postcss: {
      plugins: [
        require('autoprefixer')({
          overrideBrowserslist: [
            '> 1%',
            'last 2 versions',
            'not ie <= 11',
            'not dead',
            'Chrome >= 87',
            'Firefox >= 78', 
            'Safari >= 14',
            'Edge >= 88',
            'Opera >= 73',
            'iOS >= 14',
            'Android >= 87'
          ]
        })
      ]
    }
  },
  esbuild: {
    target: 'es2015'
  }
}));
