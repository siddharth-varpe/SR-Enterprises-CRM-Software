import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
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

  /**
   * Helper to parse Excel (.xlsx, .xls) or CSV files,
   * extracting strictly only 2 columns: "name" and "phone".
   * Column "name" also acts as customer address.
   */
  const parseExcelOrCsvFile = async (selectedFile: File): Promise<Array<Record<string, any>>> => {
    const buffer = await selectedFile.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: Array<Record<string, any>> = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) return [];

    const cleanedRecords: Array<Record<string, any>> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const keys = Object.keys(row);

      // Find Name column (e.g. name, fullName, customer_name, client)
      const nameKey =
        keys.find((k) => /^(name|fullname|full_name|customer_name|customername|client|customer)$/i.test(k.trim())) ||
        keys.find((k) => /name/i.test(k.trim())) ||
        keys[0];

      // Find Phone column (e.g. phone, mobile, phone_number, mobilenumber, contact, cell, tel)
      const phoneKey =
        keys.find((k) => /^(phone|mobile|phonenumber|phone_number|mobilenumber|mobile_number|contact|contactnumber|contact_number|cell|tel)$/i.test(k.trim())) ||
        keys.find((k) => /(phone|mobile|contact)/i.test(k.trim())) ||
        keys[1];

      const rawNameVal = nameKey ? String(row[nameKey] ?? '').trim() : '';
      const rawPhoneVal = phoneKey ? String(row[phoneKey] ?? '').trim() : '';

      // Skip completely blank rows
      if (!rawNameVal && !rawPhoneVal) continue;

      // Strictly extract only name and phone. The column "name" acts as both name and address.
      cleanedRecords.push({
        rowNumber: i + 1,
        name: rawNameVal,
        fullName: rawNameVal,
        phone: rawPhoneVal,
        address: rawNameVal,
      });
    }

    return cleanedRecords;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreviewResult(null);
    setExecutionResult(null);
    setIsLoading(true);

    try {
      // Parse Excel (.xlsx, .xls) or CSV
      const records = await parseExcelOrCsvFile(selectedFile);

      if (records.length === 0) {
        throw new Error('No valid customer data rows found in the uploaded file.');
      }

      setParsedRows(records);

      // Request server preview
      const preview = await previewCustomerImportApi(records, selectedFile.name);
      setPreviewResult(preview);

      toast.success(
        `Analyzed ${preview.totalRows} customer rows: ${preview.validRows} ready for import.`,
        'File Verified'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to analyze import file', 'Validation Error');
      setPreviewResult(null);
      setParsedRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewResult || parsedRows.length === 0) return;

    setIsLoading(true);
    try {
      // Execute import with duplicate values allowed
      const result = await executeCustomerImportApi(parsedRows, 'CREATE');
      setExecutionResult(result);
      toast.success(`Successfully imported ${result.imported} customer records.`, 'Import Completed');
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
      description="Upload Excel (.xlsx, .xls) or CSV containing 'name' and 'phone' columns. The name column will act as both customer name and service address."
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
                  ? 'border-primary-600 bg-sky-50/40'
                  : 'border-slate-300 hover:border-primary-600 hover:bg-slate-50/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-primary-600 flex items-center justify-center mb-2.5 shadow-2xs">
                {file ? <FileSpreadsheet className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>
              {file ? (
                <div>
                  <p className="text-sm font-bold text-slate-900 font-display">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    {(file.size / 1024).toFixed(1)} KB — Click to choose a different file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-slate-900 font-display">Click to upload Excel / CSV spreadsheet</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Supports Excel (.xlsx, .xls) &amp; CSV files with 2 columns: <strong>name</strong> and <strong>phone</strong></p>
                </div>
              )}
            </div>

            {/* Import Format Guidance */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 font-mono text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Columns: 'name' &amp; 'phone'</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Only the <strong>name</strong> and <strong>phone</strong> columns will be imported. Any extra columns in your file are automatically skipped. The <strong>name</strong> value will be saved as the customer name and service address. Duplicate records are allowed.
              </p>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="p-6 bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-2 text-center border border-slate-200">
            <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
            <p className="text-xs font-bold text-slate-800">Processing customer records...</p>
            <p className="text-[11px] text-slate-500">Parsing name, phone numbers, and address details</p>
          </div>
        )}

        {/* Step 2: Validation Preview */}
        {!executionResult && previewResult && !isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 text-center shadow-2xs">
                <span className="block text-[11px] font-semibold text-slate-500 font-mono">TOTAL ROWS</span>
                <span className="text-lg font-extrabold text-slate-900 font-mono">{previewResult.totalRows}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/90 text-center shadow-2xs">
                <span className="block text-[11px] font-bold text-emerald-700 font-mono">READY TO IMPORT</span>
                <span className="text-lg font-extrabold text-emerald-700 font-mono">{previewResult.validRows}</span>
              </div>
            </div>

            {/* Error Preview list if invalid rows exist */}
            {previewResult.errors && previewResult.errors.length > 0 && (
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5 text-xs text-rose-900">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 font-mono">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Validation Notices ({previewResult.errors.length})</span>
                </div>
                {previewResult.errors.slice(0, 5).map((err: any, idx: number) => (
                  <p key={idx} className="text-[11px] text-rose-700 pl-5 font-mono">
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
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 font-display">Import Completed Successfully</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Completed in {(executionResult.executionTimeMs / 1000).toFixed(2)} seconds
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-center pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 block font-mono">TOTAL PROCESSED</span>
                <span className="text-base font-extrabold text-slate-900 font-mono">{executionResult.totalProcessed}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/90 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-700 block font-mono">IMPORTED</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">{executionResult.imported}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
