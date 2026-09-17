import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShieldAlert, AlertTriangle, TrendingUp, ShoppingCart, PlusCircle, Search, CheckCircle, XCircle, ArrowUpRight, DollarSign, Clock } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quick In-Date Check State
  const [searchQuery, setSearchQuery] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#0b0f19] p-4 lg:p-8 max-w-7xl mx-auto space-y-8 pb-16">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Pharmacy Dashboard</h1>
          <p className="text-xs text-gray-400 mt-1">Real-time FEFO Inventory & Sales Analytics</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/dispense" className="btn-primary text-xs py-2 px-4 shadow-lg shadow-cyan-500/20">
            <ShoppingCart className="w-4 h-4" /> FEFO POS Terminal
          </Link>
          <Link to="/inventory" className="btn-secondary text-xs py-2 px-3">
            <PlusCircle className="w-4 h-4" /> Manage Catalog
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

    </div>
  );
}
