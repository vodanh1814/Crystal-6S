import React from 'react';

export interface SparklinePoint {
  week: string;
  score: number | null;
}

interface AreaSparklineProps {
  data: SparklinePoint[];
  target?: number;
  warningTarget?: number;
  width?: number;
  height?: number;
  className?: string;
}

export const AreaSparkline: React.FC<AreaSparklineProps> = ({
  data = [],
  target = 95,
  warningTarget = 90,
  width = 54,
  height = 16,
  className = '',
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ width, height }}
        className={`flex items-center justify-center text-[8px] font-mono text-slate-500 opacity-60 ${className}`}
      >
        —
      </div>
    );
  }

  // Extract valid scores and indices
  const validPoints = data
    .map((d, index) => ({ ...d, index }))
    .filter((d) => d.score !== null && d.score !== undefined && !isNaN(d.score as number)) as Array<{
    week: string;
    score: number;
    index: number;
  }>;

  // Tooltip summary string
  const tooltip = data
    .map((d) => `${d.week}: ${d.score !== null && d.score !== undefined ? `${d.score}%` : '—'}`)
    .join(' · ');

  if (validPoints.length === 0) {
    return (
      <div
        style={{ width, height }}
        title={tooltip}
        className={`flex items-center justify-center text-[8px] font-mono text-slate-500 opacity-60 ${className}`}
      >
        —
      </div>
    );
  }

  // Determine scale bounds (clamp between min 75 and max 100 for consistent plant-wide scale)
  const minScore = Math.min(...validPoints.map((p) => p.score), 80);
  const maxScore = Math.max(...validPoints.map((p) => p.score), 100);
  const scoreRange = Math.max(maxScore - minScore, 10);

  const padX = 3;
  const padY = 2;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;
  const numSlots = Math.max(data.length - 1, 1);

  // Map each valid point to (x, y) coordinates
  const coords = validPoints.map((p) => {
    const x = padX + (p.index / numSlots) * usableW;
    const norm = (p.score - minScore) / scoreRange;
    const y = padY + (1 - norm) * usableH;
    return { ...p, x, y };
  });

  const latestPoint = coords[coords.length - 1];
  const latestScore = latestPoint.score;

  // Color selection based on latest score
  let strokeColor = '#10b981'; // emerald
  let fillColor = 'rgba(16, 185, 129, 0.15)';
  if (latestScore < warningTarget) {
    strokeColor = '#f43f5e'; // rose
    fillColor = 'rgba(244, 63, 94, 0.15)';
  } else if (latestScore < target) {
    strokeColor = '#f59e0b'; // amber
    fillColor = 'rgba(245, 158, 11, 0.15)';
  }

  // Build SVG path
  let pathD = '';
  if (coords.length === 1) {
    pathD = `M ${coords[0].x - 3} ${coords[0].y} L ${coords[0].x + 3} ${coords[0].y}`;
  } else {
    pathD = coords.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
      return `${acc} L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }, '');
  }

  // Build filled area path
  let areaD = '';
  if (coords.length > 1) {
    const firstX = coords[0].x.toFixed(1);
    const lastX = coords[coords.length - 1].x.toFixed(1);
    const bottomY = (height - padY).toFixed(1);
    areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  // Target reference line Y position
  const targetNorm = (target - minScore) / scoreRange;
  const targetY = padY + (1 - Math.max(0, Math.min(1, targetNorm))) * usableH;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible shrink-0 ${className}`}
      aria-label="Area score sparkline"
    >
      <title>{tooltip}</title>

      {/* Target reference dashed line (subtle) */}
      <line
        x1={padX}
        y1={targetY}
        x2={width - padX}
        y2={targetY}
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeWidth="0.7"
        strokeDasharray="2,2"
      />

      {/* Area gradient under the line */}
      {areaD && <path d={areaD} fill={fillColor} />}

      {/* Main trend line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Latest score point dot */}
      {latestPoint && (
        <circle
          cx={latestPoint.x}
          cy={latestPoint.y}
          r="2.2"
          fill={strokeColor}
          stroke="#0f172a"
          strokeWidth="0.8"
        />
      )}
    </svg>
  );
};
