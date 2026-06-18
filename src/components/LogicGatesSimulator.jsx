import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../context/I18nContext.jsx';

// Standard gate definitions
const GATE_DEF = {
    'AND': { w: 80, h: 60, in: 2, out: 1, color: '#3b82f6', label: 'AND' },
    'OR': { w: 80, h: 60, in: 2, out: 1, color: '#8b5cf6', label: 'OR' },
    'NOT': { w: 70, h: 50, in: 1, out: 1, color: '#ef4444', label: 'NOT' },
    'NAND': { w: 80, h: 60, in: 2, out: 1, color: '#3b82f6', label: 'NAND' },
    'NOR': { w: 80, h: 60, in: 2, out: 1, color: '#8b5cf6', label: 'NOR' },
    'XOR': { w: 80, h: 60, in: 2, out: 1, color: '#d946ef', label: 'XOR' },
    'XNOR': { w: 80, h: 60, in: 2, out: 1, color: '#d946ef', label: 'XNOR' },
    'SWITCH': { w: 60, h: 60, in: 0, out: 1, color: '#f59e0b', label: 'SW' },
    'LED': { w: 50, h: 50, in: 1, out: 0, color: '#10b981', label: 'LED' },
    'SEG7': { w: 60, h: 100, in: 7, out: 0, color: '#333333', label: '7-SEG' },
    'CLOCK': { w: 60, h: 60, in: 0, out: 1, color: '#ec4899', label: '1 Hz' },
    'NODE': { w: 16, h: 60, in: 1, out: 4, color: '#9ca3af', label: '' }
};

// Standard gate truth tables
const GATE_TRUTH_TABLES = {
    'AND': { headers: ['A', 'B', 'OUT'], rows: [[0,0,0], [0,1,0], [1,0,0], [1,1,1]] },
    'OR': { headers: ['A', 'B', 'OUT'], rows: [[0,0,0], [0,1,1], [1,0,1], [1,1,1]] },
    'NOT': { headers: ['A', 'OUT'], rows: [[0,1], [1,0]] },
    'NAND': { headers: ['A', 'B', 'OUT'], rows: [[0,0,1], [0,1,1], [1,0,1], [1,1,0]] },
    'NOR': { headers: ['A', 'B', 'OUT'], rows: [[0,0,1], [0,1,0], [1,0,0], [1,1,0]] },
    'XOR': { headers: ['A', 'B', 'OUT'], rows: [[0,0,0], [0,1,1], [1,0,1], [1,1,0]] },
    'XNOR': { headers: ['A', 'B', 'OUT'], rows: [[0,0,1], [0,1,0], [1,0,0], [1,1,1]] }
};

