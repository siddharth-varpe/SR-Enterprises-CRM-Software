import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/SearchInput';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  useWhatsAppConversations,
  useWhatsAppConversation,
  useWhatsAppMessages,
  useSendWhatsAppTextMessage,
  useUpdateWhatsAppConsent,
  useMarkWhatsAppConversationRead,
} from './whatsapp.api';
import { WhatsAppSendTemplateModal } from './components/WhatsAppSendTemplateModal';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthBoundary';
import type { WhatsAppMessage } from '@crm/types';
import {
  MessageSquare,
  Send,
  FileText,
  User,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const WhatsAppHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { hasPermission } = useAuth();

  const activeConversationId = searchParams.get('conversation') || undefined;

  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversationsData, isLoading: isConversationsLoading } = useWhatsAppConversations({
    search: searchTerm || undefined,
  });

  const { data: activeConversation } = useWhatsAppConversation(activeConversationId);
  const { data: messagesData, isLoading: isMessagesLoading } = useWhatsAppMessages(
    activeConversationId
  );

  const sendTextMutation = useSendWhatsAppTextMessage();
  const consentMutation = useUpdateWhatsAppConsent();
  const markReadMutation = useMarkWhatsAppConversationRead();

  const canSend = hasPermission('whatsapp.send');

  // Auto-scroll messages to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.data]);

  // Mark as read when opening conversation with unread count
  useEffect(() => {
    if (activeConversationId && activeConversation && activeConversation.unreadCount > 0) {
      markReadMutation.mutate(activeConversationId);
    }
  }, [activeConversationId, activeConversation?.unreadCount]);

  const handleSelectConversation = (convId: string) => {
    setSearchParams({ conversation: convId });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversationId) return;

    try {
      await sendTextMutation.mutateAsync({
        conversationId: activeConversationId,
        content: messageText.trim(),
      });
      setMessageText('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send WhatsApp message', 'Message Error');
    }
  };

  const handleConsentChange = async (optInStatus: 'OPTED_IN' | 'OPTED_OUT') => {
    if (!activeConversation?.contact) return;
    try {
      await consentMutation.mutateAsync({
        contactId: activeConversation.contact.id,
        optInStatus,
      });
      toast.success(`Customer WhatsApp consent updated to ${optInStatus}`, 'Consent Updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update consent', 'Error');
    }
  };

  // Delivery status tick icon helper
  const renderDeliveryStatus = (msg: WhatsAppMessage) => {
    if (msg.direction === 'INBOUND') return null;

    switch (msg.status) {
      case 'QUEUED':
        return (
          <span title="Queued">
            <Clock className="w-3 h-3 text-slate-400" />
          </span>
        );
      case 'SENT':
        return (
          <span title="Sent to WhatsApp">
            <Check className="w-3 h-3 text-slate-400" />
          </span>
        );
      case 'DELIVERED':
        return (
          <span title="Delivered to phone">
            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
          </span>
        );
      case 'READ':
        return (
          <span title="Read by recipient">
            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
          </span>
        );
      case 'FAILED':
        return (
          <span title={msg.errorMessage || 'Delivery failed'}>
            <AlertCircle className="w-3 h-3 text-red-500" />
          </span>
        );
      default:
        return null;
    }
  };

  const conversations = conversationsData?.data || [];
  const messages = messagesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="WhatsApp Business Hub"
        description="Official WhatsApp Business communication center for customer service updates, invoice reminders, and lead follow-ups."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'WhatsApp Hub' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<MessageSquare className="w-4 h-4 text-blue-600" />}
              onClick={() => navigate('/inquiries')}
            >
              Inquiries Directory
            </Button>
            {canSend && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<FileText className="w-4 h-4" />}
                onClick={() => setIsTemplateModalOpen(true)}
              >
                Send Template
              </Button>
            )}
          </div>
        }
      />

      {/* Main Hub 3-Pane / 2-Pane Container */}
      <Card className="border-slate-200 shadow-sm overflow-hidden min-h-[620px] flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Pane: Conversation Threads (Cols 1-4) */}
          <div className="lg:col-span-4 flex flex-col bg-slate-50/50">
            {/* Search Header */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <SearchInput
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Conversation Threads List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[580px]">
              {isConversationsLoading ? (
                <div className="p-6">
                  <LoadingState message="Loading conversations..." />
                </div>
              ) : conversations.length > 0 ? (
                conversations.map((conv: any) => {
                  const isSelected = conv.id === activeConversationId;
                  const displayName = conv.customer?.fullName || conv.contact?.phone || 'Contact';

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-primary-50/80 border-l-4 border-primary-600'
                          : 'hover:bg-slate-100/70 bg-white'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {displayName.charAt(0).toUpperCase()}
                      </div>

                      {/* Thread Details */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {displayName}
                          </span>
                          {conv.lastMessageAt && (
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(conv.lastMessageAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-slate-500 truncate">
                          {conv.contact?.phone}
                        </div>

                        <div className="flex items-center justify-between pt-0.5">
                          <p className="text-xs text-slate-600 truncate pr-2">
                            {conv.lastMessagePreview || <span className="italic text-slate-400">No messages yet</span>}
                          </p>

                          {conv.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-600 text-white shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No WhatsApp conversations found.
                </div>
              )}
            </div>
          </div>

          {/* Center Pane: Active Message Thread (Cols 5-9) */}
          <div className="lg:col-span-5 flex flex-col bg-white">
            {activeConversation ? (
              <>
                {/* Chat Top Header */}
                <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#00152B] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      {activeConversation.customer?.fullName?.charAt(0) || 'W'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {activeConversation.customer?.fullName || activeConversation.contact?.phone}
                        </span>
                        {activeConversation.customer && (
                          <Badge variant="primary">
                            {activeConversation.customer.customerNumber}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {activeConversation.contact?.phone}
                      </span>
                    </div>
                  </div>

                  {activeConversation.customer && (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                      onClick={() => navigate(`/customers/${activeConversation.customer?.id}`)}
                    >
                      Profile
                    </Button>
                  )}
                </div>

                {/* Message Bubble Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F4F6F8] max-h-[460px]">
                  {isMessagesLoading ? (
                    <LoadingState message="Loading messages..." />
                  ) : messages.length > 0 ? (
                    messages.map((msg) => {
                      const isOutbound = msg.direction === 'OUTBOUND';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs space-y-1.5 ${
                              isOutbound
                                ? 'bg-emerald-700 text-white rounded-tr-xs'
                                : 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs'
                            }`}
                          >
                            {msg.templateName && (
                              <div
                                className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded inline-block ${
                                  isOutbound ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                Template: {msg.templateName.replace(/_/g, ' ')}
                              </div>
                            )}

                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                            <div
                              className={`flex items-center justify-end gap-1.5 text-[10px] ${
                                isOutbound ? 'text-emerald-100' : 'text-slate-400'
                              }`}
                            >
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {renderDeliveryStatus(msg)}
                            </div>
                          </div>

                          {msg.status === 'FAILED' && msg.errorMessage && (
                            <span className="text-[10px] text-red-600 font-medium mt-0.5 px-1">
                              Failed: {msg.errorMessage}
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs italic">
                      No message history in this thread yet.
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Composer */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Type a WhatsApp message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 text-xs px-3.5 py-2 rounded-btn border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!messageText.trim() || sendTextMutation.isPending}
                    isLoading={sendTextMutation.isPending}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Send
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
                <EmptyState
                  title="No conversation selected"
                  description="Select a conversation thread from the left list or send an official template message to start communicating with a customer."
                  actionLabel={canSend ? 'Send Template' : undefined}
                  onAction={canSend ? () => setIsTemplateModalOpen(true) : undefined}
                />
              </div>
            )}
          </div>

          {/* Right Pane: Customer Context & Communication Consent (Cols 10-12) */}
          <div className="lg:col-span-3 p-4 space-y-4 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Customer Context &amp; Consent
            </span>

            {activeConversation ? (
              <div className="space-y-4 text-xs">
                {/* Account card */}
                <div className="p-3.5 bg-white rounded-btn border border-slate-200 space-y-2">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary-600" />
                    <span>Customer Account</span>
                  </span>

                  {activeConversation.customer ? (
                    <div className="space-y-1 text-slate-700">
                      <div className="font-bold text-slate-900">
                        {activeConversation.customer.fullName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {activeConversation.customer.customerNumber}
                      </div>
                      <div className="pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-center text-[11px]"
                          onClick={() => navigate(`/customers/${activeConversation.customer?.id}`)}
                        >
                          View Customer Profile
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No linked customer account</p>
                  )}
                </div>

                {/* Consent Status Card */}
                <div className="p-3.5 bg-white rounded-btn border border-slate-200 space-y-2.5">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Communication Consent</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        activeConversation.contact?.optInStatus === 'OPTED_IN'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : activeConversation.contact?.optInStatus === 'OPTED_OUT'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {activeConversation.contact?.optInStatus || 'UNKNOWN'}
                    </span>
                  </div>

                  <div className="pt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleConsentChange('OPTED_IN')}
                      disabled={consentMutation.isPending}
                      className="flex-1 py-1 px-2 rounded text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                    >
                      Opt-In
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConsentChange('OPTED_OUT')}
                      disabled={consentMutation.isPending}
                      className="flex-1 py-1 px-2 rounded text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-colors"
                    >
                      Opt-Out
                    </button>
                  </div>
                </div>

                {/* Quick Pre-Approved Templates Dispatch */}
                <div className="p-3.5 bg-white rounded-btn border border-slate-200 space-y-2">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Transactional Templates</span>
                  </span>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Dispatch pre-approved templates for invoice reminders, service visits, or job
                    completions.
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center text-[11px]"
                    onClick={() => setIsTemplateModalOpen(true)}
                  >
                    Select Template
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs italic">
                Select a conversation thread to view contact metadata.
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Template Sender Modal */}
      <WhatsAppSendTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        defaultPhone={activeConversation?.contact?.phone || ''}
        defaultCustomerId={activeConversation?.customerId || undefined}
        defaultConversationId={activeConversation?.id || undefined}
      />
    </div>
  );
};
