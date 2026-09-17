import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, ShieldAlert, AlertTriangle, TrendingUp, ShoppingCart, PlusCircle, Search, CheckCircle, XCircle, ArrowUpRight, Clock, Users, UserPlus, Shield, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const { user, token } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quick In-Date Check State
  const [searchQuery, setSearchQuery] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  // Pharmacist Management Modal State (Admin only)
  const [showPharmacistModal, setShowPharmacistModal] = useState(false);
  const [pharmacists, setPharmacists] = useState([]);
  const [pharmacistSearch, setPharmacistSearch] = useState('');
  const [totalPharmacists, setTotalPharmacists] = useState(0);
  const [loadingPharmacists, setLoadingPharmacists] = useState(false);
  const [newPharmacist, setNewPharmacist] = useState({ name: '', email: '', password: '', phone: '' });
  const [pharmacistError, setPharmacistError] = useState('');
  const [pharmacistSuccess, setPharmacistSuccess] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPharmacistsList = async (search = '') => {
    setLoadingPharmacists(true);
    try {
      const res = await fetch(`/api/admin/pharmacists?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPharmacists(data.pharmacists || []);
      setTotalPharmacists(data.pagination?.totalItems || data.pharmacists?.length || 0);
    } catch (err) {
      console.error('Failed to fetch pharmacists list:', err);
    } finally {
      setLoadingPharmacists(false);
    }
  };

  const handleOpenPharmacistModal = () => {
    setShowPharmacistModal(true);
    setPharmacistError('');
    setPharmacistSuccess('');
    fetchPharmacistsList();
  };

  const handleAddPharmacist = async (e) => {
    e.preventDefault();
    setPharmacistError('');
    setPharmacistSuccess('');

    try {
      const res = await fetch('/api/admin/pharmacists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPharmacist.name,
          email: newPharmacist.email,
          password: newPharmacist.password || 'pharmacy123',
          phone: newPharmacist.phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create pharmacist account');

      setPharmacistSuccess(data.message);
      setNewPharmacist({ name: '', email: '', password: '', phone: '' });
      fetchPharmacistsList(pharmacistSearch);
    } catch (err) {
      setPharmacistError(err.message);
    }
  };

  const handleToggleStatus = async (pharmacistId, currentStatus, pharmacistName) => {
    try {
      const res = await fetch(`/api/admin/pharmacists/${pharmacistId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      fetchPharmacistsList(pharmacistSearch);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleInDateCheck = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsChecking(true);
    try {
      const res = await fetch(`/api/medicines/check-indate?name=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      setCheckResult(data);
    } catch (err) {
      console.error('Error in-date checking:', err);
    } finally {
      setIsChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-cyan-400">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold uppercase tracking-wider">Loading Dashboard Telemetry...</span>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'Admin';

  return (
    <div className="min-h-screen bg-[#0b0f19] p-4 lg:p-8 max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* Top Header & User Profile Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 border-emerald-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-extrabold text-lg">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">{user?.name}</h1>
              <span className={`badge ${isAdmin ? 'badge-yellow' : 'badge-green'} text-[11px]`}>
                {isAdmin ? 'PRIMARY ADMIN / PHARMACY OWNER' : 'LICENSED PHARMACIST'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Logged in as <code className="text-emerald-400 font-mono">{user?.email}</code> • Account Status: <span className="text-emerald-400 font-semibold">Active & Verified</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={handleOpenPharmacistModal}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              <Users className="w-4 h-4" /> Manage Pharmacists
            </button>
          )}

          <Link to="/dispense" className="btn-primary text-xs py-2 px-4 shadow-lg shadow-cyan-500/20">
            <ShoppingCart className="w-4 h-4" /> FEFO POS Terminal
          </Link>
          <Link to="/inventory" className="btn-secondary text-xs py-2 px-3">
            <PlusCircle className="w-4 h-4" /> Medicine Catalog
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Sellable Stock */}
        <div className="glass-panel p-5 border-cyan-500/30 glass-panel-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sellable Stock</span>
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-white">{stats?.sellableStock?.units?.toLocaleString()} <span className="text-xs text-gray-400 font-normal">units</span></p>
            <p className="text-xs text-cyan-400 mt-1 font-medium">Est. Value: ${stats?.sellableStock?.value?.toFixed(2)}</p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5 flex items-center text-[10px] text-gray-400">
            <span className="text-emerald-400 font-bold mr-1">In-Date Only</span> (Expired stock excluded)
          </div>
        </div>

        {/* Card 2: Expiring in 30 Days */}
        <div className="glass-panel p-5 border-amber-500/30 glass-panel-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Expiring &lt; 30 Days</span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-amber-400">{stats?.expiringSoonCount}</p>
            <p className="text-xs text-gray-400 mt-1">High Risk Batches</p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5">
            <Link to="/alerts" className="text-[11px] text-amber-400 hover:underline font-semibold flex items-center gap-1">
              View Alert Feed <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Expired Quarantined Stock */}
        <div className="glass-panel p-5 border-rose-500/30 glass-panel-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Expired / Quarantined</span>
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-rose-400">{stats?.expiredStock?.units} <span className="text-xs text-gray-400 font-normal">units</span></p>
            <p className="text-xs text-rose-300 mt-1 font-medium">Value: ${stats?.expiredStock?.value?.toFixed(2)}</p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5">
            <span className="badge badge-red text-[10px]">100% Shielded From Sales</span>
          </div>
        </div>

        {/* Card 4: Today's Sales */}
        <div className="glass-panel p-5 border-emerald-500/30 glass-panel-hover">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today's Sales</span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-emerald-400">${(stats?.todaySales?.revenue || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{stats?.todaySales?.count} Dispense Orders</p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/5">
            <Link to="/dispense" className="text-[11px] text-emerald-400 hover:underline font-semibold flex items-center gap-1">
              Open POS Workbench →
            </Link>
          </div>
        </div>

      </div>

      {/* In-Date Availability Search Card */}
      <div className="glass-panel p-6 border-cyan-500/30">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Instant In-Date Stock Inspector</h2>
        </div>

        <form onSubmit={handleInDateCheck} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="Type medicine name (e.g. Paracetamol, Amoxicillin, Metformin)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input flex-1 text-sm"
          />
          <button type="submit" disabled={isChecking} className="btn-primary text-xs py-2.5 px-6 shrink-0">
            {isChecking ? 'Checking...' : 'Ask: Do We Have It In Date?'}
          </button>
        </form>

        {checkResult && (
          <div className="mt-4 p-4 rounded-xl bg-gray-900/80 border border-white/10">
            <div className="flex items-center gap-3">
              {checkResult.inDateAvailable ? (
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
              )}
              <div>
                <p className={`text-sm font-bold ${checkResult.inDateAvailable ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {checkResult.message}
                </p>
                {checkResult.inDateAvailable && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Batch Priority #1: <code className="text-cyan-400 font-mono">{checkResult.nextBatchToDispense?.batch_number}</code> (Expires {checkResult.earliestExpiryDate}, Shelf: {checkResult.nextBatchToDispense?.shelf_location})
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Dispense Audit Logs */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Recent FEFO Dispense Transactions</h2>
            <p className="text-xs text-gray-400">Complete audit trail of items sold oldest-first</p>
          </div>
          <Link to="/dispense" className="text-xs text-cyan-400 hover:underline font-semibold">
            View Dispense Terminal →
          </Link>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Invoice Ref</th>
                <th>Patient Name</th>
                <th>Dispensed By</th>
                <th>Date & Time</th>
                <th>Total Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentDispenses?.length > 0 ? (
                stats.recentDispenses.map((rec) => (
                  <tr key={rec.id}>
                    <td className="font-mono text-cyan-400 font-bold">{rec.reference_no}</td>
                    <td className="font-semibold text-white">{rec.patient_name}</td>
                    <td className="text-gray-300">{rec.dispensed_by}</td>
                    <td className="text-gray-400 text-xs">{new Date(rec.dispensed_at).toLocaleString()}</td>
                    <td className="font-bold text-emerald-400">${rec.total_amount?.toFixed(2)}</td>
                    <td>
                      <span className="badge badge-green">FEFO VERIFIED</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500 text-xs">
                    No transactions completed today yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Pharmacist Management Modal */}
      {showPharmacistModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowPharmacistModal(false)}>
          <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Admin Pharmacist Management</h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Only ADMIN can register new pharmacists and manage account activation status</p>
              </div>
              <button onClick={() => setShowPharmacistModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {/* Add New Pharmacist Form (Backend forces role = "PHARMACIST") */}
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 mb-6 space-y-3">
              <h4 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" /> Add New Pharmacist Account
              </h4>

              {pharmacistError && (
                <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pharmacistError}</span>
                </div>
              )}

              {pharmacistSuccess && (
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{pharmacistSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAddPharmacist} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="form-label text-[11px]">Pharmacist Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nikunj"
                    value={newPharmacist.name}
                    onChange={(e) => setNewPharmacist({ ...newPharmacist, name: e.target.value })}
                    className="form-input text-xs py-1.5"
                  />
                </div>

                <div>
                  <label className="form-label text-[11px]">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="nik@123.com"
                    value={newPharmacist.email}
                    onChange={(e) => setNewPharmacist({ ...newPharmacist, email: e.target.value })}
                    className="form-input text-xs py-1.5"
                  />
                </div>

                <div>
                  <label className="form-label text-[11px]">Password (Default: pharmacy123)</label>
                  <input
                    type="password"
                    placeholder="pharmacy123"
                    value={newPharmacist.password}
                    onChange={(e) => setNewPharmacist({ ...newPharmacist, password: e.target.value })}
                    className="form-input text-xs py-1.5"
                  />
                </div>

                <div className="sm:col-span-3 pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 italic">
                    ℹ️ Backend strictly assigns role: <strong>PHARMACIST</strong>
                  </span>
                  <button type="submit" className="btn-primary text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-500 font-bold flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" /> Create Pharmacist Account
                  </button>
                </div>
              </form>
            </div>

            {/* Pharmacist Search & Filter Bar */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Pharmacists Roster ({totalPharmacists}):
              </h4>

              <div className="relative flex items-center w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search pharmacists..."
                  value={pharmacistSearch}
                  onChange={(e) => {
                    setPharmacistSearch(e.target.value);
                    fetchPharmacistsList(e.target.value);
                  }}
                  className="form-input text-xs py-1 pl-8 pr-2"
                />
              </div>
            </div>

            {/* Pharmacist List Table */}
            <div className="table-container max-h-64 overflow-y-auto">
              <table className="custom-table text-xs">
                <thead>
                  <tr>
                    <th>Pharmacist Name</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Account Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPharmacists ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-emerald-400">Loading pharmacists...</td>
                    </tr>
                  ) : pharmacists.length > 0 ? (
                    pharmacists.map((ph) => (
                      <tr key={ph._id || ph.id}>
                        <td className="font-bold text-white">{ph.name}</td>
                        <td className="text-cyan-300 font-mono">{ph.email}</td>
                        <td>
                          <span className="badge badge-green text-[10px]">PHARMACIST</span>
                        </td>
                        <td>
                          {ph.isActive !== false ? (
                            <span className="badge badge-green text-[10px]">Active</span>
                          ) : (
                            <span className="badge badge-red text-[10px]">Deactivated</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(ph._id || ph.id, ph.isActive !== false, ph.name)}
                            className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                              ph.isActive !== false
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                            }`}
                          >
                            {ph.isActive !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-gray-500">No pharmacist records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button onClick={() => setShowPharmacistModal(false)} className="btn-secondary text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

