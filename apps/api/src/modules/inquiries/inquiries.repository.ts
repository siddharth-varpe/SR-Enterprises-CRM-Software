import { db } from '../../database/client';
import {
  inquiries,
  inquiryEvents,
  customers,
  customerAddresses,
  customerActivities,
} from '../../database/schema/index';
import { eq, and, or, ilike, desc, asc, count, gte, lte } from 'drizzle-orm';
import { generateBusinessNumber } from '../../database/sequences';
import type {
  CreateInquiryInput,
  UpdateInquiryInput,
  InquiryQueryFilterInput,
  ConvertInquiryInput,
} from '@crm/validation';
import type { InquiryStatus } from '@crm/types';

export class InquiriesRepository {
  /**
   * Find paginated inquiries with multi-criteria server-side filtering, sorting, and full joins
   */
  async findPaginated(filters: InquiryQueryFilterInput, database = db) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    // Filter by status
    if (filters.status) {
      conditions.push(eq(inquiries.status, filters.status as any));
    }

    // Filter by source
    if (filters.source) {
      conditions.push(eq(inquiries.source, filters.source as any));
    }

    // Filter by inquiry type
    if (filters.inquiryType) {
      conditions.push(eq(inquiries.inquiryType, filters.inquiryType as any));
    }

    // Filter by priority
    if (filters.priority) {
      conditions.push(eq(inquiries.priority, filters.priority as any));
    }

    // Filter by assigned staff user
    if (filters.assignedToUserId) {
      conditions.push(eq(inquiries.assignedToUserId, filters.assignedToUserId));
    }

    // Filter by duplicate flag
    if (filters.isPossibleDuplicate !== undefined) {
      conditions.push(eq(inquiries.isPossibleDuplicate, filters.isPossibleDuplicate));
    }

