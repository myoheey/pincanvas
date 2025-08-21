import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Eye, EyeOff, Edit, Trash2, Layers, Pin, Image, Presentation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { PinInfoModal } from '@/components/PinInfoModal';
import { CreateLayerModal } from '@/components/CreateLayerModal';
import ImageIcon from '@/components/ui/icons/ImageIcon';

interface Canvas {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: Date;
  pinCount: number;
  layerCount: number;
}

interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  canvasId: string;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'url';
  url: string;
  name?: string;
}

interface PinData {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  layerId: string;
  canvasId: string;
  mediaItems?: MediaItem[];
}

const CanvasView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [pins, setPins] = useState<PinData[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isCreateLayerModalOpen, setIsCreateLayerModalOpen] = useState(false);
  const [isCreatingNewPin, setIsCreatingNewPin] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  useEffect(() => {
    // 로컬 스토리지에서 캔버스 데이터 가져오기
    const savedCanvases = localStorage.getItem('pincanvas_canvases');
    let canvasData: Canvas | null = null;
    
    if (savedCanvases) {
      const canvases = JSON.parse(savedCanvases);
      canvasData = canvases.find((c: Canvas) => c.id === id) || null;
    }
    
    // 캔버스가 없으면 임시 데이터 사용
    if (!canvasData) {
      canvasData = {
        id: id || '1',
        title: id === '1' ? '서울 여행 계획' : '프로젝트 기획서',
        imageUrl: '/placeholder.svg',
        createdAt: new Date(),
        pinCount: 3,
        layerCount: 2,
      };
    }

    // 레이어와 핀 데이터 로드
    const savedLayers = localStorage.getItem(`pincanvas_layers_${id}`);
    const savedPins = localStorage.getItem(`pincanvas_pins_${id}`);

    let layersData: Layer[] = [];
    let pinsData: PinData[] = [];

    if (savedLayers) {
      layersData = JSON.parse(savedLayers);
    } else {
      layersData = [
        {
          id: 'layer1',
          name: '맛집',
          color: '#ef4444',
          visible: true,
          canvasId: id || '1',
        },
        {
          id: 'layer2',
          name: '관광지',
          color: '#3b82f6',
          visible: true,
          canvasId: id || '1',
        },
      ];
      localStorage.setItem(`pincanvas_layers_${id}`, JSON.stringify(layersData));
    }

    if (savedPins) {
      pinsData = JSON.parse(savedPins);
    } else {
      pinsData = [
        {
          id: 'pin1',
          x: 200,
          y: 150,
          title: '경복궁',
          description: '조선 시대의 대표적인 궁궐입니다.\n\n운영시간: 09:00-18:00\n입장료: 성인 3,000원',
          layerId: 'layer2',
          canvasId: id || '1',
        },
        {
          id: 'pin2',
          x: 350,
          y: 220,
          title: '명동 교자',
          description: '유명한 만두 맛집입니다.\n\n추천메뉴: 왕만두, 물만두\n가격대: 10,000원~15,000원',
          layerId: 'layer1',
          canvasId: id || '1',
        },
      ];
      localStorage.setItem(`pincanvas_pins_${id}`, JSON.stringify(pinsData));
    }

    setCanvas(canvasData);
    setLayers(layersData);
    setPins(pinsData);
    setSelectedLayerId(layersData[0]?.id || '');
  }, [id]);

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

  const saveData = () => {
    localStorage.setItem(`pincanvas_layers_${id}`, JSON.stringify(layers));
    localStorage.setItem(`pincanvas_pins_${id}`, JSON.stringify(pins));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedLayerId) return;

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

  const handlePinUpdate = (updatedPin: PinData) => {
    if (isCreatingNewPin) {
      // 새 핀을 추가
      const updatedPins = [...pins, updatedPin];
      setPins(updatedPins);
      localStorage.setItem(`pincanvas_pins_${id}`, JSON.stringify(updatedPins));
      setIsCreatingNewPin(false);
    } else {
      // 기존 핀을 업데이트
      const updatedPins = pins.map(pin => pin.id === updatedPin.id ? updatedPin : pin);
      setPins(updatedPins);
      localStorage.setItem(`pincanvas_pins_${id}`, JSON.stringify(updatedPins));
    }
  };

  const handlePinDelete = (pinId: string) => {
    const updatedPins = pins.filter(pin => pin.id !== pinId);
    setPins(updatedPins);
    localStorage.setItem(`pincanvas_pins_${id}`, JSON.stringify(updatedPins));
  };

  const handlePinModalClose = () => {
    setIsPinModalOpen(false);
    setIsCreatingNewPin(false);
    setSelectedPin(null);
  };

  const toggleLayerVisibility = (layerId: string) => {
    const updatedLayers = layers.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible: !layer.visible }
        : layer
    );
    setLayers(updatedLayers);
    localStorage.setItem(`pincanvas_layers_${id}`, JSON.stringify(updatedLayers));
  };

  const handleCreateLayer = (layerData: { name: string; color: string }) => {
    const newLayer: Layer = {
      id: `layer${Date.now()}`,
      name: layerData.name,
      color: layerData.color,
      visible: true,
      canvasId: id || '1',
    };

    const updatedLayers = [...layers, newLayer];
    setLayers(updatedLayers);
    localStorage.setItem(`pincanvas_layers_${id}`, JSON.stringify(updatedLayers));
  };

  const handleDeleteLayer = (layerId: string) => {
    if (layers.length <= 1) {
      alert('최소 하나의 레이어는 필요합니다.');
      return;
    }

    if (confirm('이 레이어와 모든 핀을 삭제하시겠습니까?')) {
      const updatedLayers = layers.filter(layer => layer.id !== layerId);
      const updatedPins = pins.filter(pin => pin.layerId !== layerId);
      
      setLayers(updatedLayers);
      setPins(updatedPins);
      
      localStorage.setItem(`pincanvas_layers_${id}`, JSON.stringify(updatedLayers));
      localStorage.setItem(`pincanvas_pins_${id}`, JSON.stringify(updatedPins));
      
      if (selectedLayerId === layerId) {
        setSelectedLayerId(updatedLayers[0]?.id || '');
      }
    }
  };

  const getVisiblePins = () => {
    const visibleLayerIds = layers.filter(layer => layer.visible).map(layer => layer.id);
    return pins.filter(pin => visibleLayerIds.includes(pin.layerId));
  };

  const getLayerColor = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    return layer?.color || '#6b7280';
  };

  if (!canvas) {
    return <div>캔버스를 찾을 수 없습니다.</div>;
  }

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
                  <h1 className="text-xl font-bold">{canvas.title}</h1>
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
                          <div
                            className="w-4 h-4 rounded-full border-2"
                            style={{ backgroundColor: layer.color }}
                          />
                          <span className="font-medium">{layer.name}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
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
                <li>• 레이어를 선택한 후 캔버스를 클릭하여 핀 추가</li>
                <li>• 눈 아이콘으로 레이어 표시/숨김</li>
                <li>• 핀을 클릭하여 정보 확인</li>
                <li>• 핀에 마우스를 올려 미리보기</li>
                <li>• 휴지통 아이콘으로 레이어 삭제</li>
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
            style={{ minHeight: '600px' }}
            onClick={isPresentationMode ? undefined : handleCanvasClick}
          >
            {canvas.imageUrl ? (
              <img
                src={canvas.imageUrl}
                alt={canvas.title}
                className="w-full h-full object-contain"
                style={{ minHeight: '600px' }}
              />
            ) : (
              <div 
                className="w-full h-full bg-white flex items-center justify-center text-gray-300"
                style={{ minHeight: '600px' }}
              >
                <div className="text-center">
                  <Image className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium opacity-40">화이트 캔버스</p>
                  <p className="text-sm opacity-30">핀을 추가하려면 클릭하세요</p>
                </div>
              </div>
            )}
            
            {/* Pins with HoverCard */}
            {getVisiblePins().map((pin) => (
              <HoverCard key={pin.id} openDelay={300} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div
                    className="absolute w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                    style={{
                      left: pin.x - 12,
                      top: pin.y - 12,
                      backgroundColor: getLayerColor(pin.layerId),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinClick(pin);
                    }}
                  >
                    <Pin className="w-3 h-3 text-white" />
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80" side="right" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getLayerColor(pin.layerId) }}
                      />
                      <h4 className="font-semibold text-sm">{pin.title}</h4>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p className="whitespace-pre-wrap line-clamp-4">
                        {pin.description}
                      </p>
                    </div>

                    {pin.mediaItems && pin.mediaItems.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">첨부된 미디어:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {pin.mediaItems.slice(0, 4).map((media, index) => (
                            <div key={media.id || index} className="relative">
                              {media.type === 'image' ? (
                                <img
                                  src={media.url}
                                  alt={media.name || `미디어 ${index + 1}`}
                                  className="w-full h-16 object-cover rounded border"
                                />
                              ) : media.type === 'video' ? (
                                <div className="w-full h-16 bg-gray-100 rounded border flex items-center justify-center">
                                  <span className="text-xs text-gray-500">동영상</span>
                                </div>
                              ) : (
                                <div className="w-full h-16 bg-blue-50 rounded border flex items-center justify-center">
                                  <span className="text-xs text-blue-600">링크</span>
                                </div>
                              )}
                            </div>
                          ))}
                          {pin.mediaItems.length > 4 && (
                            <div className="w-full h-16 bg-gray-50 rounded border flex items-center justify-center">
                              <span className="text-xs text-gray-500">+{pin.mediaItems.length - 4}개 더</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      클릭하여 자세히 보기
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </div>
      </div>

      {/* Pin Info Modal */}
      <PinInfoModal
        pin={selectedPin}
        isOpen={isPinModalOpen}
        onClose={handlePinModalClose}
        onUpdate={handlePinUpdate}
        onDelete={handlePinDelete}
        layerColor={selectedPin ? getLayerColor(selectedPin.layerId) : '#6b7280'}
        isNewPin={isCreatingNewPin}
      />

      {/* Create Layer Modal */}
      <CreateLayerModal
        isOpen={isCreateLayerModalOpen}
        onClose={() => setIsCreateLayerModalOpen(false)}
        onSubmit={handleCreateLayer}
      />
    </div>
  );
};

export default CanvasView;
