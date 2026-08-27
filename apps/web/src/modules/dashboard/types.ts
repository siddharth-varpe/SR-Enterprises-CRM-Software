export interface OperationalCardsData {
  servicesDueToday: number;
  servicesUrgent: number;
  newInquiries: number;
  inquiriesUnread: number;
  warrantiesExpiring: number;
  paymentsDue: number;
  paymentsOverdue: number;
  techniciansOnDuty: number;
  techniciansAvailable: number;
  history?: {
    servicesDue?: number[];
    newInquiries?: number[];
    warrantiesExpiring?: number[];
    paymentsDue?: number[];
    techniciansOnDuty?: number[];
  };
}

export interface OverviewCountsData {
  servicesScheduled: number;
  newInquiries: number;
  warrantiesExpiring: number;
  paymentsDue: number;
  techniciansOnDuty: number;
}

export interface ScheduleAppointment {
  id: string;
  time: string;
  customerName: string;
  serviceName: string;
  mode: 'Doorstep' | 'In-Shop';
  category: 'Warranty' | 'General' | 'Emergency' | string;
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW' | string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | string;
}

export interface PaymentReminder {
  id: string;
  customerId: string;
  customerName: string;
  initials: string;
  amount: number;
  formattedAmount: string;
  dueTiming: string;
  invoiceNumber: string;
  status: 'due_soon' | 'overdue' | 'future';
}

export interface DashboardData {
  cards: OperationalCardsData;
  overview: OverviewCountsData;
  schedule: ScheduleAppointment[];
  paymentReminders: PaymentReminder[];
  notifications: {
    unreadCount: number;
  };
}
