import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type ColumnDef } from './DataTable';

interface TestItem {
  id: string;
  name: string;
  role: string;
}

const mockColumns: ColumnDef<TestItem>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'role', header: 'Role' },
];

const mockData: TestItem[] = [
  { id: '1', name: 'John Doe', role: 'Technician' },
  { id: '2', name: 'Jane Smith', role: 'Admin' },
];

describe('Phase 3 — UI Design System: DataTable Component', () => {
  it('should render table headers and data rows correctly', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should render empty state when no data is provided', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        keyExtractor={(item) => item.id}
        emptyTitle="No technicians found"
      />
    );

    expect(screen.getByText('No technicians found')).toBeInTheDocument();
  });

  it('should call onSortChange when clicking sortable header', async () => {
    const handleSort = vi.fn();
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        keyExtractor={(item) => item.id}
        onSortChange={handleSort}
      />
    );

    await userEvent.click(screen.getByText('Name'));
    expect(handleSort).toHaveBeenCalledWith({
      column: 'name',
      direction: 'asc',
    });
  });
});
