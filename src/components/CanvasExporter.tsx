import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Download,
  FileImage,
  FileText,
  List,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'url';
  url: string;
  name?: string;
}

interface PinTemplate {
  id: string;
  name: string;
  shape: 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'custom';
  color: string;
  size: 'small' | 'medium' | 'large';
}

interface PinData {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  layerId: string;
  template?: PinTemplate;
  mediaItems?: MediaItem[];
}

interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

interface CanvasExporterProps {
  canvasElementId: string;
  canvasTitle: string;
  pins: PinData[];
  layers: Layer[];
}

export const CanvasExporter: React.FC<CanvasExporterProps> = ({
  canvasElementId,
  canvasTitle,
  pins,
  layers,
}) => {
  const { toast } = useToast();

  // PinHoverCard와 동일한 helper functions
  const extractUrlsFromText = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const isImageUrl = (url: string): boolean => {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)(\?.*)?$/i;
    if (imageExtensions.test(url)) return true;

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
    const videoExtensions = /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)(\?.*)?$/i;
    if (videoExtensions.test(url)) return true;

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
        return `https://www.dailymotion.com/thumbnail/video/${videoId}`;
      }
    }

    // Twitch 클립 썸네일 시도
    if (url.includes('clips.twitch.tv')) {
      const clipIdMatch = url.match(/clips\.twitch\.tv\/([^\/\?]+)/);
      if (clipIdMatch) {
        // Twitch는 공식 API가 필요하므로 일단 null 반환
        return null;
      }
    }

    // 비디오 파일의 경우 (mp4, webm 등)
    if (/\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)(\?.*)?$/i.test(url)) {
      return null; // 비디오 파일은 썸네일 생성 불가
    }

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

      return {
        favicon: `https://${domain}/favicon.ico`,
        siteName: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)
      };
    } catch {
      return null;
    }
  };

  const exportAsImage = async (format: 'png' | 'jpeg') => {
    try {
      const canvasElement = document.getElementById(canvasElementId);
      if (!canvasElement) {
        throw new Error('캔버스 요소를 찾을 수 없습니다.');
      }

      const canvas = await html2canvas(canvasElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const link = document.createElement('a');
      link.download = `${canvasTitle}.${format}`;
      link.href = canvas.toDataURL(`image/${format}`, 0.9);
      link.click();

      toast({
        title: "이미지 출력 완료",
        description: `${format.toUpperCase()} 파일이 다운로드되었습니다.`,
      });
    } catch (error) {
      console.error('Error exporting image:', error);
      toast({
        title: "출력 실패",
        description: "이미지 출력 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const createPinInfoLayout = () => {
    // 레이어별로 핀 그룹화
    const pinsByLayer = pins.reduce((acc, pin) => {
      const layer = layers.find(l => l.id === pin.layerId);
      const layerName = layer?.name || '알 수 없는 레이어';
      if (!acc[layerName]) {
        acc[layerName] = [];
      }
      acc[layerName].push(pin);
      return acc;
    }, {} as Record<string, PinData[]>);

    return `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 20px;
        background: #ffffff;
        min-height: 500px;
      ">
        <h2 style="
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          color: #1f2937;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
        ">${canvasTitle}</h2>

        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        ">
          ${Object.entries(pinsByLayer).map(([layerName, layerPins]) => `
            <div style="
              break-inside: avoid;
              background-color: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 16px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            ">
              <h3 style="
                font-size: 16px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                border-bottom: 1px solid #f3f4f6;
                padding-bottom: 8px;
              ">
                <span style="
                  width: 10px;
                  height: 10px;
                  border-radius: 50%;
                  background-color: ${layers.find(l => l.name === layerName)?.color || '#6b7280'};
                  margin-right: 6px;
                "></span>
                ${layerName} (${layerPins.length}개)
              </h3>

              ${layerPins.map((pin, index) => {
              // PinHoverCard와 동일한 로직으로 미디어 아이템 처리
              const urls = extractUrlsFromText(pin.description);
              const allMediaItems = [
                ...(pin.mediaItems || []),
                ...urls.map((url, urlIndex) => ({
                  id: `extracted-${urlIndex}`,
                  type: isImageUrl(url) ? 'image' as const :
                        isVideoUrl(url) ? 'video' as const : 'url' as const,
                  url,
                  name: url
                }))
              ];

              return `
                <div style="
                  margin-bottom: 12px;
                  padding: 12px;
                  border: 1px solid #e5e7eb;
                  border-radius: 6px;
                  background-color: #f9fafb;
                ">
                  <div style="
                    font-weight: 600;
                    font-size: 14px;
                    color: #1f2937;
                    margin-bottom: 6px;
                  ">${index + 1}. ${pin.title}</div>

                  ${pin.description ? `
                    <div style="
                      color: #6b7280;
                      font-size: 12px;
                      margin-bottom: 8px;
                      line-height: 1.4;
                    ">${pin.description}</div>
                  ` : ''}

                  ${allMediaItems.length > 0 ? `
                    <div style="
                      margin-top: 8px;
                    ">
                      <div style="
                        font-size: 10px;
                        color: #9ca3af;
                        margin-bottom: 6px;
                      ">첨부 파일 (${allMediaItems.length}개):</div>
                      <div style="
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6px;
                      ">
                        ${allMediaItems.slice(0, 6).map(media => {
                          // 타입 재감지
                          let actualType = media.type;
                          if (media.type === 'url') {
                            if (isImageUrl(media.url)) {
                              actualType = 'image';
                            } else if (isVideoUrl(media.url)) {
                              actualType = 'video';
                            }
                          }

                          if (actualType === 'image') {
                            return `
                              <div style="
                                position: relative;
                                width: 50px;
                                height: 50px;
                                border: 1px solid #d1d5db;
                                border-radius: 3px;
                                overflow: hidden;
                                background-color: #f3f4f6;
                              ">
                                <img src="${media.url}"
                                     alt="${media.name || 'Image'}"
                                     style="
                                       width: 100%;
                                       height: 100%;
                                       object-fit: cover;
                                     "
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                <div style="
                                  display: none;
                                  width: 100%;
                                  height: 100%;
                                  align-items: center;
                                  justify-content: center;
                                  font-size: 10px;
                                  color: #9ca3af;
                                  text-align: center;
                                  background-color: #f3f4f6;
                                ">이미지</div>
                              </div>
                            `;
                          } else if (actualType === 'video') {
                            const videoThumbnail = getVideoThumbnail(media.url);
                            if (videoThumbnail) {
                              return `
                                <div style="
                                  position: relative;
                                  width: 50px;
                                  height: 50px;
                                  border: 1px solid #d1d5db;
                                  border-radius: 3px;
                                  overflow: hidden;
                                  background-color: #1f2937;
                                ">
                                  <img src="${videoThumbnail}"
                                       alt="Video thumbnail"
                                       style="
                                         width: 100%;
                                         height: 100%;
                                         object-fit: cover;
                                       "
                                       onerror="
                                         const currentSrc = this.src;
                                         if (currentSrc.includes('hqdefault')) {
                                           this.src = currentSrc.replace('hqdefault', 'mqdefault');
                                           return;
                                         }
                                         this.style.display='none';
                                         this.nextElementSibling.style.display='block';
                                       " />
                                  <div style="
                                    display: none;
                                    width: 100%;
                                    height: 100%;
                                    align-items: center;
                                    justify-content: center;
                                    color: white;
                                    font-size: 8px;
                                    text-align: center;
                                    background: linear-gradient(135deg, #ef4444 0%, #7c3aed 100%);
                                  ">▶<br/>동영상</div>
                                  <div style="
                                    position: absolute;
                                    bottom: 2px;
                                    right: 2px;
                                    background-color: rgba(0,0,0,0.7);
                                    color: white;
                                    font-size: 6px;
                                    padding: 1px 2px;
                                    border-radius: 2px;
                                  ">▶</div>
                                </div>
                              `;
                            }
                            // 비디오 파일인 경우 첫 번째 프레임 시도 (PinHoverCard와 동일)
                            if (/\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)(\?.*)?$/i.test(media.url)) {
                              // HTML2Canvas에서 video 렌더링이 어려우므로 단순한 비디오 아이콘 표시
                              const fileName = media.url.split('/').pop()?.split('.')[0] || '동영상';
                              const fileExt = media.url.split('.').pop()?.toUpperCase() || 'VIDEO';

                              return `
                                <div style="
                                  width: 50px;
                                  height: 50px;
                                  border: 1px solid #d1d5db;
                                  border-radius: 3px;
                                  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  flex-direction: column;
                                  position: relative;
                                  overflow: hidden;
                                ">
                                  <div style="
                                    color: white;
                                    font-size: 16px;
                                    margin-bottom: 3px;
                                    text-shadow: 0 1px 3px rgba(0,0,0,0.5);
                                  ">▶</div>
                                  <div style="
                                    color: white;
                                    font-size: 6px;
                                    text-align: center;
                                    opacity: 0.9;
                                    font-weight: 500;
                                  ">${fileExt}</div>
                                  <div style="
                                    position: absolute;
                                    bottom: 2px;
                                    right: 2px;
                                    background-color: rgba(239, 68, 68, 0.9);
                                    color: white;
                                    font-size: 6px;
                                    padding: 1px 3px;
                                    border-radius: 2px;
                                    font-weight: 500;
                                  ">📹</div>
                                </div>
                              `;
                            }
                            return `
                              <div style="
                                width: 50px;
                                height: 50px;
                                border: 1px solid #d1d5db;
                                border-radius: 3px;
                                background: linear-gradient(135deg, #ef4444 0%, #7c3aed 100%);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-size: 8px;
                                text-align: center;
                              ">▶<br/>동영상</div>
                            `;
                          } else if (actualType === 'url') {
                            // 웹사이트는 도메인명만 한줄로 표시
                            const domain = new URL(media.url).hostname.replace('www.', '');

                            return `
                              <div style="
                                width: 90%;
                                height: 25px;
                                border: 1px solid #d1d5db;
                                border-radius: 3px;
                                background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
                                display: flex;
                                align-items: center;
                                justify-content: flex-start;
                                padding: 4px 8px;
                                overflow: hidden;
                                margin: 2px 0;
                              ">
                                <div style="
                                  font-size: 9px;
                                  color: #1e40af;
                                  text-align: left;
                                  line-height: 1.2;
                                  white-space: nowrap;
                                  font-weight: 500;
                                ">${domain}</div>
                              </div>
                            `;
                          }
                          return '';
                        }).join('')}
                        ${allMediaItems.length > 6 ? `
                          <div style="
                            width: 50px;
                            height: 50px;
                            border: 1px solid #d1d5db;
                            border-radius: 3px;
                            background-color: #f3f4f6;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 8px;
                            color: #6b7280;
                            text-align: center;
                          ">+${allMediaItems.length - 6}<br/>더</div>
                        ` : ''}
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
            </div>
          `).join('')}
        </div>

        <div style="
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
        ">
          총 ${pins.length}개의 핀 • ${layers.filter(l => l.visible).length}개의 활성 레이어
        </div>
      </div>
    `;
  };

  const exportWithPinInfo = async (format: 'png' | 'jpeg' | 'pdf') => {
    try {
      const canvasElement = document.getElementById(canvasElementId);
      if (!canvasElement) {
        throw new Error('캔버스 요소를 찾을 수 없습니다.');
      }

      // 캔버스 이미지 생성
      const canvasImg = await html2canvas(canvasElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      // 핀 정보 HTML 생성
      const pinInfoHtml = createPinInfoLayout();

      // 임시 요소 생성하여 핀 정보 렌더링
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '400px';
      tempContainer.innerHTML = pinInfoHtml;
      document.body.appendChild(tempContainer);

      // 핀 정보 이미지 생성
      const pinInfoImg = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      // 임시 요소 제거
      document.body.removeChild(tempContainer);

      if (format === 'pdf') {
        // PDF는 가로 배치로 한 페이지에
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // 캔버스와 핀정보를 좌우로 배치
        const canvasRatio = Math.min((pdfWidth * 0.6) / canvasImg.width, (pdfHeight - 20) / canvasImg.height);
        const canvasWidth = canvasImg.width * canvasRatio;
        const canvasHeight = canvasImg.height * canvasRatio;
        const canvasX = 10;
        const canvasY = (pdfHeight - canvasHeight) / 2;

        const pinInfoRatio = Math.min((pdfWidth * 0.35) / pinInfoImg.width, (pdfHeight - 20) / pinInfoImg.height);
        const pinInfoWidth = pinInfoImg.width * pinInfoRatio;
        const pinInfoHeight = pinInfoImg.height * pinInfoRatio;
        const pinInfoX = canvasX + canvasWidth + 10;
        const pinInfoY = (pdfHeight - pinInfoHeight) / 2;

        pdf.addImage(
          canvasImg.toDataURL('image/png'),
          'PNG',
          canvasX,
          canvasY,
          canvasWidth,
          canvasHeight
        );

        pdf.addImage(
          pinInfoImg.toDataURL('image/png'),
          'PNG',
          pinInfoX,
          pinInfoY,
          pinInfoWidth,
          pinInfoHeight
        );

        pdf.save(`${canvasTitle}_상세정보.pdf`);

        toast({
          title: "PDF 출력 완료",
          description: "캔버스와 핀 정보가 포함된 PDF가 다운로드되었습니다.",
        });
      } else {
        // 이미지는 좌우 배치
        const combinedCanvas = document.createElement('canvas');
        const ctx = combinedCanvas.getContext('2d')!;

        const canvasWidth = canvasImg.width;
        const canvasHeight = canvasImg.height;
        const pinInfoWidth = pinInfoImg.width;
        const pinInfoHeight = pinInfoImg.height;

        // 높이를 맞춤
        const maxHeight = Math.max(canvasHeight, pinInfoHeight);
        combinedCanvas.width = canvasWidth + pinInfoWidth + 40; // 40px 간격
        combinedCanvas.height = maxHeight;

        // 배경색 설정
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

        // 캔버스 그리기
        const canvasY = (maxHeight - canvasHeight) / 2;
        ctx.drawImage(canvasImg, 0, canvasY);

        // 핀 정보 그리기
        const pinInfoY = (maxHeight - pinInfoHeight) / 2;
        ctx.drawImage(pinInfoImg, canvasWidth + 40, pinInfoY);

        // 다운로드
        const link = document.createElement('a');
        link.download = `${canvasTitle}_상세정보.${format}`;
        link.href = combinedCanvas.toDataURL(`image/${format}`, 0.9);
        link.click();

        toast({
          title: "이미지 출력 완료",
          description: `캔버스와 핀 정보가 포함된 ${format.toUpperCase()} 파일이 다운로드되었습니다.`,
        });
      }
    } catch (error) {
      console.error('Error exporting with pin info:', error);
      toast({
        title: "출력 실패",
        description: "통합 출력 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const exportAsPDF = async () => {
    try {
      const canvasElement = document.getElementById(canvasElementId);
      if (!canvasElement) {
        throw new Error('캔버스 요소를 찾을 수 없습니다.');
      }

      const canvas = await html2canvas(canvasElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = (pdfHeight - imgHeight * ratio) / 2;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${canvasTitle}.pdf`);

      toast({
        title: "PDF 출력 완료",
        description: "PDF 파일이 다운로드되었습니다.",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "출력 실패",
        description: "PDF 출력 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          출력
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => exportAsImage('png')}>
          <FileImage className="w-4 h-4 mr-2" />
          PNG 이미지 (캔버스만)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportAsImage('jpeg')}>
          <FileImage className="w-4 h-4 mr-2" />
          JPEG 이미지 (캔버스만)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF}>
          <FileText className="w-4 h-4 mr-2" />
          PDF 파일 (캔버스만)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportWithPinInfo('png')}>
          <List className="w-4 h-4 mr-2" />
          PNG + 핀 정보
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportWithPinInfo('jpeg')}>
          <List className="w-4 h-4 mr-2" />
          JPEG + 핀 정보
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportWithPinInfo('pdf')}>
          <FileText className="w-4 h-4 mr-2" />
          PDF + 핀 정보 (한 페이지)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};