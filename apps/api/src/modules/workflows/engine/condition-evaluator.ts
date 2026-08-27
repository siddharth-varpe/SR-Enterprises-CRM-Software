import type {
  WorkflowCondition,
  WorkflowConditionGroup,
  WorkflowConditionOperator,
} from '@crm/types';

/**
 * Deterministic Condition Evaluator for Automation Rules
 * Guaranteed zero arbitrary code execution / eval.
 */
export class ConditionEvaluator {
  /**
   * Evaluate a condition group against event / context data
   */
  public static evaluate(
    conditionGroup: WorkflowConditionGroup,
    context: Record<string, any>
  ): boolean {
    if (!conditionGroup || !Array.isArray(conditionGroup.conditions) || conditionGroup.conditions.length === 0) {
      return true; // Empty conditions match all events
    }

    const isAnd = conditionGroup.logic === 'AND';

    for (const item of conditionGroup.conditions) {
      let isMatch = false;

      if ('logic' in item) {
        // Nested group
        isMatch = this.evaluate(item, context);
      } else {
        // Single condition
        isMatch = this.evaluateSingleCondition(item, context);
      }

      if (isAnd && !isMatch) {
        return false;
      }
      if (!isAnd && isMatch) {
        return true;
      }
    }

    return isAnd;
  }

  /**
   * Evaluate a single condition against context
   */
  public static evaluateSingleCondition(
    condition: WorkflowCondition,
    context: Record<string, any>
  ): boolean {
    const actualValue = this.resolvePath(context, condition.field);
    const expectedValue = condition.value;

    return this.compare(actualValue, condition.operator, expectedValue);
  }

  /**
   * Compare actual value vs expected value using deterministic operator
   */
  public static compare(
    actual: any,
    operator: WorkflowConditionOperator,
    expected: any
  ): boolean {
    switch (operator) {
      case 'equals':
        if (actual === null || actual === undefined) {
          return expected === null || expected === undefined;
        }
        if (typeof actual === 'number' || typeof expected === 'number') {
          return Number(actual) === Number(expected);
        }
        return String(actual) === String(expected);

      case 'not_equals':
        return !this.compare(actual, 'equals', expected);

      case 'greater_than':
        return Number(actual) > Number(expected);

      case 'less_than':
        return Number(actual) < Number(expected);

      case 'greater_than_or_equal':
        return Number(actual) >= Number(expected);

      case 'less_than_or_equal':
        return Number(actual) <= Number(expected);

      case 'contains':
        if (Array.isArray(actual)) {
          return actual.includes(expected);
        }
        if (typeof actual === 'string') {
          return actual.toLowerCase().includes(String(expected).toLowerCase());
        }
        return false;

      case 'in':
        if (Array.isArray(expected)) {
          return expected.some((item) => this.compare(actual, 'equals', item));
        }
        return false;

      case 'not_in':
        if (Array.isArray(expected)) {
          return !expected.some((item) => this.compare(actual, 'equals', item));
        }
        return true;

      case 'exists':
        return actual !== undefined && actual !== null && actual !== '';

      case 'not_exists':
        return actual === undefined || actual === null || actual === '';

      default:
        return false;
    }
  }

  /**
   * Resolve nested property path e.g. "payload.sale.totalAmount" or "amount"
   */
  public static resolvePath(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object' || !path) {
      return undefined;
    }

    const segments = path.split('.');
    let current = obj;

    for (const segment of segments) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[segment];
    }

    return current;
  }
}
