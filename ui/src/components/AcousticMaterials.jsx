import React from 'react';

const MATERIALS = [
    { id: 'concrete', label: 'concrete', bg: 'radial-gradient(circle at 30% 30%, #444 0%, #222 100%)', border: '#555' },
    { id: 'wood', label: 'wood paneled', bg: 'linear-gradient(135deg, #3d2314 0%, #1e110a 100%)', border: '#4a2c1a' },
    { id: 'glass', label: 'glass', bg: 'linear-gradient(135deg, #112 0%, #001 50%, #223 50%, #001 100%)', border: '#335' },
    { id: 'carpet', label: 'carpet', bg: 'repeating-linear-gradient(45deg, #1a0f0f, #1a0f0f 2px, #0f0a0a 2px, #0f0a0a 4px)', border: '#2a1515' },
];

export default function AcousticMaterials({ floorMat, onFloorChange, wallMat, onWallChange, ceilingMat, onCeilingChange }) {

    const renderMaterialDropdown = (label, currentId, onChange) => {
        const currentMat = MATERIALS.find(m => m.id === currentId) || MATERIALS[0];

        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '9px', color: '#666', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{label}</span>
                    <span>▼</span>
                </div>

                <div style={{
                    position: 'relative',
                    height: '64px',
                    borderRadius: '4px',
                    background: currentMat.bg,
                    border: `1px solid ${currentMat.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden'
                }}>
                    {/* Subtle overlay for interaction */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }} />

                    <div style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span style={{
                            fontSize: '10px',
                            textTransform: 'lowercase',
                            fontWeight: '600',
                            letterSpacing: '1px',
                            color: '#fff',
                            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                        }}>
                            {currentMat.label}
                        </span>
                    </div>

                    {/* Invisible real select layered on top */}
                    <select
                        value={currentId}
                        onChange={(e) => onChange(e.target.value)}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            opacity: 0,
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        {MATERIALS.map(m => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        );
    };

    return (
        <div style={{
            display: 'flex',
            gap: '12px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.05)'
        }}>
            {renderMaterialDropdown('Ceiling', ceilingMat, onCeilingChange)}
            {renderMaterialDropdown('Walls', wallMat, onWallChange)}
            {renderMaterialDropdown('Floor', floorMat, onFloorChange)}
        </div>
    );
}
