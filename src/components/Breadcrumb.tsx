import React from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-1 text-[10px] uppercase tracking-wider font-extrabold text-zinc-500 mb-4 select-none">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="w-3 h-3 text-zinc-700" />}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="hover:text-[#14cfb4] transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-zinc-300">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
