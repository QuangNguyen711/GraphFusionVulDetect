import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TruncatedTextProps {
  text: string;
  className?: string;
  maxLines?: number;
  showTooltip?: boolean;
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({ 
  text, 
  className = "", 
  maxLines = 1,
  showTooltip = true 
}) => {
  const truncateClass = maxLines === 1 ? "truncate" : `line-clamp-${maxLines}`;
  
  if (!showTooltip) {
    return (
      <span className={`${truncateClass} break-words ${className}`}>
        {text}
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${truncateClass} break-words cursor-help ${className}`}>
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs break-words">
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TruncatedText;
