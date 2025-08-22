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
      const newUndoStack = [...undoStack.slice(-9), currentState];
      setUndoStack(newUndoStack);
      setRedoStack([]);
      onUndoStackChange?.(newUndoStack);
      onRedoStackChange?.([]);
    };

    canvas.on('path:created', saveState);
    canvas.on('object:added', saveState);
    canvas.on('object:removed', saveState);
    canvas.on('object:modified', saveState);

    return () => {
      canvas.dispose();
    };
  }, [canvasId, layerId, width, height, undoStack, onUndoStackChange, onRedoStackChange]);

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

    console.log('Setting drawing mode:', tool);
    canvas.isDrawingMode = tool === 'draw' || tool === 'erase';
    
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = brushSize;
      
      if (tool === 'erase') {
        console.log('Configuring eraser mode');
        canvas.freeDrawingBrush.color = 'rgba(255,255,255,1)';
        
        // Override the brush to use destination-out for erasing
        const originalBrush = canvas.freeDrawingBrush;
        const originalOnMouseDown = originalBrush.onMouseDown;
        const originalOnMouseMove = originalBrush.onMouseMove;
        
        originalBrush.onMouseDown = function(pointer: any) {
          const ctx = canvas.getContext();
          ctx.globalCompositeOperation = 'destination-out';
          return originalOnMouseDown.call(this, pointer);
        };
        
        originalBrush.onMouseMove = function(pointer: any) {
          const ctx = canvas.getContext();
          ctx.globalCompositeOperation = 'destination-out';
          return originalOnMouseMove.call(this, pointer);
        };
      } else if (tool === 'draw') {
        console.log('Configuring drawing mode');
        canvas.freeDrawingBrush.color = brushColor;
        
        // Reset brush for normal drawing
        const originalBrush = canvas.freeDrawingBrush;
        const originalOnMouseDown = originalBrush.onMouseDown;
        const originalOnMouseMove = originalBrush.onMouseMove;
        
        originalBrush.onMouseDown = function(pointer: any) {
          const ctx = canvas.getContext();
          ctx.globalCompositeOperation = 'source-over';
          return originalOnMouseDown.call(this, pointer);
        };
        
        originalBrush.onMouseMove = function(pointer: any) {
          const ctx = canvas.getContext();
          ctx.globalCompositeOperation = 'source-over';
          return originalOnMouseMove.call(this, pointer);
        };
        
        // Configure line style
        const dashArray = lineStyle === 'dashed' ? [5, 5] : lineStyle === 'dotted' ? [2, 2] : [];
        (originalBrush as any).strokeDashArray = dashArray;
      }
    }
  }, [tool, brushColor, brushSize, lineStyle]);

  // Auto-save when drawing changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const autoSave = () => {
      setTimeout(() => saveDrawing(), 500); // Debounce auto-save
    };

    canvas.on('path:created', autoSave);

    return () => {
      canvas.off('path:created', autoSave);
    };
  }, [saveDrawing]);

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