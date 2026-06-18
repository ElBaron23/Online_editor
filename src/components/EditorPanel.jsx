import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../context/I18nContext.jsx';
import { useFileSystem } from '../context/FileSystemContext.jsx';

const CodeMirror = window.CodeMirror;

export default function EditorPanel({
    currentFileId,
    openTabs,
    handleOpenFile,
    handleCloseTab,
    settings,
    enabledExtensions,
    saveFile,
    width,
    addLog
}) {
    const { t } = useTranslation();
    const { getNode } = useFileSystem();

    const textAreaRef = useRef(null);
    const editorRef = useRef(null);
    const containerRef = useRef(null);
    const autoSaveTimerRef = useRef(null);
    const colorMarksRef = useRef([]);

    const activeFile = currentFileId ? getNode(currentFileId) : null;
    const isImage = activeFile ? /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(activeFile.name) : false;

    // Helper: File Icon Class
    const getFileIconClass = (filename) => {
        if (filename.endsWith('.html')) return 'fa-brands fa-html5 icon-html';
        if (filename.endsWith('.css')) return 'fa-brands fa-css3-alt icon-css';
        if (filename.endsWith('.js')) return 'fa-brands fa-js icon-js';
        return 'fa-solid fa-file-code';
    };

    // Helper: CodeMirror Mode
    const getModeForFile = (filename) => {
        if (filename.endsWith('.html')) return 'htmlmixed';
        if (filename.endsWith('.css')) return 'css';
        if (filename.endsWith('.js')) return 'javascript';
        return 'htmlmixed';
    };

    // Initialize CodeMirror
    useEffect(() => {
        if (!textAreaRef.current) return;

        const editor = CodeMirror.fromTextArea(textAreaRef.current, {
            theme: 'monokai',
            lineNumbers: true,
            extraKeys: { "Ctrl-Space": "autocomplete" },
            lineWrapping: true,
            styleActiveLine: true,
            matchBrackets: true,
            autoCloseTags: settings.autoClose,
            autoCloseBrackets: settings.autoClose,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
            lint: enabledExtensions.includes('linter') ? { esversion: 11, browser: true } : false
        });

        editorRef.current = editor;

        // Auto-complete typing listener
        editor.on("inputRead", (instance, changeObj) => {
            if (settings.autoComplete && /^[a-zA-Z<\-]+$/.test(changeObj.text[0])) {
                if (!instance.state.completionActive) {
                    CodeMirror.commands.autocomplete(instance, null, { completeSingle: false });
                }
            }
        });

        return () => {
            if (editorRef.current) {
                editorRef.current.toTextArea();
                editorRef.current = null;
            }
        };
    }, []);

    // Handle File Changes
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || !activeFile || isImage) return;

        // Temporarily turn off change listener to avoid double save
        editor.off("change", handleEditorChange);

        const currentVal = editor.getValue();
        if (currentVal !== activeFile.content) {
            editor.setValue(activeFile.content || '');
        }

        editor.setOption('mode', getModeForFile(activeFile.name));
        editor.refresh();
        updateColorPickers();

        editor.on("change", handleEditorChange);
    }, [currentFileId, activeFile?.name]);

    // Handle Option Updates
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.setOption('autoCloseTags', settings.autoClose);
        editor.setOption('autoCloseBrackets', settings.autoClose);
        editor.setOption('lint', enabledExtensions.includes('linter') ? { esversion: 11, browser: true } : false);
    }, [settings.autoClose, enabledExtensions]);

    // Editor Change Handler (Save / Color Picker triggers)
    const handleEditorChange = (instance) => {
        if (!currentFileId) return;

        const val = instance.getValue();

        // Auto Save modes
        if (settings.autoSaveMode === 'instant') {
            saveFile(currentFileId, val);
        } else if (settings.autoSaveMode === 'delay') {
            clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(() => {
                saveFile(currentFileId, val);
            }, settings.autoSaveDelay);
        }

        // Color Picker Debouncing
        clearTimeout(instance.colorTimeout);
        instance.colorTimeout = setTimeout(updateColorPickers, 800);
    };

    // Color Pickers Logic
    const updateColorPickers = () => {
        const editor = editorRef.current;
        if (!editor) return;

        colorMarksRef.current.forEach(m => m.clear());
        colorMarksRef.current = [];

        if (!enabledExtensions.includes('color-picker')) return;

        const lineCount = editor.lineCount();
        const colorRegex = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;

        for (let i = 0; i < lineCount; i++) {
            const text = editor.getLine(i);
            let match;
            while ((match = colorRegex.exec(text)) !== null) {
                let color = match[0];
                if (color.length === 4) {
                    color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
                }

                const widget = document.createElement('input');
                widget.type = 'color';
                widget.value = color;
                widget.className = 'color-picker-widget';
                widget.title = 'Change color';

                const mark = editor.setBookmark({ line: i, ch: match.index + match[0].length }, {
                    widget: widget,
                    insertLeft: false
                });

                widget.addEventListener('change', (e) => {
                    const pos = mark.find();
                    if (pos) {
                        const lineStr = editor.getLine(pos.line);
                        const hashIdx = lineStr.lastIndexOf('#', pos.ch - 1);
                        if (hashIdx !== -1) {
                            editor.replaceRange(e.target.value, { line: pos.line, ch: hashIdx }, pos);
                            saveFile(currentFileId, editor.getValue());
                        }
                    }
                });

                colorMarksRef.current.push(mark);
            }
        }
    };

    return (
        <div ref={containerRef} className="editor-panel d-flex flex-column" style={{ width: `${width}%`, background: '#1e1e1e', height: '100%' }}>
            {/* Tab items */}
            <ul className="nav nav-tabs editor-tabs" id="editor-tabs" style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto' }}>
                {openTabs.map(id => {
                    const file = getNode(id);
                    if (!file) return null;
                    const isActive = id === currentFileId;

                    return (
                        <li key={id} className="nav-item">
                            <a
                                className={`nav-link ${isActive ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleOpenFile(id);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <i className={getFileIconClass(file.name)}></i>
                                <span className="ms-2">{file.name}</span>
                                <i
                                    className="fa-solid fa-xmark close-tab ms-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloseTab(id);
                                    }}
                                ></i>
                            </a>
                        </li>
                    );
                })}
            </ul>

            {/* Code container */}
            <div className="code-container flex-grow-1 position-relative h-100" style={{ display: isImage ? 'none' : 'block' }}>
                {!currentFileId && (
                    <div id="no-file-screen" className="no-file-screen">
                        <span style={{ fontSize: '48px', opacity: 0.3 }}>💻</span>
                        <p className="mt-4 text-light fw-semibold fs-5 text-center opacity-75">{t("select_file_prompt")}</p>
                    </div>
                )}
                <textarea ref={textAreaRef} id="code-editor" style={{ display: 'none' }}></textarea>
            </div>

            {/* Image viewer */}
            {isImage && activeFile && (
                <div className="flex-grow-1 d-flex justify-content-center align-items-center position-relative" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <img
                        src={activeFile.content}
                        style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                        alt={activeFile.name}
                    />
                </div>
            )}
        </div>
    );
}
