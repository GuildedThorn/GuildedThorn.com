import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { cn } from '@lib/utils';

interface GraphNode {
    id: string;
    title: string;
    folder: string;
}

interface GraphEdge {
    source: string;
    target: string;
}

interface Graph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

interface SimNode {
    id: string;
    title: string;
    color: string;
    degree: number;
    radius: number;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    // Pinned graph-space position while the user is dragging this node.
    fx: number | null;
    fy: number | null;
}

interface SimLink {
    source: SimNode;
    target: SimNode;
}

interface Sim {
    nodes: SimNode[];
    links: SimLink[];
    neighbors: Map<string, Set<string>>;
    hubThreshold: number;
}

interface Projected {
    x: number;
    y: number;
    depth: number;
    scale: number;
}

const FOLDER_COLORS = [
    '#6366f1', '#22c55e', '#f97316', '#ec4899', '#06b6d4', '#eab308', '#a855f7', '#14b8a6',
];

function colorForFolder(folder: string, palette: Map<string, string>): string {
    if (!palette.has(folder)) {
        palette.set(folder, FOLDER_COLORS[palette.size % FOLDER_COLORS.length]);
    }
    return palette.get(folder)!;
}

// Physics tuning — a classic force-directed layout (repel + spring links +
// weak centering + collision), run continuously like Obsidian's graph rather
// than computed once and frozen. The simulation always runs in full 3D (x,y,z)
// — in 2D mode every node's z sits at 0, which makes the 3D formulas below
// reduce exactly to plain 2D forces, so toggling 3D on/off never changes the
// 2D layout you already get by default.
const REPULSION = 5500;
const LINK_DISTANCE = 150;
const LINK_STRENGTH = 0.08;
const CENTER_STRENGTH = 0.008;
const FRICTION = 0.86;
const ALPHA_DECAY = 0.02;
const ALPHA_MIN = 0.001;
// How many ticks to pre-run synchronously (no rendering) before the graph is
// ever painted, so it appears already-settled instead of visibly exploding
// out from its initial circular seed layout on every mount.
const WARMUP_TICKS = 300;
const CAMERA_DISTANCE = 520;

function buildSim(graph: Graph): Sim {
    const degree = new Map<string, number>();
    graph.edges.forEach((e) => {
        degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
        degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    });

    const palette = new Map<string, string>();
    const nodes: SimNode[] = graph.nodes.map((n, i) => {
        const angle = (i / Math.max(1, graph.nodes.length)) * Math.PI * 2;
        const deg = degree.get(n.id) ?? 0;
        return {
            id: n.id,
            title: n.title,
            color: colorForFolder(n.folder, palette),
            degree: deg,
            radius: Math.min(10, 2.5 + Math.sqrt(deg) * 1.8),
            x: Math.cos(angle) * 220,
            y: Math.sin(angle) * 220,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            fx: null,
            fy: null,
        };
    });

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = graph.edges
        .map((e) => ({ source: byId.get(e.source), target: byId.get(e.target) }))
        .filter((l): l is SimLink => !!l.source && !!l.target);

    const neighbors = new Map<string, Set<string>>();
    links.forEach((l) => {
        if (!neighbors.has(l.source.id)) neighbors.set(l.source.id, new Set());
        if (!neighbors.has(l.target.id)) neighbors.set(l.target.id, new Set());
        neighbors.get(l.source.id)!.add(l.target.id);
        neighbors.get(l.target.id)!.add(l.source.id);
    });

    const maxDegree = Math.max(1, ...nodes.map((n) => n.degree));
    const sim: Sim = { nodes, links, neighbors, hubThreshold: Math.max(4, Math.ceil(maxDegree * 0.65)) };

    let warmupAlpha = 1;
    for (let i = 0; i < WARMUP_TICKS && warmupAlpha > ALPHA_MIN; i++) {
        stepSimulation(sim, warmupAlpha);
        warmupAlpha *= 1 - ALPHA_DECAY;
    }

    return sim;
}

