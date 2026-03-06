import React from 'react';

const MODES = [
  { id: 'clean', label: 'clean', color: '#ffaa00', icon: '○' }, // orange-ish
  { id: 'glimmer', label: 'glimmer', color: '#ff4444', icon: '✧' }, // red-ish
  { id: 'grit', label: 'grit', color: '#44aa44', icon: '●' }    // green-ish
];

export default function ModeSelector({ activeMode, onChange }) {
  return (
    <div className="mode-selector">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          className={`mode-btn ${activeMode === mode.id ? 'active' : ''}`}
          onClick={() => onChange(mode.id)}
          style={{ '--accent': mode.color }}
        >
          <span className="mode-icon">{mode.icon}</span> {mode.label}
          {activeMode === mode.id && <div className="active-indicator" />}
        </button>
      ))}

      <style>{`
        .mode-selector {
          display: flex;
          gap: 16px;
        }
        .mode-btn {
          background: transparent;
          border: none;
          color: #555;
          font-size: 11px;
          font-family: monospace;
          font-weight: 500;
          cursor: pointer;
          padding: 4px 0;
          transition: all 0.2s;
          text-transform: lowercase;
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .mode-icon {
          font-size: 10px;
          opacity: 0.5;
        }
        .mode-btn:hover {
          color: #aaa;
        }
        .mode-btn.active {
          color: #fff;
        }
        .mode-btn.active .mode-icon {
          color: var(--accent);
          opacity: 1;
          text-shadow: 0 0 6px var(--accent);
        }
        .active-indicator {
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 100%;
          height: 1px;
          background-color: var(--accent);
          box-shadow: 0 0 8px var(--accent);
        }
      `}</style>
    </div>
  );
}
