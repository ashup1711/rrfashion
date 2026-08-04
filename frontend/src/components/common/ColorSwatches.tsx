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
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  if (!colors || colors.length === 0) return null;

  const displayColors = colors.slice(0, 5);
  const remainingCount = Math.max(0, colors.length - 5);

  const handleColorClick = (index: number, color: ColorSwatch) => {
    setSelectedIndex(index === selectedIndex ? -1 : index);
    onColorSelect?.(index, color);
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {displayColors.map((color, index) => (
        <button
          key={`${color.color}-${index}`}
          type="button"
          onClick={() => handleColorClick(index, color)}
          className={`
            relative w-10 h-10 md:w-6 md:h-6 rounded-full border-2 transition-all
            ${color.hex
              ? ''
              : 'bg-neutral-medium border-neutral-medium'
            }
            ${index === selectedIndex
              ? 'border-neutral-nearBlack scale-110 ring-2 ring-white'
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
        <span
          className="text-xs text-neutral-dark font-medium cursor-default"
          title={`+${remainingCount} more colors`}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

export default ColorSwatches;
