import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/I18nContext.jsx';
import { useFileSystem } from '../context/FileSystemContext.jsx';

export default function TopMenuBar({
    currentFileId,
    openSettings,
    triggerPrompt,
    triggerConfirm,
    handleOpenFile,
    handleCloseTab,
    enabledExtensions,
    formatCode,
    togglePreview,
    toggleConsole,
    clearConsole,
    toggleSidebar
}) {
    const { t } = useTranslation();
    const { createNode, exportJSON, exportZIP } = useFileSystem();
    const [openDropdown, setOpenDropdown] = useState(null); // 'file', 'edit', 'view', 'run', 'terminal'
    const menuRef = useRef(null);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = (name) => {
        setOpenDropdown(prev => prev === name ? null : name);
    };

    const handleNewFile = () => {
        setOpenDropdown(null);
        triggerPrompt('Enter new file name with extension (e.g. style.css):', '', (name) => {
            if (name && name !== '') {
                const targetParent = 'root'; // Default to root or selected node
                const id = createNode(targetParent, name, 'file');
                if (id) {
                    handleOpenFile(id);
                } else {
                    triggerConfirm('Error', 'File already exists in this folder!', () => {});
                }
            }
        });
    };

    const handleNewFolder = () => {
        setOpenDropdown(null);
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
        <div ref={menuRef} className="top-menu-bar d-flex align-items-center px-3 position-relative" style={{ height: '35px', background: '#181818', borderBottom: '1px solid #2b2b2b', zIndex: 1050 }}>
            <div className="menu-brand me-4 d-flex align-items-center">
                <i
                    className="fa-solid fa-bars text-light opacity-50 hover-white me-3 cursor-pointer"
                    onClick={toggleSidebar}
                    title="Toggle Sidebar"
                    style={{ fontSize: '14px', transition: '0.2s' }}
                ></i>
                <span className="text-light fw-bold ms-2" style={{ fontSize: '14px', letterSpacing: '0.5px' }}>FormaTech</span>
            </div>
            
            <div className="menu-items d-flex gap-3 text-light opacity-75" style={{ fontSize: '13px', userSelect: 'none' }}>
                
                {/* File Menu */}
                <div className="dropdown position-relative">
                    <div className="menu-item cursor-pointer hover-white px-2 py-1 rounded" onClick={() => toggleDropdown('file')}>
                        File
                    </div>
                    {openDropdown === 'file' && (
                        <ul className="dropdown-menu dropdown-menu-dark show shadow border-secondary border-opacity-25" style={{ position: 'absolute', top: '25px', left: '0', fontSize: '13px', zIndex: 1100 }}>
                            <li>
                                <a className="dropdown-item cursor-pointer" onClick={handleNewFile}>
                                    <i className="fa-solid fa-file-circle-plus me-2"></i><span>{t("new_file")}</span>
                                </a>
                            </li>
                            <li>
                                <a className="dropdown-item cursor-pointer" onClick={handleNewFolder}>
                                    <i className="fa-solid fa-folder-plus me-2"></i><span>{t("new_folder")}</span>
                                </a>
                            </li>
                            <li><hr className="dropdown-divider border-secondary border-opacity-25" /></li>
                            <li>
                                <a className="dropdown-item cursor-pointer" onClick={() => { setOpenDropdown(null); exportJSON(); }}>
                                    <i className="fa-solid fa-floppy-disk me-2"></i><span>Save Project (.fmtk)</span>
                                </a>
                            </li>
                            <li>
                                <a className="dropdown-item cursor-pointer" onClick={() => { setOpenDropdown(null); exportZIP(); }}>
                                    <i className="fa-solid fa-file-zipper me-2"></i><span>{t("download_project")}</span>
                                </a>
                            </li>
                        </ul>
                    )}
                </div>

                {/* Edit Menu */}
                <div className="dropdown position-relative">
                    <div className="menu-item cursor-pointer hover-white px-2 py-1 rounded" onClick={() => toggleDropdown('edit')}>
                        Edit
                    </div>
                    {openDropdown === 'edit' && (
                        <ul className="dropdown-menu dropdown-menu-dark show shadow border-secondary border-opacity-25" style={{ position: 'absolute', top: '25px', left: '0', fontSize: '13px', zIndex: 1100 }}>
                            <li>
                                <a className={`dropdown-item cursor-pointer ${!enabledExtensions.includes('formatter') ? 'disabled opacity-50' : ''}`} onClick={() => { setOpenDropdown(null); formatCode(); }}>
                                    <i className="fa-solid fa-code me-2"></i><span>{t("format_code")}</span>
                                </a>
                            </li>
                            <li><hr className="dropdown-divider border-secondary border-opacity-25" /></li>
                            <li>
                                <a className="dropdown-item cursor-pointer" onClick={() => { setOpenDropdown(null); openSettings(); }}>
                                    <i className="fa-solid fa-gear me-2"></i><span>{t("settings")}</span>
                                </a>
                            </li>
                        </ul>
                    )}
                </div>

                {/* View Menu */}
                <div className="dropdown position-relative">
                    <div className="menu-item cursor-pointer hover-white px-2 py-1 rounded" onClick={() => toggleDropdown('view')}>
                        View
                    </div>
                    {openDropdown === 'view' && (
                        <ul className="dropdown-menu dropdown-menu-dark show shadow border-secondary border-opacity-25" style={{ position: 'absolute', top: '25px', left: '0', fontSize: '13px', zIndex: 1100 }}>
                            <li>
                                <a className="dropdown-item cursor-pointer" onClick={() => { setOpenDropdown(null); }}>
                                    <i className="fa-regular fa-file-code me-2"></i><span>{t("explorer")}</span>
                                </a>
                            </li>
                            <li>
                                <a className="dropdown-item cursor-pointer" onClick={() => { setOpenDropdown(null); }}>
                                    <i className="fa-solid fa-puzzle-piece me-2"></i><span>{t("extensions")}</span>
                                </a>
                            </li>
                            <li><hr className="dropdown-divider border-secondary border-opacity-25" /></li>
                            <li>
                                <a className={`dropdown-item cursor-pointer ${!enabledExtensions.includes('live-preview') ? 'disabled opacity-50' : ''}`} onClick={() => { setOpenDropdown(null); togglePreview(); }}>
                                    <i className="fa-solid fa-eye me-2"></i><span>{t("live_preview")}</span>
                                </a>
                            </li>
                        </ul>
                    )}
                </div>

                {/* Run Menu */}
                <div className="dropdown position-relative">
                    <div className="menu-item cursor-pointer hover-white px-2 py-1 rounded" onClick={() => toggleDropdown('run')}>
                        Run
                    </div>
                    {openDropdown === 'run' && (
                        <ul className="dropdown-menu dropdown-menu-dark show shadow border-secondary border-opacity-25" style={{ position: 'absolute', top: '25px', left: '0', fontSize: '13px', zIndex: 1100 }}>
                            <li>
                                <a className="dropdown-item cursor-pointer" onClick={() => { setOpenDropdown(null); togglePreview(); }}>
                                    <i className="fa-solid fa-play me-2"></i><span>{t("run_project")}</span>
                                </a>
                            </li>
                        </ul>
                    )}
                </div>

                {/* Terminal Menu */}
                <div className="dropdown position-relative">
                    <div className="menu-item cursor-pointer hover-white px-2 py-1 rounded" onClick={() => toggleDropdown('terminal')}>
                        Terminal
                    </div>
                    {openDropdown === 'terminal' && (
                        <ul className="dropdown-menu dropdown-menu-dark show shadow border-secondary border-opacity-25" style={{ position: 'absolute', top: '25px', left: '0', fontSize: '13px', zIndex: 1100 }}>
                            <li>
                                <a className={`dropdown-item cursor-pointer ${!enabledExtensions.includes('console') ? 'disabled opacity-50' : ''}`} onClick={() => { setOpenDropdown(null); toggleConsole(); }}>
                                    <i className="fa-solid fa-terminal me-2"></i><span>{t("dev_console")}</span>
                                </a>
                            </li>
                            <li>
                                <a className="dropdown-item cursor-pointer" onClick={() => { setOpenDropdown(null); clearConsole(); }}>
                                    <i className="fa-solid fa-ban me-2"></i><span>{t("clear_console")}</span>
                                </a>
                            </li>
                        </ul>
                    )}
                </div>

            </div>
        </div>
    );
}
