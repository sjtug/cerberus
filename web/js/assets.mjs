// Virtual file to ensure all PNG assets are processed by Vite
// This file imports all PNGs so they appear in the manifest for Go templates

// Import all PNG files dynamically
const pngModules = import.meta.glob('../img/*.png', { eager: true, import: 'default' })

// Export the mapping for potential use
export default pngModules