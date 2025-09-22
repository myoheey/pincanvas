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
) => {
  const { toast } = useToast();

  // Helper functions for thumbnail generation
  const getVideoThumbnail = (url: string): string | null => {
    // YouTube 썸네일
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

    // Vimeo 썸네일
    const vimeoPatterns = [
      /vimeo\.com\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/
    ];

    for (const pattern of vimeoPatterns) {
      const match = url.match(pattern);
      if (match) {
        const videoId = match[1];
        return `https://vumbnail.com/${videoId}.jpg`;
      }
    }

    return null;
  };

  const getWebsitePreview = (url: string): { favicon: string; siteName: string } | null => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');

      const siteMap: { [key: string]: { favicon: string; name: string } } = {
        'github.com': { favicon: 'https://github.com/favicon.ico', name: 'GitHub' },
        'youtube.com': { favicon: 'https://youtube.com/favicon.ico', name: 'YouTube' },
        'vimeo.com': { favicon: 'https://vimeo.com/favicon.ico', name: 'Vimeo' },
        'twitter.com': { favicon: 'https://twitter.com/favicon.ico', name: 'Twitter' },
        'x.com': { favicon: 'https://x.com/favicon.ico', name: 'X' },
        'facebook.com': { favicon: 'https://facebook.com/favicon.ico', name: 'Facebook' },
        'instagram.com': { favicon: 'https://instagram.com/favicon.ico', name: 'Instagram' },
        'notion.so': { favicon: 'https://notion.so/favicon.ico', name: 'Notion' },
        'figma.com': { favicon: 'https://figma.com/favicon.ico', name: 'Figma' },
        'google.com': { favicon: 'https://google.com/favicon.ico', name: 'Google' }
      };

      if (siteMap[domain]) {
        return {
          favicon: siteMap[domain].favicon,
          siteName: siteMap[domain].name
        };
      }

      return {
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        siteName: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)
      };
    } catch {
      return null;
    }
  };

  const isVideoUrl = (url: string): boolean => {
    const videoExtensions = /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v)(\?.*)?$/i;
    if (videoExtensions.test(url)) return true;

    const videoPlatforms = [
      'youtube.com', 'youtu.be', 'm.youtube.com',
      'vimeo.com', 'player.vimeo.com',
      'twitch.tv', 'clips.twitch.tv',
      'dailymotion.com', 'dai.ly'
    ];

    return videoPlatforms.some(platform => url.includes(platform));
  };

  const exportAsImage = async (format: 'png' | 'jpeg') => {
    try {
      const canvasElement = document.getElementById(canvasElementId);
      if (!canvasElement) {
        throw new Error('캔버스 요소를 찾을 수 없습니다.');
      }

      const canvas = await html2canvas(canvasElement, {
        backgroundColor: '#ffffff',
        scale: 2, // High quality
        useCORS: true,
        allowTaint: true,
      });

      // Create download link
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

        ${Object.entries(pinsByLayer).map(([layerName, layerPins]) => `
          <div style="margin-bottom: 30px;">
            <h3 style="
              font-size: 18px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
            ">
              <span style="
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: ${layers.find(l => l.name === layerName)?.color || '#6b7280'};
                margin-right: 8px;
              "></span>
              ${layerName} (${layerPins.length}개)
            </h3>

            ${layerPins.map((pin, index) => `
              <div style="
                margin-bottom: 15px;
                padding: 15px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                background-color: #f9fafb;
              ">
                <div style="
                  font-weight: 600;
                  font-size: 16px;
                  color: #1f2937;
                  margin-bottom: 8px;
                ">${index + 1}. ${pin.title}</div>

                ${pin.description ? `
                  <div style="
                    color: #6b7280;
                    font-size: 14px;
                    margin-bottom: 12px;
                    line-height: 1.5;
                  ">${pin.description}</div>
                ` : ''}

                ${pin.mediaItems && pin.mediaItems.length > 0 ? `
                  <div style="
                    margin-top: 10px;
                  ">
                    <div style="
                      font-size: 12px;
                      color: #9ca3af;
                      margin-bottom: 8px;
                    ">첨부 파일 (${pin.mediaItems.length}개):</div>
                    <div style="
                      display: flex;
                      flex-wrap: wrap;
                      gap: 8px;
                    ">
                      ${pin.mediaItems.map(media => {
                        if (media.type === 'image') {
                          return `
                            <div style="
                              position: relative;
                              width: 60px;
                              height: 60px;
                              border: 1px solid #d1d5db;
                              border-radius: 4px;
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
                        } else if (media.type === 'video' || isVideoUrl(media.url)) {
                          const videoThumbnail = getVideoThumbnail(media.url);
                          if (videoThumbnail) {
                            return `
                              <div style="
                                position: relative;
                                width: 60px;
                                height: 60px;
                                border: 1px solid #d1d5db;
                                border-radius: 4px;
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
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                                <div style="
                                  display: none;
                                  width: 100%;
                                  height: 100%;
                                  align-items: center;
                                  justify-content: center;
                                  color: white;
                                  font-size: 10px;
                                  text-align: center;
                                  background-color: #1f2937;
                                ">▶<br/>동영상</div>
                                <div style="
                                  position: absolute;
                                  bottom: 2px;
                                  right: 2px;
                                  background-color: rgba(0,0,0,0.7);
                                  color: white;
                                  font-size: 8px;
                                  padding: 1px 3px;
                                  border-radius: 2px;
                                ">▶</div>
                              </div>
                            `;
                          } else {
                            return `
                              <div style="
                                width: 60px;
                                height: 60px;
                                border: 1px solid #d1d5db;
                                border-radius: 4px;
                                background-color: #1f2937;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-size: 10px;
                                text-align: center;
                              ">
                                ▶<br/>동영상
                              </div>
                            `;
                          }
                        } else if (media.type === 'url') {
                          const websitePreview = getWebsitePreview(media.url);
                          return `
                            <div style="
                              position: relative;
                              width: 60px;
                              height: 60px;
                              border: 1px solid #d1d5db;
                              border-radius: 4px;
                              overflow: hidden;
                              background-color: #3b82f6;
                            ">
                              ${websitePreview ? `
                                <img src="${websitePreview.favicon}"
                                     alt="${websitePreview.siteName}"
                                     style="
                                       width: 100%;
                                       height: 100%;
                                       object-fit: contain;
                                       background-color: white;
                                       padding: 8px;
                                     "
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                              ` : ''}
                              <div style="
                                ${websitePreview ? 'display: none;' : 'display: flex;'}
                                width: 100%;
                                height: 100%;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-size: 10px;
                                text-align: center;
                                background-color: #3b82f6;
                              ">🔗<br/>${websitePreview?.siteName || '링크'}</div>
                            </div>
                          `;
                        }
                        return '';
                      }).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `).join('')}

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
        // PDF는 별도 페이지로 구성
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        // 첫 페이지: 캔버스
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const canvasRatio = Math.min(pdfWidth / canvasImg.width, (pdfHeight - 20) / canvasImg.height);
        const canvasWidth = canvasImg.width * canvasRatio;
        const canvasHeight = canvasImg.height * canvasRatio;
        const canvasX = (pdfWidth - canvasWidth) / 2;
        const canvasY = 10;

        pdf.addImage(
          canvasImg.toDataURL('image/png'),
          'PNG',
          canvasX,
          canvasY,
          canvasWidth,
          canvasHeight
        );

        // 두 번째 페이지: 핀 정보
        pdf.addPage();

        const pinInfoRatio = Math.min(pdfWidth / pinInfoImg.width, (pdfHeight - 20) / pinInfoImg.height);
        const pinInfoWidth = pinInfoImg.width * pinInfoRatio;
        const pinInfoHeight = pinInfoImg.height * pinInfoRatio;
        const pinInfoX = (pdfWidth - pinInfoWidth) / 2;
        const pinInfoY = 10;

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
          PDF + 핀 정보
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};