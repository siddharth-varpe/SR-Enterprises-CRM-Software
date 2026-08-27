import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../providers/ToastProvider';
import { previewCustomerImportApi, executeCustomerImportApi } from '../customer.api';

export interface CustomerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CustomerImportModal: React.FC<CustomerImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'CREATE' | 'SKIP' | 'UPDATE'>('SKIP');
  const [isLoading, setIsLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [parsedRows, setParsedRows] = useState<Array<Record<string, any>>>([]);

  const handleReset = () => {
    setFile(null);
    setPreviewResult(null);
    setExecutionResult(null);
    setParsedRows([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreviewResult(null);
    setExecutionResult(null);
    setIsLoading(true);

    try {
      // Read file content
      const text = await selectedFile.text();
      const preview = await previewCustomerImportApi(text, selectedFile.name);
      setPreviewResult(preview);

      // Store valid parsed sample/records for execution
      if (preview.sampleValid) {
        // Parse CSV rows into objects
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
          const records: Array<Record<string, any>> = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
            const row: Record<string, any> = { rowNumber: i };
            headers.forEach((h, idx) => {
              row[h] = values[idx] || '';
            });
            records.push(row);
          }
          setParsedRows(records);
        }
      }
      toast.success(`Validated ${preview.totalRows} rows: ${preview.validRows} valid.`, 'File Analyzed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to analyze import file', 'Validation Error');
      setPreviewResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewResult || parsedRows.length === 0) return;

    setIsLoading(true);
    try {
      const result = await executeCustomerImportApi(parsedRows, duplicatePolicy);
      setExecutionResult(result);
      toast.success(`Successfully imported ${result.imported} customers.`, 'Import Completed');
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Import execution failed', 'Import Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Import Customer Directory"
      description="Upload CSV or spreadsheet containing customer records (supports up to 10,000+ rows)."
      size="lg"
      footer={
        <>
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              handleReset();
              onClose();
            }}
            disabled={isLoading}
          >
            {executionResult ? 'Close' : 'Cancel'}
          </Button>
          {!executionResult && previewResult && previewResult.canProceed && (
            <Button
              variant="primary"
              size="md"
              onClick={handleExecuteImport}
              isLoading={isLoading}
              leftIcon={<ArrowRight className="w-4 h-4" />}
            >
              Confirm &amp; Import ({previewResult.validRows} Records)
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5 select-none">
        {/* Step 1: Upload Zone (If no execution result yet) */}
        {!executionResult && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                file
                  ? 'border-[#1E88E5] bg-blue-50/40'
                  : 'border-slate-300 hover:border-[#1E88E5] hover:bg-slate-50/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#1E88E5] flex items-center justify-center mb-2.5 shadow-2xs">
                {file ? <FileSpreadsheet className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>
              {file ? (
                <div>
                  <p className="text-sm font-bold text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB — Click to choose a different file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-slate-900">Click to upload customer spreadsheet</p>
                  <p className="text-xs text-slate-500 mt-0.5">Supports CSV or Excel (.csv, .xlsx, .xls)</p>
                </div>
              )}
            </div>

            {/* Duplicate Policy Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="font-bold text-slate-900 block">Duplicate Handling Policy</span>
                <span className="text-slate-500">Action when phone or customer number already exists</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={duplicatePolicy}
                  onChange={(e) => setDuplicatePolicy(e.target.value as any)}
                  className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#1E88E5]"
                >
                  <option value="SKIP">Skip Existing (Recommended)</option>
                  <option value="UPDATE">Update Existing Profile</option>
                  <option value="CREATE">Fail on Conflict</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="p-6 bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-2 text-center border border-slate-200">
            <RefreshCw className="w-6 h-6 text-[#1E88E5] animate-spin" />
            <p className="text-xs font-bold text-slate-800">Processing customer records...</p>
            <p className="text-[11px] text-slate-500">Validating phone numbers, addresses, and sequence numbers</p>
          </div>
        )}

        {/* Step 2: Validation Preview */}
        {!executionResult && previewResult && !isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <span className="block text-[11px] font-semibold text-slate-500">Total Rows</span>
                <span className="text-base font-extrabold text-slate-900">{previewResult.totalRows}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <span className="block text-[11px] font-semibold text-emerald-700">Valid</span>
                <span className="text-base font-extrabold text-emerald-700">{previewResult.validRows}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <span className="block text-[11px] font-semibold text-amber-700">Duplicates</span>
                <span className="text-base font-extrabold text-amber-700">{previewResult.duplicateRows}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                <span className="block text-[11px] font-semibold text-rose-700">Invalid</span>
                <span className="text-base font-extrabold text-rose-700">{previewResult.invalidRows}</span>
              </div>
            </div>

            {/* Error Preview list if invalid rows exist */}
            {previewResult.errors && previewResult.errors.length > 0 && (
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5 text-xs text-rose-900">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Validation Notices ({previewResult.errors.length})</span>
                </div>
                {previewResult.errors.slice(0, 5).map((err: any, idx: number) => (
                  <p key={idx} className="text-[11px] text-rose-700 pl-5">
                    • Row {err.rowNumber}: {err.message}
                  </p>
                ))}
                {previewResult.errors.length > 5 && (
                  <p className="text-[10px] text-rose-500 pl-5">
                    ...and {previewResult.errors.length - 5} more issues.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Final Execution Result */}
        {executionResult && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Import Completed Successfully</h3>
              <p className="text-xs text-slate-500 mt-1">
                Completed in {(executionResult.executionTimeMs / 1000).toFixed(2)} seconds
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2.5 max-w-md mx-auto text-center pt-2">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 block">Total</span>
                <span className="text-sm font-bold text-slate-900">{executionResult.totalProcessed}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-semibold text-emerald-700 block">Imported</span>
                <span className="text-sm font-bold text-emerald-700">{executionResult.imported}</span>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-[10px] font-semibold text-blue-700 block">Updated</span>
                <span className="text-sm font-bold text-blue-700">{executionResult.updated || 0}</span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] font-semibold text-amber-700 block">Skipped</span>
                <span className="text-sm font-bold text-amber-700">{executionResult.skipped || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
