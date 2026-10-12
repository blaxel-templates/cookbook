// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false
  },
  server: {
    host: '0.0.0.0',
    port: 4321,
    allowedHosts: true
  }
});