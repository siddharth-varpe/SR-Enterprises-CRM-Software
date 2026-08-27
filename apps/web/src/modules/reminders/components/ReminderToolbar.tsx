import { Search, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface ReminderToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  priority: string;
  onPriorityChange: (val: string) => void;
  reminderType: string;
  onReminderTypeChange: (val: string) => void;
  onCreateReminder: () => void;
}

export const ReminderToolbar: React.FC<ReminderToolbarProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  reminderType,
  onReminderTypeChange,
  onCreateReminder,
}) => {
  const statusTabs = [
    { label: 'All Reminders', value: 'ALL' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  return (
    <div className="space-y-3">
      {/* Top row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, invoice #, reminder # or notes..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={reminderType}
              onChange={(e) => onReminderTypeChange(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="PAYMENT_FOLLOW_UP">Payment Follow-up</option>
              <option value="OVERDUE_PAYMENT">Overdue Payment</option>
              <option value="INVOICE_DUE">Invoice Due</option>
              <option value="SERVICE_DUE">Service Due</option>
              <option value="CUSTOMER_FOLLOW_UP">General Follow-up</option>
            </select>

            <select
              value={priority}
              onChange={(e) => onPriorityChange(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-medium"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onCreateReminder}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shadow-sm"
        >
          New Reminder
        </Button>
      </div>

      {/* Status Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-200">
        {statusTabs.map((tab) => {
          const isActive = status === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onStatusChange(tab.value)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
