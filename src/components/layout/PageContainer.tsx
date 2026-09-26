import React from 'react';

interface PageContainerProps {
  children?: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`p-6 max-w-[1680px] mx-auto space-y-6 ${className}`}>
      {children}
    </div>
  );
}
