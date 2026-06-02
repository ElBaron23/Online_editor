document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('logic-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        const container = canvas.parentElement;
        if (container.clientWidth > 0 && container.clientHeight > 0) {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            render();
        }
    }
    
    const resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
    });
    resizeObserver.observe(canvas.parentElement);
    
    window.addEventListener('resize', resizeCanvas);

    // Data structures
    let nodes = [];
    let wires = [];
    let nextId = 1;
    let customChips = JSON.parse(localStorage.getItem('logic-custom-chips') || '[]');

    // --- Tab System ---
    let logicTabs = [{
        id: 'main',
        name: 'Main Board',
        nodes: [], wires: [], nextId: 1,
        cameraX: 0, cameraY: 0, zoom: 1,
        editingChipId: null
    }];
    let activeLogicTabId = 'main';

    function saveCurrentTab() {
        const tab = logicTabs.find(t => t.id === activeLogicTabId);
        if (tab) {
            tab.nodes = nodes; // Keep reference to current state
            tab.wires = wires;
            tab.nextId = nextId;
            tab.cameraX = cameraX;
            tab.cameraY = cameraY;
            tab.zoom = zoom;
        }
    }

    window.switchLogicTab = function(id) {
        if (activeLogicTabId === id) return;
        saveCurrentTab();
        const tab = logicTabs.find(t => t.id === id);
        if (tab) {
            activeLogicTabId = id;
            nodes = tab.nodes;
            wires = tab.wires;
            nextId = tab.nextId;
            cameraX = tab.cameraX;
            cameraY = tab.cameraY;
            zoom = tab.zoom;
            
            selectedNodes.clear();
            hoveredNode = null;
            hoveredWire = null;
            hoveredPort = null;
            isSelectingBox = false;
            selectionBox = null;

            renderLogicTabs();
            render();
        }
    };

    window.closeLogicTab = function(id, e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (id === 'main') return; // Cannot close main tab
        
        const idx = logicTabs.findIndex(t => t.id === id);
        if (idx > -1) {
            logicTabs.splice(idx, 1);
            if (activeLogicTabId === id) {
                switchLogicTab('main');
            } else {
                renderLogicTabs();
            }
        }
    };

    function renderLogicTabs() {
        const container = document.getElementById('logic-tabs-container');
        if (!container) return;
        
        container.innerHTML = logicTabs.map(tab => {
            const isActive = tab.id === activeLogicTabId;
            let icon = tab.id === 'main' ? '<i class="fa-solid fa-microchip me-2"></i>' : '<i class="fa-solid fa-wrench me-2"></i>';
            let closeBtn = tab.id === 'main' ? '' : `<i class="fa-solid fa-xmark ms-2 hover-text-danger" style="cursor: pointer;" onclick="closeLogicTab('${tab.id}', event)"></i>`;
            
            // translate Main Board if needed
            let nameDisplay = tab.id === 'main' ? `<span data-i18n="main_board">${tab.name}</span>` : tab.name;

            return `
                <li class="nav-item cursor-pointer" style="margin-bottom: -1px;">
                    <a class="nav-link ${isActive ? 'active bg-dark text-light border-secondary border-opacity-50 border-bottom-0' : 'text-secondary border-0 hover-white'}" 
                       style="border-radius: 8px 8px 0 0;"
                       onclick="switchLogicTab('${tab.id}')">
                        ${icon}${nameDisplay}${closeBtn}
                    </a>
                </li>
            `;
        }).join('');
        
        // Re-apply translations for tabs
        if (typeof setLanguage === 'function' && typeof currentLanguage !== 'undefined') {
            setLanguage(currentLanguage);
        }
    }

    function generateId() {
        return 'gate_' + (nextId++) + '_' + Math.floor(Math.random()*10000);
    }

    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    let targetToolbarChipId = null;
    const toolbarChipCtxMenu = document.getElementById('toolbar-chip-context-menu');

    function renderCustomChipButtons() {
        const container = document.getElementById('custom-chips-container');
        if (!container) return;
        container.innerHTML = '';
        customChips.forEach(chip => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-outline-info logic-gate-btn position-relative';
            btn.setAttribute('data-type', chip.id);
            btn.innerHTML = `<i class="fa-solid fa-microchip me-1"></i> ${chip.name}`;
            
            // Drag and Drop
            btn.draggable = true;
            btn.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', chip.id);
            });
            
            // Left click to spawn
            btn.addEventListener('click', (e) => {
                let cx = canvas.width > 100 ? canvas.width/2 : 300;
                let cy = canvas.height > 100 ? canvas.height/2 : 200;
                let worldX = (cx - cameraX) / zoom;
                let worldY = (cy - cameraY) / zoom;
                addNode(chip.id, worldX - 40 + (Math.random()*40 - 20), worldY - 30 + (Math.random()*40 - 20));
            });

            // Right click to manage
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                targetToolbarChipId = chip.id;
                if (toolbarChipCtxMenu) {
                    toolbarChipCtxMenu.style.display = 'block';
                    toolbarChipCtxMenu.style.left = e.pageX + 'px';
                    toolbarChipCtxMenu.style.top = e.pageY + 'px';
                }
            });

            container.appendChild(btn);
        });
        
        // Hide on custom chips row
        const row = document.getElementById('custom-chips-row');
        if (row) {
            row.style.display = customChips.length > 0 ? 'flex' : 'none';
        }
    }
    renderCustomChipButtons();

    const GATE_DEF = {
        'AND': { w: 80, h: 60, in: 2, out: 1, color: '#3b82f6', label: 'AND' },
        'OR': { w: 80, h: 60, in: 2, out: 1, color: '#8b5cf6', label: 'OR' },
        'NOT': { w: 70, h: 50, in: 1, out: 1, color: '#ef4444', label: 'NOT' },
        'SWITCH': { w: 60, h: 60, in: 0, out: 1, color: '#f59e0b', label: 'SW' },
        'LED': { w: 50, h: 50, in: 1, out: 0, color: '#10b981', label: 'LED' },
        'SEG7': { w: 60, h: 100, in: 7, out: 0, color: '#333333', label: '7-SEG' },
        'CLOCK': { w: 60, h: 60, in: 0, out: 1, color: '#ec4899', label: '1 Hz' }
    };

    function addNode(type, x = 100, y = 100) {
        if (type.startsWith('chip_')) {
            const template = customChips.find(c => c.id === type);
            if (!template) return;
            const node = {
                id: generateId(),
                type: 'CUSTOM',
                chipId: type,
                x: x, y: y,
                w: 80,
                h: Math.max(60, template.numInputs * 25 + 10, template.numOutputs * 25 + 10),
                color: '#6366f1',
                label: template.name,
                inputs: Array(template.numInputs).fill(null).map((_, i) => ({ id: `in_${i}`, value: false, connectedWire: null, label: template.inputLabels ? template.inputLabels[i] : null })),
                outputs: Array(template.numOutputs).fill(null).map((_, i) => ({ id: `out_${i}`, value: false, connectedWires: [], label: template.outputLabels ? template.outputLabels[i] : null })),
                internalState: {
                    nodes: deepClone(template.nodes),
                    wires: deepClone(template.wires)
                }
            };
            nodes.push(node);
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
                x: x, y: y, w: def.w, h: def.h,
                color: def.color, label: def.label,
                inputs: Array(def.in).fill(null).map((_, i) => ({ id: `in_${i}`, value: false, connectedWire: null, label: inputLabels ? inputLabels[i] : null })),
                outputs: Array(def.out).fill(null).map((_, i) => ({ id: `out_${i}`, value: false, connectedWires: [], label: null })),
                state: false
            };
            
            if (type === 'CLOCK') {
                node.frequency = 1;
                node.lastTick = performance.now();
            }
            
            nodes.push(node);
        }
        simulate();
        render();
    }

    // Interaction state
    let isDragging = false;
    let draggedNode = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragHasMoved = false;

    let isWiring = false;
    let wiringStartNode = null;
    let wiringStartPortIndex = -1;
    let wiringStartPortType = null;
    let mouseX = 0;
    let mouseY = 0;
    
    // Pan & Zoom state
    let cameraX = 0;
    let cameraY = 0;
    let zoom = 1;
    let isPanning = false;
    let lastPanX = 0;
    let lastPanY = 0;
    
    // Animation
    let time = 0;

    window.isPrintingMode = false;

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (window.isPrintingMode) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.save();
        ctx.translate(cameraX, cameraY);
        ctx.scale(zoom, zoom);

        // Draw Dynamic Grid
        const gridSpacing = 20;
        const visibleLeft = -cameraX / zoom;
        const visibleTop = -cameraY / zoom;
        const visibleRight = (canvas.width - cameraX) / zoom;
        const visibleBottom = (canvas.height - cameraY) / zoom;
        
        ctx.fillStyle = window.isPrintingMode ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
        const startX = Math.floor(visibleLeft / gridSpacing) * gridSpacing;
        const startY = Math.floor(visibleTop / gridSpacing) * gridSpacing;
        
        ctx.beginPath();
        for (let x = startX; x < visibleRight; x += gridSpacing) {
            for (let y = startY; y < visibleBottom; y += gridSpacing) {
                ctx.rect(x - 0.5, y - 0.5, 1, 1);
            }
        }
        ctx.fill();

        // Draw Wires
        wires.forEach(wire => {
            const fromNode = nodes.find(n => n.id === wire.fromNode);
            const toNode = nodes.find(n => n.id === wire.toNode);
            if (!fromNode || !toNode) return;
            
            const startPoint = getPortPos(fromNode, 'out', wire.fromPort);
            const endPoint = getPortPos(toNode, 'in', wire.toPort);
            
            const color = wire.color || '#00f2fe';
            drawWire(startPoint.x, startPoint.y, endPoint.x, endPoint.y, wire.value, wire === hoveredWire, color);
        });

        // Draw wiring in progress
        if (isWiring && wiringStartNode) {
            const startPoint = getPortPos(wiringStartNode, wiringStartPortType, wiringStartPortIndex);
            if (wiringStartPortType === 'out') {
                drawWire(startPoint.x, startPoint.y, mouseX, mouseY, false, true);
            } else {
                drawWire(mouseX, mouseY, startPoint.x, startPoint.y, false, true);
            }
        }

        // Draw Nodes
        nodes.forEach(node => {
            const isHovered = (node === hoveredNode);
            const isSelected = selectedNodes.has(node);
            
            if ((isHovered || isSelected) && !window.isPrintingMode) {
                ctx.shadowColor = isSelected ? '#3b82f6' : node.color;
                ctx.shadowBlur = 15;
            } else {
                ctx.shadowBlur = 0;
            }
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 5;

            // Base shape
            ctx.fillStyle = window.isPrintingMode ? '#ffffff' : 'rgba(20, 21, 26, 0.85)';
            ctx.strokeStyle = node === hoveredNode ? '#00f2fe' : (window.isPrintingMode ? '#000000' : node.color);
            ctx.lineWidth = window.isPrintingMode ? 3 : 2;
            
            ctx.beginPath();
            if (node.type === 'AND') {
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(node.x + node.w * 0.5, node.y);
                ctx.arc(node.x + node.w * 0.5, node.y + node.h / 2, node.h / 2, -Math.PI/2, Math.PI/2);
                ctx.lineTo(node.x, node.y + node.h);
                ctx.closePath();
            } else if (node.type === 'OR') {
                ctx.moveTo(node.x, node.y);
                ctx.quadraticCurveTo(node.x + node.w * 0.8, node.y, node.x + node.w, node.y + node.h / 2);
                ctx.quadraticCurveTo(node.x + node.w * 0.8, node.y + node.h, node.x, node.y + node.h);
                ctx.quadraticCurveTo(node.x + node.w * 0.25, node.y + node.h / 2, node.x, node.y);
                ctx.closePath();
            } else if (node.type === 'NOT') {
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(node.x + node.w - 10, node.y + node.h / 2);
                ctx.lineTo(node.x, node.y + node.h);
                ctx.closePath();
            } else {
                ctx.roundRect(node.x, node.y, node.w, node.h, 8);
            }
            ctx.fill();
            ctx.stroke();

            // NOT gate bubble
            if (node.type === 'NOT') {
                ctx.beginPath();
                ctx.arc(node.x + node.w - 5, node.y + node.h / 2, 5, 0, Math.PI * 2);
                ctx.fillStyle = window.isPrintingMode ? '#ffffff' : 'rgba(20, 21, 26, 0.85)';
                ctx.fill();
                ctx.stroke();
            }
            
            ctx.shadowBlur = 0; // Reset shadow

            // Highlight selection
            if (isSelected && !window.isPrintingMode) {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 3;
                ctx.strokeRect(node.x - 2, node.y - 2, node.w + 4, node.h + 4);
            }

            // Content
            if (node.type === 'SWITCH') {
                ctx.fillStyle = node.state ? '#f59e0b' : (window.isPrintingMode ? '#ccc' : '#333');
                ctx.beginPath();
                ctx.arc(node.x + node.w/2, node.y + node.h/2, 14, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = window.isPrintingMode ? '#000' : '#fff';
                ctx.stroke();
            } else if (node.type === 'LED') {
                ctx.fillStyle = node.state ? '#10b981' : (window.isPrintingMode ? '#ccc' : '#333');
                ctx.beginPath();
                ctx.arc(node.x + node.w/2, node.y + node.h/2, 16, 0, Math.PI*2);
                ctx.fill();
                
                // Extra inner glow for LED
                if(node.state) {
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.beginPath();
                    ctx.arc(node.x + node.w/2 - 4, node.y + node.h/2 - 4, 4, 0, Math.PI*2);
                    ctx.fill();
                }
            } else if (node.type === 'AND' || node.type === 'OR' || node.type === 'NOT' || node.type === 'CUSTOM') {
                ctx.fillStyle = window.isPrintingMode ? '#000000' : (node.type === 'CUSTOM' ? '#fff' : 'rgba(255, 255, 255, 0.4)');
                ctx.font = node.type === 'CUSTOM' ? 'bold 12px "Segoe UI", sans-serif' : '11px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                let textX = node.x + node.w/2;
                if (node.type === 'NOT') textX -= 6;
                if (node.type === 'OR') textX -= 4;
                ctx.fillText(node.label, textX, node.y + node.h/2);
            } else if (node.type === 'SWITCH' || node.type === 'LED') {
                ctx.fillStyle = window.isPrintingMode ? '#000000' : '#fff';
                ctx.font = 'bold 16px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.label, node.x + node.w/2, node.y + node.h/2);
            } else if (node.type === 'SEG7') {
                const paddingX = 15;
                const paddingY = 20;
                const sw = node.w - paddingX * 2; // ~30
                const sh = (node.h - paddingY * 2) / 2; // ~30
                const ox = node.x + paddingX;
                const oy = node.y + paddingY;
                
                ctx.lineCap = 'round';
                const drawLineSeg = (active, x1, y1, x2, y2) => {
                    ctx.strokeStyle = active ? '#ef4444' : (window.isPrintingMode ? '#eaeaea' : 'rgba(255,255,255,0.05)');
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                };

                const gap = 2;
                // a: top
                drawLineSeg(node.inputs[0].value, ox + gap, oy, ox + sw - gap, oy);
                // b: top right
                drawLineSeg(node.inputs[1].value, ox + sw, oy + gap, ox + sw, oy + sh - gap);
                // c: bottom right
                drawLineSeg(node.inputs[2].value, ox + sw, oy + sh + gap, ox + sw, oy + 2*sh - gap);
                // d: bottom
                drawLineSeg(node.inputs[3].value, ox + gap, oy + 2*sh, ox + sw - gap, oy + 2*sh);
                // e: bottom left
                drawLineSeg(node.inputs[4].value, ox, oy + sh + gap, ox, oy + 2*sh - gap);
                // f: top left
                drawLineSeg(node.inputs[5].value, ox, oy + gap, ox, oy + sh - gap);
                // g: middle
                drawLineSeg(node.inputs[6].value, ox + gap, oy + sh, ox + sw - gap, oy + sh);
                ctx.lineCap = 'butt'; // reset
            } else if (node.type === 'CLOCK') {
                ctx.fillStyle = node.state ? '#ec4899' : (window.isPrintingMode ? '#ccc' : '#333');
                ctx.beginPath();
                ctx.arc(node.x + node.w/2, node.y + node.h/2 - 10, 10, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = window.isPrintingMode ? '#000' : '#fff';
                ctx.stroke();
                
                ctx.fillStyle = window.isPrintingMode ? '#000000' : '#fff';
                ctx.font = 'bold 12px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(node.frequency + ' Hz', node.x + node.w/2, node.y + node.h - 15);
            }

            // Draw Ports
            node.inputs.forEach((inp, i) => {
                const pos = getPortPos(node, 'in', i);
                ctx.fillStyle = inp.value ? '#10b981' : (window.isPrintingMode ? '#cccccc' : '#555');
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 6, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = window.isPrintingMode ? '#000000' : '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Draw port numbers/labels for custom chips or labeled ports
                if (node.type === 'CUSTOM' || inp.label) {
                    ctx.fillStyle = window.isPrintingMode ? '#000000' : 'rgba(255, 255, 255, 0.6)';
                    ctx.font = '10px "Segoe UI", sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    const labelText = inp.label ? inp.label : `${i + 1}`;
                    ctx.fillText(labelText, pos.x + 10, pos.y);
                }
            });

            node.outputs.forEach((out, i) => {
                const pos = getPortPos(node, 'out', i);
                ctx.fillStyle = out.value ? '#10b981' : (window.isPrintingMode ? '#cccccc' : '#555');
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 6, 0, Math.PI*2);
                ctx.fill();
                ctx.strokeStyle = window.isPrintingMode ? '#000000' : '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Draw port numbers for custom chips
                if (node.type === 'CUSTOM') {
                    ctx.fillStyle = window.isPrintingMode ? '#000000' : 'rgba(255, 255, 255, 0.6)';
                    ctx.font = '10px "Segoe UI", sans-serif';
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    const labelText = out.label ? out.label : `${i + 1}`;
                    ctx.fillText(labelText, pos.x - 10, pos.y);
                }
            });
        });

        if (hoveredPort) {
            const hPos = getPortPos(hoveredPort.node, hoveredPort.type, hoveredPort.index);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(hPos.x, hPos.y, 8, 0, Math.PI*2);
            ctx.stroke();
        }
        
        // Draw Selection Box
        if (isSelectingBox && selectionBox && !window.isPrintingMode) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
            ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    function getPortPos(node, type, index) {
        if (type === 'in') {
            const spacing = node.h / (node.inputs.length + 1);
            let px = node.x;
            if (node.type === 'OR') {
                const t = (index + 1) / (node.inputs.length + 1);
                // Offset matches the quadraticCurveTo's inward bow: 2 * (1-t) * t * (w * 0.25)
                px += 2 * (1 - t) * t * (node.w * 0.25);
            }
            return { x: px, y: node.y + spacing * (index + 1) };
        } else {
            const spacing = node.h / (node.outputs.length + 1);
            return { x: node.x + node.w, y: node.y + spacing * (index + 1) };
        }
    }

    function distanceToBezier(px, py, x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2) {
        let minDist = Infinity;
        for(let t = 0; t <= 1; t += 0.05) {
            const bx = Math.pow(1-t, 3)*x1 + 3*Math.pow(1-t, 2)*t*cp1x + 3*(1-t)*t*t*cp2x + t*t*t*x2;
            const by = Math.pow(1-t, 3)*y1 + 3*Math.pow(1-t, 2)*t*cp1y + 3*(1-t)*t*t*cp2y + t*t*t*y2;
            const dist = Math.hypot(px - bx, py - by);
            if(dist < minDist) minDist = dist;
        }
        return minDist;
    }

    function drawWire(x1, y1, x2, y2, isActive, isHovered, color = '#00f2fe') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const cp1x = x1 + Math.abs(x2 - x1) * 0.5;
        const cp1y = y1;
        const cp2x = x2 - Math.abs(x2 - x1) * 0.5;
        const cp2y = y2;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        
        ctx.strokeStyle = isHovered ? (window.isPrintingMode ? '#f00' : '#fff') : (isActive ? color : (window.isPrintingMode ? '#000' : '#555'));
        if (!isActive && color !== '#00f2fe') {
            ctx.strokeStyle = color;
            ctx.globalAlpha = window.isPrintingMode ? 0.7 : 0.4;
        }
        ctx.lineWidth = isHovered ? 4 : (window.isPrintingMode ? 3 : 3);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Particle animation for active wires
        if (isActive && !isHovered && !window.isPrintingMode) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 3;
            const t = (time % 100) / 100; // Animation progress 0 to 1
            ctx.setLineDash([8, 20]);
            ctx.lineDashOffset = -t * 28;
            
            // Add slight glow
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
            ctx.stroke();
            ctx.restore();
        }
    }

    let hoveredNode = null;
    let hoveredPort = null; // { node, type: 'in'|'out', index }
    let hoveredWire = null;
    
    let selectedNodes = new Set();
    let isSelectingBox = false;
    let selectionBox = null;

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

        if (isPanning) {
            cameraX += rawX - lastPanX;
            cameraY += rawY - lastPanY;
            lastPanX = rawX;
            lastPanY = rawY;
            return;
        }

        mouseX = (rawX - cameraX) / zoom;
        mouseY = (rawY - cameraY) / zoom;

        if (isSelectingBox && selectionBox) {
            const currentMouseX = (rawX - cameraX) / zoom;
            const currentMouseY = (rawY - cameraY) / zoom;
            selectionBox.w = currentMouseX - selectionBox.x;
            selectionBox.h = currentMouseY - selectionBox.y;
            return;
        }

        if (isDragging && draggedNode) {
            const dx = mouseX - dragStartX;
            const dy = mouseY - dragStartY;
            selectedNodes.forEach(n => {
                n.x = n.dragStartX + dx;
                n.y = n.dragStartY + dy;
            });
            if (Math.hypot(dx, dy) > 5) {
                dragHasMoved = true;
            }
            return; // Render handles it in animate loop
        }

        // Let hit testing run even during wiring so we can detect drop targets

        // Hit testing
        hoveredPort = null;
        hoveredNode = null;
        hoveredWire = null;

        // Check ports first
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            
            // Outputs
            for (let j = 0; j < node.outputs.length; j++) {
                const pos = getPortPos(node, 'out', j);
                if (Math.hypot(mouseX - pos.x, mouseY - pos.y) < 12) {
                    hoveredPort = { node, type: 'out', index: j };
                    canvas.style.cursor = 'crosshair';
                    return;
                }
            }
            // Inputs
            for (let j = 0; j < node.inputs.length; j++) {
                const pos = getPortPos(node, 'in', j);
                if (Math.hypot(mouseX - pos.x, mouseY - pos.y) < 12) {
                    hoveredPort = { node, type: 'in', index: j };
                    canvas.style.cursor = 'crosshair';
                    return;
                }
            }

            // Check node body
            if (mouseX >= node.x && mouseX <= node.x + node.w &&
                mouseY >= node.y && mouseY <= node.y + node.h) {
                hoveredNode = node;
            }
        }

        if (!hoveredPort && !hoveredNode && !isWiring && !isPanning) {
            for (let i = 0; i < wires.length; i++) {
                const w = wires[i];
                const fromNode = nodes.find(n => n.id === w.fromNode);
                const toNode = nodes.find(n => n.id === w.toNode);
                if (!fromNode || !toNode) continue;
                
                const startPoint = getPortPos(fromNode, 'out', w.fromPort);
                const endPoint = getPortPos(toNode, 'in', w.toPort);
                
                const cp1x = startPoint.x + Math.abs(endPoint.x - startPoint.x) * 0.5;
                const cp1y = startPoint.y;
                const cp2x = endPoint.x - Math.abs(endPoint.x - startPoint.x) * 0.5;
                const cp2y = endPoint.y;
                
                const dist = distanceToBezier(mouseX, mouseY, startPoint.x, startPoint.y, cp1x, cp1y, cp2x, cp2y, endPoint.x, endPoint.y);
                
                if (dist < 8) {
                    hoveredWire = w;
                    break;
                }
            }
        }

        if (hoveredNode) {
            canvas.style.cursor = (hoveredNode.type === 'SWITCH' || hoveredNode.type === 'CLOCK') ? 'pointer' : 'grab';
        } else if (hoveredWire) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    });

    canvas.addEventListener('mousedown', e => {
        if (e.button !== 0 && e.button !== 1 && e.button !== 2) return; 

        if (e.button === 0 && !hoveredPort && !hoveredNode && !hoveredWire) {
            isSelectingBox = true;
            const rect = canvas.getBoundingClientRect();
            const rawX = e.clientX - rect.left;
            const rawY = e.clientY - rect.top;
            const currentMouseX = (rawX - cameraX) / zoom;
            const currentMouseY = (rawY - cameraY) / zoom;
            selectionBox = { x: currentMouseX, y: currentMouseY, w: 0, h: 0 };
            if (!e.shiftKey) {
                selectedNodes.clear();
            }
            return;
        }

        if (hoveredNode) {
            isDragging = true;
            draggedNode = hoveredNode;
            
            const rect = canvas.getBoundingClientRect();
            const rawX = e.clientX - rect.left;
            const rawY = e.clientY - rect.top;
            const currentMouseX = (rawX - cameraX) / zoom;
            const currentMouseY = (rawY - cameraY) / zoom;
            
            dragStartX = currentMouseX;
            dragStartY = currentMouseY;
            dragHasMoved = false;
            canvas.style.cursor = 'grabbing';
            
            if (e.button === 0) {
                if (!e.shiftKey && !selectedNodes.has(hoveredNode)) {
                    selectedNodes.clear();
                    selectedNodes.add(hoveredNode);
                } else if (e.shiftKey) {
                    if (selectedNodes.has(hoveredNode)) selectedNodes.delete(hoveredNode);
                    else selectedNodes.add(hoveredNode);
                }
            } else if (e.button === 2) {
                if (!selectedNodes.has(hoveredNode)) {
                    selectedNodes.clear();
                    selectedNodes.add(hoveredNode);
                }
            }

            selectedNodes.forEach(n => {
                n.dragStartX = n.x;
                n.dragStartY = n.y;
            });

            // Bring to front
            selectedNodes.forEach(n => {
                nodes = nodes.filter(x => x.id !== n.id);
                nodes.push(n);
            });
        } else if (!hoveredPort && !hoveredNode && (e.button === 1 || e.button === 2)) {
            // Clicked on empty space with middle or right click -> start panning
            isPanning = true;
            const rect = canvas.getBoundingClientRect();
            lastPanX = e.clientX - rect.left;
            lastPanY = e.clientY - rect.top;
            canvas.style.cursor = 'grabbing';
        }
    });

    canvas.addEventListener('mouseup', e => {
        if (e.button !== 0) return;

        if (isSelectingBox) {
            isSelectingBox = false;
            if (selectionBox) {
                const rx = Math.min(selectionBox.x, selectionBox.x + selectionBox.w);
                const ry = Math.min(selectionBox.y, selectionBox.y + selectionBox.h);
                const rw = Math.abs(selectionBox.w);
                const rh = Math.abs(selectionBox.h);
                
                if (rw > 5 && rh > 5) {
                    nodes.forEach(n => {
                        if (n.x < rx + rw && n.x + n.w > rx &&
                            n.y < ry + rh && n.y + n.h > ry) {
                            selectedNodes.add(n);
                        }
                    });
                }
            }
            selectionBox = null;
            return;
        }

        if (isWiring) {
            if (hoveredPort && hoveredPort.type !== wiringStartPortType) {
                // Prevent self connection
                if (hoveredPort.node.id !== wiringStartNode.id) {
                    
                    const outNode = wiringStartPortType === 'out' ? wiringStartNode : hoveredPort.node;
                    const outIndex = wiringStartPortType === 'out' ? wiringStartPortIndex : hoveredPort.index;
                    const inNode = wiringStartPortType === 'in' ? wiringStartNode : hoveredPort.node;
                    const inIndex = wiringStartPortType === 'in' ? wiringStartPortIndex : hoveredPort.index;
                    
                    // Remove existing wire to this input if any
                    const existingWireIdx = wires.findIndex(w => w.toNode === inNode.id && w.toPort === inIndex);
                    if (existingWireIdx !== -1) {
                        const ew = wires[existingWireIdx];
                        wires.splice(existingWireIdx, 1);
                        const fn = nodes.find(n => n.id === ew.fromNode);
                        if (fn) fn.outputs[ew.fromPort].connectedWires = fn.outputs[ew.fromPort].connectedWires.filter(wId => wId !== ew.id);
                    }

                    const wireId = generateId();
                    wires.push({
                        id: wireId,
                        fromNode: outNode.id,
                        fromPort: outIndex,
                        toNode: inNode.id,
                        toPort: inIndex,
                        value: false
                    });
                    
                    outNode.outputs[outIndex].connectedWires.push(wireId);
                    inNode.inputs[inIndex].connectedWire = wireId;
                    
                    simulate();
                }
            }
            isWiring = false;
            wiringStartNode = null;
        }

        if (isDragging) {
            if (!dragHasMoved) {
                if (draggedNode.type === 'SWITCH') {
                    draggedNode.state = !draggedNode.state;
                    simulate();
                } else if (draggedNode.type === 'CLOCK') {
                    const freqs = [1, 2, 5, 10, 20, 50, 100];
                    let idx = freqs.indexOf(draggedNode.frequency);
                    idx = (idx + 1) % freqs.length;
                    draggedNode.frequency = freqs[idx];
                } else if (draggedNode.type !== 'LED' && draggedNode.type !== 'SEG7') {
                    showTruthTable(draggedNode);
                }
                
                // If clicked without shift, deselect others
                if (!e.shiftKey && selectedNodes.size > 1) {
                    selectedNodes.clear();
                    selectedNodes.add(draggedNode);
                }
            }
            isDragging = false;
            draggedNode = null;
        }    if (hoveredNode) canvas.style.cursor = (hoveredNode.type === 'SWITCH' || hoveredNode.type === 'CLOCK') ? 'pointer' : 'grab';

        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = 'default';
        }
    });

    canvas.addEventListener('mouseleave', e => {
        isDragging = false;
        draggedNode = null;
        isPanning = false;
        isWiring = false;
        isSelectingBox = false;
        selectionBox = null;
        wiringStartNode = null;
        canvas.style.cursor = 'default';
    });

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const zoomDelta = e.deltaY * -zoomSensitivity;
        let newZoom = Math.max(0.2, Math.min(zoom + zoomDelta, 3));
        
        const rect = canvas.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        
        const worldX = (rawX - cameraX) / zoom;
        const worldY = (rawY - cameraY) / zoom;
        
        cameraX = rawX - worldX * newZoom;
        cameraY = rawY - worldY * newZoom;
        zoom = newZoom;
    });

    const wireCtxMenu = document.getElementById('wire-context-menu');
    const nodeCtxMenu = document.getElementById('node-context-menu');
    let targetWire = null;
    let targetNode = null;

    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (wireCtxMenu) wireCtxMenu.style.display = 'none';
        if (nodeCtxMenu) nodeCtxMenu.style.display = 'none';

        if (hoveredNode) {
            targetNode = hoveredNode;
            if (nodeCtxMenu) {
                const editBtn = document.getElementById('ctx-node-edit');
                if (editBtn) {
                    editBtn.style.display = targetNode.type === 'CUSTOM' ? 'flex' : 'none';
                }
                nodeCtxMenu.style.display = 'block';
                nodeCtxMenu.style.left = e.pageX + 'px';
                nodeCtxMenu.style.top = e.pageY + 'px';
            }
        } else if (hoveredWire) {
            targetWire = hoveredWire;
            if (wireCtxMenu) {
                wireCtxMenu.style.display = 'flex';
                wireCtxMenu.style.left = e.pageX + 'px';
                wireCtxMenu.style.top = e.pageY + 'px';
            }
        }
    });

    document.getElementById('ctx-delete-node')?.addEventListener('click', () => {
        if (selectedNodes.size > 0) {
            selectedNodes.forEach(node => deleteNode(node));
            selectedNodes.clear();
        } else if (targetNode) {
            deleteNode(targetNode);
        }
        if (nodeCtxMenu) nodeCtxMenu.style.display = 'none';
        targetNode = null;
    });document.getElementById('ctx-node-edit')?.addEventListener('click', () => {
        if (targetNode && targetNode.type === 'CUSTOM') {
            const template = customChips.find(c => c.id === targetNode.chipId);
            if (template) {
                // Check if tab already exists
                const existingTab = logicTabs.find(t => t.editingChipId === template.id);
                if (existingTab) {
                    switchLogicTab(existingTab.id);
                } else {
                    // Create new tab
                    const newTabId = 'tab_' + Date.now();
                    const newTab = {
                        id: newTabId,
                        name: 'Edit: ' + template.name,
                        nodes: deepClone(template.nodes),
                        wires: deepClone(template.wires),
                        nextId: 1000,
                        cameraX: 0, cameraY: 0, zoom: 1,
                        editingChipId: template.id
                    };
                    logicTabs.push(newTab);
                    switchLogicTab(newTabId);
                }
            }
            if (nodeCtxMenu) nodeCtxMenu.style.display = 'none';
        }
    });

    document.getElementById('ctx-node-truthtable')?.addEventListener('click', () => {
        if (targetNode) {
            showTruthTable(targetNode);
            if (nodeCtxMenu) nodeCtxMenu.style.display = 'none';
        }
    });

    document.getElementById('ctx-node-rename')?.addEventListener('click', () => {
        if (targetNode) {
            if (window.showCustomPrompt) {
                window.showCustomPrompt('Rename Gate / Pin', 'Enter a new name (e.g. VCC, RESET, Clock):', targetNode.label, (newName) => {
                    if (newName) {
                        targetNode.label = newName.substring(0, 10);
                        render();
                    }
                });
            } else {
                const name = prompt('Enter a new name:', targetNode.label);
                if (name) {
                    targetNode.label = name.substring(0, 10);
                    render();
                }
            }
            if (nodeCtxMenu) nodeCtxMenu.style.display = 'none';
        }
    });

    // Hide context menus on global click
    document.addEventListener('click', (e) => {
        if (wireCtxMenu && e.target.closest('#wire-context-menu') === null) {
            wireCtxMenu.style.display = 'none';
        }
        if (nodeCtxMenu && e.target.closest('#node-context-menu') === null) {
            nodeCtxMenu.style.display = 'none';
        }
        if (toolbarChipCtxMenu && e.target.closest('#toolbar-chip-context-menu') === null) {
            toolbarChipCtxMenu.style.display = 'none';
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (selectedNodes.size > 0) {
                selectedNodes.forEach(node => deleteNode(node));
                selectedNodes.clear();
            } else if (targetNode) {
                deleteNode(targetNode);
                targetNode = null;
            }
        }
    });

    // Toolbar Chip Context Menu Logic
    document.getElementById('ctx-toolbar-delete')?.addEventListener('click', () => {
        if (targetToolbarChipId) {
            if(window.showCustomConfirm) {
                window.showCustomConfirm('Delete Chip', 'Are you sure you want to permanently delete this custom chip template?', (confirmed) => {
                    if(confirmed) performDeleteChip();
                });
            } else if(confirm('Are you sure you want to permanently delete this custom chip template?')) {
                performDeleteChip();
            }
        }
        if (toolbarChipCtxMenu) toolbarChipCtxMenu.style.display = 'none';
    });

    function performDeleteChip() {
        customChips = customChips.filter(c => c.id !== targetToolbarChipId);
        localStorage.setItem('logic-custom-chips', JSON.stringify(customChips));
        renderCustomChipButtons();
        
        // Close tab if open
        const existingTab = logicTabs.find(t => t.editingChipId === targetToolbarChipId);
        if (existingTab) {
            closeLogicTab(existingTab.id);
        }
    }

    document.getElementById('ctx-toolbar-edit')?.addEventListener('click', () => {
        if (targetToolbarChipId) {
            const template = customChips.find(c => c.id === targetToolbarChipId);
            if (template) {
                const existingTab = logicTabs.find(t => t.editingChipId === template.id);
                if (existingTab) {
                    switchLogicTab(existingTab.id);
                } else {
                    const newTabId = 'tab_' + Date.now();
                    const newTab = {
                        id: newTabId,
                        name: 'Edit: ' + template.name,
                        nodes: deepClone(template.nodes),
                        wires: deepClone(template.wires),
                        nextId: 1000,
                        cameraX: 0, cameraY: 0, zoom: 1,
                        editingChipId: template.id
                    };
                    logicTabs.push(newTab);
                    switchLogicTab(newTabId);
                }
            }
        }
        if (toolbarChipCtxMenu) toolbarChipCtxMenu.style.display = 'none';
    });

    if (wireCtxMenu) {
        wireCtxMenu.querySelectorAll('.wire-color-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                if (targetWire) {
                    targetWire.color = e.target.getAttribute('data-color');
                    wireCtxMenu.style.display = 'none';
                    targetWire = null;
                }
            });
        });
        document.getElementById('ctx-delete-wire')?.addEventListener('click', () => {
            if (targetWire) {
                wires = wires.filter(w => w.id !== targetWire.id);
                // remove connections from nodes
                nodes.forEach(n => {
                    n.inputs.forEach(inp => { if(inp.connectedWire === targetWire.id) inp.connectedWire = null; });
                    n.outputs.forEach(out => { out.connectedWires = out.connectedWires.filter(wid => wid !== targetWire.id); });
                });
                simulate();
                wireCtxMenu.style.display = 'none';
                targetWire = null;
                hoveredWire = null;
            }
        });
    }

    function deleteNode(node) {
        // Remove connected wires
        wires = wires.filter(w => {
            if (w.fromNode === node.id || w.toNode === node.id) {
                if (w.fromNode === node.id) {
                    const tn = nodes.find(n => n.id === w.toNode);
                    if (tn) tn.inputs[w.toPort].connectedWire = null;
                } else {
                    const fn = nodes.find(n => n.id === w.fromNode);
                    if (fn) fn.outputs[w.fromPort].connectedWires = fn.outputs[w.fromPort].connectedWires.filter(wid => wid !== w.id);
                }
                return false;
            }
            return true;
        });

        nodes = nodes.filter(n => n.id !== node.id);
        simulate();
    }

    function simulate() {
        simulateCircuit(nodes, wires);
    }

    function simulateCircuit(simNodes, simWires) {
        let changed = true;
        let iter = 0;
        
        while (changed && iter < 100) {
            changed = false;
            iter++;
            
            simNodes.forEach(node => {
                let outVal = false;
                
                // Read inputs
                node.inputs.forEach(inp => {
                    if (inp.connectedWire) {
                        const wire = simWires.find(w => w.id === inp.connectedWire);
                        if (wire) inp.value = wire.value;
                    } else {
                        inp.value = false;
                    }
                });

                if (node.type === 'CUSTOM') {
                    // Map external inputs to internal switches (sorted by Y to match visual top-down order)
                    const internalSwitches = node.internalState.nodes.filter(n => n.type === 'SWITCH').sort((a,b) => a.y - b.y);
                    node.inputs.forEach((inp, idx) => {
                        if (internalSwitches[idx]) internalSwitches[idx].state = inp.value;
                    });
                    
                    // Simulate internal circuit
                    simulateCircuit(node.internalState.nodes, node.internalState.wires);
                    
                    // Map internal LEDs to external outputs
                    const internalLeds = node.internalState.nodes.filter(n => n.type === 'LED').sort((a,b) => a.y - b.y);
                    node.outputs.forEach((out, idx) => {
                        const newVal = internalLeds[idx] ? internalLeds[idx].state : false;
                        if (out.value !== newVal) {
                            out.value = newVal;
                            changed = true;
                            out.connectedWires.forEach(wId => {
                                const wire = simWires.find(w => w.id === wId);
                                if (wire) wire.value = newVal;
                            });
                        }
                    });
                    return; // Skip standard gate processing
                }

                // Compute standard Logic
                switch (node.type) {
                    case 'SWITCH': outVal = node.state; break;
                    case 'CLOCK': outVal = node.state; break;
                    case 'LED': node.state = node.inputs[0].value; break;
                    case 'AND': outVal = node.inputs[0].value && node.inputs[1].value; break;
                    case 'OR': outVal = node.inputs[0].value || node.inputs[1].value; break;
                    case 'NOT': outVal = !node.inputs[0].value; break;
                }

                // Write to outputs
                node.outputs.forEach(out => {
                    if (out.value !== outVal) {
                        out.value = outVal;
                        changed = true;
                        out.connectedWires.forEach(wId => {
                            const wire = simWires.find(w => w.id === wId);
                            if (wire) wire.value = outVal;
                        });
                    }
                });
            });
        }
    }

    // Animation Loop
    function animate() {
        time++;
        
        let needsSimulate = false;
        const now = performance.now();
        nodes.forEach(n => {
            if (n.type === 'CLOCK') {
                const halfCycle = 1000 / (n.frequency * 2);
                if (now - n.lastTick >= halfCycle) {
                    n.state = !n.state;
                    n.lastTick = now;
                    needsSimulate = true;
                }
            }
        });
        
        if (needsSimulate) {
            simulate();
        }
        
        render();
        requestAnimationFrame(animate);
    }
    animate();

    // Toolbar logic
    document.querySelectorAll('.logic-gate-btn, .logic-io-btn').forEach(btn => {
        // Setup Drag and Drop
        btn.draggable = true;
        btn.addEventListener('dragstart', (e) => {
            const type = e.currentTarget.getAttribute('data-type');
            e.dataTransfer.setData('text/plain', type);
        });

        // Click to spawn in center
        btn.addEventListener('click', (e) => {
            const type = e.currentTarget.getAttribute('data-type');
            let cx = canvas.width > 100 ? canvas.width/2 : 300;
            let cy = canvas.height > 100 ? canvas.height/2 : 200;
            
            // Map screen center to world coordinates
            let worldX = (cx - cameraX) / zoom;
            let worldY = (cy - cameraY) / zoom;
            
            addNode(type, worldX - 40 + (Math.random()*40 - 20), worldY - 30 + (Math.random()*40 - 20));
        });
    });

    // Canvas Drop Logic
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault(); // allow drop
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        if (!type) return;

        const rect = canvas.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

        // Convert drop coordinates to world space
        let worldX = (rawX - cameraX) / zoom;
        let worldY = (rawY - cameraY) / zoom;
        
        // Offset by half of typical node width/height to center it on cursor
        addNode(type, worldX - 30, worldY - 30);
    });

    document.getElementById('btn-clear-logic').addEventListener('click', () => {
        if(window.showCustomConfirm) {
            window.showCustomConfirm('Clear Logic Board', 'Are you sure you want to clear the logic board?', (confirmed) => {
                if(confirmed) {
                    nodes = [];
                    wires = [];
                }
            });
        } else if(confirm('Clear the logic board?')) {
            nodes = [];
            wires = [];
        }
    });

    document.getElementById('btn-print-logic')?.addEventListener('click', () => {
        if (nodes.length === 0) {
            alert('The board is empty!');
            return;
        }

        // 1. Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(n => {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + n.w);
            maxY = Math.max(maxY, n.y + n.h);
        });
        
        // Add padding
        minX -= 60; minY -= 60;
        maxX += 60; maxY += 60;
        
        const printWidth = maxX - minX;
        const printHeight = maxY - minY;

        // 2. Save current camera state
        const oldCameraX = cameraX;
        const oldCameraY = cameraY;
        const oldZoom = zoom;
        const oldWidth = canvas.width;
        const oldHeight = canvas.height;

        // 3. Set temporary print state
        canvas.width = printWidth;
        canvas.height = printHeight;
        cameraX = -minX;
        cameraY = -minY;
        zoom = 1;
        window.isPrintingMode = true;

        // 4. Render
        render();

        // 5. Get Image
        const dataUrl = canvas.toDataURL('image/png', 1.0);

        // 6. Restore state
        canvas.width = oldWidth;
        canvas.height = oldHeight;
        cameraX = oldCameraX;
        cameraY = oldCameraY;
        zoom = oldZoom;
        window.isPrintingMode = false;
        render();

        // 7. Print
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Logic Circuit - Print</title>
                    <style>
                        body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: flex-start; background-color: #fff; min-height: 100vh; }
                        img { max-width: 100%; max-height: 90vh; object-fit: contain; box-shadow: none; border: none; }
                        @media print {
                            @page { margin: 1cm; size: landscape; }
                            body { padding: 0; align-items: center; }
                        }
                    </style>
                </head>
                <body>
                    <img src="${dataUrl}" onload="setTimeout(() => { window.print(); window.close(); }, 500);" />
                </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            alert('Please allow popups to print.');
        }
    });

    document.getElementById('btn-save-chip')?.addEventListener('click', () => {
        const switches = nodes.filter(n => n.type === 'SWITCH').sort((a,b) => a.y - b.y);
        const leds = nodes.filter(n => n.type === 'LED').sort((a,b) => a.y - b.y);
        
        if (switches.length === 0 && leds.length === 0) {
            alert('Your circuit needs at least one Switch (Input) or LED (Output) to become a chip!');
            return;
        }

        const promptName = () => {
            if (window.showCustomPrompt) {
                window.showCustomPrompt('Enter a name for your custom chip (e.g. NAND, XOR):', '', (name) => {
                    if (name) saveChipLogic(name);
                });
            } else {
                const name = prompt('Enter a name for your custom chip (e.g. NAND, XOR):');
                if (name) saveChipLogic(name);
            }
        };

        const saveChipLogic = (name) => {
            const currentTab = logicTabs.find(t => t.id === activeLogicTabId);
            if (currentTab && currentTab.editingChipId) {
                // We are editing an existing chip template
                const templateIndex = customChips.findIndex(c => c.id === currentTab.editingChipId);
                if (templateIndex > -1) {
                    const template = customChips[templateIndex];
                    template.nodes = deepClone(nodes);
                    template.wires = deepClone(wires);
                    template.numInputs = switches.length;
                    template.numOutputs = leds.length;
                    template.inputLabels = switches.map(s => s.label === 'SW' ? '' : s.label);
                    template.outputLabels = leds.map(l => l.label === 'LED' ? '' : l.label);
                    
                    localStorage.setItem('logic-custom-chips', JSON.stringify(customChips));
                    renderCustomChipButtons();
                    alert(`Chip template ${template.name} updated successfully! Note: Existing chips on the board are not automatically updated.`);
                }
            } else {
                // We are creating a brand new chip
                const template = {
                    id: 'chip_' + Date.now() + '_' + Math.floor(Math.random()*1000),
                    name: name.substring(0, 10).toUpperCase(),
                    nodes: deepClone(nodes),
                    wires: deepClone(wires),
                    numInputs: switches.length,
                    numOutputs: leds.length,
                    inputLabels: switches.map(s => s.label === 'SW' ? '' : s.label),
                    outputLabels: leds.map(l => l.label === 'LED' ? '' : l.label)
                };
                customChips.push(template);
                localStorage.setItem('logic-custom-chips', JSON.stringify(customChips));
                renderCustomChipButtons();
            }
        };
        
        const currentTab = logicTabs.find(t => t.id === activeLogicTabId);
        if (currentTab && currentTab.editingChipId) {
            saveChipLogic(null); // No name needed, we overwrite
        } else {
            promptName();
        }
    });

    // --- Autosave System ---
    const savedBoardStr = localStorage.getItem('logic-board-state');
    if (savedBoardStr) {
        try {
            const state = JSON.parse(savedBoardStr);
            if (state.tabs) {
                logicTabs = state.tabs;
                activeLogicTabId = state.activeTabId || 'main';
                
                const tab = logicTabs.find(t => t.id === activeLogicTabId);
                if (tab) {
                    nodes = tab.nodes;
                    wires = tab.wires;
                    nextId = tab.nextId;
                    cameraX = tab.cameraX;
                    cameraY = tab.cameraY;
                    zoom = tab.zoom;
                }
            } else {
                // Fallback for old save format
                nodes = state.nodes || [];
                wires = state.wires || [];
                nextId = state.nextId || 1;
                cameraX = state.cameraX || 0;
                cameraY = state.cameraY || 0;
                zoom = state.zoom || 1;
                logicTabs[0].nodes = nodes;
                logicTabs[0].wires = wires;
            }
            renderLogicTabs();
            setTimeout(() => simulate(), 50);
        } catch (e) {
            console.error('Failed to load board state', e);
        }
    } else {
        renderLogicTabs();
    }

    function saveBoardState() {
        saveCurrentTab(); // Sync globals to active tab object
        const state = { tabs: logicTabs, activeTabId: activeLogicTabId };
        localStorage.setItem('logic-board-state', JSON.stringify(state));
    }
    setInterval(saveBoardState, 1000);

    // --- Truth Table System ---
    function generateTruthTable(node) {
        const numInputs = node.inputs.length;
        const numOutputs = node.outputs.length;
        
        if (numInputs === 0 || numOutputs === 0) return null; // e.g., SWITCH or LED alone without logic
        if (numInputs > 8) {
            alert('Too many inputs to generate a truth table (Max 8).');
            return null;
        }

        const rows = [];
        const totalCombinations = Math.pow(2, numInputs);

        for (let i = 0; i < totalCombinations; i++) {
            const inputValues = [];
            for (let bit = 0; bit < numInputs; bit++) {
                // Generate binary value (MSB to LSB)
                inputValues.push(!!(i & (1 << (numInputs - 1 - bit))));
            }

            let outputValues = [];
            
            if (node.type === 'CUSTOM') {
                const simState = deepClone(node.internalState);
                const internalSwitches = simState.nodes.filter(n => n.type === 'SWITCH').sort((a,b) => a.y - b.y);
                const internalLeds = simState.nodes.filter(n => n.type === 'LED').sort((a,b) => a.y - b.y);
                
                // Map inputs
                inputValues.forEach((val, idx) => {
                    if (internalSwitches[idx]) internalSwitches[idx].state = val;
                });
                
                simulateCircuit(simState.nodes, simState.wires);
                
                // Read outputs
                outputValues = internalLeds.map(led => led.state);
            } else {
                // Standard Gates
                if (node.type === 'AND') outputValues = [inputValues[0] && inputValues[1]];
                else if (node.type === 'OR') outputValues = [inputValues[0] || inputValues[1]];
                else if (node.type === 'NOT') outputValues = [!inputValues[0]];
            }
            
            rows.push({ in: inputValues, out: outputValues });
        }
        
        return { numInputs, numOutputs, rows, label: node.label };
    }

    function showTruthTable(node) {
        const tt = generateTruthTable(node);
        if (!tt) {
            alert('This element does not have a truth table.');
            return;
        }
        
        document.getElementById('tt-modal-title').innerText = `Truth Table: ${tt.label}`;
        
        let theadHtml = '<tr>';
        for(let i=0; i<tt.numInputs; i++) theadHtml += `<th class="text-warning">In ${i+1}</th>`;
        for(let i=0; i<tt.numOutputs; i++) theadHtml += `<th class="text-success">Out ${i+1}</th>`;
        theadHtml += '</tr>';
        document.getElementById('tt-head').innerHTML = theadHtml;
        
        let tbodyHtml = '';
        tt.rows.forEach(row => {
            tbodyHtml += '<tr>';
            row.in.forEach(val => {
                tbodyHtml += `<td style="color: ${val ? '#10b981' : '#ef4444'}">${val ? '1' : '0'}</td>`;
            });
            row.out.forEach(val => {
                tbodyHtml += `<td style="color: ${val ? '#10b981' : '#ef4444'}">${val ? '1' : '0'}</td>`;
            });
            tbodyHtml += '</tr>';
        });
        document.getElementById('tt-body').innerHTML = tbodyHtml;
        
        const modal = new bootstrap.Modal(document.getElementById('truthTableModal'));
        modal.show();
    }

    // Expose logic state for saving
    window.getLogicState = function() {
        return { nodes, wires, nextId };
    };

    window.loadLogicState = function(state) {
        if (!state) return;
        nodes = state.nodes || [];
        wires = state.wires || [];
        nextId = state.nextId || 1;
        simulate();
    };
});
