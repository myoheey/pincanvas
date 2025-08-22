import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  FileImage, 
  FileText,
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

interface CanvasExporterProps {
  canvasElementId: string;
  canvasTitle: string;
}

export const CanvasExporter: React.FC<CanvasExporterProps> = ({
  canvasElementId,
  canvasTitle,
}) => {
  const { toast } = useToast();

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
          PNG 이미지
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportAsImage('jpeg')}>
          <FileImage className="w-4 h-4 mr-2" />
          JPEG 이미지
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF}>
          <FileText className="w-4 h-4 mr-2" />
          PDF 파일
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};