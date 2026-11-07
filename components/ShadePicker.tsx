'use client';

import { PalettePreset } from '@/constants';

interface ShadePickerProps {
  currentShade: number;
  onShadeChange: (shade: number) => void;
  preset: PalettePreset;
}

export function ShadePicker({ currentShade, onShadeChange, preset }: ShadePickerProps) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Shade">
      {preset.colours.map((hex, shade) => (
        <button
          key={shade}
          role="radio"
          aria-checked={currentShade === shade}
          aria-label={`Shade ${shade}`}
          title={`Shade ${shade}${shade === 0 ? ' (lightest / transparent for sprites)' : ''}`}
          onClick={() => onShadeChange(shade)}
          className={`w-9 h-9 rounded border-2 ${currentShade === shade ? 'border-blue-500' : 'border-gray-600'}`}
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );
}
