// frontend/src/pages/History.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useScanStore } from '../store/scanStore';
import Card, { CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';

const VERDICT_OPTIONS = [
  { value: '', label: 'All Verdicts' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'CLEAN', label: 'Clean' },
];

export default function History() {
  const navigate = useNavigate();
  const { scans, pagination, filters, loading, fetchScans, deleteScan, setFilters, setPagination } = useScanStore();
  const [search, setSearch] = useState(filters.search || '');
  const [verdictFilter, setVerdictFilter] = useState(filters.verdict || '');
  const [dateFrom, setDateFrom] = useState(filters.dateFrom ? new Date(filters.dateFrom).toISOString().split('T')[0] : '');
  const [dateTo, setDateTo] = useState(filters.dateTo ? new Date(filters.dateTo).toISOString().split('T')[0] : '');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchScans({ search, verdict: verdictFilter, dateFrom: dateFrom ? new Date(dateFrom) : undefined, dateTo: dateTo ? new Date(dateTo) : undefined });
  }, [fetchScans, search, verdictFilter, dateFrom, dateTo]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    // Debounce search
    setTimeout(() => setFilters({ search: value }), 300);
  };

  const handleVerdictChange = (value) => {
    setVerdictFilter(value);
    setFilters({ verdict: value || undefined });
  };

  const handleDateFromChange = (e) => {
    const value = e.target.value;
    setDateFrom(value);
    setFilters({ dateFrom: value ? new Date(value) : undefined });
  };

  const handleDateToChange = (e) => {
    const value = e.target.value;
    setDateTo(value);
    setFilters({ dateTo: value ? new Date(value) : undefined });
  };

  const handlePageChange = (newOffset) => {
    setPagination({ offset: newOffset });
    fetchScans({ search, verdict: verdictFilter, dateFrom: dateFrom ? new Date(dateFrom) : undefined, dateTo: dateTo ? new Date(dateTo) : undefined });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this scan record?')) return;
    
    setDeletingId(id);
    const success = await deleteScan(id);
    setDeletingId(null);
    
    if (!success) {
      alert('Failed to delete scan');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getVerdictBadge = (verdict) => {
    return <Badge variant={verdict.toLowerCase()}>{verdict}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Scan History</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage all scan records</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Search"
              placeholder="Filename or hash..."
              value={search}
              onChange={handleSearchChange}
              className="lg:col-span-2"
            />
            <Select
              label="Verdict"
              options={VERDICT_OPTIONS}
              value={verdictFilter}
              onChange={handleVerdictChange}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Date From"
                type="date"
                value={dateFrom}
                onChange={handleDateFromChange}
              />
              <Input
                label="Date To"
                type="date"
                value={dateTo}
                onChange={handleDateToChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Filename</th>
                <th className="hidden md:table-cell">Type</th>
                <th className="hidden lg:table-cell">Size</th>
                <th>Verdict</th>
                <th>Risk Score</th>
                <th className="hidden md:table-cell">Date</th>
                <th className="w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    No scans found. <Link to="/upload" className="text-primary-600 hover:underline">Upload a file</Link> to get started.
                  </td>
                </tr>
              ) : (
                scans.map((scan, index) => (
                  <tr key={scan.id}>
                    <td className="text-gray-500 dark:text-gray-400">
                      {pagination.offset + index + 1}
                    </td>
                    <td className="font-mono text-sm max-w-xs truncate" title={scan.filename}>
                      {scan.filename}
                    </td>
                    <td className="hidden md:table-cell text-gray-500 dark:text-gray-400 text-sm">
                      {scan.fileType}
                    </td>
                    <td className="hidden lg:table-cell text-gray-500 dark:text-gray-400 text-sm">
                      {formatFileSize(scan.fileSize)}
                    </td>
                    <td>{getVerdictBadge(scan.verdict)}</td>
                    <td className="font-mono text-sm font-medium">
                      {scan.riskScore}/100
                    </td>
                    <td className="hidden md:table-cell text-gray-500 dark:text-gray-400 text-sm">
                      {formatDate(scan.createdAt)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/history/${scan.id}`} className="p-2 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 rounded" title="View Details">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(scan.id)}
                          disabled={deletingId === scan.id}
                          className="p-2 text-gray-500 hover:text-danger-600 dark:hover:text-danger-400 rounded disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === scan.id ? (
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} results
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
                disabled={pagination.offset === 0}
              >
                Previous
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                disabled={pagination.offset + pagination.limit >= pagination.total}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}