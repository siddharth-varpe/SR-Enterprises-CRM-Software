import React, { useState } from 'react';

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  formattedValue?: string;
  percentage?: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  totalLabel?: string;
  size?: number;
  thickness?: number;
  showLegend?: boolean;
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  totalLabel = 'Total',
  size = 170,
  thickness = 24,
  showLegend = true,
  className = '',
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  if (total === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400">
        No distribution data available.
      </div>
    );
  }

  // Calculate arc parameters
  const radius = size / 2;
  const normalizedRadius = radius - thickness / 2;
  const circumference = 2 * Math.PI * normalizedRadius;

  let accumulatedPercent = 0;

  const processedSegments = segments.map((seg) => {
    const percent = (seg.value / total) * 100;
    const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += percent;

    return {
      ...seg,
      percent: Math.round(percent),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSegment = hoveredId ? segments.find((s) => s.id === hoveredId) : null;

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-6 ${className}`}>
      {/* Donut SVG Ring */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={thickness}
          />
          {/* Segments */}
          {processedSegments.map((seg) => (
            <circle
              key={seg.id}
              cx={radius}
              cy={radius}
              r={normalizedRadius}
              fill="none"
              stroke={seg.color}
              strokeWidth={hoveredId === seg.id ? thickness + 4 : thickness}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoveredId(seg.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
          ))}
        </svg>

        {/* Central Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            {activeSegment ? activeSegment.label : totalLabel}
          </span>
          <span className="text-base font-bold text-slate-900">
            {activeSegment
              ? activeSegment.formattedValue || activeSegment.value
              : total.toLocaleString('en-IN')}
          </span>
          {activeSegment && (
            <span className="text-[10px] font-semibold text-slate-500">
              {Math.round((activeSegment.value / total) * 100)}% of total
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex-1 space-y-2 w-full min-w-[140px]">
          {processedSegments.map((seg) => {
            const isHovered = hoveredId === seg.id;
            return (
              <div
                key={seg.id}
                onMouseEnter={() => setHoveredId(seg.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isHovered ? 'bg-slate-100/80 font-semibold' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-slate-700">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 font-medium">
                    {seg.formattedValue || seg.value}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {seg.percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
