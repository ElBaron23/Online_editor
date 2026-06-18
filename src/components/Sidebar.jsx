import React from 'react';
import { useTranslation } from '../context/I18nContext.jsx';
import { useFileSystem } from '../context/FileSystemContext.jsx';
import FileTree from './FileTree.jsx';

const EXTENSIONS_LIST = [
    { id: 'live-preview', title: 'Live Preview', desc: 'Split screen HTML preview', icon: 'fa-eye' },
    { id: 'console', title: 'Developer Console', desc: 'Built-in console for JS logs', icon: 'fa-terminal' },
    { id: 'formatter', title: 'Code Formatter', desc: 'Format messy code (Prettier)', icon: 'fa-wand-magic-sparkles' },
    { id: 'linter', title: 'Live Code Linter', desc: 'Real-time syntax checking (Red squiggles)', icon: 'fa-spell-check' },
    { id: 'color-picker', title: 'Smart Color Picker', desc: 'Visual color editor for CSS', icon: 'fa-palette' }
];

export default function Sidebar({
    collapsed,
    activeTab,
    enabledExtensions,
    toggleExtension,
    openTabs,
    currentFileId,
    handleOpenFile,
    triggerPrompt,
    triggerConfirm
}) {
    const { t, language } = useTranslation();
    const { createNode, exportJSON, exportZIP } = useFileSystem();

    const handleNewFile = () => {
        triggerPrompt('Enter new file name with extension (e.g. style.css):', '', (name) => {
            if (name && name !== '') {
                const id = createNode('root', name, 'file');
                if (id) {
                    handleOpenFile(id);
                } else {
                    triggerConfirm('Error', 'File already exists in this folder!', () => {});
                }
            }
        });
    };

    const handleNewFolder = () => {
        triggerPrompt('Enter new folder name:', '', (name) => {
            if (name && name !== '') {
                const id = createNode('root', name, 'folder');
                if (!id) {
                    triggerConfirm('Error', 'Folder already exists!', () => {});
                }
            }
        });
    };

    return (
        <aside className={`sidebar d-flex flex-column ${collapsed ? 'collapsed' : ''}`} style={{ background: '#181818', borderRight: '1px solid #2b2b2b' }}>
            
            {/* Explorer Panel */}
            {activeTab === 'explorer' && (
                <div id="explorer-view" className="view-panel active h-100 d-flex flex-column">
                    <div className="px-3 pb-3 pt-3 border-bottom border-secondary border-opacity-25">
                        <button className="btn glass-btn w-100 mb-2 d-flex align-items-center justify-content-center" onClick={() => {}}>
                            <i className="fa-solid fa-play me-2"></i> <span>{t("run_project")}</span>
                        </button>
                    </div>

                    <div id="explorer-container" className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                        <div className="explorer-header d-flex justify-content-between align-items-center px-3 py-2">
                            <div className="explorer-title"><i className="fa-solid fa-folder-tree me-2"></i><span>{t("explorer")}</span></div>
                            <div className="explorer-actions">
                                <i className="fa-solid fa-floppy-disk action-icon" onClick={exportJSON} title="Save FormaTek Project (.fmtk)"></i>
                                <i className="fa-solid fa-file-zipper action-icon" onClick={exportZIP} title={t("download_project")}></i>
                                <div className="border-start border-secondary opacity-50 mx-1 d-inline-block" style={{ height: '14px' }}></div>
                                <i className="fa-solid fa-file-circle-plus action-icon" onClick={handleNewFile} title={t("new_file")}></i>
                                <i className="fa-solid fa-folder-plus action-icon" onClick={handleNewFolder} title={t("new_folder")}></i>
                            </div>
                        </div>

                        {/* File Tree */}
                        <div id="file-tree" className="flex-grow-1 overflow-auto px-3 pb-3">
                            <FileTree
                                parentId="root"
                                openTabs={openTabs}
                                currentFileId={currentFileId}
                                handleOpenFile={handleOpenFile}
                                triggerPrompt={triggerPrompt}
                                triggerConfirm={triggerConfirm}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Extensions Panel */}
            {activeTab === 'extensions' && (
                <div id="extensions-view" className="view-panel active h-100 d-flex flex-column">
                    <div className="explorer-header px-4 pt-3 mb-3">
                        <div className="explorer-title text-uppercase"><i className="fa-solid fa-puzzle-piece me-1"></i> {t("extensions")}</div>
                    </div>
                    <div className="extensions-list flex-grow-1 overflow-auto px-3 pb-3" id="extensions-container">
                        {EXTENSIONS_LIST.map(ext => {
                            const isInstalled = enabledExtensions.includes(ext.id);
                            
                            // Translation mapping
                            const title = t(ext.id);
                            const desc = t(ext.id + "_desc");
                            
                            // Button translation based on lang
                            let btnText = "Enable";
                            if (isInstalled) {
                                btnText = language === 'ar' ? 'إزالة' : language === 'fr' ? 'Désinstaller' : 'Disable';
                            } else {
                                btnText = language === 'ar' ? 'تثبيت' : language === 'fr' ? 'Installer' : 'Enable';
                            }

                            return (
                                <div key={ext.id} className="extension-card d-flex align-items-center gap-3">
                                    <div className="extension-icon"><i className={`fa-solid ${ext.icon}`}></i></div>
                                    <div className="flex-grow-1">
                                        <div className="extension-title">{title}</div>
                                        <div className="extension-desc">{desc}</div>
                                    </div>
                                    <button
                                        className={`btn btn-sm ${isInstalled ? 'btn-outline-danger' : 'btn-success'} btn-install`}
                                        onClick={() => toggleExtension(ext.id)}
                                    >
                                        {btnText}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </aside>
    );
}
