import React, { useState } from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LayerColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
}

const LayerColorPicker = ({ currentColor, onColorChange }: LayerColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(currentColor);

  const presetColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#374151'
  ];

  const handleColorSelect = (color: string) => {
    onColorChange(color);
    setIsOpen(false);
  };

  const handleCustomColorApply = () => {
    onColorChange(customColor);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: currentColor }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">색상 선택</Label>
            <div className="grid grid-cols-10 gap-2 mt-2">
              {presetColors.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
          
          <div>
            <Label htmlFor="custom-color" className="text-sm font-medium">
              사용자 정의 색상
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="custom-color"
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-12 h-8 p-1 border rounded cursor-pointer"
              />
              <Button 
                size="sm" 
                onClick={handleCustomColorApply}
                className="flex-1"
              >
                적용
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LayerColorPicker;