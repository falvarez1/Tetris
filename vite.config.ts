import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import { resolve } from 'path';

export default defineConfig({
  base: '/Tetris/',
  plugins: [
    glsl({
      include: [
        '**/*.glsl',
        '**/*.vert',
        '**/*.frag',
      ],
      defaultExtension: 'glsl',
      compress: false,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@rendering': resolve(__dirname, 'src/rendering'),
      '@themes': resolve(__dirname, 'src/themes'),
      '@input': resolve(__dirname, 'src/input'),
      '@audio': resolve(__dirname, 'src/audio'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
  },
});
