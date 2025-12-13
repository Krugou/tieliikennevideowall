import React, { useMemo } from 'react';
import { isRecent } from '../lib/api';

type Props = {
  name: string;
  municipality?: string;
  imageUrl?: string;
  latestModified?: string | null;
  showLabels?: boolean;
  cacheBuster?: number;
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
}) => {
  const recent = isRecent(latestModified);
  const src = useMemo(() => buildSrc(imageUrl, cacheBuster), [imageUrl, cacheBuster]);

  return (
    <article
      aria-label={name}
      className="relative rounded-md overflow-hidden bg-neutral-900 transition-transform transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-400"
      tabIndex={0}
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
          <div className="flex items-center justify-center w-full h-full text-neutral-400 bg-gradient-to-br from-neutral-800 to-neutral-900">
            <div className="text-center px-2">
              <div className="text-sm font-medium">{name}</div>
              <div className="text-xs opacity-70">{municipality}</div>
            </div>
          </div>
        )}
      </div>

      {showLabels && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs p-2 backdrop-blur-sm">
          <div className="font-medium truncate">{name}</div>
          {municipality && <div className="opacity-80 text-[11px] truncate">{municipality}</div>}
          {latestModified && (
            <div className="opacity-70 text-[10px]">Last: {new Date(latestModified).toLocaleString()}</div>
          )}
        </div>
      )}
    </article>
  );
};

export default React.memo(CameraTileInner);
