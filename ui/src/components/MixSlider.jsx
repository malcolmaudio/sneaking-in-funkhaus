import React, { useState, useEffect, useRef, useCallback } from 'react';


export default function MixSlider({ value, onChange }) {
    const [isDragging, setIsDragging] = useState(false);
    const trackRef = useRef(null);

    // Helper to calculate value from mouse position
    const calculateValue = useCallback((clientX) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const width = rect.width;

        let normalize = x / width;
        normalize = Math.max(0, Math.min(1, normalize)); // Clamp 0..1

        const newValue = Math.round(normalize * 100);
        if (onChange) {
            onChange(newValue);
        }
    }, [onChange]);

    // Mouse handlers
    const handleMouseDown = (e) => {
        setIsDragging(true);
        calculateValue(e.clientX);
    };

    // Global listener for drag
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                calculateValue(e.clientX);
            }
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, calculateValue]);


    return (
        <div className="mix-slider-container">
            <div className="mix-label">DRY / WET</div>

            {/* Track Area */}
            <div
                className="mix-track-area"
                ref={trackRef}
                onMouseDown={handleMouseDown}
            >
                {/* Visual Ticks */}
                <div className="ticks-container">
                    {Array.from({ length: 21 }).map((_, i) => (
                        <div
                            key={i}
                            className="tick"
                            style={{
                                left: `${i * 5}%`,
                                height: i % 5 === 0 ? '8px' : '4px',
                                background: i % 5 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'
                            }}
                        />
                    ))}
                </div>

                {/* Thumb */}
                <div
                    className="mix-thumb"
                    style={{
                        left: `${value}%`,
                        cursor: isDragging ? 'grabbing' : 'grab'
                    }}
                />
            </div>

            <style>{`
                .mix-slider-container {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 6px;
                    width: 100%;
                }

                .mix-label {
                    font-size: 9px;
                    font-weight: 500;
                    letter-spacing: 1px;
                    color: #555;
                    text-transform: lowercase;
                }

                .mix-track-area {
                    position: relative;
                    width: 100%;
                    height: 16px;
                    cursor: pointer;
                }

                .ticks-container {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                }

                .tick {
                    position: absolute;
                    bottom: 0;
                    width: 1px;
                    transform: translateX(-50%);
                }

                .mix-thumb {
                    position: absolute;
                    top: 50%;
                    width: 8px;
                    height: 12px;
                    background: #ccc;
                    border-radius: 2px;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 8px rgba(255,255,255,0.1);
                    pointer-events: none;
                    transition: left 0.05s linear, transform 0.1s;
                }
                
                .mix-thumb:active {
                     transform: translate(-50%, -50%) scale(1.1);
                }
            `}</style>
        </div>
    );
}
