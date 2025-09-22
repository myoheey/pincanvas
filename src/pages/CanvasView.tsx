import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Eye, EyeOff, Edit, Trash2, Layers, Pin, Image, Presentation, X, Share, Lock, Unlock, Palette, Pen, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { PinInfoModal } from '@/components/PinInfoModal';
import { CreateLayerModal } from '@/components/CreateLayerModal';
import { ShareCanvasModal } from '@/components/ShareCanvasModal';
import { CanvasSettingsModal } from '@/components/CanvasSettingsModal';
import { EditCanvasNameModal } from '@/components/EditCanvasNameModal';
import { EditLayerNameModal } from '@/components/EditLayerNameModal';
import { LayerDuplicateModal } from '@/components/LayerDuplicateModal';
import { PinTemplateSelector } from '@/components/PinTemplateSelector';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import { DrawingToolbar } from '@/components/DrawingToolbar';
import { PinRenderer } from '@/components/PinRenderer';
import { CanvasExporter } from '@/components/CanvasExporter';
import CanvasBackgroundSelector from '@/components/CanvasBackgroundSelector';
import LayerColorPicker from '@/components/LayerColorPicker';
import ImageIcon from '@/components/ui/icons/ImageIcon';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Canvas {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: Date;
  pinCount: number;
  layerCount: number;
  ownerId: string;
  allowComments: boolean;
  allowLikes: boolean;
  backgroundType: 'color' | 'image';
  backgroundColor: string;
  backgroundImageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
}

interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  canvasId: string;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'url';
  url: string;
  name?: string;
}

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
  mediaItems?: MediaItem[];
}

