import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, CheckCircle2, AlertCircle, ArrowRight, Printer, ShieldCheck, Zap, FileText, Check, AlertTriangle } from 'lucide-react';

export default function DispensePage() {
  const [medicines, setMedicines] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [cart, setCart] = useState([{ medicine_id: '', quantity: 10 }]);

  // FEFO Preview State
  const [previewPlan, setPreviewPlan] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Execution & Receipt State
  const [isDispensing, setIsDispensing] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    fetchMedicineCatalog();
  }, []);

  const fetchMedicineCatalog = async () => {
    try {
      const res = await fetch('/api/medicines?limit=100');
      const data = await res.json();
      setMedicines(data.data || []);
      if (data.data?.length > 0 && !cart[0].medicine_id) {
        setCart([{ medicine_id: data.data[0].id, quantity: 10 }]);
      }
    } catch (err) {
      console.error('Error fetching medicine catalog:', err);
    }
  };

  const handleAddItem = () => {
    if (medicines.length === 0) return;
    setCart([...cart, { medicine_id: medicines[0].id, quantity: 10 }]);
    setPreviewPlan(null);
  };

  const handleRemoveItem = (index) => {
    if (cart.length === 1) return;
    const updated = cart.filter((_, idx) => idx !== index);
    setCart(updated);
    setPreviewPlan(null);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...cart];
    updated[index][field] = field === 'quantity' ? parseInt(value) || '' : value;
    setCart(updated);
    setPreviewPlan(null);
  };

  const handleGeneratePreview = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setIsPreviewing(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/dispense/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items: cart })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to calculate FEFO plan');

      setPreviewPlan(data);
    } catch (err) {
      setErrorMsg(err.message);
      setPreviewPlan(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirmDispense = async () => {
    if (!patientName.trim()) {
      setErrorMsg('Please enter patient name before dispensing');
      return;
    }

    setErrorMsg('');
    setIsDispensing(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/dispense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_name: patientName.trim(),
          items: cart
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete dispense transaction');

      setReceipt(data.receipt);
      setPreviewPlan(null);
      // Refresh catalog stock
      fetchMedicineCatalog();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsDispensing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] p-4 lg:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-green">FEFO ENGINE ACTIVE</span>
            <span className="text-xs text-gray-400">Strict Earliest-Expiry-First Deductions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">PharmaCompanion Clinical Dispensing Terminal</h1>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-gray-400 hover:text-white">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Form Workbench (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 border-cyan-500/30">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-cyan-400" />
              1. Customer & Prescription Detail
            </h2>

            <div className="space-y-4">
              <div>
                <label className="form-label">Patient / Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="form-input text-sm"
                />
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <label className="form-label mb-0">Select Medicines & Quantities</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="space-y-3">
                  {cart.map((item, idx) => {
                    const selectedMed = medicines.find((m) => m.id === parseInt(item.medicine_id));

                    return (
                      <div key={idx} className="p-3 rounded-xl bg-gray-900/80 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Item #{idx + 1}</span>
                          {cart.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-gray-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-8">
                            <select
                              value={item.medicine_id}
                              onChange={(e) => handleItemChange(idx, 'medicine_id', e.target.value)}
                              className="form-input text-xs py-1.5"
                            >
                              {medicines.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.sellable_stock} in date)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-4">
                            <input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="form-input text-xs py-1.5 text-center font-bold"
                            />
                          </div>
                        </div>

                        {selectedMed && (
                          <div className="text-[10px] flex justify-between text-gray-400 pt-1">
                            <span>Sellable Stock: <strong className="text-emerald-400">{selectedMed.sellable_stock}</strong> {selectedMed.unit}</span>
                            <span>Category: {selectedMed.category}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={isPreviewing}
                className="w-full btn-primary justify-center py-2.5 text-xs shadow-lg shadow-cyan-500/20 mt-4"
              >
                {isPreviewing ? 'Calculating FEFO Allocation...' : 'Preview FEFO Batch Allocation Plan →'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive FEFO Allocation Breakdown (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 border-cyan-500/30">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              2. FEFO Batch Picking Preview
            </h2>
            <p className="text-xs text-gray-400 mb-6">
              Review exact batches selected by the FEFO engine before confirming transaction.
            </p>

            {previewPlan ? (
              <div className="space-y-6">
                
                {previewPlan.previewResults.map((res, rIdx) => (
                  <div key={rIdx} className="p-4 rounded-xl bg-gray-900/90 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div>
                        <h3 className="text-base font-bold text-white">{res.medicine.name}</h3>
                        <span className="text-xs text-gray-400">Requested Qty: {res.requestedQty} {res.medicine.unit}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-400 block">Subtotal</span>
                        <span className="text-sm font-extrabold text-emerald-400">${res.totalPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Batch Allocations Timeline */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block">
                        Batches Picked in Order of Earliest Expiry:
                      </span>

                      {res.allocations.map((alloc, aIdx) => (
                        <div
                          key={alloc.batch_id}
                          className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-cyan-500 text-gray-950 font-extrabold text-[11px] flex items-center justify-center">
                              #{aIdx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white">{alloc.batch_number}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                                  Shelf: {alloc.shelf_location}
                                </span>
                              </div>
                              <span className="text-[11px] text-amber-400">
                                Expires: {alloc.expiry_date}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-cyan-300 block text-sm">
                              Deduct: {alloc.quantity_allocated} units
                            </span>
                            <span className="text-[10px] text-gray-400">
                              (Stock: {alloc.batch_available_before} → {alloc.batch_available_after})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center gap-2 text-[10px] text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>All expired batches automatically excluded by FEFO safety shield.</span>
                    </div>
                  </div>
                ))}

                {/* Summary & Confirm Action */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block uppercase font-semibold">Grand Total Payable</span>
                    <span className="text-2xl font-extrabold text-white">${previewPlan.grandTotal.toFixed(2)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmDispense}
                    disabled={isDispensing || !previewPlan.canDispense}
                    className="btn-primary py-3 px-6 text-sm shadow-xl shadow-cyan-500/30"
                  >
                    {isDispensing ? 'Processing Stock Deduction...' : 'Confirm & Dispense Stock →'}
                  </button>
                </div>

              </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-gray-300">No FEFO Plan Preview Calculated</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  Select medicines and click "Preview FEFO Batch Allocation Plan" on the left to simulate picking.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Invoice Receipt Modal Popup */}
      {receipt && (
        <div className="modal-overlay" onClick={() => setReceipt(null)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="text-center pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Dispense Receipt</h3>
              <p className="text-xs font-mono text-cyan-400 mt-0.5">{receipt.reference_no}</p>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Patient:</span>
                <span className="font-bold text-white">{receipt.patient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Dispensed By:</span>
                <span className="text-gray-200">{receipt.dispensed_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date & Time:</span>
                <span className="text-gray-200">{new Date(receipt.dispensed_at).toLocaleString()}</span>
              </div>

              <div className="pt-3 border-t border-white/10">
                <span className="font-semibold text-gray-300 block mb-2">Items Dispensed (FEFO Audit):</span>
                <div className="space-y-2">
                  {receipt.items.map((item) => (
                    <div key={item.id} className="p-2 rounded bg-gray-900 flex justify-between">
                      <div>
                        <p className="font-bold text-white">{item.medicine_name}</p>
                        <p className="text-[10px] text-cyan-400">Batch: {item.batch_number} (Exp: {item.expiry_date})</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-400">${item.subtotal.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400">{item.quantity} x ${item.unit_price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-center text-sm font-bold">
                <span className="text-gray-200">Total Amount Paid:</span>
                <span className="text-xl text-emerald-400">${receipt.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <button
                onClick={() => window.print()}
                className="btn-secondary text-xs flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="btn-primary text-xs"
              >
                Close & Next Transaction
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
