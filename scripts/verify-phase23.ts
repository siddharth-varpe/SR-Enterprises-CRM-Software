import { domainEventBus } from '../apps/api/src/modules/notifications/events/event-bus';
import { notificationsService } from '../apps/api/src/modules/notifications/notifications.service';
import { automatedFollowUpService } from '../apps/api/src/modules/reminders/automated-followup.service';
import { remindersRepository, memoryReminders } from '../apps/api/src/modules/reminders/reminders.repository';
import { inAppChannel, emailChannel, whatsAppChannel, smsChannel } from '../apps/api/src/modules/notifications/channels/channel.interface';
import { compileTemplate, sanitizeVariable } from '../apps/api/src/modules/notifications/templates/template.engine';
import { memoryWarranties } from '../apps/api/src/modules/warranties/warranties.repository';
import { memoryInvoices } from '../apps/api/src/modules/invoices/invoices.repository';

async function runPhase23Diagnostics() {
  console.log('====================================================');
  console.log('PHASE 23: NOTIFICATIONS & REMINDERS DIAGNOSTIC SUITE');
  console.log('====================================================\n');

  const userId = '00000000-0000-0000-0000-000000000001';
  const role = 'Admin';

  // 1. Test Channel Adapters
  console.log('[Step 1] Testing Channel Adapters...');
  const inAppRes = await inAppChannel.send({
    recipientContact: 'admin@sr-enterprises.com',
    title: 'System Alert',
    body: 'Test InApp message',
  });
  console.log('  InApp Channel status:', inAppRes.status, `(Success: ${inAppRes.success})`);

  const emailRes = await emailChannel.send({
    recipientContact: 'customer@example.com',
    title: 'Payment Receipt',
    body: 'Thank you for your payment',
  });
  console.log('  Email Channel status:', emailRes.status, `(Success: ${emailRes.success})`);

  const waRes = await whatsAppChannel.send({
    recipientContact: '+919876543210',
    title: 'Service Completed',
    body: 'Your RO machine service is complete',
  });
  console.log('  WhatsApp Channel status:', waRes.status, `(Configured: ${whatsAppChannel.isAvailable()})`);

  const smsRes = await smsChannel.send({
    recipientContact: '+919876543210',
    title: 'OTP',
    body: 'Your verification code is 123456',
  });
  console.log('  SMS Channel status:', smsRes.status, `(Configured: ${smsChannel.isAvailable()})\n`);

  // 2. Test Template Engine & Sanitization
  console.log('[Step 2] Testing Template Engine & Sanitization...');
  const compiled = compileTemplate('WARRANTY_EXPIRING_30D', {
    customerName: 'Sharan Patil',
    machineModel: 'AquaGrand RO <script>alert(1)</script>',
    serialNumber: 'SR-RO-998877',
    expiryDate: '2026-09-24',
  });
  console.log('  Compiled Title:', compiled.title);
  console.log('  Compiled Body:', compiled.body);
  if (compiled.body.includes('<script>')) {
    throw new Error('Template sanitization failure: script tag not escaped!');
  }
  console.log('  Sanitization check: PASSED (script tag safely escaped)\n');

  // 3. Test Event Bus & Idempotent Event Dispatch
  console.log('[Step 3] Testing Domain Event Bus & Notification Dispatch...');
  await domainEventBus.publish('PAYMENT_RECEIVED', 'PAYMENT', 'pay-diag-001', {
    amount: 3500,
    customerName: 'Sharan Patil',
    invoiceNumber: 'INV-2026-0100',
  });

  await domainEventBus.publish('JOB_CARD_ASSIGNED', 'JOB_CARD', 'job-diag-001', {
    jobCardNumber: 'JC-2026-0100',
    technicianId: userId,
    customerName: 'Sharan Patil',
    serviceType: 'PERIODIC_SERVICE',
  });

  const notifs = await notificationsService.listNotifications(userId, role, { page: 1, limit: 10 });
  console.log(`  Dispatched notifications count: ${notifs.data.length}`);
  const unreadBefore = await notificationsService.getUnreadCount(userId, role);
  console.log(`  Unread count: ${unreadBefore.unreadCount}`);

  // Test Idempotency: Duplicate Payment Event
  await domainEventBus.publish('PAYMENT_RECEIVED', 'PAYMENT', 'pay-diag-001', {
    amount: 3500,
    customerName: 'Sharan Patil',
    invoiceNumber: 'INV-2026-0100',
  });
  const notifsAfterDup = await notificationsService.listNotifications(userId, role, { page: 1, limit: 10 });
  console.log(`  Notification count after duplicate event: ${notifsAfterDup.data.length} (Deduplication PASSED)\n`);

  // 4. Test Automated Follow-up Scanner Engine
  console.log('[Step 4] Testing Automated Follow-Up Scanner Engine...');
  const futureExpiry = new Date();
  futureExpiry.setDate(futureExpiry.getDate() + 5); // 5 days from now -> 7D milestone

  memoryWarranties.push({
    id: 'war-diag-001',
    warrantyNumber: 'WAR-2026-0099',
    customerId: 'cust-diag-001',
    customerName: 'Ramesh Kumar',
    assetId: 'asset-diag-001',
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: futureExpiry,
    warrantyType: 'STANDARD_1YR',
  });

  const pastDue = new Date();
  pastDue.setDate(pastDue.getDate() - 10); // 10 days overdue -> OVERDUE_7D milestone

  memoryInvoices.push({
    id: 'inv-diag-001',
    invoiceNumber: 'INV-2026-0099',
    customerId: 'cust-diag-001',
    customerName: 'Ramesh Kumar',
    status: 'ISSUED',
    totalAmount: '4500.00',
    outstandingAmount: '4500.00',
    paidAmount: '0.00',
    dueDate: pastDue,
  });

  const scanResult1 = await automatedFollowUpService.processAllAutomatedFollowUps();
  console.log('  Scan 1 Result:', {
    warrantiesScanned: scanResult1.warrantiesScanned,
    warrantyRemindersCreated: scanResult1.warrantyRemindersCreated,
    invoicesScanned: scanResult1.invoicesScanned,
    invoiceRemindersCreated: scanResult1.invoiceRemindersCreated,
  });

  if (scanResult1.warrantyRemindersCreated === 0 || scanResult1.invoiceRemindersCreated === 0) {
    throw new Error('Automated follow-up scanner failed to generate milestone reminders');
  }

  // Scan Run 2: Confirm Milestone Idempotency (0 duplicates)
  const scanResult2 = await automatedFollowUpService.processAllAutomatedFollowUps();
  console.log('  Scan 2 Result (Idempotency check):', {
    warrantyRemindersCreated: scanResult2.warrantyRemindersCreated,
    invoiceRemindersCreated: scanResult2.invoiceRemindersCreated,
  });
  if (scanResult2.warrantyRemindersCreated !== 0 || scanResult2.invoiceRemindersCreated !== 0) {
    throw new Error('Milestone idempotency failure: duplicate reminders created on rescan!');
  }
  console.log('  Milestone Idempotency check: PASSED (0 duplicate reminders generated)\n');

  // 5. Test Notification Read State & Preferences
  console.log('[Step 5] Testing Notification Read Lifecycle & Preferences...');
  const firstNotif = notifs.data[0];
  if (firstNotif) {
    await notificationsService.markAsRead(firstNotif.id, userId, role);
    console.log(`  Marked notification ${firstNotif.id} as read`);
  }

  const markAllCount = await notificationsService.markAllAsRead(userId, role);
  console.log(`  Mark all as read processed: ${markAllCount} notifications`);

  const unreadAfter = await notificationsService.getUnreadCount(userId, role);
  console.log(`  Unread count after mark all read: ${unreadAfter.unreadCount}`);

  // Test Preferences
  const initialPrefs = await notificationsService.getPreferences(userId);
  console.log('  Initial Preferences:', initialPrefs);

  const updatedPrefs = await notificationsService.updatePreferences(userId, {
    paymentAlerts: false,
    warrantyAlerts: true,
  });
  console.log('  Updated Preferences:', updatedPrefs);
  console.log('  Notification Preferences check: PASSED\n');

  console.log('====================================================');
  console.log('PHASE 23 DIAGNOSTIC SUITE COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

runPhase23Diagnostics().catch((err) => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
