/**
 * Ambient declarations for non-code imports handled by esbuild loaders:
 * SCSS/CSS are bundled as stylesheets, SVG is inlined as raw text
 * (see configs/esbuild.plugins.js and configs/esbuild.autocomplete.config.js).
 */
declare module '*.scss';
declare module '*.css';
declare module '*.svg' {
    import type { FC, SVGProps } from 'react';
    /** Named export produced by the esbuild SVG plugin (see configs/esbuild.plugins.js) */
    export const ReactComponent: FC<SVGProps<SVGSVGElement>>;
    /** Raw text, used by the class helper's icon registry */
    const content: string;
    export default content;
}
