import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, AlertTriangle, ArrowRight, CheckCircle2, Search, Cpu, BarChart3, QrCode, RefreshCw, Sparkles, Building2, UserCheck, Stethoscope } from 'lucide-react';

export default function LandingPage() {
  // Interactive FEFO Demo State
  const [demoMedicine, setDemoMedicine] = useState('Paracetamol 650mg');
  const [demoQuantity, setDemoQuantity] = useState(60);

  const sampleBatches = [
    { code: 'PCM-BATCH-01', expiry: '2026-09-29', qty: 45, status: 'PICK_FIRST', daysLeft: 12 },
    { code: 'PCM-BATCH-02', expiry: '2026-12-16', qty: 150, status: 'PICK_SECOND', daysLeft: 90 },
    { code: 'PCM-BATCH-EX', expiry: '2026-09-07', qty: 60, status: 'EXPIRED_IGNORED', daysLeft: -10 }
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 pb-20">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        
        {/* Glowing backdrop elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            PharmaCompanion FEFO Expiry ERP & Clinical Inventory Engine
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Never Dispense Expired Stock. <br />
            <span className="gradient-text">Empower Your Pharmacy with FEFO Precision.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto font-normal">
            PharmaCompanion protects clinical and retail pharmacies by enforcing strict batch-level FEFO logic. Know your true sellable stock, receive proactive expiry alerts, and answer stock availability questions in seconds.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/dispense" className="btn-primary text-base py-3 px-6 shadow-xl shadow-cyan-500/20">
              Launch FEFO Terminal <ArrowRight className="w-5 h-5 ml-1" />
            </Link>
            <Link to="/dashboard" className="btn-secondary text-base py-3 px-6">
              Explore Live Dashboard
            </Link>
          </div>

          {/* Key Metrics Banner */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 glass-panel p-6">
            <div>
              <p className="text-3xl font-extrabold text-cyan-400">100%</p>
              <p className="text-xs text-gray-400 mt-1 uppercase font-semibold">FEFO Compliance</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-emerald-400">0</p>
              <p className="text-xs text-gray-400 mt-1 uppercase font-semibold">Expired Medicines Out</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-blue-400">&lt; 1s</p>
              <p className="text-xs text-gray-400 mt-1 uppercase font-semibold">In-Date Stock Search</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-amber-400">Automated</p>
              <p className="text-xs text-gray-400 mt-1 uppercase font-semibold">Quarantine Alerts</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive FEFO Live Simulator Widget */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-panel p-6 sm:p-10 border-cyan-500/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Live Interactive Demonstration</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">See FEFO Logic In Action</h2>
              <p className="text-sm text-gray-400 mt-1">Simulate how stock is allocated when a pharmacist dispenses medicine.</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-300 font-medium">Quantity to Dispense:</label>
              <input
                type="number"
                min="1"
                max="150"
                value={demoQuantity}
                onChange={(e) => setDemoQuantity(parseInt(e.target.value) || 1)}
                className="w-24 form-input text-center text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {sampleBatches.map((batch, idx) => {
              let allocated = 0;
              if (batch.status !== 'EXPIRED_IGNORED') {
                if (idx === 0) {
                  allocated = Math.min(batch.qty, demoQuantity);
                } else if (idx === 1) {
                  const rem = Math.max(0, demoQuantity - sampleBatches[0].qty);
                  allocated = Math.min(batch.qty, rem);
                }
              }

              return (
                <div
                  key={batch.code}
                  className={`p-5 rounded-xl border transition-all ${
                    batch.status === 'EXPIRED_IGNORED'
                      ? 'bg-rose-500/5 border-rose-500/20 opacity-60'
                      : allocated > 0
                      ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : 'bg-gray-900/60 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-gray-300">{batch.code}</span>
                    {batch.status === 'EXPIRED_IGNORED' ? (
                      <span className="badge badge-red">EXPIRED (IGNORED)</span>
                    ) : allocated > 0 ? (
                      <span className="badge badge-green">PICK #{idx + 1} (FEFO)</span>
                    ) : (
                      <span className="badge badge-yellow">STANDBY</span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expiry Date:</span>
                      <span className={`font-semibold ${batch.daysLeft < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {batch.expiry} ({batch.daysLeft < 0 ? 'Expired' : `${batch.daysLeft} days left`})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Available Stock:</span>
                      <span className="font-semibold text-white">{batch.qty} units</span>
                    </div>
                    
                    <div className="pt-3 border-t border-white/10">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-gray-300">Deducted Qty:</span>
                        <span className={allocated > 0 ? 'text-cyan-400 font-extrabold' : 'text-gray-500'}>
                          {allocated} units
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-between text-xs">
            <span className="text-cyan-300 font-medium">
              💡 <strong>Result:</strong> Expired batch (<code className="text-rose-400">PCM-BATCH-EX</code>) was completely skipped. Stock taken strictly from oldest expiring batch (<code className="text-cyan-400">PCM-BATCH-01</code>) first!
            </span>
            <Link to="/dispense" className="text-cyan-400 hover:text-cyan-300 font-bold underline shrink-0">
              Try Full Terminal →
            </Link>
          </div>
        </div>
      </section>

      {/* Product Overview & Key Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white">Engineered Specifically For Pharmacies</h2>
          <p className="text-gray-400 mt-2 max-w-xl mx-auto text-sm">
            Standard inventory software treats stock as homogenous. PharmaExpiry treats every batch independently with expiry precision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-6 glass-panel-hover">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Automated FEFO Picking</h3>
            <p className="text-sm text-gray-400">
              System algorithm automatically calculates batch deduction order sorted by earliest expiry date. Dispensing errors are physically impossible.
            </p>
          </div>

          <div className="glass-panel p-6 glass-panel-hover">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Expired Batch Hard Shield</h3>
            <p className="text-sm text-gray-400">
              Expired batches are isolated from sellable inventory. They can never be selected, sold, or dispensed under any scenario.
            </p>
          </div>

          <div className="glass-panel p-6 glass-panel-hover">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">In-Date Stock Search</h3>
            <p className="text-sm text-gray-400">
              Answer customer queries like <em>“Do we have Paracetamol in date?”</em> instantly with exact sellable quantities and expiry dates.
            </p>
          </div>
        </div>
      </section>

      {/* Target Audience & How It Helps */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div>
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Target Audience</span>
            <h2 className="text-3xl font-extrabold text-white mt-2 mb-6">Who PharmaExpiry Serves</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4 glass-panel p-4">
                <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Neighbourhood Retail Pharmacies</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Eliminates manual shelf checks and prevents unsellable expired inventory loss on retail shelves.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 glass-panel p-4">
                <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Hospital Dispensaries & Clinics</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Guarantees high compliance, complete audit trails, and strict safety for inpatient prescription orders.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 glass-panel p-4">
                <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Chief Pharmacists & Managers</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Real-time dashboard telemetry, profit preservation, and automated risk alert feeds.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 bg-gradient-to-br from-gray-900/90 to-cyan-950/30 border-cyan-500/30">
            <h3 className="text-2xl font-bold text-white mb-4">How PharmaExpiry Solves The Problem</h3>
            
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-gray-950/60 border border-white/5">
                <p className="text-rose-400 font-semibold mb-1">❌ Traditional Problem:</p>
                <p className="text-gray-300">
                  Staff pick the frontmost box without checking expiry dates, leaving older batches to rot at the back of shelves.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <p className="text-emerald-400 font-semibold mb-1">✅ PharmaExpiry Solution:</p>
                <p className="text-gray-300">
                  The system forces staff to pull specific batch numbers (<code className="text-cyan-400 font-mono">Rack A-1, Batch B-102</code>) strictly sorted by earliest expiry date.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-950/60 border border-white/5">
                <p className="text-rose-400 font-semibold mb-1">❌ Traditional Problem:</p>
                <p className="text-gray-300">
                  Total inventory counts include expired boxes, leading to false confidence until a customer asks for in-date medicine.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <p className="text-emerald-400 font-semibold mb-1">✅ PharmaExpiry Solution:</p>
                <p className="text-gray-300">
                  Calculates <strong>Sellable Stock</strong> dynamically by filtering out expired stock automatically in database queries.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3 Features To Build Next (Roadmap Section) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Product Roadmap</span>
          <h2 className="text-3xl font-extrabold text-white mt-1">Three Features We Would Build Next</h2>
          <p className="text-gray-400 mt-2 max-w-xl mx-auto text-sm">
            Future expansion plans to advance PharmaExpiry into an enterprise-grade automated ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 border-cyan-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-bl-xl uppercase">
              Phase 2 Roadmap
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">1. Automated AI Wholesaler Reordering</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Predictive AI algorithm that analyzes sales velocity against upcoming batch expiries. Automatically generates supplier purchase orders before critical stock gaps occur.
            </p>
          </div>

          <div className="glass-panel p-6 border-blue-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-bl-xl uppercase">
              Phase 2 Roadmap
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">2. Barcode & GS1 DataMatrix Scanner</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Direct hardware scanner integration at POS terminal. Scanning 2D DataMatrix barcodes instantly parses medicine ID, batch number, and mfg/exp date without manual typing.
            </p>
          </div>

          <div className="glass-panel p-6 border-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-bl-xl uppercase">
              Phase 2 Roadmap
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">3. Multi-Store Stock Redistribution</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Inter-branch network balancing. Automatically prompts transferring near-expiry batches from slow-moving neighborhood outlets to high-demand central hospital branches.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="glass-panel p-10 text-center bg-gradient-to-r from-cyan-950/50 via-gray-900 to-blue-950/50 border-cyan-500/40">
          <h2 className="text-3xl font-extrabold text-white">Ready to Test FEFO Stock Management?</h2>
          <p className="text-sm text-gray-300 mt-2 max-w-xl mx-auto">
            Experience real-time stock allocation, quarantine isolation, and batch auditing now.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/dispense" className="btn-primary text-sm py-2.5 px-6">
              Launch Dispense Terminal
            </Link>
            <Link to="/login" className="btn-secondary text-sm py-2.5 px-6">
              Sign In Demo Account
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
