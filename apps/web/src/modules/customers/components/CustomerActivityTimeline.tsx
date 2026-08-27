import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useCustomerActivitiesQuery } from '../customer.api';
import { Activity, Clock, User, CheckCircle2 } from 'lucide-react';

export interface CustomerActivityTimelineProps {
  customerId: string;
}

export const CustomerActivityTimeline: React.FC<CustomerActivityTimelineProps> = ({ customerId }) => {
  const { data: response, isLoading, isError } = useCustomerActivitiesQuery(customerId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const activities = response?.data || [];

  if (isError || activities.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="w-6 h-6 text-slate-400" />}
        title="No activity history recorded"
        description="Historical relationship events and administrative actions will appear here in chronological order."
      />
    );
  }

  return (
    <Card className="border-slate-200">
      <CardContent className="p-6">
        <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-200">
          {activities.map((act) => (
            <div key={act.id} className="relative flex items-start gap-4">
              {/* Timeline Bullet Node */}
              <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full bg-white border-2 border-primary-600 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-primary-600" />
              </div>

              <div className="flex-1 bg-slate-50/70 p-3.5 rounded-btn border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{act.description}</span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(act.timestamp).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {act.actorName && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Triggered by {act.actorName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
