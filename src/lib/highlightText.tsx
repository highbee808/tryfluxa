import React from "react";

export const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  
  return parts.map((part, index) => 
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 text-foreground px-1 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
};
