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
  width = 60,
  height = 20,
  className = '',
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ width, height }}
        className={`flex items-center justify-center text-[9px] font-mono text-slate-500 opacity-60 ${className}`}
      >
        —
      </div>
    );
  }

  // Extract valid scores and original indices
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
        className={`flex items-center justify-center text-[9px] font-mono text-slate-500 opacity-60 ${className}`}
      >
        —
      </div>
    );
  }

  // Determine local dynamic scale bounds so even small variations (1-3 pts) produce a clear visible curve
  const scores = validPoints.map((p) => p.score);
  const dataMin = Math.min(...scores);
  const dataMax = Math.max(...scores);
  // Guarantee a minimum dynamic window of 4.0 points to prevent division by zero or jitter on identical scores
  const scoreRange = Math.max(dataMax - dataMin, 4.0);
  const minScore = dataMin - 0.5;

  const padX = 3;
  const padY = 2;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;
  const numSlots = Math.max(data.length - 1, 1);

  // Map each valid point to (x, y) coordinates
  const coords = validPoints.map((p) => {
    const x = padX + (p.index / numSlots) * usableW;
    const norm = Math.max(0, Math.min(1, (p.score - minScore) / scoreRange));
    const y = padY + (1 - norm) * usableH;
    return { ...p, x, y };
  });

  const latestPoint = coords[coords.length - 1];
  const latestScore = latestPoint.score;

  // Color selection based on latest score
  let strokeColor = '#10b981'; // emerald
  let fillColor = 'rgba(16, 185, 129, 0.20)';
  if (latestScore < warningTarget) {
    strokeColor = '#f43f5e'; // rose
    fillColor = 'rgba(244, 63, 94, 0.20)';
  } else if (latestScore < target) {
    strokeColor = '#f59e0b'; // amber
    fillColor = 'rgba(245, 158, 11, 0.20)';
  }

  // Build SVG path
  let pathD = '';
  if (coords.length === 1) {
    pathD = `M ${coords[0].x - 4} ${coords[0].y} L ${coords[0].x + 4} ${coords[0].y}`;
  } else {
    pathD = coords.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
      return `${acc} L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }, '');
  }

  // Build filled area path under the sparkline curve
  let areaD = '';
  if (coords.length > 1) {
    const firstX = coords[0].x.toFixed(1);
    const lastX = coords[coords.length - 1].x.toFixed(1);
    const bottomY = (height - padY).toFixed(1);
    areaD = `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  // Target reference line Y position (only draw if within visible dynamic range)
  const targetNorm = (target - minScore) / scoreRange;
  const showTargetLine = targetNorm >= 0 && targetNorm <= 1;
  const targetY = padY + (1 - targetNorm) * usableH;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible shrink-0 ${className}`}
      aria-label="Area score sparkline"
    >
      <title>{tooltip}</title>

      {/* Target reference dashed line (subtle) if within range */}
      {showTargetLine && (
        <line
          x1={padX}
          y1={targetY}
          x2={width - padX}
          y2={targetY}
          stroke="#10b981"
          strokeOpacity="0.3"
          strokeWidth="0.8"
          strokeDasharray="2,2"
        />
      )}

      {/* Area gradient under the line */}
      {areaD && <path d={areaD} fill={fillColor} />}

      {/* Main high-visibility trend line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Latest score point dot with dark rim */}
      {latestPoint && (
        <circle
          cx={latestPoint.x}
          cy={latestPoint.y}
          r="2.8"
          fill={strokeColor}
          stroke="#0f172a"
          strokeWidth="1.0"
        />
      )}
    </svg>
  );
};
