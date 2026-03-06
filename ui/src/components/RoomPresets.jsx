import React from 'react';

const PRESETS = [
    { id: 'cube', label: 'CUBE', nodes: [[-2, -2, 0], [2, -2, 0], [2, 2, 0], [-2, 2, 0]] },
    { id: 'corridor', label: 'CORRIDOR', nodes: [[-1, -4, 0], [1, -4, 0], [1, 4, 0], [-1, 4, 0]] },
    { id: 'lshape', label: 'L-SHAPE', nodes: [[-2, -2, 0], [2, -2, 0], [2, 0, 0], [0, 0, 0], [0, 2, 0], [-2, 2, 0]] },
    { id: 'arena', label: 'ARENA', nodes: [[-2, -3, 0], [2, -3, 0], [3, 0, 0], [2, 3, 0], [-2, 3, 0], [-3, 0, 0]] }
];

export default function RoomPresets({ onSelectPreset }) {
    return (
        <div style={{ padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '9px', color: '#666', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                Layout Presets
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
                {PRESETS.map(p => (
                    <button
                        key={p.id}
                        onClick={() => onSelectPreset({ nodes: p.nodes, ts: Date.now() })}
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            color: '#888',
                            fontSize: '9px',
                            fontFamily: 'monospace',
                            padding: '6px 4px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                        }}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
