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

  // Sort schedule from top to bottom on priority basis:
  // Active appointments first (Urgent/Emergency -> High -> Warranty -> General -> Low), completed appointments at the bottom
  const sortedSchedule = useMemo(() => {
    return [...schedule].sort((a, b) => {
      const aCompleted = (a.status || '').toLowerCase() === 'completed';
      const bCompleted = (b.status || '').toLowerCase() === 'completed';

      // 1. Completed services always go to the bottom
      if (!aCompleted && bCompleted) return -1;
      if (aCompleted && !bCompleted) return 1;

      // 2. Active services sorted by priority rank (1: Urgent/Emergency -> 2: High -> 3: Warranty -> 4: General/Normal -> 5: Low)
      const rankA = getPriorityRank(a.category, a.priority);
      const rankB = getPriorityRank(b.category, b.priority);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return 0;
    });
  }, [schedule]);

  const getItemStyle = (item: ScheduleAppointment) => {
    const isCompleted = (item.status || '').toLowerCase() === 'completed';

    if (isCompleted) {
      return {
        containerClass: 'opacity-50 hover:opacity-80 transition-opacity',
        dotColor: 'bg-slate-400',
        borderLeft: 'border-l-2 border-slate-300',
        badgeClass: 'text-slate-600 bg-slate-100 border border-slate-200/80',
        badgeText: 'Completed',
      };
    }

    const rank = getPriorityRank(item.category, item.priority);

    if (rank === 1) {
      // Urgent / Emergency
      return {
        containerClass: 'opacity-100',
        dotColor: 'bg-[#E53935]',
        borderLeft: 'border-l-2 border-[#E53935]',
        badgeClass: 'text-[#E53935] bg-red-50 border border-red-100',
        badgeText: item.category || 'Emergency',
      };
    }

    if (rank === 2) {
      // High Priority
      return {
        containerClass: 'opacity-100',
        dotColor: 'bg-[#FB8C00]',
        borderLeft: 'border-l-2 border-[#FB8C00]',
        badgeClass: 'text-[#FB8C00] bg-amber-50 border border-amber-100',
        badgeText: item.category || 'High',
      };
    }

    if (rank === 3) {
      // Warranty
      return {
        containerClass: 'opacity-100',
        dotColor: 'bg-[#7E57C2]',
        borderLeft: 'border-l-2 border-[#7E57C2]',
        badgeClass: 'text-[#7E57C2] bg-purple-50 border border-purple-100',
        badgeText: item.category || 'Warranty',
      };
    }

    // General / Normal / Low
    return {
      containerClass: 'opacity-100',
      dotColor: 'bg-[#10B981]',
      borderLeft: 'border-l-2 border-[#10B981]',
      badgeClass: 'text-[#10B981] bg-emerald-50 border border-emerald-100',
      badgeText: item.category || 'General',
    };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-xs select-none flex flex-col justify-between h-full">
      {/* Header with Title and View Calendar Action */}
      <div className="flex items-center justify-between pb-3.5 mb-2">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Today's Schedule
        </h2>
        <button
          type="button"
          onClick={() => navigate('/services')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer px-3 py-1 rounded-lg shadow-2xs"
        >
          View Calendar
        </button>
      </div>

      {/* Vertical Timeline List */}
      {sortedSchedule.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs font-medium">
          No appointments scheduled for today.
        </div>
      ) : (
        <div className="space-y-2.5 flex-1 flex flex-col justify-around">
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
                  className={`flex-1 bg-white hover:bg-slate-50/70 border border-slate-100 ${style.borderLeft} rounded-r-xl rounded-l-xs p-2.5 px-3.5 transition-colors shadow-2xs flex items-center justify-between`}
                >
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">
                      {item.customerName}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
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

