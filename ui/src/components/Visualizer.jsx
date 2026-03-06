import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Bounds, BoundingBox, Grid } from '@react-three/drei';
import { useDrag } from '@use-gesture/react';
import * as THREE from 'three';

const computeArea = (points) => {
    if (points.length < 3) return 10;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        area += points[i][0] * points[j][1];
        area -= points[j][0] * points[i][1];
    }
    return Math.abs(area / 2.0);
};

const computeCentroid = (points) => {
    if (points.length === 0) return { x: 0, y: 0 };
    let x = 0, y = 0;
    points.forEach(p => { x += p[0]; y += p[1]; });
    return { x: x / points.length, y: y / points.length };
};

// ─── 3D Node (Draggable point for walls) ────────────────────────────────────
function Node({ position, index, isDragging, onPointerDown, onDoubleClick }) {
    const [hovered, setHovered] = useState(false);
    const meshRef = useRef();

    useFrame((state, delta) => {
        const targetScale = hovered || isDragging ? 1.6 : 1.0;
        if (meshRef.current) {
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 12);
        }
    });

    return (
        <group
            position={position}
            onPointerDown={(e) => { e.stopPropagation(); onPointerDown(index); }}
            onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(index); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'grab'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        >
            <Sphere ref={meshRef} args={[0.08, 16, 16]}>
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={hovered || isDragging ? 2.5 : 0.8} roughness={0.2} />
            </Sphere>
            {/* Soft Glow */}
            <Sphere args={[0.15, 16, 16]}>
                <meshBasicMaterial color="#ffffff" transparent opacity={hovered || isDragging ? 0.3 : 0.05} />
            </Sphere>
        </group>
    );
}

