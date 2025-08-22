import React, { useState } from 'react';
import { Palette, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CanvasBackgroundSelectorProps {
  canvasId: string;
  currentBackgroundType: 'color' | 'image';
  currentBackgroundColor: string;
  currentBackgroundImageUrl?: string;
  onBackgroundUpdate: (type: 'color' | 'image', color?: string, imageUrl?: string) => void;
}

const CanvasBackgroundSelector = ({
  canvasId,
  currentBackgroundType,
  currentBackgroundColor,
  currentBackgroundImageUrl,
  onBackgroundUpdate,
}: CanvasBackgroundSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(currentBackgroundColor);
  const [imageUrl, setImageUrl] = useState(currentBackgroundImageUrl || '');

  const presetColors = [
    '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1',
    '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b',
    '#fef2f2', '#fee2e2', '#fecaca', '#f87171', '#ef4444',
    '#fef3c7', '#fed7aa', '#fdba74', '#fb923c', '#f97316',
    '#fef3e2', '#fed7d7', '#fde68a', '#facc15', '#eab308',
    '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80',
    '#f0f9ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#3b82f6',
    '#faf5ff', '#f3e8ff', '#e9d5ff', '#c4b5fd', '#8b5cf6'
  ];

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    onBackgroundUpdate('color', color);
    setIsOpen(false);
  };

  const handleImageUrlSubmit = () => {
    if (imageUrl.trim()) {
      onBackgroundUpdate('image', undefined, imageUrl.trim());
      setIsOpen(false);
    }
  };

  const handleRemoveBackground = () => {
    onBackgroundUpdate('color', '#ffffff');
    setImageUrl('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Change Background">
          <Palette className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>캔버스 배경 설정</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="color" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="color" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              단색
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              이미지
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="color" className="space-y-4">
            <div>
              <Label htmlFor="custom-color">사용자 정의 색상</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="custom-color"
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-16 h-10 p-1 border rounded cursor-pointer"
                />
                <Button 
                  onClick={() => handleColorChange(selectedColor)}
                  className="flex-1"
                >
                  적용
                </Button>
              </div>
            </div>
            
            <div>
              <Label>미리 설정된 색상</Label>
              <div className="grid grid-cols-10 gap-2 mt-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="image" className="space-y-4">
            <div>
              <Label htmlFor="image-url">이미지 URL</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Button onClick={handleImageUrlSubmit}>
                  적용
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                이미지 URL을 입력하여 배경으로 설정할 수 있습니다.
              </p>
            </div>
            
            {currentBackgroundImageUrl && (
              <div>
                <Label>현재 배경 이미지</Label>
                <div className="mt-2 p-2 border rounded">
                  <img 
                    src={currentBackgroundImageUrl} 
                    alt="Current background" 
                    className="w-full h-20 object-cover rounded"
                  />
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="mt-2 w-full"
                    onClick={handleRemoveBackground}
                  >
                    배경 제거
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CanvasBackgroundSelector;