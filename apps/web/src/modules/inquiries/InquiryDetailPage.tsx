import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { useInquiry, useCloseInquiry, useMarkInquirySpam } from './inquiries.api';
import { InquiryConvertModal } from './components/InquiryConvertModal';
import { InquiryAssignModal } from './components/InquiryAssignModal';
import { InquiryStatusModal } from './components/InquiryStatusModal';
import { InquiryFollowUpModal } from './components/InquiryFollowUpModal';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthBoundary';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  UserCheck,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Tag,
  History,
  ArrowRight,
  Droplets,
} from 'lucide-react';

export const InquiryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();

  const { data: inquiry, isLoading, isError, refetch } = useInquiry(id);
  const closeMutation = useCloseInquiry();
  const spamMutation = useMarkInquirySpam();

  // Modals
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  const canUpdate = hasPermission('inquiries.update');
  const canConvert = hasPermission('inquiries.convert');
  const canAssign = hasPermission('inquiries.assign') || canUpdate;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-card" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
      </div>
    );
  }

  if (isError || !inquiry) {
    return (
      <ErrorState
        title="Failed to load inquiry details"
        message="The inquiry record could not be retrieved. It may not exist or you may lack authorized permission."
        onRetry={() => refetch()}
      />
    );
  }

  const handleClose = async () => {
    try {
      await closeMutation.mutateAsync({ id: inquiry.id });
      toast.success('Inquiry closed', 'Closed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to close inquiry', 'Error');
    }
  };

  const handleMarkSpam = async () => {
    try {
      await spamMutation.mutateAsync({ id: inquiry.id });
      toast.success('Inquiry marked as spam', 'Spam Flagged');
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark spam', 'Error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`${inquiry.name} — ${inquiry.inquiryNumber}`}
        description={`Inbound ${inquiry.source} inquiry for ${inquiry.inquiryType.replace(/_/g, ' ')}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inquiries', href: '/inquiries' },
          { label: inquiry.inquiryNumber },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {canUpdate && (
              <Button
                variant="outline"
                size="md"
                leftIcon={<Clock className="w-4 h-4 text-primary-600" />}
                onClick={() => setIsFollowUpModalOpen(true)}
              >
                Follow Up
              </Button>
            )}
            {canAssign && (
              <Button
                variant="outline"
                size="md"
                leftIcon={<UserPlus className="w-4 h-4 text-slate-600" />}
                onClick={() => setIsAssignModalOpen(true)}
              >
                {inquiry.assignedToUserId ? 'Reassign' : 'Assign'}
              </Button>
            )}
            {canUpdate && (
              <Button
                variant="outline"
                size="md"
                leftIcon={<CheckCircle2 className="w-4 h-4 text-slate-600" />}
                onClick={() => setIsStatusModalOpen(true)}
              >
                Status
              </Button>
            )}
            {canConvert && inquiry.status !== 'CONVERTED' && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<UserCheck className="w-4 h-4" />}
                onClick={() => setIsConvertModalOpen(true)}
              >
                Convert to Customer
              </Button>
            )}
          </div>
        }
      />

      {/* Duplicate Warning Banner */}
      {inquiry.isPossibleDuplicate && (
        <div className="bg-amber-50 border border-amber-300 rounded-card p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-sm block">Possible Duplicate Inquiry Detected</span>
            <p className="leading-relaxed">
              This inquiry was submitted from phone number{' '}
              <strong className="font-mono">{inquiry.phone}</strong> shortly after another recent
              inquiry. Please review the customer interaction history before converting or assigning.
            </p>
          </div>
        </div>
      )}

      {/* Profile Visual Header */}
      <div className="bg-surface p-6 rounded-card border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 text-white flex items-center justify-center text-xl font-bold shadow-md shrink-0">
            {inquiry.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">{inquiry.name}</h2>
              <Badge variant="primary">{inquiry.inquiryNumber}</Badge>
              <StatusBadge
                status={
                  inquiry.status === 'CONVERTED'
                    ? 'active'
                    : inquiry.status === 'FOLLOW_UP'
                      ? 'pending'
                      : (inquiry.status.toLowerCase() as any)
                }
                label={inquiry.status.replace(/_/g, ' ')}
              />
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                  inquiry.priority === 'URGENT'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : inquiry.priority === 'HIGH'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : inquiry.priority === 'NORMAL'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {inquiry.priority}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a
                  href={`tel:${inquiry.phone}`}
                  className="text-primary-600 hover:underline font-mono font-medium"
                >
                  {inquiry.phone}
                </a>
              </span>
              {inquiry.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <a href={`mailto:${inquiry.email}`} className="text-slate-600 hover:underline">
                    {inquiry.email}
                  </a>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Received on{' '}
                  {new Date(inquiry.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  at{' '}
                  {new Date(inquiry.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Communication Trigger Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<MessageSquare className="w-4 h-4 text-emerald-600" />}
            onClick={() => navigate('/whatsapp')}
          >
            WhatsApp
          </Button>
          <a
            href={`tel:${inquiry.phone}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-slate-600" />
            <span>Call Lead</span>
          </a>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Contact, Request, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contact &amp; Location Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-500 block">Prospect Name:</span>
                  <span className="font-semibold text-slate-900 text-sm">{inquiry.name}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">Primary Mobile:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{inquiry.phone}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">Email:</span>
                  <span className="text-slate-800 font-medium">
                    {inquiry.email || <span className="text-slate-400 italic">Not provided</span>}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">City / Area:</span>
                  <span className="text-slate-800 font-medium">
                    {inquiry.city || <span className="text-slate-400 italic">Not specified</span>}
                  </span>
                </div>
                {inquiry.address && (
                  <div className="md:col-span-2 space-y-1 pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary-600" />
                      <span>Physical Address:</span>
                    </span>
                    <span className="text-slate-800 font-medium leading-relaxed block">
                      {inquiry.address}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Request & Product Interest Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Inquiry Details &amp; Customer Request</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-slate-500 block">Inquiry Category:</span>
                  <Badge variant="primary">{inquiry.inquiryType.replace(/_/g, ' ')}</Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">Inbound Source:</span>
                  <Badge variant="neutral">{inquiry.source.replace(/_/g, ' ')}</Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">Priority Level:</span>
                  <span className="font-semibold text-slate-800">{inquiry.priority}</span>
                </div>
              </div>

              {inquiry.productInterest && (
                <div className="p-3 rounded-btn bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-primary-600" />
                    <span>Product Interest</span>
                  </span>
                  <p className="text-slate-900 font-medium">{inquiry.productInterest}</p>
                </div>
              )}

              {inquiry.serviceInterest && (
                <div className="p-3 rounded-btn bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span>Service Requirement</span>
                  </span>
                  <p className="text-slate-900 font-medium">{inquiry.serviceInterest}</p>
                </div>
              )}

              {inquiry.message && (
                <div className="space-y-1">
                  <span className="text-slate-500 block font-medium">Customer Message / Note:</span>
                  <div className="p-3 rounded-btn bg-slate-50/70 border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {inquiry.message}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chronological Follow-Up & Audit Events Timeline */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-primary-600" />
                <span>Interaction Timeline &amp; Audit Trail</span>
              </CardTitle>
              {canUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Clock className="w-3.5 h-3.5" />}
                  onClick={() => setIsFollowUpModalOpen(true)}
                >
                  Add Follow-Up
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {inquiry.events && inquiry.events.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {inquiry.events.map((event: any) => (
                    <div key={event.id} className="relative group">
                      {/* Timeline Node Icon */}
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-primary-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                          <span className="font-semibold text-slate-900">
                            {event.eventType.replace(/_/g, ' ')}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {new Date(event.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            at{' '}
                            {new Date(event.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {event.actorUser && (
                          <div className="text-[11px] text-slate-500 font-medium">
                            By {event.actorUser.fullName} ({event.actorUser.role})
                          </div>
                        )}

                        {event.notes && (
                          <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-btn border border-slate-200 mt-1 whitespace-pre-wrap leading-relaxed">
                            {event.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No events recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Assignment & Conversion Status */}
        <div className="space-y-6">
          {/* Conversion Status Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Conversion Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              {inquiry.status === 'CONVERTED' && inquiry.convertedCustomer ? (
                <div className="p-4 rounded-btn bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Converted Customer Account</span>
                  </div>

                  <div className="space-y-1 text-slate-700">
                    <div>
                      <span className="text-slate-500">Account No:</span>{' '}
                      <strong className="font-mono">{inquiry.convertedCustomer.customerNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Name:</span>{' '}
                      <strong>{inquiry.convertedCustomer.fullName}</strong>
                    </div>
                    {inquiry.convertedAt && (
                      <div className="text-[11px] text-slate-500">
                        Converted on {new Date(inquiry.convertedAt).toLocaleDateString('en-IN')}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    onClick={() => navigate(`/customers/${inquiry.convertedCustomerId}`)}
                  >
                    Open Customer Profile
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-slate-600 leading-relaxed">
                    Convert this qualified lead into an active customer account. Converting
                    automatically synchronizes contact information and allows creating RO sales,
                    invoices, and service job cards.
                  </p>

                  {canConvert && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full justify-center"
                      leftIcon={<UserCheck className="w-4 h-4" />}
                      onClick={() => setIsConvertModalOpen(true)}
                    >
                      Convert to Customer
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Panel */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-sm">Staff Assignment</CardTitle>
              {canAssign && (
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="text-xs text-primary-600 hover:underline font-semibold cursor-pointer"
                >
                  {inquiry.assignedToUserId ? 'Change' : 'Assign'}
                </button>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-3 text-xs">
              {inquiry.assignedUser ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00152B] text-white flex items-center justify-center font-bold text-xs">
                    {inquiry.assignedUser.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{inquiry.assignedUser.fullName}</div>
                    <div className="text-slate-500 text-[11px]">{inquiry.assignedUser.role}</div>
                    <div className="text-slate-400 text-[10px]">{inquiry.assignedUser.email}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-btn border border-slate-200 text-slate-500 text-center italic">
                  Unassigned lead
                </div>
              )}

              {inquiry.followUpDate && (
                <div className="p-3 rounded-btn bg-amber-50/60 border border-amber-200 text-xs space-y-1">
                  <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Next Follow-Up Due</span>
                  </span>
                  <div className="font-bold text-slate-900">
                    {new Date(inquiry.followUpDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Administrative Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-2">
              {canUpdate && inquiry.status !== 'CLOSED' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleClose}
                >
                  Close Inquiry
                </Button>
              )}

              {canUpdate && inquiry.status !== 'SPAM' && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleMarkSpam}
                >
                  Mark as Spam / Junk
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <InquiryConvertModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        inquiry={inquiry}
      />

      <InquiryAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        inquiry={inquiry}
      />

      <InquiryStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        inquiry={inquiry}
      />

      <InquiryFollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        inquiry={inquiry}
      />
    </div>
  );
};
