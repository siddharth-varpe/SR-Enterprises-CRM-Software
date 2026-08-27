import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useWhatsAppTemplates, useSendWhatsAppTemplateMessage } from '../whatsapp.api';
import { useToast } from '../../../providers/ToastProvider';
import { Send } from 'lucide-react';

interface WhatsAppSendTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPhone?: string;
  defaultCustomerId?: string;
  defaultConversationId?: string;
  defaultTemplateName?: string;
  initialParams?: Record<string, string>;
}

export const WhatsAppSendTemplateModal: React.FC<WhatsAppSendTemplateModalProps> = ({
  isOpen,
  onClose,
  defaultPhone = '',
  defaultCustomerId,
  defaultConversationId,
  defaultTemplateName,
  initialParams = {},
}) => {
  const toast = useToast();
  const { data: templates = [] } = useWhatsAppTemplates();
  const sendTemplateMutation = useSendWhatsAppTemplateMessage();

  const [selectedTemplateName, setSelectedTemplateName] = useState(
    defaultTemplateName || 'invoice_reminder'
  );
  const [recipientPhone, setRecipientPhone] = useState(defaultPhone);
  const [params, setParams] = useState<Record<string, string>>(initialParams);

  const activeTemplate: any = templates.find((t: any) => t.name === selectedTemplateName);

  useEffect(() => {
    if (defaultPhone) setRecipientPhone(defaultPhone);
  }, [defaultPhone]);

  useEffect(() => {
    if (defaultTemplateName) setSelectedTemplateName(defaultTemplateName);
  }, [defaultTemplateName]);

  useEffect(() => {
    if (initialParams && Object.keys(initialParams).length > 0) {
      setParams(initialParams);
    }
  }, [initialParams]);

  const handleParamChange = (key: string, value: string) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  // Render preview
  const getRenderedPreview = () => {
    if (!activeTemplate) return '';
    let text = activeTemplate.sampleText;
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`{{${k}}}`, 'g'), v || `[${k}]`);
    }
    return text;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone.trim()) {
      toast.error('Recipient phone number is required', 'Validation Error');
      return;
    }

    try {
      await sendTemplateMutation.mutateAsync({
        templateName: selectedTemplateName,
        recipientPhone: recipientPhone.trim(),
        customerId: defaultCustomerId,
        conversationId: defaultConversationId,
        parameters: params,
      });

      toast.success(
        `Pre-approved WhatsApp template "${selectedTemplateName}" sent successfully`,
        'Template Dispatched'
      );
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch WhatsApp template', 'Send Error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send WhatsApp Business Template"
      description="Select and dispatch an officially pre-approved WhatsApp notification template"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={sendTemplateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            isLoading={sendTemplateMutation.isPending}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Send WhatsApp Template
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSend} className="space-y-4">
        <Input
          label="Recipient Mobile Number *"
          placeholder="e.g. 9876543210 or +919876543210"
          value={recipientPhone}
          onChange={(e) => setRecipientPhone(e.target.value)}
          required
        />

        <Select
          label="Select Official Template"
          value={selectedTemplateName}
          onChange={(e) => {
            setSelectedTemplateName(e.target.value);
            setParams({});
          }}
          options={templates.map((t: any) => ({
            value: t.name,
            label: `${t.name.replace(/_/g, ' ').toUpperCase()} (${t.category})`,
          }))}
        />

        {activeTemplate && (
          <div className="space-y-3 pt-1">
            <span className="text-xs text-slate-500 block leading-relaxed">
              {activeTemplate.description}
            </span>

            {/* Template Dynamic Parameters */}
            <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-btn border border-slate-200">
              <span className="text-xs font-semibold text-slate-900 block">
                Template Variables &amp; Placeholders
              </span>

              {(activeTemplate.parameterKeys || []).map((key: string) => (
                <Input
                  key={key}
                  label={key.replace(/_/g, ' ').toUpperCase()}
                  placeholder={`Enter ${key.replace(/_/g, ' ')}...`}
                  value={params[key] || ''}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                />
              ))}
            </div>

            {/* Live Message Preview Box */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-semibold text-slate-700 block">
                Customer Message Preview
              </span>
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-btn text-xs text-emerald-950 whitespace-pre-wrap leading-relaxed">
                {getRenderedPreview()}
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
