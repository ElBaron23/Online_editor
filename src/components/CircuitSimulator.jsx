import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../context/I18nContext.jsx';

// Component definitions
const COMP_DEF = {
    'BATTERY': { w: 60, h: 80, color: '#f59e0b', label: '9V', val: 9, unit: 'V', ports: [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }] },
    'AC_SOURCE': { w: 60, h: 60, color: '#f59e0b', label: 'AC', val: 5, unit: 'V', ports: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }] },
    'RESISTOR': { w: 80, h: 40, color: '#3b82f6', label: '1kΩ', val: 1000, unit: 'Ω', ports: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }] },
    'CAPACITOR': { w: 60, h: 40, color: '#3b82f6', label: '10µF', val: 0.000010, unit: 'F', ports: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }] },
    'INDUCTOR': { w: 60, h: 40, color: '#10b981', label: '1mH', val: 0.001, unit: 'H', ports: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }] },
    'GROUND': { w: 40, h: 40, color: '#9ca3af', label: 'GND', val: 0, unit: '', ports: [{ x: 0.5, y: 0 }] },
    'LED': { w: 60, h: 40, color: '#ef4444', label: 'LED', val: 2, unit: 'V', ports: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }] },
    'DIODE': { w: 60, h: 40, color: '#10b981', label: 'D', val: 0.7, unit: 'V', ports: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }] },
    'TRANSISTOR': { w: 60, h: 80, color: '#6366f1', label: 'NPN', val: 100, unit: 'hFE', ports: [{ x: 0, y: 0.33 }, { x: 0, y: 0.66 }, { x: 1, y: 0.5 }] },
    'SWITCH': { w: 60, h: 40, color: '#6b7280', label: 'SW', val: 0, unit: '', ports: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }] },
    'NODE': { w: 16, h: 16, color: '#9ca3af', label: '', val: 0, unit: '', ports: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }, { x: 0.5, y: 0 }, { x: 0.5, y: 1 }] }
};

const COMP_BORDER = {
    'BATTERY': '#d97706', 'AC_SOURCE': '#d97706',
    'RESISTOR': '#2563eb', 'CAPACITOR': '#2563eb', 'INDUCTOR': '#059669',
    'LED': '#dc2626', 'DIODE': '#059669', 'TRANSISTOR': '#4f46e5',
    'SWITCH': '#6b7280', 'GROUND': '#6b7280', 'NODE': '#6b7280'
};

const SPICE = {
    GMIN: 1e-12,
    VTHERM: 0.02585,
    ISAT: 1e-14,
    NR_TOL: 1e-6,
    NR_MAX_ITER: 50,
    MAX_DIODE_V: 0.8,
};

