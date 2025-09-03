import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Grid, LogOut, Share, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ownerName?: string;
  pinCount?: number;
  layerCount?: number;
  background_type?: 'color' | 'image';
  background_image_url?: string;
  background_color?: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [shareModalCanvasId, setShareModalCanvasId] = useState<string | null>(null);
  const [shareModalCanvasTitle, setShareModalCanvasTitle] = useState('');
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [sharedCanvases, setSharedCanvases] = useState<Canvas[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'pins'>('date');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'owned' | 'shared'>('owned');

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCanvases();
      fetchSharedCanvases();
    }
  }, [user]);

  const fetchCanvases = async () => {
    try {
      const { data, error } = await supabase
        .from('canvases')
        .select('*, background_type, background_image_url, background_color')
        .eq('owner_id', user?.id)
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

  const fetchSharedCanvases = async () => {
    try {
      const { data: shareData, error } = await supabase
        .from('canvas_shares')
        .select(`
          canvas_id,
          canvases!inner (
            id,
            title,
            image_url,
            created_at,
            owner_id,
            background_type,
            background_image_url,
            background_color
          )
        `)
        .eq('shared_with_email', user?.email);

      if (error) throw error;

      // 각 공유된 캔버스의 소유자 이름을 가져옴
      const sharedCanvasData = [];
      for (const share of shareData || []) {
        const canvas = share.canvases as any;
        
        // 소유자 프로필 가져오기
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', canvas.owner_id)
          .single();

        sharedCanvasData.push({
          id: canvas.id,
          title: canvas.title,
          image_url: canvas.image_url,
          created_at: canvas.created_at,
          owner_id: canvas.owner_id,
          ownerName: profileData?.full_name || '알 수 없는 사용자',
          pinCount: 0,
          layerCount: 0,
          background_type: canvas.background_type,
          background_image_url: canvas.background_image_url,
          background_color: canvas.background_color,
        });
      }

      setSharedCanvases(sharedCanvasData);
    } catch (error) {
      console.error('Error fetching shared canvases:', error);
    }
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

  const filteredSharedCanvases = sharedCanvases.filter(canvas =>
    canvas.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentCanvases = activeTab === 'owned' ? filteredCanvases : filteredSharedCanvases;

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
                onClick={() => navigate('/profile')}
              >
                <User className="w-4 h-4 mr-2" />
                프로필
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
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
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
          </div>

        {/* Canvas Tabs and Grid */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'owned' | 'shared')}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="owned">
                내 캔버스 ({filteredCanvases.length})
              </TabsTrigger>
              <TabsTrigger value="shared">
                공유받은 캔버스 ({filteredSharedCanvases.length})
              </TabsTrigger>
            </TabsList>
            
            <p className="text-muted-foreground">
              총 {currentCanvases.length}개의 캔버스
            </p>
          </div>

          <TabsContent value="owned">
            <CanvasGrid 
              searchQuery={searchTerm} 
              sortBy={sortBy} 
              canvases={filteredCanvases}
              onShare={handleShare}
              showOwner={false}
              showCreateCard={true}
            />
          </TabsContent>

          <TabsContent value="shared">
            <CanvasGrid 
              searchQuery={searchTerm} 
              sortBy={sortBy} 
              canvases={filteredSharedCanvases}
              onShare={handleShare}
              showOwner={true}
              showCreateCard={false}
            />
          </TabsContent>
        </Tabs>
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
