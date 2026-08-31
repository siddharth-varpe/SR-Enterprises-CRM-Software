import React from 'react';
import { Search, Filter } from 'lucide-react';

interface RentalPaymentToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  paymentType: string;
  onPaymentTypeChange: (val: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (val: string) => void;
}

export const RentalPaymentToolbar: React.FC<RentalPaymentToolbarProps> = ({
  search,
  onSearchChange,
  paymentType,
  onPaymentTypeChange,
  paymentMethod,
  onPaymentMethodChange,
}) => {
  const typeTabs = [
    { label: 'All Rental Payments', value: 'ALL' },
    { label: 'Monthly Rent', value: 'MONTHLY_RENT' },
    { label: 'Security Deposit', value: 'SECURITY_DEPOSIT' },
    { label: 'Advance Rent', value: 'ADVANCE_RENT' },
  ];

  return (
    <div className="space-y-3">
      {/* Top row: Search + Payment Method Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Rental #, Customer, Receipt #, Serial # or Ref #..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />
            <select
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-medium"
            >
              <option value="ALL">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
              <option value="CARD">Card</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom row: Payment Type Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-200">
        {typeTabs.map((tab) => {
          const isActive = paymentType === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onPaymentTypeChange(tab.value)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
