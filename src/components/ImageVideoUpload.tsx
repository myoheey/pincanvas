
import React, { useState } from 'react';
import { Upload, Link, X, Image, Video, File, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'url';
  url: string;
  name?: string;
}

interface ImageVideoUploadProps {
  mediaItems: MediaItem[];
  onMediaChange: (mediaItems: MediaItem[]) => void;
}

export const ImageVideoUpload: React.FC<ImageVideoUploadProps> = ({
  mediaItems,
  onMediaChange,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // 파일 크기 체크 (영상 100MB, 이미지 10MB 제한)
        const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(`파일 크기가 너무 큽니다: ${file.name} (최대 ${file.type.startsWith('video/') ? '100MB' : '10MB'})`);
          return null;
        }

        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        // 영상이나 큰 이미지 파일은 Supabase Storage에 업로드
        if (isVideo || (isImage && file.size > 1024 * 1024)) { // 1MB 이상
          try {
            const fileExt = file.name.split('.').pop() || '';
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `media/${fileName}`;

            console.log(`Uploading ${isVideo ? 'video' : 'large image'} to storage:`, fileName);

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('canvas-backgrounds')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
              .from('canvas-backgrounds')
              .getPublicUrl(filePath);

            return {
              id: `${Date.now()}-${Math.random()}`,
              type: isVideo ? 'video' as const : 'image' as const,
              url: data.publicUrl,
              name: file.name,
            };
          } catch (error: any) {
            console.error('Storage upload error:', error);
            
            // RLS 정책 에러인지 확인
            if (error?.message?.includes('row-level security') || error?.message?.includes('Policy')) {
              toast.error(`업로드 권한이 없습니다. RLS 정책을 확인해주세요: ${file.name}`);
            } else {
              toast.error(`파일 업로드 실패: ${file.name} - ${error?.message || '알 수 없는 오류'}`);
            }
            return null;
          }
        } else {
          // 작은 이미지는 Base64로 처리
          return new Promise<MediaItem>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              resolve({
                id: `${Date.now()}-${Math.random()}`,
                type: 'image',
                url: result,
                name: file.name,
              });
            };
            reader.readAsDataURL(file);
          });
        }
      });

      const results = await Promise.all(uploadPromises);
      const validResults = results.filter(result => result !== null) as MediaItem[];
      
      if (validResults.length > 0) {
        onMediaChange([...mediaItems, ...validResults]);
        toast.success(`${validResults.length}개 파일이 업로드되었습니다.`);
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleUrlAdd = () => {
    if (!urlInput.trim()) return;

    const newMediaItem: MediaItem = {
      id: `url-${Date.now()}`,
      type: 'url',
      url: urlInput.trim(),
      name: urlInput.trim(),
    };

    onMediaChange([...mediaItems, newMediaItem]);
    setUrlInput('');
    setIsAddingUrl(false);
  };

  const handleRemoveMedia = async (id: string) => {
    const itemToRemove = mediaItems.find(item => item.id === id);
    
    // Storage에서 업로드된 파일인지 확인하고 삭제
    if (itemToRemove && itemToRemove.url.includes('supabase.co/storage/')) {
      try {
        // URL에서 파일 경로 추출
        const url = new URL(itemToRemove.url);
        const pathParts = url.pathname.split('/');
        // /storage/v1/object/public/canvas-backgrounds/media/filename 형식에서 media/filename 추출
        const filePath = pathParts.slice(pathParts.indexOf('media')).join('/');
        
        console.log('Deleting file from storage:', filePath);
        
        const { error } = await supabase.storage
          .from('canvas-backgrounds')
          .remove([filePath]);
          
        if (error) {
          console.error('Storage delete error:', error);
        }
      } catch (error) {
        console.error('Error parsing storage URL:', error);
      }
    }
    
    onMediaChange(mediaItems.filter(item => item.id !== id));
  };

  const renderMediaPreview = (item: MediaItem) => {
    switch (item.type) {
      case 'image':
        return (
          <img
            src={item.url}
            alt={item.name}
            className="w-full h-20 object-cover rounded"
          />
        );
      case 'video':
        return (
          <video
            src={item.url}
            className="w-full h-20 object-cover rounded"
            controls={false}
          />
        );
      case 'url':
        return (
          <div className="w-full h-20 bg-blue-50 rounded flex items-center justify-center">
            <Link className="w-6 h-6 text-blue-500" />
          </div>
        );
      default:
        return (
          <div className="w-full h-20 bg-gray-50 rounded flex items-center justify-center">
            <File className="w-6 h-6 text-gray-400" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <Label>미디어 첨부</Label>
      
      {/* Media Grid */}
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {mediaItems.map((item) => (
            <div key={item.id} className="relative group">
              {renderMediaPreview(item)}
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveMedia(item.id)}
              >
                <X className="w-3 h-3" />
              </Button>
              {item.name && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {item.name}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('media-upload')?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {isUploading ? '업로드 중...' : '파일 업로드'}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddingUrl(!isAddingUrl)}
        >
          <Link className="w-4 h-4 mr-2" />
          URL 추가
        </Button>
      </div>

      {/* Hidden File Input */}
      <input
        id="media-upload"
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* URL Input */}
      {isAddingUrl && (
        <div className="flex space-x-2">
          <Input
            placeholder="이미지, 동영상 또는 연결하고 싶은 링크를 입력하세요"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleUrlAdd()}
          />
          <Button onClick={handleUrlAdd} size="sm">
            추가
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsAddingUrl(false);
              setUrlInput('');
            }}
            size="sm"
          >
            취소
          </Button>
        </div>
      )}
    </div>
  );
};
