// IDE Core Logic with Extensions System
document.addEventListener('DOMContentLoaded', () => {
    let currentFileId = null;
    let selectedNodeId = 'root'; 
    let selectedNodeIds = new Set();
    let contextNodeId = null; 
    let openTabs = []; 
    let unreadErrors = 0;
    let currentLanguage = localStorage.getItem('ide_language') || 'en';

    // Apply language immediately
    if (typeof setLanguage === 'function') {
        setLanguage(currentLanguage);
    }

    // --- Extensions System ---
    const isExtEnabled = window.isExtEnabled || (() => false);

    window.applyExtensions = function() {
        // Console Toggle Visibility
        document.getElementById('status-console-toggle').style.display = isExtEnabled('console') ? 'inline-block' : 'none';
        if (!isExtEnabled('console')) document.getElementById('console-panel').style.display = 'none';

        // Context Menu elements
        const ctxPreview = document.getElementById('ctx-preview');
        const ctxFormat = document.getElementById('ctx-format');
        const ctxDivider = document.getElementById('ctx-divider');
        
        if (ctxPreview) ctxPreview.style.display = isExtEnabled('live-preview') ? 'flex' : 'none';
        if (ctxFormat) ctxFormat.style.display = isExtEnabled('formatter') ? 'flex' : 'none';
        if (ctxDivider) ctxDivider.style.display = (isExtEnabled('live-preview') || isExtEnabled('formatter')) ? 'block' : 'none';
        
        // If live preview disabled, hide panel
        if (!isExtEnabled('live-preview')) {
            const livePreviewPanel = document.getElementById('live-preview-panel');
            const resizer = document.getElementById('resizer');
            const editorPanel = document.getElementById('editor-panel');
            if (livePreviewPanel) livePreviewPanel.style.display = 'none';
            if (resizer) resizer.style.display = 'none';
            if (editorPanel) editorPanel.style.width = '100%';
        }
        
        if (typeof editor !== 'undefined') {
            editor.setOption('lint', isExtEnabled('linter') ? {
                esversion: 11,
                browser: true
            } : false);
            updateColorPickers();
        }
    };

    // --- Activity Bar Navigation ---
    
    // Workspaces Routing
    const workspaceTabs = ['ide', 'logic', 'circuit'];
    workspaceTabs.forEach(ws => {
        document.getElementById(`nav-workspace-${ws}`).addEventListener('click', () => {
            // Update Activity Bar active state
            workspaceTabs.forEach(tab => {
                document.getElementById(`nav-workspace-${tab}`).classList.remove('active');
                document.getElementById(`workspace-${tab}`).classList.remove('active-workspace');
                document.getElementById(`workspace-${tab}`).classList.add('d-none');
            });
            document.getElementById(`nav-workspace-${ws}`).classList.add('active');
            document.getElementById(`workspace-${ws}`).classList.remove('d-none');
            document.getElementById(`workspace-${ws}`).classList.add('active-workspace');

            // Toggle IDE specific tools visibility (only show when IDE is active)
            const ideToolsDisplay = ws === 'ide' ? 'flex' : 'none';
            document.getElementById('nav-explorer').style.display = ideToolsDisplay;
            document.getElementById('nav-extensions').style.display = ideToolsDisplay;
            document.querySelector('.border-bottom.border-secondary').style.display = ideToolsDisplay;
            
            // Refresh editor if returning to IDE
            if (ws === 'ide' && typeof editor !== 'undefined') {
                setTimeout(() => editor.refresh(), 50);
            }

            localStorage.setItem('active_workspace', ws);
        });
    });

    // Restore active workspace
    const savedWorkspace = localStorage.getItem('active_workspace');
    if (savedWorkspace && workspaceTabs.includes(savedWorkspace) && savedWorkspace !== 'ide') {
        // Delay slightly to let the rest of the UI initialize properly before switching
        setTimeout(() => document.getElementById(`nav-workspace-${savedWorkspace}`).click(), 10);
    }

    // IDE Sidebar Navigation
    document.getElementById('nav-explorer').addEventListener('click', () => {
        document.getElementById('nav-explorer').classList.add('active');
        document.getElementById('nav-extensions').classList.remove('active');
        document.getElementById('explorer-view').classList.add('active');
        document.getElementById('extensions-view').classList.remove('active');
    });
    document.getElementById('nav-extensions').addEventListener('click', () => {
        document.getElementById('nav-extensions').classList.add('active');
        document.getElementById('nav-explorer').classList.remove('active');
        document.getElementById('extensions-view').classList.add('active');
        document.getElementById('explorer-view').classList.remove('active');
        if (window.renderExtensions) window.renderExtensions();
    });

    // --- Settings State ---
    let autoSaveMode = 'instant'; // instant, delay, off
    let autoSaveDelay = 1000;
    let autoSaveTimer = null;
    let autoCompleteEnabled = true;
    let autoCloseEnabled = true;

    if (localStorage.getItem('formatek_autosave_mode')) autoSaveMode = localStorage.getItem('formatek_autosave_mode');
    if (localStorage.getItem('formatek_autosave_delay')) autoSaveDelay = parseInt(localStorage.getItem('formatek_autosave_delay'));
    if (localStorage.getItem('formatek_autocomplete')) autoCompleteEnabled = localStorage.getItem('formatek_autocomplete') === 'on';
    if (localStorage.getItem('formatek_autoclose')) autoCloseEnabled = localStorage.getItem('formatek_autoclose') === 'on';

    document.getElementById('setting-autosave-mode').value = autoSaveMode;
    document.getElementById('setting-autosave-delay').value = autoSaveDelay;
    document.getElementById('setting-autocomplete').value = autoCompleteEnabled ? 'on' : 'off';
    document.getElementById('setting-autoclose').value = autoCloseEnabled ? 'on' : 'off';
    document.getElementById('setting-language').value = currentLanguage;

    function toggleSettingsUI() {
        document.getElementById('delay-wrapper').style.display = autoSaveMode === 'delay' ? 'block' : 'none';
        document.getElementById('manual-save-hint').style.display = autoSaveMode === 'off' ? 'block' : 'none';
    }
    toggleSettingsUI();

    document.getElementById('setting-autosave-mode').addEventListener('change', (e) => {
        autoSaveMode = e.target.value;
        toggleSettingsUI();
    });
    document.getElementById('setting-autosave-delay').addEventListener('change', (e) => { autoSaveDelay = parseInt(e.target.value) || 1000; });
    document.getElementById('setting-autocomplete').addEventListener('change', (e) => { autoCompleteEnabled = e.target.value === 'on'; });
    document.getElementById('setting-autoclose').addEventListener('change', (e) => {
        autoCloseEnabled = e.target.value === 'on';
        if (typeof editor !== 'undefined') {
            editor.setOption('autoCloseTags', autoCloseEnabled);
            editor.setOption('autoCloseBrackets', autoCloseEnabled);
        }
    });

    document.getElementById('btn-save-settings').addEventListener('click', () => {
        localStorage.setItem('formatek_autosave_mode', autoSaveMode);
        localStorage.setItem('formatek_autosave_delay', autoSaveDelay.toString());
        localStorage.setItem('formatek_autocomplete', autoCompleteEnabled ? 'on' : 'off');
        localStorage.setItem('formatek_autoclose', autoCloseEnabled ? 'on' : 'off');
        
        const newLang = document.getElementById('setting-language').value;
        localStorage.setItem('ide_language', newLang);
        if (newLang !== currentLanguage) {
            currentLanguage = newLang;
            if (typeof setLanguage === 'function') setLanguage(newLang);
        }

        if(currentFileId && autoSaveMode !== 'off') {
            vfs.saveFile(currentFileId, editor.getValue());
            showStatusSaved();
        }
        
        // Hide modal
        const settingsModal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
        if (settingsModal) settingsModal.hide();
    });

    // --- Initialize CodeMirror ---
    const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        theme: 'monokai',
        lineNumbers: true,
        extraKeys: {"Ctrl-Space": "autocomplete"},
        lineWrapping: true,
        styleActiveLine: true,
        matchBrackets: true,
        autoCloseTags: autoCloseEnabled,
        autoCloseBrackets: autoCloseEnabled,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
        lint: isExtEnabled('linter') ? {esversion: 11, browser: true} : false
    });

    // --- Smart Color Picker Logic ---
    let colorMarks = [];
    let colorPickerTimeout;

    function updateColorPickers() {
        colorMarks.forEach(m => m.clear());
        colorMarks = [];
        if (!isExtEnabled('color-picker')) return;

        const lineCount = editor.lineCount();
        const colorRegex = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
        
        for (let i = 0; i < lineCount; i++) {
            const text = editor.getLine(i);
            let match;
            while ((match = colorRegex.exec(text)) !== null) {
                let color = match[0];
                if (color.length === 4) {
                    color = '#' + color[1]+color[1] + color[2]+color[2] + color[3]+color[3];
                }
                
                const widget = document.createElement('input');
                widget.type = 'color';
                widget.value = color;
                widget.className = 'color-picker-widget';
                widget.title = 'Change color';
                
                const mark = editor.setBookmark({line: i, ch: match.index + match[0].length}, {
                    widget: widget,
                    insertLeft: false
                });
                
                widget.addEventListener('change', (e) => {
                    const pos = mark.find();
                    if (pos) {
                        const lineStr = editor.getLine(pos.line);
                        const hashIdx = lineStr.lastIndexOf('#', pos.ch - 1);
                        if (hashIdx !== -1) {
                            editor.replaceRange(e.target.value, {line: pos.line, ch: hashIdx}, pos);
                            updateLivePreview(); // Force UI update
                        }
                    }
                });
                
                colorMarks.push(mark);
            }
        }
    }

    editor.on("change", function(instance, changeObj) {
        if (autoSaveMode === 'instant') {
            saveCurrentFile();
        } else if (autoSaveMode === 'delay') {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                saveCurrentFile();
            }, autoSaveDelay);
        }
        
        clearTimeout(colorPickerTimeout);
        colorPickerTimeout = setTimeout(updateColorPickers, 800);
    });

    if (CodeMirror.hint.css) {
        const origCssHint = CodeMirror.hint.css;
        CodeMirror.hint.css = function(cm, options) {
            const hints = origCssHint(cm, options);
            if (hints && hints.list && hints.list.length > 0) {
                const cursor = cm.getCursor();
                const token = cm.getTokenAt(cursor);
                const line = cm.getLine(cursor.line);
                const textBefore = line.slice(0, token.start).trim();
                
                // If it does NOT end with colon, it means we are typing a property, not a value.
                if (!textBefore.endsWith(':')) {
                    for (let i = 0; i < hints.list.length; i++) {
                        let hint = hints.list[i];
                        let text = typeof hint === 'string' ? hint : hint.text;
                        
                        // Exclude pseudo-classes or at-rules like :hover or @media
                        if (!text.startsWith(':') && !text.startsWith('@')) {
                            hints.list[i] = {
                                text: text,
                                displayText: text,
                                hint: function(cm, data, completion) {
                                    let from = completion.from || data.from;
                                    let to = completion.to || data.to;
                                    cm.replaceRange(text + ": ;", from, to);
                                    cm.setCursor({line: cursor.line, ch: from.ch + text.length + 2});
                                }
                            };
                        }
                    }
                }
            }
            return hints;
        };
    }

    editor.on("inputRead", function(instance, changeObj) {
        if (autoCompleteEnabled && /^[a-zA-Z<\-]+$/.test(changeObj.text[0])) {
            if (!instance.state.completionActive) {
                CodeMirror.commands.autocomplete(instance, null, {completeSingle: false});
            }
        }
    });

    const noFileScreen = document.getElementById('no-file-screen');
    const contextMenu = document.getElementById('context-menu');

    // --- File System & UI Helpers ---
    function getFileIconClass(filename) {
        if (filename.endsWith('.html')) return 'fa-brands fa-html5 icon-html';
        if (filename.endsWith('.css')) return 'fa-brands fa-css3-alt icon-css';
        if (filename.endsWith('.js')) return 'fa-brands fa-js icon-js';
        return 'fa-solid fa-file-code';
    }

    function getModeForFile(filename) {
        if (filename.endsWith('.html')) return 'htmlmixed';
        if (filename.endsWith('.css')) return 'css';
        if (filename.endsWith('.js')) return 'javascript';
        return 'htmlmixed';
    }

    function saveCurrentFile() {
        if (currentFileId) {
            const node = vfs.getNode(currentFileId);
            const isImage = /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(node.name);
            if (!isImage) {
                vfs.saveFile(currentFileId, editor.getValue());
                updateLivePreview();
            }
        }
    }

    function showStatusSaved() {
        document.getElementById('status-icon').className = 'fa-solid fa-circle-check text-success me-2';
        document.getElementById('status-text').innerText = 'Saved';
    }

    function renderTree(parentId, container) {
        const parentNode = vfs.getNode(parentId);
        if (!parentNode || !parentNode.children) return;

        const children = [...parentNode.children].sort((a, b) => {
            const nodeA = vfs.getNode(a);
            const nodeB = vfs.getNode(b);
            if (nodeA.type === nodeB.type) return nodeA.name.localeCompare(nodeB.name);
            return nodeA.type === 'folder' ? -1 : 1;
        });

        children.forEach(childId => {
            const node = vfs.getNode(childId);
            const el = document.createElement('div');
            el.className = 'tree-node';

            const item = document.createElement('div');
            item.className = node.type === 'folder' ? 'folder-item' : 'file-item';
            item.setAttribute('data-id', childId);
            if (childId === selectedNodeId && node.type === 'folder') item.classList.add('selected');
            if (selectedNodeIds.has(childId)) item.classList.add('active'); // Use selectedNodeIds for active state
            else if (childId === currentFileId && node.type === 'file' && selectedNodeIds.size <= 1) item.classList.add('active');
            
            let iconHtml = '';
            if (node.type === 'folder') {
                iconHtml = node.isOpen ? '<i class="fa-solid fa-chevron-down fa-xs me-1 opacity-50"></i><i class="fa-regular fa-folder-open icon-folder"></i>' : '<i class="fa-solid fa-chevron-right fa-xs me-1 opacity-50"></i><i class="fa-solid fa-folder icon-folder"></i>';
            } else {
                iconHtml = `<i class="${getFileIconClass(node.name)}"></i>`;
            }

            item.innerHTML = `${iconHtml} <span>${node.name}</span>`;
            
            // Drag and Drop internal functionality
            item.draggable = true;
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', childId);
                e.dataTransfer.effectAllowed = 'move';
                e.stopPropagation();
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                item.classList.add('drag-over');
                e.stopPropagation();
            });

            item.addEventListener('dragleave', (e) => {
                item.classList.remove('drag-over');
                e.stopPropagation();
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                item.classList.remove('drag-over');
                
                const draggedId = e.dataTransfer.getData('text/plain');
                // Ensure the dragged data is a string ID and not a file from OS
                if (draggedId && typeof draggedId === 'string' && !draggedId.includes('File')) {
                    if (vfs.moveNode(draggedId, childId)) {
                        updateUI();
                        updateLivePreview();
                    }
                }
            });

            item.addEventListener('click', (e) => {
                e.stopPropagation();
                
                if (e.ctrlKey) {
                    if (selectedNodeIds.has(childId)) {
                        selectedNodeIds.delete(childId);
                    } else {
                        selectedNodeIds.add(childId);
                    }
                } else {
                    selectedNodeIds.clear();
                    selectedNodeIds.add(childId);
                }

                selectedNodeId = node.type === 'folder' ? childId : node.parent; 
                
                if (node.type === 'folder' && !e.ctrlKey) {
                    vfs.toggleFolder(childId);
                } else if (node.type === 'file' && !e.ctrlKey) {
                    openFile(childId);
                }
                
                updateUI();
            });

            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!selectedNodeIds.has(childId)) {
                    selectedNodeIds.clear();
                    selectedNodeIds.add(childId);
                    updateUI();
                }

                contextNodeId = childId;
                
                if (selectedNodeIds.size > 1) {
                    document.getElementById('ctx-preview').style.display = 'none';
                    document.getElementById('ctx-format').style.display = 'none';
                    document.getElementById('ctx-rename').style.display = 'none';
                    document.getElementById('ctx-delete').innerHTML = `<i class="fa-solid fa-trash"></i> <span>Delete (${selectedNodeIds.size} items)</span>`;
                } else {
                    document.getElementById('ctx-rename').style.display = 'flex';
                    document.getElementById('ctx-delete').innerHTML = `<i class="fa-solid fa-trash"></i> <span data-i18n="delete">Delete</span>`;
                    
                    if (node.type === 'file' && node.name.endsWith('.html') && isExtEnabled('live-preview')) {
                        document.getElementById('ctx-preview').style.display = 'flex';
                    } else {
                        document.getElementById('ctx-preview').style.display = 'none';
                    }

                    if (node.type === 'file' && isExtEnabled('formatter')) {
                        document.getElementById('ctx-format').style.display = 'flex';
                    } else {
                        document.getElementById('ctx-format').style.display = 'none';
                    }
                }

                contextMenu.style.display = 'block';
                contextMenu.style.left = e.pageX + 'px';
                contextMenu.style.top = e.pageY + 'px';
            });

            el.appendChild(item);

            if (node.type === 'folder') {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = `folder-children ${node.isOpen ? '' : 'collapsed'}`;
                renderTree(childId, childrenContainer);
                el.appendChild(childrenContainer);
            }

            container.appendChild(el);
        });
    }

    function updateUI() {
        const treeContainer = document.getElementById('file-tree');
        treeContainer.innerHTML = '';
        renderTree('root', treeContainer);
        renderTabs();
    }

    function renderTabs() {
        const tabs = document.getElementById('editor-tabs');
        tabs.innerHTML = '';
        openTabs.forEach(id => {
            const node = vfs.getNode(id);
            if (!node) return; 
            
            const li = document.createElement('li');
            li.className = 'nav-item';
            
            const a = document.createElement('a');
            a.className = `nav-link ${id === currentFileId ? 'active' : ''}`;
            a.href = '#';
            a.innerHTML = `<i class="${getFileIconClass(node.name)}"></i> ${node.name} <i class="fa-solid fa-xmark close-tab"></i>`;
            
            a.addEventListener('click', (e) => {
                if (e.target.classList.contains('close-tab')) {
                    e.stopPropagation();
                    closeTab(id);
                } else {
                    e.preventDefault();
                    openFile(id);
                }
            });
            
            li.appendChild(a);
            tabs.appendChild(li);
        });
    }

    function closeTab(id) {
        openTabs = openTabs.filter(tid => tid !== id);
        if (currentFileId === id) {
            saveCurrentFile();
            currentFileId = null;
            if (openTabs.length > 0) {
                openFile(openTabs[openTabs.length - 1]);
            } else {
                noFileScreen.style.display = 'flex';
                document.getElementById('status-right').innerText = '-';
                showStatusSaved();
                updateUI();
            }
        } else {
            updateUI();
        }
    }

    function openFile(id) {
        const node = vfs.getNode(id);
        if (!node || node.type !== 'file') return;

        saveCurrentFile();
        currentFileId = id;
        
        if (!openTabs.includes(id)) openTabs.push(id);
        
        noFileScreen.style.display = 'none';
        
        const isImage = /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(node.name);
        if (isImage) {
            document.querySelector('.code-container').style.display = 'none';
            let imgContainer = document.getElementById('image-viewer-container');
            if (!imgContainer) {
                imgContainer = document.createElement('div');
                imgContainer.id = 'image-viewer-container';
                imgContainer.className = 'flex-grow-1 d-flex justify-content-center align-items-center position-relative';
                imgContainer.style.background = 'rgba(0,0,0,0.2)';
                imgContainer.innerHTML = `<img id="image-viewer-img" src="" style="max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">`;
                document.getElementById('editor-panel').appendChild(imgContainer);
            }
            imgContainer.style.display = 'flex';
            document.getElementById('image-viewer-img').src = node.content;
            
            document.getElementById('status-right').innerText = 'IMAGE';
            showStatusSaved();
        } else {
            document.querySelector('.code-container').style.display = 'block';
            const imgContainer = document.getElementById('image-viewer-container');
            if (imgContainer) imgContainer.style.display = 'none';
            
            editor.setOption('mode', getModeForFile(node.name));
            editor.setValue(node.content || '');
            
            // Apply language specific options for linters if needed, and run color pickers
            updateColorPickers();
            
            document.getElementById('status-right').innerText = getModeForFile(node.name).toUpperCase();
            showStatusSaved();
        }
        
        let current = node.parent;
        while(current !== 'root') {
            vfs.getNode(current).isOpen = true;
            current = vfs.getNode(current).parent;
        }

        updateUI();
    }

    // --- Editor Events ---
    editor.on('change', () => {
        if (!currentFileId) return;
        
        if (autoSaveMode === 'instant') {
            saveCurrentFile();
            showStatusSaved();
        } else if (autoSaveMode === 'delay') {
            document.getElementById('status-icon').className = 'fa-solid fa-pen text-warning me-2';
            document.getElementById('status-text').innerText = 'Typing...';
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                saveCurrentFile();
                showStatusSaved();
            }, autoSaveDelay);
        } else {
            document.getElementById('status-icon').className = 'fa-solid fa-circle-exclamation text-danger me-2';
            document.getElementById('status-text').innerText = 'Unsaved Changes';
        }
    });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (currentFileId) {
                saveCurrentFile();
                showStatusSaved();
            }
        }
        // Format Document shortcut
        if (e.shiftKey && e.altKey && (e.key === 'f' || e.key === 'F')) {
            e.preventDefault();
            if (isExtEnabled('formatter')) handleFormat();
        }
    });

    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });

    // --- Custom UI Dialogs ---
    window.showCustomPrompt = function(title, defaultValue, callback) {
        document.getElementById('customPromptTitle').innerText = title;
        const input = document.getElementById('customPromptInput');
        input.value = defaultValue || '';
        const modal = new bootstrap.Modal(document.getElementById('customPromptModal'));
        
        const confirmBtn = document.getElementById('customPromptConfirmBtn');
        const handleConfirm = () => {
            const val = input.value.trim();
            if (val !== null) {
                modal.hide();
                callback(val);
            }
        };
        
        // Clean up previous listeners
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        newBtn.addEventListener('click', handleConfirm);
        
        document.getElementById('customPromptModal').addEventListener('shown.bs.modal', function onShown() {
            input.focus();
            input.select();
            document.getElementById('customPromptModal').removeEventListener('shown.bs.modal', onShown);
        });
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') newBtn.click();
        };
        
        modal.show();
    };

    window.showCustomConfirm = function(title, message, callback) {
        document.getElementById('customConfirmTitle').innerText = title;
        document.getElementById('customConfirmMessage').innerText = message;
        const modal = new bootstrap.Modal(document.getElementById('customConfirmModal'));
        
        const yesBtn = document.getElementById('customConfirmYesBtn');
        const newYesBtn = yesBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        
        newYesBtn.addEventListener('click', () => {
            modal.hide();
            callback(true);
        });
        
        modal.show();
    }

    // --- Context Actions ---
    function handleNewFile() {
        showCustomPrompt('Enter new file name with extension (e.g. style.css):', '', (name) => {
            if (name && name !== '') {
                const targetParent = vfs.getNode(selectedNodeId) ? selectedNodeId : 'root';
                const id = vfs.createNode(targetParent, name, 'file');
                if (id) openFile(id);
                else showCustomConfirm('Error', 'File already exists in this folder!', () => {});
            }
        });
    }

    function handleNewFolder() {
        showCustomPrompt('Enter new folder name:', '', (name) => {
            if (name && name !== '') {
                const targetParent = vfs.getNode(selectedNodeId) ? selectedNodeId : 'root';
                const id = vfs.createNode(targetParent, name, 'folder');
                if (id) updateUI();
                else showCustomConfirm('Error', 'Folder already exists!', () => {});
            }
        });
    }

    function handleDelete() {
        if (selectedNodeIds.size === 0) return;
        
        const count = selectedNodeIds.size;
        const msg = count > 1 ? `Are you sure you want to delete ${count} items?` : `Are you sure you want to delete '${vfs.getNode(Array.from(selectedNodeIds)[0]).name}'?`;
        
        showCustomConfirm('Delete Warning', msg, (confirmed) => {
            if (confirmed) {
                selectedNodeIds.forEach(id => {
                    const node = vfs.getNode(id);
                    if (node) {
                        if (node.type === 'file' && openTabs.includes(id)) closeTab(id);
                        vfs.deleteNode(id);
                    }
                });
                
                openTabs = openTabs.filter(tid => vfs.getNode(tid));
                if (currentFileId && !vfs.getNode(currentFileId)) currentFileId = null;
                selectedNodeIds.clear();

                updateUI();
                updateLivePreview();
            }
        });
    }

    function handleRename(id) {
        const node = vfs.getNode(id);
        if (!node) return;
        showCustomPrompt('Enter new name:', node.name, (newName) => {
            if (newName && newName !== '' && newName !== node.name) {
                if (vfs.renameNode(id, newName)) {
                    if (node.type === 'file' && id === currentFileId) {
                        editor.setOption('mode', getModeForFile(node.name));
                        document.getElementById('status-right').innerText = getModeForFile(node.name).toUpperCase();
                    }
                    updateUI();
                    updateLivePreview();
                } else {
                    showCustomConfirm('Error', 'Name already exists in this folder!', () => {});
                }
            }
        });
    }

    function handleFormat() {
        if (!currentFileId) return;
        const node = vfs.getNode(currentFileId);
        let val = editor.getValue();
        if (node.name.endsWith('.html') && typeof html_beautify !== 'undefined') val = html_beautify(val, { indent_size: 4 });
        else if (node.name.endsWith('.css') && typeof css_beautify !== 'undefined') val = css_beautify(val, { indent_size: 4 });
        else if (node.name.endsWith('.js') && typeof js_beautify !== 'undefined') val = js_beautify(val, { indent_size: 4 });
        
        if (val !== editor.getValue()) {
            editor.setValue(val);
            saveCurrentFile();
        }
    }

    document.getElementById('ctx-rename').addEventListener('click', () => handleRename(contextNodeId));
    document.getElementById('ctx-delete').addEventListener('click', () => handleDelete());
    document.getElementById('ctx-format').addEventListener('click', () => handleFormat());
    document.getElementById('ctx-preview').addEventListener('click', () => {
        // Open the file first if not opened
        openFile(contextNodeId);
        document.getElementById('live-preview-panel').style.display = 'flex';
        document.getElementById('resizer').style.display = 'block';
        document.getElementById('editor-panel').style.width = '55%';
        document.getElementById('live-preview-panel').style.width = '45%';
        updateLivePreview();
        contextMenu.style.display = 'none';
    });
    document.getElementById('ctx-format').addEventListener('click', () => {
        openFile(contextNodeId);
        handleFormat();
        contextMenu.style.display = 'none';
    });
    
    document.getElementById('btn-new-file').addEventListener('click', handleNewFile);
    document.getElementById('btn-new-folder').addEventListener('click', handleNewFolder);

    // --- Save & Export Project ---
    document.getElementById('btn-export-zip').addEventListener('click', () => {
        if (currentFileId) vfs.saveFile(currentFileId, editor.getValue());
        const zip = new JSZip();
        const files = vfs.getAllFiles();
        if (files.length === 0) { showCustomConfirm('Empty', 'Project is empty!', ()=>{}); return; }
        files.forEach(f => { zip.file(f.path, f.content); });
        zip.generateAsync({type:"blob"}).then(function(content) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = "FormaTek_Export.zip";
            link.click();
        });
    });

    document.getElementById('btn-save-fmtk').addEventListener('click', () => {
        if (currentFileId) vfs.saveFile(currentFileId, editor.getValue());
        
        // Build the complete platform state
        const projectState = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            ide: {
                files: vfs.exportJSON(), // Export all files from VFS
                openTabs: openTabs,
                currentFileId: currentFileId
            },
            logic: window.getLogicState ? window.getLogicState() : {
                gates: [],
                connections: []
            },
            circuit: {
                // Placeholder for future circuits state
                components: [],
                wires: []
            }
        };

        const jsonString = JSON.stringify(projectState, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        // Ask for project name before saving
        showCustomPrompt('Enter project name:', 'MyProject', (name) => {
            if(name) {
                link.download = `${name}.fmtk`;
                link.click();
            }
        });
    });

    // --- Run Project (New Tab) ---
    document.getElementById('btn-run-project').addEventListener('click', (e) => {
        e.preventDefault();
        saveCurrentFile();
        const htmlContent = buildHtmlContent();
        const win = window.open('', '_blank');
        if (win) {
            win.document.open();
            win.document.write(htmlContent);
            win.document.close();
        } else {
            alert("Please allow pop-ups to run the project.");
        }
    });

    // --- Live Preview & Console Logic ---
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

    function buildHtmlContent(injectConsole = false) {
        const files = vfs.getAllFiles();
        const indexFile = files.find(f => f.path === 'index.html');
        let htmlContent = indexFile ? indexFile.content : '<h1>No index.html found! Create one in the root folder.</h1>';
        
        if (injectConsole) {
            if (htmlContent.includes('<head>')) htmlContent = htmlContent.replace('<head>', () => '<head>' + consoleScript);
            else htmlContent = consoleScript + htmlContent;
        }

        files.filter(f => f.path.endsWith('.css')).forEach(f => {
            const regex = new RegExp(`<link[^>]*href=["'](?:.*?\/)?${f.path.split('/').pop()}["'][^>]*>`, 'i');
            if (regex.test(htmlContent)) {
                htmlContent = htmlContent.replace(regex, () => `<style>\\n${f.content}\\n</style>`);
            } else {
                if (htmlContent.includes('</head>')) {
                    htmlContent = htmlContent.replace('</head>', () => `<style>\\n${f.content}\\n</style>\\n</head>`);
                } else {
                    htmlContent = `<style>\\n${f.content}\\n</style>\\n` + htmlContent;
                }
            }
        });

        files.filter(f => f.path.endsWith('.js')).forEach(f => {
            const regex = new RegExp(`<script[^>]*src=["'](?:.*?\/)?${f.path.split('/').pop()}["'][^>]*><\\/script>`, 'i');
            if (regex.test(htmlContent)) {
                htmlContent = htmlContent.replace(regex, () => `<script>\\n${f.content}\\n</script>`);
            } else {
                if (htmlContent.includes('</body>')) {
                    htmlContent = htmlContent.replace('</body>', () => `<script>\\n${f.content}\\n</script>\\n</body>`);
                } else {
                    htmlContent += `\\n<script>\\n${f.content}\\n</script>`;
                }
            }
        });

        // Inject images as base64 Data URLs
        files.filter(f => /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(f.path)).forEach(f => {
            const filename = f.path.split('/').pop();
            const escapedPath = filename.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`src=["'](?:.*?\/)?${escapedPath}["']`, 'gi');
            htmlContent = htmlContent.replace(regex, `src="${f.content}"`);
        });

        return htmlContent;
    }

    function updateLivePreview() {
        const previewPanel = document.getElementById('live-preview-panel');
        if (!isExtEnabled('live-preview') || previewPanel.style.display === 'none') return;
        
        const frame = document.getElementById('preview-frame');
        frame.srcdoc = buildHtmlContent(isExtEnabled('console'));
    }

    document.getElementById('btn-close-preview').addEventListener('click', () => {
        document.getElementById('live-preview-panel').style.display = 'none';
        document.getElementById('resizer').style.display = 'none';
        document.getElementById('editor-panel').style.width = '100%';
    });
    document.getElementById('btn-refresh-preview').addEventListener('click', updateLivePreview);

    // --- Resizer Logic ---
    const resizer = document.getElementById('resizer');
    const leftPanel = document.getElementById('editor-panel');
    const rightPanel = document.getElementById('live-preview-panel');
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.getElementById('preview-frame').style.pointerEvents = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const container = document.getElementById('top-split-area');
        const containerRect = container.getBoundingClientRect();
        let newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newLeftWidth < 20) newLeftWidth = 20;
        if (newLeftWidth > 80) newLeftWidth = 80;
        leftPanel.style.width = `${newLeftWidth}%`;
        rightPanel.style.width = `${100 - newLeftWidth}%`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('resizing');
            document.body.style.cursor = 'default';
            document.getElementById('preview-frame').style.pointerEvents = 'auto';
        }
    });

    // --- Console Event Listener ---
    const consoleOutput = document.getElementById('console-output');
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'click') {
            document.getElementById('context-menu').style.display = 'none';
            return;
        }
        if (e.data && e.data.type === 'console') {
            const msg = document.createElement('div');
            msg.className = `console-line ${e.data.level}`;
            msg.innerHTML = `<span class="opacity-50 me-2">[${new Date().toLocaleTimeString()}]</span> ${e.data.args.join(' ')}`;
            consoleOutput.appendChild(msg);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
            
            if (e.data.level === 'error') {
                unreadErrors++;
                const badge = document.getElementById('console-error-count');
                badge.innerText = unreadErrors;
                badge.style.display = 'inline-block';
            }
        }
    });

    document.getElementById('status-console-toggle').addEventListener('click', () => {
        const panel = document.getElementById('console-panel');
        if (panel.style.display === 'none') {
            panel.style.display = 'flex';
            unreadErrors = 0;
            document.getElementById('console-error-count').style.display = 'none';
        } else {
            panel.style.display = 'none';
        }
    });
    document.getElementById('btn-close-console').addEventListener('click', () => {
        document.getElementById('console-panel').style.display = 'none';
    });
    document.getElementById('btn-clear-console').addEventListener('click', () => {
        consoleOutput.innerHTML = '';
        unreadErrors = 0;
        document.getElementById('console-error-count').style.display = 'none';
    });

    document.querySelector('.sidebar').addEventListener('click', (e) => {
        if (e.target.id === 'file-tree' || e.target.id === 'extensions-container' || e.target.classList.contains('sidebar')) {
            selectedNodeId = 'root';
            updateUI();
        }
    });

    // --- Drag and Drop Upload ---
    window.addEventListener('dragover', (e) => {
        e.preventDefault(); 
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            let filesAdded = false;
            let projectImported = false;
            
            Array.from(e.dataTransfer.files).forEach(file => {
                if (file.name.endsWith('.fmtk')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const data = JSON.parse(event.target.result);
                            if (data.ide && data.ide.files) {
                                vfs.importJSON(data.ide.files);
                                openTabs = data.ide.openTabs || [];
                                currentFileId = data.ide.currentFileId || null;
                                if (data.logic && window.loadLogicState) {
                                    window.loadLogicState(data.logic);
                                }
                                updateUI();
                                if(currentFileId) openFile(currentFileId);
                                showCustomConfirm('Success', 'FormaTek Project imported successfully!', ()=>{});
                            }
                        } catch(err) {
                            showCustomConfirm('Error', 'Failed to read project file.', ()=>{});
                        }
                    };
                    reader.readAsText(file);
                    projectImported = true;
                    return; // skip normal file processing
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    // Determine parent folder based on selection
                    let targetParent = 'root';
                    if (selectedNodeId && vfs.getNode(selectedNodeId)) {
                        targetParent = vfs.getNode(selectedNodeId).type === 'folder' ? selectedNodeId : vfs.getNode(selectedNodeId).parent;
                    }
                    
                    let id = vfs.createNode(targetParent, file.name, 'file');
                    if (!id) {
                        // File exists, append random string
                        const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
                        const base = file.name.includes('.') ? file.name.replace(ext, '') : file.name;
                        const uniqueName = base + '_' + Math.random().toString(36).substr(2, 4) + ext;
                        id = vfs.createNode(targetParent, uniqueName, 'file');
                    }
                    if (id) {
                        vfs.saveFile(id, event.target.result);
                        filesAdded = true;
                    }
                };
                
                if (file.type.startsWith('image/')) {
                    reader.readAsDataURL(file);
                } else {
                    reader.readAsText(file);
                }
            });
            
            // Wait briefly for readers to finish then update UI
            setTimeout(() => {
                if (filesAdded) {
                    updateUI();
                    updateLivePreview();
                }
            }, 100);
        }
    });

    // --- Initialization ---
    if (window.renderExtensions) window.renderExtensions();
    if (window.applyExtensions) window.applyExtensions();
    updateUI();
    const defaultFile = Object.keys(vfs.nodes).find(k => vfs.nodes[k].name === 'index.html');
    if(defaultFile) openFile(defaultFile);
});
