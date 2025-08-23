import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Share, Copy, Globe, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ShareData {
  id: string;
  shared_with_email: string;
  permission: 'viewer' | 'editor';
  created_at: string;
}

interface ShareCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string;
  canvasTitle: string;
}

export const ShareCanvasModal: React.FC<ShareCanvasModalProps> = ({ 
  isOpen, 
  onClose, 
  canvasId,
  canvasTitle 
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer');
  const [shares, setShares] = useState<ShareData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [publicPermission, setPublicPermission] = useState<'viewer' | 'editor'>('viewer');
  const [isUpdatingPublic, setIsUpdatingPublic] = useState(false);

  const shareUrl = `${window.location.origin}/canvas/${canvasId}`;

  useEffect(() => {
    if (isOpen) {
      fetchShares();
      fetchCanvasPublicStatus();
    }
  }, [isOpen, canvasId]);

  const fetchCanvasPublicStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('canvases')
        .select('is_public, public_permission')
        .eq('id', canvasId)
        .single();

      if (error) throw error;
      setIsPublic(data?.is_public || false);
      setPublicPermission((data?.public_permission as 'viewer' | 'editor') || 'viewer');
    } catch (error) {
      console.error('Error fetching canvas public status:', error);
    }
  };

  const fetchShares = async () => {
    try {
      const { data, error } = await supabase
        .from('canvas_shares')
        .select('*')
        .eq('canvas_id', canvasId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShares((data || []).map(share => ({
        ...share,
        permission: share.permission as 'viewer' | 'editor'
      })));
    } catch (error) {
      console.error('Error fetching shares:', error);
      toast({
        title: "오류",
        description: "공유 목록을 불러올 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('canvas_shares')
        .insert({
          canvas_id: canvasId,
          shared_with_email: email,
          permission: permission,
          shared_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "이미 공유됨",
            description: "해당 이메일로 이미 공유되었습니다.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "공유 완료",
          description: `${email}에게 캔버스를 공유했습니다.`,
        });
        setEmail('');
        fetchShares();
      }
    } catch (error) {
      console.error('Error sharing canvas:', error);
      toast({
        title: "공유 실패",
        description: "캔버스 공유 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('canvas_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: "공유 해제",
        description: "공유가 해제되었습니다.",
      });
      fetchShares();
    } catch (error) {
      console.error('Error removing share:', error);
      toast({
        title: "오류",
        description: "공유 해제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "링크 복사됨",
      description: "공유 링크가 클립보드에 복사되었습니다.",
    });
  };

  const handlePublicPermissionChange = async (permission: 'viewer' | 'editor') => {
    try {
      const { error } = await supabase
        .from('canvases')
        .update({ public_permission: permission })
        .eq('id', canvasId);

      if (error) throw error;
      setPublicPermission(permission);
      toast({
        title: "공개 권한 변경됨",
        description: `공개 권한이 ${permission === 'viewer' ? '뷰어' : '편집자'}로 설정되었습니다.`,
      });
    } catch (error) {
      console.error('Error updating public permission:', error);
      toast({
        title: "오류",
        description: "공개 권한 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handlePublicToggle = async (checked: boolean) => {
    setIsUpdatingPublic(true);
    try {
      const { error } = await supabase
        .from('canvases')
        .update({ is_public: checked })
        .eq('id', canvasId);

      if (error) throw error;

      setIsPublic(checked);
      toast({
        title: checked ? "캔버스 공개됨" : "캔버스 비공개됨",
        description: checked 
          ? "이제 누구나 링크로 캔버스에 접근할 수 있습니다."
          : "캔버스가 비공개로 설정되었습니다.",
      });
    } catch (error) {
      console.error('Error updating canvas public status:', error);
      toast({
        title: "오류",
        description: "공개 설정 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
    setIsUpdatingPublic(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Share className="w-5 h-5 mr-2" />
            캔버스 공유
          </DialogTitle>
          <DialogDescription>
            다른 사람들과 "{canvasTitle}" 캔버스를 공유하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Public/Private Toggle */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">공개 설정</Label>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                {isPublic ? (
                  <Globe className="w-5 h-5 text-green-600" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-600" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {isPublic ? "공개 캔버스" : "비공개 캔버스"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isPublic 
                      ? "링크를 아는 누구나 접근할 수 있습니다" 
                      : "초대받은 사용자만 접근할 수 있습니다"}
                  </p>
                </div>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={handlePublicToggle}
                disabled={isUpdatingPublic}
              />
            </div>
          </div>

          {/* Share via link - Only show when public */}
          {isPublic && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">링크로 공유</Label>
              
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm">공개 권한:</Label>
                <Select
                  value={publicPermission}
                  onValueChange={handlePublicPermissionChange}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">뷰어 (보기만 가능)</SelectItem>
                    <SelectItem value="editor">편집자 (로그인 없이도 편집 가능)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Input 
                  value={shareUrl} 
                  readOnly 
                  className="flex-1 text-sm"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={copyShareUrl}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              {publicPermission === 'editor' && (
                <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                  💡 편집자 권한으로 설정되어 있어, 링크를 받은 사람은 로그인 없이도 캔버스를 편집할 수 있습니다.
                </div>
              )}
            </div>
          )}

          {/* Share via email */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">이메일로 공유</Label>
            <form onSubmit={handleShare} className="space-y-3">
              <div className="flex items-center space-x-2">
                <Input
                  type="email"
                  placeholder="이메일 주소"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={permission} onValueChange={(value: 'viewer' | 'editor') => setPermission(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">뷰어</SelectItem>
                    <SelectItem value="editor">편집자</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!email || isLoading}
              >
                {isLoading ? '공유 중...' : '공유하기'}
              </Button>
            </form>
          </div>

          {/* Current shares */}
          {shares.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">공유된 사용자</Label>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{share.shared_with_email}</span>
                      <Badge variant={share.permission === 'editor' ? 'default' : 'secondary'}>
                        {share.permission === 'editor' ? '편집자' : '뷰어'}
                      </Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-red-500 hover:text-red-700"
                      onClick={() => handleRemoveShare(share.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};