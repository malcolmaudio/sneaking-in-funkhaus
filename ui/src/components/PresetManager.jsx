import React, { useState, useEffect } from 'react';

export default function PresetManager({ currentParams, onLoad }) {
    const [presets, setPresets] = useState([]);
    const [newName, setNewName] = useState('');

    // Load from local storage
    useEffect(() => {
        const saved = localStorage.getItem('funkhaus_presets');
        if (saved) {
            try {
                setPresets(JSON.parse(saved));
            } catch (e) { }
        }
    }, []);

    const savePreset = () => {
        if (!newName.trim()) return;
        const newPreset = { name: newName.toLowerCase(), params: currentParams };
        const updated = [...presets, newPreset];
        setPresets(updated);
        localStorage.setItem('funkhaus_presets', JSON.stringify(updated));
        setNewName('');
    };

    return (
        <div className="preset-manager">
            <div className="preset-header">presets</div>
            <div className="preset-save">
                <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="new preset name..."
                />
                <button onClick={savePreset}>save</button>
            </div>
            <div className="preset-list">
                {presets.map((p, i) => (
                    <div key={i} className="preset-item" onClick={() => onLoad(p.params)}>
                        {p.name}
                    </div>
                ))}
                {presets.length === 0 && <div className="preset-empty">no presets saved</div>}
            </div>
            <style>{`
        .preset-manager {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 15px;
        }
        .preset-header {
          font-size: 10px;
          color: #888;
          text-transform: lowercase;
        }
        .preset-save {
          display: flex;
          gap: 8px;
        }
        .preset-save input {
          flex: 1;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 6px 10px;
          font-size: 11px;
          border-radius: 4px;
          outline: none;
          text-transform: lowercase;
        }
        .preset-save button {
          background: rgba(255,255,255,0.1);
          border: none;
          color: #fff;
          padding: 6px 12px;
          font-size: 11px;
          border-radius: 4px;
          cursor: pointer;
          text-transform: lowercase;
        }
        .preset-save button:hover {
          background: rgba(255,255,255,0.2);
        }
        .preset-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 100px;
          overflow-y: auto;
        }
        .preset-item {
          font-size: 11px;
          color: #ccc;
          padding: 6px 8px;
          cursor: pointer;
          background: rgba(255,255,255,0.02);
          border-radius: 3px;
        }
        .preset-item:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }
        .preset-empty {
          font-size: 11px;
          color: #555;
          font-style: italic;
        }
      `}</style>
        </div>
    );
}