    // Date range filter
    if (filters.dateFrom) {
      conditions.push(gte(inquiries.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lte(inquiries.createdAt, new Date(filters.dateTo)));
    }

    // Search query across inquiryNumber, name, phone, email, city
    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(inquiries.inquiryNumber, searchPattern),
          ilike(inquiries.name, searchPattern),
          ilike(inquiries.phone, searchPattern),
          ilike(inquiries.email, searchPattern),
          ilike(inquiries.city, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting resolution
    let orderByClause;
    const direction = filters.sortOrder === 'asc' ? asc : desc;
    switch (filters.sortBy) {
      case 'inquiryNumber':
        orderByClause = direction(inquiries.inquiryNumber);
        break;
      case 'priority':
        orderByClause = direction(inquiries.priority);
        break;
      case 'status':
        orderByClause = direction(inquiries.status);
        break;
      case 'followUpDate':
        orderByClause = direction(inquiries.followUpDate);
        break;
      case 'createdAt':
      default:
        orderByClause = direction(inquiries.createdAt);
        break;
    }

    // Execute count query
    const [totalRecord] = await database
      .select({ total: count() })
      .from(inquiries)
      .where(whereClause);

    const total = Number(totalRecord?.total || 0);

    // Execute records query
    const records = await database.query.inquiries.findMany({
      where: whereClause,
      orderBy: orderByClause,
      limit,
      offset,
      with: {
        assignedToUser: {
          columns: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
        convertedCustomer: {
          columns: {
            id: true,
            customerNumber: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find single inquiry by ID with full relations & event timeline
   */
  async findById(id: string, database = db) {
    return database.query.inquiries.findFirst({
      where: eq(inquiries.id, id),
      with: {
        assignedToUser: {
          columns: {
            id: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
        assignedByUser: {
          columns: {
            id: true,
            displayName: true,
            role: true,
          },
        },
        convertedCustomer: {
          columns: {
            id: true,
            customerNumber: true,
            fullName: true,
            phone: true,
            companyName: true,
          },
        },
        convertedByUser: {
          columns: {
            id: true,
            displayName: true,
            role: true,
          },
        },
        events: {
          orderBy: [asc(inquiryEvents.createdAt)],
          with: {
            actorUser: {
              columns: {
                id: true,
                displayName: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Check for potential recent duplicates by phone number (within 48 hours)
   */
  async findRecentDuplicate(phone: string, timeWindowHours = 48, database = db) {
    const cleanPhone = phone.trim();
    const thresholdDate = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    return database.query.inquiries.findFirst({
      where: and(
        eq(inquiries.phone, cleanPhone),
        gte(inquiries.createdAt, thresholdDate),
        or(
          eq(inquiries.status, 'NEW'),
          eq(inquiries.status, 'CONTACTED'),
          eq(inquiries.status, 'FOLLOW_UP'),
          eq(inquiries.status, 'IN_PROGRESS'),
          eq(inquiries.status, 'QUALIFIED')
        )
      ),
      orderBy: [desc(inquiries.createdAt)],
    });
  }

  /**
   * Create a new inquiry with atomic human-readable sequence number,
   * duplicate detection, and event audit logging
   */
  async createInquiry(
    input: CreateInquiryInput & { isPublicSubmission?: boolean },
    actorUserId?: string,
    database = db
  ) {
    return database.transaction(async (tx) => {
      // 1. Generate collision-resistant unique sequence number: INQ-YYYY-000001
      const sequence = await generateBusinessNumber(tx, 'INQUIRY', 'INQ', { padding: 6 });

      // 2. Check for duplicate inquiries with same phone in last 48h
      const existingRecent = await this.findRecentDuplicate(input.phone, 48, tx);
      const isPossibleDuplicate = !!existingRecent;
      const duplicateOfInquiryId = existingRecent ? existingRecent.id : null;

      // 3. Prepare inquiry record
      const [newInquiry] = await tx
        .insert(inquiries)
        .values({
          inquiryNumber: sequence.sequenceNumber,
          name: (input.name || (input as any).customerName || 'Inquiry').trim(),
          phone: input.phone.trim(),
          email: input.email?.trim() || null,
          address: input.address?.trim() || null,
          city: input.city?.trim() || null,
          productInterest: input.productInterest?.trim() || null,
          serviceInterest: input.serviceInterest?.trim() || null,
          inquiryType: (input.inquiryType as any) || 'GENERAL',
          message: input.message?.trim() || null,
          source: (input.source as any) || 'WEBSITE',
          status: 'NEW',
          priority: (input.priority as any) || 'NORMAL',
          assignedToUserId: input.assignedToUserId || null,
          assignedByUserId: input.assignedToUserId && actorUserId ? actorUserId : null,
          assignedAt: input.assignedToUserId ? new Date() : null,
          followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
          notes: input.notes?.trim() || null,
          isPossibleDuplicate,
          duplicateOfInquiryId,
        })
        .returning();

      if (!newInquiry) {
        throw new Error('Failed to insert inquiry record');
      }

      // 4. Log creation event in inquiry_events
      try {
        await tx.insert(inquiryEvents).values({
          inquiryId: newInquiry.id,
          eventType: 'CREATED',
          actorUserId: actorUserId || null,
          notes: isPossibleDuplicate
            ? `Inquiry received. Flagged as possible duplicate of ${existingRecent?.inquiryNumber}`
            : 'Inquiry received and registered in system',
          metadata: {
            source: newInquiry.source,
            inquiryType: newInquiry.inquiryType,
            isPossibleDuplicate,
            duplicateOfInquiryId,
            isPublicSubmission: !!input.isPublicSubmission,
          },
        });
      } catch {}

      // If assigned at creation, log assignment event
      if (input.assignedToUserId) {
        await tx.insert(inquiryEvents).values({
          inquiryId: newInquiry.id,
          eventType: 'ASSIGNED',
          actorUserId: actorUserId || null,
          notes: 'Assigned during initial inquiry creation',
          metadata: { assignedToUserId: input.assignedToUserId },
        });
      }

      return newInquiry;
    });
  }

  /**
   * Update inquiry details
   */
  async updateInquiry(id: string, input: UpdateInquiryInput, actorUserId?: string, database = db) {
    return database.transaction(async (tx) => {
      const updatePayload: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updatePayload.name = input.name.trim();
      if (input.phone !== undefined) updatePayload.phone = input.phone.trim();
      if (input.email !== undefined) updatePayload.email = input.email ? input.email.trim() : null;
      if (input.address !== undefined) updatePayload.address = input.address ? input.address.trim() : null;
      if (input.city !== undefined) updatePayload.city = input.city ? input.city.trim() : null;
      if (input.productInterest !== undefined)
        updatePayload.productInterest = input.productInterest ? input.productInterest.trim() : null;
      if (input.serviceInterest !== undefined)
        updatePayload.serviceInterest = input.serviceInterest ? input.serviceInterest.trim() : null;
      if (input.inquiryType !== undefined) updatePayload.inquiryType = input.inquiryType;
      if (input.priority !== undefined) updatePayload.priority = input.priority;
      if (input.followUpDate !== undefined)
        updatePayload.followUpDate = input.followUpDate ? new Date(input.followUpDate) : null;
      if (input.notes !== undefined) updatePayload.notes = input.notes ? input.notes.trim() : null;

      const [updated] = await tx
        .update(inquiries)
        .set(updatePayload)
        .where(eq(inquiries.id, id))
        .returning();

      if (!updated) {
        throw new Error('Inquiry not found');
      }

      // Log event
      await tx.insert(inquiryEvents).values({
        inquiryId: id,
        eventType: 'NOTE_ADDED',
        actorUserId: actorUserId || null,
        notes: 'Inquiry details updated',
        metadata: { updatedFields: Object.keys(updatePayload).filter((k) => k !== 'updatedAt') },
      });

      return updated;
    });
  }

  /**
   * Assign or Reassign staff member to inquiry
   */
  async assignInquiry(
    id: string,
    assignedToUserId: string | null,
    actorUserId?: string,
    notes?: string,
    database = db
  ) {
    return database.transaction(async (tx) => {
      const existing = await tx.query.inquiries.findFirst({
        where: eq(inquiries.id, id),
      });

      if (!existing) {
        throw new Error('Inquiry not found');
      }

      const isReassignment = !!existing.assignedToUserId && existing.assignedToUserId !== assignedToUserId;

      const [updated] = await tx
        .update(inquiries)
        .set({
          assignedToUserId: assignedToUserId || null,
          assignedByUserId: actorUserId || null,
          assignedAt: assignedToUserId ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, id))
        .returning();

      // Log assignment event
      await tx.insert(inquiryEvents).values({
        inquiryId: id,
        eventType: isReassignment ? 'REASSIGNED' : 'ASSIGNED',
        actorUserId: actorUserId || null,
        notes: notes || (assignedToUserId ? 'Inquiry assigned to staff member' : 'Inquiry unassigned'),
        metadata: {
          previousAssignedUserId: existing.assignedToUserId,
          newAssignedUserId: assignedToUserId,
        },
      });

      return updated;
    });
  }

  /**
   * Update Inquiry Status with state-change audit trail
   */
  async updateStatus(
    id: string,
    newStatus: InquiryStatus,
    actorUserId?: string,
    notes?: string,
    database = db
  ) {
    return database.transaction(async (tx) => {
      const existing = await tx.query.inquiries.findFirst({
        where: eq(inquiries.id, id),
      });

      if (!existing) {
        throw new Error('Inquiry not found');
      }

      const [updated] = await tx
        .update(inquiries)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, id))
        .returning();

      let eventType = 'STATUS_CHANGED';
      if (newStatus === 'SPAM') eventType = 'MARKED_SPAM';
      if (newStatus === 'CLOSED') eventType = 'CLOSED';
      if (newStatus === 'CONTACTED') eventType = 'CONTACTED';

      await tx.insert(inquiryEvents).values({
        inquiryId: id,
        eventType,
        actorUserId: actorUserId || null,
        notes: notes || `Status changed from ${existing.status} to ${newStatus}`,
        metadata: {
          fromStatus: existing.status,
          toStatus: newStatus,
        },
      });

      return updated;
    });
  }

  /**
   * Add Follow-Up Note and optionally update follow-up date
   */
  async addFollowUp(
    id: string,
    notes: string,
    status?: InquiryStatus,
    followUpDate?: string | Date | null,
    actorUserId?: string,
    database = db
  ) {
    return database.transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (status) updateData.status = status;
      if (followUpDate !== undefined) {
        updateData.followUpDate = followUpDate ? new Date(followUpDate) : null;
      }

      const [updated] = await tx
        .update(inquiries)
        .set(updateData)
        .where(eq(inquiries.id, id))
        .returning();

      if (!updated) {
        throw new Error('Inquiry not found');
      }

      await tx.insert(inquiryEvents).values({
        inquiryId: id,
        eventType: 'FOLLOW_UP_ADDED',
        actorUserId: actorUserId || null,
        notes,
        metadata: {
          newStatus: status,
          followUpDate,
        },
      });

      return updated;
    });
  }

  /**
   * Convert Inquiry to Customer
   *
   * Guarantees:
   * 1. Checks if customer already exists by phone before creating a new customer (prevents duplicates).
   * 2. Preserves original inquiry with convertedCustomerId, convertedByUserId, and convertedAt.
   * 3. Logs chronological events on both Inquiry and Customer Activity Timeline.
   */
  async convertToCustomer(
    id: string,
    convertInput: ConvertInquiryInput,
    actorUserId?: string,
    database = db
  ) {
    return database.transaction(async (tx) => {
      // 1. Fetch inquiry
      const inquiry = await tx.query.inquiries.findFirst({
        where: eq(inquiries.id, id),
      });

      if (!inquiry) {
        throw new Error('Inquiry not found');
      }

      if (inquiry.status === 'CONVERTED' && inquiry.convertedCustomerId) {
        throw new Error(`Inquiry is already converted to customer ID: ${inquiry.convertedCustomerId}`);
      }

      let customerId: string;
      let customerNumber: string;
      let customerName: string;
      let isExistingCustomerLinked = false;

      // 2. Check for explicit or existing customer match
      if (convertInput.existingCustomerId) {
        const existingCustomer = await tx.query.customers.findFirst({
          where: eq(customers.id, convertInput.existingCustomerId),
        });
        if (!existingCustomer) {
          throw new Error('Specified existing customer does not exist');
        }
        customerId = existingCustomer.id;
        customerNumber = existingCustomer.customerNumber;
        customerName = existingCustomer.fullName;
        isExistingCustomerLinked = true;
      } else {
        // Look up by phone number to prevent duplicate customer records
        const matchedByPhone = await tx.query.customers.findFirst({
          where: eq(customers.phone, inquiry.phone.trim()),
        });

        if (matchedByPhone) {
          customerId = matchedByPhone.id;
          customerNumber = matchedByPhone.customerNumber;
          customerName = matchedByPhone.fullName;
          isExistingCustomerLinked = true;
        } else {
          // 3. Create new Customer Record with atomic sequence CUST-YYYY-0001
          const custSeq = await generateBusinessNumber(tx, 'CUSTOMER', 'CUST', { padding: 4 });
          const [newCustomer] = await tx
            .insert(customers)
            .values({
              customerNumber: custSeq.sequenceNumber,
              customerType: convertInput.customerType || 'INDIVIDUAL',
              fullName: inquiry.name.trim(),
              phone: inquiry.phone.trim(),
              email: inquiry.email?.trim() || null,
              companyName: convertInput.companyName?.trim() || null,
              gstNumber: convertInput.gstNumber?.trim() || null,
              status: 'ACTIVE',
              notes: convertInput.notes?.trim() || `Converted from Inquiry ${inquiry.inquiryNumber}`,
              createdBy: actorUserId || null,
            })
            .returning();

          if (!newCustomer) {
            throw new Error('Failed to create customer account');
          }

          customerId = newCustomer.id;
          customerNumber = newCustomer.customerNumber;
          customerName = newCustomer.fullName;
          isExistingCustomerLinked = false;

          // If address information was provided, create default customer address
          const addrLine1 = convertInput.addressLine1?.trim() || inquiry.address?.trim();
          if (addrLine1) {
            await tx.insert(customerAddresses).values({
              customerId: newCustomer.id,
              addressType: 'BOTH',
              addressLine1: addrLine1,
              addressLine2: convertInput.addressLine2?.trim() || null,
              landmark: convertInput.landmark?.trim() || null,
              city: convertInput.city?.trim() || inquiry.city?.trim() || 'Pune',
              state: convertInput.state?.trim() || 'Maharashtra',
              postalCode: convertInput.postalCode?.trim() || '411001',
              isDefault: true,
            });
          }

          // Log customer creation activity
          if (newCustomer) {
            await tx.insert(customerActivities).values({
              customerId: newCustomer.id,
              eventType: 'CUSTOMER_CREATED',
              entityType: 'CUSTOMER',
              entityId: newCustomer.id,
              description: `Account created from website/lead inquiry ${inquiry.inquiryNumber}`,
              actorId: actorUserId || null,
              metadata: { inquiryId: inquiry.id, inquiryNumber: inquiry.inquiryNumber },
            });
          }
        }
      }

      // 4. Update inquiry to CONVERTED
      const convertedAt = new Date();
      await tx
        .update(inquiries)
        .set({
          status: 'CONVERTED',
          convertedCustomerId: customerId,
          convertedByUserId: actorUserId || null,
          convertedAt,
          updatedAt: convertedAt,
        })
        .where(eq(inquiries.id, id));

      // 5. Log events
      await tx.insert(inquiryEvents).values({
        inquiryId: id,
        eventType: 'CONVERTED',
        actorUserId: actorUserId || null,
        notes: isExistingCustomerLinked
          ? `Inquiry converted and linked to existing customer ${customerNumber} (${customerName})`
          : `Inquiry converted into new customer account ${customerNumber} (${customerName})`,
        metadata: {
          customerId,
          customerNumber,
          customerName,
          isExistingCustomerLinked,
        },
      });

      await tx.insert(customerActivities).values({
        customerId,
        eventType: 'INQUIRY_CONVERTED',
        entityType: 'INQUIRY',
        entityId: inquiry.id,
        description: `Inquiry ${inquiry.inquiryNumber} successfully converted to customer account`,
        actorId: actorUserId || null,
        metadata: { inquiryId: inquiry.id, inquiryNumber: inquiry.inquiryNumber },
      });

      return {
        inquiryId: inquiry.id,
        customerId,
        customerNumber,
        customerName,
        isExistingCustomerLinked,
        convertedAt,
      };
    });
  }

  /**
   * Get Inquiry KPIs (Total, New, Follow-Up Due, Qualified, Converted, Conversion Rate, Spam)
   */
  async getKPIs(database = db) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const [totalRes] = await database.select({ count: count() }).from(inquiries);
    const [newRes] = await database
      .select({ count: count() })
      .from(inquiries)
      .where(eq(inquiries.status, 'NEW'));
    const [followUpRes] = await database
      .select({ count: count() })
      .from(inquiries)
      .where(
        and(
          eq(inquiries.status, 'FOLLOW_UP'),
          lte(inquiries.followUpDate, today)
        )
      );
    const [qualifiedRes] = await database
      .select({ count: count() })
      .from(inquiries)
      .where(eq(inquiries.status, 'QUALIFIED'));
    const [convertedRes] = await database
      .select({ count: count() })
      .from(inquiries)
      .where(eq(inquiries.status, 'CONVERTED'));
    const [spamRes] = await database
      .select({ count: count() })
      .from(inquiries)
      .where(eq(inquiries.status, 'SPAM'));

    const total = Number(totalRes?.count || 0);
    const converted = Number(convertedRes?.count || 0);
    const conversionRate = total > 0 ? Number(((converted / total) * 100).toFixed(1)) : 0;

    return {
      totalInquiries: total,
      newInquiries: Number(newRes?.count || 0),
      followUpDue: Number(followUpRes?.count || 0),
      qualifiedLeads: Number(qualifiedRes?.count || 0),
      convertedCount: converted,
      conversionRate,
      spamCount: Number(spamRes?.count || 0),
    };
  }
}

export const inquiriesRepository = new InquiriesRepository();
