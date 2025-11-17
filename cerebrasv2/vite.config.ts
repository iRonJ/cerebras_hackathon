import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const resolvedApiBase = env.VITE_API_BASE?.replace(/\/$/, '');
  const shouldProxy = !resolvedApiBase;
  const proxyTarget =
    env.DESKTOP_API_ORIGIN?.replace(/\/$/, '') || 'http://localhost:4000';

  return {
    plugins: [react()],
    server: shouldProxy
      ? {
          proxy: {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
            },
          },
        }
      : undefined,
  };
});
