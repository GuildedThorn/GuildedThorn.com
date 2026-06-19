import { useState, useCallback } from 'react';
import { ReactFlow, Background, BackgroundVariant, Controls, MarkerType, applyNodeChanges, NodeChange} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '@styles/ThornNet.css';
import { Button } from '@components/ui/Button';

const initialNodes = [
    {id: 'd1', position: {x: 0, y: 0}, data: {label: 'AT&T Router (IP Pass-Through)'}},
    {id: 'd2', position: {x: 0, y: 100}, data: {label: 'pfSense Router (VPN, Firewall)'}},
    {id: 'd3', position: {x: 0, y: 200}, data: {label: 'Gigabit Switch (Netgear GS308E)'}},
    {id: 'd4', position: {x: -150, y: 300}, data: {label: 'Gigabit Switch (Netgear GS308E)'}},
    {id: 'd4-n1', position: {x: 150, y: 300}, data: {label: 'MITM (192.168.1.3)'}},
    {id: 'd4-n2', position: {x: 0, y: 400}, data: {label: 'Mac (192.168.1.4)'}},
    {id: 'd4-n3', position: {x: -150, y: 400}, data: {label: 'PXE (192.168.1.5)'}},
    {id: 'd4-n4', position: {x: -300, y: 400}, data: {label: 'Archer (192.168.1.14)'}},
    {id: 'd4-n5', position: {x: -450, y: 400}, data: {label: 'PS2 (Redacted)'}},
    {id: 'd4-n6', position: {x: -600, y: 400}, data: {label: 'Swann Security IP Camera DVR (Redacted)'}},
    {id: 'r1', position: {x: 0, y: 500}, data: {label: 'Cudy Wireless AP (WiFi 6)'}},
    {id: 'r1-ap1', position: {x: 0, y: 600}, data: {label: 'ThornCloud (2.4GHz)'}},
    {id: 'r1-ap1-d1', position: {x: 150, y: 600}, data: {label: 'Wii U (2.4GHz)'}},
    {id: 'r1-ap2', position: {x: 0, y: 700}, data: {label: 'ThornCloud (5GHz)'}},
    {id: 'r1-ap2-d1', position: {x: 0, y: 800}, data: {label: 'Pixel 7 Pro (5GHz)'}},
    {id: 'r1-ap2-d2', position: {x: 150, y: 800}, data: {label: 'ThornPhone 14 (5GHz)'}},
    {id: 'r1-ap2-d3', position: {x: 300, y: 800}, data: {label: 'Apple TV 4K (5GHz)'}},
    {id: 'r1-ap2-d4', position: {x: 450, y: 800}, data: {label: 'ThornPad Pro 4th Gen (5GHz)'}},
    {id: 'r1-ap2-d5', position: {x: 600, y: 800}, data: {label: 'Oculus Quest 2 (5GHz)'}},
    {id: 'r1-ap2-d6', position: {x: 150, y: 900}, data: {label: '2011 Macbook Pro (5GHz)'}},
    {id: 'r1-ap2-d7', position: {x: 300, y: 900}, data: {label: 'Samsung S21 Ultra (5GHz)'}},
    {id: 'r1-ap2-d8', position: {x: 450, y: 900}, data: {label: 'Creality K1C (5GHz)'}},
    {id: 'r2', position: {x: 0, y: 900}, data: {label: 'TP-Link Router (Guest Network)'}},
    {id: 'r2-ap1', position: {x: 0, y: 1000}, data: {label: 'Redacted AP (5GHz)'}},
];