// ─── 3D Microphone (Draggable) ──────────────────────────────────────────────
function MicObject({ position, isDragging, onPointerDown, roomScale = 1.0 }) {
    const [hovered, setHovered] = useState(false);
    const groupRef = useRef();

    useFrame((state, delta) => {
        if (groupRef.current && !isDragging) {
            groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        } else if (groupRef.current) {
            groupRef.current.position.y = position[1];
        }
    });

    const baseScale = hovered || isDragging ? 1.1 : 1.0;
    const finalScale = baseScale * roomScale;

    return (
        <group
            position={position}
            ref={groupRef}
            onPointerDown={(e) => { e.stopPropagation(); onPointerDown(); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'grab'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
            scale={finalScale}
        >
            {/* Ultra Minimal Boxy Mic */}
            <mesh position={[0, -0.2, 0]}>
                <boxGeometry args={[0.2, 0.6, 0.2]} />
                <meshStandardMaterial color="#888" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
                <boxGeometry args={[0.2, 0.2, 0.2]} />
                <meshStandardMaterial color="#fff" wireframe={true} />
            </mesh>
            <pointLight position={[0, 0.2, 0]} distance={4} intensity={hovered || isDragging ? 2 : 0.5} color="#ffffff" />
        </group>
    );
}

// ─── 3D Sound Source (Draggable) ──────────────────────────────────────────────
function SourceObject({ position, isDragging, onPointerDown, roomScale = 1.0, groupRef }) {
    const [hovered, setHovered] = useState(false);

    const baseScale = hovered || isDragging ? 1.4 : 1.0;
    const finalScale = baseScale * roomScale;

    return (
        <group
            position={position}
            ref={groupRef}
            onPointerDown={(e) => { e.stopPropagation(); onPointerDown(); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'grab'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
            scale={finalScale}
        >
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial color="#00f2fe" roughness={0.1} emissive="#00f2fe" emissiveIntensity={hovered || isDragging ? 3.0 : 1.5} />
            </mesh>
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.25, 16, 16]} />
                <meshBasicMaterial color="#00f2fe" transparent opacity={0.15} />
            </mesh>
            <pointLight position={[0, 0, 0]} distance={4} intensity={hovered || isDragging ? 3 : 1.5} color="#00f2fe" />
        </group>
    );
}

// ─── Room Bounds Helper ─────────────────────────────────────────────────────
function BoundingBoxVisualizer({ nodes }) {
    const box = useMemo(() => {
        const b = new THREE.Box3();
        nodes.forEach(p => b.expandByPoint(new THREE.Vector3(...p)));
        if (b.min.z === b.max.z) {
            b.min.z -= 1.0;
            b.max.z += 1.0;
        }
        return b;
    }, [nodes]);

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    return (
        <mesh position={center}>
            <boxGeometry args={[size.x, size.y, size.z]} />
            <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.03} />
        </mesh>
    );
}

// ─── 3D Room Builder (The interactive space) ────────────────────────────────
function RoomBuilder({ nodes, setNodes, micPos, setMicPos, sourcePos, setSourcePos, sourceMode, sourceSpeed, onPhysicalUpdate }) {
    const [draggingNode, setDraggingNode] = useState(null);
    const [draggingMic, setDraggingMic] = useState(false);
    const [draggingSource, setDraggingSource] = useState(false);
    const sourceRef = useRef();
    const paramsRef = useRef({ lastUpdate: 0, lastX: 0, lastY: 0 });

    const points = useMemo(() => {
        if (nodes.length < 2) return [];
        return [...nodes, nodes[0]]; // Close the loop
    }, [nodes]);

    const { roomShape, roomScale } = useMemo(() => {
        if (nodes.length < 3) return { roomShape: null, roomScale: 1.0 };
        const b = new THREE.Box3();
        nodes.forEach(p => b.expandByPoint(new THREE.Vector3(...p)));
        const size = new THREE.Vector3();
        b.getSize(size);
        const maxDim = Math.max(size.x, size.y);
        const scale = Math.max(0.5, Math.min(3.0, maxDim / 6.0));

        const shape = new THREE.Shape();
        shape.moveTo(nodes[0][0], nodes[0][1]);
        for (let i = 1; i < nodes.length; i++) {
            shape.lineTo(nodes[i][0], nodes[i][1]);
        }
        shape.lineTo(nodes[0][0], nodes[0][1]);

        return { roomShape: shape, roomScale: scale };
    }, [nodes]);

    useFrame((state) => {
        if (!sourceRef.current) return;
        let p = sourcePos;

        if (sourceMode === 'rotor') {
            const t = state.clock.elapsedTime * sourceSpeed;
            const b = new THREE.Box3();
            nodes.forEach(nd => b.expandByPoint(new THREE.Vector3(...nd)));
            const center = new THREE.Vector3();
            b.getCenter(center);
            const r = Math.min((b.max.x - b.min.x) / 3, (b.max.y - b.min.y) / 3);
            p = [center.x + Math.cos(t) * r, center.y + Math.sin(t) * r, 0];
        } else if (sourceMode === 'linear') {
            const t = state.clock.elapsedTime * sourceSpeed;
            const b = new THREE.Box3();
            nodes.forEach(nd => b.expandByPoint(new THREE.Vector3(...nd)));
            const center = new THREE.Vector3();
            b.getCenter(center);
            const aX = (b.max.x - b.min.x) / 3;
            const aY = (b.max.y - b.min.y) / 4;
            p = [center.x + Math.sin(t) * aX, center.y + Math.sin(t * 1.5) * aY, 0];
        }

        if (sourceMode !== 'manual' && !draggingSource) {
            sourceRef.current.position.set(p[0], p[1], p[2]);
        } else {
            sourceRef.current.position.set(sourcePos[0], sourcePos[1], sourcePos[2]);
            p = sourcePos;
        }

        // Throttle updates to DSP so we don't spam 60hz parameter pushes
        if (onPhysicalUpdate && (state.clock.elapsedTime - paramsRef.current.lastUpdate > 0.05)) {
            // only update if something is moving (mode is auto, or user is dragging)
            if (sourceMode !== 'manual' || draggingMic || draggingSource || draggingNode !== null) {
                paramsRef.current.lastUpdate = state.clock.elapsedTime;

                const dx = p[0] - micPos[0];
                const dy = p[1] - micPos[1];
                const dist = Math.sqrt(dx * dx + dy * dy);
                const area = computeArea(nodes);

                onPhysicalUpdate({ area, sourceMicDistance: dist });
            }
        }
    });

    const handlePointerDown = (e) => {
        e.stopPropagation();
        e.target.setPointerCapture(e.pointerId);
        if (draggingNode === null && !draggingMic && !draggingSource) {
            const hitPlane = e.intersections.find(i => Math.abs(i.point.z + 0.01) < 0.001);
            if (hitPlane) {
                setNodes([...nodes, [hitPlane.point.x, hitPlane.point.y, 0]]);
            }
        }
    };

    const handlePointerMove = (e) => {
        if (draggingNode !== null) {
            e.stopPropagation();
            const newNodes = [...nodes];
            newNodes[draggingNode] = [e.point.x, e.point.y, 0];
            setNodes(newNodes);
        } else if (draggingMic) {
            e.stopPropagation();
            setMicPos([e.point.x, e.point.y, 0]);
        } else if (draggingSource) {
            e.stopPropagation();
            setSourcePos([e.point.x, e.point.y, 0]);
        }
    };

    const handlePointerUp = (e) => {
        e.target.releasePointerCapture(e.pointerId);
        setDraggingNode(null);
        setDraggingMic(false);
        setDraggingSource(false);
        document.body.style.cursor = 'auto';
    };

    return (
        <group>
            {/* The Solid Physical Floor of the Room */}
            {roomShape && (
                <mesh position={[0, 0, -0.05]}>
                    <extrudeGeometry args={[roomShape, { depth: 0.05, bevelEnabled: false }]} />
                    <meshStandardMaterial color="#080a10" roughness={0.4} metalness={0.8} transparent opacity={0.6} />
                </mesh>
            )}

            {/* Invisible interaction plane spans the whole screen */}
            <mesh
                position={[0, 0, -0.01]}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <planeGeometry args={[200, 200]} />
                <meshBasicMaterial visible={false} />
            </mesh>

            <MicObject
                position={micPos}
                isDragging={draggingMic}
                roomScale={roomScale}
                onPointerDown={() => {
                    setDraggingMic(true);
                    document.body.style.cursor = 'grabbing';
                }}
            />

            <SourceObject
                position={sourcePos}
                groupRef={sourceRef}
                isDragging={draggingSource}
                roomScale={roomScale}
                onPointerDown={() => {
                    if (sourceMode === 'manual') setDraggingSource(true);
                    document.body.style.cursor = 'grabbing';
                }}
            />

            {nodes.map((pos, i) => (
                <Node
                    key={i}
                    index={i}
                    position={pos}
                    isDragging={draggingNode === i}
                    onPointerDown={(idx) => {
                        setDraggingNode(idx);
                        document.body.style.cursor = 'grabbing';
                    }}
                    onDoubleClick={(idx) => {
                        if (nodes.length > 3) {
                            setNodes(curr => curr.filter((_, nIdx) => nIdx !== idx));
                        }
                    }}
                />
            ))}

            {points.length > 1 && (
                <Line
                    points={points}
                    color="#ffffff"
                    lineWidth={1.5}
                    transparent opacity={0.2}
                />
            )}

            {nodes.length > 0 && <BoundingBoxVisualizer nodes={nodes} />}
        </group>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function Visualizer({ onPhysicalUpdate, sourceMode, sourceSpeed = 0.8, manualDecayTrigger, manualMixTrigger, roomPresetTrigger }) {
    const [nodes, setNodes] = useState([
        [-3, -3, 0],
        [3, -3, 0],
        [3, 3, 0],
        [-3, 3, 0]
    ]);
    const [micPos, setMicPos] = useState([0, 0, 0]);
    const [sourcePos, setSourcePos] = useState([-1.5, 1.5, 0]);

    // Initial fallback physics push
    useEffect(() => {
        if (onPhysicalUpdate && sourceMode === 'manual') {
            const dx = sourcePos[0] - micPos[0];
            const dy = sourcePos[1] - micPos[1];
            const dist = Math.sqrt(dx * dx + dy * dy);
            const area = computeArea(nodes);
            onPhysicalUpdate({ area, sourceMicDistance: dist });
        }
    }, [micPos, sourcePos, sourceMode, onPhysicalUpdate, nodes]); // Include nodes to update on double click delete

    // Handle Preset Nodes
    useEffect(() => {
        if (roomPresetTrigger?.nodes) {
            setNodes(roomPresetTrigger.nodes);
        }
    }, [roomPresetTrigger]);

    // Handle Manual Decay knob overrides (physically scaling the room nodes to match desired decay)
    useEffect(() => {
        if (!manualDecayTrigger) return;
        const targetArea = manualDecayTrigger.value;
        const currentArea = computeArea(nodes);

        if (currentArea <= 0.1) return;

        const scale = Math.sqrt(Math.max(1, targetArea) / currentArea);
        const centroid = computeCentroid(nodes);

        setNodes(nodes.map(p => [
            centroid.x + (p[0] - centroid.x) * scale,
            centroid.y + (p[1] - centroid.y) * scale,
            0
        ]));
    }, [manualDecayTrigger]); // intentionally omitting nodes to prevent looping

    // Handle Manual Mix knob overrides (physically pushing source further/closer)
    useEffect(() => {
        if (!manualMixTrigger) return;
        const targetMix = manualMixTrigger.value;
        const targetDist = targetMix / 10.0; // Mix 0-100 maps to Dist 0-10

        const dx = sourcePos[0] - micPos[0];
        const dy = sourcePos[1] - micPos[1];
        const currentDist = Math.sqrt(dx * dx + dy * dy);

        if (currentDist < 0.01) {
            // perfectly overlapping, push source up slightly
            setSourcePos([micPos[0], micPos[1] + Math.max(0.1, targetDist), 0]);
            return;
        }

        const scale = targetDist / currentDist;
        setSourcePos([
            micPos[0] + dx * scale,
            micPos[1] + dy * scale,
            0
        ]);
    }, [manualMixTrigger]);
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: 'radial-gradient(circle at center, #0F1014 0%, #030406 100%)' }}>
            <Canvas camera={{ position: [0, 0, 10], fov: 45 }} dpr={[1, 2]}>
                <ambientLight intensity={1.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <RoomBuilder
                    nodes={nodes} setNodes={setNodes}
                    micPos={micPos} setMicPos={setMicPos}
                    sourcePos={sourcePos} setSourcePos={setSourcePos}
                    sourceMode={sourceMode}
                    sourceSpeed={sourceSpeed}
                    onPhysicalUpdate={onPhysicalUpdate}
                />
            </Canvas>

            {/* Overlay UI (Top Left Stats & Actions) */}
            <div style={{
                position: 'absolute',
                top: '30px',
                left: '40px',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                {/* Minimalist Stats */}
                <div style={{ display: 'flex', gap: '24px', fontSize: '9px', color: '#666', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>ROOM</div>
                        Nodes: {nodes.length}
                    </div>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>MIC POS</div>
                        {micPos[0].toFixed(1)}, {micPos[1].toFixed(1)}
                    </div>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>SRC POS</div>
                        {sourcePos[0].toFixed(1)}, {sourcePos[1].toFixed(1)}
                    </div>
                </div>

                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace' }}>
                    Double-click node to delete
                </div>
            </div>
        </div>
    );
}
