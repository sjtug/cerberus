import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import viteImagemin from 'vite-plugin-imagemin'

export default defineConfig({
    plugins: [
        tailwindcss(),
        viteImagemin({
            pngquant: {
                quality: [0, 0.2],
                strip: true,
            },
        }),
    ],
    base: "",
    build: {
        manifest: true,
        rollupOptions: {
            input: [
                "./js/main.mjs",
                "./js/assets.mjs",
                "./global.css",
            ]
        }
    },
})