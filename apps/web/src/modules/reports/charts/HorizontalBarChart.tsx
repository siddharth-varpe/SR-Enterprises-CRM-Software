import React from 'react';

export interface HorizontalBarItem {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  formattedValue: string;
  secondaryFormattedValue?: string;
  percentage: number;
  colorClass?: string;
}

interface HorizontalBarChartProps {
  items: HorizontalBarItem[];
  className?: string;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  items,
  className = '',
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-400">
        No ranking data available.
      </div>
    );
  }

  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={`space-y-3.5 ${className}`}>
      {items.map((item) => {
        const barWidth = Math.max(4, Math.round((item.value / maxVal) * 100));

        return (
          <div key={item.id} className="space-y-1.5 group">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-slate-900 truncate">{item.label}</span>
                {item.sublabel && (
                  <span className="text-[11px] text-slate-400 truncate">({item.sublabel})</span>
                )}
              </div>
              <div className="flex items-center gap-2.5 shrink-0 ml-2">
                <span className="font-bold text-slate-900">{item.formattedValue}</span>
                {item.secondaryFormattedValue && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {item.secondaryFormattedValue}
                  </span>
                )}
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  {item.percentage}%
                </span>
              </div>
            </div>

            {/* Bar Track & Fill */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  item.colorClass || 'bg-blue-600 group-hover:bg-blue-700'
                }`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
