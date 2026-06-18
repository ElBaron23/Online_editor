import React, { useEffect, useRef } from 'react';
import { useTranslation } from '../context/I18nContext.jsx';
import { useFileSystem } from '../context/FileSystemContext.jsx';

export default function LivePreviewPanel({ width, onClose }) {
    const { t } = useTranslation();
    const { getAllFiles } = useFileSystem();
    const iframeRef = useRef(null);

    const consoleScript = `
    <script>
        const originalConsole = window.console;
        window.console = {
            log: function(...args) { window.parent.postMessage({type: 'console', level: 'log', args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))}, '*'); originalConsole.log(...args); },
            error: function(...args) { window.parent.postMessage({type: 'console', level: 'error', args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))}, '*'); originalConsole.error(...args); },
            warn: function(...args) { window.parent.postMessage({type: 'console', level: 'warn', args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))}, '*'); originalConsole.warn(...args); }
        };
        window.onerror = function(msg, url, line) {
            window.parent.postMessage({type: 'console', level: 'error', args: [\`Error: \${msg} at line \${line}\`]}, '*');
            return false;
        };
        window.addEventListener('click', function() {
            window.parent.postMessage({type: 'click'}, '*');
        });
    <\/script>
    `;

    const buildHtmlContent = (injectConsole = true) => {
        const files = getAllFiles();
        const indexFile = files.find(f => f.path === 'index.html');
        let htmlContent = indexFile ? indexFile.content : '<h1>No index.html found! Create one in the root folder.</h1>';
        
        if (injectConsole) {
            if (htmlContent.includes('<head>')) {
                htmlContent = htmlContent.replace('<head>', () => '<head>' + consoleScript);
            } else {
                htmlContent = consoleScript + htmlContent;
            }
        }

        // Inline CSS link elements
        files.filter(f => f.path.endsWith('.css')).forEach(f => {
            const filename = f.path.split('/').pop();
            const regex = new RegExp(`<link[^>]*href=["'](?:.*?\\/)?${filename.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}["'][^>]*>`, 'i');
            if (regex.test(htmlContent)) {
                htmlContent = htmlContent.replace(regex, () => `<style>\n${f.content}\n</style>`);
            } else {
                if (htmlContent.includes('</head>')) {
                    htmlContent = htmlContent.replace('</head>', () => `<style>\n${f.content}\n</style>\n</head>`);
                } else {
                    htmlContent = `<style>\n${f.content}\n</style>\n` + htmlContent;
                }
            }
        });

        // Inline Script src elements
        files.filter(f => f.path.endsWith('.js')).forEach(f => {
            const filename = f.path.split('/').pop();
            const regex = new RegExp(`<script[^>]*src=["'](?:.*?\\/)?${filename.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}["'][^>]*><\\/script>`, 'i');
            if (regex.test(htmlContent)) {
                htmlContent = htmlContent.replace(regex, () => `<script>\n${f.content}\n</script>`);
            } else {
                if (htmlContent.includes('</body>')) {
                    htmlContent = htmlContent.replace('</body>', () => `<script>\n${f.content}\n</script>\n</body>`);
                } else {
                    htmlContent += `\n<script>\n${f.content}\n</script>`;
                }
            }
        });

        // Inline images as base64 URLs
        files.filter(f => /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(f.path)).forEach(f => {
            const filename = f.path.split('/').pop();
            const escapedPath = filename.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`src=["'](?:.*?\\/)?${escapedPath}["']`, 'gi');
            htmlContent = htmlContent.replace(regex, `src="${f.content}"`);
        });

        return htmlContent;
    };

    const updatePreview = () => {
        if (!iframeRef.current) return;
        iframeRef.current.srcdoc = buildHtmlContent(true);
    };

    useEffect(() => {
        updatePreview();
    }, [getAllFiles]); // Refresh on VFS file change

    return (
        <div id="live-preview-panel" className="glass-panel preview-panel flex-column d-flex" style={{ width: `${width}%`, height: '100%' }}>
            <div className="panel-header d-flex justify-content-between align-items-center px-3 py-2 border-bottom border-secondary border-opacity-25 bg-dark bg-opacity-25">
                <div className="text-light fs-6 fw-semibold">
                    <i className="fa-solid fa-eye me-2 text-info"></i>
                    <span>{t("live_preview")}</span>
                </div>
                <div>
                    <button className="btn btn-sm text-light opacity-50 hover-white me-2" onClick={updatePreview} title="Refresh">
                        <i className="fa-solid fa-rotate-right"></i>
                    </button>
                    <button className="btn btn-sm text-light opacity-50 hover-white" onClick={onClose} title={t("close_panel")}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
            <div className="preview-container flex-grow-1 bg-white position-relative">
                <iframe
                    ref={iframeRef}
                    id="preview-frame"
                    sandbox="allow-scripts allow-modals allow-same-origin"
                    style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }}
                    title="Live Preview"
                ></iframe>
            </div>
        </div>
    );
}
