
import React, { useState } from 'react';
import { Upload, Link, X, Image, Video, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const newMediaItem: MediaItem = {
          id: `${Date.now()}-${Math.random()}`,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          url: result,
          name: file.name,
        };
        onMediaChange([...mediaItems, newMediaItem]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    event.target.value = '';
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

  const handleRemoveMedia = (id: string) => {
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
        >
          <Upload className="w-4 h-4 mr-2" />
          파일 업로드
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
            placeholder="이미지/동영상 URL을 입력하세요"
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
