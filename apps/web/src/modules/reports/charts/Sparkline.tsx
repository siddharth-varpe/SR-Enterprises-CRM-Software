import React from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = '#3B82F6',
  width = 60,
  height = 24,
  strokeWidth = 2,
  className = '',
}) => {
  if (!data || data.length === 0) {
    return <div className={`w-[${width}px] h-[${height}px]`} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const padding = strokeWidth * 1.5;
  const usableHeight = height - padding * 2;
  const step = (width - padding * 2) / (data.length - 1 || 1);

  const points = data.map((val, idx) => {
    const x = padding + idx * step;
    const y = height - padding - ((val - min) / range) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathString = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point}`;
    // Generate smooth cubic bezier approximation
    const prev = arr[i - 1]!.split(',').map(Number);
    const curr = point.split(',').map(Number);
    const cp1x = (prev[0]! + (curr[0]! - prev[0]!) / 2).toFixed(1);
    const cp1y = prev[1]!.toFixed(1);
    const cp2x = (prev[0]! + (curr[0]! - prev[0]!) / 2).toFixed(1);
    const cp2y = curr[1]!.toFixed(1);
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr[0]!.toFixed(1)} ${curr[1]!.toFixed(1)}`;
  }, '');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path
        d={pathString}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
