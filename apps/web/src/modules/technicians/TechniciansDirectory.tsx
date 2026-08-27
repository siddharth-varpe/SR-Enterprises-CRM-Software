import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useTechniciansQuery,
  useTechnicianKPIsQuery,
  type TechnicianItem,
} from './technicians.api';
import { TechnicianSummaryCards } from './components/TechnicianSummaryCards';
import { TechnicianToolbar } from './components/TechnicianToolbar';
import { TechnicianTable } from './components/TechnicianTable';
import { TechnicianModal } from './components/TechnicianModal';
import { TechnicianDetailDrawer } from './components/TechnicianDetailDrawer';
import { Pagination } from '../../components/ui/Pagination';

export const TechniciansDirectory: React.FC = () => {
  const navigate = useNavigate();

  // Filter States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<TechnicianItem | null>(null);
  const [selectedTech, setSelectedTech] = useState<TechnicianItem | null>(null);

  // Queries
  const {
    data: techniciansData,
    isLoading,
    isFetching,
    refetch,
  } = useTechniciansQuery({
    page,
    limit,
    search: search.trim() || undefined,
    status: status as any,
  });

  const { data: kpis, isLoading: isKPIsLoading } = useTechnicianKPIsQuery();

  const handleStatusFilterSelect = (selectedStatus: string) => {
    setStatus(selectedStatus);
    setPage(1);
  };

  const handleEdit = (tech: TechnicianItem) => {
    setEditingTech(tech);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingTech(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Technicians & Field Workforce</h1>
          <p className="text-sm text-slate-700 mt-1">
            Manage field service engineers, skill sets, live job dispatch, and operational availability.
          </p>
        </div>
      </div>

      {/* KPI Workforce Cards */}
      <TechnicianSummaryCards
        kpis={kpis}
        isLoading={isKPIsLoading}
        activeFilter={status}
        onFilterSelect={handleStatusFilterSelect}
      />

      {/* Toolbar */}
      <TechnicianToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          setPage(1);
        }}
        onCreateClick={handleCreate}
        onRefresh={() => refetch()}
        isFetching={isFetching}
      />

      {/* Table */}
      <TechnicianTable
        technicians={techniciansData?.data}
        isLoading={isLoading}
        onViewDetail={(tech) => setSelectedTech(tech)}
        onEdit={handleEdit}
      />

      {/* Pagination */}
      {techniciansData?.pagination && (
        <Pagination
          currentPage={techniciansData.pagination.page}
          totalPages={techniciansData.pagination.totalPages}
          totalItems={techniciansData.pagination.total}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(newLimit: number) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      )}

      {/* Create / Edit Modal */}
      <TechnicianModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTech(null);
        }}
        technician={editingTech}
      />

      {/* Detail Drawer */}
      <TechnicianDetailDrawer
        isOpen={Boolean(selectedTech)}
        onClose={() => setSelectedTech(null)}
        technician={selectedTech}
        onEdit={(tech) => {
          setSelectedTech(null);
          handleEdit(tech);
        }}
        onViewJobCard={(jcId) => navigate(`/job-cards/${jcId}`)}
      />
    </div>
  );
};
