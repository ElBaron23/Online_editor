import React, { createContext, useContext, useState, useEffect } from 'react';
import JSZip from 'jszip';

const FileSystemContext = createContext(null);

const initialNodes = {
    'root': { id: 'root', type: 'folder', name: 'Project', isOpen: true, children: ['f1', 'dir1'] },
    'f1': { id: 'f1', type: 'file', name: 'index.html', content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>App</title>\n  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">\n  <link rel="stylesheet" href="assets/css/style.css">\n</head>\n<body>\n  <div class="container mt-5 text-center">\n    <h1 class="text-primary mb-4">Professional IDE</h1>\n    <button class="btn btn-success px-4 py-2" id="myBtn">Click Me</button>\n  </div>\n  <script src="assets/js/script.js"><` + `/script>\n</body>\n</html>`, parent: 'root' },
    'dir1': { id: 'dir1', type: 'folder', name: 'assets', isOpen: true, children: ['dir2', 'dir3'], parent: 'root' },
    'dir2': { id: 'dir2', type: 'folder', name: 'css', isOpen: true, children: ['f2'], parent: 'dir1' },
    'f2': { id: 'f2', type: 'file', name: 'style.css', content: `body {\n  background-color: #f8f9fa;\n}`, parent: 'dir2' },
    'dir3': { id: 'dir3', type: 'folder', name: 'js', isOpen: true, children: ['f3'], parent: 'dir1' },
    'f3': { id: 'f3', type: 'file', name: 'script.js', content: `document.getElementById('myBtn').addEventListener('click', function() {\n  alert('Explorer is working perfectly!');\n});`, parent: 'dir3' }
};

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

export function FileSystemProvider({ children }) {
    const [nodes, setNodes] = useState(() => {
        const saved = localStorage.getItem('formatek_vfs');
        return saved ? JSON.parse(saved) : initialNodes;
    });

    useEffect(() => {
        localStorage.setItem('formatek_vfs', JSON.stringify(nodes));
    }, [nodes]);

    const getNode = (id) => nodes[id];

    const saveFile = (id, content) => {
        setNodes(prev => {
            if (!prev[id] || prev[id].type !== 'file') return prev;
            return {
                ...prev,
                [id]: { ...prev[id], content }
            };
        });
    };

    const createNode = (parentId, name, type) => {
        const parent = nodes[parentId];
        if (!parent || parent.type !== 'folder') return null;

        // Check if conflict
        for (let childId of parent.children) {
            if (nodes[childId]?.name === name) return null;
        }

        const id = generateId();
        const newNode = {
            id, type, name, parent: parentId,
            content: type === 'file' ? '' : undefined,
            children: type === 'folder' ? [] : undefined,
            isOpen: type === 'folder' ? true : undefined
        };

        setNodes(prev => {
            const updatedParent = {
                ...prev[parentId],
                children: [...prev[parentId].children, id],
                isOpen: true
            };
            return {
                ...prev,
                [id]: newNode,
                [parentId]: updatedParent
            };
        });

        return id;
    };

    const deleteNode = (id) => {
        if (id === 'root') return false;
        const node = nodes[id];
        if (!node) return false;

        setNodes(prev => {
            const copy = { ...prev };
            
            // Helper for recursive deletion
            const removeRec = (nId) => {
                const n = copy[nId];
                if (!n) return;
                if (n.type === 'folder' && n.children) {
                    n.children.forEach(cid => removeRec(cid));
                }
                delete copy[nId];
            };

            removeRec(id);

            // Remove from parent
            if (node.parent && copy[node.parent]) {
                copy[node.parent] = {
                    ...copy[node.parent],
                    children: copy[node.parent].children.filter(cid => cid !== id)
                };
            }

            return copy;
        });

        return true;
    };

    const renameNode = (id, newName) => {
        if (id === 'root') return false;
        const node = nodes[id];
        if (!node) return false;
        const parent = nodes[node.parent];
        if (!parent) return false;

        // Check conflict
        for (let childId of parent.children) {
            if (childId !== id && nodes[childId]?.name === newName) return false;
        }

        setNodes(prev => ({
            ...prev,
            [id]: { ...prev[id], name: newName }
        }));
        return true;
    };

    const moveNode = (id, newParentId) => {
        if (id === 'root' || id === newParentId) return false;
        const node = nodes[id];
        let newParent = nodes[newParentId];

        // If dropped on a file, use its parent folder instead
        if (newParent && newParent.type === 'file') {
            newParentId = newParent.parent;
            newParent = nodes[newParentId];
        }

        if (!node || !newParent || newParent.type !== 'folder') return false;

        // Prevent circular moves
        let current = newParentId;
        while (current !== 'root' && nodes[current]) {
            if (current === id) return false;
            current = nodes[current].parent;
        }

        // Prevent name conflict
        for (let childId of newParent.children) {
            if (nodes[childId]?.name === node.name) return false;
        }

        setNodes(prev => {
            const oldParentId = node.parent;
            const updatedOldParent = {
                ...prev[oldParentId],
                children: prev[oldParentId].children.filter(cid => cid !== id)
            };
            const updatedNewParent = {
                ...prev[newParentId],
                children: [...prev[newParentId].children, id]
            };
            return {
                ...prev,
                [oldParentId]: updatedOldParent,
                [newParentId]: updatedNewParent,
                [id]: { ...prev[id], parent: newParentId }
            };
        });

        return true;
    };

    const toggleFolder = (id) => {
        setNodes(prev => {
            if (!prev[id] || prev[id].type !== 'folder') return prev;
            return {
                ...prev,
                [id]: { ...prev[id], isOpen: !prev[id].isOpen }
            };
        });
    };

    const getFullPath = (id, currentNodes = nodes) => {
        if (!currentNodes[id]) return '';
        let path = currentNodes[id].name;
        let current = currentNodes[id].parent;
        while (current !== 'root' && currentNodes[current]) {
            path = currentNodes[current].name + '/' + path;
            current = currentNodes[current].parent;
        }
        return path;
    };

    const getAllFiles = (currentNodes = nodes) => {
        const files = [];
        for (let id in currentNodes) {
            if (currentNodes[id].type === 'file') {
                files.push({
                    id: id,
                    path: getFullPath(id, currentNodes),
                    content: currentNodes[id].content
                });
            }
        }
        return files;
    };

    const exportJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(nodes));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "project.fmtk");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    const importJSON = (jsonData) => {
        try {
            const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            if (parsed && typeof parsed === 'object') {
                setNodes(parsed);
                return true;
            }
        } catch (e) {
            console.error("Failed to import JSON project", e);
        }
        return false;
    };

    const exportZIP = async () => {
        const zip = new JSZip();
        const files = getAllFiles();
        files.forEach(file => {
            zip.file(file.path, file.content || "");
        });

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = "project.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <FileSystemContext.Provider value={{
            nodes,
            getNode,
            saveFile,
            createNode,
            deleteNode,
            renameNode,
            moveNode,
            toggleFolder,
            getFullPath,
            getAllFiles,
            exportJSON,
            importJSON,
            exportZIP
        }}>
            {children}
        </FileSystemContext.Provider>
    );
}

export function useFileSystem() {
    return useContext(FileSystemContext);
}
