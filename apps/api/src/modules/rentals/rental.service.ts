import { rentalRepository, type RentalListFilter, type CreateRentalInput, type RecordRentalPaymentInput, type RecordRentalReturnInput } from './rental.repository';

export class RentalService {
  constructor(private repo = rentalRepository) {}

  async listRentals(filters: RentalListFilter) {
    return this.repo.findMany(filters);
  }

  async getRentalById(id: string) {
    const rental = await this.repo.findById(id);
    if (!rental) {
      const error = new Error(`Rental with ID ${id} not found`);
      (error as any).statusCode = 404;
      (error as any).code = 'NOT_FOUND';
      throw error;
    }
    return rental;
  }

  async getCustomerRentals(customerId: string) {
    return this.repo.findByCustomerId(customerId);
  }

  async createRental(input: CreateRentalInput) {
    if (!input.customerId) {
      const error = new Error('Customer ID is required');
      (error as any).statusCode = 400;
      throw error;
    }
    if (!input.machineModel || !input.serialNumber) {
      const error = new Error('Machine model and serial number are required');
      (error as any).statusCode = 400;
      throw error;
    }
    if (!input.monthlyRent || Number(input.monthlyRent) <= 0) {
      const error = new Error('Monthly rent must be greater than 0');
      (error as any).statusCode = 400;
      throw error;
    }

    return this.repo.create(input);
  }

  async updateRental(id: string, input: Partial<CreateRentalInput>) {
    await this.getRentalById(id);
    return this.repo.update(id, input);
  }

  async recordPayment(input: RecordRentalPaymentInput) {
    if (!input.rentalId) {
      const error = new Error('Rental ID is required');
      (error as any).statusCode = 400;
      throw error;
    }
    if (!input.amount || Number(input.amount) <= 0) {
      const error = new Error('Payment amount must be greater than 0');
      (error as any).statusCode = 400;
      throw error;
    }

    return this.repo.recordPayment(input);
  }

  async recordReturn(input: RecordRentalReturnInput) {
    if (!input.rentalId) {
      const error = new Error('Rental ID is required');
      (error as any).statusCode = 400;
      throw error;
    }
    if (!input.returnCondition) {
      const error = new Error('Return condition is required');
      (error as any).statusCode = 400;
      throw error;
    }

    return this.repo.recordReturn(input);
  }

  async deleteRental(id: string) {
    await this.getRentalById(id);
    return this.repo.delete(id);
  }

  async listRentalPayments(filters: any) {
    return this.repo.findRentalPayments(filters);
  }

  async getRentalPaymentById(id: string) {
    const payment = await this.repo.findRentalPaymentById(id);
    if (!payment) {
      const error = new Error(`Rental payment with ID ${id} not found`);
      (error as any).statusCode = 404;
      (error as any).code = 'NOT_FOUND';
      throw error;
    }
    return payment;
  }
}

export const rentalService = new RentalService();
