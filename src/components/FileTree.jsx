import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/I18nContext.jsx';
import { useFileSystem } from '../context/FileSystemContext.jsx';

export default function FileTree({
    parentId,
    openTabs,
    currentFileId,
    handleOpenFile,
    triggerPrompt,
    triggerConfirm
}) {
    const { t } = useTranslation();
    const { nodes, toggleFolder, deleteNode, renameNode, moveNode } = useFileSystem();

    // Context Menu State
    const [contextMenu, setContextMenu] = useState(null); // { x, y, nodeId, type }
    const contextRef = useRef(null);

    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, []);

    const parentNode = nodes[parentId];
    if (!parentNode || !parentNode.children) return null;

    // Sort: Folders first, then files alphabetically
    const children = [...parentNode.children].sort((a, b) => {
        const nodeA = nodes[a];
        const nodeB = nodes[b];
        if (!nodeA || !nodeB) return 0;
        if (nodeA.type === nodeB.type) return nodeA.name.localeCompare(nodeB.name);
        return nodeA.type === 'folder' ? -1 : 1;
    });

    const getFileIconClass = (filename) => {
        if (filename.endsWith('.html')) return 'fa-brands fa-html5 icon-html';
        if (filename.endsWith('.css')) return 'fa-brands fa-css3-alt icon-css';
        if (filename.endsWith('.js')) return 'fa-brands fa-js icon-js';
        return 'fa-solid fa-file-code';
    };

    const handleNodeContextMenu = (e, childId, type) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            nodeId: childId,
            type: type
        });
    };

    const handleRename = (nodeId) => {
        const node = nodes[nodeId];
        if (!node) return;
        triggerPrompt('Enter new name:', node.name, (newName) => {
            if (newName && newName !== '' && newName !== node.name) {
                const success = renameNode(nodeId, newName);
                if (!success) {
                    triggerConfirm('Error', 'Name already exists in this folder!', () => {});
                }
            }
        });
    };

    const handleDelete = (nodeId) => {
        const node = nodes[nodeId];
        if (!node) return;
        triggerConfirm('Delete Warning', `Are you sure you want to delete '${node.name}'?`, (confirmed) => {
            if (confirmed) {
                deleteNode(nodeId);
            }
        });
    };

    // Drag and Drop
    const handleDragStart = (e, id) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        e.stopPropagation();
    };

    const handleDragOver = (e, id) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
        e.stopPropagation();
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
        e.stopPropagation();
    };

    const handleDrop = (e, targetId) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over');
        
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId && draggedId !== targetId) {
            moveNode(draggedId, targetId);
        }
    };

    return (
        <div className="tree-node-container" style={{ userSelect: 'none' }}>
            {children.map(childId => {
                const node = nodes[childId];
                if (!node) return null;

                const isFolder = node.type === 'folder';
                const isActive = (childId === currentFileId && !isFolder);
                const isOpenedFolder = isFolder && node.isOpen;

                // Icons
                let chevron = null;
                let folderIcon = null;
                if (isFolder) {
                    chevron = isOpenedFolder ? (
                        <i className="fa-solid fa-chevron-down fa-xs me-1 opacity-50"></i>
                    ) : (
                        <i className="fa-solid fa-chevron-right fa-xs me-1 opacity-50"></i>
                    );
                    folderIcon = isOpenedFolder ? (
                        <i className="fa-regular fa-folder-open icon-folder"></i>
                    ) : (
                        <i className="fa-solid fa-folder icon-folder"></i>
                    );
                }

                return (
                    <div key={childId} className="tree-node">
                        <div
                            className={`${isFolder ? 'folder-item' : 'file-item'} ${isActive ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isFolder) {
                                    toggleFolder(childId);
                                } else {
                                    handleOpenFile(childId);
                                }
                            }}
                            onContextMenu={(e) => handleNodeContextMenu(e, childId, node.type)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, childId)}
                            onDragOver={(e) => handleDragOver(e, childId)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, childId)}
                        >
                            {chevron}
                            {isFolder ? folderIcon : <i className={getFileIconClass(node.name)}></i>}
                            <span>{node.name}</span>
                        </div>

                        {isFolder && isOpenedFolder && (
                            <div className="folder-children">
                                <FileTree
                                    parentId={childId}
                                    openTabs={openTabs}
                                    currentFileId={currentFileId}
                                    handleOpenFile={handleOpenFile}
                                    triggerPrompt={triggerPrompt}
                                    triggerConfirm={triggerConfirm}
                                />
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Context Menu Viewport Mounting */}
            {contextMenu && (
                <div
                    ref={contextRef}
                    className="context-menu"
                    style={{
                        display: 'block',
                        left: contextMenu.x + 'px',
                        top: contextMenu.y + 'px',
                        position: 'fixed'
                    }}
                >
                    {contextMenu.type === 'file' && (
                        <div className="context-menu-item" onClick={() => handleOpenFile(contextMenu.nodeId)}>
                            <i className="fa-solid fa-eye text-info"></i> <span>Open File</span>
                        </div>
                    )}
                    <div className="context-menu-item" onClick={() => handleRename(contextMenu.nodeId)}>
                        <i className="fa-solid fa-pen text-primary"></i> <span>{t("rename")}</span>
                    </div>
                    <div className="context-menu-item text-danger" onClick={() => handleDelete(contextMenu.nodeId)}>
                        <i className="fa-solid fa-trash"></i> <span>{t("delete")}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
