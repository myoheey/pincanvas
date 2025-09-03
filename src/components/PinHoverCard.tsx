import React from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Image, Video, FileText, Link } from 'lucide-react';

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
  templateId?: string;
  mediaItems?: MediaItem[];
}

interface PinHoverCardProps {
  pin: PinData;
  isVisible: boolean;
  position: { x: number; y: number };
}

const extractUrlsFromText = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

const isImageUrl = (url: string): boolean => {
  // 파일 확장자 체크 (대소문자 무관)
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)(\?.*)?$/i;
  if (imageExtensions.test(url)) return true;
  
  // 이미지 호스팅 서비스 체크
  const imageHosts = [
    'imgur.com', 'i.imgur.com',
    'images.unsplash.com', 'unsplash.com',
    'pixabay.com', 'pexels.com',
    'flickr.com', 'staticflickr.com',
    'googleusercontent.com',
    'githubusercontent.com',
    'cloudinary.com',
    'imagekit.io',
  ];
  
  return imageHosts.some(host => url.includes(host));
};

const isVideoUrl = (url: string): boolean => {
  // 비디오 파일 확장자 체크
  const videoExtensions = /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)(\?.*)?$/i;
  if (videoExtensions.test(url)) return true;
  
  // 비디오 플랫폼 체크
  const videoPlatforms = [
    'youtube.com', 'youtu.be', 'm.youtube.com',
    'vimeo.com', 'player.vimeo.com',
    'twitch.tv', 'clips.twitch.tv', 'm.twitch.tv',
    'dailymotion.com', 'dai.ly',
    'wistia.com', 'fast.wistia.com',
    'loom.com',
    'streamable.com',
    'facebook.com/watch', 'fb.watch'
  ];
  
  return videoPlatforms.some(platform => url.includes(platform));
};

const getVideoThumbnail = (url: string): string | null => {
  console.log('🔍 Getting video thumbnail for URL:', url);
  
  // YouTube 썸네일 (다양한 패턴 지원)
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/v\/)([^&\n?#]+)/,
    /(?:m\.youtube\.com\/watch\?v=)([^&\n?#]+)/
  ];
  
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      const videoId = match[1];
      console.log('📺 YouTube video ID found:', videoId);
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  }
  
  // Vimeo 썸네일 (다양한 패턴 지원)
  const vimeoPatterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
    /vimeo\.com\/channels\/\w+\/(\d+)/,
    /vimeo\.com\/groups\/\w+\/videos\/(\d+)/
  ];
  
  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match) {
      const videoId = match[1];
      console.log('📺 Vimeo video ID found:', videoId);
      return `https://vumbnail.com/${videoId}.jpg`;
    }
  }
  
  // Dailymotion 썸네일 (패턴 개선)
  const dailymotionPatterns = [
    /dailymotion\.com\/video\/([^_\?\&]+)/,
    /dai\.ly\/([^_\?\&]+)/,
    /dailymotion\.com\/embed\/video\/([^_\?\&]+)/
  ];
  
  for (const pattern of dailymotionPatterns) {
    const match = url.match(pattern);
    if (match) {
      const videoId = match[1];
      console.log('📺 Dailymotion video ID found:', videoId);
      return `https://www.dailymotion.com/thumbnail/video/${videoId}`;
    }
  }
  
  // Twitch 클립 썸네일 시도
  if (url.includes('clips.twitch.tv')) {
    const clipIdMatch = url.match(/clips\.twitch\.tv\/([^\/\?]+)/);
    if (clipIdMatch) {
      console.log('📺 Twitch clip found, using generic thumbnail');
      // Twitch는 공식 API가 필요하므로 일단 null 반환
      return null;
    }
  }
  
  // 비디오 파일의 경우 (mp4, webm 등)
  if (/\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)(\?.*)?$/i.test(url)) {
    console.log('📹 Video file detected, no thumbnail available');
    return null; // 비디오 파일은 썸네일 생성 불가
  }
  
  console.log('❓ No thumbnail pattern matched for:', url);
  return null;
};

