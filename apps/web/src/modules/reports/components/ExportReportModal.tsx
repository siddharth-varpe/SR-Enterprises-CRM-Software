import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileCode, Check, X } from 'lucide-react';
import { API_PREFIX } from '@crm/shared';
import { useToast } from '../../../providers/ToastProvider';

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
  const toast = useToast();
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

  const handleExportSubmit = async () => {
    setIsExporting(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('range', currentDatePreset);
      searchParams.append('format', format);
      searchParams.append('category', selectedCategories.join(','));
      searchParams.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);

      const url = `${API_PREFIX}/analytics/export?${searchParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate export file from server');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const fileExt = format === 'xlsx' ? 'csv' : format === 'pdf' ? 'csv' : 'csv';
      a.download = `analytics_report_${selectedCategories.join('_')}_${new Date().toISOString().slice(0, 10)}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Analytics dataset downloaded successfully.', 'Export Complete');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Export generation failed', 'Export Error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-primary-600 flex items-center justify-center border border-sky-100 shadow-2xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Export Analytics Report</h3>
              <p className="text-xs text-slate-500 font-sans">Generate and download live CRM data export</p>
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
            <label className="text-xs font-bold text-slate-700 block font-sans">Export Format</label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  format === 'csv'
                    ? 'border-primary-600 bg-sky-50/50 text-primary-700 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <FileCode className="w-5 h-5 text-primary-600" />
                <span className="text-xs font-sans">CSV Dataset</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  format === 'xlsx'
                    ? 'border-primary-600 bg-sky-50/50 text-primary-700 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-sans">Excel Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  format === 'pdf'
                    ? 'border-primary-600 bg-sky-50/50 text-primary-700 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                }`}
              >
                <FileText className="w-5 h-5 text-rose-500" />
                <span className="text-xs font-sans">Document</span>
              </button>
            </div>
          </div>

          {/* Scope Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block font-sans">Report Scope</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('full')}
                className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                  scope === 'full'
                    ? 'border-primary-600 bg-sky-50/40 font-semibold text-primary-900 shadow-2xs'
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
                    ? 'border-primary-600 bg-sky-50/40 font-semibold text-primary-900 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Current View Only
              </button>
            </div>
          </div>

          {/* Category Checkboxes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block font-sans">Include Domains</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'overview', label: 'Executive Overview' },
                { id: 'revenue', label: 'Revenue & Invoices' },
                { id: 'sales', label: 'Sales Orders' },
                { id: 'services', label: 'Services & Operations' },
                { id: 'technicians', label: 'Technician Performance' },
                { id: 'inquiries', label: 'Customer Inquiries' },
              ].map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-sky-300 bg-sky-50/40 text-sky-900 font-medium'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center text-white ${
                        isSelected ? 'bg-primary-600' : 'border border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span className="font-sans">{cat.label}</span>
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
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating...' : 'Download Report'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
