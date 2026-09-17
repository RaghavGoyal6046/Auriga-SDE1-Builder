import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Filter, ChevronLeft, ChevronRight, Eye, AlertCircle, ArrowUpDown } from 'lucide-react';

export default function InventoryPage() {
  const [medicines, setMedicines] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState('ASC');
  const [page, setPage] = useState(1);

  // Add Medicine Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', generic_name: '', category: 'Analgesic & Antipyretic', unit: 'Tablets', reorder_level: 20 });
  const [modalError, setModalError] = useState('');

  // Medicine Detail Modal State
  const [selectedMedDetail, setSelectedMedDetail] = useState(null);

  useEffect(() => {
    fetchMedicines();
  }, [search, category, sortBy, order, page]);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search,
        category,
        sortBy,
        order,
        page: page.toString(),
        limit: '8'
      });

      const res = await fetch(`/api/medicines?${queryParams}`);
      const data = await res.json();
      setMedicines(data.data || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 });
    } catch (err) {
      console.error('Error fetching medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMedicine = async (e) => {
    e.preventDefault();
    setModalError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/medicines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newMed)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add medicine');

      setShowAddModal(false);
      setNewMed({ name: '', generic_name: '', category: 'Analgesic & Antipyretic', unit: 'Tablets', reorder_level: 20 });
      fetchMedicines();
    } catch (err) {
      setModalError(err.message);
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await fetch(`/api/medicines/${id}`);
      const data = await res.json();
      setSelectedMedDetail(data);
    } catch (err) {
      console.error('Error fetching medicine details:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] p-4 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Medicine Catalog</h1>
          <p className="text-xs text-gray-400 mt-1">Master list of pharmaceutical inventory with sellable stock breakdown</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-xs py-2.5 px-4 shadow-lg shadow-cyan-500/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Medicine
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search medicine name or generic composition..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input text-xs pl-10"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="form-input text-xs py-2 w-full md:w-48"
          >
            <option value="">All Categories</option>
            <option value="Analgesic & Antipyretic">Analgesic & Antipyretic</option>
            <option value="Antibiotic">Antibiotic</option>
            <option value="Anti-diabetic">Anti-diabetic</option>
            <option value="Cardiovascular">Cardiovascular</option>
            <option value="Antihistamine">Antihistamine</option>
            <option value="Gastrointestinal">Gastrointestinal</option>
            <option value="Anti-inflammatory">Anti-inflammatory</option>
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
            <option value="name-ASC">Name (A - Z)</option>
            <option value="name-DESC">Name (Z - A)</option>
            <option value="category-ASC">Category (A - Z)</option>
            <option value="created_at-DESC">Newest First</option>
          </select>
        </div>

      </div>

      {/* Catalog Table */}
      <div className="glass-panel p-6">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Generic Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Sellable Stock (In-Date)</th>
                <th>Expired Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-cyan-400 text-xs">
                    Loading medicine inventory...
                  </td>
                </tr>
              ) : medicines.length > 0 ? (
                medicines.map((med) => (
                  <tr key={med.id}>
                    <td>
                      <p className="font-bold text-white text-sm">{med.name}</p>
                      <p className="text-[10px] text-gray-400">{med.active_batches_count} active in-date batches</p>
                    </td>
                    <td className="text-gray-300 text-xs">{med.generic_name || '-'}</td>
                    <td>
                      <span className="badge badge-yellow text-[11px]">{med.category}</span>
                    </td>
                    <td className="text-gray-400 text-xs">{med.unit}</td>
                    <td>
                      <span className={`font-bold text-sm ${med.sellable_stock <= med.reorder_level ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {med.sellable_stock} {med.unit}
                      </span>
                      {med.sellable_stock <= med.reorder_level && (
                        <span className="block text-[10px] text-amber-400 font-semibold">Low Stock Alert!</span>
                      )}
                    </td>
                    <td>
                      {med.expired_stock > 0 ? (
                        <span className="badge badge-red">{med.expired_stock} {med.unit}</span>
                      ) : (
                        <span className="text-xs text-gray-500">0</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleViewDetail(med.id)}
                        className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold transition-all flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Batches
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500 text-xs">
                    No medicines match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-gray-400">
          <span>
            Showing Page <strong>{pagination.currentPage}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.totalItems} Total Items)
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

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="text-lg font-bold text-white">Add New Medicine to Catalog</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateMedicine} className="space-y-4">
              <div>
                <label className="form-label">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol 650mg"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="form-input text-xs"
                />
              </div>

              <div>
                <label className="form-label">Generic / Chemical Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acetaminophen"
                  value={newMed.generic_name}
                  onChange={(e) => setNewMed({ ...newMed, generic_name: e.target.value })}
                  className="form-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Category *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Antibiotic"
                    value={newMed.category}
                    onChange={(e) => setNewMed({ ...newMed, category: e.target.value })}
                    className="form-input text-xs"
                  />
                </div>

                <div>
                  <label className="form-label">Unit Type</label>
                  <select
                    value={newMed.unit}
                    onChange={(e) => setNewMed({ ...newMed, unit: e.target.value })}
                    className="form-input text-xs"
                  >
                    <option value="Tablets">Tablets</option>
                    <option value="Capsules">Capsules</option>
                    <option value="Syrup Bottle">Syrup Bottle</option>
                    <option value="Injection Vials">Injection Vials</option>
                    <option value="Ointment Tube">Ointment Tube</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Reorder Level Quantity</label>
                <input
                  type="number"
                  value={newMed.reorder_level}
                  onChange={(e) => setNewMed({ ...newMed, reorder_level: e.target.value })}
                  className="form-input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medicine Detail Batches Drawer/Modal */}
      {selectedMedDetail && (
        <div className="modal-overlay" onClick={() => setSelectedMedDetail(null)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedMedDetail.medicine.name}</h3>
                <p className="text-xs text-gray-400">{selectedMedDetail.medicine.category} • {selectedMedDetail.medicine.generic_name}</p>
              </div>
              <button onClick={() => setSelectedMedDetail(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] text-gray-400 block uppercase">Sellable (In-Date)</span>
                <span className="text-lg font-extrabold text-emerald-400">{selectedMedDetail.stockSummary.sellableStock}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <span className="text-[10px] text-gray-400 block uppercase">Expired Stock</span>
                <span className="text-lg font-extrabold text-rose-400">{selectedMedDetail.stockSummary.expiredStock}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-900 border border-white/10">
                <span className="text-[10px] text-gray-400 block uppercase">Total Batches</span>
                <span className="text-lg font-extrabold text-white">{selectedMedDetail.batches.length}</span>
              </div>
            </div>

            <h4 className="text-xs font-semibold text-gray-300 mb-2">Batches Breakdown (Sorted FEFO Order):</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedMedDetail.batches.map((b) => (
                <div key={b.id} className="p-3 rounded-xl bg-gray-900/90 border border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-cyan-400">{b.batch_number}</span>
                    <span className="text-gray-400 block text-[11px]">Shelf: {b.shelf_location} • Price: ${b.unit_price.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${b.status === 'EXPIRED' ? 'text-rose-400' : 'text-amber-400'}`}>
                      Exp: {b.expiry_date}
                    </span>
                    <span className="block font-bold text-white text-xs">
                      Available: {b.available_quantity} units
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
              <button onClick={() => setSelectedMedDetail(null)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
