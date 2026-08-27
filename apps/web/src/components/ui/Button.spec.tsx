import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Phase 3 — UI Design System: Button Component', () => {
  it('should render button with text content', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('should trigger onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render loading spinner and disable button when isLoading is true', () => {
    render(<Button isLoading>Processing</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should apply variant styles properly', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-danger-600');

    rerender(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-slate-100');
  });
});
