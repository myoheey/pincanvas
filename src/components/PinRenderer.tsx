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
  // 하드코딩된 템플릿 ID를 매핑하는 함수
  const getHardcodedTemplate = (templateId: string): PinTemplate | null => {
    const hardcodedTemplates: Record<string, PinTemplate> = {
      'default-circle': { id: 'default-circle', name: '원형', shape: 'circle', color: '#3b82f6', size: 'medium', isDefault: true, isPublic: true },
      'default-square': { id: 'default-square', name: '사각형', shape: 'square', color: '#10b981', size: 'medium', isDefault: true, isPublic: true },
      'default-triangle': { id: 'default-triangle', name: '삼각형', shape: 'triangle', color: '#f59e0b', size: 'medium', isDefault: true, isPublic: true },
      'default-star': { id: 'default-star', name: '별', shape: 'star', color: '#ef4444', size: 'medium', isDefault: true, isPublic: true },
      'custom-1': { id: 'custom-1', name: '산', shape: 'custom', imageUrl: '/images/Custom1.png', color: '#ff0000', size: 'medium', isDefault: false, isPublic: true },
      'custom-2': { id: 'custom-2', name: '절', shape: 'custom', imageUrl: '/images/Custom2.png', color: '#00ff00', size: 'medium', isDefault: false, isPublic: true },
      'custom-3': { id: 'custom-3', name: '학도병추모비', shape: 'custom', imageUrl: '/images/Custom3.png', color: '#0000ff', size: 'medium', isDefault: false, isPublic: true },
      'custom-4': { id: 'custom-4', name: '언양성당', shape: 'custom', imageUrl: '/images/Custom4.png', color: '#ffff00', size: 'medium', isDefault: false, isPublic: true },
      'custom-5': { id: 'custom-5', name: '암각화', shape: 'custom', imageUrl: '/images/Custom5.png', color: '#ff00ff', size: 'medium', isDefault: false, isPublic: true },
      'custom-6': { id: 'custom-6', name: '읍성', shape: 'custom', imageUrl: '/images/Custom6.png', color: '#00ffff', size: 'medium', isDefault: false, isPublic: true },
      'custom-7': { id: 'custom-7', name: '간절곶', shape: 'custom', imageUrl: '/images/Custom7.png', color: '#ff8800', size: 'medium', isDefault: false, isPublic: true },
      'custom-8': { id: 'custom-8', name: '공장', shape: 'custom', imageUrl: '/images/Custom8.png', color: '#88ff00', size: 'medium', isDefault: false, isPublic: true },
      'custom-9': { id: 'custom-9', name: '학교', shape: 'custom', imageUrl: '/images/Custom9.png', color: '#0088ff', size: 'medium', isDefault: false, isPublic: true },
      'custom-10': { id: 'custom-10', name: '한글교실', shape: 'custom', imageUrl: '/images/Custom10.png', color: '#ff0088', size: 'medium', isDefault: false, isPublic: true },
      'custom-11': { id: 'custom-11', name: '작천정', shape: 'custom', imageUrl: '/images/Custom11.png', color: '#88ff88', size: 'medium', isDefault: false, isPublic: true },
      'custom-12': { id: 'custom-12', name: '강', shape: 'custom', imageUrl: '/images/Custom12.png', color: '#8888ff', size: 'medium', isDefault: false, isPublic: true },
      'custom-13': { id: 'custom-13', name: '바다', shape: 'custom', imageUrl: '/images/Custom13.png', color: '#ff8888', size: 'medium', isDefault: false, isPublic: true },
      'custom-14': { id: 'custom-14', name: '소호분교', shape: 'custom', imageUrl: '/images/Custom14.png', color: '#88ffff', size: 'medium', isDefault: false, isPublic: true },
      'custom-15': { id: 'custom-15', name: '산촌유학', shape: 'custom', imageUrl: '/images/Custom15.png', color: '#ffff88', size: 'medium', isDefault: false, isPublic: true },
      'custom-16': { id: 'custom-16', name: '땡땡마을', shape: 'custom', imageUrl: '/images/Custom16.png', color: '#ff88ff', size: 'medium', isDefault: false, isPublic: true },
    };
    
    return hardcodedTemplates[templateId] || null;
  };

  // 템플릿 결정 로직 - 하드코딩된 템플릿과 실제 데이터베이스 템플릿을 모두 고려
  let displayTemplate = template;
  
  // 하드코딩된 템플릿 ID에 대한 처리 (template이 없거나 유효하지 않은 경우)
  if ((!displayTemplate || !displayTemplate.id) && pin.templateId) {
    displayTemplate = getHardcodedTemplate(pin.templateId);
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
          x: startPinX + deltaX / (zoom * browserZoom),
          y: startPinY + deltaY / (zoom * browserZoom)
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
          left: (currentPosition.x * zoom + panX) / browserZoom - size / 2,
          top: (currentPosition.y * zoom + panY) / browserZoom - size / 2,
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
        left: (currentPosition.x * zoom + panX) / browserZoom - size / 2,
        top: (currentPosition.y * zoom + panY) / browserZoom - size / 2,
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