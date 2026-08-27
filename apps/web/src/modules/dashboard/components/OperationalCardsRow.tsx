import React from 'react';
import { Calendar, Mail, ShieldCheck, Wallet, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActivityCurve } from './ActivityCurve';
import type { OperationalCardsData } from '../types';

export interface OperationalCardsRowProps {
  data: OperationalCardsData;
}

export const OperationalCardsRow: React.FC<OperationalCardsRowProps> = ({ data }) => {
  const navigate = useNavigate();

  const cards = [
    {
      id: 'services-due',
      title: 'SERVICES DUE TODAY',
      count: data.servicesDueToday,
      statusLabel: `${data.servicesUrgent} urgent`,
      statusColor: 'text-[#E53935] font-bold',
      icon: <Calendar className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#E53935]',
      curveColor: 'red' as const,
      dataPoints: data.history?.servicesDue || [6, 9, 7, 11, 8, 12, data.servicesDueToday],
      route: '/services',
    },
    {
      id: 'new-inquiries',
      title: 'NEW INQUIRIES',
      count: data.newInquiries,
      statusLabel: `${data.inquiriesUnread} unread`,
      statusColor: 'text-[#E53935] font-bold',
      icon: <Mail className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#1E88E5]',
      curveColor: 'blue' as const,
      dataPoints: data.history?.newInquiries || [3, 5, 4, 7, 6, 8, data.newInquiries],
      route: '/inquiries',
    },
    {
      id: 'warranties-expiring',
      title: 'WARRANTIES EXPIRING',
      count: data.warrantiesExpiring,
      statusLabel: 'Within threshold',
      statusColor: 'text-slate-500 font-semibold',
      icon: <ShieldCheck className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#FB8C00]',
      curveColor: 'orange' as const,
      dataPoints: data.history?.warrantiesExpiring || [5, 4, 6, 3, 5, 4, data.warrantiesExpiring],
      route: '/warranty',
    },
    {
      id: 'payments-due',
      title: 'PAYMENTS DUE',
      count: data.paymentsDue,
      statusLabel: `${data.paymentsOverdue} overdue`,
      statusColor: 'text-[#E53935] font-bold',
      icon: <Wallet className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#10B981]',
      curveColor: 'green' as const,
      dataPoints: data.history?.paymentsDue || [7, 6, 8, 5, 6, 5, data.paymentsDue],
      route: '/payments',
    },
    {
      id: 'technicians-duty',
      title: 'TECHNICIANS ON DUTY',
      count: data.techniciansOnDuty,
      statusLabel: `Available: ${data.techniciansAvailable}`,
      statusColor: 'text-[#10B981] font-bold',
      icon: <User className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#7E57C2]',
      curveColor: 'purple' as const,
      dataPoints: data.history?.techniciansOnDuty || [4, 5, 5, 6, 5, 6, data.techniciansOnDuty],
      route: '/technicians',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 select-none">
      {cards.map((card) => (
        <div
          key={card.id}
          onClick={() => navigate(card.route)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(card.route)}
          className="bg-white rounded-2xl border border-slate-100 p-4 pb-0 shadow-xs hover:shadow-md hover:border-slate-200 transition-all duration-150 cursor-pointer flex flex-col justify-between group overflow-hidden"
        >
          {/* Card Top: Circular Solid Icon on Left + Info on Right */}
          <div className="flex items-start gap-3.5 mb-1">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center ${card.iconBg} shadow-2xs group-hover:scale-105 transition-transform duration-150 shrink-0 mt-0.5`}
            >
              {card.icon}
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-slate-800 tracking-wider uppercase leading-tight">
                {card.title}
              </h3>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight block leading-tight mt-0.5">
                {card.count}
              </span>
              <span className={`text-[11px] block mt-0.5 leading-none ${card.statusColor}`}>
                {card.statusLabel}
              </span>
            </div>
          </div>

          {/* Card Bottom: Dynamic Responsive Activity Curve Line */}
          <div className="mt-auto -mx-4">
            <ActivityCurve color={card.curveColor} data={card.dataPoints} />
          </div>
        </div>
      ))}
    </div>
  );
};
