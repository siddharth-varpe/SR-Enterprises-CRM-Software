import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileCode, Check, X } from 'lucide-react';
import { API_PREFIX } from '@crm/shared';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDatePreset: string;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  currentDatePreset,
}) => {
  const [format, setFormat] = useState<'pdf' | 'csv' | 'xlsx'>('csv');
  const [scope, setScope] = useState<'current' | 'full'>('full');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'overview',
    'revenue',
    'sales',
    'services',
    'technicians',
  ]);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleExportSubmit = () => {
    setIsExporting(true);
    try {
      // Direct trigger of download
      const searchParams = new URLSearchParams();
      searchParams.append('range', currentDatePreset);
      searchParams.append('format', format);
      searchParams.append('category', selectedCategories.join(','));
      searchParams.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);

      const url = `${API_PREFIX}/analytics/export?${searchParams.toString()}`;
      window.open(url, '_blank');
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Export Report</h3>
              <p className="text-xs text-slate-500">Generate downloadable business report</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Export Format</label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  format === 'pdf'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <FileText className="w-5 h-5 text-rose-500" />
                <span className="text-xs">PDF Document</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  format === 'csv'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <FileCode className="w-5 h-5 text-blue-500" />
                <span className="text-xs">CSV Data</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  format === 'xlsx'
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                <span className="text-xs">Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Scope Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Report Scope</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('full')}
                className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                  scope === 'full'
                    ? 'border-blue-600 bg-blue-50/40 font-semibold text-blue-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Full Multi-Domain Report
              </button>
              <button
                type="button"
                onClick={() => setScope('current')}
                className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                  scope === 'current'
                    ? 'border-blue-600 bg-blue-50/40 font-semibold text-blue-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Current View Only
              </button>
            </div>
          </div>

          {/* Category Checkboxes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Include Domains</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'overview', label: 'Executive Overview' },
                { id: 'revenue', label: 'Revenue & Cashflow' },
                { id: 'sales', label: 'Sales & Inventory' },
                { id: 'services', label: 'Service & Maintenance' },
                { id: 'technicians', label: 'Technician Performance' },
                { id: 'inquiries', label: 'Website Inquiries' },
              ].map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-blue-300 bg-blue-50/30 text-blue-900 font-medium'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center text-white ${
                        isSelected ? 'bg-blue-600' : 'border border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExportSubmit}
            disabled={isExporting || selectedCategories.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating...' : 'Download Report'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
