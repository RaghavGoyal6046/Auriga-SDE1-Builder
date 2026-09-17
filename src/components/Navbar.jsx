import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Pill, ShieldAlert, LayoutDashboard, ShoppingCart, Package, Boxes, LogOut, Search, CheckCircle, XCircle, Home } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleQuickCheck = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/medicines/check-indate?name=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      setSearchResult(data);
      setShowModal(true);
    } catch (err) {
      console.error('Quick check error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0b0f19]/80 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 text-decoration-none group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-all">
              <Pill className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#070b14] animate-pulse"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">Pharma<span className="text-emerald-400">Companion</span></span>
                <span className="hidden xl:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  CLINICAL FEFO ERP
                </span>
              </div>
              <span className="block text-[10px] font-medium tracking-wider text-teal-400/90 -mt-0.5">Expiry Prevention Engine</span>
            </div>
          </Link>

          {/* Quick "Do we have X in date?" Search Widget */}
          <form onSubmit={handleQuickCheck} className="flex-1 max-w-md hidden md:flex items-center relative">
            <Search className="w-4 h-4 absolute left-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Ask: 'Do we have Paracetamol in date?'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900/90 border border-white/10 rounded-full pl-10 pr-24 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition-all placeholder:text-gray-500"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1.5 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold text-xs rounded-full transition-all"
            >
              {isSearching ? 'Checking...' : 'Check Stock'}
            </button>
          </form>

          {/* Navigation Items */}
          <nav className="flex items-center gap-1 lg:gap-2">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive('/') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Landing</span>
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive('/dashboard') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>

                <Link
                  to="/dispense"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive('/dispense') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <span>Dispense (FEFO)</span>
                </Link>

                <Link
                  to="/inventory"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive('/inventory') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span className="hidden md:inline">Medicines</span>
                </Link>

                <Link
                  to="/batches"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive('/batches') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                  <span className="hidden md:inline">Batches</span>
                </Link>

                <Link
                  to="/alerts"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive('/alerts') ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">Alerts</span>
                </Link>

                <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block"></div>

                <div className="flex items-center gap-2">
                  <div className="hidden lg:block text-right">
                    <p className="text-xs font-bold text-white leading-tight">{user?.name}</p>
                    <p className="text-[10px] text-cyan-400 font-medium">{user?.role}</p>
                  </div>
                  <button
                    onClick={() => { logout(); navigate('/login'); }}
                    title="Sign Out"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary text-xs py-1.5 px-3">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary text-xs py-1.5 px-3">
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Quick Check Modal Popup */}
      {showModal && searchResult && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="text-center mb-4">
              <span className="text-xs uppercase tracking-wider font-semibold text-cyan-400">Quick Availability Inspection</span>
              <h3 className="text-xl font-bold text-white mt-1">
                "Do we have {searchQuery} in date?"
              </h3>
            </div>

            {searchResult.found ? (
              <div className={`p-4 rounded-xl border ${searchResult.inDateAvailable ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'} mb-4`}>
                <div className="flex items-center gap-3">
                  {searchResult.inDateAvailable ? (
                    <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <h4 className={`text-base font-bold ${searchResult.inDateAvailable ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {searchResult.inDateAvailable ? 'YES - IN-DATE STOCK AVAILABLE' : 'NO - NO SELLABLE STOCK'}
                    </h4>
                    <p className="text-xs text-gray-300 mt-0.5">{searchResult.message}</p>
                  </div>
                </div>

                {searchResult.inDateAvailable && (
                  <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-emerald-500/20 text-xs">
                    <div>
                      <span className="text-gray-400 block">Sellable Stock Qty:</span>
                      <span className="text-lg font-extrabold text-white">{searchResult.sellableStock} {searchResult.medicine.unit}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Earliest Expiry Date:</span>
                      <span className="text-lg font-extrabold text-amber-400">{searchResult.earliestExpiryDate}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gray-800/80 border border-white/10 text-center mb-4 text-xs text-gray-300">
                {searchResult.message}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary text-xs">
                Close
              </button>
              {searchResult.inDateAvailable && (
                <button
                  onClick={() => { setShowModal(false); navigate('/dispense'); }}
                  className="btn-primary text-xs"
                >
                  Go to FEFO Dispense Terminal →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
