import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Calendar, Users } from 'lucide-react';
import { formatNumber } from '../../../lib/formatters';
import type { WarrantyAnalytics, CustomerAnalytics } from '@crm/types';

interface WarrantyAlertsSectionProps {
  warrantyData?: WarrantyAnalytics;
  customerData?: CustomerAnalytics;
}

export const WarrantyAlertsSection: React.FC<WarrantyAlertsSectionProps> = ({
  warrantyData,
  customerData,
}) => {
  const activeWarranties = warrantyData?.activeWarranties ?? 0;
  const expiringSoon = warrantyData?.expiringIn30Days ?? warrantyData?.expiringWarranties ?? 0;
  const expiredWarranties = warrantyData?.expiredWarranties ?? 0;
  const serviceDue = customerData?.customersWithActiveServices ?? 0;
  const followUpPending = customerData?.customersWithOutstandingBalance ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Warranty &amp; Service Alerts</h2>
          <p className="text-xs text-slate-500">Proactive equipment lifecycle tracking and service renewal signals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* 1. Active Warranties */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Healthy
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium block">Active Warranties</span>
          <span className="text-lg font-bold text-slate-900 block mt-0.5">{formatNumber(activeWarranties)} Units</span>
          <span className="text-[11px] text-slate-400 mt-1 block">Full coverage active</span>
        </div>

        {/* 2. Expiring Soon */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              &lt; 30 Days
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium block">Expiring Soon</span>
          <span className="text-lg font-bold text-amber-900 block mt-0.5">{formatNumber(expiringSoon)} Units</span>
          <span className="text-[11px] text-amber-600 mt-1 block">AMC renewal candidates</span>
        </div>

        {/* 3. Expired Warranties */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              Expired
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium block">Expired Warranties</span>
          <span className="text-lg font-bold text-slate-900 block mt-0.5">{formatNumber(expiredWarranties)} Units</span>
          <span className="text-[11px] text-slate-400 mt-1 block">Out of warranty scope</span>
        </div>

        {/* 4. Service Due */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              Active Scope
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium block">Service Due</span>
          <span className="text-lg font-bold text-blue-900 block mt-0.5">{formatNumber(serviceDue)} Customers</span>
          <span className="text-[11px] text-blue-600 mt-1 block">Pre-booking alerts active</span>
        </div>

        {/* 5. Follow-ups Required */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
              Action
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium block">Follow-up Pending</span>
          <span className="text-lg font-bold text-purple-900 block mt-0.5">{formatNumber(followUpPending)} Accounts</span>
          <span className="text-[11px] text-purple-600 mt-1 block">Outstanding balance alerts</span>
        </div>
      </div>
    </div>
  );
};

