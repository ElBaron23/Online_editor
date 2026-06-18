import React, { useEffect, useRef } from 'react';
import { useTranslation } from '../context/I18nContext.jsx';

export default function ConsolePanel({ logs, height, onClose, clearConsole, setHeight }) {
    const { t } = useTranslation();
    const outputRef = useRef(null);

    // Auto scroll console logs to bottom
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div
            id="console-panel"
            className="glass-panel console-panel d-flex flex-column"
            style={{
                height: `${height}px`,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                position: 'relative'
            }}
        >
            {/* Top Resize Handle */}
            <div
                style={{
                    height: '4px',
                    width: '100%',
                    cursor: 'row-resize',
                    position: 'absolute',
                    top: '-2px',
                    left: 0,
                    zIndex: 20
                }}
                onMouseDown={(e) => {
                    const startY = e.clientY;
                    const startHeight = height;
                    const onMouseMove = (moveEvent) => {
                        const dy = moveEvent.clientY - startY;
                        setHeight(Math.max(80, Math.min(600, startHeight - dy)));
                    };
                    const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                }}
            />

            {/* Header */}
            <div className="panel-header d-flex justify-content-between align-items-center px-3 py-2 border-bottom border-secondary border-opacity-25 bg-dark bg-opacity-50">
                <div className="text-light fs-6 fw-semibold">
                    <i className="fa-solid fa-terminal me-2 text-warning"></i>
                    <span>{t("dev_console")}</span>
                </div>
                <div>
                    <button className="btn btn-sm text-light opacity-50 hover-white me-2" onClick={clearConsole} title={t("clear_console")}>
                        <i className="fa-solid fa-ban"></i>
                    </button>
                    <button className="btn btn-sm text-light opacity-50 hover-white" onClick={onClose} title={t("close_panel")}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>

            {/* Output log rows */}
            <div
                ref={outputRef}
                id="console-output"
                className="console-output flex-grow-1 overflow-auto p-3"
                style={{ fontFamily: "'Consolas', monospace", fontSize: '13.5px' }}
            >
                {logs.map((log, idx) => (
                    <div key={idx} className={`console-line ${log.type}`}>
                        <span className="opacity-50 me-2">[{new Date().toLocaleTimeString()}]</span>
                        <span>{log.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