const initialEdges = [
    {id: 'd1-d2', source: 'd1', target: 'd2'},
    {id: 'd2-d3', source: 'd2', target: 'd3'},
    {id: 'd2-d4', source: 'd2', target: 'd4'},
    {id: 'd4-n1', source: 'd4', target: 'd4-n1'},
    {id: 'd4-n2', source: 'd4', target: 'd4-n2'},
    {id: 'd4-n3', source: 'd4', target: 'd4-n3'},
    {id: 'd4-n4', source: 'd4', target: 'd4-n4'},
    {id: 'd4-n5', source: 'd4', target: 'd4-n5'},
    {id: 'd4-n6', source: 'd4', target: 'd4-n6'},
    {id: 'd3-r1', source: 'd3', target: 'r1'},
    {id: 'r1-ap1', source: 'r1', target: 'r1-ap1'},
    {id: 'r1-ap1-d1', source: 'r1-ap1', target: 'r1-ap1-d1'},
    {id: 'r1-ap2', source: 'r1', target: 'r1-ap2'},
    {id: 'r1-ap2-d1', source: 'r1-ap2', target: 'r1-ap2-d1'},
    {id: 'r1-ap2-d2', source: 'r1-ap2', target: 'r1-ap2-d2'},
    {id: 'r1-ap2-d3', source: 'r1-ap2', target: 'r1-ap2-d3'},
    {id: 'r1-ap2-d4', source: 'r1-ap2', target: 'r1-ap2-d4'},
    {id: 'r1-ap2-d5', source: 'r1-ap2', target: 'r1-ap2-d5'},
    {id: 'r1-ap2-d6', source: 'r1-ap2', target: 'r1-ap2-d6'},
    {id: 'r1-ap2-d7', source: 'r1-ap2', target: 'r1-ap2-d7'},
    {id: 'r1-ap2-d8', source: 'r1-ap2', target: 'r1-ap2-d8'},
    {id: 'd2-r2', source: 'd2', target: 'r2'},
    {id: 'r2-ap1', source: 'r2', target: 'r2-ap1'},
];

// Any node that is a source of an edge has children → it's network gear.
// Leaves are endpoint devices. Used to colour the two tiers.
const infraIds = new Set(
    initialEdges.filter(e => e.source !== e.target).map(e => e.source),
);
const tierClass = (id: string) => (infraIds.has(id) ? 'tn-infra' : 'tn-device');
const labelById = new Map(initialNodes.map(n => [n.id, n.data.label]));

// Tidy-tree auto layout: leaves get sequential columns, parents center over
// their children, depth sets the row. No overlap by construction.
function autoLayout() {
    const X_GAP = 200;
    const Y_GAP = 110;
    const childMap = new Map<string, string[]>();
    const hasParent = new Set<string>();

    for (const e of initialEdges) {
        if (e.source === e.target) continue;
        const kids = childMap.get(e.source) ?? [];
        if (!kids.includes(e.target)) {
            kids.push(e.target);
            hasParent.add(e.target);
        }
        childMap.set(e.source, kids);
    }

    const placed: { id: string; col: number; depth: number }[] = [];
    const visited = new Set<string>();
    let nextCol = 0;

    const visit = (id: string, depth: number): number => {
        if (visited.has(id)) return nextCol;
        visited.add(id);
        const kids = (childMap.get(id) ?? []).filter(k => labelById.has(k));
        let col: number;
        if (kids.length === 0) {
            col = nextCol++;
        } else {
            const centers = kids.map(k => visit(k, depth + 1));
            col = (Math.min(...centers) + Math.max(...centers)) / 2;
        }
        placed.push({ id, col, depth });
        return col;
    };

    initialNodes
        .filter(n => !hasParent.has(n.id))
        .forEach(n => visit(n.id, 0));

    return placed.map(p => ({
        id: p.id,
        position: { x: p.col * X_GAP, y: p.depth * Y_GAP },
        data: { label: labelById.get(p.id)! },
        className: tierClass(p.id),
    }));
}

function loadSavedNodes() {
    try {
        const saved = localStorage.getItem('thornnet-nodes-v2');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Keep saved positions, but always re-derive the current label + tier
            // so older saved layouts pick up data/styling fixes.
            if (Array.isArray(parsed)) {
                return parsed.map((n) => ({
                    ...n,
                    data: { ...n.data, label: labelById.get(n.id) ?? n.data?.label },
                    className: tierClass(n.id),
                }));
            }
        }
    } catch (e) {
        console.error("Failed to load saved node positions:", e);
    }
    return autoLayout();
}

export default function ThornNet() {
    const [nodes, setNodes] = useState(loadSavedNodes);
    const [edges] = useState(initialEdges);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            setNodes((nds) => applyNodeChanges(changes, nds));
        },
        []
    );

    const handleSave = () => {
        localStorage.setItem('thornnet-nodes-v2', JSON.stringify(nodes));
        alert("Positions saved!");
    };

    const handleReset = () => {
        localStorage.removeItem('thornnet-nodes-v2');
        setNodes(autoLayout());
    };

    return (
        <div className="page text-left">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl">Network Map</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Live topology of the ThornNet home network. Drag nodes to rearrange,
                        then save your layout.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSave}>
                        Save layout
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        Reset layout
                    </Button>
                </div>
            </div>

            <div className="panel h-[80dvh] w-full overflow-hidden p-0">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    nodesConnectable={false}
                    colorMode="light"
                    fitView
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        animated: true,
                        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
                    }}
                >
                    <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
}