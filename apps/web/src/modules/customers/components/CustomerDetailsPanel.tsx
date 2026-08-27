import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Droplets,
  ExternalLink,
  CheckCircle2,
  Wrench,
  FileText,
  Receipt,
} from 'lucide-react';
import type { CustomerRecord } from './CustomerTable';

export interface CustomerDetailsPanelProps {
  customer: CustomerRecord;
  onViewFullProfile?: (customer: CustomerRecord) => void;
  onMoreOptions?: (customer: CustomerRecord) => void;
}

export const CustomerDetailsPanel: React.FC<CustomerDetailsPanelProps> = ({
  customer,
  onViewFullProfile,
  onMoreOptions,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'services' | 'invoices' | 'payments'>('overview');

  const assetsCount = customer.assetsCount ?? (customer.assets?.length || 0);
  const servicesCount = customer.servicesCount ?? (customer.services?.length || 0);
  const invoicesCount = customer.invoicesCount ?? (customer.invoices?.length || 0);
  const paymentsCount = customer.paymentsCount ?? (customer.payments?.length || 0);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'assets', label: `Assets (${assetsCount})` },
    { id: 'services', label: `Services (${servicesCount})` },
    { id: 'invoices', label: `Invoices (${invoicesCount})` },
    { id: 'payments', label: `Payments (${paymentsCount})` },
  ] as const;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col gap-4.5 select-none sticky top-20">
      {/* 1. Panel Header: Avatar + Customer Name + ID + Status + 3-Dot Menu */}
      <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-primary-700 text-white font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0">
            {customer.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                {customer.fullName}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400 font-mono">
                {customer.customerNumber}
              </span>
              {customer.status === 'ACTIVE' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span>Active</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>Inactive</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top Right 3-dot Menu */}
        <button
          type="button"
          onClick={() => onMoreOptions?.(customer)}
          aria-label="More customer options"
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Customer Detail Tabs */}
      <div className="border-b border-slate-200/80 -mt-1">
        <nav className="flex space-x-4 overflow-x-auto no-scrollbar" aria-label="Customer tabs">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer relative ${
                  isSelected
                    ? 'text-[#1E88E5] border-b-2 border-[#1E88E5]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Contact Information */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              CONTACT INFORMATION
            </h3>
            <div className="space-y-2.5 text-xs">
              {/* Phone */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 border border-slate-100">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-medium block leading-none">
                    Phone
                  </span>
                  <span className="text-xs font-semibold text-slate-900 font-mono mt-0.5 block">
                    {customer.phone}
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 border border-slate-100">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-medium block leading-none">
                    Email
                  </span>
                  <span className="text-xs font-semibold text-slate-900 truncate mt-0.5 block">
                    {customer.email}
                  </span>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 border border-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-medium block leading-none">
                    Address
                  </span>
                  <span className="text-xs font-medium text-slate-700 leading-relaxed mt-0.5 block">
                    {customer.address}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Summary (2-Column Grid in subtle card) */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              SUMMARY
            </h3>
            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 grid grid-cols-2 gap-3.5">
              {/* Total Invoices */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  TOTAL INVOICES
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 block mt-0.5">
                  {customer.summary.totalInvoices}
                </span>
              </div>

              {/* Outstanding */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  OUTSTANDING
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-[#E53935] block mt-0.5">
                  {customer.summary.outstanding}
                </span>
              </div>

              {/* Last Service */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  LAST SERVICE
                </span>
                <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                  {customer.lastServiceDate || '—'}
                </span>
              </div>

              {/* Next Service */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  NEXT SERVICE
                </span>
                <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                  {customer.nextServiceDate || '—'}
                </span>
                {customer.nextServiceDays !== null && customer.nextServiceDays !== undefined && (
                  <span
                    className={`text-[10px] font-bold block mt-0.5 ${
                      customer.nextServiceDays === 'Expired' ? 'text-[#E53935]' : 'text-[#10B981]'
                    }`}
                  >
                    {customer.nextServiceDays === 'Expired' ? 'Expired' : `${customer.nextServiceDays} days left`}
                  </span>
                )}
              </div>

              {/* Active Warranty */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  ACTIVE WARRANTY
                </span>
                <span
                  className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${
                    customer.summary.activeWarranty === 'No' ? 'text-slate-600' : 'text-emerald-700'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3 h-3 ${
                      customer.summary.activeWarranty === 'No' ? 'text-slate-400' : 'text-[#10B981]'
                    }`}
                  />
                  <span>{customer.summary.activeWarranty}</span>
                </span>
              </div>

              {/* Customer Since */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  CUSTOMER SINCE
                </span>
                <span className="text-xs font-semibold text-slate-800 block mt-0.5">
                  {customer.summary.customerSince}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assets Tab Content */}
      {activeTab === 'assets' && (
        <div className="space-y-2 text-xs">
          {customer.assets && customer.assets.length > 0 ? (
            customer.assets.map((asset: any) => (
              <div key={asset.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                <Droplets className="w-4 h-4 text-[#1E88E5] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">
                      {asset.product?.name || asset.assetName || 'Water Purifier Asset'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {asset.status || 'Active'}
                    </span>
                  </div>
                  {asset.serialNumber && (
                    <span className="text-[11px] text-slate-500 block font-mono mt-0.5">
                      SN: {asset.serialNumber}
                    </span>
                  )}
                  {asset.purchaseDate && (
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Installed: {new Date(asset.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Droplets className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No assets registered</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No machines or spare parts linked to this customer.</p>
            </div>
          )}
        </div>
      )}

      {/* Services Tab Content */}
      {activeTab === 'services' && (
        <div className="space-y-2 text-xs">
          {customer.services && customer.services.length > 0 ? (
            customer.services.map((srv: any) => (
              <div key={srv.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{srv.serviceType || 'Maintenance Service'}</span>
                  <span className="text-[10px] font-bold text-emerald-700">{srv.status}</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {new Date(srv.scheduledDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {srv.technician ? ` • Tech: ${srv.technician.displayName || srv.technician.username}` : ''}
                </span>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Wrench className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No service history</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No maintenance or repair visits recorded yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Invoices Tab Content */}
      {activeTab === 'invoices' && (
        <div className="space-y-2 text-xs">
          {customer.invoices && customer.invoices.length > 0 ? (
            customer.invoices.map((inv: any) => (
              <div key={inv.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 font-mono block">{inv.invoiceNumber}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">
                    ₹ {parseFloat(inv.totalAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] font-bold ${inv.status === 'PAID' ? 'text-emerald-700' : 'text-[#E53935]'}`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <FileText className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No invoices generated</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No billing or tax invoices created for this customer.</p>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab Content */}
      {activeTab === 'payments' && (
        <div className="space-y-2 text-xs">
          {customer.payments && customer.payments.length > 0 ? (
            customer.payments.map((pmt: any) => (
              <div key={pmt.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 font-mono block">{pmt.paymentNumber || 'Receipt'}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(pmt.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {pmt.paymentMethod}
                  </span>
                </div>
                <span className="font-bold text-emerald-700">
                  ₹ {parseFloat(pmt.amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Receipt className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No payment receipts</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No payments or transaction receipts recorded.</p>
            </div>
          )}
        </div>
      )}

      {/* 4. Bottom Full-Width Outlined CTA: "View Full Profile" */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => onViewFullProfile?.(customer)}
          className="w-full py-2.5 px-4 bg-white hover:bg-blue-50/80 text-[#1E88E5] border border-[#1E88E5] font-bold text-xs sm:text-sm rounded-xl transition-all shadow-2xs text-center flex items-center justify-center gap-2 cursor-pointer group"
        >
          <span>View Full Profile</span>
          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
