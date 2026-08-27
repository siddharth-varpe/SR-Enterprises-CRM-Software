import { backupService, BackupService } from './backup.service';

export class BackupScheduler {
  private backupService: BackupService;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRunTime: number = 0;
  private intervalMs: number = 24 * 60 * 60 * 1000; // 24 hours default

  constructor(customBackupService?: BackupService) {
    this.backupService = customBackupService || backupService;
  }

  /**
   * Start scheduled automated backup worker
   */
  public start(intervalMinutes = 1440) {
    if (this.isRunning) return;

    this.intervalMs = intervalMinutes * 60 * 1000;
    this.isRunning = true;

    // Run periodic evaluation every 60 seconds to check schedule
    this.intervalTimer = setInterval(() => {
      this.evaluateSchedule();
    }, 60 * 1000);
  }

  /**
   * Stop scheduled worker
   */
  public stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.isRunning = false;
  }

  /**
   * Evaluate if scheduled backup should execute
   */
  public async evaluateSchedule(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastRunTime < this.intervalMs) {
      return false;
    }

    if (this.backupService.isOperationInProgress()) {
      return false;
    }

    try {
      this.lastRunTime = now;
      await this.backupService.createBackup({
        backupType: 'SCHEDULED',
        includeDocuments: true,
        notes: 'Automated Scheduled System Backup',
      });

      // Run automatic retention rotation (keep last 10)
      await this.backupService.cleanupOldBackups(10);
      return true;
    } catch {
      return false;
    }
  }

  public getStatus(): { isRunning: boolean; lastRunTime: string | null; intervalMinutes: number } {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime ? new Date(this.lastRunTime).toISOString() : null,
      intervalMinutes: Math.round(this.intervalMs / (60 * 1000)),
    };
  }
}

export const backupScheduler = new BackupScheduler();
