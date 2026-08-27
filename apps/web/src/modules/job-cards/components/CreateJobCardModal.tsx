import React, { useState } from 'react';
import { X, Wrench, AlertCircle } from 'lucide-react';
import { useCreateJobCardMutation } from '../job-cards.api';
import { useServicesQuery } from '../../services/services.api';
import type { TechnicianItem } from '../../technicians/technicians.api';

export interface CreateJobCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicians: TechnicianItem[];
}

export const CreateJobCardModal: React.FC<CreateJobCardModalProps> = ({
  isOpen,
  onClose,
  technicians,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [problemReported, setProblemReported] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [error, setError] = useState<string | null>(null);

  // Fetch pending services without completed status
  const { data: servicesData } = useServicesQuery({
    limit: 50,
  });

  const createMutation = useCreateJobCardMutation();

  if (!isOpen) return null;

  const activeTechnicians = technicians.filter((t) => t.status === 'ACTIVE');
  const eligibleServices = (servicesData?.data || []).filter(
    (s: any) => s.status === 'SCHEDULED' || s.status === 'ASSIGNED' || s.status === 'IN_PROGRESS'
  );

  const selectedService: any = eligibleServices.find((s: any) => s.id === selectedServiceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || !selectedService) {
      setError('Please select a valid service order');
      return;
    }
    if (!problemReported.trim()) {
      setError('Please provide problem reported / work instructions');
      return;
    }

    setError(null);
    try {
      await createMutation.mutateAsync({
        serviceId: selectedService.id,
        customerId: selectedService.customerId,
        assetId: selectedService.assetId,
        technicianId: technicianId || undefined,
        problemReported: problemReported.trim(),
        priority,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create job card');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Job Card</h3>
              <p className="text-xs text-slate-700">Dispatch an operational work order</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Service */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Scheduled Service <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">-- Choose Scheduled Service Order --</option>
              {eligibleServices.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.serviceNumber} — {s.customerName} ({s.productName}) [{s.serviceType}]
                </option>
              ))}
            </select>
          </div>

          {/* Service summary preview */}
          {selectedService && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-700">Customer:</span>
                <span className="font-semibold text-slate-900">{selectedService.customerName} ({selectedService.customerPhone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">Machine:</span>
                <span className="font-semibold text-slate-900">{selectedService.productName} ({selectedService.productBrand || 'RO'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700">Scheduled:</span>
                <span className="font-semibold text-slate-900">
                  {new Date(selectedService.scheduledDate).toLocaleDateString()} ({selectedService.scheduledTimeSlot || 'Standard Slot'})
                </span>
              </div>
            </div>
          )}

          {/* Priority & Technician */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent (Emergency)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Assign Technician (Optional)
              </label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">-- Assign Later --</option>
                {activeTechnicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Problem / Work Request Details */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Problem Reported / Task Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={problemReported}
              onChange={(e) => setProblemReported(e.target.value)}
              rows={3}
              required
              placeholder="e.g. Machine vibrating, water taste sour, membrane replacement required..."
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
