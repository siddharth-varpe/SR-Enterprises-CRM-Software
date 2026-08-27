import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './ToastProvider';

const TestComponent = () => {
  const toast = useToast();

  return (
    <div>
      <button
        type="button"
        onClick={() => toast.success('Customer created successfully', 'Success')}
      >
        Trigger Success
      </button>
      <button
        type="button"
        onClick={() => toast.error('Invoice cancellation failed', 'Error')}
      >
        Trigger Error
      </button>
    </div>
  );
};

describe('Phase 3 — UI Design System: ToastProvider Component', () => {
  it('should render toast when triggered and allow manual dismiss', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await userEvent.click(screen.getByText('Trigger Success'));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Customer created successfully')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close notification');
    await userEvent.click(closeBtn);

    expect(screen.queryByText('Customer created successfully')).not.toBeInTheDocument();
  });

  it('should render error toast correctly', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await userEvent.click(screen.getByText('Trigger Error'));

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Invoice cancellation failed')).toBeInTheDocument();
  });
});
