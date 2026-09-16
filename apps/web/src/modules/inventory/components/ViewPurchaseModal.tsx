import React from 'react';
import { X, ShoppingBag, Calendar, User, Layers, FileText, Clock } from 'lucide-react';
import type { InventoryPurchase } from '../inventory.api';

interface ViewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: InventoryPurchase | null;
  onEdit?: () => void;
}

export const ViewPurchaseModal: React.FC<ViewPurchaseModalProps> = ({
  isOpen,
  onClose,
  purchase,
  onEdit,
}) => {
  if (!isOpen || !purchase) return null;

  const totalAmount = Number(purchase.totalAmount || 0);
  const unitPrice = Number(purchase.purchasePricePerUnit || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/70 to-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">Purchase Details</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-100 text-blue-800">
                  {purchase.purchaseNumber}
                </span>
              </div>
              <p className="text-xs text-gray-500">Inward inventory batch specification</p>
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
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Item Information</span>
                <div className="text-sm font-bold text-gray-900 mt-0.5">{purchase.itemName || 'Inventory Item'}</div>
              </div>
              {purchase.category && (
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">
                  {purchase.category}
                </span>
              )}
            </div>
            {(purchase.brand || purchase.partNumber) && (
              <div className="flex gap-4 mt-2 text-gray-500">
                {purchase.brand && <span>Brand: <strong className="text-gray-700">{purchase.brand}</strong></span>}
                {purchase.partNumber && <span>Part #: <strong className="text-gray-700 font-mono">{purchase.partNumber}</strong></span>}
              </div>
            )}
          </div>

          {/* Supplier & Date Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <User className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Supplier</span>
              </div>
              <div className="font-semibold text-gray-900 truncate">
                {purchase.supplierName || 'Not specified'}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Purchase Date</span>
              </div>
              <div className="font-semibold text-gray-900 font-mono">
                {new Date(purchase.purchaseDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          {/* Quantity and Pricing Grid */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
            <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Stock & Financial Breakdown
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-gray-500 text-[11px]">Purchased Quantity</div>
                <div className="text-base font-extrabold text-gray-900">{purchase.quantity} units</div>
              </div>
              <div>
                <div className="text-gray-500 text-[11px]">FIFO Remaining in Stock</div>
                <div className="text-base font-extrabold text-emerald-700 font-mono">
                  {purchase.remainingQuantity} units
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-[11px]">Unit Purchase Price</div>
                <div className="text-base font-extrabold text-gray-900">₹{unitPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500 text-[11px]">Total Inward Amount</div>
                <div className="text-base font-extrabold text-blue-700">₹{totalAmount.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {purchase.notes && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Notes / Remarks</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{purchase.notes}</p>
            </div>
          )}

          {/* Timestamp */}
          {purchase.createdAt && (
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px] pt-1">
              <Clock className="w-3 h-3" />
              <span>Created on {new Date(purchase.createdAt).toLocaleString('en-IN')}</span>
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
              className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Edit Purchase
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
