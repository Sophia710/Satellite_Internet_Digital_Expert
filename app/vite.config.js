import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 构建产物用相对路径，便于 dist 直接在本机或内网静态目录打开
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: { port: 5173, strictPort: true },
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 8192,
    rollupOptions: {
      output: {
        // 单文件交付要求只有一个 JS 产物，禁止拆分
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
});
