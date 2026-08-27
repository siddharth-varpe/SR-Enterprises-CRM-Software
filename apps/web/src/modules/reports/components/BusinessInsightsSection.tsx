import React from 'react';
import { Sparkles, TrendingUp, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import type { BusinessInsightItem } from '../reports.types';

interface BusinessInsightsSectionProps {
  insights?: BusinessInsightItem[];
  onActionClick?: (category: string) => void;
}

const DEFAULT_INSIGHTS: BusinessInsightItem[] = [
  {
    id: 'ins-1',
    title: 'Strong Revenue Acceleration',
    message: 'Revenue increased 12.4% compared with previous period, driven primarily by Kent Grand Plus sales (28 units).',
    metric: '₹ 8,75,450',
    delta: '+12.4%',
    type: 'positive',
    category: 'revenue',
  },
  {
    id: 'ins-2',
    title: 'High Field Service SLA',
    message: 'Service completion improved by 20.4% with an average turnaround of 3.8 hours across active technicians.',
    metric: '92.3% SLA',
    delta: '+20.4%',
    type: 'positive',
    category: 'service',
  },
  {
    id: 'ins-3',
    title: 'Proactive Filter Maintenance',
    message: '14 customers have periodic filter replacements due within the next 7 days; automated WhatsApp reminders ready.',
    metric: '14 Accounts',
    type: 'warning',
    category: 'maintenance',
  },
  {
    id: 'ins-4',
    title: 'Cashflow Collection Health',
    message: 'Outstanding payments decreased by 8.5% with 91.4% realized cash collection rate.',
    metric: '₹ 4,250 Outstanding',
    delta: '-8.5%',
    type: 'positive',
    category: 'collection',
  },
];

export const BusinessInsightsSection: React.FC<BusinessInsightsSectionProps> = ({
  insights = DEFAULT_INSIGHTS,
  onActionClick,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Business Insights</h2>
            <p className="text-xs text-slate-500">Automated intelligence and strategic performance signals</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          AI SUMMARY
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {insights.map((insight) => {
          const isPositive = insight.type === 'positive';
          const isWarning = insight.type === 'warning';

          return (
            <div
              key={insight.id}
              className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isPositive
                        ? 'bg-emerald-50 text-emerald-600'
                        : isWarning
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                  </div>
                  {insight.delta && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isPositive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {insight.delta}
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-bold text-slate-900 mb-1">{insight.title}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">{insight.message}</p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 font-mono">{insight.metric}</span>
                <button
                  type="button"
                  onClick={() => onActionClick?.(insight.category)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
