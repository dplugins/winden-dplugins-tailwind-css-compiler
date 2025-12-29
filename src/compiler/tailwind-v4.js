var r = require("process");
r.versions.node = "1.0.0";

const path = require("path");
const postcss = require("postcss");
const postcssImport = require("postcss-import");

import tailwindTheme from 'inline:../../node_modules/tailwindcss/theme.css';
import tailwindPreflight from 'inline:../../node_modules/tailwindcss/preflight.css';
import tailwindUtilities from 'inline:../../node_modules/tailwindcss/utilities.css';
import tailwindIndex from 'inline:../../node_modules/tailwindcss/index.css';

const tailwindcss = {
    '/tailwindcss/theme.css': tailwindTheme,
    '/tailwindcss/preflight.css': tailwindPreflight,
    '/tailwindcss/utilities.css': tailwindUtilities,
    '/tailwindcss/index.css': tailwindIndex,
};

export async function bundleCSS(customCss) {
    const cssPath = '/';
    const tailwindcssFiles = {
        [cssPath]: customCss,
        ...tailwindcss
    };

    // Process CSS imports (autoprefixer is applied later in tailwindify())
    const processor = postcss()
        .use(postcssImport({
            filter: () => true,
            async resolve(id, basedir) {
                // Handle tailwindcss imports directly - always resolve to root /tailwindcss/ path
                // This prevents issues when running from subdirectories like /test/
                if (id.startsWith('tailwindcss/') || id === 'tailwindcss') {
                    let tailwindPath;
                    if (id === 'tailwindcss') {
                        tailwindPath = '/tailwindcss/index.css';
                    } else if (id.endsWith('.css')) {
                        tailwindPath = '/' + id;
                    } else {
                        tailwindPath = '/' + id + '.css';
                    }
                    if (tailwindcssFiles[tailwindPath]) {
                        return tailwindPath;
                    }
                }

                let _path = path.resolve(basedir, id);

                if (tailwindcssFiles[_path]) {
                    return _path;
                }

                if (!id.endsWith('.css')) {
                    id = id.concat('/index.css')
                }

                _path = path.join(basedir, id);

                if (tailwindcssFiles[_path]) {
                    return _path;
                }
            },
            load(file) {
                if (tailwindcssFiles[file]) {
                    return tailwindcssFiles[file];
                }

                // Handle tailwindcss files that might have been resolved with different paths
                const tailwindMatch = file.match(/\/tailwindcss\/(preflight|theme|utilities|index)\.css$/);
                if (tailwindMatch) {
                    const normalizedPath = '/tailwindcss/' + tailwindMatch[1] + '.css';
                    if (tailwindcssFiles[normalizedPath]) {
                        return tailwindcssFiles[normalizedPath];
                    }
                }

                // Return empty string to prevent network fetch for unknown files
                return '';
            }
        }));

    const result = await processor.process(tailwindcssFiles[cssPath], {
        from: cssPath
    });

    return result.css;
}
window.tailwindV4BundleCSS = bundleCSS;