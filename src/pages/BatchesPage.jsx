import React, { useState, useEffect } from 'react';
import { Boxes, Search, Plus, Filter, ArrowUpDown, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('expiry_date');
  const [order, setOrder] = useState('ASC');
  const [page, setPage] = useState(1);

  // Add Batch Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBatch, setNewBatch] = useState({
    medicine_id: '',
    batch_number: '',
    initial_quantity: 100,
    mfg_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    unit_price: 5.0,
    shelf_location: 'Rack A-1'
  });
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    fetchMedicinesList();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [search, statusFilter, sortBy, order, page]);

  const fetchMedicinesList = async () => {
    try {
      const res = await fetch('/api/medicines?limit=100');
      const data = await res.json();
      setMedicines(data.data || []);
      if (data.data?.length > 0 && !newBatch.medicine_id) {
        setNewBatch((prev) => ({ ...prev, medicine_id: data.data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching medicines:', err);
    }
  };

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search,
        status: statusFilter,
        sortBy,
        order,
        page: page.toString(),
        limit: '10'
      });

      const res = await fetch(`/api/batches?${queryParams}`);
      const data = await res.json();
      setBatches(data.data || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 });
    } catch (err) {
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setModalError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newBatch)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create batch');

      setShowAddModal(false);
      fetchBatches();
    } catch (err) {
      setModalError(err.message);
    }
  };

  const handleQuarantine = async (batchId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/batches/${batchId}/quarantine`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        fetchBatches();
      }
    } catch (err) {
      console.error('Error quarantining batch:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] p-4 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Batch Registry</h1>
          <p className="text-xs text-gray-400 mt-1">Granular tracking of manufacturing dates, expiry dates, and rack locations</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-xs py-2.5 px-4 shadow-lg shadow-cyan-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Batch
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by batch number or medicine name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input text-xs pl-10"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="form-input text-xs py-2 w-full md:w-48"
          >
            <option value="ALL">All Batches</option>
            <option value="ACTIVE">Active (In-Date)</option>
            <option value="EXPIRING_SOON">Expiring &lt; 30 Days</option>
            <option value="EXPIRED">Expired Stock</option>
          </select>
        </div>

        {/* Sorting */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <ArrowUpDown className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={`${sortBy}-${order}`}
            onChange={(e) => {
              const [sb, ord] = e.target.value.split('-');
              setSortBy(sb);
              setOrder(ord);
            }}
            className="form-input text-xs py-2 w-full md:w-44"
          >
            <option value="expiry_date-ASC">Expiry (Earliest First)</option>
            <option value="expiry_date-DESC">Expiry (Latest First)</option>
            <option value="available_quantity-DESC">Highest Stock</option>
            <option value="batch_number-ASC">Batch Code (A - Z)</option>
          </select>
        </div>

      </div>

      {/* Batches Table */}
      <div className="glass-panel p-6">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Batch Code</th>
                <th>Medicine Name</th>
                <th>Expiry Date</th>
                <th>Available Qty</th>
                <th>Unit Price</th>
                <th>Shelf Location</th>
                <th>Risk Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-cyan-400 text-xs">
                    Loading batch registry...
                  </td>
                </tr>
              ) : batches.length > 0 ? (
                batches.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono font-bold text-cyan-400">{b.batch_number}</td>
                    <td className="font-semibold text-white">{b.medicine_name}</td>
                    <td>
                      <span className={`font-semibold text-xs ${b.risk_level === 'EXPIRED' ? 'text-rose-400 font-extrabold' : b.risk_level === 'EXPIRING_SOON' ? 'text-amber-400 font-bold' : 'text-gray-200'}`}>
                        {b.expiry_date}
                      </span>
                    </td>
                    <td>
                      <span className="font-bold text-white text-xs">{b.available_quantity} / {b.initial_quantity}</span>
                    </td>
                    <td className="text-emerald-400 font-semibold text-xs">${b.unit_price.toFixed(2)}</td>
                    <td className="text-gray-300 text-xs">{b.shelf_location}</td>
                    <td>
                      {b.status === 'QUARANTINED' ? (
                        <span className="badge badge-red">QUARANTINED</span>
                      ) : b.risk_level === 'EXPIRED' ? (
                        <span className="badge badge-red">EXPIRED</span>
                      ) : b.risk_level === 'EXPIRING_SOON' ? (
                        <span className="badge badge-yellow">EXPIRING &lt; 30d</span>
                      ) : (
                        <span className="badge badge-green">HEALTHY</span>
                      )}
                    </td>
                    <td>
                      {b.status !== 'QUARANTINED' && (b.risk_level === 'EXPIRED' || b.risk_level === 'EXPIRING_SOON') && (
                        <button
                          onClick={() => handleQuarantine(b.id)}
                          className="btn-danger text-[10px] py-1 px-2"
                        >
                          <ShieldAlert className="w-3 h-3" /> Quarantine
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500 text-xs">
                    No batches match the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-gray-400">
          <span>
            Showing Page <strong>{pagination.currentPage}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalItems} Total Batches)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.currentPage === 1}
              className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.currentPage === pagination.totalPages}
              className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Batch Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="text-lg font-bold text-white">Add New Batch Entry</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="form-label">Select Medicine *</label>
                <select
                  value={newBatch.medicine_id}
                  onChange={(e) => setNewBatch({ ...newBatch, medicine_id: e.target.value })}
                  className="form-input text-xs"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Batch Code / Lot # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PCM-2026-B10"
                    value={newBatch.batch_number}
                    onChange={(e) => setNewBatch({ ...newBatch, batch_number: e.target.value })}
                    className="form-input text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="form-label">Quantity Stock *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newBatch.initial_quantity}
                    onChange={(e) => setNewBatch({ ...newBatch, initial_quantity: e.target.value })}
                    className="form-input text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Mfg Date</label>
                  <input
                    type="date"
                    value={newBatch.mfg_date}
                    onChange={(e) => setNewBatch({ ...newBatch, mfg_date: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>

                <div>
                  <label className="form-label">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={newBatch.expiry_date}
                    onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })}
                    className="form-input text-xs font-bold text-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Unit Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newBatch.unit_price}
                    onChange={(e) => setNewBatch({ ...newBatch, unit_price: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>

                <div>
                  <label className="form-label">Shelf Rack Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Rack B-3"
                    value={newBatch.shelf_location}
                    onChange={(e) => setNewBatch({ ...newBatch, shelf_location: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
