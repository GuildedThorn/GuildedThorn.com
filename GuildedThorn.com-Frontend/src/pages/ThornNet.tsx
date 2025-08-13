import { useState, useCallback } from 'react';
import { ReactFlow, applyNodeChanges, NodeChange} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '@styles/ThornNet.css';

const initialNodes = [
    {id: 'd1', position: {x: 0, y: 0}, data: {label: 'At&t Router (IP Pass-Through)'}},
    {id: 'd2', position: {x: 0, y: 100}, data: {label: 'Pfsense Router (VPN, Firewall)'}},
    {id: 'd3', position: {x: 0, y: 200}, data: {label: 'Gigabit Switch (Netgear GS308E)'}},
    {id: 'd4', position: {x: -150, y: 300}, data: {label: "Gigabit Switch (Netgear GS308E)"}},
    {id: 'd4-n1', position: {x: 150, y: 300}, data: {label: 'MITM (192.168.1.3)'}},
    {id: 'd4-n2', position: {x: 0, y: 400}, data: {label: 'Mac (192.168.1.4)'}},
    {id: 'd4-n3', position: {x: -150, y: 400}, data: {label: 'PXE (192.168.1.5)'}},
    {id: 'd4-n4', position: {x: -300, y: 400}, data: {label: 'Archer (192.168.1.14)'}},
    {id: 'd4-n5', position: {x: -450, y: 400}, data: {label: 'PS2 (Redacted)'}},
    {id: 'd4-n6', position: {x: -600, y: 400}, data: {label: 'Swann Security Ip Camera DVR (Redacted)'}},
    {id: 'r1', position: {x: 0, y: 500}, data: {label: 'Cudy Wireless AP (WIFI 6)'}},
    {id: 'r1-ap1', position: {x: 0, y: 600}, data: {label: 'ThornCloud (2.5Ghz'}},
    {id: 'r1-ap1-d1', position: {x: 150, y: 600}, data: {label: 'Wii U (2.5Ghz)'}},
    {id: 'r1-ap2', position: {x: 0, y: 700}, data: {label: 'ThornCloud (5Ghz)'}},
    {id: 'r1-ap2-d1', position: {x: 0, y: 800}, data: {label: 'Pixel 7 Pro (5Ghz)'}},
    {id: 'r1-ap2-d2', position: {x: 150, y: 800}, data: {label: 'ThornPhone 14 (5Ghz)'}},
    {id: 'r1-ap2-d3', position: {x: 300, y: 800}, data: {label: 'Apple TV 4K (5Ghz)'}},
    {id: 'r1-ap2-d4', position: {x: 450, y: 800}, data: {label: 'ThornPad Pro 4th Gen(5Ghz)'}},
    {id: 'r1-ap2-d5', position: {x: 600, y: 800}, data: {label: 'Oculus Quest 2 (5Ghz)'}},
    {id: 'r1-ap2-d6', position: {x: 150, y: 900}, data: {label: '2011 Macbook Pro (5Ghz)'}},
    {id: 'r1-ap2-d7', position: {x: 300, y: 900}, data: {label: 'Samsung S21 Ultra (5Ghz)'}},
    {id: 'r1-ap2-d8', position: {x: 450, y: 900}, data: {label: 'Creality K1C (5Ghz)'}},
    {id: 'r2', position: {x: 0, y: 900}, data: {label: 'Tp-Link Router (Guest Network)'}},
    {id: 'r2-ap1', position: {x: 0, y: 1000}, data: {label: 'Redacted AP (5Ghz)'}},
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
    {id: 'r2-r2-ap1', source: 'r2', target: 'r2-ap1'},
    {id: 'r1-r1-ap1', source: 'r1', target: 'r1-ap1'},
];

function loadSavedNodes() {
    try {
        const saved = localStorage.getItem('thornnet-nodes');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Optional: validate that it's an array of nodes
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (e) {
        console.error("Failed to load saved node positions:", e);
    }
    return initialNodes;
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
        localStorage.setItem('thornnet-nodes', JSON.stringify(nodes));
        alert("Positions saved!");
    };

    const handleReset = () => {
        localStorage.removeItem('thornnet-nodes');
        setNodes(initialNodes);
    };

    return (
        <div>
            <div className="flex gap-2 p-2">
                <button onClick={handleSave}>💾 Save Position</button>
                <button onClick={handleReset}>🔄 Reset Layout</button>
            </div>
            <div className={"dark:text-white"} style={{ width: '100vw', height: '100vh' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    nodesConnectable={false}
                    fitView
                />
            </div>
        </div>
    );
}