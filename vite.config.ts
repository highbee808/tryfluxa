import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const resolvedPort = Number(process.env.PORT || process.env.VITE_PORT) || 4173;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: resolvedPort,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: resolvedPort,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
