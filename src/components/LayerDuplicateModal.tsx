import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Canvas {
  id: string;
  title: string;
}

interface LayerDuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  layerId: string;
  layerName: string;
  canvasId: string;
}

export const LayerDuplicateModal: React.FC<LayerDuplicateModalProps> = ({
  isOpen,
  onClose,
  layerId,
  layerName,
  canvasId,
}) => {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [selectedCanvasId, setSelectedCanvasId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user) {
      fetchUserCanvases();
    }
  }, [isOpen, user]);

  const fetchUserCanvases = async () => {
    try {
      const { data, error } = await supabase
        .from('canvases')
        .select('id, title')
        .eq('owner_id', user?.id)
        .neq('id', canvasId) // 현재 캔버스 제외
        .order('title');

      if (error) throw error;

      setCanvases(data || []);
    } catch (error) {
      console.error('Error fetching canvases:', error);
      toast({
        title: "오류",
        description: "캔버스 목록을 불러올 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async () => {
    if (!selectedCanvasId) {
      toast({
        title: "캔버스 선택",
        description: "복제할 캔버스를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // 1. 레이어 정보 가져오기
      const { data: layerData, error: layerError } = await supabase
        .from('layers')
        .select('*')
        .eq('id', layerId)
        .single();

      if (layerError) throw layerError;

      // 2. 새 레이어 생성
      const { data: newLayer, error: newLayerError } = await supabase
        .from('layers')
        .insert({
          name: `${layerData.name} (복사본)`,
          color: layerData.color,
          canvas_id: selectedCanvasId,
          visible: layerData.visible,
          locked: layerData.locked,
        })
        .select()
        .single();

      if (newLayerError) throw newLayerError;

      // 3. 핀 복사
      const { data: pins, error: pinsError } = await supabase
        .from('pins')
        .select('*')
        .eq('layer_id', layerId);

      if (pinsError) throw pinsError;

      if (pins && pins.length > 0) {
        const newPins = pins.map(pin => ({
          title: pin.title,
          description: pin.description,
          x: pin.x,
          y: pin.y,
          canvas_id: selectedCanvasId,
          layer_id: newLayer.id,
          template_id: pin.template_id,
        }));

        const { error: insertPinsError } = await supabase
          .from('pins')
          .insert(newPins);

        if (insertPinsError) throw insertPinsError;
      }

      // 4. 드로잉 데이터 복사
      const { data: drawings, error: drawingsError } = await supabase
        .from('drawings')
        .select('*')
        .eq('layer_id', layerId);

      if (drawingsError) throw drawingsError;

      if (drawings && drawings.length > 0) {
        const newDrawings = drawings.map(drawing => ({
          canvas_id: selectedCanvasId,
          layer_id: newLayer.id,
          drawing_data: drawing.drawing_data,
        }));

        const { error: insertDrawingsError } = await supabase
          .from('drawings')
          .insert(newDrawings);

        if (insertDrawingsError) throw insertDrawingsError;
      }

      toast({
        title: "복제 완료",
        description: `레이어 "${layerName}"가 성공적으로 복제되었습니다.`,
      });

      onClose();
    } catch (error) {
      console.error('Error duplicating layer:', error);
      toast({
        title: "복제 실패",
        description: "레이어 복제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>레이어 복제</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              레이어 "{layerName}"를 다른 캔버스로 복제합니다.
            </p>
            <p className="text-xs text-muted-foreground">
              핀과 드로잉 데이터가 모두 복사됩니다.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">대상 캔버스</label>
            <Select value={selectedCanvasId} onValueChange={setSelectedCanvasId}>
              <SelectTrigger>
                <SelectValue placeholder="캔버스를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {canvases.map(canvas => (
                  <SelectItem key={canvas.id} value={canvas.id}>
                    {canvas.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              취소
            </Button>
            <Button onClick={handleDuplicate} disabled={isLoading || !selectedCanvasId}>
              {isLoading ? "복제 중..." : "복제"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};