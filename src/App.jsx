import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from './context/I18nContext.jsx';
import { useFileSystem } from './context/FileSystemContext.jsx';

// Core Components
import TopMenuBar from './components/TopMenuBar.jsx';
import ActivityBar from './components/ActivityBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import EditorPanel from './components/EditorPanel.jsx';
import LivePreviewPanel from './components/LivePreviewPanel.jsx';
import ConsolePanel from './components/ConsolePanel.jsx';
import LogicGatesSimulator from './components/LogicGatesSimulator.jsx';
import CircuitSimulator from './components/CircuitSimulator.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import CommonModals from './components/CommonModals.jsx';

export default function App() {
    const { t } = useTranslation();
    const { nodes, saveFile, createNode, deleteNode, renameNode, moveNode } = useFileSystem();

    // App state
    const [activeWorkspace, setActiveWorkspace] = useState(() => {
        return localStorage.getItem('active_workspace') || 'ide';
    });
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarTab, setSidebarTab] = useState('explorer'); // explorer, extensions
    const [openTabs, setOpenTabs] = useState([]);
    const [currentFileId, setCurrentFileId] = useState(null);
    const [consoleLogs, setConsoleLogs] = useState([]);
    const [unreadErrors, setUnreadErrors] = useState(0);

    // Extensions state
    const [enabledExtensions, setEnabledExtensions] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('formatek_extensions') || '[]');
        } catch {
            return [];
        }
    });

    // Editor settings state
    const [settings, setSettings] = useState(() => {
        return {
            autoSaveMode: localStorage.getItem('formatek_autosave_mode') || 'instant',
            autoSaveDelay: parseInt(localStorage.getItem('formatek_autosave_delay') || '1000'),
            autoComplete: (localStorage.getItem('formatek_autocomplete') || 'on') === 'on',
            autoClose: (localStorage.getItem('formatek_autoclose') || 'on') === 'on'
        };
    });

    // Panels display state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewWidth, setPreviewWidth] = useState(45); // percent
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const [consoleHeight, setConsoleHeight] = useState(150); // pixels

    // Modals visibility state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [promptData, setPromptData] = useState(null); // { title, defaultValue, callback }
    const [confirmData, setConfirmData] = useState(null); // { title, message, callback }

    // Toggle Sidebar
    const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

    // Active workspace change
    const changeWorkspace = (ws) => {
        setActiveWorkspace(ws);
        localStorage.setItem('active_workspace', ws);
    };

    // Toggle Extension
    const toggleExtension = (extId) => {
        let updated;
        if (enabledExtensions.includes(extId)) {
            updated = enabledExtensions.filter(id => id !== extId);
        } else {
            updated = [...enabledExtensions, extId];
        }
        setEnabledExtensions(updated);
        localStorage.setItem('formatek_extensions', JSON.stringify(updated));

        // Auto close preview or console if extension is disabled
        if (extId === 'live-preview' && !updated.includes('live-preview')) {
            setIsPreviewOpen(false);
        }
        if (extId === 'console' && !updated.includes('console')) {
            setIsConsoleOpen(false);
        }
    };

    // Open/Close tabs helper
    const handleOpenFile = (id) => {
        if (!openTabs.includes(id)) {
            setOpenTabs(prev => [...prev, id]);
        }
        setCurrentFileId(id);
    };

    const handleCloseTab = (id) => {
        const nextTabs = openTabs.filter(tid => tid !== id);
        setOpenTabs(nextTabs);
        if (currentFileId === id) {
            if (nextTabs.length > 0) {
                setCurrentFileId(nextTabs[nextTabs.length - 1]);
            } else {
                setCurrentFileId(null);
            }
        }
    };

    const handleAddConsoleLog = (type, text) => {
        setConsoleLogs(prev => [...prev, { type, text }]);
        if (type === 'error') {
            setUnreadErrors(prev => prev + 1);
        }
    };

    const handleClearConsole = () => {
        setConsoleLogs([]);
        setUnreadErrors(0);
    };

    // Global custom prompts and confirms
    const triggerPrompt = (title, defaultValue, callback) => {
        setPromptData({ title, defaultValue, callback });
    };

    const triggerConfirm = (title, message, callback) => {
        setConfirmData({ title, message, callback });
    };

    // Handle format code
    const handleFormatCode = async () => {
        if (!currentFileId || !nodes[currentFileId]) return;
        const fileNode = nodes[currentFileId];
        let val = fileNode.content || '';
        
        // Dynamic imports for beautify to avoid heavy initial bundle
        const { default: beautify } = await import('js-beautify');
        
        if (fileNode.name.endsWith('.html')) {
            val = beautify.html(val, { indent_size: 4 });
        } else if (fileNode.name.endsWith('.css')) {
            val = beautify.css(val, { indent_size: 4 });
        } else if (fileNode.name.endsWith('.js')) {
            val = beautify.js(val, { indent_size: 4 });
        }

        saveFile(currentFileId, val);
    };

    return (
        <div className="glass-theme app-container d-flex flex-column h-100">
            {/* Top Menu Bar */}
            <TopMenuBar
                currentFileId={currentFileId}
                openSettings={() => setIsSettingsOpen(true)}
                triggerPrompt={triggerPrompt}
                triggerConfirm={triggerConfirm}
                handleOpenFile={handleOpenFile}
                handleCloseTab={handleCloseTab}
                enabledExtensions={enabledExtensions}
                formatCode={handleFormatCode}
                togglePreview={() => setIsPreviewOpen(prev => !prev)}
                toggleConsole={() => setIsConsoleOpen(prev => !prev)}
                clearConsole={handleClearConsole}
                toggleSidebar={toggleSidebar}
            />

            {/* Main Body Area */}
            <div className="d-flex flex-grow-1 overflow-hidden">
                {/* Activity Bar */}
                <ActivityBar
                    activeWorkspace={activeWorkspace}
                    changeWorkspace={changeWorkspace}
                    sidebarCollapsed={sidebarCollapsed}
                    toggleSidebar={toggleSidebar}
                    sidebarTab={sidebarTab}
                    setSidebarTab={(tab) => {
                        setSidebarTab(tab);
                        if (sidebarCollapsed) setSidebarCollapsed(false);
                    }}
                    openSettings={() => setIsSettingsOpen(true)}
                />

                {/* Workspaces Container */}
                <div id="workspaces-container" className="flex-grow-1 d-flex overflow-hidden" style={{ background: '#1e1e1e', height: '100%' }}>
                    
                    {/* Workspace 1: Code IDE */}
                    {activeWorkspace === 'ide' && (
                        <div id="workspace-ide" className="w-100 h-100 d-flex">
                            {/* Sidebar */}
                            <Sidebar
                                collapsed={sidebarCollapsed}
                                activeTab={sidebarTab}
                                enabledExtensions={enabledExtensions}
                                toggleExtension={toggleExtension}
                                openTabs={openTabs}
                                currentFileId={currentFileId}
                                handleOpenFile={handleOpenFile}
                                triggerPrompt={triggerPrompt}
                                triggerConfirm={triggerConfirm}
                            />

                            {/* Editor + Panels */}
                            <main className="workspace-area flex-grow-1 d-flex flex-column bg-dark position-relative">
                                <div className="top-split-area d-flex flex-grow-1 overflow-hidden">
                                    <EditorPanel
                                        currentFileId={currentFileId}
                                        openTabs={openTabs}
                                        handleOpenFile={handleOpenFile}
                                        handleCloseTab={handleCloseTab}
                                        settings={settings}
                                        enabledExtensions={enabledExtensions}
                                        saveFile={saveFile}
                                        width={100 - (isPreviewOpen ? previewWidth : 0)}
                                        addLog={handleAddConsoleLog}
                                    />
                                    
                                    {isPreviewOpen && enabledExtensions.includes('live-preview') && (
                                        <>
                                            <div
                                                className="resizer resizing"
                                                style={{ cursor: 'col-resize', width: '4px' }}
                                                onMouseDown={(e) => {
                                                    const startX = e.clientX;
                                                    const startWidth = previewWidth;
                                                    const onMouseMove = (moveEvent) => {
                                                        const dx = ((moveEvent.clientX - startX) / window.innerWidth) * 100;
                                                        setPreviewWidth(Math.max(10, Math.min(80, startWidth - dx)));
                                                    };
                                                    const onMouseUp = () => {
                                                        document.removeEventListener('mousemove', onMouseMove);
                                                        document.removeEventListener('mouseup', onMouseUp);
                                                    };
                                                    document.addEventListener('mousemove', onMouseMove);
                                                    document.addEventListener('mouseup', onMouseUp);
                                                }}
                                            />
                                            <LivePreviewPanel
                                                width={previewWidth}
                                                onClose={() => setIsPreviewOpen(false)}
                                            />
                                        </>
                                    )}
                                </div>

                                {isConsoleOpen && enabledExtensions.includes('console') && (
                                    <ConsolePanel
                                        logs={consoleLogs}
                                        height={consoleHeight}
                                        onClose={() => setIsConsoleOpen(false)}
                                        clearConsole={handleClearConsole}
                                        setHeight={setConsoleHeight}
                                    />
                                )}
                            </main>
                        </div>
                    )}

                    {/* Workspace 2: Logic Gates */}
                    {activeWorkspace === 'logic' && (
                        <div id="workspace-logic" className="w-100 h-100 d-flex flex-column">
                            <LogicGatesSimulator />
                        </div>
                    )}

                    {/* Workspace 3: Circuits & Arduino */}
                    {activeWorkspace === 'circuit' && (
                        <div id="workspace-circuit" className="w-100 h-100 d-flex flex-column">
                            <CircuitSimulator />
                        </div>
                    )}

                </div>
            </div>

            {/* Status Bar */}
            <div className="status-bar d-flex justify-content-between px-3" style={{ height: '22px', background: '#007acc', alignItems: 'center', fontSize: '12px', color: '#fff' }}>
                <div id="status-left" className="d-flex align-items-center h-100">
                    <i className="fa-solid fa-check me-2" id="status-icon" style={{ fontSize: '11px' }}></i>
                    <span>{t("ready")}</span>
                    
                    {enabledExtensions.includes('console') && (
                        <span
                            id="status-console-toggle"
                            className="ms-4 cursor-pointer hover-opacity-100 d-flex align-items-center h-100"
                            style={{ cursor: 'pointer', opacity: 0.8 }}
                            title="Toggle Console Panel"
                            onClick={() => setIsConsoleOpen(prev => !prev)}
                        >
                            <i className="fa-solid fa-terminal me-1" style={{ fontSize: '11px' }}></i>
                            <span>{t("console")}</span>
                            {unreadErrors > 0 && (
                                <span className="badge bg-danger rounded-pill ms-1" style={{ fontSize: '10px', padding: '2px 5px' }}>{unreadErrors}</span>
                            )}
                        </span>
                    )}
                </div>
                <div id="status-right" className="d-flex align-items-center h-100" style={{ opacity: 0.9, fontWeight: 500, fontFamily: "'Consolas', monospace" }}>
                    {activeWorkspace.toUpperCase()}
                </div>
            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <SettingsModal
                    settings={settings}
                    setSettings={(newSettings) => {
                        setSettings(newSettings);
                        localStorage.setItem('formatek_autosave_mode', newSettings.autoSaveMode);
                        localStorage.setItem('formatek_autosave_delay', newSettings.autoSaveDelay.toString());
                        localStorage.setItem('formatek_autocomplete', newSettings.autoComplete ? 'on' : 'off');
                        localStorage.setItem('formatek_autoclose', newSettings.autoClose ? 'on' : 'off');
                    }}
                    onClose={() => setIsSettingsOpen(false)}
                />
            )}

            {/* Common Dialog Modals */}
            {promptData && (
                <CommonModals.Prompt
                    title={promptData.title}
                    defaultValue={promptData.defaultValue}
                    onConfirm={(val) => {
                        promptData.callback(val);
                        setPromptData(null);
                    }}
                    onClose={() => setPromptData(null)}
                />
            )}

            {confirmData && (
                <CommonModals.Confirm
                    title={confirmData.title}
                    message={confirmData.message}
                    onConfirm={() => {
                        confirmData.callback(true);
                        setConfirmData(null);
                    }}
                    onCancel={() => {
                        confirmData.callback(false);
                        setConfirmData(null);
                    }}
                />
            )}
        </div>
    );
}
