import React from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  Edit2,
} from 'lucide-react';
import {
  useTechnicianDetailQuery,
  useUpdateTechnicianMutation,
  type TechnicianItem,
} from '../technicians.api';

export interface TechnicianDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  technician: TechnicianItem | null;
  onEdit: (tech: TechnicianItem) => void;
  onViewJobCard: (id: string) => void;
}

export const TechnicianDetailDrawer: React.FC<TechnicianDetailDrawerProps> = ({
  isOpen,
  onClose,
  technician,
  onEdit,
  onViewJobCard,
}) => {
  const { data: detail } = useTechnicianDetailQuery(technician?.id);
  const updateMutation = useUpdateTechnicianMutation();

  if (!isOpen || !technician) return null;

  const current = detail || technician;

  const handleStatusChange = async (newStatus: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE') => {
    try {
      await updateMutation.mutateAsync({
        id: current.id,
        data: { status: newStatus },
      });
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-lg flex items-center justify-center">
                {current.fullName.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{current.fullName}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-700 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {current.phone}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(current)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Edit Technician"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
            {/* Status Quick Toggle */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Workforce Availability
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStatusChange('ACTIVE')}
                  disabled={updateMutation.isPending}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    current.status === 'ACTIVE'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('ON_LEAVE')}
                  disabled={updateMutation.isPending}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    current.status === 'ON_LEAVE'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  On Leave
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('INACTIVE')}
                  disabled={updateMutation.isPending}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    current.status === 'INACTIVE'
                      ? 'bg-slate-700 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>

            {/* Contact & Location Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact & Personnel</h4>
              <div className="space-y-2 text-xs">
                {current.email && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{current.email}</span>
                  </div>
                )}
                {current.address && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{current.address}</span>
                  </div>
                )}
                {current.emergencyContact && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Emergency: {current.emergencyContact}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>Joined {new Date(current.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Skills & Expertise</h4>
              <div className="flex flex-wrap gap-1.5">
                {current.skills && current.skills.length > 0 ? (
                  current.skills.map((skill: any, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-700 italic">Standard RO Service</span>
                )}
              </div>
            </div>

            {/* Recent Assigned Jobs History */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Job Activity</h4>
                <span className="text-xs font-semibold text-slate-700">
                  {current.activeJobsCount || 0} active / {current.completedJobsCount || 0} completed
                </span>
              </div>

              {detail?.recentJobs && detail.recentJobs.length > 0 ? (
                <div className="space-y-2">
                  {detail.recentJobs.map((job: any) => (
                    <div
                      key={job.id}
                      onClick={() => onViewJobCard(job.id)}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors cursor-pointer text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{job.jobCardNumber}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="text-slate-700 truncate">{job.customerName} · {job.productName}</div>
                      <div className="text-[11px] text-slate-700">
                        {new Date(job.createdAt).toLocaleDateString()} · {job.serviceType}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                  No job history available.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
