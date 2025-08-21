import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Grid, LogOut, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CanvasGrid } from './CanvasGrid';
import { CreateCanvasModal } from './CreateCanvasModal';
import { ShareCanvasModal } from './ShareCanvasModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Canvas {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
  owner_id: string;
  pinCount?: number;
  layerCount?: number;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [shareModalCanvasId, setShareModalCanvasId] = useState<string | null>(null);
  const [shareModalCanvasTitle, setShareModalCanvasTitle] = useState('');
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'pins'>('date');
  const [isLoading, setIsLoading] = useState(true);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCanvases();
    }
  }, [user]);

  const fetchCanvases = async () => {
    try {
      const { data, error } = await supabase
        .from('canvases')
        .select('*')
        .order('created_at', { ascending: false });

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
    setIsLoading(false);
  };

  const handleCreateCanvas = async (formData: any) => {
    if (!user) return;

    try {
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
        setIsCreateModalOpen(false);
        return;
      }

      const { data, error } = await supabase
        .from('canvases')
        .insert({
          title: formData.title,
          image_url: formData.imagePreview || null,
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Create default layer only (no pins)
      if (data) {
        const { error: layerError } = await supabase.from('layers').insert([
          {
            name: '제목없는 레이어',
            color: '#3b82f6',
            canvas_id: data.id,
            visible: true
          }
        ]);

        if (layerError) {
          console.error('Error creating default layer:', layerError);
          throw layerError;
        }

        toast({
          title: "캔버스 생성 완료",
          description: "새 캔버스가 생성되었습니다.",
        });

        fetchCanvases();
      }
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleShare = (canvasId: string, canvasTitle: string) => {
    setShareModalCanvasId(canvasId);
    setShareModalCanvasTitle(canvasTitle);
  };

  if (loading || (user && isLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const filteredCanvases = canvases.filter(canvas =>
    canvas.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                  PinCanvas
                </h1>
                <p className="text-muted-foreground">이미지 위에 정보를 정리하고 관리하세요</p>
              </div>
              {user && (
                <Badge variant="outline" className="ml-4">
                  {user.email}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="gradient-primary text-white border-0 hover:scale-105 transition-transform"
              >
                <Plus className="w-4 h-4 mr-2" />
                새 캔버스
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
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
        <CanvasGrid 
          searchQuery={searchTerm} 
          sortBy={sortBy} 
          canvases={filteredCanvases}
          onShare={handleShare}
        />
      </main>

      {/* Create Canvas Modal */}
      <CreateCanvasModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCanvas}
      />

      {/* Share Canvas Modal */}
      {shareModalCanvasId && (
        <ShareCanvasModal
          isOpen={!!shareModalCanvasId}
          onClose={() => setShareModalCanvasId(null)}
          canvasId={shareModalCanvasId}
          canvasTitle={shareModalCanvasTitle}
        />
      )}
    </div>
  );
};
