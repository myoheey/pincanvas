import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Pen, 
  Eraser, 
  Undo, 
  Redo, 
  Trash2, 
  MousePointer
} from 'lucide-react';

interface DrawingToolbarProps {
  tool: 'select' | 'draw' | 'erase';
  setTool: (tool: 'select' | 'draw' | 'erase') => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  setLineStyle: (style: 'solid' | 'dashed' | 'dotted') => void;
  undoStack: string[];
  redoStack: string[];
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  isVisible: boolean;
}

const colors = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'
];

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  tool,
  setTool,
  brushSize,
  setBrushSize,
  brushColor,
  setBrushColor,
  lineStyle,
  setLineStyle,
  undoStack,
  redoStack,
  undo,
  redo,
  clearCanvas,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 space-y-4 pointer-events-auto z-30">
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

      {tool === 'draw' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">선 종류</label>
          <div className="flex space-x-1">
            {[
              { key: 'solid', label: '실선' },
              { key: 'dashed', label: '점선' },
              { key: 'dotted', label: '점선2' }
            ].map((style) => (
              <Button
                key={style.key}
                size="sm"
                variant={lineStyle === style.key ? 'default' : 'outline'}
                onClick={() => setLineStyle(style.key as 'solid' | 'dashed' | 'dotted')}
                className="text-xs px-2 py-1"
              >
                {style.label}
              </Button>
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
          variant="destructive"
          onClick={clearCanvas}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};