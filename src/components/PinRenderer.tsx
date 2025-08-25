import React, { useState, useRef, useEffect } from 'react';
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
  imageUrl?: string;
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
  layerColor?: string;
  onPositionChange?: (pinId: string, x: number, y: number) => void;
  canEdit?: boolean;
  zoom?: number;
  panX?: number;
  panY?: number;
  browserZoom?: number;
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

const customImageSizeMap = {
  small: 24,
  medium: 32,
  large: 40,
};

const defaultTemplates = [
  { name: 'Circle', shape: 'circle', color: '#3b82f6', size: 'medium' },
  { name: 'Square', shape: 'square', color: '#10b981', size: 'medium' },
  { name: 'Triangle', shape: 'triangle', color: '#f59e0b', size: 'medium' },
  { name: 'Star', shape: 'star', color: '#ef4444', size: 'medium' },
];

export const PinRenderer: React.FC<PinRendererProps> = ({
  pin,
  template,
  onClick,
  isVisible,
  layerColor,
  onPositionChange,
  canEdit = false,
  zoom = 1,
  panX = 0,
  panY = 0,
  browserZoom = 1,
}) => {
  // Try to find template in hardcoded templates if not provided
  let displayTemplate = template;
  if (pin.templateId && !template) {
    // Check if it's a hardcoded template
    const hardcodedTemplates = [
      { id: 'default-circle', name: '원형', shape: 'circle', color: '#3b82f6', size: 'medium', isDefault: true, isPublic: true },
      { id: 'default-square', name: '사각형', shape: 'square', color: '#10b981', size: 'medium', isDefault: true, isPublic: true },
      { id: 'default-triangle', name: '삼각형', shape: 'triangle', color: '#f59e0b', size: 'medium', isDefault: true, isPublic: true },
      { id: 'default-star', name: '별', shape: 'star', color: '#ef4444', size: 'medium', isDefault: true, isPublic: true },
      { id: 'custom-1', name: 'Custom 1', shape: 'custom', imageUrl: '/images/Custom1.png', color: '#ff0000', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-2', name: 'Custom 2', shape: 'custom', imageUrl: '/images/Custom2.png', color: '#00ff00', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-3', name: 'Custom 3', shape: 'custom', imageUrl: '/images/Custom3.png', color: '#0000ff', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-4', name: 'Custom 4', shape: 'custom', imageUrl: '/images/Custom4.png', color: '#ffff00', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-5', name: 'Custom 5', shape: 'custom', imageUrl: '/images/Custom5.png', color: '#ff00ff', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-6', name: 'Custom 6', shape: 'custom', imageUrl: '/images/Custom6.png', color: '#00ffff', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-7', name: 'Custom 7', shape: 'custom', imageUrl: '/images/Custom7.png', color: '#ff8800', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-8', name: 'Custom 8', shape: 'custom', imageUrl: '/images/Custom8.png', color: '#88ff00', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-9', name: 'Custom 9', shape: 'custom', imageUrl: '/images/Custom9.png', color: '#0088ff', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-10', name: 'Custom 10', shape: 'custom', imageUrl: '/images/Custom10.png', color: '#ff0088', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-11', name: 'Custom 11', shape: 'custom', imageUrl: '/images/Custom11.png', color: '#88ff88', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-12', name: 'Custom 12', shape: 'custom', imageUrl: '/images/Custom12.png', color: '#8888ff', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-13', name: 'Custom 13', shape: 'custom', imageUrl: '/images/Custom13.png', color: '#ff8888', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-14', name: 'Custom 14', shape: 'custom', imageUrl: '/images/Custom14.png', color: '#88ffff', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-15', name: 'Custom 15', shape: 'custom', imageUrl: '/images/Custom15.png', color: '#ffff88', size: 'medium', isDefault: false, isPublic: true },
      { id: 'custom-16', name: 'Custom 16', shape: 'custom', imageUrl: '/images/Custom16.png', color: '#ff88ff', size: 'medium', isDefault: false, isPublic: true },
    ];
    
    displayTemplate = hardcodedTemplates.find(t => t.id === pin.templateId) as PinTemplate || null;
  }
  const [isDragging, setIsDragging] = useState(false);
  const [currentPosition, setCurrentPosition] = useState({ x: pin.x, y: pin.y });
  const pinRef = useRef<HTMLDivElement>(null);
  const finalPositionRef = useRef({ x: pin.x, y: pin.y });

  // Update position when pin position changes (only if not dragging and position actually changed)
  useEffect(() => {
    if (!isDragging) {
      const hasChanged = currentPosition.x !== pin.x || currentPosition.y !== pin.y;
      if (hasChanged) {
        setCurrentPosition({ x: pin.x, y: pin.y });
      }
    }
  }, [pin.x, pin.y, isDragging, currentPosition.x, currentPosition.y]);

  if (!isVisible) return null;

  // Use template if available, otherwise fall back to default
  const finalTemplate = displayTemplate || {
    shape: 'circle' as const,
    color: layerColor || '#3b82f6',
    size: 'medium' as const,
  };

  // If layerColor is provided, use it instead of template color
  const finalColor = layerColor || finalTemplate.color;

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canEdit) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPinX = currentPosition.x;
    const startPinY = currentPosition.y;
    
    let hasMoved = false;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // Only start dragging if moved more than 3px
      if (!hasMoved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        setIsDragging(true);
        hasMoved = true;
      }
      
      if (hasMoved) {
        const newPos = {
          x: startPinX + deltaX / zoom,
          y: startPinY + deltaY / zoom
        };
        setCurrentPosition(newPos);
        finalPositionRef.current = newPos;
      }
    };
    
    const handleMouseUp = () => {
      if (hasMoved && onPositionChange) {
        onPositionChange(pin.id, finalPositionRef.current.x, finalPositionRef.current.y);
      }
      
      // Small delay to prevent click event after drag
      setTimeout(() => {
        setIsDragging(false);
      }, 10);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      onClick();
    }
  };

  // Custom image template
  if (finalTemplate.shape === 'custom' && finalTemplate.imageUrl) {
    const size = customImageSizeMap[finalTemplate.size];
    return (
      <div
        ref={pinRef}
        className={`absolute hover:scale-110 transition-transform duration-200 z-10 ${
          canEdit ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
        }`}
        style={{
          left: currentPosition.x * zoom + panX - size / 2,
          top: currentPosition.y * zoom + panY - size / 2,
          zIndex: isDragging ? 30 : 20,
        }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <div className="relative group">
          <img
            src={finalTemplate.imageUrl}
            alt={pin.title}
            className="object-cover rounded-full border-2 border-white shadow-lg"
            style={{ 
              width: size,
              height: size,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}
          />
          
          {/* Hover tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            {pin.title}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
          </div>
        </div>
      </div>
    );
  }

  // Standard shape template
  const ShapeComponent = shapeComponents[finalTemplate.shape];
  const size = sizeMap[finalTemplate.size];
  
  return (
    <div
      ref={pinRef}
      className={`absolute hover:scale-110 transition-transform duration-200 z-10 ${
        canEdit ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
      }`}
      style={{
        left: currentPosition.x * zoom + panX - size / 2,
        top: currentPosition.y * zoom + panY - size / 2,
        zIndex: isDragging ? 30 : 20,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className="relative group">
        <ShapeComponent
          size={size}
          style={{ 
            color: finalColor,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}
          fill={finalTemplate.shape === 'circle' ? finalColor : 'none'}
          stroke={finalColor}
          strokeWidth={finalTemplate.shape === 'circle' ? 0 : 2}
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