// Virtual File System Management using Node Graph
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

class FileSystem {
    constructor() {
        this.nodes = {
            'root': { id: 'root', type: 'folder', name: 'Project', isOpen: true, children: ['f1', 'dir1'] },
            'f1': { id: 'f1', type: 'file', name: 'index.html', content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>App</title>\n  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">\n  <link rel="stylesheet" href="assets/css/style.css">\n</head>\n<body>\n  <div class="container mt-5 text-center">\n    <h1 class="text-primary mb-4">Professional IDE</h1>\n    <button class="btn btn-success px-4 py-2" id="myBtn">Click Me</button>\n  </div>\n  <script src="assets/js/script.js"><` + `/script>\n</body>\n</html>`, parent: 'root' },
            'dir1': { id: 'dir1', type: 'folder', name: 'assets', isOpen: true, children: ['dir2', 'dir3'], parent: 'root' },
            'dir2': { id: 'dir2', type: 'folder', name: 'css', isOpen: true, children: ['f2'], parent: 'dir1' },
            'f2': { id: 'f2', type: 'file', name: 'style.css', content: `body {\n  background-color: #f8f9fa;\n}`, parent: 'dir2' },
            'dir3': { id: 'dir3', type: 'folder', name: 'js', isOpen: true, children: ['f3'], parent: 'dir1' },
            'f3': { id: 'f3', type: 'file', name: 'script.js', content: `document.getElementById('myBtn').addEventListener('click', function() {\n  alert('Explorer is working perfectly!');\n});`, parent: 'dir3' }
        };
    }

    getNode(id) {
        return this.nodes[id];
    }

    saveFile(id, content) {
        if (this.nodes[id] && this.nodes[id].type === 'file') {
            this.nodes[id].content = content;
        }
    }

    createNode(parentId, name, type) {
        const parent = this.nodes[parentId];
        if (!parent || parent.type !== 'folder') return null;

        // Check if exists
        for (let childId of parent.children) {
            if (this.nodes[childId].name === name) return null;
        }

        const id = generateId();
        this.nodes[id] = {
            id, type, name, parent: parentId,
            content: type === 'file' ? '' : undefined,
            children: type === 'folder' ? [] : undefined,
            isOpen: type === 'folder' ? true : undefined
        };
        parent.children.push(id);
        parent.isOpen = true; // Auto open parent
        return id;
    }

    deleteNode(id) {
        if (id === 'root') return false;
        const node = this.nodes[id];
        if (!node) return false;

        // Recursively delete
        if (node.type === 'folder') {
            [...node.children].forEach(childId => this.deleteNode(childId));
        }
        
        // Remove from parent
        const parent = this.nodes[node.parent];
        if (parent) {
            parent.children = parent.children.filter(cid => cid !== id);
        }
        delete this.nodes[id];
        return true;
    }

    renameNode(id, newName) {
        if (id === 'root') return false;
        const node = this.nodes[id];
        const parent = this.nodes[node.parent];
        
        // Check conflict
        for (let childId of parent.children) {
            if (childId !== id && this.nodes[childId].name === newName) return false;
        }
        node.name = newName;
        return true;
    }

    moveNode(id, newParentId) {
        if (id === 'root' || id === newParentId) return false;
        const node = this.nodes[id];
        let newParent = this.nodes[newParentId];
        
        // If dropped on a file, use its parent folder instead
        if (newParent && newParent.type === 'file') {
            newParentId = newParent.parent;
            newParent = this.nodes[newParentId];
        }

        if (!node || !newParent || newParent.type !== 'folder') return false;

        // Prevent circular moves (moving a folder into its own descendant)
        let current = newParentId;
        while(current !== 'root' && this.nodes[current]) {
            if (current === id) return false;
            current = this.nodes[current].parent;
        }

        // Prevent name conflict in the new parent folder
        for (let childId of newParent.children) {
            if (this.nodes[childId].name === node.name) return false; 
        }

        // Remove from old parent
        const oldParent = this.nodes[node.parent];
        if (oldParent) {
            oldParent.children = oldParent.children.filter(cid => cid !== id);
        }

        // Add to new parent
        newParent.children.push(id);
        node.parent = newParentId;
        return true;
    }

    toggleFolder(id) {
        if (this.nodes[id] && this.nodes[id].type === 'folder') {
            this.nodes[id].isOpen = !this.nodes[id].isOpen;
        }
    }

    getFullPath(id) {
        if (!this.nodes[id]) return '';
        let path = this.nodes[id].name;
        let current = this.nodes[id].parent;
        while(current !== 'root' && this.nodes[current]) {
            path = this.nodes[current].name + '/' + path;
            current = this.nodes[current].parent;
        }
        return path;
    }

    getAllFiles() {
        const files = [];
        for (let id in this.nodes) {
            if (this.nodes[id].type === 'file') {
                files.push({
                    id: id,
                    path: this.getFullPath(id),
                    content: this.nodes[id].content
                });
            }
        }
        return files;
    }

    exportJSON() {
        return {
            nodes: this.nodes,
            nextId: this.nextId
        };
    }

    importJSON(data) {
        if (data && data.nodes && data.nextId) {
            this.nodes = data.nodes;
            this.nextId = data.nextId;
            return true;
        }
        return false;
    }
}

const vfs = new FileSystem();
