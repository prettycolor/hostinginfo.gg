import { HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { EducationalModal } from './EducationalModal';
import { getEducationalContent } from '@/lib/educational-content';
import type { EducationalContent } from './EducationalModal';

interface InfoIconProps {
  topic: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  hideRecommendedSolutions?: boolean;
}

export function InfoIcon({ topic, className = '', size = 'sm', hideRecommendedSolutions = false }: InfoIconProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [content, setContent] = useState<EducationalContent | null>(null);

  const handleClick = () => {
    const educationalContent = getEducationalContent(topic);
    if (educationalContent) {
      setContent(educationalContent);
      setModalOpen(true);
    }
  };

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors duration-200 p-1 ${className}`}
        aria-label={`Learn more about ${topic}`}
        type="button"
      >
        <HelpCircle className={`${sizeClasses[size]} text-primary`} />
      </button>
      
      <EducationalModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        content={content}
        hideProducts={hideRecommendedSolutions}
      />
    </>
  );
}