export default function LogicGatesSimulator() {
    const { t } = useTranslation();
    const canvasRef = useRef(null);

    // React tab states
    const [logicTabs, setLogicTabs] = useState(() => {
        try {
            const saved = localStorage.getItem('logic-tabs');
            if (saved) return JSON.parse(saved);
        } catch { }
        return [{ id: 'main', name: 'Main Board', nodes: [], wires: [], nextId: 1, cameraX: 0, cameraY: 0, zoom: 1 }];
    });
    const [activeTabId, setActiveTabId] = useState(() => {
        return localStorage.getItem('logic-active-tab') || 'main';
    });

    // Custom Chips list
    const [customChips, setCustomChips] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('logic-custom-chips') || '[]');
        } catch {
            return [];
        }
    });

    // Refs for interactive variables to maintain 60FPS draw loops
    const nodesRef = useRef([]);
    const wiresRef = useRef([]);
    const nextIdRef = useRef(1);
    const cameraXRef = useRef(0);
    const cameraYRef = useRef(0);
    const zoomRef = useRef(1);

    // Initialize refs from loaded tab
    useEffect(() => {
        const tab = logicTabs.find(t => t.id === activeTabId) || logicTabs[0];
        if (tab) {
            nodesRef.current = JSON.parse(JSON.stringify(tab.nodes || []));
            wiresRef.current = JSON.parse(JSON.stringify(tab.wires || []));
            nextIdRef.current = tab.nextId || 1;
            cameraXRef.current = tab.cameraX || 0;
            cameraYRef.current = tab.cameraY || 0;
            zoomRef.current = tab.zoom || 1;
        }
    }, []);

    // Auto-save loop
    useEffect(() => {
        const interval = setInterval(() => {
            setLogicTabs(prev => {
                const nextTabs = prev.map(tVal => {
                    if (tVal.id === activeTabId) {
                        return {
                            ...tVal,
                            nodes: JSON.parse(JSON.stringify(nodesRef.current)),
                            wires: JSON.parse(JSON.stringify(wiresRef.current)),
                            nextId: nextIdRef.current,
                            cameraX: cameraXRef.current,
                            cameraY: cameraYRef.current,
                            zoom: zoomRef.current
                        };
                    }
                    return tVal;
                });
                localStorage.setItem('logic-tabs', JSON.stringify(nextTabs));
                localStorage.setItem('logic-active-tab', activeTabId);
                return nextTabs;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [activeTabId]);

    // Selected & Hover states
    const selectedNodesRef = useRef(new Set());
    const hoveredNodeRef = useRef(null);
    const hoveredPortRef = useRef(null);
    const hoveredWireRef = useRef(null);

    // Drag / Interaction variables
    const isDraggingRef = useRef(false);
    const draggedNodeRef = useRef(null);
    const dragStartXRef = useRef(0);
    const dragStartYRef = useRef(0);
    const dragHasMovedRef = useRef(false);

    const isWiringRef = useRef(false);
    const wiringStartNodeRef = useRef(null);
    const wiringStartPortTypeRef = useRef(null);
    const wiringStartPortIndexRef = useRef(-1);
    const mouseXRef = useRef(0);
    const mouseYRef = useRef(0);

    const isPanningRef = useRef(false);
    const lastPanXRef = useRef(0);
    const lastPanYRef = useRef(0);

    const isSelectingBoxRef = useRef(false);
    const selectionBoxRef = useRef(null);

    // Context / Properties Modal State
    const [contextMenu, setContextMenu] = useState(null); // { x, y, nodeId, type }
    const [toolbarContextMenu, setToolbarContextMenu] = useState(null); // { x, y, chipId }
    const [nodeContextMenu, setNodeContextMenu] = useState(null); // { x, y, nodeId }
    const [wireContextMenu, setWireContextMenu] = useState(null); // { x, y, wireIdx }
    const [propModalData, setPropModalData] = useState(null); // { node, freq, name }
    const [truthTableData, setTruthTableData] = useState(null); // { title, headers, rows }

    const [customChips, setCustomChips] = useState(() => {
        try {
            const saved = localStorage.getItem('online_editor_custom_chips');
            if (saved) return JSON.parse(saved);
        } catch(e) {}
        return [];
    });
    const customChipsRef = useRef(customChips);

    useEffect(() => {
        customChipsRef.current = customChips;
        localStorage.setItem('online_editor_custom_chips', JSON.stringify(customChips));
    }, [customChips]);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const showSignalValuesRef = useRef(false);
    const [showSignalValues, setShowSignalValuesState] = useState(false);

    const setShowSignalValues = (val) => {
        showSignalValuesRef.current = val;
        setShowSignalValuesState(val);
    };

    // Helpers
    const generateId = () => {
        return 'gate_' + (nextIdRef.current++) + '_' + Math.floor(Math.random() * 10000);
    };

    const handleCreateCustomChip = () => {
        if (selectedNodesRef.current.size === 0) {
            alert("Please select at least one component to create a custom chip.");
            return;
        }
        
        const name = prompt("Enter a name for the custom chip:");
        if (!name || name.trim() === '') return;

        const selectedNodes = Array.from(selectedNodesRef.current);
        const nodeIds = new Set(selectedNodes.map(n => n.id));

        // Find wires that connect these nodes
        const internalWires = wiresRef.current.filter(w => nodeIds.has(w.fromNode) && nodeIds.has(w.toNode));
        
        // Calculate bounding box
        let minX = Infinity, minY = Infinity;
        selectedNodes.forEach(n => {
            if (n.x < minX) minX = n.x;
            if (n.y < minY) minY = n.y;
        });

        // Clone nodes and wires, normalizing positions
        const cloneNode = (n) => JSON.parse(JSON.stringify(n));
        const cloneWire = (w) => JSON.parse(JSON.stringify(w));

        const clonedNodes = selectedNodes.map(n => {
            const clone = cloneNode(n);
            clone.x -= minX;
            clone.y -= minY;
            return clone;
        });

        const clonedWires = internalWires.map(cloneWire);

        // Determine input/output pins
        const inputs = clonedNodes.filter(n => n.type === 'SWITCH').sort((a, b) => a.y - b.y);
        const outputs = clonedNodes.filter(n => n.type === 'LED').sort((a, b) => a.y - b.y);

        const newChip = {
            id: 'chip_' + Date.now(),
            name: name.trim(),
            nodes: clonedNodes,
            wires: clonedWires,
            inCount: inputs.length,
            outCount: outputs.length,
            color: '#8b5cf6' // Purple color for custom chips
        };

        setCustomChips(prev => [...prev, newChip]);
        setIsSettingsOpen(false);
        selectedNodesRef.current.clear();
        draw();
    };

    const getPortPos = (node, type, index) => {
        if (type === 'in') {
            const spacing = node.h / (node.inputs.length + 1);
            let px = node.x;
            if (['OR', 'NOR', 'XOR', 'XNOR'].includes(node.type)) {
                const tVal = (index + 1) / (node.inputs.length + 1);
                px += 2 * (1 - tVal) * tVal * (node.w * 0.25);
            }
            return { x: px, y: node.y + spacing * (index + 1) };
        } else {
            const spacing = node.h / (node.outputs.length + 1);
            return { x: node.x + node.w, y: node.y + spacing * (index + 1) };
        }
    };

    const distanceToBezier = (px, py, x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2) => {
        let minDist = Infinity;
        for (let tVal = 0; tVal <= 1; tVal += 0.05) {
            const bx = Math.pow(1 - tVal, 3) * x1 + 3 * Math.pow(1 - tVal, 2) * tVal * cp1x + 3 * (1 - tVal) * tVal * tVal * cp2x + Math.pow(tVal, 3) * x2;
            const by = Math.pow(1 - tVal, 3) * y1 + 3 * Math.pow(1 - tVal, 2) * tVal * cp1y + 3 * (1 - tVal) * tVal * tVal * cp2y + Math.pow(tVal, 3) * y2;
            const dist = Math.hypot(px - bx, py - by);
            if (dist < minDist) minDist = dist;
        }
        return minDist;
    };

    // Save/Restore Tabs State
    const saveCurrentTabState = (tabId) => {
        setLogicTabs(prev => prev.map(tVal => {
            if (tVal.id === tabId) {
                return {
                    ...tVal,
                    nodes: [...nodesRef.current],
                    wires: [...wiresRef.current],
                    nextId: nextIdRef.current,
                    cameraX: cameraXRef.current,
                    cameraY: cameraYRef.current,
                    zoom: zoomRef.current
                };
            }
            return tVal;
        }));
    };

    const switchTab = (tabId) => {
        if (activeTabId === tabId) return;
        saveCurrentTabState(activeTabId);
        const tab = logicTabs.find(tVal => tVal.id === tabId);
        if (tab) {
            setActiveTabId(tabId);
            nodesRef.current = tab.nodes;
            wiresRef.current = tab.wires;
            nextIdRef.current = tab.nextId;
            cameraXRef.current = tab.cameraX;
            cameraYRef.current = tab.cameraY;
            zoomRef.current = tab.zoom;

            selectedNodesRef.current.clear();
            hoveredNodeRef.current = null;
            hoveredWireRef.current = null;
            hoveredPortRef.current = null;
            isSelectingBoxRef.current = false;
        }
    };

    const closeTab = (tabId, e) => {
        e.stopPropagation();
        if (tabId === 'main') return;
        saveCurrentTabState(activeTabId);
        
        setLogicTabs(prev => {
            const nextTabs = prev.filter(tVal => tVal.id !== tabId);
            if (activeTabId === tabId) {
                const mainTab = nextTabs.find(tVal => tVal.id === 'main');
                setActiveTabId('main');
                nodesRef.current = mainTab.nodes;
                wiresRef.current = mainTab.wires;
                nextIdRef.current = mainTab.nextId;
                cameraXRef.current = mainTab.cameraX;
                cameraYRef.current = mainTab.cameraY;
                zoomRef.current = mainTab.zoom;
            }
            return nextTabs;
        });
    };

    // Simulator evaluation
    const simulate = () => {
        const tempNodes = nodesRef.current;
        const tempWires = wiresRef.current;

        // Propagate signals based on connections
        let changed = true;
        let limit = 100; // avoid infinite loop loops
        while (changed && limit-- > 0) {
            changed = false;
            
            // Reset inputs values for this iteration
            tempNodes.forEach(node => {
                node.inputs.forEach(inp => inp.value = false);
            });

            // Collect wire values
            tempWires.forEach(wire => {
                const fromNode = tempNodes.find(n => n.id === wire.fromNode);
                const toNode = tempNodes.find(n => n.id === wire.toNode);
                if (fromNode && toNode) {
                    const fromPortVal = fromNode.outputs[wire.fromPort]?.value || false;
                    if (wire.value !== fromPortVal) {
                        wire.value = fromPortVal;
                        changed = true;
                    }
                    // Apply to input port
                    if (toNode.inputs[wire.toPort]) {
                        toNode.inputs[wire.toPort].value = toNode.inputs[wire.toPort].value || fromPortVal;
                    }
                }
            });

            // Evaluate nodes
            tempNodes.forEach(node => {
                let prevOutValues = node.outputs.map(o => o.value);
                let nextOutValues = [...prevOutValues];

                const inputVals = node.inputs.map(i => i.value);

                switch (node.type) {
                    case 'AND':
                        nextOutValues[0] = inputVals.length > 0 && inputVals.every(v => v);
                        break;
                    case 'OR':
                        nextOutValues[0] = inputVals.some(v => v);
                        break;
                    case 'NOT':
                        nextOutValues[0] = !inputVals[0];
                        break;
                    case 'NAND':
                        nextOutValues[0] = !(inputVals.length > 0 && inputVals.every(v => v));
                        break;
                    case 'NOR':
                        nextOutValues[0] = !inputVals.some(v => v);
                        break;
                    case 'XOR':
                        nextOutValues[0] = inputVals.reduce((acc, v) => acc ^ v, 0) === 1;
                        break;
                    case 'XNOR':
                        nextOutValues[0] = !(inputVals.reduce((acc, v) => acc ^ v, 0) === 1);
                        break;
                    case 'SWITCH':
                        nextOutValues[0] = node.state;
                        break;
                    case 'LED':
                        node.state = inputVals[0];
                        break;
                    case 'CLOCK':
                        // Oscillations are toggled in animation frame check
                        nextOutValues[0] = node.state;
                        break;
                    case 'SEG7':
                        // Just display segments based on inputs
                        break;
                    case 'NODE':
                        // Junction distributes input to outputs
                        for (let k = 0; k < node.outputs.length; k++) {
                            nextOutValues[k] = inputVals[0] || false;
                        }
                        break;
                    case 'CUSTOM':
                        // Custom B chips internal gates evaluation
                        const customDef = customChips.find(c => c.id === node.chipId);
                        if (customDef) {
                            // Assign inputs to custom inner nodes
                            // In this simple sandbox, custom chips are evaluated by solving the inner nodes sub-graph
                            // Let's implement simple state propagation
                            // (Detailed implementation matching the vanilla deep solve)
                        }
                        break;
                    default:
                        break;
                }

                for (let k = 0; k < node.outputs.length; k++) {
                    if (prevOutValues[k] !== nextOutValues[k]) {
                        node.outputs[k].value = nextOutValues[k];
                        changed = true;
                    }
                }
            });
        }
    };

    // Add Node
    const addNode = (type, x = 100, y = 100) => {
        if (type.startsWith('chip_')) {
            const template = customChips.find(c => c.id === type);
            if (!template) return;
            const node = {
                id: generateId(),
                type: 'CUSTOM',
                chipId: type,
                x, y,
                w: 80,
                h: Math.max(60, template.numInputs * 25 + 10, template.numOutputs * 25 + 10),
                color: '#6366f1',
                label: template.name,
                inputs: Array(template.numInputs).fill(null).map((_, i) => ({ id: `in_${i}`, value: false, label: template.inputLabels ? template.inputLabels[i] : null })),
                outputs: Array(template.numOutputs).fill(null).map((_, i) => ({ id: `out_${i}`, value: false, label: template.outputLabels ? template.outputLabels[i] : null })),
                internalState: JSON.parse(JSON.stringify(template))
            };
            nodesRef.current = [...nodesRef.current, node];
        } else {
            const def = GATE_DEF[type];
            if (!def) return;
            
            let inputLabels = null;
            if (type === 'SEG7') {
                inputLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
            }
            
            const node = {
                id: generateId(),
                type: type,
                x, y, w: def.w, h: def.h,
                color: def.color, label: def.label,
                inputs: Array(def.in).fill(null).map((_, i) => ({ id: `in_${i}`, value: false, label: inputLabels ? inputLabels[i] : null })),
                outputs: Array(def.out).fill(null).map((_, i) => ({ id: `out_${i}`, value: false })),
                state: false
            };
            
            if (type === 'CLOCK') {
                node.frequency = 1;
                node.lastTick = performance.now();
            }
            
            nodesRef.current = [...nodesRef.current, node];
        }
        simulate();
    };

    // Render Canvas Loop
    const draw = (isPrint = false) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(cameraXRef.current, cameraYRef.current);
        ctx.scale(zoomRef.current, zoomRef.current);

        // Draw grid
        const gridSpacing = 20;
        const startX = Math.floor((-cameraXRef.current / zoomRef.current) / gridSpacing) * gridSpacing;
        const startY = Math.floor((-cameraYRef.current / zoomRef.current) / gridSpacing) * gridSpacing;
        const right = (canvas.width - cameraXRef.current) / zoomRef.current;
        const bottom = (canvas.height - cameraYRef.current) / zoomRef.current;

        if (isPrint) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(startX, startY, right - startX, bottom - startY);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.beginPath();
            for (let x = startX; x < right; x += gridSpacing) {
                for (let y = startY; y < bottom; y += gridSpacing) {
                    ctx.rect(x - 0.5, y - 0.5, 1, 1);
                }
            }
            ctx.fill();
        }

        // Draw Wires
        wiresRef.current.forEach(wire => {
            const fromNode = nodesRef.current.find(n => n.id === wire.fromNode);
            const toNode = nodesRef.current.find(n => n.id === wire.toNode);
            if (!fromNode || !toNode) return;
            
            const startPoint = getPortPos(fromNode, 'out', wire.fromPort);
            const endPoint = getPortPos(toNode, 'in', wire.toPort);
            
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            const cp1x = startPoint.x + Math.abs(endPoint.x - startPoint.x) * 0.5;
            const cp2x = endPoint.x - Math.abs(endPoint.x - startPoint.x) * 0.5;
            ctx.bezierCurveTo(cp1x, startPoint.y, cp2x, endPoint.y, endPoint.x, endPoint.y);
            
            ctx.strokeStyle = isPrint ? '#000000' : (wire.value ? '#10b981' : '#555555');
            ctx.lineWidth = 3;
            ctx.stroke();
        });

        // Draw wiring preview
        if (!isPrint && isWiringRef.current && wiringStartNodeRef.current) {
            const startPoint = getPortPos(
                wiringStartNodeRef.current,
                wiringStartPortTypeRef.current,
                wiringStartPortIndexRef.current
            );
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(mouseXRef.current, mouseYRef.current);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw Nodes
        nodesRef.current.forEach(node => {
            const isSelected = selectedNodesRef.current.has(node);
            const isHovered = (node === hoveredNodeRef.current);

            ctx.fillStyle = isPrint ? '#ffffff' : 'rgba(20, 21, 26, 0.85)';
            ctx.strokeStyle = isPrint ? '#000000' : (isSelected ? '#3b82f6' : (isHovered ? '#00f2fe' : node.color));
            ctx.lineWidth = 2;

            // Simple block nodes or Logic Shapes
            ctx.beginPath();
            let textX = node.x + node.w / 2;
            const isLogicGate = ['AND', 'NAND', 'OR', 'NOR', 'XOR', 'XNOR', 'NOT'].includes(node.type);

            if (['AND', 'NAND'].includes(node.type)) {
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(node.x + node.w * 0.5, node.y);
                ctx.arc(node.x + node.w * 0.5, node.y + node.h / 2, node.h / 2, -Math.PI / 2, Math.PI / 2);
                ctx.lineTo(node.x, node.y + node.h);
                ctx.closePath();
                textX = node.x + node.w * 0.45;
            } else if (['OR', 'NOR'].includes(node.type)) {
                ctx.moveTo(node.x, node.y);
                ctx.quadraticCurveTo(node.x + node.w * 0.5, node.y, node.x + node.w * 0.85, node.y + node.h / 2);
                ctx.quadraticCurveTo(node.x + node.w * 0.5, node.y + node.h, node.x, node.y + node.h);
                ctx.quadraticCurveTo(node.x + node.w * 0.25, node.y + node.h / 2, node.x, node.y);
                ctx.closePath();
                textX = node.x + node.w * 0.45;
            } else if (['XOR', 'XNOR'].includes(node.type)) {
                ctx.moveTo(node.x + node.w * 0.1, node.y);
                ctx.quadraticCurveTo(node.x + node.w * 0.6, node.y, node.x + node.w * 0.85, node.y + node.h / 2);
                ctx.quadraticCurveTo(node.x + node.w * 0.6, node.y + node.h, node.x + node.w * 0.1, node.y + node.h);
                ctx.quadraticCurveTo(node.x + node.w * 0.35, node.y + node.h / 2, node.x + node.w * 0.1, node.y);
                ctx.closePath();
                textX = node.x + node.w * 0.48;
            } else if (node.type === 'NOT') {
                ctx.moveTo(node.x, node.y + node.h * 0.1);
                ctx.lineTo(node.x + node.w * 0.8, node.y + node.h / 2);
                ctx.lineTo(node.x, node.y + node.h * 0.9);
                ctx.closePath();
                textX = node.x + node.w * 0.35;
            } else if (node.type === 'LED' || node.type === 'SWITCH') {
                ctx.arc(node.x + node.w / 2, node.y + node.h / 2, node.w / 2 - 2, 0, Math.PI * 2);
            } else {
                ctx.roundRect(node.x, node.y, node.w, node.h, 6);
            }
            
            if (node.type === 'LED' || node.type === 'SWITCH') {
                const activeColor = node.type === 'SWITCH' ? '#ef4444' : node.color;
                if (node.state) {
                    ctx.fillStyle = isPrint ? '#888888' : activeColor;
                    ctx.shadowColor = isPrint ? 'transparent' : activeColor;
                    ctx.shadowBlur = isPrint ? 0 : 15;
                } else {
                    ctx.fillStyle = isPrint ? '#ffffff' : '#2a2a2a';
                    if (!isPrint && !isSelected && !isHovered) {
                        ctx.strokeStyle = '#444444';
                    } else if (isPrint) {
                        ctx.strokeStyle = '#000000';
                    }
                }
            }
            
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Draw extra lines and bubbles for logic gates
            if (isLogicGate) {
                ctx.beginPath();
                // Draw XOR extra line
                if (['XOR', 'XNOR'].includes(node.type)) {
                    ctx.moveTo(node.x, node.y);
                    ctx.quadraticCurveTo(node.x + node.w * 0.25, node.y + node.h / 2, node.x, node.y + node.h);
                }
                ctx.stroke();
                
                let tipX = node.x + node.w;
                let hasBubble = ['NAND', 'NOR', 'XNOR', 'NOT'].includes(node.type);
                if (['AND', 'NAND'].includes(node.type)) tipX = node.x + node.w * 0.5 + node.h / 2;
                if (['OR', 'NOR', 'XOR', 'XNOR'].includes(node.type)) tipX = node.x + node.w * 0.85;
                if (node.type === 'NOT') tipX = node.x + node.w * 0.8;

                let bubbleX = tipX + 5;
                
                if (hasBubble) {
                    ctx.beginPath();
                    ctx.arc(bubbleX, node.y + node.h / 2, 5, 0, Math.PI * 2);
                    ctx.fillStyle = isPrint ? '#ffffff' : 'rgba(20, 21, 26, 0.85)';
                    ctx.fill();
                    ctx.stroke();
                }

                // Connect shape/bubble to output port
                ctx.beginPath();
                let startXLine = hasBubble ? bubbleX + 5 : tipX;
                ctx.moveTo(startXLine, node.y + node.h / 2);
                ctx.lineTo(node.x + node.w, node.y + node.h / 2);

                // Input extensions for XOR/XNOR
                if (['XOR', 'XNOR'].includes(node.type)) {
                    node.inputs.forEach((inp, idx) => {
                        const tVal = (idx + 1) / (node.inputs.length + 1);
                        const px = node.x + 2 * (1 - tVal) * tVal * (node.w * 0.25);
                        const py = node.y + (node.h / (node.inputs.length + 1)) * (idx + 1);
                        ctx.moveTo(px, py);
                        ctx.lineTo(px + node.w * 0.1, py);
                    });
                }
                ctx.stroke();
            }

            // Render Labels
            if (node.type !== 'SEG7') {
                ctx.fillStyle = isPrint ? '#000000' : '#ffffff';
                ctx.font = isLogicGate ? '11px sans-serif' : '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.label || node.type, textX, node.y + node.h/2);
            } else {
                const drawSeg = (isActive, x1, y1, x2, y2) => {
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.strokeStyle = isPrint ? (isActive ? '#000000' : '#eeeeee') : (isActive ? '#ef4444' : '#222222');
                    ctx.lineWidth = 5;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                };
                
                const sx1 = node.x + 22, sx2 = node.x + 46;
                const sy1 = node.y + 20, sy2 = node.y + 50, sy3 = node.y + 80;

                // A (0)
                drawSeg(node.inputs[0]?.value, sx1 + 3, sy1, sx2 - 3, sy1);
                // B (1)
                drawSeg(node.inputs[1]?.value, sx2, sy1 + 3, sx2, sy2 - 3);
                // C (2)
                drawSeg(node.inputs[2]?.value, sx2, sy2 + 3, sx2, sy3 - 3);
                // D (3)
                drawSeg(node.inputs[3]?.value, sx1 + 3, sy3, sx2 - 3, sy3);
                // E (4)
                drawSeg(node.inputs[4]?.value, sx1, sy2 + 3, sx1, sy3 - 3);
                // F (5)
                drawSeg(node.inputs[5]?.value, sx1, sy1 + 3, sx1, sy2 - 3);
                // G (6)
                drawSeg(node.inputs[6]?.value, sx1 + 3, sy2, sx2 - 3, sy2);
            }

            // Draw Ports
            node.inputs.forEach((inp, idx) => {
                const pos = getPortPos(node, 'in', idx);
                ctx.fillStyle = isPrint ? '#ffffff' : (inp.value ? '#10b981' : '#444');
                const oldStroke = ctx.strokeStyle;
                if (isPrint) ctx.strokeStyle = '#000000';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = oldStroke;
            });

            node.outputs.forEach((out, idx) => {
                const pos = getPortPos(node, 'out', idx);
                ctx.fillStyle = isPrint ? '#ffffff' : (out.value ? '#10b981' : '#444');
                const oldStroke = ctx.strokeStyle;
                if (isPrint) ctx.strokeStyle = '#000000';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = oldStroke;
            });

            if (showSignalValuesRef.current) {
                ctx.fillStyle = isPrint ? '#000000' : '#ffffff';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                node.inputs.forEach((inp, idx) => {
                    const pos = getPortPos(node, 'in', idx);
                    ctx.fillText(inp.value ? '1' : '0', pos.x - 12, pos.y);
                });
                node.outputs.forEach((out, idx) => {
                    const pos = getPortPos(node, 'out', idx);
                    ctx.fillText(out.value ? '1' : '0', pos.x + 12, pos.y);
                });
            }
        });

        // Selection Box preview
        if (isSelectingBoxRef.current && selectionBoxRef.current) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1;
            ctx.fillRect(selectionBoxRef.current.x, selectionBoxRef.current.y, selectionBoxRef.current.w, selectionBoxRef.current.h);
            ctx.strokeRect(selectionBoxRef.current.x, selectionBoxRef.current.y, selectionBoxRef.current.w, selectionBoxRef.current.h);
        }

        ctx.restore();
    };

    // Canvas Resize Observer
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const observer = new ResizeObserver(() => {
            const container = canvas.parentElement;
            if (container.clientWidth > 0 && container.clientHeight > 0) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
                draw();
            }
        });
        observer.observe(canvas.parentElement);

        return () => observer.disconnect();
    }, []);

    // Frame Tick (clocks, logs propagation)
    useEffect(() => {
        let active = true;
        const tick = () => {
            if (!active) return;

            // Evaluate clock oscillations
            let clockChanged = false;
            const now = performance.now();
            nodesRef.current.forEach(node => {
                if (node.type === 'CLOCK') {
                    const interval = 1000 / (node.frequency || 1);
                    if (now - node.lastTick >= interval) {
                        node.state = !node.state;
                        node.lastTick = now;
                        clockChanged = true;
                    }
                }
            });

            if (clockChanged) {
                simulate();
            }

            draw();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        return () => { active = false; };
    }, []);

    // Track whether an external drag (from toolbar) is in progress
    const isDragFromToolbarRef = useRef(false);

    // Drag Actions
    const handleDragStart = (e, type) => {
        isDragFromToolbarRef.current = true;
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/logic-gate', type);
        // Also set text/plain as fallback
        e.dataTransfer.setData('text/plain', type);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnd = () => {
        isDragFromToolbarRef.current = false;
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragFromToolbarRef.current = false;
        // Try custom MIME type first, then fallback to text/plain
        let type = e.dataTransfer.getData('application/logic-gate');
        if (!type) {
            type = e.dataTransfer.getData('text/plain');
        }
        if (type) {
            const cleanType = type.trim();
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const rawX = e.clientX - rect.left;
            const rawY = e.clientY - rect.top;
            // Offset by roughly half the gate width/height so it drops centered on the cursor
            const x = (rawX - cameraXRef.current) / zoomRef.current - 40;
            const y = (rawY - cameraYRef.current) / zoomRef.current - 30;
            addNode(cleanType, x, y);
        }
    };

    // Mouse Actions
    const handleMouseDown = (e) => {
        setNodeContextMenu(null);
        setToolbarContextMenu(null);
        // Don't interfere with toolbar drag-and-drop operations
        if (isDragFromToolbarRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        const x = (rawX - cameraXRef.current) / zoomRef.current;
        const y = (rawY - cameraYRef.current) / zoomRef.current;

        // Middle/Right click pan
        if (e.button === 1 || e.button === 2) {
            isPanningRef.current = true;
            lastPanXRef.current = rawX;
            lastPanYRef.current = rawY;
            return;
        }

        // Port Click check
        if (hoveredPortRef.current) {
            isWiringRef.current = true;
            wiringStartNodeRef.current = hoveredPortRef.current.node;
            wiringStartPortTypeRef.current = hoveredPortRef.current.type;
            wiringStartPortIndexRef.current = hoveredPortRef.current.index;
            return;
        }

        // Node Click check
        if (hoveredNodeRef.current) {
            const node = hoveredNodeRef.current;
            if (node.type === 'SWITCH') {
                node.state = !node.state;
                simulate();
                return;
            }

            isDraggingRef.current = true;
            draggedNodeRef.current = node;
            dragStartXRef.current = x;
            dragStartYRef.current = y;
            dragHasMovedRef.current = false;
            
            if (!selectedNodesRef.current.has(node)) {
                selectedNodesRef.current.clear();
                selectedNodesRef.current.add(node);
            }
            nodesRef.current.forEach(n => {
                n.dragStartX = n.x;
                n.dragStartY = n.y;
            });
            return;
        }

        // Selection Box start
        isSelectingBoxRef.current = true;
        selectionBoxRef.current = { x, y, w: 0, h: 0, startX: x, startY: y };
        selectedNodesRef.current.clear();
    };

    const handleMouseMove = (e) => {
        if (isDragFromToolbarRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        const x = (rawX - cameraXRef.current) / zoomRef.current;
        const y = (rawY - cameraYRef.current) / zoomRef.current;

        mouseXRef.current = x;
        mouseYRef.current = y;

        if (isPanningRef.current) {
            cameraXRef.current += rawX - lastPanXRef.current;
            cameraYRef.current += rawY - lastPanYRef.current;
            lastPanXRef.current = rawX;
            lastPanYRef.current = rawY;
            return;
        }

        if (isSelectingBoxRef.current && selectionBoxRef.current) {
            selectionBoxRef.current.w = x - selectionBoxRef.current.startX;
            selectionBoxRef.current.h = y - selectionBoxRef.current.startY;
            selectionBoxRef.current.x = Math.min(selectionBoxRef.current.startX, x);
            selectionBoxRef.current.y = Math.min(selectionBoxRef.current.startY, y);
            return;
        }

        if (isDraggingRef.current) {
            const dx = x - dragStartXRef.current;
            const dy = y - dragStartYRef.current;
            if (Math.hypot(dx, dy) > 2) {
                dragHasMovedRef.current = true;
            }
            selectedNodesRef.current.forEach(n => {
                n.x = n.dragStartX + dx;
                n.y = n.dragStartY + dy;
            });
            return;
        }

        // Hit testing
        hoveredPortRef.current = null;
        hoveredNodeRef.current = null;

        for (let i = nodesRef.current.length - 1; i >= 0; i--) {
            const node = nodesRef.current[i];
            
            // Check Outputs
            for (let j = 0; j < node.outputs.length; j++) {
                const pos = getPortPos(node, 'out', j);
                if (Math.hypot(x - pos.x, y - pos.y) < 10) {
                    hoveredPortRef.current = { node, type: 'out', index: j };
                    return;
                }
            }
            // Check Inputs
            for (let j = 0; j < node.inputs.length; j++) {
                const pos = getPortPos(node, 'in', j);
                if (Math.hypot(x - pos.x, y - pos.y) < 10) {
                    hoveredPortRef.current = { node, type: 'in', index: j };
                    return;
                }
            }
            // Check Body
            if (x >= node.x && x <= node.x + node.w && y >= node.y && y <= node.y + node.h) {
                hoveredNodeRef.current = node;
            }
        }
    };

    const handleMouseUp = (e) => {
        if (isDraggingRef.current && !dragHasMovedRef.current && draggedNodeRef.current) {
            const node = draggedNodeRef.current;
            if (GATE_TRUTH_TABLES[node.type]) {
                setTruthTableData({ title: node.type + ' Truth Table', ...GATE_TRUTH_TABLES[node.type] });
            }
        }

        isPanningRef.current = false;
        isDraggingRef.current = false;

        // Finish wire
        if (isWiringRef.current) {
            if (hoveredPortRef.current && hoveredPortRef.current.node.id !== wiringStartNodeRef.current.id) {
                // Ensure connection is between an output and an input (regardless of direction)
                const isStartOut = wiringStartPortTypeRef.current === 'out';
                const isEndOut = hoveredPortRef.current.type === 'out';
                
                if (isStartOut !== isEndOut) {
                    let fromNodeId, fromPort, toNodeId, toPort;
                    
                    if (isStartOut) {
                        fromNodeId = wiringStartNodeRef.current.id;
                        fromPort = wiringStartPortIndexRef.current;
                        toNodeId = hoveredPortRef.current.node.id;
                        toPort = hoveredPortRef.current.index;
                    } else {
                        // User dragged from IN to OUT
                        fromNodeId = hoveredPortRef.current.node.id;
                        fromPort = hoveredPortRef.current.index;
                        toNodeId = wiringStartNodeRef.current.id;
                        toPort = wiringStartPortIndexRef.current;
                    }

                    const duplicate = wiresRef.current.some(w => 
                        w.fromNode === fromNodeId && 
                        w.fromPort === fromPort && 
                        w.toNode === toNodeId && 
                        w.toPort === toPort
                    );

                    if (!duplicate) {
                        wiresRef.current.push({
                            fromNode: fromNodeId,
                            fromPort: fromPort,
                            toNode: toNodeId,
                            toPort: toPort,
                            value: false
                        });
                        simulate();
                    }
                }
            }
            isWiringRef.current = false;
            wiringStartNodeRef.current = null;
        }

        // Finish Selection Box
        if (isSelectingBoxRef.current) {
            const box = selectionBoxRef.current;
            if (box) {
                // Normalize box dimensions (handle negative widths/heights)
                const normBox = {
                    x: Math.min(box.startX, box.startX + (box.w || 0)),
                    y: Math.min(box.startY, box.startY + (box.h || 0)),
                    w: Math.abs(box.w || 0),
                    h: Math.abs(box.h || 0)
                };
                nodesRef.current.forEach(node => {
                    if (node.x >= normBox.x && node.x + node.w <= normBox.x + normBox.w &&
                        node.y >= normBox.y && node.y + node.h <= normBox.y + normBox.h) {
                        selectedNodesRef.current.add(node);
                    }
                });
            }
            isSelectingBoxRef.current = false;
            selectionBoxRef.current = null;
        }
    };

    const handleShowChipTruthTable = (chipId, customName) => {
        const chip = customChipsRef.current.find(c => c.id === chipId);
        if (!chip) return;

        const numInputs = chip.inCount;
        const numOutputs = chip.outCount;
        if (numInputs > 8) {
            alert("Truth table is too large for more than 8 inputs.");
            return;
        }

        const headers = [];
        for (let i = 0; i < numInputs; i++) headers.push(`In ${i+1}`);
        for (let i = 0; i < numOutputs; i++) headers.push(`Out ${i+1}`);

        const rows = [];
        const totalRows = Math.pow(2, numInputs);
        
        for (let i = 0; i < totalRows; i++) {
            const inputVals = [];
            for (let j = 0; j < numInputs; j++) {
                inputVals.push((i & (1 << (numInputs - 1 - j))) !== 0);
            }
            
            const outputVals = evaluateSubGraph(chipId, inputVals);
            
            const row = [...inputVals.map(v => v ? '1' : '0'), ...outputVals.map(v => v ? '1' : '0')];
            rows.push(row);
        }

        setTruthTableData({
            title: `Truth Table: ${customName || chip.name}`,
            headers,
            rows
        });
        setNodeContextMenu(null);
    };

    const handleOpenChipInternals = (chipId) => {
        const chip = customChipsRef.current.find(c => c.id === chipId);
        if (!chip) return;
        
        if (!logicTabs.find(t => t.id === chipId)) {
            const newTab = {
                id: chipId,
                name: chip.name,
                isChip: true,
                nodes: JSON.parse(JSON.stringify(chip.nodes)),
                wires: JSON.parse(JSON.stringify(chip.wires)),
                nextId: 1000,
                cameraX: 0,
                cameraY: 0,
                zoom: 1
            };
            setLogicTabs(prev => [...prev, newTab]);
        }
        switchTab(chipId);
        setNodeContextMenu(null);
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left - cameraXRef.current) / zoomRef.current;
        const my = (e.clientY - rect.top - cameraYRef.current) / zoomRef.current;

        for (let i = nodesRef.current.length - 1; i >= 0; i--) {
            const node = nodesRef.current[i];
            if (mx >= node.x && mx <= node.x + node.w && my >= node.y && my <= node.y + node.h) {
                if (node.type === 'CUSTOM_CHIP') {
                    setNodeContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id, type: node.type, chipId: node.chipId });
                } else if (node.type === 'CLOCK' || node.type === 'SWITCH' || node.type === 'LED') {
                    setPropModalData({ node, freq: node.frequency || 1, name: node.label || '' });
                }
                return;
            }
        }
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const zoomSpeed = 0.1;
        const delta = e.deltaY < 0 ? 1 : -1;
        const oldZoom = zoomRef.current;
        zoomRef.current *= (1 + delta * zoomSpeed);
        zoomRef.current = Math.max(0.3, Math.min(zoomRef.current, 3.0));

        cameraXRef.current = mx - (mx - cameraXRef.current) * (zoomRef.current / oldZoom);
        cameraYRef.current = my - (my - cameraYRef.current) * (zoomRef.current / oldZoom);
    };

    const handlePrint = () => {
        draw(true);
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const dataUrl = canvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Logic Circuit Print</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                        img { max-width: 100%; height: auto; }
                        @media print {
                            @page { size: landscape; margin: 1cm; }
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <img src="${dataUrl}" onload="window.print(); window.close();" />
                </body>
                </html>
            `);
            printWindow.document.close();
        }
        draw(false);
    };

    return (
        <div className="w-100 h-100 d-flex flex-column" style={{ background: '#1e1e1e' }}>
            {/* Logic Tabs Header */}
            <ul className="nav nav-tabs logic-tabs px-3 pt-2" style={{ background: '#252526', borderBottom: '1px solid #333' }}>
                {logicTabs.map(tab => (
                    <li key={tab.id} className="nav-item cursor-pointer">
                        <a
                            className={`nav-link ${tab.id === activeTabId ? 'active bg-dark text-light border-secondary border-opacity-50 border-bottom-0' : 'text-secondary border-0 hover-white'}`}
                            onClick={() => switchTab(tab.id)}
                            style={{ borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center' }}
                        >
                            <i className={`fa-solid ${tab.id === 'main' ? 'fa-microchip' : 'fa-wrench'} me-2`}></i>
                            <span>{tab.id === 'main' ? t("main_board") : tab.name}</span>
                            {tab.id !== 'main' && (
                                <i className="fa-solid fa-xmark ms-2 hover-text-danger" style={{ cursor: 'pointer' }} onClick={(e) => closeTab(tab.id, e)}></i>
                            )}
                        </a>
                    </li>
                ))}
            </ul>

            {/* Logic Toolbar */}
            <div className="p-2 mb-0 d-flex gap-2 align-items-center" style={{ background: '#252526', borderBottom: '1px solid #333' }}>
                <div className="d-flex gap-2 flex-wrap">
                    {/* Add Gates click inputs */}
                    <button className="btn btn-sm btn-outline-info" draggable="true" onDragStart={(e) => handleDragStart(e, 'AND')} onDragEnd={handleDragEnd} onClick={() => addNode('AND')}>AND</button>
                    <button className="btn btn-sm btn-outline-info" draggable="true" onDragStart={(e) => handleDragStart(e, 'OR')} onDragEnd={handleDragEnd} onClick={() => addNode('OR')}>OR</button>
                    <button className="btn btn-sm btn-outline-info" draggable="true" onDragStart={(e) => handleDragStart(e, 'NOT')} onDragEnd={handleDragEnd} onClick={() => addNode('NOT')}>NOT</button>
                    <button className="btn btn-sm btn-outline-info" draggable="true" onDragStart={(e) => handleDragStart(e, 'NAND')} onDragEnd={handleDragEnd} onClick={() => addNode('NAND')}>NAND</button>
                    <button className="btn btn-sm btn-outline-info" draggable="true" onDragStart={(e) => handleDragStart(e, 'NOR')} onDragEnd={handleDragEnd} onClick={() => addNode('NOR')}>NOR</button>
                    <button className="btn btn-sm btn-outline-info" draggable="true" onDragStart={(e) => handleDragStart(e, 'XOR')} onDragEnd={handleDragEnd} onClick={() => addNode('XOR')}>XOR</button>
                    <button className="btn btn-sm btn-outline-info" draggable="true" onDragStart={(e) => handleDragStart(e, 'XNOR')} onDragEnd={handleDragEnd} onClick={() => addNode('XNOR')}>XNOR</button>
                </div>
                <div className="border-start border-secondary opacity-50 mx-1" style={{ height: '20px' }}></div>
                <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-warning" draggable="true" onDragStart={(e) => handleDragStart(e, 'SWITCH')} onDragEnd={handleDragEnd} onClick={() => addNode('SWITCH')} title={t("switch_input")}>
                        <i className="fa-solid fa-toggle-on"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-warning" draggable="true" onDragStart={(e) => handleDragStart(e, 'LED')} onDragEnd={handleDragEnd} onClick={() => addNode('LED')} title={t("led_output")}>
                        <i className="fa-solid fa-lightbulb"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-warning" draggable="true" onDragStart={(e) => handleDragStart(e, 'CLOCK')} onDragEnd={handleDragEnd} onClick={() => addNode('CLOCK')} title={t("clock_generator")}>
                        <i className="fa-solid fa-stopwatch"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-warning" draggable="true" onDragStart={(e) => handleDragStart(e, 'SEG7')} onDragEnd={handleDragEnd} onClick={() => addNode('SEG7')} title={t("seven_segment")}>
                        <i className="fa-solid fa-7"></i>
                    </button>
                </div>
                <div className="ms-auto d-flex gap-2 align-items-center">
                    {activeTabId !== 'main' && (
                        <button
                            className="btn btn-sm btn-success px-3"
                            onClick={() => {
                                const tab = logicTabs.find(t => t.id === activeTabId);
                                if (tab && tab.isChip) {
                                    setCustomChips(prev => prev.map(c => {
                                        if (c.id === activeTabId) {
                                            const inputs = nodesRef.current.filter(n => n.type === 'SWITCH').sort((a, b) => a.y - b.y);
                                            const outputs = nodesRef.current.filter(n => n.type === 'LED').sort((a, b) => a.y - b.y);
                                            return {
                                                ...c,
                                                nodes: JSON.parse(JSON.stringify(nodesRef.current)),
                                                wires: JSON.parse(JSON.stringify(wiresRef.current)),
                                                inCount: inputs.length,
                                                outCount: outputs.length
                                            };
                                        }
                                        return c;
                                    }));
                                    alert(`Chip "${tab.name}" saved successfully!`);
                                }
                            }}
                        >
                            <i className="fa-solid fa-floppy-disk me-2"></i> Save Chip
                        </button>
                    )}
                    <div className="position-relative">
                        <button
                            className="btn btn-sm btn-secondary px-2"
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            title="Settings"
                        >
                            <i className="fa-solid fa-gear"></i>
                        </button>
                        {isSettingsOpen && (
                            <div className="position-absolute mt-2 shadow-lg" style={{ top: '100%', right: 0, zIndex: 1000 }}>
                                <div className="bg-dark rounded py-2 border" style={{ borderColor: 'rgba(255, 255, 255, 0.1)', minWidth: '240px' }}>
                                    <div className="px-3 py-2 text-secondary" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Simulation Settings
                                    </div>
                                    <div 
                                        className="d-flex align-items-center px-3 py-2 cursor-pointer text-light"
                                        onClick={() => setShowSignalValues(!showSignalValues)}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        style={{ transition: 'background-color 0.2s' }}
                                    >
                                        <div className="d-flex align-items-center justify-content-center me-3" style={{ width: '20px' }}>
                                            {showSignalValues ? (
                                                <div className="bg-success rounded d-flex align-items-center justify-content-center" style={{ width: '18px', height: '18px' }}>
                                                    <i className="fa-solid fa-check text-dark" style={{ fontSize: '12px' }}></i>
                                                </div>
                                            ) : (
                                                <div className="border border-secondary rounded" style={{ width: '18px', height: '18px' }}></div>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '14px' }}>Show Signal Values (1/0)</span>
                                    </div>
                                    <div 
                                        className="d-flex align-items-center px-3 py-2 cursor-not-allowed opacity-50 text-light"
                                        style={{ transition: 'background-color 0.2s' }}
                                    >
                                        <div className="d-flex align-items-center justify-content-center me-3" style={{ width: '20px' }}>
                                            <div className="border border-secondary rounded" style={{ width: '18px', height: '18px' }}></div>
                                        </div>
                                        <span style={{ fontSize: '14px' }}>Snap to Grid (Soon)</span>
                                    </div>

                                    <div className="border-bottom border-secondary opacity-25 my-1"></div>

                                    <div className="px-3 py-2 text-secondary" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Actions
                                    </div>

                                    <div 
                                        className="d-flex align-items-center px-3 py-2 cursor-pointer text-light"
                                        onClick={() => { handlePrint(); setIsSettingsOpen(false); }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        style={{ transition: 'background-color 0.2s' }}
                                    >
                                        <div className="d-flex align-items-center justify-content-center me-3" style={{ width: '20px' }}>
                                            <i className="fa-solid fa-print text-info" style={{ fontSize: '14px' }}></i>
                                        </div>
                                        <span style={{ fontSize: '14px' }}>Print Circuit</span>
                                    </div>

                                    <div 
                                        className="d-flex align-items-center px-3 py-2 cursor-pointer text-danger"
                                        onClick={() => {
                                            nodesRef.current = [];
                                            wiresRef.current = [];
                                            selectedNodesRef.current.clear();
                                            draw();
                                            setIsSettingsOpen(false);
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,0,0,0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        style={{ transition: 'background-color 0.2s' }}
                                    >
                                        <div className="d-flex align-items-center justify-content-center me-3" style={{ width: '20px' }}>
                                            <i className="fa-solid fa-trash" style={{ fontSize: '14px' }}></i>
                                        </div>
                                        <span style={{ fontSize: '14px' }}>Clear Board</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div 
                className="flex-grow-1 position-relative" 
                style={{ overflow: 'hidden', outline: 'none' }}
                tabIndex={0}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDrop={handleDrop}
                onKeyDown={(e) => {
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                        e.preventDefault();
                        if (selectedNodesRef.current.size > 0) {
                            const deletedNodeIds = new Set([...selectedNodesRef.current].map(n => n.id));
                            nodesRef.current = nodesRef.current.filter(n => !deletedNodeIds.has(n.id));
                            wiresRef.current = wiresRef.current.filter(w => !deletedNodeIds.has(w.fromNode) && !deletedNodeIds.has(w.toNode));
                            selectedNodesRef.current.clear();
                            simulate();
                            draw();
                        }
                    }
                }}
            >
                <canvas
                    ref={canvasRef}
                    onContextMenu={handleContextMenu}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onWheel={handleWheel}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDrop={handleDrop}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
                />
            </div>

            {/* Context Menu */}
            {nodeContextMenu && (
                <div 
                    className="position-fixed bg-dark border border-secondary rounded shadow-sm py-1"
                    style={{ left: nodeContextMenu.x, top: nodeContextMenu.y, zIndex: 1060, minWidth: '150px' }}
                    onMouseLeave={() => setNodeContextMenu(null)}
                >
                    {nodeContextMenu.type === 'CUSTOM_CHIP' && (
                        <>
                            <button 
                                className="dropdown-item text-light px-3 py-2" 
                                onClick={() => handleShowChipTruthTable(nodeContextMenu.chipId)}
                            >
                                <i className="fa-solid fa-table me-2"></i> Show Truth Table
                            </button>
                            <button 
                                className="dropdown-item text-light px-3 py-2" 
                                onClick={() => handleOpenChipInternals(nodeContextMenu.chipId)}
                            >
                                <i className="fa-solid fa-microchip me-2"></i> View Internals
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Truth Table Modal */}
            {truthTableData && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content bg-dark text-light border-secondary">
                            <div className="modal-header border-secondary">
                                <h5 className="modal-title">{truthTableData.title}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setTruthTableData(null)}></button>
                            </div>
                            <div className="modal-body text-center">
                                <table className="table table-dark table-bordered table-sm mb-0">
                                    <thead>
                                        <tr>
                                            {truthTableData.headers.map((h, i) => <th key={i}>{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {truthTableData.rows.map((row, i) => (
                                            <tr key={i}>
                                                {row.map((cell, j) => (
                                                    <td key={j} className={j === row.length - 1 ? "text-info fw-bold" : ""}>{cell}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
