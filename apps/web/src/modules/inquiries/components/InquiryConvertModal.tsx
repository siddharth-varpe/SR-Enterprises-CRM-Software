import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { useConvertInquiry } from '../inquiries.api';
import { useToast } from '../../../providers/ToastProvider';
import type { Inquiry } from '@crm/types';
import { UserCheck, Building, MapPin, AlertCircle } from 'lucide-react';

interface InquiryConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Inquiry;
}

export const InquiryConvertModal: React.FC<InquiryConvertModalProps> = ({
  isOpen,
  onClose,
  inquiry,
}) => {
  const toast = useToast();
  const navigate = useNavigate();
  const convertMutation = useConvertInquiry();

  const [customerType, setCustomerType] = useState<'INDIVIDUAL' | 'COMMERCIAL'>('INDIVIDUAL');
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [addressLine1, setAddressLine1] = useState(inquiry.address || '');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState(inquiry.city || 'Pune');
  const [state, setState] = useState('Maharashtra');
  const [postalCode, setPostalCode] = useState('411001');
  const [notes, setNotes] = useState(`Converted from inquiry ${inquiry.inquiryNumber}`);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await convertMutation.mutateAsync({
        id: inquiry.id,
        payload: {
          customerType,
          companyName: customerType === 'COMMERCIAL' ? companyName.trim() : undefined,
          gstNumber: customerType === 'COMMERCIAL' ? gstNumber.trim() : undefined,
          addressLine1: addressLine1.trim() || undefined,
          addressLine2: addressLine2.trim() || undefined,
          landmark: landmark.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || 'Maharashtra',
          postalCode: postalCode.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });

      toast.success(
        response.data.isExistingCustomerLinked
          ? `Inquiry linked to existing customer ${response.data.customerNumber}`
          : `New customer account ${response.data.customerNumber} created!`,
        'Inquiry Converted'
      );

      onClose();
      // Navigate directly to customer profile
      navigate(`/customers/${response.data.customerId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert inquiry', 'Conversion Error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Convert Inquiry to Customer Account"
      description={`Convert ${inquiry.name} (${inquiry.inquiryNumber}) into an active CRM customer`}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={convertMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConvert}
            isLoading={convertMutation.isPending}
            leftIcon={<UserCheck className="w-4 h-4" />}
          >
            Confirm &amp; Convert
          </Button>
        </div>
      }
    >
      <form onSubmit={handleConvert} className="space-y-4">
        {/* Anti-Duplicate Notice Banner */}
        <div className="bg-primary-50/70 border border-primary-200 rounded-btn p-3 text-xs text-primary-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Intelligent Customer Deduplication</span>
            <span>
              If a customer account already exists with phone{' '}
              <strong className="font-mono">{inquiry.phone}</strong>, the inquiry will be linked to
              that existing account. Otherwise, a new account will be created. The original inquiry
              remains in business history.
            </span>
          </div>
        </div>

        {/* Lead Profile Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-btn p-3 text-xs space-y-1">
          <div className="grid grid-cols-2 gap-2 text-slate-700">
            <div>
              <span className="text-slate-500">Contact:</span>{' '}
              <span className="font-medium text-slate-900">{inquiry.name}</span>
            </div>
            <div>
              <span className="text-slate-500">Mobile:</span>{' '}
              <span className="font-mono font-medium text-slate-900">{inquiry.phone}</span>
            </div>
            {inquiry.email && (
              <div>
                <span className="text-slate-500">Email:</span>{' '}
                <span className="font-medium text-slate-900">{inquiry.email}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500">Source:</span>{' '}
              <span className="font-medium text-slate-900">{inquiry.source}</span>
            </div>
          </div>
        </div>

        {/* Customer Account Configuration */}
        <div className="space-y-3 pt-1">
          <Select
            label="Customer Account Type"
            value={customerType}
            onChange={(val) => setCustomerType(val as any)}
            options={[
              { value: 'INDIVIDUAL', label: 'Individual / Residential Customer' },
              { value: 'COMMERCIAL', label: 'Commercial / Corporate Business' },
            ]}
          />

          {customerType === 'COMMERCIAL' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-btn border border-slate-200">
              <Input
                label="Company / Enterprise Name *"
                placeholder="e.g. Pune Tech Solutions Pvt Ltd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                leftIcon={<Building className="w-4 h-4 text-slate-400" />}
                required
              />
              <Input
                label="GSTIN Number"
                placeholder="e.g. 27ABCDE1234F1Z5"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <MapPin className="w-3.5 h-3.5 text-primary-600" />
              <span>Service Location &amp; Registered Address</span>
            </div>

            <Input
              label="Address Line 1"
              placeholder="Flat / Building / Street"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Address Line 2"
                placeholder="Area / Sector"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
              />
              <Input
                label="Landmark"
                placeholder="e.g. Near Ganpati Temple"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
              <Input
                label="PIN Code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
          </div>

          <Textarea
            label="Customer Notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};
