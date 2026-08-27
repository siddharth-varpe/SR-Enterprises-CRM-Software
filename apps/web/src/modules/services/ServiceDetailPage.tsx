import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { JobCardDetailCard } from './components/JobCardDetailCard';
import { CompleteServiceModal } from './components/CompleteServiceModal';
import { QuickAssignModal } from './components/QuickAssignModal';
import { useServiceDetailQuery } from './services.api';
import {
  User,
  Cpu,
  ShieldCheck,
  Phone,
  Mail,
  CheckCircle,
  ArrowLeft,
  UserCheck,
  AlertTriangle,
  FileText,
  ArrowUpRight,
} from 'lucide-react';

function formatSystemDate(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '—';
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const { data: service, isLoading, error } = useServiceDetailQuery(id);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center text-slate-500 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Loading service record details...</span>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Service Record Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested service ID does not exist or may have been deleted.
        </p>
        <Button variant="outline" onClick={() => navigate('/services')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Services
        </Button>
      </div>
    );
  }

  const isCompleted = service.status === 'COMPLETED';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/services')}
            className="text-xs text-slate-500 hover:text-slate-900 pl-0 mb-1"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Back to Services
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {service.serviceNumber}
            </h1>
            <StatusBadge
              status={isCompleted ? 'active' : 'warning'}
              label={service.status.replace(/_/g, ' ')}
            />
            {service.serviceClassification === 'WARRANTY' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Warranty Covered
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                General Service
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {service.serviceType.replace(/_/g, ' ')} • {service.serviceLocation === 'DOORSTEP' ? 'Doorstep Visit' : 'In-Shop Repair'} • Scheduled for{' '}
            {formatSystemDate(service.scheduledDate)}
            {service.scheduledTimeSlot ? ` (${service.scheduledTimeSlot})` : ''}
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2.5">
          {!isCompleted && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAssignModalOpen(true)}
                className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                {service.technicianId ? 'Reassign Tech' : 'Assign Tech'}
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCompleteModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Complete Service
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer, Machine & Warranty (1 Col) */}
        <div className="space-y-6">
          {/* Customer Card */}
          <Card className="rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-4 flex flex-row items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-primary-600" />
                Customer Info
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/customers/${service.customerId}`)}
                className="h-7 text-[11px] text-primary-600 hover:text-primary-800"
                rightIcon={<ArrowUpRight className="w-3 h-3" />}
              >
                Profile
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <div className="font-bold text-slate-900 text-sm">{service.customerName}</div>
                <div className="text-[11px] text-slate-500 font-mono">ID: {service.customerNumber}</div>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono">{service.customerPhone}</span>
                </div>
                {service.customerEmail && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{service.customerEmail}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Machine / Asset Card */}
          <Card className="rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-emerald-600" />
                Registered Machine
              </h3>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div>
                <div className="font-bold text-slate-900">{service.productName}</div>
                <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                  SKU: {service.productSku} {service.productBrand && `• Brand: ${service.productBrand}`}
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 font-mono text-[11px]">
                <span className="text-slate-500 block">Serial Number:</span>
                <span className="font-bold text-slate-800">{service.serialNumber || 'Non-serialized Unit'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Technician Card */}
          <Card className="rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-4 flex flex-row items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Assigned Technician
              </h3>
              {!isCompleted && (
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold"
                >
                  Change
                </button>
              )}
            </CardHeader>
            <CardContent className="p-4 text-xs">
              {service.technicianName ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-extrabold text-sm border border-blue-200 shrink-0">
                    {service.technicianName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{service.technicianName}</div>
                    <div className="text-slate-500 font-mono">{service.technicianPhone}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-amber-800 text-center space-y-1">
                  <p className="font-semibold">No technician assigned yet</p>
                  <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="text-[11px] font-bold text-amber-900 underline"
                  >
                    Assign Field Tech Now
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Job Card & Timeline Execution (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Card Details */}
          <JobCardDetailCard service={service} />

          {/* Customer & Internal Notes Card */}
          <Card className="rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                Customer & Internal Notes
              </h3>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="font-bold text-slate-700 block mb-1">Customer Reported Notes:</span>
                <p className="text-slate-600">{service.customerNotes || 'No specific notes logged by customer.'}</p>
              </div>

              {service.internalNotes && (
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <span className="font-bold text-blue-900 block mb-1">Internal Instructions:</span>
                  <p className="text-blue-800">{service.internalNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <CompleteServiceModal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        service={service}
      />

      <QuickAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        service={service}
      />
    </div>
  );
};
