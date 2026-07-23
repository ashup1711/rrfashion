import { useState } from 'react';

interface ColorSwatch {
  color: string;
  hex?: string;
  imageUrl?: string;
}

interface ColorSwatchesProps {
  colors: ColorSwatch[];
  onColorSelect?: (index: number, color: ColorSwatch) => void;
  className?: string;
}

const ColorSwatches = ({ 
  colors, 
  onColorSelect, 
  className = '' 
}: ColorSwatchesProps) => {
  if (!colors || colors.length === 0) return null;

  const displayColors = colors.slice(0, 4);
  const remainingCount = Math.max(0, colors.length - 4);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleColorClick = (index: number, color: ColorSwatch) => {
    setSelectedIndex(index);
    onColorSelect?.(index, color);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {displayColors.map((color, index) => (
        <button
          key={`${color.color}-${index}`}
          type="button"
          onClick={() => handleColorClick(index, color)}
          className={`
            relative w-5 h-5 rounded-full border-2 transition-all
            ${color.hex
              ? ''
              : 'bg-gray-200 border-gray-300'
            }
            ${index === selectedIndex
              ? 'border-neutral-nearBlack scale-110'
              : 'border-transparent hover:scale-105'
            }
            ${color.hex ? 'shadow-sm' : ''}
          `}
          style={color.hex ? { backgroundColor: color.hex } : undefined}
          aria-label={`Select ${color.color} color`}
          aria-pressed={index === selectedIndex}
          title={color.color}
        >
          {/* Inner border for dark colors */}
          {color.hex && (
            <span className="absolute inset-0 rounded-full ring-1 ring-white/50 pointer-events-none" />
          )}
        </button>
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-gray-600 font-medium">
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

export default ColorSwatches;