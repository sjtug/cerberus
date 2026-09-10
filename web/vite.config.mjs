import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

export default defineConfig({
    plugins: [
        tailwindcss(),
        ViteImageOptimizer({
            test: /\.png$/i,
            png: {
                quality: 20,
                palette: true,
            },
        }),
    ],
    base: "",
    build: {
        manifest: true,
        rolldownOptions: {
            input: [
                "./js/main.mjs",
                "./js/assets.mjs",
                "./global.css",
            ]
        }
    },
})