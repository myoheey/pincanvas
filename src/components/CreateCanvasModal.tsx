import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon, Zap, Gauge, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface CreateCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const CreateCanvasModal: React.FC<CreateCanvasModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageFile: null as File | null,
    resolution: 'high' // 'original', 'high', 'medium'
  });
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();  
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setFormData(prev => ({ ...prev, imageFile: file }));
        
        // 이미지 미리보기 생성
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        
        toast.success(`이미지 "${file.name}"이 업로드되었습니다.`);
      } else {
        toast.error('이미지 파일만 업로드 가능합니다.');
      }
    }
  };

  const handleFileButtonClick = () => {
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file }));
      
      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      toast.success(`이미지 "${file.name}"이 업로드되었습니다.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }

    // 이미지가 없으면 빈 화이트 캔버스로 생성
    const canvasData = {
      ...formData,
      imageUrl: imagePreview || '' // 이미지가 없으면 빈 문자열
    };

    onSubmit(canvasData);
    
    // 폼 초기화
    setFormData({
      title: '',
      description: '',
      imageFile: null,
      resolution: 'high'
    });
    setImagePreview('');
    toast.success('새 캔버스가 생성되었습니다!');
  };

  const resolutionOptions = [
    {
      value: 'original',
      label: '원본 유지',
      description: '고화질이 필요할 때 (용량 클 수 있음)',
      icon: Sparkles,
      color: 'text-purple-600'
    },
    {
      value: 'high',
      label: '고화질 최적화',
      description: '웹 환경에 적합한 고화질 (권장)',
      icon: Zap,
      color: 'text-blue-600'
    },
    {
      value: 'medium',
      label: '일반화질 최적화',
      description: '빠른 로딩이 필요할 때',
      icon: Gauge,
      color: 'text-green-600'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">새 캔버스 만들기</h2>
            <p className="text-muted-foreground">이미지 위에 정보를 정리할 새로운 캔버스를 생성하세요</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              캔버스 제목 *
            </Label>
            <Input
              id="title"
              placeholder="예: 서울 여행 계획, 프로젝트 기획서..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="text-base"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              설명 (선택사항)
            </Label>
            <Textarea
              id="description"
              placeholder="이 캔버스에 대한 간단한 설명을 입력하세요..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">배경 이미지 (선택사항)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              이미지를 업로드하지 않으면 화이트 캔버스로 생성됩니다
            </p>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-border hover:border-blue-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {imagePreview ? (
                <div className="space-y-2">
                  <img 
                    src={imagePreview} 
                    alt="미리보기" 
                    className="max-h-32 mx-auto rounded-lg border"
                  />
                  <p className="font-medium text-green-600">{formData.imageFile?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.imageFile ? (formData.imageFile.size / 1024 / 1024).toFixed(2) : 0} MB
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, imageFile: null }));
                      setImagePreview('');
                    }}
                  >
                    다른 이미지 선택
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="font-medium">이미지를 드래그하여 업로드하거나</p>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleFileButtonClick}
                    >
                      파일 선택
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG, GIF 파일 지원 • 업로드하지 않으면 화이트 캔버스
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Resolution Options - only show when image is uploaded */}
          {imagePreview && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">해상도 옵션</Label>
              <RadioGroup
                value={formData.resolution}
                onValueChange={(value) => setFormData(prev => ({ ...prev, resolution: value }))}
                className="space-y-3"
              >
                {resolutionOptions.map((option) => (
                  <Card key={option.value} className="border-2 hover:border-blue-200 transition-colors">
                    <CardContent className="flex items-center space-x-3 p-4">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <option.icon className={`w-5 h-5 ${option.color}`} />
                      <div className="flex-1">
                        <Label htmlFor={option.value} className="text-base font-medium cursor-pointer">
                          {option.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Submit Buttons */}
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
              className="flex-1 gradient-primary text-white border-0"
            >
              캔버스 생성
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