function stepSimulation(sim: Sim, alpha: number) {
    const { nodes, links } = sim;

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let dz = a.z - b.z;
            const distSq = dx * dx + dy * dy + dz * dz || 0.01;
            const force = (REPULSION * alpha) / distSq;
            const dist = Math.sqrt(distSq);
            dx = (dx / dist) * force;
            dy = (dy / dist) * force;
            dz = (dz / dist) * force;
            a.vx += dx; a.vy += dy; a.vz += dz;
            b.vx -= dx; b.vy -= dy; b.vz -= dz;
        }
    }

    links.forEach(({ source, target }) => {
        let dx = target.x - source.x;
        let dy = target.y - source.y;
        let dz = target.z - source.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
        const force = (dist - LINK_DISTANCE) * LINK_STRENGTH * alpha;
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        dz = (dz / dist) * force;
        source.vx += dx; source.vy += dy; source.vz += dz;
        target.vx -= dx; target.vy -= dy; target.vz -= dz;
    });

    nodes.forEach((n) => {
        n.vx -= n.x * CENTER_STRENGTH * alpha;
        n.vy -= n.y * CENTER_STRENGTH * alpha;
        n.vz -= n.z * CENTER_STRENGTH * alpha;
    });

    // Collision — keep circles from overlapping regardless of alpha, so the
    // graph stays readable even once the simulation has cooled.
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dz = b.z - a.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
            const minDist = a.radius + b.radius + 22;
            if (dist < minDist) {
                const overlap = (minDist - dist) / 2;
                dx = (dx / dist) * overlap;
                dy = (dy / dist) * overlap;
                dz = (dz / dist) * overlap;
                if (a.fx === null) { a.x -= dx; a.y -= dy; a.z -= dz; }
                if (b.fx === null) { b.x += dx; b.y += dy; b.z += dz; }
            }
        }
    }

    nodes.forEach((n) => {
        if (n.fx !== null && n.fy !== null) {
            n.x = n.fx; n.y = n.fy; n.vx = 0; n.vy = 0;
            n.vz *= FRICTION;
            n.z += n.vz;
            return;
        }
        n.vx *= FRICTION;
        n.vy *= FRICTION;
        n.vz *= FRICTION;
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
    });
}

// Reads a real resolved color from the site's own stylesheet via a throwaway
// probe element, so the canvas always matches the current theme (light/dark/
// system) without hardcoding anything — "my css" stays the source of truth.
function resolveColor(className: string, prop: 'color' | 'backgroundColor' | 'borderColor'): string {
    const probe = document.createElement('div');
    probe.className = className;
    probe.style.position = 'fixed';
    probe.style.opacity = '0';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);
    const value = getComputedStyle(probe)[prop];
    document.body.removeChild(probe);
    return value;
}

interface ThemeColors {
    foreground: string;
    mutedForeground: string;
    primary: string;
    card: string;
    border: string;
}

function readThemeColors(): ThemeColors {
    return {
        foreground: resolveColor('text-foreground', 'color'),
        mutedForeground: resolveColor('text-muted-foreground', 'color'),
        primary: resolveColor('text-primary', 'color'),
        card: resolveColor('bg-card', 'backgroundColor'),
        border: resolveColor('border-border', 'borderColor'),
    };
}

interface KnowledgeGraphProps {
    /** Slug to visually anchor on and center the initial view around — "you are
     * here" when the graph is embedded at the bottom of a specific note. */
    focusSlug?: string;
}

