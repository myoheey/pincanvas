
import React from 'react';
import { Image } from 'lucide-react';

interface ImageIconProps {
  className?: string;
}

const ImageIcon: React.FC<ImageIconProps> = ({ className }) => {
  return <Image className={className} />;
};

export default ImageIcon;
