import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Pen, 
  Eraser, 
  Undo, 
  Redo, 
  Trash2, 
  MousePointer,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DrawingCanvasProps {
  canvasId: string;
  layerId: string;
  width: number;
  height: number;
  tool: 'select' | 'draw' | 'erase';
  brushSize: number;
  brushColor: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
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
  width,
  height,
  tool,
  brushSize,
  brushColor,
  lineStyle,
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

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: 'transparent',
    });

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

    return () => {
      canvas.dispose();
    };
  }, [canvasId, layerId, width, height, onUndoStackChange, onRedoStackChange]);

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
      // Make all objects selectable
      canvas.getObjects().forEach(obj => {
        obj.selectable = true;
        obj.evented = true;
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
          console.log('Eraser path created, applying destination-out and removing');
          // Set eraser properties and apply immediately
          path.globalCompositeOperation = 'destination-out';
          path.set({
            stroke: 'rgba(0,0,0,1)',
            fill: '',
            selectable: false,
            evented: false,
            excludeFromExport: true
          });
          
          // Render the erasing effect first
          canvas.renderAll();
          
          // Then immediately remove the eraser path so it doesn't remain selectable
          setTimeout(() => {
            canvas.remove(path);
            canvas.renderAll();
          }, 50);
          
        } else {
          // Normal drawing paths
          path.globalCompositeOperation = 'source-over';
          path.set({
            selectable: true,
            evented: true
          });
          canvas.renderAll();
        }
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
      {/* Drawing Canvas - always visible */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-auto"
        style={{ zIndex: 10 }}
      />
    </div>
  );
};