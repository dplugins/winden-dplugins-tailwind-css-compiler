import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { registerPlainJSLanguage } from '@/utils/monacoPlainJS';
import '@/types/global.d.ts';

/**
 * Configure Monaco Environment for web workers (CSS/SCSS only)
 * This setup uses blob URLs to avoid CORS issues
 */
export function setupMonacoEnvironment(): void {
    window.MonacoEnvironment = {
        getWorker: function (workerId: string, label: string) {
            const buildUrl = window.windenData?.buildUrl || '';

            let workerPath: string;
            if (label === 'css' || label === 'scss' || label === 'less') {
                workerPath = 'admin/css.worker.js';
            } else {
                workerPath = 'admin/editor.worker.js';
            }

            const fullUrl = `${buildUrl}${workerPath}`;

            const workerBlob = new Blob([`importScripts('${fullUrl}');`], {
                type: 'application/javascript'
            });
            const workerBlobUrl = URL.createObjectURL(workerBlob);

            return new Worker(workerBlobUrl, {
                name: label
            });
        }
    };
}

/**
 * Initialize Monaco loader with configuration
 */
export function initializeMonaco(): void {
    loader.config({ monaco });
    loader.init().then(registerPlainJSLanguage);
}

/**
 * Full Monaco setup - call once at app initialization
 */
export function setupMonaco(): void {
    setupMonacoEnvironment();
    initializeMonaco();
}
