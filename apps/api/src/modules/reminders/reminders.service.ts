import { remindersRepository } from './reminders.repository';
import type {
  ReminderQueryFilter,
  CreateReminderInput,
  UpdateReminderInput,
  CompleteReminderInput,
} from '@crm/validation';

export class RemindersService {
  async getReminders(filters: ReminderQueryFilter) {
    return remindersRepository.findPaginated(filters);
  }

  async getReminderById(id: string) {
    const reminder = await remindersRepository.findById(id);
    if (!reminder) {
      throw new Error('Reminder record not found');
    }
    return reminder;
  }

  async getKPIs() {
    return remindersRepository.getKPIs();
  }

  async createReminder(input: CreateReminderInput, actorId?: string) {
    return remindersRepository.create(input, actorId);
  }

  async updateReminder(id: string, input: UpdateReminderInput, actorId?: string) {
    return remindersRepository.update(id, input, actorId);
  }

  async completeReminder(id: string, input: CompleteReminderInput, actorId?: string) {
    return remindersRepository.complete(id, input, actorId);
  }

  async cancelReminder(id: string, actorId?: string) {
    return remindersRepository.cancel(id, actorId);
  }
}

export const remindersService = new RemindersService();
