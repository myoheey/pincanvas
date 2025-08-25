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
  lineStyle: 'solid' | 'dashed';
  setLineStyle: (style: 'solid' | 'dashed') => void;
  undoStack: string[];
  redoStack: string[];
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  deleteSelected?: () => void;
  isVisible: boolean;
}

const colors = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
  // 하이라이트 색상 추가
  '#FFFF00AA', '#00FF00AA', '#FF00FFAA', '#00FFFF55', '#FFA50055'
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
  deleteSelected,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-4 bg-white rounded-lg shadow-sm border p-3">
      {/* Tool Selection */}
      <div className="flex items-center gap-2">
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

      {/* Brush Size */}
      {(tool === 'draw' || tool === 'erase') && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700 whitespace-nowrap">브러시 크기</label>
          <Slider
            value={[brushSize]}
            onValueChange={(value) => setBrushSize(value[0])}
            max={20}
            min={1}
            step={1}
            className="w-20"
          />
          <span className="text-xs text-gray-500 w-6">{brushSize}</span>
        </div>
      )}

      {/* Color Selection */}
      {tool === 'draw' && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700">색상</label>
          <div className="flex gap-1">
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

      {/* Line Style */}
      {tool === 'draw' && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700">선 종류</label>
          <div className="flex gap-1">
            {[
              { key: 'solid', label: '실선' },
              { key: 'dashed', label: '점선' }
            ].map((style) => (
              <Button
                key={style.key}
                size="sm"
                variant={lineStyle === style.key ? 'default' : 'outline'}
                onClick={() => setLineStyle(style.key as 'solid' | 'dashed')}
                className="text-xs px-2 py-1"
              >
                {style.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-l pl-4">
        <Button
          size="sm"
          variant="outline"
          onClick={undo}
          disabled={undoStack.length <= 1}
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

      {/* Delete Selected Only */}
      {tool === 'select' && deleteSelected && (
        <div className="border-l pl-4">
          <Button
            size="sm"
            variant="outline"
            onClick={deleteSelected}
            title="선택된 객체 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};