const getWebsitePreview = (url: string): { favicon: string; siteName: string; description?: string } | null => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    // 주요 사이트들의 아이콘과 이름 매핑 (더 많은 사이트 추가)
    const siteMap: { [key: string]: { favicon: string; name: string; description?: string } } = {
      'github.com': { favicon: 'https://github.com/favicon.ico', name: 'GitHub', description: '코드 저장소' },
      'stackoverflow.com': { favicon: 'https://stackoverflow.com/favicon.ico', name: 'Stack Overflow', description: '개발자 Q&A' },
      'medium.com': { favicon: 'https://medium.com/favicon.ico', name: 'Medium', description: '블로그 플랫폼' },
      'reddit.com': { favicon: 'https://www.reddit.com/favicon.ico', name: 'Reddit', description: '커뮤니티' },
      'twitter.com': { favicon: 'https://twitter.com/favicon.ico', name: 'Twitter', description: '소셜 미디어' },
      'x.com': { favicon: 'https://x.com/favicon.ico', name: 'X', description: '소셜 미디어' },
      'facebook.com': { favicon: 'https://facebook.com/favicon.ico', name: 'Facebook', description: '소셜 네트워크' },
      'instagram.com': { favicon: 'https://instagram.com/favicon.ico', name: 'Instagram', description: '사진 공유' },
      'linkedin.com': { favicon: 'https://linkedin.com/favicon.ico', name: 'LinkedIn', description: '비즈니스 네트워크' },
      'notion.so': { favicon: 'https://notion.so/favicon.ico', name: 'Notion', description: '워크스페이스' },
      'figma.com': { favicon: 'https://figma.com/favicon.ico', name: 'Figma', description: '디자인 도구' },
      'google.com': { favicon: 'https://google.com/favicon.ico', name: 'Google', description: '검색 엔진' },
      'youtube.com': { favicon: 'https://youtube.com/favicon.ico', name: 'YouTube', description: '동영상 플랫폼' },
      'vimeo.com': { favicon: 'https://vimeo.com/favicon.ico', name: 'Vimeo', description: '동영상 플랫폼' },
      'twitch.tv': { favicon: 'https://twitch.tv/favicon.ico', name: 'Twitch', description: '게임 스트리밍' },
      'discord.com': { favicon: 'https://discord.com/favicon.ico', name: 'Discord', description: '음성 채팅' },
      'slack.com': { favicon: 'https://slack.com/favicon.ico', name: 'Slack', description: '팀 협업' },
      'trello.com': { favicon: 'https://trello.com/favicon.ico', name: 'Trello', description: '프로젝트 관리' },
      'asana.com': { favicon: 'https://asana.com/favicon.ico', name: 'Asana', description: '업무 관리' },
      'jira.atlassian.com': { favicon: 'https://jira.atlassian.com/favicon.ico', name: 'Jira', description: '이슈 추적' },
      'confluence.atlassian.com': { favicon: 'https://confluence.atlassian.com/favicon.ico', name: 'Confluence', description: '문서 관리' },
      'dropbox.com': { favicon: 'https://dropbox.com/favicon.ico', name: 'Dropbox', description: '클라우드 스토리지' },
      'drive.google.com': { favicon: 'https://drive.google.com/favicon.ico', name: 'Google Drive', description: '클라우드 스토리지' },
      'onedrive.live.com': { favicon: 'https://onedrive.live.com/favicon.ico', name: 'OneDrive', description: '클라우드 스토리지' },
      'codepen.io': { favicon: 'https://codepen.io/favicon.ico', name: 'CodePen', description: '코드 실험실' },
      'jsfiddle.net': { favicon: 'https://jsfiddle.net/favicon.ico', name: 'JSFiddle', description: '코드 실험실' },
      'codesandbox.io': { favicon: 'https://codesandbox.io/favicon.ico', name: 'CodeSandbox', description: '온라인 IDE' },
      'netlify.com': { favicon: 'https://netlify.com/favicon.ico', name: 'Netlify', description: '웹 호스팅' },
      'vercel.com': { favicon: 'https://vercel.com/favicon.ico', name: 'Vercel', description: '웹 호스팅' },
      'heroku.com': { favicon: 'https://heroku.com/favicon.ico', name: 'Heroku', description: '클라우드 플랫폼' },
      'aws.amazon.com': { favicon: 'https://aws.amazon.com/favicon.ico', name: 'AWS', description: '클라우드 서비스' },
    };
    
    if (siteMap[domain]) {
      return { 
        favicon: siteMap[domain].favicon, 
        siteName: siteMap[domain].name,
        description: siteMap[domain].description
      };
    }
    
    // 기본 파비콘 URL 생성
    return { 
      favicon: `https://${domain}/favicon.ico`, 
      siteName: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) 
    };
  } catch {
    return null;
  }
};

