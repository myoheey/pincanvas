import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CanvasSettingsModalProps {
  canvasId: string;
  allowComments: boolean;
  allowLikes: boolean;
  onSettingsUpdate: (settings: { allow_comments: boolean; allow_likes: boolean }) => void;
}

export const CanvasSettingsModal: React.FC<CanvasSettingsModalProps> = ({
  canvasId,
  allowComments,
  allowLikes,
  onSettingsUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localAllowComments, setLocalAllowComments] = useState(allowComments);
  const [localAllowLikes, setLocalAllowLikes] = useState(allowLikes);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalAllowComments(allowComments);
    setLocalAllowLikes(allowLikes);
  }, [allowComments, allowLikes]);

  const handleSave = async () => {
    setLoading(true);

    const { error } = await supabase
      .from('canvases')
      .update({
        allow_comments: localAllowComments,
        allow_likes: localAllowLikes,
      })
      .eq('id', canvasId);

    if (error) {
      console.error('Error updating canvas settings:', error);
      toast({
        title: "오류",
        description: "설정을 저장하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } else {
      onSettingsUpdate({
        allow_comments: localAllowComments,
        allow_likes: localAllowLikes,
      });
      toast({
        title: "설정 저장됨",
        description: "캔버스 설정이 성공적으로 저장되었습니다.",
      });
      setIsOpen(false);
    }

    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          설정
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>캔버스 설정</DialogTitle>
        </DialogHeader>
        
        <Card className="p-4 space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-comments" className="text-sm font-medium">
                댓글 허용
              </Label>
              <Switch
                id="allow-comments"
                checked={localAllowComments}
                onCheckedChange={setLocalAllowComments}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-likes" className="text-sm font-medium">
                좋아요 허용
              </Label>
              <Switch
                id="allow-likes"
                checked={localAllowLikes}
                onCheckedChange={setLocalAllowLikes}
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
            >
              저장
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
};