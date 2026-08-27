import type { SearchEntityType } from '@crm/types';
import type { NormalizedQuery } from './search.types';

export interface SearchIntentResult {
  primaryEntities: SearchEntityType[];
  isSpecificPattern: boolean;
  detectedType?: SearchEntityType;
  confidence: number;
}

export class SearchRouter {
  /**
   * Normalize user query safely with anti-abuse safeguards
   */
  public static normalizeQuery(raw: string): NormalizedQuery {
    const rawStr = String(raw || '');
    // 1. Trim and collapse multiple whitespace
    const clean = rawStr.trim().replace(/\s+/g, ' ');
    const upper = clean.toUpperCase();

    // 2. Extract digits only (for phone, amounts, counter lookups)
    const digitsOnly = clean.replace(/\D/g, '');

    // 3. Normalized phone variation (strip standard country code +91 or leading 0)
    let normalizedPhone = digitsOnly;
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      normalizedPhone = digitsOnly.slice(2);
    } else if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
      normalizedPhone = digitsOnly.slice(1);
    }

    return {
      raw: rawStr,
      clean,
      upper,
      digitsOnly,
      normalizedPhone,
    };
  }

  /**
   * Escape special SQL LIKE wildcards (%, _) from search terms
   */
  public static sanitizeLikePattern(term: string): string {
    return term.replace(/[%_\\]/g, '\\$&');
  }

  /**
   * Detect search intent from query characteristics
   */
  public static detectIntent(norm: NormalizedQuery): SearchIntentResult {
    const upper = norm.upper;
    const digits = norm.digitsOnly;

    // 1. Prefix Pattern Matching
    if (/^INV-\d+/i.test(upper) || upper.startsWith('INV-')) {
      return {
        primaryEntities: ['invoice', 'sale', 'payment'],
        isSpecificPattern: true,
        detectedType: 'invoice',
        confidence: 0.95,
      };
    }

    if (/^CUST-\d+/i.test(upper) || upper.startsWith('CUST-')) {
      return {
        primaryEntities: ['customer'],
        isSpecificPattern: true,
        detectedType: 'customer',
        confidence: 0.95,
      };
    }

    if (/^SALE-\d+/i.test(upper) || upper.startsWith('SALE-')) {
      return {
        primaryEntities: ['sale', 'invoice'],
        isSpecificPattern: true,
        detectedType: 'sale',
        confidence: 0.95,
      };
    }

    if (/^JC-\d+/i.test(upper) || upper.startsWith('JC-')) {
      return {
        primaryEntities: ['job_card', 'service'],
        isSpecificPattern: true,
        detectedType: 'job_card',
        confidence: 0.95,
      };
    }

    if (/^SRV-\d+/i.test(upper) || upper.startsWith('SRV-')) {
      return {
        primaryEntities: ['service', 'job_card'],
        isSpecificPattern: true,
        detectedType: 'service',
        confidence: 0.95,
      };
    }

    if (/^WAR-\d+/i.test(upper) || upper.startsWith('WAR-')) {
      return {
        primaryEntities: ['warranty', 'asset'],
        isSpecificPattern: true,
        detectedType: 'warranty',
        confidence: 0.95,
      };
    }

    if (/^(ASSET-|SN-?|SER-?)/i.test(upper)) {
      return {
        primaryEntities: ['asset', 'product', 'warranty'],
        isSpecificPattern: true,
        detectedType: 'asset',
        confidence: 0.9,
      };
    }

    if (/^PAY-\d+/i.test(upper) || upper.startsWith('PAY-')) {
      return {
        primaryEntities: ['payment', 'invoice'],
        isSpecificPattern: true,
        detectedType: 'payment',
        confidence: 0.95,
      };
    }

    if (/^INQ-\d+/i.test(upper) || upper.startsWith('INQ-')) {
      return {
        primaryEntities: ['inquiry', 'customer'],
        isSpecificPattern: true,
        detectedType: 'inquiry',
        confidence: 0.95,
      };
    }

    // 2. Phone Number Intent (10 digit standard phone)
    if (digits.length === 10) {
      return {
        primaryEntities: ['customer', 'technician'],
        isSpecificPattern: true,
        detectedType: 'customer',
        confidence: 0.85,
      };
    }

    // 3. Email Pattern Intent
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm.clean)) {
      return {
        primaryEntities: ['customer', 'technician'],
        isSpecificPattern: true,
        detectedType: 'customer',
        confidence: 0.9,
      };
    }

    // 4. SKU / Model code Intent (e.g. RO-MEM-100, PUMP-75G)
    if (/^[A-Z0-9]+-[A-Z0-9]+/i.test(upper)) {
      return {
        primaryEntities: ['product', 'inventory', 'asset'],
        isSpecificPattern: true,
        detectedType: 'product',
        confidence: 0.75,
      };
    }

    // 5. Default General Broad Intent
    return {
      primaryEntities: [
        'customer',
        'product',
        'invoice',
        'asset',
        'service',
        'job_card',
        'warranty',
        'technician',
        'inquiry',
        'sale',
        'inventory',
      ],
      isSpecificPattern: false,
      confidence: 0.5,
    };
  }
}
