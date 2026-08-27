import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Plus } from 'lucide-react';
import { useReminders, useReminderKPIs, useCancelReminder } from './reminders.api';
import type { ReminderItem } from './reminders.api';
import { ReminderSummaryCards } from './components/ReminderSummaryCards';
import { ReminderToolbar } from './components/ReminderToolbar';
import { ReminderTable } from './components/ReminderTable';
import { CreateReminderModal } from './components/CreateReminderModal';
import { CompleteReminderModal } from './components/CompleteReminderModal';

export const RemindersDirectory: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [reminderType, setReminderType] = useState('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<ReminderItem | null>(null);

  // Queries & Mutations
  const { data: kpis, isLoading: isLoadingKPIs } = useReminderKPIs();
  const { data: remindersData, isLoading: isLoadingReminders } = useReminders({
    page,
    limit: 10,
    search: search.trim() || undefined,
    status: status as any,
    priority: priority as any,
    reminderType: reminderType as any,
    sortBy: 'reminderDate',
    sortOrder: 'asc',
  });

  const cancelMutation = useCancelReminder();

  const handleCancel = async (reminder: ReminderItem) => {
    if (window.confirm(`Are you sure you want to cancel reminder ${reminder.reminderNumber}?`)) {
      await cancelMutation.mutateAsync(reminder.id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-fast">
      {/* Page Header */}
      <PageHeader
        title="Follow-up Reminders"
        description="Actionable payment collections, overdue follow-ups, and customer reminder tasks."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reminders' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-sm"
          >
            New Reminder
          </Button>
        }
      />

      {/* KPI Overview Cards */}
      <ReminderSummaryCards kpis={kpis} isLoading={isLoadingKPIs} />

      {/* Toolbar & Filters */}
      <ReminderToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          setPage(1);
        }}
        priority={priority}
        onPriorityChange={(val) => {
          setPriority(val);
          setPage(1);
        }}
        reminderType={reminderType}
        onReminderTypeChange={(val) => {
          setReminderType(val);
          setPage(1);
        }}
        onCreateReminder={() => setIsCreateModalOpen(true)}
      />

      {/* Reminders Data Table */}
      <ReminderTable
        reminders={remindersData?.data || []}
        isLoading={isLoadingReminders}
        pagination={remindersData?.pagination}
        onPageChange={setPage}
        onComplete={(r) => setCompleteTarget(r)}
        onCancel={handleCancel}
      />

      {/* Create Reminder Modal */}
      <CreateReminderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Complete Reminder Modal */}
      <CompleteReminderModal
        isOpen={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        reminder={completeTarget}
      />
    </div>
  );
};