export const PinHoverCard: React.FC<PinHoverCardProps> = ({
  pin,
  isVisible,
  position
}) => {
  if (!isVisible) return null;

  const urls = extractUrlsFromText(pin.description);
  const allMediaItems = [
    ...(pin.mediaItems || []),
    ...urls.map((url, index) => ({
      id: `extracted-${index}`,
      type: isImageUrl(url) ? 'image' as const : 
            isVideoUrl(url) ? 'video' as const : 'url' as const,
      url,
      name: url
    }))
  ];

  // 디버깅을 위한 로그
  console.log('🎯 PinHoverCard Debug:', {
    pinId: pin.id,
    title: pin.title,
    description: pin.description,
    mediaItems: pin.mediaItems,
    extractedUrls: urls,
    allMediaItems,
    urlTypes: urls.map(url => ({
      url,
      isImage: isImageUrl(url),
      isVideo: isVideoUrl(url)
    }))
  });

  // Position the card to avoid screen edges
  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x + 20,
    top: position.y - 10,
    zIndex: 9999,
    pointerEvents: 'none',
    maxWidth: '320px',
  };

  // Adjust position if too close to screen edges
  if (typeof window !== 'undefined') {
    if (position.x + 340 > window.innerWidth) {
      cardStyle.left = position.x - 340;
    }
    if (position.y - 200 < 0) {
      cardStyle.top = position.y + 30;
    }
  }

  const renderMediaPreview = (media: MediaItem) => {
    console.log('🖼️ Rendering media preview:', media);
    
    // 타입 재감지: 데이터베이스에 url로 저장되어있어도 실제 내용에 따라 다시 분류
    let actualType = media.type;
    if (media.type === 'url') {
      if (isImageUrl(media.url)) {
        actualType = 'image';
        console.log('🔄 Reclassified as image:', media.url);
      } else if (isVideoUrl(media.url)) {
        actualType = 'video';
        console.log('🔄 Reclassified as video:', media.url);
      }
    }
    
    switch (actualType) {
      case 'image':
        return (
          <div key={media.id} className="relative group">
            <img 
              src={media.url} 
              alt={media.name || 'Image'}
              className="w-full h-24 object-cover rounded-md"
              onLoad={() => console.log('✅ Image loaded successfully:', media.url)}
              onError={(e) => {
                console.log('❌ Image failed to load:', media.url);
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-md flex items-center justify-center">
              <Image className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        );
      
      case 'video':
        const videoThumbnail = getVideoThumbnail(media.url);
        console.log('📹 Video thumbnail:', { url: media.url, thumbnail: videoThumbnail });
        
        if (videoThumbnail) {
          return (
            <div key={media.id} className="relative group">
              <img 
                src={videoThumbnail}
                alt="Video thumbnail"
                className="w-full h-24 object-cover rounded-md"
                onLoad={() => console.log('✅ Video thumbnail loaded:', videoThumbnail)}
                onError={(e) => {
                  console.log('❌ Video thumbnail failed:', videoThumbnail);
                  // YouTube 고화질 썸네일 실패시 표준화질로 재시도
                  const currentSrc = e.currentTarget.src;
                  if (currentSrc.includes('hqdefault')) {
                    console.log('🔄 Retrying with standard quality');
                    e.currentTarget.src = currentSrc.replace('hqdefault', 'mqdefault');
                    return;
                  }
                  // 표준화질도 실패하면 숨김
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-40 transition-all duration-200 rounded-md flex items-center justify-center">
                <Video className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
              <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded text-center">
                <Video className="w-3 h-3 inline mr-1" />
                동영상
              </div>
            </div>
          );
        }
        // 비디오 파일인 경우 첫 번째 프레임 시도
        if (/\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)(\?.*)?$/i.test(media.url)) {
          console.log('📹 Trying to show video file with preview');
          return (
            <div key={media.id} className="relative group">
              <video
                src={media.url}
                className="w-full h-24 object-cover rounded-md bg-gray-100"
                preload="metadata"
                muted
                onError={() => console.log('❌ Video preview failed:', media.url)}
                onLoadedMetadata={() => console.log('✅ Video metadata loaded:', media.url)}
              />
              <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-40 transition-all duration-200 rounded-md flex items-center justify-center">
                <Video className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
              <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded">
                <Video className="w-3 h-3 inline mr-1" />
                동영상 파일
              </div>
            </div>
          );
        }
        
        console.log('📹 No thumbnail available, showing default video icon');
        return (
          <div key={media.id} className="w-full h-24 bg-gradient-to-br from-red-100 to-purple-100 rounded-md flex items-center justify-center group hover:from-red-200 hover:to-purple-200 transition-all duration-200">
            <div className="text-center">
              <Video className="w-8 h-8 text-red-600 mx-auto mb-1" />
              <span className="text-xs text-gray-600 font-medium">동영상</span>
            </div>
          </div>
        );
      
      case 'url':
        const websitePreview = getWebsitePreview(media.url);
        return (
          <div key={media.id} className="w-full p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md border border-blue-100 group hover:from-blue-100 hover:to-indigo-100 transition-all duration-200">
            <div className="flex items-start space-x-3">
              {websitePreview && (
                <img 
                  src={websitePreview.favicon} 
                  alt={`${websitePreview.siteName} favicon`}
                  className="w-5 h-5 flex-shrink-0 rounded mt-0.5"
                  onError={(e) => {
                    // 파비콘 로드 실패시 기본 아이콘으로 대체
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <ExternalLink className={`w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5 ${websitePreview ? 'hidden' : 'block'}`} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-blue-700 truncate">
                  {websitePreview?.siteName || new URL(media.url).hostname.replace('www.', '')}
                </div>
                {websitePreview?.description && (
                  <div className="text-xs text-blue-500 truncate mb-1 opacity-80">
                    {websitePreview.description}
                  </div>
                )}
                <div className="text-xs text-blue-600 truncate opacity-60">
                  {media.url.length > 35 ? media.url.substring(0, 35) + '...' : media.url}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return createPortal(
    <div 
      style={cardStyle}
      className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 transition-all duration-200 backdrop-blur-sm"
      data-testid="pin-hover-card"
    >
      {/* Header */}
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
          {pin.title}
        </h3>
        {pin.description && pin.description.trim() && (
          <p className="text-xs text-gray-600 line-clamp-3">
            {pin.description}
          </p>
        )}
      </div>

      {/* Media Preview */}
      {allMediaItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-1 mb-2">
            <FileText className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">
              미디어 ({allMediaItems.length}개)
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
            {allMediaItems.slice(0, 4).map(renderMediaPreview)}
            
            {allMediaItems.length > 4 && (
              <div className="w-full p-2 bg-gray-50 rounded-md text-center hover:bg-gray-100 transition-colors">
                <span className="text-xs text-gray-500 font-medium">
                  +{allMediaItems.length - 4}개 더 보기
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer hint */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-center space-x-1">
          <span className="text-xs text-gray-400">💡 클릭하여 자세히 보기</span>
        </div>
      </div>
    </div>,
    document.body
  );
};