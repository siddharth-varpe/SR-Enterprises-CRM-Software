import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ScheduleAppointment } from '../types';

export interface TodaysScheduleCardProps {
  schedule: ScheduleAppointment[];
}

const getPriorityRank = (category?: string, priority?: string): number => {
  const p = (priority || category || '').toUpperCase();
  if (p.includes('URGENT') || p.includes('EMERGENCY')) return 1;
  if (p.includes('HIGH')) return 2;
  if (p.includes('WARRANTY')) return 3;
  if (p.includes('GENERAL') || p.includes('NORMAL')) return 4;
  if (p.includes('LOW')) return 5;
  return 4;
};

export const TodaysScheduleCard: React.FC<TodaysScheduleCardProps> = ({ schedule }) => {
  const navigate = useNavigate();

  // Sort schedule strictly from top to bottom:
  // 1. Active appointments first, sorted by priority (Urgent -> High -> Warranty -> General -> Low) then service time/date
  // 2. Completed appointments always attached to the bottom in grey
  const sortedSchedule = useMemo(() => {
    return [...schedule].sort((a, b) => {
      const aCompleted = (a.status || '').toLowerCase() === 'completed';
      const bCompleted = (b.status || '').toLowerCase() === 'completed';

      // 1. Completed services always go to the bottom
      if (!aCompleted && bCompleted) return -1;
      if (aCompleted && !bCompleted) return 1;

      // 2. Active services sorted by priority rank
      const rankA = getPriorityRank(a.category, a.priority);
      const rankB = getPriorityRank(b.category, b.priority);
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // 3. Sorted by service time / schedule date
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });
  }, [schedule]);

  const getItemStyle = (item: ScheduleAppointment) => {
    const isCompleted = (item.status || '').toLowerCase() === 'completed';

    if (isCompleted) {
      return {
        containerClass: 'opacity-70 hover:opacity-100 transition-opacity',
        dotColor: 'bg-slate-400',
        borderLeft: 'border-l-2 border-slate-300',
        cardBg: 'bg-slate-50/60 hover:bg-slate-100/70',
        badgeClass: 'text-slate-600 bg-slate-100 border border-slate-200 font-mono',
        badgeText: 'Completed',
      };
    }

    const rank = getPriorityRank(item.category, item.priority);

    if (rank === 1) {
      // Urgent / Emergency
      return {
        containerClass: 'opacity-100',
        dotColor: 'bg-red-600',
        borderLeft: 'border-l-2 border-red-600',
        cardBg: 'bg-white hover:bg-slate-50/80',
        badgeClass: 'text-red-800 bg-red-50 border border-red-200 font-mono',
        badgeText: item.category || 'Emergency',
      };
    }

    if (rank === 2) {
      // High Priority
      return {
        containerClass: 'opacity-100',
        dotColor: 'bg-amber-600',
        borderLeft: 'border-l-2 border-amber-600',
        cardBg: 'bg-white hover:bg-slate-50/80',
        badgeClass: 'text-amber-900 bg-amber-50 border border-amber-200 font-mono',
        badgeText: item.category || 'High',
      };
    }

    if (rank === 3) {
      // Warranty
      return {
        containerClass: 'opacity-100',
        dotColor: 'bg-teal-600',
        borderLeft: 'border-l-2 border-teal-600',
        cardBg: 'bg-white hover:bg-slate-50/80',
        badgeClass: 'text-teal-900 bg-teal-50 border border-teal-200 font-mono',
        badgeText: item.category || 'Warranty',
      };
    }

    // General / Normal / Low
    return {
      containerClass: 'opacity-100',
      dotColor: 'bg-sky-600',
      borderLeft: 'border-l-2 border-sky-600',
      cardBg: 'bg-white hover:bg-slate-50/80',
      badgeClass: 'text-sky-900 bg-sky-50 border border-sky-200 font-mono',
      badgeText: item.category || 'General',
    };
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs select-none flex flex-col justify-start h-full">
      {/* Header with Title and View Calendar Action */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-100/80 shrink-0">
        <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 tracking-tight">
          Today's Schedule
        </h2>
        <button
          type="button"
          onClick={() => navigate('/services')}
          className="text-xs font-bold text-primary-700 hover:text-primary-800 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer px-3 py-1 rounded-lg shadow-2xs"
        >
          View Calendar
        </button>
      </div>

      {/* Vertical Timeline List (Top to Bottom alignment) */}
      {sortedSchedule.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs font-medium">
          No appointments scheduled for today.
        </div>
      ) : (
        <div className="space-y-3 flex-1 flex flex-col justify-start">
          {sortedSchedule.map((item) => {
            const style = getItemStyle(item);

            return (
              <div
                key={item.id}
                onClick={() => navigate(`/services?id=${item.id}`)}
                className={`flex items-center gap-3 group cursor-pointer ${style.containerClass}`}
              >
                {/* Time Label on Left */}
                <span className="w-16 text-[11px] font-bold text-slate-700 shrink-0 text-left font-mono">
                  {item.time}
                </span>

                {/* Colored Dot on Timeline */}
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dotColor}`}
                />

                {/* Appointment Content Card */}
                <div
                  className={`flex-1 ${style.cardBg} border border-slate-200/80 ${style.borderLeft} rounded-r-xl rounded-l-xs p-2.5 px-3.5 transition-colors shadow-2xs flex items-center justify-between`}
                >
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight font-display">
                      {item.customerName}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 font-sans">
                      {item.serviceName} • {item.mode}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md leading-tight ${style.badgeClass}`}
                  >
                    {style.badgeText}
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
