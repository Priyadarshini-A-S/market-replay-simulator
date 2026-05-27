//declare const _default: import("vite").UserConfig;
//export default _default;
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/market-replay-simulator/', // IMPORTANT for GitHub Pages
})