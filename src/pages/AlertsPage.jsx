import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts/expiring');
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuarantineBatch = async (batchId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/batches/${batchId}/quarantine`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchAlerts();
    } catch (err) {
      console.error('Error quarantining:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-rose-400">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold uppercase tracking-wider">Loading Expiry Risk Intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] p-4 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-red">RISK MONITOR</span>
            <span className="text-xs text-gray-400">Real-Time Batch Expiry Safeguards</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Expiry Risk & Quarantine Alerts</h1>
        </div>

        <button onClick={fetchAlerts} className="btn-secondary text-xs py-2 px-3 self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" /> Refresh Alerts
        </button>
      </div>

      {/* Alert Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 border-rose-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">Critical: Expired</span>
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-3xl font-extrabold text-rose-400 mt-2">{alerts?.summary?.expiredCount}</p>
          <span className="text-[10px] text-gray-400 block mt-1">Requires Immediate Quarantine</span>
        </div>

        <div className="glass-panel p-5 border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">High Risk (&lt; 30 Days)</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-amber-400 mt-2">{alerts?.summary?.expiring30Count}</p>
          <span className="text-[10px] text-gray-400 block mt-1">FEFO Priority Dispatching</span>
        </div>

        <div className="glass-panel p-5 border-yellow-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">Warning (&lt; 60 Days)</span>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-3xl font-extrabold text-yellow-400 mt-2">{alerts?.summary?.expiring60Count}</p>
          <span className="text-[10px] text-gray-400 block mt-1">Monitor Velocity</span>
        </div>

        <div className="glass-panel p-5 border-blue-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">Low Stock Reorders</span>
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-extrabold text-blue-400 mt-2">{alerts?.summary?.lowStockCount}</p>
          <span className="text-[10px] text-gray-400 block mt-1">Below Reorder Level</span>
        </div>
      </div>

      {/* Section 1: Expired Stock (Action Required) */}
      <div className="glass-panel p-6 border-rose-500/40">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-6 h-6 text-rose-400" />
          <div>
            <h2 className="text-lg font-bold text-white">1. Expired Stock (Strict Isolation Required)</h2>
            <p className="text-xs text-gray-400">These batches have reached their expiry date and are automatically blocked from FEFO sales.</p>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Batch Code</th>
                <th>Medicine Name</th>
                <th>Expired On</th>
                <th>Quantity Left</th>
                <th>Shelf Location</th>
                <th>Current Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts?.expiredBatches?.length > 0 ? (
                alerts.expiredBatches.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono font-bold text-rose-400">{b.batch_number}</td>
                    <td className="font-semibold text-white">{b.medicine_name}</td>
                    <td className="font-bold text-rose-400">{b.expiry_date}</td>
                    <td className="font-bold text-white">{b.available_quantity} {b.unit}</td>
                    <td className="text-gray-300">{b.shelf_location}</td>
                    <td>
                      <span className="badge badge-red">EXPIRED</span>
                    </td>
                    <td>
                      {b.status !== 'QUARANTINED' ? (
                        <button
                          onClick={() => handleQuarantineBatch(b.id)}
                          className="btn-danger text-xs py-1 px-3"
                        >
                          Quarantine Batch
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-semibold">Quarantined</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-emerald-400 text-xs font-semibold">
                    🎉 Excellent! Zero un-quarantined expired batches in inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: High Risk Expiring in 30 Days */}
      <div className="glass-panel p-6 border-amber-500/40">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
          <div>
            <h2 className="text-lg font-bold text-white">2. High Risk Batches (Expiring within 30 Days)</h2>
            <p className="text-xs text-gray-400">Targeted for immediate priority dispatching by FEFO engine.</p>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Batch Code</th>
                <th>Medicine Name</th>
                <th>Expiry Date</th>
                <th>Available Qty</th>
                <th>Shelf Rack</th>
                <th>Action Recommended</th>
              </tr>
            </thead>
            <tbody>
              {alerts?.expiring30Batches?.length > 0 ? (
                alerts.expiring30Batches.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono font-bold text-amber-400">{b.batch_number}</td>
                    <td className="font-semibold text-white">{b.medicine_name}</td>
                    <td className="font-bold text-amber-400">{b.expiry_date}</td>
                    <td className="font-bold text-white">{b.available_quantity} {b.unit}</td>
                    <td className="text-gray-300">{b.shelf_location}</td>
                    <td>
                      <span className="badge badge-yellow">DISPATCH FIRST (FEFO)</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500 text-xs">
                    No batches expiring within 30 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Low Stock Warnings */}
      <div className="glass-panel p-6 border-blue-500/40">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-6 h-6 text-blue-400" />
          <div>
            <h2 className="text-lg font-bold text-white">3. Low Sellable Stock Reorder Warnings</h2>
            <p className="text-xs text-gray-400">Medicines whose in-date sellable stock is at or below reorder threshold.</p>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Category</th>
                <th>In-Date Sellable Stock</th>
                <th>Reorder Threshold</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts?.lowStockMedicines?.length > 0 ? (
                alerts.lowStockMedicines.map((m) => (
                  <tr key={m.id}>
                    <td className="font-bold text-white">{m.name}</td>
                    <td className="text-gray-300">{m.category}</td>
                    <td className="font-extrabold text-amber-400">{m.sellable_stock} {m.unit}</td>
                    <td className="text-gray-400">{m.reorder_level} {m.unit}</td>
                    <td>
                      <span className="badge badge-yellow">REORDER RECOMMENDED</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-500 text-xs">
                    All medicines have healthy sellable stock levels.
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
