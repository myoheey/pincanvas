
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Pin, Layers, MoreVertical, Edit, Trash2, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateCanvasModal } from './CreateCanvasModal';
import { EditCanvasNameModal } from './EditCanvasNameModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Canvas {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
  owner_id: string;
  ownerName?: string;
  pinCount?: number;
  layerCount?: number;
}

interface CanvasGridProps {
  searchQuery: string;
  sortBy: 'date' | 'name' | 'pins';
  canvases: Canvas[];
  onShare: (canvasId: string, canvasTitle: string) => void;
  showOwner?: boolean;
  showCreateCard?: boolean;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ 
  searchQuery, 
  sortBy, 
  canvases, 
  onShare, 
  showOwner = false, 
  showCreateCard = true 
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteCanvasId, setDeleteCanvasId] = useState<string | null>(null);
  const [editCanvasId, setEditCanvasId] = useState<string | null>(null);
  const [editCanvasName, setEditCanvasName] = useState('');

  const filteredAndSortedCanvases = canvases
    .filter(canvas => 
      canvas.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'pins':
          return (b.pinCount || 0) - (a.pinCount || 0);
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const handleCreateCanvas = async (canvasData: { title: string; imageUrl?: string }) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      // Check canvas limit (10 per user)
      const { count, error: countError } = await supabase
        .from('canvases')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      if (countError) throw countError;

      if (count && count >= 10) {
        toast({
          title: "캔버스 개수 제한",
          description: "한 계정당 최대 10개의 캔버스만 생성할 수 있습니다.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('canvases')
        .insert({
          title: canvasData.title,
          image_url: canvasData.imageUrl || null,
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Create default layer only (no pins)
      if (data) {
        await supabase.from('layers').insert([
          {
            name: '제목없는 레이어',
            color: '#3b82f6',
            canvas_id: data.id
          }
        ]);
      }

      toast({
        title: "캔버스 생성 완료",
        description: "새 캔버스가 생성되었습니다.",
      });

      // Refresh the parent component
      window.location.reload();
    } catch (error) {
      console.error('Error creating canvas:', error);
      toast({
        title: "생성 실패",
        description: "캔버스 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
    setIsCreateModalOpen(false);
  };

  const handleDeleteCanvas = async (canvasId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        toast({
          title: "권한 없음",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('canvases')
        .delete()
        .eq('id', canvasId)
        .eq('owner_id', user.id);

      if (error) throw error;

      toast({
        title: "캔버스 삭제 완료",
        description: "캔버스가 삭제되었습니다.",
      });

      // Refresh the parent component
      window.location.reload();
    } catch (error) {
      console.error('Error deleting canvas:', error);
      toast({
        title: "삭제 실패",
        description: "캔버스 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
    setDeleteCanvasId(null);
  };

  const handleEditCanvasName = (canvasId: string, currentName: string) => {
    setEditCanvasId(canvasId);
    setEditCanvasName(currentName);
  };

  const handleCanvasNameUpdate = async (newName: string) => {
    if (!editCanvasId) return;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        toast({
          title: "권한 없음",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('canvases')
        .update({ title: newName })
        .eq('id', editCanvasId)
        .eq('owner_id', user.id);

      if (error) throw error;

      toast({
        title: "캔버스 이름 수정 완료",
        description: "캔버스 이름이 변경되었습니다.",
      });

      // Refresh the parent component
      window.location.reload();
    } catch (error) {
      console.error('Error updating canvas name:', error);
      toast({
        title: "수정 실패",
        description: "캔버스 이름 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
    
    setEditCanvasId(null);
    setEditCanvasName('');
  };

  const handleCanvasClick = (canvasId: string) => {
    navigate(`/canvas/${canvasId}`);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create New Canvas Card */}
        {showCreateCard && (
          <Card 
            className="border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer transition-colors group"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <CardContent className="flex flex-col items-center justify-center h-48 text-gray-500 group-hover:text-gray-600">
              <Plus className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">새 캔버스 만들기</p>
              <p className="text-sm text-center mt-2">이미지를 업로드하거나<br />빈 캔버스를 시작하세요</p>
            </CardContent>
          </Card>
        )}

        {/* Existing Canvases */}
        {filteredAndSortedCanvases.map((canvas) => (
          <ContextMenu key={canvas.id}>
            <ContextMenuTrigger>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow group relative">
                <div className="relative">
                  <img
                    src={canvas.image_url || '/placeholder.svg'}
                    alt={canvas.title}
                    className="w-full h-32 object-cover rounded-t-lg"
                    onClick={() => handleCanvasClick(canvas.id)}
                  />
                  {/* 삼점 메뉴 버튼 */}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 bg-white/80 hover:bg-white/90 backdrop-blur-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCanvasClick(canvas.id)}>
                        <Edit className="w-4 h-4 mr-2" />
                        열기
                      </DropdownMenuItem>
                      {!showOwner && (
                        <DropdownMenuItem onClick={() => handleEditCanvasName(canvas.id, canvas.title)}>
                          <Edit className="w-4 h-4 mr-2" />
                          이름 수정
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onShare(canvas.id, canvas.title)}>
                        <Share className="w-4 h-4 mr-2" />
                        공유
                      </DropdownMenuItem>
                      {!showOwner && (
                        <DropdownMenuItem 
                          onClick={() => setDeleteCanvasId(canvas.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardHeader className="pb-2" onClick={() => handleCanvasClick(canvas.id)}>
                  <CardTitle className="text-lg">{canvas.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0" onClick={() => handleCanvasClick(canvas.id)}>
                  {showOwner && canvas.ownerName && (
                    <div className="text-xs text-muted-foreground mb-2">
                      {canvas.ownerName}님의 캔버스
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Pin className="w-4 h-4" />
                        <span>{canvas.pinCount || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Layers className="w-4 h-4" />
                        <span>{canvas.layerCount || 1}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(canvas.created_at)}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      캔버스
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => handleCanvasClick(canvas.id)}>
                <Edit className="w-4 h-4 mr-2" />
                열기
              </ContextMenuItem>
              {!showOwner && (
                <ContextMenuItem onClick={() => handleEditCanvasName(canvas.id, canvas.title)}>
                  <Edit className="w-4 h-4 mr-2" />
                  이름 수정
                </ContextMenuItem>
              )}
              <ContextMenuItem onClick={() => onShare(canvas.id, canvas.title)}>
                <Share className="w-4 h-4 mr-2" />
                공유
              </ContextMenuItem>
              {!showOwner && (
                <ContextMenuItem 
                  onClick={() => setDeleteCanvasId(canvas.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>

      {/* Create Canvas Modal */}
      <CreateCanvasModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCanvas}
      />

      {/* Edit Canvas Name Modal */}
      <EditCanvasNameModal
        isOpen={!!editCanvasId}
        onClose={() => {
          setEditCanvasId(null);
          setEditCanvasName('');
        }}
        currentName={editCanvasName}
        onSubmit={handleCanvasNameUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCanvasId} onOpenChange={() => setDeleteCanvasId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>캔버스 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 캔버스와 모든 핀, 레이어 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteCanvasId && handleDeleteCanvas(deleteCanvasId)}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
