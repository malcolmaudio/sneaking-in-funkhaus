import React, { useState, useEffect, useRef } from 'react';

// A reusable knob component with SVG arc
export default function Knob({ label, value, min = 0, max = 1, suffix = '', onChange }) {
  // Local state for smooth UI, sync with props
  const [internalValue, setInternalValue] = useState(value);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  useEffect(() => {
    if (!isDragging.current) setInternalValue(value);
  }, [value]);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startVal.current = internalValue;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const dy = startY.current - e.clientY;
    const range = max - min;
    const Sensitivity = 200; // pixels for full range
    const delta = (dy / Sensitivity) * range;

    let newValue = startVal.current + delta;
    newValue = Math.max(min, Math.min(max, newValue));

    setInternalValue(newValue);
    if (onChange) onChange(newValue);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  };

  // Calculate arc
  const size = 60;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Angle range: -135 to 135 degrees
  const angleRange = 270;
  const startAngle = -135;

  const normalizedValue = (internalValue - min) / (max - min);
  const currentAngle = startAngle + (normalizedValue * angleRange);

  // Helper to get coordinates
  const getCoords = (angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180.0);
    return {
      x: center + (radius * Math.cos(angleInRadians)),
      y: center + (radius * Math.sin(angleInRadians))
    };
  };

  const startCoords = getCoords(startAngle);
  const endCoords = getCoords(currentAngle);
  const fullEndCoords = getCoords(startAngle + angleRange);

  // SVG Path for the filled arc
  const arcPath = `
    M ${startCoords.x} ${startCoords.y}
    A ${radius} ${radius} 0 ${currentAngle - startAngle > 180 ? 1 : 0} 1 ${endCoords.x} ${endCoords.y}
  `;

  // Background arc (full range)
  const bgPath = `
    M ${startCoords.x} ${startCoords.y}
    A ${radius} ${radius} 0 1 1 ${fullEndCoords.x} ${fullEndCoords.y}
  `;

  return (
    <div className="knob-container" onMouseDown={handleMouseDown}>
      <div className="knob-label">{label}</div>
      <div className="knob-svg-wrapper">
        <svg width={size} height={size}>
          {/* Background Track */}
          <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} strokeLinecap="round" />
          {/* Active Arc */}
          <path d={arcPath} fill="none" stroke="#e8e8e8" strokeWidth={strokeWidth} strokeLinecap="round" />
          {/* Indicator Dot */}
          <circle cx={endCoords.x} cy={endCoords.y} r={3} fill="#fff" />
        </svg>
      </div>
      <div className="knob-value">
        {Math.round(internalValue)}{suffix}
      </div>

      <style>{`
        .knob-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: ns-resize;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .knob-container:hover {
          opacity: 1;
        }
        .knob-label {
          font-size: 11px;
          text-transform: lowercase;
          color: #888;
        }
        .knob-value {
          font-size: 12px;
          font-family: monospace;
          color: #eee;
        }
      `}</style>
    </div>
  );
}
