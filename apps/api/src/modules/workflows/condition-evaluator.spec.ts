import { describe, it, expect } from 'vitest';
import { ConditionEvaluator } from './engine/condition-evaluator';
import type { WorkflowConditionGroup } from '@crm/types';

describe('ConditionEvaluator Engine', () => {
  it('evaluates empty condition groups as true', () => {
    const group: WorkflowConditionGroup = { logic: 'AND', conditions: [] };
    expect(ConditionEvaluator.evaluate(group, {})).toBe(true);
  });

  it('correctly compares equals and not_equals', () => {
    expect(ConditionEvaluator.compare('COMPLETED', 'equals', 'COMPLETED')).toBe(true);
    expect(ConditionEvaluator.compare('DRAFT', 'equals', 'COMPLETED')).toBe(false);
    expect(ConditionEvaluator.compare('DRAFT', 'not_equals', 'COMPLETED')).toBe(true);
  });

  it('correctly compares numeric inequalities', () => {
    expect(ConditionEvaluator.compare(1500, 'greater_than', 1000)).toBe(true);
    expect(ConditionEvaluator.compare(500, 'greater_than', 1000)).toBe(false);
    expect(ConditionEvaluator.compare(1000, 'greater_than_or_equal', 1000)).toBe(true);
    expect(ConditionEvaluator.compare(500, 'less_than', 1000)).toBe(true);
    expect(ConditionEvaluator.compare(1000, 'less_than_or_equal', 1000)).toBe(true);
  });

  it('correctly checks array contains, in, and not_in', () => {
    expect(ConditionEvaluator.compare('VIP', 'in', ['VIP', 'REGULAR', 'ENTERPRISE'])).toBe(true);
    expect(ConditionEvaluator.compare('GUEST', 'in', ['VIP', 'REGULAR'])).toBe(false);
    expect(ConditionEvaluator.compare('GUEST', 'not_in', ['VIP', 'REGULAR'])).toBe(true);
    expect(ConditionEvaluator.compare(['RO_MEMBRANE', 'PUMP'], 'contains', 'PUMP')).toBe(true);
  });

  it('correctly tests exists and not_exists', () => {
    expect(ConditionEvaluator.compare('TECH-101', 'exists', undefined)).toBe(true);
    expect(ConditionEvaluator.compare(null, 'exists', undefined)).toBe(false);
    expect(ConditionEvaluator.compare(undefined, 'not_exists', undefined)).toBe(true);
    expect(ConditionEvaluator.compare('', 'not_exists', undefined)).toBe(true);
  });

  it('resolves deeply nested object paths', () => {
    const payload = {
      sale: {
        customer: {
          tier: 'GOLD',
          balance: 4500,
        },
      },
    };

    expect(ConditionEvaluator.resolvePath(payload, 'sale.customer.tier')).toBe('GOLD');
    expect(ConditionEvaluator.resolvePath(payload, 'sale.customer.balance')).toBe(4500);
    expect(ConditionEvaluator.resolvePath(payload, 'sale.nonexistent.path')).toBeUndefined();
  });

  it('evaluates complex AND / OR logic trees', () => {
    const context = {
      payload: {
        totalAmount: 25000,
        customerType: 'COMMERCIAL',
        status: 'CONFIRMED',
      },
    };

    const andGroup: WorkflowConditionGroup = {
      logic: 'AND',
      conditions: [
        { field: 'payload.totalAmount', operator: 'greater_than', value: 10000 },
        { field: 'payload.customerType', operator: 'equals', value: 'COMMERCIAL' },
      ],
    };

    expect(ConditionEvaluator.evaluate(andGroup, context)).toBe(true);

    const orGroup: WorkflowConditionGroup = {
      logic: 'OR',
      conditions: [
        { field: 'payload.customerType', operator: 'equals', value: 'INDIVIDUAL' },
        { field: 'payload.totalAmount', operator: 'greater_than', value: 20000 },
      ],
    };

    expect(ConditionEvaluator.evaluate(orGroup, context)).toBe(true);
  });
});
