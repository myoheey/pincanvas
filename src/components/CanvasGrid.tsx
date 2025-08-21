
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Pin, Layers, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateCanvasModal } from './CreateCanvasModal';
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
  imageUrl: string;
  createdAt: Date;
  pinCount: number;
  layerCount: number;
}

interface CanvasGridProps {
  searchQuery: string;
  sortBy: 'date' | 'name' | 'pins';
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({ searchQuery, sortBy }) => {
  const navigate = useNavigate();
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteCanvasId, setDeleteCanvasId] = useState<string | null>(null);

  useEffect(() => {
    // 로컬 스토리지에서 캔버스 데이터 로드
    const savedCanvases = localStorage.getItem('pincanvas_canvases');
    if (savedCanvases) {
      const parsedCanvases = JSON.parse(savedCanvases).map((canvas: any) => ({
        ...canvas,
        createdAt: new Date(canvas.createdAt)
      }));
      setCanvases(parsedCanvases);
    } else {
      // 기본 데이터
      const defaultCanvases: Canvas[] = [
        {
          id: '1',
          title: '서울 여행 계획',
          imageUrl: '/placeholder.svg',
          createdAt: new Date('2024-01-15'),
          pinCount: 12,
          layerCount: 3,
        },
        {
          id: '2',
          title: '프로젝트 기획서',
          imageUrl: '/placeholder.svg',
          createdAt: new Date('2024-01-20'),
          pinCount: 8,
          layerCount: 2,
        },
      ];
      setCanvases(defaultCanvases);
      localStorage.setItem('pincanvas_canvases', JSON.stringify(defaultCanvases));
    }
  }, []);

  const filteredAndSortedCanvases = canvases
    .filter(canvas => 
      canvas.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'pins':
          return b.pinCount - a.pinCount;
        case 'date':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

  const handleCreateCanvas = (canvasData: Omit<Canvas, 'id' | 'createdAt' | 'pinCount' | 'layerCount'>) => {
    const newCanvas: Canvas = {
      ...canvasData,
      id: Date.now().toString(),
      createdAt: new Date(),
      pinCount: 0,
      layerCount: 1,
    };

    const updatedCanvases = [...canvases, newCanvas];
    setCanvases(updatedCanvases);
    localStorage.setItem('pincanvas_canvases', JSON.stringify(updatedCanvases));
  };

  const handleDeleteCanvas = (canvasId: string) => {
    const updatedCanvases = canvases.filter(canvas => canvas.id !== canvasId);
    setCanvases(updatedCanvases);
    localStorage.setItem('pincanvas_canvases', JSON.stringify(updatedCanvases));
    
    // 관련 레이어와 핀 데이터도 삭제
    localStorage.removeItem(`pincanvas_layers_${canvasId}`);
    localStorage.removeItem(`pincanvas_pins_${canvasId}`);
    
    setDeleteCanvasId(null);
  };

  const handleCanvasClick = (canvasId: string) => {
    navigate(`/canvas/${canvasId}`);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create New Canvas Card */}
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

        {/* Existing Canvases */}
        {filteredAndSortedCanvases.map((canvas) => (
          <ContextMenu key={canvas.id}>
            <ContextMenuTrigger>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow group relative">
                <div className="relative">
                  <img
                    src={canvas.imageUrl}
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
                        <DropdownMenuItem 
                          onClick={() => setDeleteCanvasId(canvas.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardHeader className="pb-2" onClick={() => handleCanvasClick(canvas.id)}>
                  <CardTitle className="text-lg">{canvas.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0" onClick={() => handleCanvasClick(canvas.id)}>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Pin className="w-4 h-4" />
                        <span>{canvas.pinCount}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Layers className="w-4 h-4" />
                        <span>{canvas.layerCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(canvas.createdAt)}</span>
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
              <ContextMenuItem 
                onClick={() => setDeleteCanvasId(canvas.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </ContextMenuItem>
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
