import React, { useMemo } from 'react';
import { isRecent } from '../lib/api';

type Props = {
  name: string;
  municipality?: string;
  imageUrl?: string;
  latestModified?: string | null;
  showLabels?: boolean;
  cacheBuster?: number;
  onClick?: () => void;
};

const buildSrc = (url?: string | undefined, cacheBuster?: number) => {
  if (!url) return undefined;
  if (typeof cacheBuster === 'number' && Number.isFinite(cacheBuster)) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}_cb=${cacheBuster}`;
  }
  return url;
};

const CameraTileInner: React.FC<Props> = ({
  name,
  municipality,
  imageUrl,
  latestModified,
  showLabels = true,
  cacheBuster,
  onClick,
}: Props) => {
  const recent = isRecent(latestModified);
  const src = useMemo(() => buildSrc(imageUrl, cacheBuster), [imageUrl, cacheBuster]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      aria-label={name}
      tabIndex={0}
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="tile relative rounded-md overflow-hidden bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transform transition-transform duration-200 ease-out will-change-transform z-0 cursor-pointer
                 group-hover:scale-95 hover:scale-105 hover:z-10 hover:shadow-2xl"
    >
      {recent && (
        <span
          title="Updated < 1h"
          className="absolute top-2 right-2 inline-block w-3 h-3 rounded-full bg-red-500 shadow animate-pulse ring-2 ring-red-400/50"
        />
      )}

      <div className={`w-full h-full ${recent ? 'ring-2 ring-red-400/10' : ''}`}>
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0.6';
            }}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-neutral-400 bg-gradient-to-br from-neutral-800 to-neutral-900 p-2">
            <div className="text-center px-2">
              <div className="text-sm font-medium truncate">{name}</div>
              <div className="text-[11px] opacity-70 truncate">{municipality}</div>
            </div>
          </div>
        )}
      </div>

      {showLabels && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[11px] sm:text-xs p-2 sm:p-2 backdrop-blur-sm">
          <div className="font-medium truncate">{name}</div>
          {municipality && <div className="opacity-80 text-[10px] truncate">{municipality}</div>}
          {latestModified && (
            <div className="opacity-70 text-[10px]">Last: {new Date(latestModified).toLocaleString()}</div>
          )}
        </div>
      )}
    </article>
  );
};

export default React.memo(CameraTileInner);
