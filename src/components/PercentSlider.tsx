'use client';

import { useRef, useState } from 'react';

interface PercentSliderProps {
  value: number;
  onChange: (pct: number) => void;
  disabled?: boolean;
}

const SNAPS = [0, 25, 50, 75, 100];

export default function PercentSlider({ value, onChange, disabled = false }: PercentSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  const pctFromX = (clientX: number): number => {
    if (!trackRef.current) return clamped;
    const { left, width } = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(100, Math.round(((clientX - left) / width) * 100)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    onChange(pctFromX(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    onChange(pctFromX(e.clientX));
  };

  const handlePointerUp = () => setDragging(false);

  const commitEdit = (raw: string) => {
    const num = parseInt(raw, 10);
    if (!isNaN(num)) onChange(Math.max(0, Math.min(100, num)));
    setEditing(false);
  };

  return (
    <div
      className={`flex items-center gap-3 select-none ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      {/* Track area — receives all pointer events */}
      <div
        ref={trackRef}
        className="relative flex-1 cursor-pointer"
        style={{ height: 20 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Track line */}
        <div
          className="absolute inset-x-0 rounded-full pointer-events-none"
          style={{ top: '50%', marginTop: -1, height: 2, background: 'var(--color-border)' }}
        />
        {/* Filled portion */}
        <div
          className="absolute left-0 rounded-full pointer-events-none"
          style={{
            top: '50%', marginTop: -1, height: 2,
            width: `${clamped}%`,
            background: 'var(--color-primary)',
            transition: dragging ? 'none' : 'width 0.08s',
          }}
        />
        {/* Snap dots */}
        {SNAPS.map((snap) => (
          <div
            key={snap}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${snap}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 7,
              height: 7,
              background: snap <= clamped ? 'var(--color-primary)' : 'var(--color-border-bright)',
              transition: 'background 0.1s',
              zIndex: 1,
            }}
          />
        ))}
        {/* Thumb */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${clamped}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 14,
            height: 14,
            background: 'var(--color-primary)',
            boxShadow: dragging
              ? '0 0 0 5px rgba(245,184,0,0.25)'
              : '0 0 0 3px rgba(245,184,0,0.15)',
            cursor: dragging ? 'grabbing' : 'grab',
            zIndex: 2,
            transition: dragging ? 'none' : 'left 0.08s, box-shadow 0.15s',
          }}
        />
      </div>

      {/* Percentage label / editable input */}
      {editing ? (
        <input
          autoFocus
          type="number"
          min={0}
          max={100}
          value={inputVal}
          className="font-mono font-bold tabular-nums shrink-0 bg-transparent border-b outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{ fontSize: 11, color: 'var(--color-primary)', width: 32, borderColor: 'var(--color-primary)' }}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={(e) => commitEdit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit(inputVal);
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <span
          className="font-mono font-bold tabular-nums shrink-0 cursor-text"
          style={{ fontSize: 11, color: 'var(--color-primary)', width: 32, textAlign: 'right' }}
          onClick={() => { setInputVal(String(clamped)); setEditing(true); }}
        >
          {clamped}%
        </span>
      )}
    </div>
  );
}
