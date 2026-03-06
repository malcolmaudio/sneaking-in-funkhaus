import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Visualizer from './components/Visualizer';
import AcousticMaterials from './components/AcousticMaterials';
import RoomPresets from './components/RoomPresets';
import Knob from './components/Knob';
import ModeSelector from './components/ModeSelector';
import MixSlider from './components/MixSlider';
import PresetManager from './components/PresetManager';
import './index.css';

// Helper to safely call backend
const sendParameter = (paramId, value) => {
  if (window.setParameter) {
    window.setParameter(paramId, value);
  }
};

const MATERIAL_DAMPING = {
  glass: 5,     // almost no absorption
  concrete: 15, // sharp reflections
  wood: 45,     // warm absorption
  carpet: 90    // massive absorption
};

function App() {
  const [activeMode, setActiveMode] = useState('clean');

  // Acoustic Material Setup
  const [floorMat, setFloorMat] = useState('carpet');
  const [wallMat, setWallMat] = useState('wood');
  const [ceilingMat, setCeilingMat] = useState('concrete');

  // New 3D / Mic Params
  const [micBrand, setMicBrand] = useState(0); // 0=Condenser, 1=Dynamic, 2=Ribbon, 3=LoFi
  const [sourceMode, setSourceMode] = useState('manual'); // 'manual', 'linear', 'rotor'
  const [sourceSpeed, setSourceSpeed] = useState(0.8);

  // Parameter State (including hidden ones driven by 3D)
  const [params, setParams] = useState({
    locut: 100,
    decay: 50,
    size: 50,
    damping: 20,
    width: 100,
    mix: 30,
    // 3D driven params
    roomVolume: 100,
    micPan: 0.5,
    micDistance: 1.0
  });

  const [manualDecayTrigger, setManualDecayTrigger] = useState(null);
  const [manualMixTrigger, setManualMixTrigger] = useState(null);
  const [roomPresetTrigger, setRoomPresetTrigger] = useState(null);

  // Dynamic Damping Calculation
  // Ceiling and Floor essentially map to area of the footprint, Walls map to perimeter x height
  const calculateDamping = useCallback((roomVolume) => {
    const fDamp = MATERIAL_DAMPING[floorMat];
    const cDamp = MATERIAL_DAMPING[ceilingMat];
    const wDamp = MATERIAL_DAMPING[wallMat];

    // Weighted Average (assuming in a typical space walls account for 60% of surface area, and floor/ceiling account for 20% each)
    const rawDamping = (wDamp * 0.6) + (fDamp * 0.2) + (cDamp * 0.2);

    // Scale damping slightly inverse to volume: massive rooms retain slightly less damping than tiny closets.
    const volumeMod = 1.0 - Math.min(0.2, (roomVolume / 500));

    const finalDamping = Math.max(0, Math.min(100, rawDamping * volumeMod));

    setParams(prev => ({ ...prev, damping: finalDamping }));
    sendParameter('damping', finalDamping);
  }, [floorMat, ceilingMat, wallMat]);

  // Recalculate damping if materials change
  useEffect(() => {
    calculateDamping(params.roomVolume);
  }, [floorMat, ceilingMat, wallMat, params.roomVolume, calculateDamping]);

  const handleModeChange = (mode) => {
    setActiveMode(mode);
    const modes = { clean: 0, glimmer: 1, grit: 2 };
    sendParameter('char', modes[mode] ?? 0);
  };

  const handleParamChange = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
    let paramId = key === 'locut' ? 'hipass' : key;
    sendParameter(paramId, value);

    if (key === 'decay') {
      setManualDecayTrigger({ value, ts: Date.now() });
    }
    if (key === 'mix') {
      setManualMixTrigger({ value, ts: Date.now() });
    }
  }, []);

  // Unified callback from the 3D Visualizer
  const handlePhysicalUpdate = useCallback(({ area, sourceMicDistance }) => {
    const targetDecay = Math.max(0, Math.min(100, Math.round(area)));
    const targetMix = Math.max(0, Math.min(100, Math.round(sourceMicDistance * 10)));

    setParams(prev => {
      if (Math.abs(prev.decay - targetDecay) < 1 && Math.abs(prev.mix - targetMix) < 1) {
        return prev;
      }

      const newParams = { ...prev };

      if (Math.abs(prev.decay - targetDecay) >= 1) {
        newParams.decay = targetDecay;
        newParams.size = targetDecay;
        sendParameter('decay', targetDecay);
        sendParameter('size', targetDecay);
      }

      if (Math.abs(prev.mix - targetMix) >= 1) {
        newParams.mix = targetMix;
        sendParameter('mix', targetMix);
      }

      return newParams;
    });
  }, []);

  const handleMicBrandChange = (e) => {
    const brand = parseInt(e.target.value, 10);
    setMicBrand(brand);
    sendParameter('micbrand', brand);
  };

  return (
    <div className="app-container">

      {/* LEFT: 3D SPACE */}
      <div className="left-3d-section">
        <Visualizer
          onPhysicalUpdate={handlePhysicalUpdate}
          sourceMode={sourceMode}
          sourceSpeed={sourceSpeed}
          manualDecayTrigger={manualDecayTrigger}
          manualMixTrigger={manualMixTrigger}
          roomPresetTrigger={roomPresetTrigger}
        />
      </div>

      {/* RIGHT: CONTROLS */}
      <div className="right-controls-section">
        <div className="controls-header">
          <div className="plugin-brand">
            funkhaus <span style={{ color: '#fff', fontWeight: '800' }}>3d</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="mic-label">SRC</span>
                <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '4px' }}>
                  {['manual', 'linear', 'rotor'].map(m => (
                    <button
                      key={m}
                      onClick={() => setSourceMode(m)}
                      style={{
                        background: sourceMode === m ? 'rgba(255,255,255,0.15)' : 'transparent',
                        border: 'none',
                        color: sourceMode === m ? '#fff' : '#666',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        borderRadius: '2px',
                        fontSize: '9px',
                        fontFamily: 'monospace'
                      }}
                    >
                      {m === 'manual' ? '✋' : m === 'linear' ? '↔' : '⟲'}
                    </button>
                  ))}
                </div>
              </div>
              {sourceMode !== 'manual' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="mic-label" style={{ fontSize: '7px' }}>SPD</span>
                  <input
                    type="range"
                    min="0.1" max="5.0" step="0.1"
                    value={sourceSpeed}
                    onChange={e => setSourceSpeed(parseFloat(e.target.value))}
                    style={{ width: '60px', height: '2px', accentColor: '#00f2fe' }}
                  />
                </div>
              )}
            </div>

            <div className="mic-selector">
              <span className="mic-label">mic</span>
              <select value={micBrand} onChange={handleMicBrandChange} className="mic-dropdown">
                <option value={0}>condenser</option>
                <option value={1}>dynamic</option>
                <option value={2}>ribbon</option>
                <option value={3}>lo-fi</option>
              </select>
            </div>
          </div>
        </div>

        <div className="controls-body">
          <ModeSelector activeMode={activeMode} onChange={handleModeChange} />

          <AcousticMaterials
            floorMat={floorMat} onFloorChange={setFloorMat}
            wallMat={wallMat} onWallChange={setWallMat}
            ceilingMat={ceilingMat} onCeilingChange={setCeilingMat}
          />

          <RoomPresets onSelectPreset={setRoomPresetTrigger} />

          <div className="slider-container">
            <MixSlider
              value={params.mix}
              onChange={(v) => handleParamChange('mix', v)}
            />
          </div>

          <div className="knobs-row">
            <Knob
              label="lo cut"
              value={params.locut}
              min={20} max={1000}
              suffix="Hz"
              onChange={(v) => handleParamChange('locut', v)}
            />
            <Knob
              label="decay"
              value={params.decay}
              min={0} max={100}
              onChange={(v) => handleParamChange('decay', v)}
              suffix="%"
            />
            <Knob
              label="damping"
              value={params.damping}
              min={0} max={100}
              onChange={(v) => handleParamChange('damping', v)}
              suffix="%"
            />
            <Knob
              label="width"
              value={params.width}
              min={0} max={100}
              onChange={(v) => handleParamChange('width', v)}
              suffix="%"
            />
          </div>

          <PresetManager
            currentParams={{ ...params, activeMode, micBrand, floorMat, wallMat, ceilingMat }}
            onLoad={(p) => {
              setParams(p);
              if (p.activeMode) handleModeChange(p.activeMode);
              if (p.floorMat) setFloorMat(p.floorMat);
              if (p.wallMat) setWallMat(p.wallMat);
              if (p.ceilingMat) setCeilingMat(p.ceilingMat);
              if (p.micBrand !== undefined) {
                setMicBrand(p.micBrand);
                sendParameter('micbrand', p.micBrand);
              }
              for (const [key, value] of Object.entries(p)) {
                if (['activeMode', 'micBrand', 'floorMat', 'wallMat', 'ceilingMat'].includes(key)) continue;
                sendParameter(key === 'locut' ? 'hipass' : key, value);
              }
            }}
          />
        </div>
      </div>

      <style>{`
        .app-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          background: #000;
          overflow: hidden;
        }

        .left-3d-section {
          flex: 1;
          position: relative;
        }

        .right-controls-section {
          width: 440px;
          flex-shrink: 0;
          background: transparent;
          display: flex;
          flex-direction: column;
          z-index: 10;
        }

        .controls-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .plugin-brand {
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          letter-spacing: 2px;
        }

        .mic-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mic-label {
          font-size: 9px;
          color: #888;
          font-family: monospace;
        }

        .mic-dropdown {
          background: transparent;
          color: #fff;
          border: none;
          font-size: 11px;
          outline: none;
          cursor: pointer;
        }
        
        .mic-dropdown option {
          background: #111;
          color: #fff;
        }

        .controls-body {
          flex: 1;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          overflow-y: auto;
        }

        .slider-container {
          padding: 10px 0;
        }

        .knobs-row {
          display: flex;
          justify-content: space-between;
          padding-top: 15px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
}

export default App;
