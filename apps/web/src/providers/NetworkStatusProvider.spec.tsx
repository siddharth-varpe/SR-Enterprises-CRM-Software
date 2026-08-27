import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { NetworkStatusProvider, useNetworkStatus } from './NetworkStatusProvider.js';

describe('NetworkStatusProvider', () => {
  it('should provide default connected state in standard test environment', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NetworkStatusProvider>{children}</NetworkStatusProvider>
    );

    const { result } = renderHook(() => useNetworkStatus(), { wrapper });
    expect(result.current.status).toBe('connected');
    expect(result.current.isOnline).toBe(true);
  });
});
