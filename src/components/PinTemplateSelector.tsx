import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Circle, 
  Square, 
  Triangle, 
  Star, 
  Heart, 
  Plus,
  Palette,
  Crown,
  Upload
} from 'lucide-react';
import { CreatePinTemplateModal } from './CreatePinTemplateModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PinTemplate {
  id: string;
  name: string;
  description?: string;
  shape: 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'custom';
  color: string;
  size: 'small' | 'medium' | 'large';
  icon?: string;
  style?: any;
  imageUrl?: string;
  isDefault: boolean;
  isPublic: boolean;
}

interface PinTemplateSelectorProps {
  selectedTemplate: PinTemplate | null;
  onTemplateSelect: (template: PinTemplate) => void;
  onClose: () => void;
}

const shapeIcons = {
  circle: Circle,
  square: Square,
  triangle: Triangle,
  star: Star,
  heart: Heart,
  custom: Plus,
};

const sizeMap = {
  small: 16,
  medium: 20,
  large: 24,
};

const defaultTemplates = [
  { id: 'default-circle', name: '원형', shape: 'circle', color: '#3b82f6', size: 'medium', isDefault: true, isPublic: true },
  { id: 'default-square', name: '사각형', shape: 'square', color: '#10b981', size: 'medium', isDefault: true, isPublic: true },
  { id: 'default-triangle', name: '삼각형', shape: 'triangle', color: '#f59e0b', size: 'medium', isDefault: true, isPublic: true },
  { id: 'default-star', name: '별', shape: 'star', color: '#ef4444', size: 'medium', isDefault: true, isPublic: true },
];

const customTemplates = [
  { id: 'custom-1', name: '산', shape: 'custom', imageUrl: '/images/Custom1.png', color: '#ff0000', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-2', name: '절', shape: 'custom', imageUrl: '/images/Custom2.png', color: '#00ff00', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-3', name: '학도병추모비', shape: 'custom', imageUrl: '/images/Custom3.png', color: '#0000ff', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-4', name: '언양성당', shape: 'custom', imageUrl: '/images/Custom4.png', color: '#ffff00', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-5', name: '암각화', shape: 'custom', imageUrl: '/images/Custom5.png', color: '#ff00ff', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-6', name: '읍성', shape: 'custom', imageUrl: '/images/Custom6.png', color: '#00ffff', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-7', name: '간절곶', shape: 'custom', imageUrl: '/images/Custom7.png', color: '#ff8800', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-8', name: '공장', shape: 'custom', imageUrl: '/images/Custom8.png', color: '#88ff00', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-9', name: '학교', shape: 'custom', imageUrl: '/images/Custom9.png', color: '#0088ff', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-10', name: '한글교실', shape: 'custom', imageUrl: '/images/Custom10.png', color: '#ff0088', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-11', name: '작천정', shape: 'custom', imageUrl: '/images/Custom11.png', color: '#88ff88', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-12', name: '강', shape: 'custom', imageUrl: '/images/Custom12.png', color: '#8888ff', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-13', name: '바다', shape: 'custom', imageUrl: '/images/Custom13.png', color: '#ff8888', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-14', name: '소호분교', shape: 'custom', imageUrl: '/images/Custom14.png', color: '#88ffff', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-15', name: '산촌유학', shape: 'custom', imageUrl: '/images/Custom15.png', color: '#ffff88', size: 'large', isDefault: false, isPublic: true },
  { id: 'custom-16', name: '땡땡마을', shape: 'custom', imageUrl: '/images/Custom16.png', color: '#ff88ff', size: 'large', isDefault: false, isPublic: true },
];

export const PinTemplateSelector: React.FC<PinTemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateSelect,
  onClose,
}) => {
  const [templates, setTemplates] = useState<PinTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
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
        imageUrl: template.image_url,
        isDefault: template.is_default,
        isPublic: template.is_public,
      }));

      setTemplates(formattedTemplates);
    } catch (error) {
      console.error('Error fetching pin templates:', error);
      toast({
        title: "오류",
        description: "핀 템플릿을 불러올 수 없습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderTemplatePreview = (template: PinTemplate) => {
    if (template.shape === 'custom' && template.imageUrl) {
      return (
        <div className="flex items-center justify-center w-12 h-12 rounded-lg border-2 bg-background overflow-hidden">
          <img
            src={template.imageUrl}
            alt={template.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Failed to load custom template image:', template.imageUrl);
              e.currentTarget.style.display = 'none';
            }}
            onLoad={() => {
              console.log('Successfully loaded custom template image:', template.imageUrl);
            }}
          />
        </div>
      );
    }

    const IconComponent = shapeIcons[template.shape] || Circle;
    const size = sizeMap[template.size];
    
    return (
      <div 
        className="flex items-center justify-center w-12 h-12 rounded-lg border-2 bg-background"
        style={{ borderColor: template.color }}
      >
        <IconComponent 
          size={size} 
          style={{ color: template.color }}
          fill={template.shape === 'circle' ? template.color : 'none'}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">템플릿을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Palette className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">핀 템플릿 선택</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            ×
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">템플릿 선택</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              새 템플릿
            </Button>
          </div>
          
          <div className="grid grid-cols-5 gap-4">
            {defaultTemplates.concat(customTemplates).map((template, index) => {
              console.log('Rendering template:', template.name, template.shape, (template as any).imageUrl);
              return (
              <Card
                key={index}
                className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
                  selectedTemplate?.name === template.name ? 'border-primary' : 'border-border'
                }`}
                onClick={() => onTemplateSelect(template as PinTemplate)}
              >
                <CardContent className="p-3 text-center">
                  <div className="mb-2 flex justify-center">
                    {renderTemplatePreview(template as PinTemplate)}
                  </div>
                  <p className="text-xs font-medium truncate">{template.name}</p>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button 
            onClick={onClose}
            disabled={!selectedTemplate}
          >
            선택 완료
          </Button>
        </div>

        {/* Create Template Modal */}
        <CreatePinTemplateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(newTemplate) => {
            setTemplates(prev => [...prev, newTemplate]);
            fetchTemplates(); // Refresh list
          }}
        />
      </div>
    </div>
  );
};