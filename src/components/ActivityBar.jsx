import React from 'react';
import { useTranslation } from '../context/I18nContext.jsx';

export default function ActivityBar({
    activeWorkspace,
    changeWorkspace,
    sidebarCollapsed,
    toggleSidebar,
    sidebarTab,
    setSidebarTab,
    openSettings
}) {
    const { t } = useTranslation();

    const workspaces = [
        { id: 'ide', icon: 'fa-laptop-code', titleKey: 'workspace_ide' },
        { id: 'logic', icon: 'fa-microchip', titleKey: 'workspace_logic' },
        { id: 'circuit', icon: 'fa-bolt', titleKey: 'workspace_circuit' }
    ];

    return (
        <div className="activity-bar-hover-zone">
            <div className="activity-bar d-flex flex-column align-items-center py-2 h-100" style={{ background: '#1e1e1e', width: '48px', borderRight: '1px solid #2b2b2b' }}>
                
                {/* Workspaces */}
                {workspaces.map(ws => (
                    <div
                        key={ws.id}
                        className={`activity-icon my-2 ${activeWorkspace === ws.id ? 'active' : ''}`}
                        onClick={() => changeWorkspace(ws.id)}
                        title={t(ws.titleKey)}
                    >
                        <i className={`fa-solid ${ws.icon}`}></i>
                    </div>
                ))}

                <div className="border-bottom border-secondary w-50 my-2" style={{ opacity: 0.3 }}></div>

                {/* IDE Specific Tools */}
                {activeWorkspace === 'ide' && (
                    <>
                        <div
                            className={`activity-icon my-2 ${sidebarTab === 'explorer' && !sidebarCollapsed ? 'active' : ''}`}
                            onClick={() => setSidebarTab('explorer')}
                            title={t("explorer")}
                        >
                            <i className="fa-regular fa-file-code"></i>
                        </div>
                        <div
                            className={`activity-icon my-2 ${sidebarTab === 'extensions' && !sidebarCollapsed ? 'active' : ''}`}
                            onClick={() => setSidebarTab('extensions')}
                            title={t("extensions")}
                        >
                            <i className="fa-solid fa-puzzle-piece"></i>
                        </div>
                    </>
                )}

                <div className="mt-auto activity-icon mb-2" onClick={toggleSidebar} title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
                    <i className={`fa-solid ${sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
                </div>
                
                <div className="activity-icon mb-2" onClick={openSettings} title={t("settings")}>
                    <i className="fa-solid fa-gear"></i>
                </div>
            </div>
        </div>
    );
}
