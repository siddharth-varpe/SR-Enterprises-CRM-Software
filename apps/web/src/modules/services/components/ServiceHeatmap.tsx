import React, { useMemo } from 'react';
import { X, Sparkles, Flame } from 'lucide-react';
import type { HeatmapResponse } from '../services.api';

export interface ServiceHeatmapProps {
  data?: HeatmapResponse;
  isLoading?: boolean;
  selectedPeriod: 'year' | 'month' | 'week' | 'day';
  onPeriodChange: (period: 'year' | 'month' | 'week' | 'day') => void;
  selectedDate?: string; // YYYY-MM-DD
  onSelectDate: (dateStr?: string) => void;
}

function getSystemDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSystemDate(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '—';
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const ServiceHeatmap: React.FC<ServiceHeatmapProps> = ({
  data,
  isLoading,
  selectedPeriod,
  onPeriodChange,
  selectedDate,
  onSelectDate,
}) => {
  const todayStr = useMemo(() => {
    return getSystemDateString(new Date());
  }, []);

  // Map backend daily counts into quick lookup dictionary
  const activityMap = useMemo(() => {
    const map = new Map<string, any>();
    const list = Array.isArray(data?.dailyData)
      ? data.dailyData
      : Array.isArray((data?.dailyData as any)?.rows)
      ? (data?.dailyData as any).rows
      : [];

    for (const item of list) {
      if (item && item.date_str) {
        map.set(item.date_str, item);
      }
    }
    return map;
  }, [data]);

  // Generate calendar grid cells based on selectedPeriod
  const gridCells = useMemo(() => {
    const now = new Date();
    const cells: Array<{
      dateStr: string;
      date: Date;
      dayOfWeek: number;
      dayOfMonth: number;
      monthLabel: string;
      isToday: boolean;
      isSelected: boolean;
      activity?: any;
      intensity: 0 | 1 | 2 | 3 | 4;
    }> = [];

    let start: Date;
    let end: Date;

    if (selectedPeriod === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else if (selectedPeriod === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (selectedPeriod === 'week') {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - day);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else {
      // Day view (7-day window centered around today)
      start = new Date(now);
      start.setDate(now.getDate() - 3);
      end = new Date(now);
      end.setDate(now.getDate() + 3);
    }

    const current = new Date(start);
    while (current <= end) {
      const dStr = getSystemDateString(current);
      const activity = activityMap.get(dStr);
      const count = activity?.count || 0;

      let intensity: 0 | 1 | 2 | 3 | 4 = 0;
      if (count === 1) intensity = 1;
      else if (count >= 2 && count <= 3) intensity = 2;
      else if (count >= 4 && count <= 5) intensity = 3;
      else if (count >= 6 || (activity?.urgent_count || 0) > 0) intensity = 4;

      cells.push({
        dateStr: dStr,
        date: new Date(current),
        dayOfWeek: current.getDay(),
        dayOfMonth: current.getDate(),
        monthLabel: current.toLocaleString('default', { month: 'short' }),
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
        activity,
        intensity,
      });

      current.setDate(current.getDate() + 1);
    }

    return cells;
  }, [selectedPeriod, activityMap, todayStr, selectedDate]);

  // Aggregate stats in current view
  const summaryStats = useMemo(() => {
    let totalScheduled = 0;
    let totalWarranty = 0;
    let totalGeneral = 0;
    let totalUrgent = 0;

    for (const cell of gridCells) {
      if (cell.activity) {
        totalScheduled += cell.activity.count || 0;
        totalWarranty += cell.activity.warranty_count || 0;
        totalGeneral += cell.activity.general_count || 0;
        totalUrgent += cell.activity.urgent_count || 0;
      }
    }

    return { totalScheduled, totalWarranty, totalGeneral, totalUrgent };
  }, [gridCells]);

  const intensityClasses = {
    0: 'bg-slate-100 text-slate-400 border-slate-200/80 hover:bg-slate-200/90',
    1: 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200',
    2: 'bg-emerald-300 border-emerald-400 text-emerald-900 hover:bg-emerald-400',
    3: 'bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600 font-semibold',
    4: 'bg-emerald-700 border-emerald-800 text-white hover:bg-emerald-800 font-bold shadow-xs',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all">
      {/* Header with Title, Period Switcher, and Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Service Schedule Heatmap
                {selectedDate && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200 animate-fadeIn">
                    Filtering: {formatSystemDate(selectedDate)}
                    <button
                      onClick={() => onSelectDate(undefined)}
                      className="hover:text-primary-900 transition-colors p-0.5 rounded-full hover:bg-primary-100"
                      title="Clear date filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any day cell to view that date's service roster
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Time Period Tabs + Navigation */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-medium">
            {(['year', 'month', 'week', 'day'] as const).map((period) => (
              <button
                key={period}
                onClick={() => onPeriodChange(period)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all duration-150 ${
                  selectedPeriod === period
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="py-4">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center text-xs text-slate-400 gap-2">
            <Sparkles className="w-4 h-4 animate-spin text-primary-500" />
            Loading real-time service activity data...
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            {selectedPeriod === 'year' ? (
              /* Year View: Compact 52-week horizontal grid */
              <div className="min-w-[720px] flex flex-wrap gap-1.5 justify-start">
                {gridCells.map((cell) => {
                  const titleText = `${cell.dateStr}: ${cell.activity?.count || 0} services (${cell.activity?.warranty_count || 0} warranty, ${cell.activity?.general_count || 0} general)`;
                  return (
                    <button
                      key={cell.dateStr}
                      onClick={() => onSelectDate(cell.isSelected ? undefined : cell.dateStr)}
                      title={titleText}
                      className={`w-4 h-4 rounded-[3px] border transition-all duration-150 cursor-pointer relative group ${
                        intensityClasses[cell.intensity]
                      } ${
                        cell.isToday
                          ? 'ring-2 ring-blue-500 ring-offset-1 z-10'
                          : ''
                      } ${
                        cell.isSelected
                          ? 'ring-2 ring-primary-700 ring-offset-1 scale-125 z-20 shadow-md'
                          : ''
                      }`}
                    />
                  );
                })}
              </div>
            ) : (
              /* Month / Week / Day View: Rich interactive calendar grid with dates & counters */
              <div className="grid grid-cols-7 gap-2 min-w-[560px]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-center text-[11px] font-bold text-slate-700 uppercase py-1 tracking-wider">
                    {d}
                  </div>
                ))}

                {/* Pad empty days if month start isn't Sunday */}
                {selectedPeriod === 'month' &&
                  Array.from({ length: gridCells[0]?.dayOfWeek || 0 }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-14 rounded-xl border border-dashed border-slate-100 bg-slate-50/40" />
                  ))}

                {gridCells.map((cell) => {
                  const count = cell.activity?.count || 0;
                  const warrantyCount = cell.activity?.warranty_count || 0;

                  return (
                    <button
                      key={cell.dateStr}
                      onClick={() => onSelectDate(cell.isSelected ? undefined : cell.dateStr)}
                      className={`h-16 p-2 rounded-xl border flex flex-col justify-between transition-all duration-150 text-left relative group cursor-pointer ${
                        cell.isSelected
                          ? 'border-primary-600 bg-primary-50/70 ring-2 ring-primary-500 shadow-sm'
                          : cell.isToday
                          ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-400'
                          : count > 0
                          ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400 hover:shadow-xs'
                          : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Top Row: Date Number + Today tag */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-bold ${
                            cell.isToday
                              ? 'text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-md'
                              : cell.isSelected
                              ? 'text-primary-700 font-extrabold'
                              : 'text-slate-800'
                          }`}
                        >
                          {cell.dayOfMonth}
                        </span>

                        {cell.isToday && (
                          <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-tighter">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Bottom Row: Intensity indicator & Count Badge */}
                      <div className="flex items-center justify-between mt-auto">
                        {count > 0 ? (
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                count >= 4
                                  ? 'bg-emerald-600 text-white'
                                  : count >= 2
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {count} {count === 1 ? 'visit' : 'visits'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-normal">--</span>
                        )}

                        {warrantyCount > 0 && (
                          <span
                            className="w-2 h-2 rounded-full bg-purple-500"
                            title={`${warrantyCount} warranty service(s)`}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Heatmap Footer & Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">In View:</span>
            <span>{summaryStats.totalScheduled} scheduled</span>
            <span>•</span>
            <span className="text-purple-600 font-medium">{summaryStats.totalWarranty} warranty</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">{summaryStats.totalGeneral} general</span>
            {summaryStats.totalUrgent > 0 && (
              <>
                <span>•</span>
                <span className="text-rose-600 font-bold">{summaryStats.totalUrgent} urgent</span>
              </>
            )}
          </div>
        </div>

        {/* GitHub-style Legend */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-700 font-medium">Less</span>
          <span className="w-3.5 h-3.5 rounded-[2px] bg-slate-100 border border-slate-200" title="0 visits" />
          <span className="w-3.5 h-3.5 rounded-[2px] bg-emerald-100 border border-emerald-300" title="1 visit" />
          <span className="w-3.5 h-3.5 rounded-[2px] bg-emerald-300 border border-emerald-400" title="2-3 visits" />
          <span className="w-3.5 h-3.5 rounded-[2px] bg-emerald-500 border border-emerald-600" title="4-5 visits" />
          <span className="w-3.5 h-3.5 rounded-[2px] bg-emerald-700 border border-emerald-800" title="6+ visits" />
          <span className="text-[11px] text-slate-700 font-medium">More</span>
        </div>
      </div>
    </div>
  );
};
