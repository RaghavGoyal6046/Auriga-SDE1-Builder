/**
 * PharmaExpiry Client Engine (Vanilla JavaScript)
 */

const API_BASE = '/api';

// Authentication & Session Management
function getAuthToken() {
  return localStorage.getItem('pharma_token');
}

function getUser() {
  try {
    const raw = localStorage.getItem('pharma_user');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function setSession(token, user) {
  localStorage.setItem('pharma_token', token);
  localStorage.setItem('pharma_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('pharma_token');
  localStorage.removeItem('pharma_user');
  window.location.href = '/login';
}

// Authenticated API Fetch Wrapper
async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    // Expired or invalid token
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
      clearSession();
    }
  }

  return { ok: response.ok, status: response.status, data };
}

// Formatters
function formatCurrency(num) {
  const val = Number(num) || 0;
  return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split('T')[0];
}

// Toast Notifications
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Render Global Navigation Bar
function renderNavbar(activePage = '') {
  const navContainer = document.getElementById('navbar-container');
  if (!navContainer) return;

  const user = getUser();
  const isLoggedIn = !!user && !!getAuthToken();
  const isAdmin = user && (user.role === 'ADMIN');

  navContainer.innerHTML = `
    <nav class="navbar">
      <a href="/" class="nav-brand">
        <span>💊 PharmaExpiry</span>
        <span class="brand-badge">FEFO CORE</span>
      </a>

      ${isLoggedIn ? `
        <ul class="nav-links">
          <li><a href="/dashboard" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a></li>
          <li><a href="/dispense" class="nav-link ${activePage === 'dispense' ? 'active' : ''}">POS Dispense</a></li>
          <li><a href="/inventory" class="nav-link ${activePage === 'inventory' ? 'active' : ''}">Inventory</a></li>
          <li><a href="/batches" class="nav-link ${activePage === 'batches' ? 'active' : ''}">Batches</a></li>
          <li><a href="/alerts" class="nav-link ${activePage === 'alerts' ? 'active' : ''}">Expiry Alerts</a></li>
          ${isAdmin ? `<li><a href="/staff" class="nav-link ${activePage === 'staff' ? 'active' : ''}" style="color: #38bdf8; font-weight: 700;">👥 Staff (Admin)</a></li>` : ''}
        </ul>

        <div class="nav-user">
          <div class="user-badge">
            <span>👤 ${user.name || 'User'}</span>
            <span class="role-pill ${isAdmin ? 'role-admin' : ''}">${(user.role || 'PHARMACIST').toUpperCase()}</span>
          </div>
          <button onclick="clearSession()" class="btn btn-secondary btn-sm">Logout</button>
        </div>
      ` : `
        <div class="nav-user">
          <a href="/login" class="btn btn-secondary btn-sm">Sign In</a>
          <a href="/register" class="btn btn-primary btn-sm">Admin Setup</a>
        </div>
      `}
    </nav>
  `;
}

// Protected Route Guard
function requireAuth() {
  const token = getAuthToken();
  const user = getUser();
  if (!token || !user) {
    window.location.href = '/login';
    return false;
  }
  return true;
}