export default function KnowledgeGraph({ focusSlug }: KnowledgeGraphProps) {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [graph, setGraph] = useState<Graph | null>(null);
    const [is3D, setIs3D] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const focusSlugRef = useRef(focusSlug);
    useEffect(() => {
        focusSlugRef.current = focusSlug;
    }, [focusSlug]);

    const simRef = useRef<Sim | null>(null);
    const alphaRef = useRef(1);
    const transformRef = useRef({ x: 0, y: 0, k: 1 });
    const hoverRef = useRef<SimNode | null>(null);
    const is3DRef = useRef(false);
    const everSpread3DRef = useRef(false);
    const cameraRef = useRef({ rotX: 0.35, rotY: 0.6 });
    const autoRotateRef = useRef(true);
    const colorsRef = useRef<ThemeColors>({
        foreground: '#111', mutedForeground: '#888', primary: '#6366f1', card: '#fff', border: '#ddd',
    });

    useEffect(() => {
        fetch('/api/knowledgebase/graph')
            .then((res) => res.json())
            .then(setGraph)
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!graph || graph.nodes.length === 0) return;
        // buildSim already pre-warms the layout synchronously (see WARMUP_TICKS),
        // so it starts near its resting position — alpha only needs a small
        // residual so it keeps gently easing in rather than sitting dead-still.
        const sim = buildSim(graph);
        simRef.current = sim;
        alphaRef.current = 0.05;

        // Center the initial view on the focused note rather than the graph's
        // overall centroid, so "you are here" is visible without panning.
        const focusNode = focusSlug ? sim.nodes.find((n) => n.id === focusSlug) : undefined;
        if (focusNode) {
            transformRef.current = { x: -focusNode.x, y: -focusNode.y, k: 1 };
        }
    }, [graph, focusSlug]);

    // Toggling into 3D the first time scatters nodes off the z=0 plane (they'd
    // otherwise sit on a flat disc) and reheats the simulation so they visibly
    // billow out into a cloud; later toggles just change the camera/projection,
    // since the physics runs in 3D continuously regardless of view mode.
    useEffect(() => {
        is3DRef.current = is3D;
        if (is3D && !everSpread3DRef.current && simRef.current) {
            everSpread3DRef.current = true;
            simRef.current.nodes.forEach((n) => {
                n.z = (Math.random() - 0.5) * 400;
            });
            alphaRef.current = Math.max(alphaRef.current, 0.5);
        }
    }, [is3D]);

    // Stay in sync if the user exits fullscreen via Escape or the browser's
    // own UI rather than our button.
    useEffect(() => {
        const handler = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            containerRef.current?.requestFullscreen().catch(() => {
                // Fullscreen API unsupported/denied (e.g. some mobile browsers) —
                // nothing to fall back to here beyond the normal panel size.
            });
        }
    };

    // Keep canvas colors in sync with the site's light/dark/system theme
    // (see src/lib/theme.ts — it toggles `color-scheme` on <html>, so we
    // watch that attribute plus the OS-level media query).
    useEffect(() => {
        colorsRef.current = readThemeColors();
        const refresh = () => { colorsRef.current = readThemeColors(); };

        const observer = new MutationObserver(refresh);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        media.addEventListener('change', refresh);

        return () => {
            observer.disconnect();
            media.removeEventListener('change', refresh);
        };
    }, []);

    // Canvas sizing (device-pixel-ratio aware) + the render/simulation loop.
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const resize = () => {
            const { clientWidth: w, clientHeight: h } = container;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
        };
        resize();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);

        const toScreen = (x: number, y: number) => {
            const { k, x: panX, y: panY } = transformRef.current;
            return {
                x: canvas.width / (2 * dpr) + (x + panX) * k,
                y: canvas.height / (2 * dpr) + (y + panY) * k,
            };
        };
        const toGraph = (sx: number, sy: number) => {
            const { k, x: panX, y: panY } = transformRef.current;
            return {
                x: (sx - canvas.width / (2 * dpr)) / k - panX,
                y: (sy - canvas.height / (2 * dpr)) / k - panY,
            };
        };

        // In 2D mode this is just toScreen(x, y). In 3D mode it rotates the
        // point around the camera's yaw/pitch, applies a simple perspective
        // divide, then reuses the same pan/zoom screen mapping.
        const project = (n: SimNode): Projected => {
            if (!is3DRef.current) {
                const s = toScreen(n.x, n.y);
                return { x: s.x, y: s.y, depth: 0, scale: 1 };
            }
            const { rotX, rotY } = cameraRef.current;
            const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
            const x1 = n.x * cosY - n.z * sinY;
            const z1 = n.x * sinY + n.z * cosY;
            const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
            const y2 = n.y * cosX - z1 * sinX;
            const z2 = n.y * sinX + z1 * cosX;
            const scale = CAMERA_DISTANCE / (CAMERA_DISTANCE + z2);
            const s = toScreen(x1 * scale, y2 * scale);
            return { x: s.x, y: s.y, depth: z2, scale };
        };

        const nodeAt = (sx: number, sy: number): SimNode | null => {
            const sim = simRef.current;
            if (!sim) return null;
            let best: SimNode | null = null;
            let bestScale = -Infinity;
            for (const n of sim.nodes) {
                const p = project(n);
                const dx = p.x - sx;
                const dy = p.y - sy;
                const tolerance = n.radius * p.scale * transformRef.current.k + 4;
                if (Math.sqrt(dx * dx + dy * dy) <= tolerance && p.scale > bestScale) {
                    best = n;
                    bestScale = p.scale;
                }
            }
            return best;
        };

        const render = () => {
            const sim = simRef.current;
            const colors = colorsRef.current;
            const { k } = transformRef.current;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!sim) return;

            const hovered = hoverRef.current;
            const activeNeighbors = hovered ? sim.neighbors.get(hovered.id) : null;
            const focusSlugValue = focusSlugRef.current;
            const focusNeighbors = focusSlugValue ? (sim.neighbors.get(focusSlugValue) ?? null) : null;
            const threeD = is3DRef.current;

            const projections = new Map<SimNode, Projected>();
            sim.nodes.forEach((n) => projections.set(n, project(n)));

            // Edges — sorted back-to-front in 3D so nearer strands draw over
            // farther ones (canvas has no depth buffer of its own).
            const links = threeD
                ? [...sim.links].sort((a, b) => {
                    const da = (projections.get(a.source)!.depth + projections.get(a.target)!.depth) / 2;
                    const db = (projections.get(b.source)!.depth + projections.get(b.target)!.depth) / 2;
                    return db - da;
                })
                : sim.links;

            links.forEach(({ source, target }) => {
                const isHoverActive = !!hovered && (source.id === hovered.id || target.id === hovered.id);
                const isFocusActive = !!focusSlugValue && (source.id === focusSlugValue || target.id === focusSlugValue);
                const isActive = isHoverActive || isFocusActive;
                const dimmed = !!hovered && !isActive;
                const a = projections.get(source)!;
                const b = projections.get(target)!;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.strokeStyle = isActive ? colors.primary : colors.mutedForeground;
                ctx.globalAlpha = dimmed ? 0.08 : isActive ? 0.9 : 0.5;
                ctx.lineWidth = isActive ? 1.5 : 1;
                ctx.stroke();
            });

            // Nodes — same back-to-front ordering as edges.
            const nodes = threeD
                ? [...sim.nodes].sort((a, b) => projections.get(b)!.depth - projections.get(a)!.depth)
                : sim.nodes;

            nodes.forEach((n) => {
                const isHovered = n === hovered;
                const isNeighborOfHover = activeNeighbors?.has(n.id) ?? false;
                const isFocus = n.id === focusSlugValue;
                const isNeighborOfFocus = focusNeighbors?.has(n.id) ?? false;
                const isHub = n.degree >= sim.hubThreshold;
                const dimmed = !!hovered && !isHovered && !isNeighborOfHover && !isFocus && !isNeighborOfFocus;
                const proj = projections.get(n)!;
                const depthFade = threeD ? Math.min(1, Math.max(0.4, proj.scale)) : 1;
                const r = n.radius * proj.scale * k;

                ctx.globalAlpha = (dimmed ? 0.15 : 1) * depthFade;
                if (isHovered || isNeighborOfHover || isFocus) {
                    ctx.shadowColor = n.color;
                    ctx.shadowBlur = 12;
                } else {
                    ctx.shadowBlur = 0;
                }
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, Math.max(2, r), 0, Math.PI * 2);
                ctx.fillStyle = n.color;
                ctx.fill();
                ctx.shadowBlur = 0;

                // "You are here" — a persistent ring around whichever note's
                // page this graph is embedded on, regardless of hover state.
                if (isFocus) {
                    ctx.beginPath();
                    ctx.arc(proj.x, proj.y, Math.max(2, r) + 3, 0, Math.PI * 2);
                    ctx.strokeStyle = colors.primary;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Labels always render — hub notes (the well-connected anchors
                // of the web) get a slightly bolder/larger chip so the graph
                // still reads as a hierarchy rather than a flat wall of text.
                ctx.globalAlpha = (dimmed ? 0.35 : 1) * depthFade;
                ctx.font = isHub
                    ? '600 12px ui-sans-serif, system-ui, sans-serif'
                    : '500 10.5px ui-sans-serif, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const fontSize = isHub ? 12 : 10.5;
                const textWidth = ctx.measureText(n.title).width;
                const paddingX = isHub ? 7 : 5;
                const paddingY = isHub ? 3.5 : 2.5;
                const chipW = textWidth + paddingX * 2;
                const chipH = fontSize + paddingY * 2;
                const chipX = proj.x - chipW / 2;
                const chipY = proj.y + r + 6;

                ctx.beginPath();
                ctx.roundRect(chipX, chipY, chipW, chipH, 5);
                ctx.fillStyle = colors.card;
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = isFocus
                    ? colors.primary
                    : (isHovered || isNeighborOfHover || isNeighborOfFocus) ? n.color : colors.border;
                ctx.stroke();

                ctx.fillStyle = colors.foreground;
                ctx.fillText(n.title, proj.x, chipY + chipH / 2 + 0.5);
            });

            ctx.globalAlpha = 1;
        };

        let raf = 0;
        const tick = () => {
            const sim = simRef.current;
            if (sim && alphaRef.current > ALPHA_MIN) {
                stepSimulation(sim, alphaRef.current);
                alphaRef.current *= 1 - ALPHA_DECAY;
            }
            if (is3DRef.current && autoRotateRef.current) {
                cameraRef.current = { ...cameraRef.current, rotY: cameraRef.current.rotY + 0.0015 };
            }
            render();
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        // ---- interaction: hover, drag, pan/rotate, zoom ----
        let dragging: { node: SimNode; moved: boolean } | null = null;
        let panning: { startX: number; startY: number; origin: { x: number; y: number }; camera: { rotX: number; rotY: number } } | null = null;

        const onPointerDown = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const node = nodeAt(sx, sy);
            canvas.setPointerCapture(e.pointerId);
            if (node) {
                dragging = { node, moved: false };
                node.fx = node.x;
                node.fy = node.y;
            } else {
                panning = {
                    startX: e.clientX,
                    startY: e.clientY,
                    origin: { ...transformRef.current },
                    camera: { ...cameraRef.current },
                };
                autoRotateRef.current = false;
            }
        };
        const onPointerMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;

            if (dragging) {
                // Dragging always repositions a node in the flat world x,y
                // plane (its depth is left alone) — simplest, most predictable
                // behavior regardless of the current camera angle.
                const g = toGraph(sx, sy);
                dragging.node.fx = g.x;
                dragging.node.fy = g.y;
                dragging.moved = true;
                alphaRef.current = Math.max(alphaRef.current, 0.3);
                canvas.style.cursor = 'grabbing';
                return;
            }
            if (panning) {
                if (is3DRef.current) {
                    const ROTATE_SPEED = 0.006;
                    cameraRef.current = {
                        rotY: panning.camera.rotY + (e.clientX - panning.startX) * ROTATE_SPEED,
                        rotX: Math.min(1.4, Math.max(-1.4,
                            panning.camera.rotX + (e.clientY - panning.startY) * ROTATE_SPEED)),
                    };
                } else {
                    const { k } = transformRef.current;
                    transformRef.current = {
                        ...transformRef.current,
                        x: panning.origin.x + (e.clientX - panning.startX) / k,
                        y: panning.origin.y + (e.clientY - panning.startY) / k,
                    };
                }
                canvas.style.cursor = 'grabbing';
                return;
            }

            const hit = nodeAt(sx, sy);
            hoverRef.current = hit;
            canvas.style.cursor = hit ? 'pointer' : 'grab';
        };
        const onPointerUp = (e: PointerEvent) => {
            canvas.releasePointerCapture(e.pointerId);
            if (dragging) {
                if (!dragging.moved) navigate(`/kb/${dragging.node.id}`);
                dragging.node.fx = null;
                dragging.node.fy = null;
                alphaRef.current = Math.max(alphaRef.current, 0.3);
            }
            dragging = null;
            panning = null;
            autoRotateRef.current = true;
        };
        const onPointerLeave = () => {
            hoverRef.current = null;
        };
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const before = toGraph(sx, sy);

            const { k } = transformRef.current;
            const nextK = Math.min(4, Math.max(0.2, k * (e.deltaY > 0 ? 0.9 : 1.1)));
            transformRef.current = { ...transformRef.current, k: nextK };

            const after = toGraph(sx, sy);
            transformRef.current = {
                k: nextK,
                x: transformRef.current.x + (after.x - before.x),
                y: transformRef.current.y + (after.y - before.y),
            };
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointerleave', onPointerLeave);
        canvas.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            cancelAnimationFrame(raf);
            resizeObserver.disconnect();
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointerleave', onPointerLeave);
            canvas.removeEventListener('wheel', onWheel);
        };
    }, [navigate]);

    // The canvas must always be in the DOM so the effect above (which only
    // runs once, on mount) can find a real element to attach to — the
    // loading/empty states are overlays on top of it, not early returns that
    // would swap the canvas out of the tree.
    return (
        <div
            ref={containerRef}
            className={cn(
                "panel relative overflow-hidden p-0",
                isFullscreen ? "h-screen w-screen" : "h-[560px] w-full",
            )}
        >
            <canvas ref={canvasRef} className="block h-full w-full touch-none" />
            <div className="absolute right-2 top-2 z-10 flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIs3D((v) => !v)}
                    className="bg-card/80 backdrop-blur"
                    title={is3D ? 'Switch to 2D' : 'Switch to 3D'}
                >
                    <Box className="h-3.5 w-3.5" />
                    {is3D ? '2D' : '3D'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="bg-card/80 backdrop-blur"
                    title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>
            </div>
            {!graph && <div className="absolute inset-0 animate-pulse bg-card/40" />}
            {graph && graph.nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    No notes to graph yet.
                </div>
            )}
        </div>
    );
}
