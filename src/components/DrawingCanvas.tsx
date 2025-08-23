import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DrawingCanvasProps {
  canvasId: string;
  layerId: string;
  containerRef: React.RefObject<HTMLDivElement>;
  tool: 'select' | 'draw' | 'erase';
  brushSize: number;
  brushColor: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  zoom: number;
  panX: number;
  panY: number;
  onDrawingChange?: (hasDrawing: boolean) => void;
  onUndoStackChange?: (stack: string[]) => void;
  onRedoStackChange?: (stack: string[]) => void;
  onDeleteSelected?: () => void;
}

const colors = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'
];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  canvasId,
  layerId,
  containerRef,
  tool,
  brushSize,
  brushColor,
  lineStyle,
  zoom,
  panX,
  panY,
  onDrawingChange,
  onUndoStackChange,
  onRedoStackChange,
  onDeleteSelected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const { toast } = useToast();

  // Initialize and setup canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();
    
    const canvas = new FabricCanvas(canvasRef.current, {
      width: Math.max(width, 1200), // Minimum canvas size
      height: Math.max(height, 800),
      backgroundColor: 'transparent',
    });

    // Enable zoom and pan functionality
    canvas.allowTouchScrolling = true;
    
    // Configure drawing brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushSize;

    fabricCanvasRef.current = canvas;

    // Load existing drawings
    loadDrawings();

    // Save state for undo/redo
    const saveState = () => {
      const currentState = JSON.stringify(canvas.toJSON());
      setUndoStack(prev => {
        const newUndoStack = [...prev.slice(-9), currentState];
        onUndoStackChange?.(newUndoStack);
        return newUndoStack;
      });
      setRedoStack(prev => {
        onRedoStackChange?.([]);
        return [];
      });
    };

    canvas.on('path:created', saveState);
    canvas.on('object:added', saveState);
    canvas.on('object:removed', saveState);
    canvas.on('object:modified', saveState);

    // Handle canvas resize
    const resizeObserver = new ResizeObserver(() => {
      if (container) {
        const { width: newWidth, height: newHeight } = container.getBoundingClientRect();
        canvas.setDimensions({
          width: Math.max(newWidth, 1200),
          height: Math.max(newHeight, 800)
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
    };
  }, [canvasId, layerId, containerRef, onUndoStackChange, onRedoStackChange]);

  // Update viewport transform when zoom/pan changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Apply zoom and pan transformation
    canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
    canvas.renderAll();
  }, [zoom, panX, panY]);

  const loadDrawings = async () => {
    try {
      const { data, error } = await supabase
        .from('drawings')
        .select('drawing_data')
        .eq('canvas_id', canvasId)
        .eq('layer_id', layerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data && fabricCanvasRef.current && data.drawing_data) {
        fabricCanvasRef.current.loadFromJSON(data.drawing_data as any, () => {
          fabricCanvasRef.current?.renderAll();
          onDrawingChange?.(true);
        });
      }
    } catch (error) {
      console.error('Error loading drawings:', error);
    }
  };

  const saveDrawing = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      const drawingData = canvas.toJSON();
      const hasObjects = drawingData.objects && drawingData.objects.length > 0;

      if (hasObjects) {
        const { error } = await supabase
          .from('drawings')
          .upsert({
            canvas_id: canvasId,
            layer_id: layerId,
            drawing_data: drawingData,
          });

        if (error) throw error;
      } else {
        // Remove drawing if canvas is empty
        await supabase
          .from('drawings')
          .delete()
          .eq('canvas_id', canvasId)
          .eq('layer_id', layerId);
      }

      onDrawingChange?.(hasObjects);
    } catch (error) {
      console.error('Error saving drawing:', error);
    }
  }, [canvasId, layerId, onDrawingChange]);

  // Configure drawing tools and styles
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    console.log('Setting drawing mode:', tool, 'brush size:', brushSize, 'color:', brushColor);
    
    // Set drawing mode
    canvas.isDrawingMode = tool === 'draw' || tool === 'erase';
    
    // Enable object selection for all modes
    canvas.selection = true;
    
    if (tool === 'erase') {
      console.log('Configuring eraser mode');
      // Configure brush for erasing
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = 'rgba(255, 255, 255, 1)'; // White color for erasing
      
    } else if (tool === 'draw') {
      console.log('Configuring drawing mode with color:', brushColor);
      // Create fresh brush for normal drawing
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = brushColor;
      
      // Configure line style
      const dashArray = lineStyle === 'dashed' ? [5, 5] : lineStyle === 'dotted' ? [2, 2] : [];
      if (dashArray.length > 0) {
        (canvas.freeDrawingBrush as any).strokeDashArray = dashArray;
      }
      
    } else {
      // Select mode - disable drawing but enable selection
      canvas.isDrawingMode = false;
      canvas.selection = true;
      // Make all objects selectable except eraser paths
      canvas.getObjects().forEach(obj => {
        if (obj.globalCompositeOperation === 'destination-out') {
          // Eraser paths should not be selectable
          obj.selectable = false;
          obj.evented = false;
        } else {
          obj.selectable = true;
          obj.evented = true;
        }
      });
    }
    
    console.log('Brush configured:', {
      width: canvas.freeDrawingBrush?.width,
      color: canvas.freeDrawingBrush?.color,
      tool: tool,
      isDrawingMode: canvas.isDrawingMode
    });
  }, [tool, brushColor, brushSize, lineStyle]);

  // Auto-save and handle eraser functionality
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handlePathCreated = (e: any) => {
      const path = e.path;
      if (path) {
        if (tool === 'erase') {
          console.log('Eraser path created, checking for intersections');
          
          // Get all drawable objects (excluding eraser paths)
          const drawableObjects = canvas.getObjects().filter(obj => 
            obj.globalCompositeOperation !== 'destination-out' && obj !== path
          );
          
          // Check for intersections and remove intersecting objects
          const objectsToRemove = [];
          for (const obj of drawableObjects) {
            if (path.intersectsWithObject(obj)) {
              console.log('Intersection found, marking object for removal');
              objectsToRemove.push(obj);
            }
          }
          
          // Remove intersecting objects
          objectsToRemove.forEach(obj => canvas.remove(obj));
          
          // Remove the eraser path itself
          canvas.remove(path);
          canvas.renderAll();
        } else {
          // Normal drawing paths
          path.globalCompositeOperation = 'source-over';
          path.set({
            selectable: true,
            evented: true
          });
        }
        canvas.renderAll();
      }
      
      // Auto-save after a delay
      setTimeout(() => saveDrawing(), 500);
    };

    canvas.on('path:created', handlePathCreated);

    return () => {
      canvas.off('path:created', handlePathCreated);
    };
  }, [tool, saveDrawing]);

  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = 'transparent';
    canvas.renderAll();
    
    setUndoStack([]);
    setRedoStack([]);
    
    onDrawingChange?.(false);
  };

  const undo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || undoStack.length === 0) return;

    const currentState = JSON.stringify(canvas.toJSON());
    const previousState = undoStack[undoStack.length - 1];
    
    setRedoStack(prev => [currentState, ...prev.slice(0, 9)]);
    setUndoStack(prev => prev.slice(0, -1));
    
    canvas.loadFromJSON(JSON.parse(previousState), () => {
      canvas.renderAll();
    });
  };

  const redo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || redoStack.length === 0) return;

    const currentState = JSON.stringify(canvas.toJSON());
    const nextState = redoStack[0];
    
    setUndoStack(prev => [...prev, currentState].slice(-10));
    setRedoStack(prev => prev.slice(1));
    
    canvas.loadFromJSON(JSON.parse(nextState), () => {
      canvas.renderAll();
    });
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
      
      // Save state for undo/redo
      const currentState = JSON.stringify(canvas.toJSON());
      setUndoStack(prev => {
        const newUndoStack = [...prev.slice(-9), currentState];
        onUndoStackChange?.(newUndoStack);
        return newUndoStack;
      });
      setRedoStack(prev => {
        onRedoStackChange?.([]);
        return [];
      });
      
      // Auto-save
      setTimeout(() => saveDrawing(), 100);
    }
  };

  // Handle keyboard shortcuts and expose delete function
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Expose deleteSelected function to parent
    if (onDeleteSelected) {
      (window as any).deleteSelectedDrawing = deleteSelected;
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if ((window as any).deleteSelectedDrawing) {
        delete (window as any).deleteSelectedDrawing;
      }
    };
  }, [onDeleteSelected]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Drawing Canvas - responsive to container */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-auto"
        style={{ zIndex: 10 }}
      />
    </div>
  );
};