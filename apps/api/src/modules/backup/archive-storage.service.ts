import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';

// Node 20 runtime compatibility for @supabase/supabase-js
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class DummyWebSocket {};
}

export interface ArchiveUploadResult {
  path: string;
  id?: string;
  fullPath?: string;
}

/**
 * Isolated Supabase Project #2 Storage Service.
 * Dedicated strictly to database full backups, manifests, and integrity checksums.
 * Uses a PRIVATE bucket to guarantee backups are never exposed publicly.
 */
export class ArchiveStorageService {
  private client: SupabaseClient | null = null;
  private bucket: string;

  constructor() {
    this.bucket = env.ARCHIVE_BACKUP_BUCKET || 'crm-backups';
    this.initClient();
  }

  private initClient(): void {
    const supabaseUrl = env.ARCHIVE_SUPABASE_URL;
    const serviceKey = env.ARCHIVE_SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      try {
        this.client = createClient(supabaseUrl, serviceKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
        console.log(`[Archive Storage #2] Initialized client for private bucket: ${this.bucket}`);
      } catch (err) {
        console.warn('[Archive Storage #2] Initialization notice:', err);
        this.client = null;
      }
    }
  }

  public isConfigured(): boolean {
    if (!this.client) {
      this.initClient();
    }
    return Boolean(this.client);
  }

  public getBucket(): string {
    return this.bucket;
  }

  private checkConfigured(): void {
    if (!this.isConfigured() || !this.client) {
      throw new Error(
        'Archive storage (Supabase #2) is not configured. Please set ARCHIVE_SUPABASE_URL and ARCHIVE_SUPABASE_SERVICE_ROLE_KEY in your environment.'
      );
    }
  }

  /**
   * Ensures the private backup bucket exists in Supabase Project #2
   */
  public async ensureBucket(): Promise<boolean> {
    if (!this.isConfigured() || !this.client) return false;
    try {
      const { data: buckets, error: listErr } = await this.client.storage.listBuckets();
      if (listErr) {
        console.warn('[Archive Storage #2] listBuckets notice:', listErr.message);
        return false;
      }

      const found = buckets?.some((b) => b.name === this.bucket || b.id === this.bucket);
      if (!found) {
        const { error: createErr } = await this.client.storage.createBucket(this.bucket, {
          public: false, // MANDATORY: Backups must be in a PRIVATE bucket
        });
        if (createErr) {
          console.warn('[Archive Storage #2] createBucket notice:', createErr.message);
          return false;
        }
      }
      return true;
    } catch (err: any) {
      console.warn('[Archive Storage #2] ensureBucket error:', err?.message || err);
      return false;
    }
  }

  /**
   * List files or directories in Supabase #2 Storage bucket
   */
  public async listObjects(
    prefix = ''
  ): Promise<{ name: string; id?: string | null; updated_at?: string | null; metadata?: any }[]> {
    this.checkConfigured();
    try {
      const { data, error } = await this.client!.storage.from(this.bucket).list(prefix, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) {
        console.warn('[Archive Storage #2] listObjects error:', error.message);
        return [];
      }
      return data || [];
    } catch (err: any) {
      console.warn('[Archive Storage #2] listObjects exception:', err?.message || err);
      return [];
    }
  }

  /**
   * Upload binary or text buffer to Supabase #2 Storage
   */
  public async uploadFile(
    storagePath: string,
    fileBuffer: Buffer,
    mimeType = 'application/octet-stream'
  ): Promise<ArchiveUploadResult> {
    this.checkConfigured();
    await this.ensureBucket();

    const cleanPath = storagePath.replace(/^\/+/, '');
    const { data, error } = await this.client!.storage
      .from(this.bucket)
      .upload(cleanPath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error('[Archive Storage #2] Upload failure:', error);
      throw new Error(`Supabase #2 Storage upload failed: ${error.message}`);
    }

    return {
      path: data.path,
      id: data.id,
      fullPath: data.fullPath,
    };
  }

  /**
   * Download binary buffer from Supabase #2 Storage
   */
  public async downloadFile(storagePath: string): Promise<Buffer> {
    this.checkConfigured();

    const cleanPath = storagePath.replace(/^\/+/, '');
    const { data, error } = await this.client!.storage.from(this.bucket).download(cleanPath);

    if (error || !data) {
      throw new Error(`Supabase #2 Storage download failed: ${error?.message || 'Empty file'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generate temporary signed download URL for authorized backend-mediated retrieval
   */
  public async createSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    this.checkConfigured();

    const cleanPath = storagePath.replace(/^\/+/, '');
    const { data, error } = await this.client!.storage
      .from(this.bucket)
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Supabase #2 Storage signed URL generation failed: ${error?.message || 'Unknown error'}`);
    }

    return data.signedUrl;
  }

  /**
   * Delete file from Supabase #2 Storage
   */
  public async deleteFile(storagePath: string): Promise<boolean> {
    if (!this.isConfigured() || !this.client) return false;
    const cleanPath = storagePath.replace(/^\/+/, '');
    const { error } = await this.client.storage.from(this.bucket).remove([cleanPath]);
    return !error;
  }
}

export const archiveStorageService = new ArchiveStorageService();
