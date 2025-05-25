import React from 'react';

interface SidebarTitleProps {
  title: string;
}

export const SidebarTitle: React.FC<SidebarTitleProps> = ({ title }) => {
  return (
    <div className="sidebar-title">
      {title}
    </div>
  );
}; 