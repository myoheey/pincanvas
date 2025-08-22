import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Eye, EyeOff, Edit, Trash2, Layers, Pin, Image, Presentation, X, Share, Lock, Unlock, Palette, Pen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { PinInfoModal } from '@/components/PinInfoModal';
import { CreateLayerModal } from '@/components/CreateLayerModal';
import { ShareCanvasModal } from '@/components/ShareCanvasModal';
import { CanvasSettingsModal } from '@/components/CanvasSettingsModal';
import { EditCanvasNameModal } from '@/components/EditCanvasNameModal';
import { EditLayerNameModal } from '@/components/EditLayerNameModal';
import { PinTemplateSelector } from '@/components/PinTemplateSelector';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import { PinRenderer } from '@/components/PinRenderer';
import CanvasBackgroundSelector from '@/components/CanvasBackgroundSelector';
import LayerColorPicker from '@/components/LayerColorPicker';
import ImageIcon from '@/components/ui/icons/ImageIcon';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Canvas {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: Date;
  pinCount: number;
  layerCount: number;
  ownerId: string;
  allowComments: boolean;
  allowLikes: boolean;
  backgroundType: 'color' | 'image';
  backgroundColor: string;
  backgroundImageUrl?: string;
}

interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  canvasId: string;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'url';
  url: string;
  name?: string;
}

interface PinTemplate {
  id: string;
  name: string;
  description?: string;
  shape: 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'custom';
  color: string;
  size: 'small' | 'medium' | 'large';
  icon?: string;
  style?: any;
  isDefault: boolean;
  isPublic: boolean;
}

interface PinData {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  layerId: string;
  canvasId: string;
  templateId?: string;
  template?: PinTemplate;
  mediaItems?: MediaItem[];
}

