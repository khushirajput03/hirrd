import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Use "@/..." to reference src folder
    },
  },
  build: {
    chunkSizeWarningLimit: 3000, // optional: increase chunk size warning limit
  },
});