const CanvasView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Core state - consolidated to prevent hook order issues
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [pins, setPins] = useState<PinData[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [userPermission, setUserPermission] = useState<'owner' | 'editor' | 'viewer' | null>(null);
  
  // Modal states
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isCreateLayerModalOpen, setIsCreateLayerModalOpen] = useState(false);
  const [isCreatingNewPin, setIsCreatingNewPin] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEditCanvasNameModalOpen, setIsEditCanvasNameModalOpen] = useState(false);
  const [isEditLayerNameModalOpen, setIsEditLayerNameModalOpen] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string>('');
  const [isPinTemplateSelectorOpen, setIsPinTemplateSelectorOpen] = useState(false);
  const [isDuplicateLayerModalOpen, setIsDuplicateLayerModalOpen] = useState(false);
  const [duplicatingLayerId, setDuplicatingLayerId] = useState<string>('');
  
  // Pin template state
  const [selectedPinTemplate, setSelectedPinTemplate] = useState<PinTemplate | null>(null);
  const [pinTemplates, setPinTemplates] = useState<PinTemplate[]>([]);
  const [pendingPinPosition, setPendingPinPosition] = useState<{x: number, y: number} | null>(null);
  
  // Drawing states
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [drawingTool, setDrawingTool] = useState<'select' | 'draw' | 'erase'>('select');
  
  // Background update counter to force re-render when backgrounds are removed
  const [backgroundUpdateKey, setBackgroundUpdateKey] = useState<number>(0);
  const [brushSize, setBrushSize] = useState(2);
  const [brushColor, setBrushColor] = useState('#000000');
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed'>('solid');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  
  // Zoom and pan states
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  
  // Canvas container reference
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const drawingCanvasRef = useRef<any>(null);
  const canvasImageRef = useRef<HTMLImageElement | null>(null);
  
  // Browser zoom detection
  const [browserZoom, setBrowserZoom] = useState(1);
  
  // 🔧 DYNAMIC CANVAS APPROACH: 이미지 비율 기반 동적 캔버스 크기
  const REFERENCE_WIDTH = 1200; // 고정 가로 크기
  
  // 로컬 스토리지에서 이미지 크기 정보 가져오기
  const getStoredImageDimensions = (canvasId: string) => {
    try {
      const stored = localStorage.getItem(`canvas_dimensions_${canvasId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };
  
  // 로컬 스토리지에 이미지 크기 정보 저장
  const storeImageDimensions = (canvasId: string, width: number, height: number) => {
    try {
      localStorage.setItem(`canvas_dimensions_${canvasId}`, JSON.stringify({ width, height }));
    } catch {
      console.warn('Failed to store image dimensions to localStorage');
    }
  };
  
  // 로컬 스토리지에서 이미지 크기 정보 삭제
  const clearStoredImageDimensions = (canvasId: string) => {
    try {
      localStorage.removeItem(`canvas_dimensions_${canvasId}`);
      console.log('🧹 Cleared stored image dimensions for canvas:', canvasId);
    } catch {
      console.warn('Failed to clear stored image dimensions');
    }
  };
  
  // 캔버스 썸네일을 배경 이미지로 업데이트
  const updateCanvasThumbnail = async (newThumbnailUrl: string) => {
    if (!id) return;
    
    try {
      console.log('🖼️ Updating canvas thumbnail:', newThumbnailUrl);
      
      const { error } = await supabase
        .from('canvases')
        .update({ image_url: newThumbnailUrl })
        .eq('id', id);
        
      if (error) {
        console.error('❌ Error updating canvas thumbnail:', error);
        console.error('Thumbnail update error details:', { 
          code: error.code, 
          message: error.message, 
          details: error.details,
          newThumbnailUrl 
        });
        throw error;
      }
      
      console.log('✅ Canvas thumbnail updated successfully');
      
      toast({
        title: "썸네일 업데이트 완료",
        description: "캔버스 썸네일이 배경 이미지로 변경되었습니다.",
      });
    } catch (error) {
      console.error('❌ Thumbnail update failed:', error);
    }
  };
  
  // 캔버스 크기 계산 (이미지 비율 기반)
  const calculateCanvasDimensions = () => {
    // 배경 이미지 또는 캔버스 이미지 확인
    const hasBackgroundImage = canvas?.backgroundType === 'image' && canvas?.backgroundImageUrl;
    const hasCanvasImage = canvas?.imageUrl && canvas.imageUrl !== '/placeholder.svg';
    const hasAnyImage = hasBackgroundImage || hasCanvasImage;
    
    console.log('🔍 Canvas dimension calculation:', {
      backgroundType: canvas?.backgroundType,
      backgroundImageUrl: canvas?.backgroundImageUrl,
      imageUrl: canvas?.imageUrl,
      hasBackgroundImage,
      hasCanvasImage,
      hasAnyImage,
      imageWidth: canvas?.imageWidth,
      imageHeight: canvas?.imageHeight
    });

    if (hasAnyImage) {
      // 데이터베이스에서 이미지 크기 정보가 있는 경우
      if (canvas?.imageWidth && canvas?.imageHeight) {
        const aspectRatio = canvas.imageHeight / canvas.imageWidth;
        const canvasHeight = Math.round(REFERENCE_WIDTH * aspectRatio);
        console.log('✅ Using stored image dimensions:', { width: canvas.imageWidth, height: canvas.imageHeight, aspectRatio, canvasHeight });
        return { width: REFERENCE_WIDTH, height: canvasHeight };
      }
      // 이미지는 있지만 크기 정보가 없는 경우 - 이미지 로드를 기다림
      else {
        console.log('⏳ Image exists but no dimensions yet, using 4:3 temporarily (will update when image loads)');
        // 임시로 4:3 비율 사용 (이미지 로드 후 업데이트됨)
        return { width: REFERENCE_WIDTH, height: Math.round(REFERENCE_WIDTH * 3 / 4) };
      }
    } else {
      // 이미지가 없는 경우: 기본 16:9 비율
      console.log('No image, using 16:9 default');
      return { width: REFERENCE_WIDTH, height: Math.round(REFERENCE_WIDTH * 9 / 16) };
    }
  };
  
  const canvasDimensions = calculateCanvasDimensions();
  
  // 이미지 로드 시 실제 크기 감지
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    console.log('🖼️ Image loaded:', { naturalWidth, naturalHeight });
    
    // 캔버스 상태에 이미지 크기 저장 (항상 업데이트)
    if (canvas) {
      setCanvas(prev => prev ? {
        ...prev,
        imageWidth: naturalWidth,
        imageHeight: naturalHeight
      } : null);
      
      // 로컬 스토리지에 저장
      if (canvas?.id) {
        storeImageDimensions(canvas.id, naturalWidth, naturalHeight);
      }
      
      // 데이터베이스에 업데이트 시도 (실패해도 상태는 업데이트됨)
      updateCanvasImageDimensions(naturalWidth, naturalHeight);
    }
  };

  const updateCanvasImageDimensions = async (width: number, height: number) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('canvases')
        .update({
          image_width: width,
          image_height: height
        })
        .eq('id', id);

      if (error) {
        // DB 컬럼이 아직 없으면 무시 (상태에는 이미 저장됨)
        if (error.code === 'PGRST204' || error.message?.includes('image_width') || error.message?.includes('image_height')) {
          console.log('⚠️ DB schema not updated yet, but canvas dimensions saved to state:', { width, height });
        } else {
          console.error('❌ Error updating canvas image dimensions:', error);
          console.error('Error details:', { code: error.code, message: error.message, details: error.details });
        }
      } else {
        console.log('✅ Canvas image dimensions updated to DB:', { width, height });
      }
    } catch (error) {
      console.error('Error updating canvas image dimensions:', error);
    }
  };
  
  // 클릭 좌표를 상대 좌표로 변환 (저장용)
  const convertToRelativeCoords = (pixelX: number, pixelY: number, containerWidth: number, containerHeight: number) => {
    const relativeX = Math.max(0, Math.min(1, pixelX / containerWidth));
    const relativeY = Math.max(0, Math.min(1, pixelY / containerHeight));
    
    console.log('🎯 Pixel→Relative conversion:', `(${pixelX.toFixed(2)}, ${pixelY.toFixed(2)}) → (${relativeX.toFixed(4)}, ${relativeY.toFixed(4)}) [container: ${containerWidth}×${containerHeight}]`);
    
    return { x: relativeX, y: relativeY };
  };

  // 상대 좌표를 현재 캔버스 크기 기준 픽셀 좌표로 변환 (표시용)
  const convertToAbsoluteCoords = (relativeX: number, relativeY: number, containerWidth: number, containerHeight: number) => {
    const absoluteX = relativeX * containerWidth;
    const absoluteY = relativeY * containerHeight;
    
    // 디버깅: NaN 감지
    if (isNaN(absoluteX) || isNaN(absoluteY)) {
      console.error('🚨 NaN detected in convertToAbsoluteCoords:', {
        relativeX, relativeY, containerWidth, containerHeight,
        absoluteX, absoluteY
      });
    }
    
    return { x: absoluteX, y: absoluteY };
  };
  
  // Handle mouse and touch events for pan
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only handle pan events on the main canvas, not on drawing canvas elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'CANVAS' && isDrawingMode) {
      // Don't interfere with drawing canvas when in drawing mode
      return;
    }

    // For mouse: pan with Ctrl/Cmd key
    // For touch: pan with single finger when not in drawing mode
    if ((e.pointerType === 'mouse' && (e.ctrlKey || e.metaKey)) ||
        (e.pointerType === 'touch' && !isDrawingMode)) {
      setIsDragging(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      setPanX(prev => prev + deltaX);
      setPanY(prev => prev + deltaY);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };


  // Reset zoom and pan
  const resetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  useEffect(() => {
    if (id) {
      fetchCanvasData();
      fetchPinTemplates();
      checkUserPermission();
    }
  }, [id, user]);

  // Enhanced browser zoom detection with multiple methods
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let rafId: number;
    let lastDetectedZoom = 1;
    
    const detectZoom = () => {
      // Cancel previous timeout and RAF
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
      
      // Use RAF for smooth performance
      rafId = requestAnimationFrame(() => {
        // Debounce to prevent excessive calls
        timeoutId = setTimeout(() => {
          let detectedZoom = 1;
          
          try {
            // Method 1: Use media queries - most reliable approach
            detectedZoom = window.devicePixelRatio / (window.devicePixelRatio || 1);
            
            // Method 2: Compare actual vs expected element size
            const testElement = document.createElement('div');
            testElement.style.cssText = `
              position: absolute !important;
              left: -9999px !important;
              top: -9999px !important;
              width: 1in !important;
              height: 1in !important;
              padding: 0 !important;
              margin: 0 !important;
              border: 0 !important;
              visibility: hidden !important;
              pointer-events: none !important;
            `;
            
            document.body.appendChild(testElement);
            const computedRect = testElement.getBoundingClientRect();
            document.body.removeChild(testElement);
            
            if (computedRect.width > 0) {
              // 1 inch should be 96 CSS pixels at 100% zoom
              detectedZoom = 96 / computedRect.width;
              console.log('🔍 Test element detection:', {
                expectedWidth: 96,
                actualWidth: computedRect.width.toFixed(2),
                calculatedZoom: detectedZoom.toFixed(3)
              });
            }
            
            // Method 3: Screen-based calculation as fallback
            if (detectedZoom === 1 && screen.width && window.innerWidth) {
              const screenRatio = screen.width / window.innerWidth;
              if (screenRatio > 0.1 && screenRatio < 10) {
                detectedZoom = Math.round(screenRatio * 100) / 100;
              }
            }
            
            // Clamp to reasonable values
            detectedZoom = Math.max(0.1, Math.min(10, detectedZoom));
            
          } catch (error) {
            console.warn('🔍 Zoom detection error:', error);
            detectedZoom = 1;
          }
          
          // Apply light smoothing to prevent jitter
          const smoothedZoom = lastDetectedZoom * 0.8 + detectedZoom * 0.2;
          
          setBrowserZoom(prev => {
            // 🔧 훨씬 더 보수적인 임계값 (10% 이상 변화시에만)
            const threshold = 0.1;
            if (Math.abs(prev - smoothedZoom) > threshold) {
              console.log('🔍 Browser zoom changed (major):');
              console.log('  From:', prev.toFixed(3), '→ To:', smoothedZoom.toFixed(3));
              console.log('  Raw detected:', detectedZoom.toFixed(3));
              console.log('  Threshold:', threshold);
              console.log('---');
              lastDetectedZoom = smoothedZoom;
              return smoothedZoom;
            }
            // 작은 변화는 무시하고 기존 값 유지
            return prev;
          });
        }, 50); // Faster response time
      });
    };

    // Initial detection with slight delay
    setTimeout(() => {
      detectZoom();
      
      // Show initial state after detection
      setTimeout(() => {
        console.log('🚀 Initial Zoom State:');
        console.log('  BrowserZoom:', browserZoom.toFixed(3));
        console.log('  DevicePixelRatio:', window.devicePixelRatio?.toFixed(3));
        if (window.visualViewport) {
          console.log('  VisualViewport Scale:', window.visualViewport.scale?.toFixed(3));
        }
        console.log('---');
      }, 200);
    }, 100);
    
    // Listen for relevant events with passive listeners for better performance
    const events = ['resize', 'orientationchange', 'load'];
    events.forEach(event => window.addEventListener(event, detectZoom, { passive: true }));
    
    // Visual viewport API for better mobile support
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', detectZoom, { passive: true });
      window.visualViewport.addEventListener('scroll', detectZoom, { passive: true });
    }
    
    // Listen for wheel events (Ctrl + Mouse Wheel zoom)
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        console.log('🎯 Ctrl+Wheel detected, triggering zoom detection');
        setTimeout(detectZoom, 10);
        setTimeout(detectZoom, 100);
        setTimeout(detectZoom, 300);
      }
    };
    
    // Listen for key combinations that might change zoom
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '0')) {
        console.log('🎯 Ctrl+Key zoom detected:', e.key);
        setTimeout(detectZoom, 10);
        setTimeout(detectZoom, 100);
        setTimeout(detectZoom, 300);
      }
    };
    
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('keydown', handleKeyDown);
    
    // Additional event listeners for zoom detection
    // Note: wheel event with preventDefault needs non-passive listener
    document.addEventListener('gesturestart', detectZoom, { passive: true });
    document.addEventListener('gesturechange', detectZoom, { passive: true });
    document.addEventListener('gestureend', detectZoom, { passive: true });
    
    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
      events.forEach(event => window.removeEventListener(event, detectZoom));
      document.removeEventListener('gesturestart', detectZoom);
      document.removeEventListener('gesturechange', detectZoom);
      document.removeEventListener('gestureend', detectZoom);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', detectZoom);
        window.visualViewport.removeEventListener('scroll', detectZoom);
      }
    };
  }, []);

  // Separate wheel event handler to avoid passive listener issues
  useEffect(() => {
    const handleWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.max(0.1, Math.min(3, prev * zoomFactor)));
      }
    };

    // Touch events for pinch-to-zoom
    let lastTouchDistance = 0;
    let isZooming = false;
    let touchStartTime = 0;

    const getTouchDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastTouchDistance = getTouchDistance(e.touches);
        isZooming = true;
        touchStartTime = Date.now();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isZooming) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);

        if (lastTouchDistance > 0 && currentDistance > 0) {
          const rawZoomFactor = currentDistance / lastTouchDistance;

          // Apply smoothing to prevent jittery zoom
          const smoothingFactor = 0.3; // Adjust between 0.1 (very smooth) and 1.0 (no smoothing)
          const zoomFactor = 1 + (rawZoomFactor - 1) * smoothingFactor;

          // Only apply zoom if the change is significant enough
          if (Math.abs(zoomFactor - 1) > 0.01) {
            setZoom(prev => Math.max(0.1, Math.min(3, prev * zoomFactor)));
          }
        }

        lastTouchDistance = currentDistance;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isZooming = false;
        lastTouchDistance = 0;
        touchStartTime = 0;
      }
    };

    // Add non-passive wheel listener for zoom control
    const container = canvasContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheelZoom, { passive: false });
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: false });

      return () => {
        container.removeEventListener('wheel', handleWheelZoom);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [canvasContainerRef]);

  const checkUserPermission = async () => {
    if (!id) {
      setUserPermission(null);
      return;
    }

    try {
      // Get canvas data first
      const { data: canvasData, error: canvasError } = await supabase
        .from('canvases')
        .select('owner_id, is_public, public_permission')
        .eq('id', id)
        .single();

      if (canvasError) throw canvasError;

      // If user is logged in, check ownership and share permissions
      if (user) {
        // Check if user is the owner
        if (canvasData.owner_id === user.id) {
          setUserPermission('owner');
          return;
        }

        // Check if canvas is public
        if (canvasData.is_public) {
          setUserPermission(canvasData.public_permission as 'viewer' | 'editor');
          return;
        }

        // Check if user has explicit share permission
        const { data: shareData, error: shareError } = await supabase
          .from('canvas_shares')
          .select('permission')
          .eq('canvas_id', id)
          .eq('shared_with_email', user.email)
          .single();

        if (shareError && shareError.code !== 'PGRST116') throw shareError;

        if (shareData) {
          setUserPermission(shareData.permission as 'viewer' | 'editor');
        } else {
          setUserPermission('viewer'); // Default to viewer if no explicit permission
        }
      } else {
        // Anonymous user - only check if canvas is public
        if (canvasData.is_public) {
          setUserPermission(canvasData.public_permission as 'viewer' | 'editor');
        } else {
          setUserPermission(null); // No access for anonymous users on private canvases
        }
      }
    } catch (error) {
      console.error('Error checking user permission:', error);
      setUserPermission('viewer'); // Default to viewer on error
    }
  };

  const fetchCanvasData = async () => {
    try {
      console.log('Fetching canvas data for ID:', id);
      
      // 캔버스 데이터 가져오기
      const { data: canvasData, error: canvasError } = await supabase
        .from('canvases')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (canvasError) throw canvasError;

      if (canvasData) {
        setCanvas({
          id: canvasData.id,
          title: canvasData.title,
          imageUrl: canvasData.image_url || '/placeholder.svg',
          createdAt: new Date(canvasData.created_at),
          pinCount: 0,
          layerCount: 0,
          ownerId: canvasData.owner_id,
          allowComments: canvasData.allow_comments,
          allowLikes: canvasData.allow_likes,
          backgroundType: (canvasData.background_type as 'color' | 'image') || 'color',
          backgroundColor: canvasData.background_color || '#ffffff',
          backgroundImageUrl: canvasData.background_image_url || undefined,
          imageWidth: canvasData.image_width || (() => {
            const stored = getStoredImageDimensions(canvasData.id);
            if (stored) {
              console.log('💾 Using localStorage image dimensions:', stored);
            }
            return stored?.width;
          })() || undefined,
          imageHeight: canvasData.image_height || (() => {
            const stored = getStoredImageDimensions(canvasData.id);
            return stored?.height;
          })() || undefined,
        });

        // 레이어 데이터 가져오기
        const { data: layersData, error: layersError } = await supabase
          .from('layers')
          .select('*')
          .eq('canvas_id', id)
          .order('created_at', { ascending: true });

        if (layersError) throw layersError;

        const formattedLayers: Layer[] = layersData?.map(layer => ({
          id: layer.id,
          name: layer.name,
          color: layer.color,
          visible: layer.visible,
          locked: layer.locked || false,
          canvasId: layer.canvas_id,
        })) || [];

        console.log('Formatted layers:', formattedLayers);
        setLayers(formattedLayers);
        setSelectedLayerId(formattedLayers[0]?.id || '');

        // 핀 데이터 가져오기 (템플릿 정보 포함)
        console.log('🔵 Fetching pins for canvas:', id);
        const { data: pinsData, error: pinsError } = await supabase
          .from('pins')
          .select(`
            *,
            media_items (*),
            pin_templates (*)
          `)
          .eq('canvas_id', id);

        if (pinsError) {
          console.error('🔴 Pin fetch error:', pinsError);
          throw pinsError;
        }

        console.log('🔵 Raw pins data from database:', pinsData);

        const formattedPins: PinData[] = pinsData?.map(pin => {
          // 하드코딩된 템플릿 ID 복원
          let templateId = pin.template_id;
          let description = pin.description || '';
          
          if (!templateId && description.includes('||template:')) {
            const parts = description.split('||template:');
            description = parts[0];
            templateId = parts[1];
          }
          
          return {
            id: pin.id,
            x: pin.x,
            y: pin.y,
            title: pin.title,
            description,
            layerId: pin.layer_id,
            canvasId: pin.canvas_id,
            templateId,
            template: pin.pin_templates ? {
              id: pin.pin_templates.id,
              name: pin.pin_templates.name,
              description: pin.pin_templates.description,
              shape: pin.pin_templates.shape as PinTemplate['shape'],
              color: pin.pin_templates.color,
              size: pin.pin_templates.size as PinTemplate['size'],
              icon: pin.pin_templates.icon,
              style: pin.pin_templates.style,
              imageUrl: pin.pin_templates.image_url,
              isDefault: pin.pin_templates.is_default,
              isPublic: pin.pin_templates.is_public,
            } : undefined,
            mediaItems: pin.media_items?.map((media: any) => ({
              id: media.id,
              type: media.type,
              url: media.url,
              name: media.name,
            })) || [],
          };
        }) || [];

        console.log('🔵 Formatted pins with coordinate check:', formattedPins.map(pin => ({
          id: pin.id,
          x: pin.x,
          y: pin.y,
          xIsNaN: isNaN(pin.x),
          yIsNaN: isNaN(pin.y),
          templateId: pin.templateId,
          template: pin.template ? {
            name: pin.template.name,
            shape: pin.template.shape
          } : null
        })));
        
        // 좌표가 유효하지 않은 핀들 필터링 및 경고
        const validPins = formattedPins.filter(pin => {
          const isValid = !isNaN(pin.x) && !isNaN(pin.y) && pin.x >= 0 && pin.x <= 1 && pin.y >= 0 && pin.y <= 1;
          if (!isValid) {
            console.warn('🚨 Invalid pin coordinates detected:', {
              id: pin.id,
              x: pin.x,
              y: pin.y,
              templateId: pin.templateId
            });
          }
          return isValid;
        });
        
        console.log(`🔵 Setting ${validPins.length}/${formattedPins.length} valid pins`);
        setPins(validPins);
        
        // 이미지가 있지만 크기 정보가 없으면 미리 로드하여 크기 정보 획득
        const hasImageUrl = canvasData.image_url && canvasData.image_url !== '/placeholder.svg';
        const hasBackgroundImageUrl = canvasData.background_image_url;
        const hasImageDimensions = canvasData.image_width && canvasData.image_height;
        
        console.log('🔍 Preload check:', { 
          hasImageUrl, 
          hasBackgroundImageUrl, 
          hasImageDimensions,
          imageUrl: canvasData.image_url,
          backgroundImageUrl: canvasData.background_image_url,
          imageWidth: canvasData.image_width,
          imageHeight: canvasData.image_height
        });
        
        // 이전 캔버스를 위한 적극적인 이미지 크기 감지
        if ((hasImageUrl || hasBackgroundImageUrl) && !hasImageDimensions) {
          console.log('🔄 Preloading image to get dimensions...');
          const imageUrl = hasBackgroundImageUrl || canvasData.image_url;
          
          // 브라우저 환경에서만 실행
          if (typeof window !== 'undefined' && window.Image) {
            const img = new window.Image();
            img.onload = () => {
              console.log('📏 Preloaded image dimensions:', { width: img.naturalWidth, height: img.naturalHeight });
              
              // 상태 업데이트
              setCanvas(prev => prev ? {
                ...prev,
                imageWidth: img.naturalWidth,
                imageHeight: img.naturalHeight
              } : null);
              
              // 로컬 스토리지에 저장
              if (canvasData.id) {
                storeImageDimensions(canvasData.id, img.naturalWidth, img.naturalHeight);
              }
              
              // DB 업데이트 시도
              updateCanvasImageDimensions(img.naturalWidth, img.naturalHeight);
            };
            img.onerror = () => {
              console.warn('❌ Failed to preload image:', imageUrl);
            };
            img.src = imageUrl;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching canvas data:', error);
      toast({
        title: "오류",
        description: "캔버스 데이터를 불러올 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const fetchPinTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('pin_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedTemplates: PinTemplate[] = data.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        shape: template.shape as PinTemplate['shape'],
        color: template.color,
        size: template.size as PinTemplate['size'],
        icon: template.icon,
        style: template.style,
        imageUrl: template.image_url,
        isDefault: template.is_default,
        isPublic: template.is_public,
      }));

      setPinTemplates(formattedTemplates);
      
      // Set default template if none selected
      if (!selectedPinTemplate) {
        const defaultTemplate = formattedTemplates.find(t => t.isDefault);
        setSelectedPinTemplate(defaultTemplate || formattedTemplates[0] || null);
      }
    } catch (error) {
      console.error('Error fetching pin templates:', error);
      toast({
        title: "오류",
        description: "핀 템플릿을 불러올 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPresentationMode) {
        setIsPresentationMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPresentationMode]);

  const getVisiblePins = () => {
    const visibleLayerIds = layers.filter(layer => layer.visible).map(layer => layer.id);
    return pins.filter(pin => visibleLayerIds.includes(pin.layerId));
  };

  const getLayerColor = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    return layer?.color || '#6b7280';
  };

  if (!canvas) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">캔버스를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click is on a drawing canvas
    const target = e.target as HTMLElement;
    if (target.tagName === 'CANVAS' && isDrawingMode) {
      // Don't add pins when clicking on drawing canvas in drawing mode
      return;
    }

    if (isDrawingMode) return; // Don't add pins in drawing mode
    if (!canEdit) return; // Don't add pins if user can't edit
    
    if (!selectedLayerId) return;
    
    const selectedLayer = layers.find(l => l.id === selectedLayerId);
    if (selectedLayer?.locked) {
      toast({
        title: "레이어 잠금됨",
        description: "잠긴 레이어에는 핀을 추가할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    // 🔧 DYNAMIC CANVAS: 동적 캔버스 크기 기준으로 상대 좌표 변환
    const rect = e.currentTarget.getBoundingClientRect();
    
    // 클릭한 픽셀 위치 (컨테이너 기준)
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;
    
    // 0-1 범위의 상대 좌표로 변환 (동적 캔버스 크기 기준)
    const relativeCoords = convertToRelativeCoords(pixelX, pixelY, canvasDimensions.width, canvasDimensions.height);
    
    console.log('📍 Pin Click (DYNAMIC CANVAS MODE):');
    console.log('  Click:', `(${e.clientX}, ${e.clientY}) Canvas: ${canvasDimensions.width}×${canvasDimensions.height}`);
    console.log('  Raw→Relative:', `(${pixelX.toFixed(1)}, ${pixelY.toFixed(1)}) → (${relativeCoords.x.toFixed(4)}, ${relativeCoords.y.toFixed(4)})`);
    console.log('---');

    // 선택된 템플릿이 있으면 사용, 없으면 기본 템플릿 사용
    const templateToUse = selectedPinTemplate || pinTemplates.find(t => t.isDefault) || pinTemplates[0];
    
    if (templateToUse) {
      const newPin: PinData = {
        id: `temp-pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: relativeCoords.x,  // 상대 좌표 사용
        y: relativeCoords.y,  // 상대 좌표 사용
        title: '새 핀',
        description: '핀 설명을 입력하세요',
        layerId: selectedLayerId,
        canvasId: id || '1',
        templateId: templateToUse.id,
        template: templateToUse,
        mediaItems: [],
      };
      
      setSelectedPin(newPin);
      setIsCreatingNewPin(true);
      setIsPinModalOpen(true);
    }
  };

  // Drawing canvas functions (these will be connected to the actual DrawingCanvas component)
  const undo = () => {
    if ((window as any).undoDrawing) {
      (window as any).undoDrawing();
    }
  };

  const redo = () => {
    if ((window as any).redoDrawing) {
      (window as any).redoDrawing();
    }
  };

  const clearCanvas = () => {
    if ((window as any).clearDrawingCanvas) {
      (window as any).clearDrawingCanvas();
    }
  };

  const handlePinClick = (pin: PinData) => {
    setSelectedPin(pin);
    setIsCreatingNewPin(false);
    setIsPinModalOpen(true);
  };

  const handlePinUpdate = async (updatedPin: PinData) => {
    try {
      if (isCreatingNewPin) {
        console.log('🔵 Creating new pin with data:', updatedPin);
        
        // 좌표 유효성 검증
        if (isNaN(updatedPin.x) || isNaN(updatedPin.y)) {
          console.error('🚨 Invalid coordinates detected in pin update:', {
            x: updatedPin.x, y: updatedPin.y,
            xIsNaN: isNaN(updatedPin.x),
            yIsNaN: isNaN(updatedPin.y)
          });
          throw new Error('Invalid pin coordinates');
        }
        
        // 새 핀을 데이터베이스에 추가
        // 하드코딩된 커스텀 템플릿 ID들은 별도 필드에 저장
        const isHardcodedTemplate = updatedPin.templateId && 
          (updatedPin.templateId.startsWith('custom-') || updatedPin.templateId.startsWith('default-'));
        
        // 🔧 RELATIVE COORDS: 상대 좌표로 직접 저장
        const insertData = {
          x: updatedPin.x,  // 이미 0-1 범위의 상대 좌표
          y: updatedPin.y,  // 이미 0-1 범위의 상대 좌표
          title: updatedPin.title,
          description: updatedPin.description,
          layer_id: updatedPin.layerId,
          canvas_id: updatedPin.canvasId,
          template_id: isHardcodedTemplate ? null : updatedPin.templateId,
          // 하드코딩된 템플릿 ID를 별도 필드에 저장 (description에 추가)
          ...(isHardcodedTemplate && { 
            description: `${updatedPin.description}||template:${updatedPin.templateId}` 
          })
        };
        
        console.log('🔵 Insert data with coordinate validation:', {
          ...insertData,
          coordinatesValid: !isNaN(insertData.x) && !isNaN(insertData.y)
        });
        
        const { data, error } = await supabase
          .from('pins')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('🔴 Pin insert error:', error);
          throw error;
        }

        console.log('✅ Pin inserted successfully:', data);

        // 미디어 아이템들 저장
        if (updatedPin.mediaItems && updatedPin.mediaItems.length > 0) {
          console.log('🔵 Saving media items:', updatedPin.mediaItems);
          
          const mediaItemsData = updatedPin.mediaItems.map(item => ({
            pin_id: data.id,
            type: item.type,
            url: item.url,
            name: item.name || null
          }));
          
          const { error: mediaError } = await supabase
            .from('media_items')
            .insert(mediaItemsData);
            
          if (mediaError) {
            console.error('🔴 Media items insert error:', mediaError);
            // 미디어 아이템 저장 실패해도 핀은 생성된 상태로 유지
            toast({
              title: "경고",
              description: "핀은 생성되었으나 미디어 아이템 저장에 실패했습니다.",
              variant: "destructive",
            });
          } else {
            console.log('✅ Media items saved successfully');
          }
        }

        const newPin: PinData = {
          ...updatedPin,
          id: data.id
        };

        const updatedPins = [...pins, newPin];
        setPins(updatedPins);
        setIsCreatingNewPin(false);

        toast({
          title: "핀 생성 완료",
          description: "새 핀이 생성되었습니다.",
        });
      } else {
        // 기존 핀을 데이터베이스에서 업데이트
        // 하드코딩된 커스텀 템플릿 ID들은 별도 필드에 저장
        const isHardcodedTemplate = updatedPin.templateId && 
          (updatedPin.templateId.startsWith('custom-') || updatedPin.templateId.startsWith('default-'));
        
        // 🔧 RELATIVE COORDS: 상대 좌표로 직접 저장
        const updateData = {
          x: updatedPin.x,  // 이미 0-1 범위의 상대 좌표
          y: updatedPin.y,  // 이미 0-1 범위의 상대 좌표
          title: updatedPin.title,
          layer_id: updatedPin.layerId,
          template_id: isHardcodedTemplate ? null : updatedPin.templateId,
          // 하드코딩된 템플릿 ID를 description에 인코딩
          description: isHardcodedTemplate ? 
            `${updatedPin.description.replace(/\|\|template:.*$/, '')}||template:${updatedPin.templateId}` : 
            updatedPin.description
        };

        const { error } = await supabase
          .from('pins')
          .update(updateData)
          .eq('id', updatedPin.id);

        if (error) throw error;

        // 기존 미디어 아이템들 삭제 후 새로 추가
        const { error: deleteError } = await supabase
          .from('media_items')
          .delete()
          .eq('pin_id', updatedPin.id);
          
        if (deleteError) {
          console.error('🔴 Error deleting old media items:', deleteError);
        }

        // 새 미디어 아이템들 저장
        if (updatedPin.mediaItems && updatedPin.mediaItems.length > 0) {
          console.log('🔵 Updating media items:', updatedPin.mediaItems);
          
          const mediaItemsData = updatedPin.mediaItems.map(item => ({
            pin_id: updatedPin.id,
            type: item.type,
            url: item.url,
            name: item.name || null
          }));
          
          const { error: mediaError } = await supabase
            .from('media_items')
            .insert(mediaItemsData);
            
          if (mediaError) {
            console.error('🔴 Media items update error:', mediaError);
            toast({
              title: "경고",
              description: "핀은 수정되었으나 미디어 아이템 저장에 실패했습니다.",
              variant: "destructive",
            });
          } else {
            console.log('✅ Media items updated successfully');
          }
        }

        const updatedPins = pins.map(pin => pin.id === updatedPin.id ? updatedPin : pin);
        setPins(updatedPins);

        toast({
          title: "핀 수정 완료",
          description: "핀이 수정되었습니다.",
        });
      }
    } catch (error) {
      console.error('Error updating pin:', error);
      toast({
        title: "오류",
        description: "핀 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handlePinDelete = async (pinId: string) => {
    try {
      // 먼저 연관된 미디어 아이템들 삭제
      const { error: mediaError } = await supabase
        .from('media_items')
        .delete()
        .eq('pin_id', pinId);
        
      if (mediaError) {
        console.error('🔴 Error deleting media items:', mediaError);
        // 미디어 아이템 삭제 실패해도 핀 삭제는 계속 진행
      }

      // 핀 삭제
      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('id', pinId);

      if (error) throw error;

      const updatedPins = pins.filter(pin => pin.id !== pinId);
      setPins(updatedPins);

      toast({
        title: "핀 삭제 완료",
        description: "핀이 삭제되었습니다.",
      });
    } catch (error) {
      console.error('Error deleting pin:', error);
      toast({
        title: "오류",
        description: "핀 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handlePinModalClose = () => {
    setIsPinModalOpen(false);
    setIsCreatingNewPin(false);
    setSelectedPin(null);
  };

  const handlePinPositionChange = async (pinId: string, relativeX: number, relativeY: number) => {
    // 🔧 RELATIVE COORDS: 상대 좌표로 직접 처리
    // 먼저 로컬 상태 업데이트 (즉시 UI 반영)
    const updatedPins = pins.map(pin => 
      pin.id === pinId ? { ...pin, x: relativeX, y: relativeY } : pin
    );
    setPins(updatedPins);

    // 백그라운드에서 데이터베이스에 상대 좌표로 업데이트
    try {
      const { error } = await supabase
        .from('pins')
        .update({ 
          x: relativeX, 
          y: relativeY 
        })
        .eq('id', pinId);

      if (error) throw error;

      console.log('Pin position updated (relative):', { 
        pinId, 
        relative: { x: relativeX, y: relativeY }
      });

    } catch (error) {
      console.error('Error updating pin position:', error);
      // 에러 시 이전 상태로 되돌리기
      setPins(pins);
      toast({
        title: "오류",
        description: "핀 위치 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const toggleLayerVisibility = async (layerId: string) => {
    try {
      const layer = layers.find(l => l.id === layerId);
      if (!layer) return;

      const newVisibility = !layer.visible;

      const { error } = await supabase
        .from('layers')
        .update({ visible: newVisibility })
        .eq('id', layerId);

      if (error) throw error;

      const updatedLayers = layers.map(layer => 
        layer.id === layerId 
          ? { ...layer, visible: newVisibility }
          : layer
      );
      setLayers(updatedLayers);
    } catch (error) {
      console.error('Error updating layer visibility:', error);
      toast({
        title: "오류",
        description: "레이어 표시/숨김 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleCreateLayer = async (layerData: { name: string; color: string }) => {
    try {
      const { data, error } = await supabase
        .from('layers')
        .insert({
          name: layerData.name,
          color: layerData.color,
          canvas_id: id
        })
        .select()
        .single();

      if (error) throw error;

      const newLayer: Layer = {
        id: data.id,
        name: data.name,
        color: data.color,
        visible: data.visible,
        locked: data.locked || false,
        canvasId: data.canvas_id,
      };

      const updatedLayers = [...layers, newLayer];
      setLayers(updatedLayers);

      toast({
        title: "레이어 생성 완료",
        description: "새 레이어가 생성되었습니다.",
      });
    } catch (error) {
      console.error('Error creating layer:', error);
      toast({
        title: "오류",
        description: "레이어 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLayer = async (layerId: string) => {
    if (layers.length <= 1) {
      toast({
        title: "삭제 불가",
        description: "최소 하나의 레이어는 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    if (confirm('이 레이어와 모든 핀을 삭제하시겠습니까?')) {
      try {
        // 레이어에 속한 핀들 먼저 삭제
        await supabase
          .from('pins')
          .delete()
          .eq('layer_id', layerId);

        // 레이어 삭제
        const { error } = await supabase
          .from('layers')
          .delete()
          .eq('id', layerId);

        if (error) throw error;

        const updatedLayers = layers.filter(layer => layer.id !== layerId);
        const updatedPins = pins.filter(pin => pin.layerId !== layerId);
        
        setLayers(updatedLayers);
        setPins(updatedPins);
        
        if (selectedLayerId === layerId) {
          setSelectedLayerId(updatedLayers[0]?.id || '');
        }

        toast({
          title: "레이어 삭제 완료",
          description: "레이어와 관련 핀들이 삭제되었습니다.",
        });
      } catch (error) {
        console.error('Error deleting layer:', error);
        toast({
          title: "오류",
          description: "레이어 삭제 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCanvasSettingsUpdate = (settings: { allow_comments: boolean; allow_likes: boolean }) => {
    if (canvas) {
      setCanvas({
        ...canvas,
        allowComments: settings.allow_comments,
        allowLikes: settings.allow_likes,
      });
    }
  };

  const toggleLayerLock = async (layerId: string) => {
    try {
      const layer = layers.find(l => l.id === layerId);
      if (!layer) return;

      const newLockState = !layer.locked;

      const { error } = await supabase
        .from('layers')
        .update({ locked: newLockState })
        .eq('id', layerId);

      if (error) throw error;

      const updatedLayers = layers.map(layer => 
        layer.id === layerId 
          ? { ...layer, locked: newLockState }
          : layer
      );
      setLayers(updatedLayers);

      toast({
        title: newLockState ? "레이어 잠금" : "레이어 잠금 해제",
        description: newLockState ? "레이어가 잠겼습니다." : "레이어 잠금이 해제되었습니다.",
      });
    } catch (error) {
      console.error('Error updating layer lock:', error);
      toast({
        title: "오류",
        description: "레이어 잠금 설정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleCanvasNameUpdate = async (newName: string) => {
    try {
      const { error } = await supabase
        .from('canvases')
        .update({ title: newName })
        .eq('id', id);

      if (error) throw error;

      if (canvas) {
        setCanvas({
          ...canvas,
          title: newName,
        });
      }

      toast({
        title: "캔버스 이름 수정 완료",
        description: "캔버스 이름이 변경되었습니다.",
      });
    } catch (error) {
      console.error('Error updating canvas name:', error);
      toast({
        title: "오류",
        description: "캔버스 이름 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleLayerNameUpdate = async (newName: string) => {
    try {
      const { error } = await supabase
        .from('layers')
        .update({ name: newName })
        .eq('id', editingLayerId);

      if (error) throw error;

      const updatedLayers = layers.map(layer => 
        layer.id === editingLayerId 
          ? { ...layer, name: newName }
          : layer
      );
      setLayers(updatedLayers);

      toast({
        title: "레이어 이름 수정 완료",
        description: "레이어 이름이 변경되었습니다.",
      });
    } catch (error) {
      console.error('Error updating layer name:', error);
      toast({
        title: "오류",
        description: "레이어 이름 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleBackgroundUpdate = async (type: 'color' | 'image', color?: string, imageUrl?: string) => {
    try {
      const updateData: any = { background_type: type };
      
      if (type === 'color') {
        updateData.background_color = color;
        updateData.background_image_url = null;
        updateData.image_url = null; // 기존 이미지 URL도 데이터베이스에서 제거
      } else if (type === 'image') {
        updateData.background_image_url = imageUrl;
      }

      const { error } = await supabase
        .from('canvases')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      if (canvas) {
        // 배경이 단색으로 변경되거나 다른 이미지로 변경되는 경우 이전 이미지 크기 정보 정리
        if (type === 'color' || (type === 'image' && imageUrl !== canvas.backgroundImageUrl)) {
          console.log('🔄 Background changed, clearing stored dimensions');
          clearStoredImageDimensions(canvas.id);
        }
        
        // 배경이 이미지로 변경되면 썸네일도 업데이트
        if (type === 'image' && imageUrl) {
          updateCanvasThumbnail(imageUrl);
        }
        
        // 배경 제거 시 명시적으로 null로 설정하여 DOM 재렌더링 강제
        const newBackgroundImageUrl = type === 'image' ? imageUrl : null;
        
        setCanvas({
          ...canvas,
          backgroundType: type,
          backgroundColor: color || canvas.backgroundColor,
          backgroundImageUrl: newBackgroundImageUrl,
          // 배경이 변경되면 이미지 크기 정보도 리셋
          imageWidth: type === 'color' ? undefined : canvas.imageWidth,
          imageHeight: type === 'color' ? undefined : canvas.imageHeight,
          // 배경이 이미지로 변경되면 썸네일도 업데이트 (로컬 상태)
          imageUrl: type === 'image' ? imageUrl : canvas.imageUrl,
        });

        // 배경 제거 시 강제로 캔버스 재렌더링을 위해 key 변경을 위한 추가 상태 업데이트
        if (type === 'color') {
          console.log('🎨 Background removed, forcing canvas re-render');
          
          // 1. backgroundUpdateKey 강제 증가
          const newKey = Date.now();
          setBackgroundUpdateKey(newKey);
          
          // 2. DOM 요소 직접 조작으로 배경 이미지 강제 제거
          const canvasElement = document.getElementById('main-canvas');
          if (canvasElement) {
            canvasElement.style.backgroundImage = 'none !important';
            canvasElement.style.background = color || '#ffffff';
            console.log('🧹 Directly removed background image from DOM with !important');
          }
          
          // 3. 상태를 즉시 null로 설정 (imageUrl도 함께 정리)
          setCanvas(prevCanvas => prevCanvas ? {
            ...prevCanvas,
            backgroundType: 'color',
            backgroundColor: color || '#ffffff',
            backgroundImageUrl: null,
            imageUrl: null, // 기존 이미지 URL도 제거
            imageWidth: undefined,
            imageHeight: undefined,
          } : null);
          
          // 4. 추가 안전장치: 딜레이 후 한 번 더 강제 설정
          setTimeout(() => {
            const canvasElement = document.getElementById('main-canvas');
            if (canvasElement) {
              canvasElement.style.backgroundImage = 'none';
              canvasElement.style.backgroundColor = color || '#ffffff';
            }
            setCanvas(prev => prev ? {
              ...prev,
              backgroundType: 'color',
              backgroundImageUrl: null,
              imageUrl: null // 두 번째 정리에서도 imageUrl 제거
            } : null);
            console.log('🔄 Second cleanup completed');
          }, 100);
        }
      }

      toast({
        title: "배경 변경 완료",
        description: "캔버스 배경이 변경되었습니다.",
      });
    } catch (error) {
      console.error('Error updating background:', error);
      toast({
        title: "오류",
        description: "배경 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleLayerColorChange = async (layerId: string, color: string) => {
    try {
      const { error } = await supabase
        .from('layers')
        .update({ color })
        .eq('id', layerId);

      if (error) throw error;

      // Update local state
      setLayers(layers.map(layer => 
        layer.id === layerId ? { ...layer, color } : layer
      ));

      toast({
        title: "레이어 색상 변경 완료",
        description: "레이어 색상이 변경되었습니다.",
      });
    } catch (error) {
      console.error('Error updating layer color:', error);
      toast({
        title: "오류",
        description: "레이어 색상 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  
  const isOwner = canvas && user?.id === canvas.ownerId;
  const canEdit = userPermission === 'owner' || userPermission === 'editor';

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 ${isPresentationMode ? 'p-0' : ''}`}>
      {/* Header */}
      {!isPresentationMode && (
        <header className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-bold">{canvas.title}</h1>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6"
                        onClick={() => setIsEditCanvasNameModalOpen(true)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pins.length}개의 핀 • {layers.length}개의 레이어
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  선택된 레이어: {layers.find(l => l.id === selectedLayerId)?.name || '없음'}
                </Badge>
                <Button
                  variant={selectedPinTemplate ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPinTemplateSelectorOpen(true)}
                  className="flex items-center space-x-2"
                >
                  <Palette className="w-4 h-4" />
                  <span className="text-xs">
                    {selectedPinTemplate ? selectedPinTemplate.name : '핀 템플릿'}
                  </span>
                </Button>
                {canEdit && (
                  <Button
                    variant={isDrawingMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsDrawingMode(!isDrawingMode)}
                    className="flex items-center space-x-2"
                  >
                    <Pen className="w-4 h-4" />
                    <span className="text-xs">
                      {isDrawingMode ? '드로잉 중' : '드로잉'}
                    </span>
                  </Button>
                )}
                <CanvasExporter 
                  canvasElementId="main-canvas"
                  canvasTitle={canvas.title}
                />
                {isOwner && canvas && (
                  <>
                    <CanvasBackgroundSelector
                      canvasId={canvas.id}
                      currentBackgroundType={canvas.backgroundType}
                      currentBackgroundColor={canvas.backgroundColor}
                      currentBackgroundImageUrl={canvas.backgroundImageUrl}
                      onBackgroundUpdate={handleBackgroundUpdate}
                    />
                    <CanvasSettingsModal
                      canvasId={canvas.id}
                      allowComments={canvas.allowComments}
                      allowLikes={canvas.allowLikes}
                      onSettingsUpdate={handleCanvasSettingsUpdate}
                    />
                  </>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsShareModalOpen(true)}
                  aria-label="Share Canvas"
                >
                  <Share className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsPresentationMode(true)}
                  aria-label="Presentation Mode"
                >
                  <Presentation className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Drawing Toolbar - positioned below header when drawing mode is active */}
          {isDrawingMode && (
            <div className="bg-white/90 backdrop-blur-sm border-b border-border/50 px-6 py-3">
              <div className="max-w-7xl mx-auto">
                <DrawingToolbar
                  tool={drawingTool}
                  setTool={setDrawingTool}
                  brushSize={brushSize}
                  setBrushSize={setBrushSize}
                  brushColor={brushColor}
                  setBrushColor={setBrushColor}
                  lineStyle={lineStyle}
                  setLineStyle={setLineStyle}
                  undoStack={undoStack}
                  redoStack={redoStack}
                  undo={() => drawingCanvasRef.current?.undo()}
                  redo={() => drawingCanvasRef.current?.redo()}
                  clearCanvas={() => drawingCanvasRef.current?.clearCanvas()}
                  deleteSelected={() => {
                    drawingCanvasRef.current?.deleteSelected();
                  }}
                  isVisible={true}
                />
              </div>
            </div>
          )}
        </header>
      )}

      <div className={`flex ${isPresentationMode ? 'fixed inset-0 z-50 bg-white' : ''}`}>
        {/* Layer Panel */}
        {!isPresentationMode && (
          <div className="w-80 bg-white/60 backdrop-blur-sm border-r border-border/50 p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <Layers className="w-5 h-5 mr-2" />
                  레이어 관리
                </h2>
                {canEdit && (
                  <Button
                    size="sm"
                    onClick={() => setIsCreateLayerModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    추가
                  </Button>
                )}
              </div>
              
              <div className="space-y-3">
                {layers.map((layer) => (
                  <Card
                    key={layer.id}
                    className={`cursor-pointer transition-all ${
                      selectedLayerId === layer.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50/50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedLayerId(layer.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <LayerColorPicker 
                            currentColor={layer.color}
                            onColorChange={(color) => handleLayerColorChange(layer.id, color)}
                          />
                          <span className="font-medium flex-1">{layer.name}</span>
                          {layer.locked && <Lock className="w-3 h-3 text-muted-foreground" />}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingLayerId(layer.id);
                                setIsEditLayerNameModalOpen(true);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLayerLock(layer.id);
                              }}
                            >
                              {layer.locked ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Unlock className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerVisibility(layer.id);
                            }}
                          >
                            {layer.visible ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-blue-500 hover:text-blue-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDuplicatingLayerId(layer.id);
                                setIsDuplicateLayerModalOpen(true);
                              }}
                              title="레이어 복제"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-red-500 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLayer(layer.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-muted-foreground">
                        {pins.filter(pin => pin.layerId === layer.id).length}개의 핀
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-blue-50 p-4 rounded-lg">
              <p className="font-medium mb-2">사용법:</p>
              <ul className="space-y-1 text-xs">
                <li>• 핀 템플릿 버튼으로 핀 모양 선택</li>
                <li>• 드로잉 버튼으로 펜 드로잉 모드 전환</li>
                <li>• 레이어를 선택한 후 캔버스를 클릭하여 핀 추가</li>
                <li>• 눈 아이콘으로 레이어 표시/숨김</li>
                <li>• 핀을 클릭하여 정보 확인</li>
                <li>• 휴지통 아이콘으로 레이어 삭제</li>
                <li>• 공유 아이콘으로 캔버스 공유 (뷰어/편집자 권한 선택 가능)</li>
                <li>• 소유자는 설정에서 댓글/좋아요 기능 허용 설정 가능</li>
              </ul>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className={`flex-1 relative ${isPresentationMode ? '' : 'p-6'}`}>
          {isPresentationMode && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white hover:text-white rounded-full"
              onClick={() => setIsPresentationMode(false)}
              aria-label="Exit Presentation Mode"
            >
              <X className="w-6 h-6" />
            </Button>
          )}

          <div
            ref={canvasContainerRef}
            id="main-canvas"
            key={`canvas-${canvas.backgroundType}-${canvas.backgroundColor}-${canvas.backgroundImageUrl || 'none'}-${backgroundUpdateKey}`}
            className={`relative bg-white rounded-lg shadow-lg overflow-hidden mx-auto ${isPresentationMode ? 'cursor-default' : 'cursor-crosshair'}`}
            style={{ 
              width: isPresentationMode ? '100vw' : `${canvasDimensions.width}px`,
              height: isPresentationMode ? '100vh' : `${canvasDimensions.height}px`,
              backgroundColor: canvas.backgroundType === 'color' ? canvas.backgroundColor : '#ffffff',
              backgroundImage: (canvas.backgroundType === 'image' && canvas.backgroundImageUrl) ? 
                `url(${canvas.backgroundImageUrl})` : 'none',
              // 배경 제거 시 캐시 방지를 위한 추가 속성들  
              backgroundAttachment: 'initial',
              backgroundSize: canvas.backgroundType === 'image' ? 'contain' : 'initial',
              backgroundPosition: canvas.backgroundType === 'image' ? 'center' : 'initial',
              backgroundRepeat: 'no-repeat',
              // 캐시 무효화를 위한 timestamp 추가
              '--bg-timestamp': backgroundUpdateKey,
            } as React.CSSProperties}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleCanvasClick}
          >
            <div
              className="w-full h-full relative"
              style={{
                transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
                transformOrigin: '0 0',
                width: `${canvasDimensions.width}px`,
                height: `${canvasDimensions.height}px`
              }}
            >
            {canvas.imageUrl && canvas.imageUrl !== '/placeholder.svg' ? (
              <img
                ref={canvasImageRef}
                src={canvas.imageUrl}
                alt={canvas.title}
                className="w-full h-full object-cover"
                style={{ 
                  width: `${canvasDimensions.width}px`,
                  height: `${canvasDimensions.height}px`
                }}
                onLoad={handleImageLoad}
              />
            ) : null}

            {/* Hidden image to detect background image dimensions */}
            {canvas.backgroundType === 'image' && canvas.backgroundImageUrl && (
              <img
                key={`bg-${canvas.backgroundImageUrl}`} // Force re-mount on URL change
                src={canvas.backgroundImageUrl}
                alt="Background dimension detector"
                onLoad={handleImageLoad}
                style={{
                  position: 'absolute',
                  visibility: 'hidden',
                  pointerEvents: 'none',
                  width: '1px',
                  height: '1px',
                }}
              />
            )}

            {(
              canvas.backgroundType === 'color' && canvas.backgroundColor === '#ffffff' && (
                <div 
                  className="w-full h-full flex items-center justify-center text-gray-300"
                  style={{ 
                    width: `${canvasDimensions.width}px`,
                    height: `${canvasDimensions.height}px`
                  }}
                >
                  <div className="text-center">
                    <Image className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium opacity-40">화이트 캔버스</p>
                    <p className="text-sm opacity-30">핀을 추가하려면 클릭하세요</p>
                  </div>
                </div>
              )
            )}
            
            {/* Pins */}
            {getVisiblePins().map((pin) => {
              // 🔧 DYNAMIC CANVAS: 상대 좌표를 동적 캔버스 크기 기준 절대 좌표로 변환
              const absoluteCoords = convertToAbsoluteCoords(
                pin.x, 
                pin.y, 
                canvasDimensions.width, 
                canvasDimensions.height
              );
              
              const pinWithAbsoluteCoords = {
                ...pin,
                x: absoluteCoords.x,
                y: absoluteCoords.y
              };
              
              return (
                <PinRenderer
                  key={pin.id}
                  pin={pinWithAbsoluteCoords}
                  template={pin.template}
                  onClick={() => handlePinClick(pin)}
                  isVisible={true}
                  layerColor={getLayerColor(pin.layerId)}
                  onPositionChange={handlePinPositionChange}
                  canEdit={canEdit && !isPresentationMode}
                  containerWidth={canvasDimensions.width}
                  containerHeight={canvasDimensions.height}
                />
              );
            })}

            {/* Drawing Canvas - render for all visible layers */}
            {layers
              .filter(layer => layer.visible)
              .map((layer) => (
              <div 
                key={`drawing-${layer.id}`}
                style={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: selectedLayerId === layer.id && isDrawingMode ? 'auto' : 'none',
                  zIndex: selectedLayerId === layer.id && isDrawingMode ? 50 : 1
                }}
              >
                <DrawingCanvas
                  key={`canvas-${layer.id}`} // Stable key per layer
                  ref={selectedLayerId === layer.id ? drawingCanvasRef : undefined}
                  canvasId={id || ''}
                  layerId={layer.id}
                  containerRef={canvasContainerRef}
                  tool={selectedLayerId === layer.id ? drawingTool : 'select'}
                  brushSize={brushSize}
                  brushColor={brushColor}
                  lineStyle={lineStyle}
                  zoom={zoom}
                  panX={panX}
                  panY={panY}
                  onDrawingChange={() => {
                    // Drawing change handler - only for selected layer
                  }}
                  onUndoStackChange={selectedLayerId === layer.id ? setUndoStack : undefined}
                  onRedoStackChange={selectedLayerId === layer.id ? setRedoStack : undefined}
                  onDeleteSelected={() => {
                    if (selectedLayerId === layer.id) {
                      drawingCanvasRef.current?.deleteSelected();
                    }
                  }}
                />
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>


      {/* Pin Info Modal */}
      {canvas && (
        <PinInfoModal
          pin={selectedPin}
          isOpen={isPinModalOpen}
          onClose={handlePinModalClose}
          onUpdate={handlePinUpdate}
          onDelete={handlePinDelete}
          layerColor={selectedPin ? getLayerColor(selectedPin.layerId) : '#6b7280'}
          isNewPin={isCreatingNewPin}
          canvasOwnerId={canvas.ownerId}
          allowComments={canvas.allowComments}
          allowLikes={canvas.allowLikes}
          isOwner={isOwner || false}
        />
      )}

      {/* Create Layer Modal */}
      <CreateLayerModal
        isOpen={isCreateLayerModalOpen}
        onClose={() => setIsCreateLayerModalOpen(false)}
        onSubmit={handleCreateLayer}
      />

      {/* Share Canvas Modal */}
      <ShareCanvasModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        canvasId={id || ''}
        canvasTitle={canvas?.title || ''}
      />

      {/* Edit Canvas Name Modal */}
      {canvas && (
        <EditCanvasNameModal
          isOpen={isEditCanvasNameModalOpen}
          onClose={() => setIsEditCanvasNameModalOpen(false)}
          currentName={canvas.title}
          onSubmit={handleCanvasNameUpdate}
        />
      )}

      {/* Edit Layer Name Modal */}
      <EditLayerNameModal
        isOpen={isEditLayerNameModalOpen}
        onClose={() => setIsEditLayerNameModalOpen(false)}
        currentName={layers.find(l => l.id === editingLayerId)?.name || ''}
        onSubmit={handleLayerNameUpdate}
      />

      {/* Layer Duplicate Modal */}
      <LayerDuplicateModal
        isOpen={isDuplicateLayerModalOpen}
        onClose={() => setIsDuplicateLayerModalOpen(false)}
        layerId={duplicatingLayerId}
        layerName={layers.find(l => l.id === duplicatingLayerId)?.name || ''}
        canvasId={id || ''}
      />

      {/* Pin Template Selector Modal */}
      {isPinTemplateSelectorOpen && (
        <PinTemplateSelector
          selectedTemplate={selectedPinTemplate}
          onTemplateSelect={(template) => {
            setSelectedPinTemplate(template);
            setIsPinTemplateSelectorOpen(false);
          }}
          onClose={() => setIsPinTemplateSelectorOpen(false)}
        />
      )}
    </div>
  );
};

export default CanvasView;
