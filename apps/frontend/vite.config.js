import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@api": resolve(__dirname, "../../docs/api"),
            "@": resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 3110,
        proxy: {
            "/api": "http://localhost:3000",
            "/static": "http://localhost:3000",
        },
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/test-setup.ts"],
    },
});
