import React from 'react';
import { X, ShoppingCart, Calendar, User, Phone, Layers, FileText, Clock, TrendingUp, CheckCircle } from 'lucide-react';
import type { InventorySale } from '../inventory.api';

interface ViewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: InventorySale | null;
  onEdit?: () => void;
}

export const ViewSaleModal: React.FC<ViewSaleModalProps> = ({
  isOpen,
  onClose,
  sale,
  onEdit,
}) => {
  if (!isOpen || !sale) return null;

  const totalSale = Number(sale.totalSaleAmount || 0);
  const totalCost = Number(sale.totalCostAmount || 0);
  const profit = Number(sale.profit || 0);
  const marginPercent = totalSale > 0 ? ((profit / totalSale) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50/70 to-teal-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">Sale Details</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800">
                  {sale.saleNumber}
                </span>
              </div>
              <p className="text-xs text-gray-500">Outward stock transaction & profit report</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Item Card */}
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Item Sold</span>
                <div className="text-sm font-bold text-gray-900 mt-0.5">{sale.itemName || 'Inventory Item'}</div>
              </div>
              {sale.category && (
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
                  {sale.category}
                </span>
              )}
            </div>
            {(sale.brand || sale.partNumber) && (
              <div className="flex gap-4 mt-2 text-gray-500">
                {sale.brand && <span>Brand: <strong className="text-gray-700">{sale.brand}</strong></span>}
                {sale.partNumber && <span>Part #: <strong className="text-gray-700 font-mono">{sale.partNumber}</strong></span>}
              </div>
            )}
          </div>

          {/* Customer & Date Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <User className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Customer</span>
              </div>
              <div className="font-semibold text-gray-900 truncate">
                {sale.customerName || 'Direct / Walk-in'}
              </div>
              {sale.customerPhone && (
                <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5 font-mono">
                  <Phone className="w-3 h-3 text-gray-400" />
                  {sale.customerPhone}
                </div>
              )}
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Sale Date</span>
              </div>
              <div className="font-semibold text-gray-900 font-mono">
                {new Date(sale.saleDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  <CheckCircle className="w-3 h-3" /> {sale.paymentStatus || 'COMPLETED'}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="p-4 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 rounded-xl border border-emerald-100 space-y-3">
            <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Sale Revenue & Profit Breakdown
              </span>
              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-mono text-[10px]">
                {marginPercent}% margin
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-gray-500 text-[11px]">Quantity Sold</div>
                <div className="text-base font-extrabold text-gray-900">{sale.quantity} units</div>
              </div>
              <div>
                <div className="text-gray-500 text-[11px]">Selling Price Per Unit</div>
                <div className="text-base font-extrabold text-gray-900">
                  ₹{Number(sale.sellingPricePerUnit).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-[11px]">FIFO Unit Cost Basis</div>
                <div className="text-base font-bold text-gray-600 font-mono">
                  ₹{Number(sale.purchaseCostPerUnit).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-[11px]">Total Cost of Goods Sold</div>
                <div className="text-base font-bold text-gray-600 font-mono">
                  ₹{totalCost.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-2 gap-3">
              <div>
                <div className="text-gray-500 text-[11px]">Total Sale Revenue</div>
                <div className="text-lg font-extrabold text-gray-900">
                  ₹{totalSale.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-[11px]">Calculated Net Profit</div>
                <div className="text-lg font-extrabold text-emerald-700">
                  +₹{profit.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Notes / Remarks</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{sale.notes}</p>
            </div>
          )}

          {/* Timestamp */}
          {sale.createdAt && (
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] pt-1">
              <Clock className="w-3 h-3" />
              <span>Recorded on {new Date(sale.createdAt).toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-100 bg-gray-50">
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              Edit Sale
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
