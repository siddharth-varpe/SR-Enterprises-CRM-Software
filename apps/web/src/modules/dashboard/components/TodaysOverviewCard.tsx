import React from 'react';
import { Calendar, Mail, ShieldCheck, Wallet, User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { OverviewCountsData } from '../types';

export interface TodaysOverviewCardProps {
  data: OverviewCountsData;
}

export const TodaysOverviewCard: React.FC<TodaysOverviewCardProps> = ({ data }) => {
  const navigate = useNavigate();

  const rows = [
    {
      id: 'services-scheduled',
      title: 'Services Scheduled',
      description: 'Total services scheduled for today',
      count: data.servicesScheduled,
      countColor: 'text-[#E53935]',
      icon: <Calendar className="w-5 h-5 text-[#E53935]" />,
      iconBg: 'bg-red-50 border border-red-100/80',
      route: '/services',
    },
    {
      id: 'website-inquiries',
      title: 'New Website Inquiries',
      description: 'New inquiries received from website',
      count: data.newInquiries,
      countColor: 'text-[#1E88E5]',
      icon: <Mail className="w-5 h-5 text-[#1E88E5]" />,
      iconBg: 'bg-blue-50 border border-blue-100/80',
      route: '/inquiries',
    },
    {
      id: 'warranties-expiring',
      title: 'Warranties Expiring Soon',
      description: 'Warranties expiring within threshold',
      count: data.warrantiesExpiring,
      countColor: 'text-[#FB8C00]',
      icon: <ShieldCheck className="w-5 h-5 text-[#FB8C00]" />,
      iconBg: 'bg-amber-50 border border-amber-100/80',
      route: '/warranty',
    },
    {
      id: 'payments-due',
      title: 'Payments Due',
      description: 'Payments due from customers',
      count: data.paymentsDue,
      countColor: 'text-[#E53935]',
      icon: <Wallet className="w-5 h-5 text-[#10B981]" />,
      iconBg: 'bg-emerald-50 border border-emerald-100/80',
      route: '/payments',
    },
    {
      id: 'technicians-duty',
      title: 'Technicians On Duty',
      description: 'Technicians available today',
      count: data.techniciansOnDuty,
      countColor: 'text-slate-900',
      icon: <User className="w-5 h-5 text-[#7E57C2]" />,
      iconBg: 'bg-purple-50 border border-purple-100/80',
      route: '/technicians',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-xs select-none flex flex-col justify-between h-full">
      {/* Header with Title and View All Action */}
      <div className="flex items-center justify-between pb-3.5 mb-2">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Today's Overview
        </h2>
        <button
          type="button"
          onClick={() => navigate('/services')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer px-3 py-1 rounded-lg shadow-2xs"
        >
          View All
        </button>
      </div>

      {/* 5 Operational Rows */}
      <div className="space-y-2 flex-1 flex flex-col justify-around">
        {rows.map((row) => (
          <div
            key={row.id}
            onClick={() => navigate(row.route)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(row.route)}
            className="py-2 flex items-center justify-between hover:bg-slate-50/60 rounded-xl px-2.5 -mx-2.5 transition-colors cursor-pointer group"
          >
            {/* Left: Colored Icon + Title & Description */}
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${row.iconBg} shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-150`}
              >
                {row.icon}
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  {row.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5">
                  {row.description}
                </p>
              </div>
            </div>

            {/* Right: Dynamic Count & Chevron */}
            <div className="flex items-center gap-3">
              <span className={`text-base sm:text-lg font-extrabold font-mono ${row.countColor}`}>
                {row.count}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
