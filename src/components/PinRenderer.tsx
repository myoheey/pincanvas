import React from 'react';
import { 
  Circle, 
  Square, 
  Triangle, 
  Star, 
  Heart,
} from 'lucide-react';

interface PinTemplate {
  id: string;
  name: string;
  description?: string;
  shape: 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'custom';
  color: string;
  size: 'small' | 'medium' | 'large';
  icon?: string;
  style?: any;
  isDefault: boolean;
  isPublic: boolean;
}

interface PinData {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  layerId: string;
  canvasId: string;
  templateId?: string;
  template?: PinTemplate;
}

interface PinRendererProps {
  pin: PinData;
  template: PinTemplate | null;
  onClick: () => void;
  isVisible: boolean;
}

const shapeComponents = {
  circle: Circle,
  square: Square,
  triangle: Triangle,
  star: Star,
  heart: Heart,
  custom: Circle, // fallback
};

const sizeMap = {
  small: 16,
  medium: 20,
  large: 24,
};

export const PinRenderer: React.FC<PinRendererProps> = ({
  pin,
  template,
  onClick,
  isVisible,
}) => {
  if (!isVisible) return null;

  // Use template if available, otherwise fall back to default
  const displayTemplate = template || {
    shape: 'circle' as const,
    color: '#3b82f6',
    size: 'medium' as const,
  };

  const ShapeComponent = shapeComponents[displayTemplate.shape];
  const size = sizeMap[displayTemplate.size];
  
  return (
    <div
      className="absolute cursor-pointer hover:scale-110 transition-transform duration-200 z-10"
      style={{
        left: pin.x - size / 2,
        top: pin.y - size / 2,
        zIndex: 20,
      }}
      onClick={onClick}
    >
      <div className="relative group">
        <ShapeComponent
          size={size}
          style={{ 
            color: displayTemplate.color,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}
          fill={displayTemplate.shape === 'circle' ? displayTemplate.color : 'none'}
          stroke={displayTemplate.color}
          strokeWidth={displayTemplate.shape === 'circle' ? 0 : 2}
        />
        
        {/* Hover tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
          {pin.title}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
        </div>
      </div>
    </div>
  );
};