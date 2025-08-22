import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Circle, 
  Square, 
  Triangle, 
  Star, 
  Heart, 
  Upload,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreatePinTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (template: any) => void;
}

const colors = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6b7280'
];

const shapes = [
  { value: 'circle', label: '원형', icon: Circle },
  { value: 'square', label: '사각형', icon: Square },
  { value: 'triangle', label: '삼각형', icon: Triangle },
  { value: 'star', label: '별', icon: Star },
  { value: 'heart', label: '하트', icon: Heart },
  { value: 'custom', label: '커스텀 이미지', icon: Upload },
];

export const CreatePinTemplateModal: React.FC<CreatePinTemplateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    shape: 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'custom';
    color: string;
    size: 'small' | 'medium' | 'large';
  }>({
    name: '',
    description: '',
    shape: 'circle',
    color: '#3b82f6',
    size: 'medium',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "파일 크기 초과",
          description: "이미지 파일은 5MB 이하여야 합니다.",
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setFormData(prev => ({ ...prev, shape: 'custom' }));
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('pin-templates')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('pin-templates')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "이름 필수",
        description: "템플릿 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      let imageUrl = null;
      if (formData.shape === 'custom' && imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const templateData = {
        name: formData.name,
        description: formData.description,
        shape: formData.shape,
        color: formData.color,
        size: formData.size,
        image_url: imageUrl,
        created_by: user.id,
        is_public: false,
      };

      const { data, error } = await supabase
        .from('pin_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;

      onSubmit({
        id: data.id,
        name: data.name,
        description: data.description,
        shape: data.shape,
        color: data.color,
        size: data.size,
        imageUrl: data.image_url,
        isDefault: data.is_default,
        isPublic: data.is_public,
      });

      toast({
        title: "템플릿 생성 완료",
        description: "새 핀 템플릿이 생성되었습니다.",
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        shape: 'circle',
        color: '#3b82f6',
        size: 'medium',
      });
      setImageFile(null);
      setImagePreview('');
      onClose();
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "생성 실패",
        description: "템플릿 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, shape: 'circle' }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">새 핀 템플릿 만들기</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-2">
            <Label htmlFor="name">템플릿 이름</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="예: 내 커스텀 핀"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명 (선택사항)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="템플릿에 대한 설명을 입력하세요"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>모양</Label>
            <Select
              value={formData.shape}
              onValueChange={(value: 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'custom') => 
                setFormData(prev => ({ ...prev, shape: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shapes.map((shape) => {
                  const IconComponent = shape.icon;
                  return (
                    <SelectItem key={shape.value} value={shape.value}>
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-4 h-4" />
                        <span>{shape.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {formData.shape === 'custom' && (
            <div className="space-y-2">
              <Label>커스텀 이미지</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-32 object-contain rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={clearImage}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">이미지를 선택하거나 드래그하세요</p>
                    <p className="text-xs text-gray-400 mt-1">최대 5MB, PNG/JPG/GIF</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {formData.shape !== 'custom' && (
            <div className="space-y-2">
              <Label>색상</Label>
              <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded border-2 ${
                      formData.color === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>크기</Label>
            <Select
              value={formData.size}
              onValueChange={(value: 'small' | 'medium' | 'large') => 
                setFormData(prev => ({ ...prev, size: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">작음</SelectItem>
                <SelectItem value="medium">보통</SelectItem>
                <SelectItem value="large">큼</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? '생성 중...' : '템플릿 생성'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};