export default function CircuitSimulator() {
    const { t } = useTranslation();
    
    const canvasRef = useRef(null);
    const scopeCanvasRef = useRef(null);

    // Interactive coordinate and logic states
    const nodesRef = useRef([]);
    const wiresRef = useRef([]);
    const nextIdRef = useRef(1);
    const cameraXRef = useRef(0);
    const cameraYRef = useRef(0);
    const zoomRef = useRef(1);

    const selectedNodesRef = useRef(new Set());
    const hoveredNodeRef = useRef(null);
    const hoveredWireRef = useRef(null);
    const hoveredPortRef = useRef(null);

    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);
    const dragStartYRef = useRef(0);

    const isWiringRef = useRef(false);
    const wiringStartNodeRef = useRef(null);
    const wiringStartPortRef = useRef(null);
    const mouseXRef = useRef(0);
    const mouseYRef = useRef(0);

    const isPanningRef = useRef(false);
    const isSelectingBoxRef = useRef(false);
    const selectionBoxRef = useRef(null);

    const simTimeRef = useRef(0);
    const lastSimTimeRef = useRef(performance.now());
    const animationTimeRef = useRef(0);
    const scopeHistoryRef = useRef([]);

    // UI React states
    const [isScopeOpen, setIsScopeOpen] = useState(true);
    const [scopeTargetInfo, setScopeTargetInfo] = useState('');
    const [statsText, setStatsText] = useState('Components: 0  Wires: 0  Zoom: 100%');
    const [hudInfoText, setHudInfoText] = useState('');
    const [propertyModalNode, setPropertyModalNode] = useState(null);
    const [propValInput, setPropValInput] = useState('');
    const [propFreqInput, setPropFreqInput] = useState('');

    // Load/Save state
    const loadState = () => {
        try {
            const saved = localStorage.getItem('circuit-board-state');
            if (saved) {
                const parsed = JSON.parse(saved);
                nodesRef.current = parsed.nodes || [];
                wiresRef.current = parsed.wires || [];
                nextIdRef.current = parsed.nextId || 1;
            }
        } catch (e) {
            console.error("Failed to load circuit state", e);
        }
    };

    const saveState = () => {
        const state = {
            nodes: nodesRef.current,
            wires: wiresRef.current,
            nextId: nextIdRef.current
        };
        localStorage.setItem('circuit-board-state', JSON.stringify(state));
    };

    const addNode = (type, x = 100, y = 100) => {
        const def = COMP_DEF[type];
        if (!def) return;
        // Snap to 20px grid
        x = Math.round(x / 20) * 20;
        y = Math.round(y / 20) * 20;
        
        const node = {
            id: 'comp_' + (nextIdRef.current++) + '_' + Math.floor(Math.random()*10000),
            type: type,
            x: x, y: y,
            width: def.w, height: def.h,
            state: false,
            powered: false,
            rotation: 0,
            label: def.label || '',
            val: def.val || 0,
            unit: def.unit || '',
            freq: type === 'AC_SOURCE' ? 50 : 0
        };
        nodesRef.current = [...nodesRef.current, node];
        saveState();
        simulate();
    };

    // math Nodal Analysis functions
    const luSolve = (A, b) => {
        const n = A.length;
        let M = A.map(row => [...row]);
        let rhs = [...b];
        let piv = Array.from({length: n}, (_, i) => i);

        for (let col = 0; col < n; col++) {
            let maxVal = Math.abs(M[col][col]);
            let maxRow = col;
            for (let row = col + 1; row < n; row++) {
                if (Math.abs(M[row][col]) > maxVal) {
                    maxVal = Math.abs(M[row][col]);
                    maxRow = row;
                }
            }
            if (maxRow !== col) {
                [M[col], M[maxRow]] = [M[maxRow], M[col]];
                [rhs[col], rhs[maxRow]] = [rhs[maxRow], rhs[col]];
                [piv[col], piv[maxRow]] = [piv[maxRow], piv[col]];
            }

            let pivot = M[col][col];
            if (Math.abs(pivot) < 1e-18) continue;

            for (let row = col + 1; row < n; row++) {
                let factor = M[row][col] / pivot;
                M[row][col] = factor;
                for (let j = col + 1; j < n; j++) {
                    M[row][j] -= factor * M[col][j];
                }
                rhs[row] -= factor * rhs[col];
            }
        }

        let x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            if (Math.abs(M[i][i]) < 1e-18) {
                x[i] = 0;
                continue;
            }
            let sum = rhs[i];
            for (let j = i + 1; j < n; j++) {
                sum -= M[i][j] * x[j];
            }
            x[i] = sum / M[i][i];
        }
        return x;
    };

    const diodeStamp = (vd, isLed = false) => {
        let vOffset = isLed ? 1.4 : 0.0;
        let vdLim = vd - vOffset;
        if (vdLim > SPICE.MAX_DIODE_V) vdLim = SPICE.MAX_DIODE_V;
        if (vdLim < -5) vdLim = -5;

        let expTerm = Math.exp(vdLim / SPICE.VTHERM);
        let id = SPICE.ISAT * (expTerm - 1);
        let geq = (SPICE.ISAT / SPICE.VTHERM) * expTerm;
        let ieq = id - geq * vdLim;

        return { geq, ieq: ieq - geq * vOffset };
    };

    const stampConductance = (A, n1, n2, g) => {
        if (n1 > 0) A[n1-1][n1-1] += g;
        if (n2 > 0) A[n2-1][n2-1] += g;
        if (n1 > 0 && n2 > 0) {
            A[n1-1][n2-1] -= g;
            A[n2-1][n1-1] -= g;
        }
    };

    const stampCurrentSource = (z, n1, n2, i) => {
        if (n1 > 0) z[n1-1] -= i;
        if (n2 > 0) z[n2-1] += i;
    };

    const stampVoltageSource = (A, z, nPlus, nMinus, v, vsIdx, m) => {
        let row = m + vsIdx;
        if (nPlus > 0) {
            A[nPlus-1][row] += 1;
            A[row][nPlus-1] += 1;
        }
        if (nMinus > 0) {
            A[nMinus-1][row] -= 1;
            A[row][nMinus-1] -= 1;
        }
        z[row] = v;
    };

    const simulate = () => {
        const tempNodes = nodesRef.current;
        const tempWires = wiresRef.current;
        if (tempNodes.length === 0) return;

        let now = performance.now();
        let dt = (now - lastSimTimeRef.current) / 1000.0;
        if (dt > 0.1) dt = 0.1;
        if (dt < 0.0005) dt = 0.0005;
        lastSimTimeRef.current = now;
        simTimeRef.current += dt;

        // Reset
        tempNodes.forEach(n => {
            n.powered = false;
            if (!n._hist) n._hist = { vc: 0, il: 0, vd: 0.6 };
            if (!n.v) n.v = [0, 0, 0, 0];
            if (n.v.length >= 2) n._hist.vc = n.v[0] - n.v[1];
            n._pwr = 0;
        });
        tempWires.forEach(w => w.powered = false);

        // Map pin mapping
        let pinToNode = new Map();
        let eNodeCount = 0;
        tempNodes.forEach(n => {
            const def = COMP_DEF[n.type];
            if (def && def.ports) {
                for (let i = 0; i < def.ports.length; i++) {
                    pinToNode.set(n.id + '_' + i, eNodeCount++);
                }
            }
        });

        let parent = Array.from({length: eNodeCount}, (_, i) => i);
        const findRoot = (i) => {
            while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
            return i;
        };
        const union = (a, b) => {
            let ra = findRoot(a), rb = findRoot(b);
            if (ra !== rb) parent[ra] = rb;
        };

        tempWires.forEach(w => {
            let k1 = w.from + '_' + w.fromPort;
            let k2 = w.to + '_' + w.toPort;
            if (pinToNode.has(k1) && pinToNode.has(k2)) {
                union(pinToNode.get(k1), pinToNode.get(k2));
            }
        });

        let groundRoot = -1;
        tempNodes.forEach(n => {
            if (n.type === 'GROUND') {
                groundRoot = findRoot(pinToNode.get(n.id + '_0'));
            }
        });

        let enodeMap = new Map();
        let nextIdVal = 1;
        if (groundRoot !== -1) enodeMap.set(groundRoot, 0);

        for (let i = 0; i < eNodeCount; i++) {
            let root = findRoot(i);
            if (!enodeMap.has(root)) {
                if (groundRoot === -1 && enodeMap.size === 0) {
                    enodeMap.set(root, 0);
                    groundRoot = root;
                } else {
                    enodeMap.set(root, nextIdVal++);
                }
            }
        }

        const getNodeIdx = (compId, portIdx) => {
            let key = compId + '_' + portIdx;
            if (!pinToNode.has(key)) return 0;
            return enodeMap.get(findRoot(pinToNode.get(key))) || 0;
        };

        const N = enodeMap.size;
        if (N <= 1) return;
        const m = N - 1;

        let vSources = [];
        tempNodes.forEach(n => {
            if (n.type === 'BATTERY' || n.type === 'AC_SOURCE') {
                let v = n.val || 0;
                if (n.type === 'AC_SOURCE') {
                    v = (n.val || 5) * Math.sin(2 * Math.PI * (n.freq || 50) * simTimeRef.current);
                }
                vSources.push({ node: n, v, nPlus: getNodeIdx(n.id, 0), nMinus: getNodeIdx(n.id, 1) });
            } else if (n.type === 'SWITCH' && n.state) {
                vSources.push({ node: n, v: 0, nPlus: getNodeIdx(n.id, 0), nMinus: getNodeIdx(n.id, 1) });
            }
        });

        const M = vSources.length;
        const size = m + M;
        if (size === 0) return;

        let converged = false;
        let prevVoltages = new Array(size).fill(0);

        for (let nrIter = 0; nrIter < SPICE.NR_MAX_ITER; nrIter++) {
            let A = Array(size).fill(0).map(() => Array(size).fill(0));
            let z = Array(size).fill(0);

            for (let i = 0; i < m; i++) A[i][i] += SPICE.GMIN;

            tempNodes.forEach(n => {
                let n1 = getNodeIdx(n.id, 0);
                let n2 = getNodeIdx(n.id, 1);

                if (n.type === 'RESISTOR') {
                    let g = 1 / (n.val || 1000);
                    stampConductance(A, n1, n2, g);
                } else if (n.type === 'CAPACITOR') {
                    let c = n.val || 0.000010;
                    let geq = c / dt;
                    stampConductance(A, n1, n2, geq);
                    let ihist = geq * n._hist.vc;
                    stampCurrentSource(z, n2, n1, ihist);
                } else if (n.type === 'INDUCTOR') {
                    let l = n.val || 0.001;
                    let geq = dt / l;
                    stampConductance(A, n1, n2, geq);
                    let ihist = n._hist.il;
                    stampCurrentSource(z, n1, n2, ihist);
                } else if (n.type === 'DIODE' || n.type === 'LED') {
                    let vd = n._hist.vd || (n.type === 'LED' ? 1.8 : 0.6);
                    let ds = diodeStamp(vd, n.type === 'LED');
                    stampConductance(A, n1, n2, ds.geq);
                    stampCurrentSource(z, n1, n2, ds.ieq);
                } else if (n.type === 'TRANSISTOR') {
                    let nB = getNodeIdx(n.id, 0);
                    let nC = getNodeIdx(n.id, 1);
                    let nE = getNodeIdx(n.id, 2);
                    let beta = n.val || 100;
                    let vbe = n._hist.vd || 0.6;
                    let dsBE = diodeStamp(vbe);
                    stampConductance(A, nB, nE, dsBE.geq);
                    stampCurrentSource(z, nB, nE, dsBE.ieq);
                    
                    let gm = beta * dsBE.geq;
                    if (nC > 0 && nB > 0) A[nC-1][nB-1] += gm;
                    if (nC > 0 && nE > 0) A[nC-1][nE-1] -= gm;
                    if (nE > 0 && nB > 0) A[nE-1][nB-1] -= gm;
                    if (nE > 0 && nE > 0) A[nE-1][nE-1] += gm;
                    
                    let ieqC = beta * dsBE.ieq;
                    stampCurrentSource(z, nC, nE, ieqC);
                }
            });

            vSources.forEach((src, idx) => {
                stampVoltageSource(A, z, src.nPlus, src.nMinus, src.v, idx, m);
            });

            let x = luSolve(A, z);

            let maxDiff = 0;
            for (let i = 0; i < size; i++) {
                let diff = Math.abs(x[i] - prevVoltages[i]);
                if (diff > maxDiff) maxDiff = diff;
            }

            let nodeVoltages = new Array(N).fill(0);
            for (let i = 1; i < N; i++) nodeVoltages[i] = x[i-1];

            tempNodes.forEach(n => {
                if (n.type === 'DIODE' || n.type === 'LED') {
                    n._hist.vd = nodeVoltages[getNodeIdx(n.id, 0)] - nodeVoltages[getNodeIdx(n.id, 1)];
                }
                if (n.type === 'TRANSISTOR') {
                    n._hist.vd = nodeVoltages[getNodeIdx(n.id, 0)] - nodeVoltages[getNodeIdx(n.id, 2)];
                }
            });

            prevVoltages = [...x];
            if (maxDiff < SPICE.NR_TOL) {
                converged = true;
                break;
            }
        }

        let nodeVoltages = new Array(N).fill(0);
        for (let i = 1; i < N; i++) nodeVoltages[i] = prevVoltages[i-1];

        tempNodes.forEach(n => {
            const def = COMP_DEF[n.type];
            if (!def || !def.ports) return;

            n.v = [];
            for (let i = 0; i < def.ports.length; i++) {
                n.v[i] = nodeVoltages[getNodeIdx(n.id, i)];
            }

            if (n.v.length >= 2) {
                let vDrop = n.v[0] - n.v[1];
                if (n.type === 'RESISTOR') {
                    n.current = vDrop / (n.val || 1000);
                } else if (n.type === 'CAPACITOR') {
                    let c = n.val || 0.000010;
                    let geq = c / dt;
                    n.current = geq * (vDrop - n._hist.vc);
                    n._hist.vc = vDrop;
                } else if (n.type === 'INDUCTOR') {
                    let l = n.val || 0.001;
                    n._hist.il = n._hist.il + (vDrop * dt) / l;
                    n.current = n._hist.il;
                } else if (n.type === 'DIODE' || n.type === 'LED') {
                    let ds = diodeStamp(vDrop, n.type === 'LED');
                    n.current = ds.geq * vDrop + ds.ieq;
                }
                n._pwr = Math.abs(vDrop) * Math.abs(n.current || 0);
                if (Math.abs(vDrop) > 0.05 || Math.abs(n.current || 0) > 1e-6) {
                    n.powered = true;
                }
            }

            let vsIdx = vSources.findIndex(s => s.node.id === n.id);
            if (vsIdx >= 0) {
                n.current = prevVoltages[m + vsIdx];
                if (Math.abs(n.current) > 1e-6) n.powered = true;
            }
        });

        tempWires.forEach(w => {
            let enode = getNodeIdx(w.from, w.fromPort);
            if (enode !== undefined && Math.abs(nodeVoltages[enode]) > 0.01) w.powered = true;
        });
    };

    const getPortPosRaw = (node, index) => {
        const def = COMP_DEF[node.type];
        if (!def || !def.ports || !def.ports[index]) return { x: node.x, y: node.y };
        
        const portDef = def.ports[index];
        let px = node.x + portDef.x * node.width;
        let py = node.y + portDef.y * node.height;
        
        let cx = node.x + node.width / 2;
        let cy = node.y + node.height / 2;
        if (node.rotation) {
            let rad = node.rotation * Math.PI / 180;
            let rx = Math.cos(rad) * (px - cx) - Math.sin(rad) * (py - cy) + cx;
            let ry = Math.sin(rad) * (px - cx) + Math.cos(rad) * (py - cy) + cy;
            return { x: rx, y: ry };
        }
        return { x: px, y: py };
    };

    // Draw Board
    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // bg gradient
        let bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bg.addColorStop(0, '#0d1117');
        bg.addColorStop(1, '#161b22');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Dot grid
        const gridSize = 20 * zoomRef.current;
        const offsetX = cameraXRef.current % gridSize;
        const offsetY = cameraYRef.current % gridSize;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        for (let x = offsetX; x < canvas.width; x += gridSize) {
            for (let y = offsetY; y < canvas.height; y += gridSize) {
                ctx.fillRect(x, y, 1.5, 1.5);
            }
        }

        ctx.save();
        ctx.translate(cameraXRef.current, cameraYRef.current);
        ctx.scale(zoomRef.current, zoomRef.current);

        // Draw Wires
        wiresRef.current.forEach(wire => {
            const fromNode = nodesRef.current.find(n => n.id === wire.from);
            const toNode = nodesRef.current.find(n => n.id === wire.to);
            if (!fromNode || !toNode) return;
            
            const p1 = getPortPosRaw(fromNode, wire.fromPort);
            const p2 = getPortPosRaw(toNode, wire.toPort);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            const midX = (p1.x + p2.x) / 2;
            ctx.bezierCurveTo(midX, p1.y, midX, p2.y, p2.x, p2.y);
            
            ctx.strokeStyle = wire.powered ? '#22d3ee' : '#4b5563';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        });

        // Wiring preview
        if (isWiringRef.current && wiringStartNodeRef.current) {
            const p1 = getPortPosRaw(wiringStartNodeRef.current, wiringStartPortRef.current);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            const midX = (p1.x + mouseXRef.current) / 2;
            ctx.bezierCurveTo(midX, p1.y, midX, mouseYRef.current, mouseXRef.current, mouseYRef.current);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#60a5fa';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw Nodes
        nodesRef.current.forEach(node => {
            const isSelected = selectedNodesRef.current.has(node.id);
            const isHovered = (node === hoveredNodeRef.current);
            const borderColor = COMP_BORDER[node.type] || '#6b7280';

            ctx.save();
            ctx.translate(node.x + node.width/2, node.y + node.height/2);
            if (node.rotation) ctx.rotate(node.rotation * Math.PI / 180);
            ctx.translate(-node.width/2, -node.height/2);

            // Draw visual parts of components battery, resistor, ground, etc.
            ctx.strokeStyle = isSelected ? '#3b82f6' : (isHovered ? '#ffffff' : borderColor);
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, node.width, node.height);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(node.label || node.type, node.width/2, node.height/2);

            ctx.restore();

            // Draw Ports
            const def = COMP_DEF[node.type];
            if (def && def.ports) {
                def.ports.forEach((p, idx) => {
                    const portPos = getPortPosRaw(node, idx);
                    ctx.fillStyle = node.powered ? '#22c55e' : '#9ca3af';
                    ctx.beginPath();
                    ctx.arc(portPos.x, portPos.y, 4, 0, Math.PI*2);
                    ctx.fill();
                    ctx.stroke();
                });
            }
        });

        ctx.restore();
    };

    // Draw Oscilloscope
    const drawScope = () => {
        const canvas = scopeCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#050a05';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // grid lines
        ctx.strokeStyle = '#0a1a0a';
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
        for (let y = 0; y < canvas.height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
        ctx.stroke();

        ctx.strokeStyle = '#0f2f0f';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        let target = nodesRef.current.find(n => selectedNodesRef.current.has(n.id)) || hoveredNodeRef.current;
        if (!target) {
            setScopeTargetInfo('- No Component Selected');
            return;
        }

        setScopeTargetInfo(`- ${COMP_DEF[target.type]?.label || target.type} (${target.label || 'No Value'})`);

        let val = 0;
        if (target.v && target.v.length >= 2) {
            val = target.v[0] - target.v[1];
        }

        scopeHistoryRef.current.push(val);
        if (scopeHistoryRef.current.length > canvas.width) {
            scopeHistoryRef.current.shift();
        }

        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.beginPath();
        scopeHistoryRef.current.forEach((v, idx) => {
            let y = canvas.height / 2 - (v * 10); // Simple scaling
            if (idx === 0) ctx.moveTo(idx, y);
            else ctx.lineTo(idx, y);
        });
        ctx.stroke();
    };

    // Simulator intervals loops
    useEffect(() => {
        loadState();
        
        let active = true;
        const tick = () => {
            if (!active) return;
            simulate();
            draw();
            drawScope();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        return () => { active = false; };
    }, []);

    // Mouse Interaction
    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        const x = (rawX - cameraXRef.current) / zoomRef.current;
        const y = (rawY - cameraYRef.current) / zoomRef.current;

        if (e.button === 1 || e.button === 2) {
            isPanningRef.current = true;
            dragStartXRef.current = rawX;
            dragStartYRef.current = rawY;
            return;
        }

        if (hoveredPortRef.current) {
            isWiringRef.current = true;
            wiringStartNodeRef.current = hoveredPortRef.current.node;
            wiringStartPortRef.current = hoveredPortRef.current.index;
            return;
        }

        if (hoveredNodeRef.current) {
            const node = hoveredNodeRef.current;
            if (node.type === 'SWITCH') {
                node.state = !node.state;
                saveState();
                simulate();
                return;
            }

            isDraggingRef.current = true;
            dragStartXRef.current = x;
            dragStartYRef.current = y;
            selectedNodesRef.current.clear();
            selectedNodesRef.current.add(node.id);
            node._startX = node.x;
            node._startY = node.y;
            return;
        }

        selectedNodesRef.current.clear();
        isSelectingBoxRef.current = true;
        selectionBoxRef.current = { x, y, startX: x, startY: y, w: 0, h: 0 };
    };

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        const x = (rawX - cameraXRef.current) / zoomRef.current;
        const y = (rawY - cameraYRef.current) / zoomRef.current;
        
        mouseXRef.current = x;
        mouseYRef.current = y;

        if (isPanningRef.current) {
            cameraXRef.current += rawX - dragStartXRef.current;
            cameraYRef.current += rawY - dragStartYRef.current;
            dragStartXRef.current = rawX;
            dragStartYRef.current = rawY;
            return;
        }

        if (isDraggingRef.current) {
            const dx = x - dragStartXRef.current;
            const dy = y - dragStartYRef.current;
            nodesRef.current.forEach(n => {
                if (selectedNodesRef.current.has(n.id)) {
                    n.x = n._startX + dx;
                    n.y = n._startY + dy;
                }
            });
            return;
        }

        // Hit testing
        hoveredNodeRef.current = null;
        hoveredPortRef.current = null;

        for (let i = nodesRef.current.length - 1; i >= 0; i--) {
            const node = nodesRef.current[i];
            const def = COMP_DEF[node.type];

            if (def && def.ports) {
                for (let j = 0; j < def.ports.length; j++) {
                    const portPos = getPortPosRaw(node, j);
                    if (Math.hypot(portPos.x - x, portPos.y - y) < 12) {
                        hoveredPortRef.current = { node, index: j };
                        return;
                    }
                }
            }

            if (x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height) {
                hoveredNodeRef.current = node;
                break;
            }
        }
    };

    const handleMouseUp = (e) => {
        isPanningRef.current = false;
        isDraggingRef.current = false;

        if (isWiringRef.current) {
            if (hoveredPortRef.current && hoveredPortRef.current.node.id !== wiringStartNodeRef.current.id) {
                wiresRef.current.push({
                    from: wiringStartNodeRef.current.id,
                    fromPort: wiringStartPortRef.current,
                    to: hoveredPortRef.current.node.id,
                    toPort: hoveredPortRef.current.index,
                    powered: false
                });
                saveState();
                simulate();
            }
            isWiringRef.current = false;
            wiringStartNodeRef.current = null;
        }

        isSelectingBoxRef.current = false;
        selectionBoxRef.current = null;
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const rect = canvasRef.current.getBoundingClientRect();
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

    return (
        <div className="w-100 h-100 d-flex flex-column" style={{ background: '#1e1e1e' }}>
            {/* Circuit Toolbar */}
            <div className="p-2 mb-0 d-flex gap-2" style={{ background: '#252526', borderBottom: '1px solid #333' }}>
                <div className="d-flex gap-2 align-items-center">
                    <button className="btn btn-sm btn-outline-warning" onClick={() => addNode('BATTERY')}>Battery</button>
                    <button className="btn btn-sm btn-outline-warning" onClick={() => addNode('AC_SOURCE')}>AC Power</button>
                    <button className="btn btn-sm btn-outline-info" onClick={() => addNode('RESISTOR')}>Resistor</button>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => addNode('CAPACITOR')}>Capacitor</button>
                    <button className="btn btn-sm btn-outline-success" onClick={() => addNode('INDUCTOR')}>Inductor</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => addNode('GROUND')}>GND</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => addNode('LED')}>LED</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => addNode('DIODE')}>Diode</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => addNode('TRANSISTOR')}>Transistor</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => addNode('SWITCH')}>Switch</button>
                    <button className="btn btn-sm btn-outline-info" onClick={() => addNode('NODE')}>Node</button>
                </div>
                <div className="ms-auto d-flex gap-2">
                    <button className="btn btn-sm btn-outline-success" onClick={() => setIsScopeOpen(prev => !prev)}>
                        <i className="fa-solid fa-wave-square"></i>
                    </button>
                    <button
                        className="btn btn-sm btn-danger px-3"
                        onClick={() => {
                            nodesRef.current = [];
                            wiresRef.current = [];
                            selectedNodesRef.current.clear();
                            saveState();
                        }}
                    >
                        {t("clear")}
                    </button>
                </div>
            </div>

            {/* Board Canvas */}
            <div className="flex-grow-1 position-relative" style={{ overflow: 'hidden' }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onWheel={handleWheel}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
                />
            </div>

            {/* Scope Panel */}
            {isScopeOpen && (
                <div id="circuit-scope-panel" className="border-top border-secondary" style={{ height: '200px', background: '#050a05', position: 'relative' }}>
                    <div className="text-white small p-1 position-absolute d-flex justify-content-between w-100" style={{ top: 0, left: 0, zIndex: 10, fontFamily: "'Courier New', monospace", pointerEvents: 'none' }}>
                        <div><span className="text-success fw-bold">OSCILLOSCOPE</span> <span className="text-warning">{scopeTargetInfo}</span></div>
                        <div style={{ pointerEvents: 'auto', paddingRight: '15px', paddingTop: '5px' }}>
                            <button className="btn btn-sm text-secondary p-0 text-decoration-none hover-white" onClick={() => setIsScopeOpen(false)} title="Close Scope">
                                <i className="fa-solid fa-xmark fs-5"></i>
                            </button>
                        </div>
                    </div>
                    <canvas ref={scopeCanvasRef} id="scope-canvas" style={{ width: '100%', height: '100%' }}></canvas>
                </div>
            )}
        </div>
    );
}