const CanvasView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [pins, setPins] = useState<PinData[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isCreateLayerModalOpen, setIsCreateLayerModalOpen] = useState(false);
  const [isCreatingNewPin, setIsCreatingNewPin] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEditCanvasNameModalOpen, setIsEditCanvasNameModalOpen] = useState(false);
  const [isEditLayerNameModalOpen, setIsEditLayerNameModalOpen] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string>('');
  const [isPinTemplateSelectorOpen, setIsPinTemplateSelectorOpen] = useState(false);
  const [selectedPinTemplate, setSelectedPinTemplate] = useState<PinTemplate | null>(null);
  const [pinTemplates, setPinTemplates] = useState<PinTemplate[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);

  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchCanvasData();
      fetchPinTemplates();
    }
  }, [id]);

  const fetchCanvasData = async () => {
    try {
      console.log('Fetching canvas data for ID:', id);
      
      // 캔버스 데이터 가져오기
      const { data: canvasData, error: canvasError } = await supabase
        .from('canvases')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (canvasError) throw canvasError;

      if (canvasData) {
        setCanvas({
          id: canvasData.id,
          title: canvasData.title,
          imageUrl: canvasData.image_url || '/placeholder.svg',
          createdAt: new Date(canvasData.created_at),
          pinCount: 0,
          layerCount: 0,
          ownerId: canvasData.owner_id,
          allowComments: canvasData.allow_comments,
          allowLikes: canvasData.allow_likes,
          backgroundType: (canvasData.background_type as 'color' | 'image') || 'color',
          backgroundColor: canvasData.background_color || '#ffffff',
          backgroundImageUrl: canvasData.background_image_url || undefined,
        });

        // 레이어 데이터 가져오기
        const { data: layersData, error: layersError } = await supabase
          .from('layers')
          .select('*')
          .eq('canvas_id', id)
          .order('created_at', { ascending: true });

        if (layersError) throw layersError;

        const formattedLayers: Layer[] = layersData?.map(layer => ({
          id: layer.id,
          name: layer.name,
          color: layer.color,
          visible: layer.visible,
          locked: layer.locked || false,
          canvasId: layer.canvas_id,
        })) || [];

        console.log('Formatted layers:', formattedLayers);
        setLayers(formattedLayers);
        setSelectedLayerId(formattedLayers[0]?.id || '');

        // 핀 데이터 가져오기 (템플릿 정보 포함)
        const { data: pinsData, error: pinsError } = await supabase
          .from('pins')
          .select(`
            *,
            media_items (*),
            pin_templates (*)
          `)
          .eq('canvas_id', id);

        if (pinsError) throw pinsError;

        const formattedPins: PinData[] = pinsData?.map(pin => ({
          id: pin.id,
          x: pin.x,
          y: pin.y,
          title: pin.title,
          description: pin.description || '',
          layerId: pin.layer_id,
          canvasId: pin.canvas_id,
          templateId: pin.template_id,
          template: pin.pin_templates ? {
            id: pin.pin_templates.id,
            name: pin.pin_templates.name,
            description: pin.pin_templates.description,
            shape: pin.pin_templates.shape as PinTemplate['shape'],
            color: pin.pin_templates.color,
            size: pin.pin_templates.size as PinTemplate['size'],
            icon: pin.pin_templates.icon,
            style: pin.pin_templates.style,
            isDefault: pin.pin_templates.is_default,
            isPublic: pin.pin_templates.is_public,
          } : undefined,
          mediaItems: pin.media_items?.map((media: any) => ({
            id: media.id,
            type: media.type,
            url: media.url,
            name: media.name,
          })) || [],
        })) || [];

        console.log('Formatted pins:', formattedPins);
        setPins(formattedPins);
      }
    } catch (error) {
      console.error('Error fetching canvas data:', error);
      toast({
        title: "오류",
        description: "캔버스 데이터를 불러올 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const fetchPinTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('pin_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedTemplates: PinTemplate[] = data.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        shape: template.shape as PinTemplate['shape'],
        color: template.color,
        size: template.size as PinTemplate['size'],
        icon: template.icon,
        style: template.style,
        isDefault: template.is_default,
        isPublic: template.is_public,
      }));

      setPinTemplates(formattedTemplates);
      
      // Set default template if none selected
      if (!selectedPinTemplate) {
        const defaultTemplate = formattedTemplates.find(t => t.isDefault);
        setSelectedPinTemplate(defaultTemplate || formattedTemplates[0] || null);
      }
    } catch (error) {
      console.error('Error fetching pin templates:', error);
      toast({
        title: "오류",
        description: "핀 템플릿을 불러올 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPresentationMode) {
        setIsPresentationMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPresentationMode]);

  const getVisiblePins = () => {
    const visibleLayerIds = layers.filter(layer => layer.visible).map(layer => layer.id);
    return pins.filter(pin => visibleLayerIds.includes(pin.layerId));
  };

  const getLayerColor = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    return layer?.color || '#6b7280';
  };

  if (!canvas) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">캔버스를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDrawingMode) return; // Don't add pins in drawing mode
    
    if (!selectedLayerId) return;
    
    const selectedLayer = layers.find(l => l.id === selectedLayerId);
    if (selectedLayer?.locked) {
      toast({
        title: "레이어 잠금됨",
        description: "잠긴 레이어에는 핀을 추가할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newPin: PinData = {
      id: `pin${Date.now()}`,
      x,
      y,
      title: '새 핀',
      description: '핀 설명을 입력하세요',
      layerId: selectedLayerId,
      canvasId: id || '1',
      templateId: selectedPinTemplate?.id,
      template: selectedPinTemplate,
      mediaItems: [],
    };

    // 새 핀을 생성하고 바로 모달 열기
    setSelectedPin(newPin);
    setIsCreatingNewPin(true);
    setIsPinModalOpen(true);
  };

  const handlePinClick = (pin: PinData) => {
    setSelectedPin(pin);
    setIsCreatingNewPin(false);
    setIsPinModalOpen(true);
  };

  const handlePinUpdate = async (updatedPin: PinData) => {
    try {
      if (isCreatingNewPin) {
        // 새 핀을 데이터베이스에 추가
        const { data, error } = await supabase
          .from('pins')
          .insert({
            x: updatedPin.x,
            y: updatedPin.y,
            title: updatedPin.title,
            description: updatedPin.description,
            layer_id: updatedPin.layerId,
            canvas_id: updatedPin.canvasId,
            template_id: updatedPin.templateId
          })
          .select()
          .single();

        if (error) throw error;

        const newPin: PinData = {
          ...updatedPin,
          id: data.id
        };

        const updatedPins = [...pins, newPin];
        setPins(updatedPins);
        setIsCreatingNewPin(false);

        toast({
          title: "핀 생성 완료",
          description: "새 핀이 생성되었습니다.",
        });
      } else {
        // 기존 핀을 데이터베이스에서 업데이트
        const { error } = await supabase
          .from('pins')
          .update({
            x: updatedPin.x,
            y: updatedPin.y,
            title: updatedPin.title,
            description: updatedPin.description,
            layer_id: updatedPin.layerId,
            template_id: updatedPin.templateId
          })
          .eq('id', updatedPin.id);

        if (error) throw error;

        const updatedPins = pins.map(pin => pin.id === updatedPin.id ? updatedPin : pin);
        setPins(updatedPins);

        toast({
          title: "핀 수정 완료",
          description: "핀이 수정되었습니다.",
        });
      }
    } catch (error) {
      console.error('Error updating pin:', error);
      toast({
        title: "오류",
        description: "핀 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handlePinDelete = async (pinId: string) => {
    try {
      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('id', pinId);

      if (error) throw error;

      const updatedPins = pins.filter(pin => pin.id !== pinId);
      setPins(updatedPins);

      toast({
        title: "핀 삭제 완료",
        description: "핀이 삭제되었습니다.",
      });
    } catch (error) {
      console.error('Error deleting pin:', error);
      toast({
        title: "오류",
        description: "핀 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handlePinModalClose = () => {
    setIsPinModalOpen(false);
    setIsCreatingNewPin(false);
    setSelectedPin(null);
  };

  const toggleLayerVisibility = async (layerId: string) => {
    try {
      const layer = layers.find(l => l.id === layerId);
      if (!layer) return;

      const newVisibility = !layer.visible;

      const { error } = await supabase
        .from('layers')
        .update({ visible: newVisibility })
        .eq('id', layerId);

      if (error) throw error;

      const updatedLayers = layers.map(layer => 
        layer.id === layerId 
          ? { ...layer, visible: newVisibility }
          : layer
      );
      setLayers(updatedLayers);
    } catch (error) {
      console.error('Error updating layer visibility:', error);
      toast({
        title: "오류",
        description: "레이어 표시/숨김 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleCreateLayer = async (layerData: { name: string; color: string }) => {
    try {
      const { data, error } = await supabase
        .from('layers')
        .insert({
          name: layerData.name,
          color: layerData.color,
          canvas_id: id
        })
        .select()
        .single();

      if (error) throw error;

      const newLayer: Layer = {
        id: data.id,
        name: data.name,
        color: data.color,
        visible: data.visible,
        locked: data.locked || false,
        canvasId: data.canvas_id,
      };

      const updatedLayers = [...layers, newLayer];
      setLayers(updatedLayers);

      toast({
        title: "레이어 생성 완료",
        description: "새 레이어가 생성되었습니다.",
      });
    } catch (error) {
      console.error('Error creating layer:', error);
      toast({
        title: "오류",
        description: "레이어 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLayer = async (layerId: string) => {
    if (layers.length <= 1) {
      toast({
        title: "삭제 불가",
        description: "최소 하나의 레이어는 필요합니다.",
        variant: "destructive",
      });
      return;
    }

    if (confirm('이 레이어와 모든 핀을 삭제하시겠습니까?')) {
      try {
        // 레이어에 속한 핀들 먼저 삭제
        await supabase
          .from('pins')
          .delete()
          .eq('layer_id', layerId);

        // 레이어 삭제
        const { error } = await supabase
          .from('layers')
          .delete()
          .eq('id', layerId);

        if (error) throw error;

        const updatedLayers = layers.filter(layer => layer.id !== layerId);
        const updatedPins = pins.filter(pin => pin.layerId !== layerId);
        
        setLayers(updatedLayers);
        setPins(updatedPins);
        
        if (selectedLayerId === layerId) {
          setSelectedLayerId(updatedLayers[0]?.id || '');
        }

        toast({
          title: "레이어 삭제 완료",
          description: "레이어와 관련 핀들이 삭제되었습니다.",
        });
      } catch (error) {
        console.error('Error deleting layer:', error);
        toast({
          title: "오류",
          description: "레이어 삭제 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCanvasSettingsUpdate = (settings: { allow_comments: boolean; allow_likes: boolean }) => {
    if (canvas) {
      setCanvas({
        ...canvas,
        allowComments: settings.allow_comments,
        allowLikes: settings.allow_likes,
      });
    }
  };

  const toggleLayerLock = async (layerId: string) => {
    try {
      const layer = layers.find(l => l.id === layerId);
      if (!layer) return;

      const newLockState = !layer.locked;

      const { error } = await supabase
        .from('layers')
        .update({ locked: newLockState })
        .eq('id', layerId);

      if (error) throw error;

      const updatedLayers = layers.map(layer => 
        layer.id === layerId 
          ? { ...layer, locked: newLockState }
          : layer
      );
      setLayers(updatedLayers);

      toast({
        title: newLockState ? "레이어 잠금" : "레이어 잠금 해제",
        description: newLockState ? "레이어가 잠겼습니다." : "레이어 잠금이 해제되었습니다.",
      });
    } catch (error) {
      console.error('Error updating layer lock:', error);
      toast({
        title: "오류",
        description: "레이어 잠금 설정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleCanvasNameUpdate = async (newName: string) => {
    try {
      const { error } = await supabase
        .from('canvases')
        .update({ title: newName })
        .eq('id', id);

      if (error) throw error;

      if (canvas) {
        setCanvas({
          ...canvas,
          title: newName,
        });
      }

      toast({
        title: "캔버스 이름 수정 완료",
        description: "캔버스 이름이 변경되었습니다.",
      });
    } catch (error) {
      console.error('Error updating canvas name:', error);
      toast({
        title: "오류",
        description: "캔버스 이름 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleLayerNameUpdate = async (newName: string) => {
    try {
      const { error } = await supabase
        .from('layers')
        .update({ name: newName })
        .eq('id', editingLayerId);

      if (error) throw error;

      const updatedLayers = layers.map(layer => 
        layer.id === editingLayerId 
          ? { ...layer, name: newName }
          : layer
      );
      setLayers(updatedLayers);

      toast({
        title: "레이어 이름 수정 완료",
        description: "레이어 이름이 변경되었습니다.",
      });
    } catch (error) {
      console.error('Error updating layer name:', error);
      toast({
        title: "오류",
        description: "레이어 이름 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleBackgroundUpdate = async (type: 'color' | 'image', color?: string, imageUrl?: string) => {
    try {
      const updateData: any = { background_type: type };
      
      if (type === 'color') {
        updateData.background_color = color;
        updateData.background_image_url = null;
      } else if (type === 'image') {
        updateData.background_image_url = imageUrl;
      }

      const { error } = await supabase
        .from('canvases')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      if (canvas) {
        setCanvas({
          ...canvas,
          backgroundType: type,
          backgroundColor: color || canvas.backgroundColor,
          backgroundImageUrl: type === 'image' ? imageUrl : undefined,
        });
      }

      toast({
        title: "배경 변경 완료",
        description: "캔버스 배경이 변경되었습니다.",
      });
    } catch (error) {
      console.error('Error updating background:', error);
      toast({
        title: "오류",
        description: "배경 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleLayerColorChange = async (layerId: string, color: string) => {
    try {
      const { error } = await supabase
        .from('layers')
        .update({ color })
        .eq('id', layerId);

      if (error) throw error;

      // Update local state
      setLayers(layers.map(layer => 
        layer.id === layerId ? { ...layer, color } : layer
      ));

      toast({
        title: "레이어 색상 변경 완료",
        description: "레이어 색상이 변경되었습니다.",
      });
    } catch (error) {
      console.error('Error updating layer color:', error);
      toast({
        title: "오류",
        description: "레이어 색상 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const isOwner = canvas && user?.id === canvas.ownerId;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 ${isPresentationMode ? 'p-0' : ''}`}>
      {/* Header */}
      {!isPresentationMode && (
        <header className="bg-white/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-bold">{canvas.title}</h1>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6"
                        onClick={() => setIsEditCanvasNameModalOpen(true)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pins.length}개의 핀 • {layers.length}개의 레이어
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  선택된 레이어: {layers.find(l => l.id === selectedLayerId)?.name || '없음'}
                </Badge>
                <Button
                  variant={selectedPinTemplate ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPinTemplateSelectorOpen(true)}
                  className="flex items-center space-x-2"
                >
                  <Palette className="w-4 h-4" />
                  <span className="text-xs">
                    {selectedPinTemplate ? selectedPinTemplate.name : '핀 템플릿'}
                  </span>
                </Button>
                <Button
                  variant={isDrawingMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsDrawingMode(!isDrawingMode)}
                  className="flex items-center space-x-2"
                >
                  <Pen className="w-4 h-4" />
                  <span className="text-xs">
                    {isDrawingMode ? '드로잉 중' : '드로잉'}
                  </span>
                </Button>
                {isOwner && canvas && (
                  <>
                    <CanvasBackgroundSelector
                      canvasId={canvas.id}
                      currentBackgroundType={canvas.backgroundType}
                      currentBackgroundColor={canvas.backgroundColor}
                      currentBackgroundImageUrl={canvas.backgroundImageUrl}
                      onBackgroundUpdate={handleBackgroundUpdate}
                    />
                    <CanvasSettingsModal
                      canvasId={canvas.id}
                      allowComments={canvas.allowComments}
                      allowLikes={canvas.allowLikes}
                      onSettingsUpdate={handleCanvasSettingsUpdate}
                    />
                  </>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsShareModalOpen(true)}
                  aria-label="Share Canvas"
                >
                  <Share className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsPresentationMode(true)}
                  aria-label="Presentation Mode"
                >
                  <Presentation className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className={`flex ${isPresentationMode ? 'fixed inset-0 z-50 bg-white' : ''}`}>
        {/* Layer Panel */}
        {!isPresentationMode && (
          <div className="w-80 bg-white/60 backdrop-blur-sm border-r border-border/50 p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <Layers className="w-5 h-5 mr-2" />
                  레이어 관리
                </h2>
                <Button
                  size="sm"
                  onClick={() => setIsCreateLayerModalOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  추가
                </Button>
              </div>
              
              <div className="space-y-3">
                {layers.map((layer) => (
                  <Card
                    key={layer.id}
                    className={`cursor-pointer transition-all ${
                      selectedLayerId === layer.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50/50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedLayerId(layer.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <LayerColorPicker 
                            currentColor={layer.color}
                            onColorChange={(color) => handleLayerColorChange(layer.id, color)}
                          />
                          <span className="font-medium flex-1">{layer.name}</span>
                          {layer.locked && <Lock className="w-3 h-3 text-muted-foreground" />}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingLayerId(layer.id);
                                setIsEditLayerNameModalOpen(true);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          )}
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLayerLock(layer.id);
                              }}
                            >
                              {layer.locked ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Unlock className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerVisibility(layer.id);
                            }}
                          >
                            {layer.visible ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </Button>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-red-500 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLayer(layer.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-muted-foreground">
                        {pins.filter(pin => pin.layerId === layer.id).length}개의 핀
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-blue-50 p-4 rounded-lg">
              <p className="font-medium mb-2">사용법:</p>
              <ul className="space-y-1 text-xs">
                <li>• 핀 템플릿 버튼으로 핀 모양 선택</li>
                <li>• 드로잉 버튼으로 펜 드로잉 모드 전환</li>
                <li>• 레이어를 선택한 후 캔버스를 클릭하여 핀 추가</li>
                <li>• 눈 아이콘으로 레이어 표시/숨김</li>
                <li>• 핀을 클릭하여 정보 확인</li>
                <li>• 휴지통 아이콘으로 레이어 삭제</li>
                <li>• 공유 아이콘으로 캔버스 공유 (뷰어/편집자 권한 선택 가능)</li>
                <li>• 소유자는 설정에서 댓글/좋아요 기능 허용 설정 가능</li>
              </ul>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className={`flex-1 relative ${isPresentationMode ? '' : 'p-6'}`}>
          {isPresentationMode && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white hover:text-white rounded-full"
              onClick={() => setIsPresentationMode(false)}
              aria-label="Exit Presentation Mode"
            >
              <X className="w-6 h-6" />
            </Button>
          )}

          <div
            className={`relative bg-white rounded-lg shadow-lg overflow-hidden ${isPresentationMode ? 'w-full h-full cursor-default' : 'cursor-crosshair'}`}
            style={{ 
              minHeight: '600px',
              backgroundColor: canvas.backgroundType === 'color' ? canvas.backgroundColor : '#ffffff',
              backgroundImage: canvas.backgroundType === 'image' && canvas.backgroundImageUrl ? 
                `url(${canvas.backgroundImageUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
            onClick={isPresentationMode ? undefined : handleCanvasClick}
          >
            {canvas.imageUrl && canvas.imageUrl !== '/placeholder.svg' ? (
              <img
                src={canvas.imageUrl}
                alt={canvas.title}
                className="w-full h-full object-contain"
                style={{ minHeight: '600px' }}
              />
            ) : (
              canvas.backgroundType === 'color' && canvas.backgroundColor === '#ffffff' && (
                <div 
                  className="w-full h-full flex items-center justify-center text-gray-300"
                  style={{ minHeight: '600px' }}
                >
                  <div className="text-center">
                    <Image className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium opacity-40">화이트 캔버스</p>
                    <p className="text-sm opacity-30">핀을 추가하려면 클릭하세요</p>
                  </div>
                </div>
              )
            )}
            
            {/* Pins */}
            {getVisiblePins().map((pin) => (
              <PinRenderer
                key={pin.id}
                pin={pin}
                template={pin.template}
                onClick={() => handlePinClick(pin)}
                isVisible={true}
              />
            ))}

            {/* Drawing Canvas - only show in drawing mode or if canvas has drawings */}
            {(isDrawingMode || selectedLayerId) && selectedLayerId && (
              <DrawingCanvas
                canvasId={id || ''}
                layerId={selectedLayerId}
                width={canvasWidth}
                height={canvasHeight}
                onDrawingChange={(hasDrawing) => {
                  // Handle drawing state change if needed
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Pin Template Selector */}
      {isPinTemplateSelectorOpen && (
        <PinTemplateSelector
          selectedTemplate={selectedPinTemplate}
          onTemplateSelect={(template) => {
            setSelectedPinTemplate(template);
            setIsPinTemplateSelectorOpen(false);
          }}
          onClose={() => setIsPinTemplateSelectorOpen(false)}
        />
      )}

      {/* Pin Info Modal */}
      {canvas && (
        <PinInfoModal
          pin={selectedPin}
          isOpen={isPinModalOpen}
          onClose={handlePinModalClose}
          onUpdate={handlePinUpdate}
          onDelete={handlePinDelete}
          layerColor={selectedPin ? getLayerColor(selectedPin.layerId) : '#6b7280'}
          isNewPin={isCreatingNewPin}
          canvasOwnerId={canvas.ownerId}
          allowComments={canvas.allowComments}
          allowLikes={canvas.allowLikes}
          isOwner={isOwner || false}
        />
      )}

      {/* Create Layer Modal */}
      <CreateLayerModal
        isOpen={isCreateLayerModalOpen}
        onClose={() => setIsCreateLayerModalOpen(false)}
        onSubmit={handleCreateLayer}
      />

      {/* Share Canvas Modal */}
      <ShareCanvasModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        canvasId={id || ''}
        canvasTitle={canvas?.title || ''}
      />

      {/* Edit Canvas Name Modal */}
      {canvas && (
        <EditCanvasNameModal
          isOpen={isEditCanvasNameModalOpen}
          onClose={() => setIsEditCanvasNameModalOpen(false)}
          currentName={canvas.title}
          onSubmit={handleCanvasNameUpdate}
        />
      )}

      {/* Edit Layer Name Modal */}
      <EditLayerNameModal
        isOpen={isEditLayerNameModalOpen}
        onClose={() => setIsEditLayerNameModalOpen(false)}
        currentName={layers.find(l => l.id === editingLayerId)?.name || ''}
        onSubmit={handleLayerNameUpdate}
      />
    </div>
  );
};

export default CanvasView;
