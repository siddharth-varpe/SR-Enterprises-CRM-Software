import React from 'react';
import { Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PaymentReminder } from '../types';

export interface PaymentRemindersSectionProps {
  reminders: PaymentReminder[];
}

export const PaymentRemindersSection: React.FC<PaymentRemindersSectionProps> = ({ reminders }) => {
  const navigate = useNavigate();

  const getStyleForCard = (index: number) => {
    switch (index) {
      case 0:
        return {
          avatarBg: 'bg-red-50 text-[#E53935] border border-red-100/80',
          dueColor: 'text-[#E53935]',
          iconBg: 'bg-red-50 text-[#E53935] border border-red-100/80',
        };
      case 1:
        return {
          avatarBg: 'bg-amber-50 text-[#FB8C00] border border-amber-100/80',
          dueColor: 'text-[#FB8C00]',
          iconBg: 'bg-amber-50 text-[#FB8C00] border border-amber-100/80',
        };
      case 2:
      default:
        return {
          avatarBg: 'bg-blue-50 text-[#1E88E5] border border-blue-100/80',
          dueColor: 'text-[#E53935]',
          iconBg: 'bg-blue-50 text-[#1E88E5] border border-blue-100/80',
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-xs select-none">
      {/* Header with Title and View All Action */}
      <div className="flex items-center justify-between pb-3.5 mb-2">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Payment Reminders
        </h2>
        <button
          type="button"
          onClick={() => navigate('/payments')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer px-3 py-1 rounded-lg shadow-2xs"
        >
          View All
        </button>
      </div>

      {/* Horizontal List/Grid of Payment Reminder Cards */}
      {reminders.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs font-medium">
          No pending payment reminders at this time.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reminders.map((item, index) => {
            const style = getStyleForCard(index);

            return (
              <div
                key={item.id}
                onClick={() => navigate('/invoices')}
                className="bg-white hover:bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 transition-all duration-150 cursor-pointer flex items-center justify-between group shadow-2xs hover:shadow-xs hover:border-slate-300"
              >
                {/* Left: Customer Initials Avatar + Info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-150 ${style.avatarBg}`}
                  >
                    {item.initials}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      {item.customerName}
                    </h3>
                    <p className={`text-[11px] font-semibold mt-0.5 ${style.dueColor}`}>
                      {item.dueTiming}
                    </p>
                  </div>
                </div>

                {/* Right: Amount, Invoice Reference & Calendar Icon */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono block leading-tight">
                      {item.formattedAmount}
                    </span>
                    <span className="text-[10.5px] font-mono font-medium text-slate-400 block mt-0.5">
                      {item.invoiceNumber}
                    </span>
                  </div>
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.iconBg}`}
                  >
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
