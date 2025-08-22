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
  Crown
} from 'lucide-react';
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

export const PinTemplateSelector: React.FC<PinTemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateSelect,
  onClose,
}) => {
  const [templates, setTemplates] = useState<PinTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    const IconComponent = shapeIcons[template.shape];
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedTemplate?.id === template.id 
                    ? 'ring-2 ring-primary shadow-lg' 
                    : ''
                }`}
                onClick={() => onTemplateSelect(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {renderTemplatePreview(template)}
                      <div>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {template.name}
                          {template.isDefault && (
                            <Crown className="w-3 h-3 text-yellow-500" />
                          )}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-xs">
                        {template.size}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.shape}
                      </Badge>
                    </div>
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: template.color }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
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
      </div>
    </div>
  );
};