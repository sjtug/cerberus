import { Options } from 'imagemin-gifsicle';
import { Options as Options$6 } from 'imagemin-svgo';
import { Options as Options$1 } from 'imagemin-mozjpeg';
import { Options as Options$2 } from 'imagemin-optipng';
import { Options as Options$3 } from 'imagemin-pngquant';
import { Options as Options$4 } from 'imagemin-webp';
import { Options as Options$5 } from 'imagemin-jpegtran';

declare type EnabledOptions<T> = T | false;
interface SvgOption extends Options$6 {
    plugins: any[];
}
interface VitePluginImageMin {
    /**
     * Log compressed files and their compression ratios.
     * @default: true
     */
    verbose?: boolean;
    /**
     * Filter files that do not need to be compressed
     */
    filter?: RegExp | ((file: string) => boolean);
    /**
     * Whether to enable compression
     * @default: false
     */
    disable?: boolean;
    /**
     * gif compression configuration
     * @default: {enabled:true}
     */
    gifsicle?: EnabledOptions<Options>;
    /**
     * svg compression configuration
     * @default: {enabled:true}
     */
    svgo?: EnabledOptions<SvgOption>;
    /**
     * jpeg compression configuration
     * @default: {enabled:false}
     */
    mozjpeg?: EnabledOptions<Options$1>;
    /**
     * png compression configuration
     * @default: {enabled:true}
     */
    optipng?: EnabledOptions<Options$2>;
    /**
     * png compression configuration
     * @default: {enabled:false}
     */
    pngquant?: EnabledOptions<Options$3>;
    /**
     * webp compression configuration
     * @default: {enabled:false}
     */
    webp?: EnabledOptions<Options$4>;
    /**
     * jpeg compression configuration
     * @default: {enabled:true}
     */
    jpegTran?: EnabledOptions<Options$5>;
}

declare function export_default(options?: VitePluginImageMin): any;

export { export_default as default };
