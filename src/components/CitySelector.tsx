import React, { useMemo, useState } from 'react';
import { defaultCities as defaults } from '../lib/api';

type Props = {
  selectedCities: string[];
  onChange: (cities: string[]) => void;
};

const CitySelectorInner: React.FC<Props> = ({ selectedCities, onChange }) => {
  const [input, setInput] = useState(selectedCities.join(', '));

  const toggleCity = (c: string) => {
    const lower = c.toLowerCase();
    const set = new Set(selectedCities.map((s) => s.toLowerCase()));
    if (set.has(lower)) set.delete(lower);
    else set.add(lower);
    const arr = Array.from(set);
    onChange(arr);
    setInput(arr.join(', '));
  };

  const applyInput = (raw: string) => {
    const arr = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase());
    onChange(arr);
    setInput(arr.join(', '));
  };

  const buttons = useMemo(
    () =>
      defaults.map((c) => {
        const active = selectedCities.some((s) => s.toLowerCase() === c);
        return (
          <button
            key={c}
            aria-pressed={active}
            onClick={() => toggleCity(c)}
            className={`px-2 py-1 text-xs rounded ${active ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-white/80'}`}
            title={`Toggle ${c}`}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        );
      }),
    [selectedCities]
  );

  return (
    <div className="flex items-center gap-2">
      {buttons}
      <input
        className="ml-2 px-3 py-1 rounded bg-neutral-800 text-white text-sm outline-none"
        placeholder="Add cities (comma separated)"
        value={input}
        aria-label="Add cities"
        onChange={(e) => setInput(e.target.value)}
        onBlur={(e) => applyInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') applyInput((e.target as HTMLInputElement).value);
        }}
      />
    </div>
  );
}

export default React.memo(CitySelectorInner);
