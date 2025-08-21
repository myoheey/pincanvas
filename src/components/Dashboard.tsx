import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CanvasGrid } from './CanvasGrid';
import { CreateCanvasModal } from './CreateCanvasModal';

interface Canvas {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: Date;
  pinCount: number;
  layerCount: number;
}

export const Dashboard: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'pins'>('date');

  useEffect(() => {
    // 로컬 스토리지에서 캔버스 목록 불러오기
    const savedCanvases = localStorage.getItem('pincanvas_canvases');
    if (savedCanvases) {
      const parsedCanvases = JSON.parse(savedCanvases).map((canvas: any) => ({
        ...canvas,
        createdAt: new Date(canvas.createdAt)
      }));
      setCanvases(parsedCanvases);
    } else {
      // 초기 더미 데이터
      const initialCanvases: Canvas[] = [
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
          createdAt: new Date('2024-01-10'),
          pinCount: 8,
          layerCount: 2,
        },
      ];
      setCanvases(initialCanvases);
      localStorage.setItem('pincanvas_canvases', JSON.stringify(initialCanvases));
    }
  }, []);

  const handleCreateCanvas = (formData: any) => {
    const newCanvas: Canvas = {
      id: Date.now().toString(),
      title: formData.title,
      imageUrl: formData.imageUrl || '/placeholder.svg',
      createdAt: new Date(),
      pinCount: 0,
      layerCount: 0,
    };

    const updatedCanvases = [newCanvas, ...canvases];
    setCanvases(updatedCanvases);
    
    // 로컬 스토리지에 저장
    localStorage.setItem('pincanvas_canvases', JSON.stringify(updatedCanvases));
    
    setIsCreateModalOpen(false);
  };

  const filteredCanvases = canvases.filter(canvas =>
    canvas.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                PinCanvas
              </h1>
              <p className="text-muted-foreground">이미지 위에 정보를 정리하고 관리하세요</p>
            </div>
            
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="gradient-primary text-white border-0 hover:scale-105 transition-transform"
            >
              <Plus className="w-4 h-4 mr-2" />
              새 캔버스
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="캔버스 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Grid className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              총 {filteredCanvases.length}개의 캔버스
            </p>
          </div>
        </div>

        {/* Canvas Grid */}
        <CanvasGrid searchQuery={searchTerm} sortBy={sortBy} />
      </main>

      {/* Create Canvas Modal */}
      <CreateCanvasModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCanvas}
      />
    </div>
  );
};
