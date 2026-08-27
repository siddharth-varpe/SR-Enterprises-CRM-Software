import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from '../ui/Drawer';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useUIStore } from '../../stores/ui-store';
import {
  useNotificationsQuery,
  useUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../../modules/notifications/notifications.api';
import type { NotificationItem, NotificationSeverity } from '@crm/types';

export const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { notificationCenterOpen, setNotificationCenterOpen } = useUIStore();
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | 'CRITICAL'>('ALL');

  const queryFilter = {
    isRead: filterType === 'UNREAD' ? false : undefined,
    severity: filterType === 'CRITICAL' ? ('CRITICAL' as NotificationSeverity) : undefined,
  };

  const { data: notificationsData, isLoading } = useNotificationsQuery(queryFilter);
  const { data: unreadSummary } = useUnreadNotificationCountQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const notifications = notificationsData?.data || [];
  const unreadCount = unreadSummary?.unreadCount ?? 0;

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.actionUrl) {
      setNotificationCenterOpen(false);
      navigate(notif.actionUrl);
    }
  };

  const getSeverityIcon = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'WARNING':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'INFO':
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge variant="danger" className="text-[10px]">Critical</Badge>;
      case 'WARNING':
        return <Badge variant="warning" className="text-[10px]">Warning</Badge>;
      case 'SUCCESS':
        return <Badge variant="success" className="text-[10px]">Success</Badge>;
      case 'INFO':
      default:
        return <Badge variant="neutral" className="text-[10px]">Info</Badge>;
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <Drawer
      isOpen={notificationCenterOpen}
      onClose={() => setNotificationCenterOpen(false)}
      title="Notifications & Operational Alerts"
      size="md"
    >
      <div className="flex flex-col h-full">
        {/* Top Filter Bar & Mark All as Read */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType('UNREAD')}
              className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer flex items-center gap-1 ${
                filterType === 'UNREAD'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilterType('CRITICAL')}
              className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
                filterType === 'CRITICAL'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Critical Alerts
            </button>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              className="text-xs text-primary-600 hover:text-primary-700 gap-1"
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </Button>
          )}
        </div>

        {/* Notifications Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading alerts...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">All caught up!</p>
              <p className="text-xs text-slate-400">No unread operational notifications</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 rounded-lg transition-all cursor-pointer border ${
                  notif.isRead
                    ? 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                    : 'bg-blue-50/40 border-blue-100 hover:bg-blue-50/70 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 shadow-xs flex items-center justify-center shrink-0">
                    {getSeverityIcon(notif.severity)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-xs font-semibold ${notif.isRead ? 'text-slate-800' : 'text-blue-950 font-bold'}`}>
                        {notif.title}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getSeverityBadge(notif.severity)}
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(notif.createdAt)}
                      </span>

                      {notif.actionUrl && (
                        <span className="text-primary-600 hover:underline flex items-center gap-0.5 font-medium">
                          View details <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Link to Full Notifications Center */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
          <button
            type="button"
            onClick={() => {
              setNotificationCenterOpen(false);
              navigate('/notifications');
            }}
            className="text-xs text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Open Full Notifications Directory</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Drawer>
  );
};
