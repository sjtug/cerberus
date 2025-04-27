import path from 'path';

export default {
    entry: "./bootstrap.js",
    output: {
        path: path.resolve(path.dirname(new URL(import.meta.url).pathname), "../dist"),
        filename: "bootstrap.js",
    },
    module: {
        rules: [
            {
                resourceQuery: /raw/,
                type: 'asset/resource',
            }
        ],
    },
    mode: "production",
    experiments: {
        asyncWebAssembly: true,
    },
};
