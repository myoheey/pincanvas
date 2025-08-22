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
  Save, 
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
  isVisible: boolean;
  onDrawingChange?: (hasDrawing: boolean) => void;
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
  isVisible,
  onDrawingChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushSize, setBrushSize] = useState(2);
  const [brushColor, setBrushColor] = useState('#000000');
  const [tool, setTool] = useState<'select' | 'draw' | 'erase'>('select');
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
      setUndoStack(prev => [...prev.slice(-9), currentState]);
      setRedoStack([]);
    };

    canvas.on('path:created', saveState);
    canvas.on('object:added', saveState);
    canvas.on('object:removed', saveState);
    canvas.on('object:modified', saveState);

    return () => {
      canvas.dispose();
    };
  }, [canvasId, layerId, width, height]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = tool === 'draw';
    
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = tool === 'erase' ? '#FFFFFF' : brushColor;
      canvas.freeDrawingBrush.width = brushSize;
    }

    setIsDrawingMode(tool === 'draw');
  }, [tool, brushColor, brushSize]);

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
          }, {
            onConflict: 'canvas_id,layer_id'
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
      
      toast({
        title: "저장 완료",
        description: "드로잉이 저장되었습니다.",
      });
    } catch (error) {
      console.error('Error saving drawing:', error);
      toast({
        title: "저장 실패",
        description: "드로잉 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  }, [canvasId, layerId, onDrawingChange, toast]);

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
    <div className={`absolute inset-0 pointer-events-none ${!isVisible ? 'hidden' : ''}`}>
      {/* Drawing Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-auto"
        style={{ zIndex: 10 }}
      />
      
      {/* Drawing Toolbar - only show when visible */}
      {isVisible && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 space-y-4 pointer-events-auto" style={{ zIndex: 20 }}>
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">드로잉 도구</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={tool === 'select' ? 'default' : 'outline'}
              onClick={() => setTool('select')}
            >
              <MousePointer className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === 'draw' ? 'default' : 'outline'}
              onClick={() => setTool('draw')}
            >
              <Pen className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={tool === 'erase' ? 'default' : 'outline'}
              onClick={() => setTool('erase')}
            >
              <Eraser className="w-4 h-4" />
            </Button>
          </div>

          {(tool === 'draw' || tool === 'erase') && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">브러시 크기</label>
              <Slider
                value={[brushSize]}
                onValueChange={(value) => setBrushSize(value[0])}
                max={20}
                min={1}
                step={1}
                className="w-32"
              />
            </div>
          )}

          {tool === 'draw' && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">색상</label>
              <div className="grid grid-cols-5 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 ${
                      brushColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBrushColor(color)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={undo}
              disabled={undoStack.length === 0}
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={redo}
              disabled={redoStack.length === 0}
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={saveDrawing}
            >
              <Save className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={clearCanvas}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};