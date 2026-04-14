/* ============================================================
   MoneyMate – Smart Expense Manager
   script.js — Authentication Logic
   ============================================================ */

// ── Constants ─────────────────────────────────────────────────
const USERS_KEY    = 'mm_users';
const SESSION_KEY  = 'mm_session';
const DEMO_USER    = { name: 'Demo User', email: 'demo@moneymate.app', password: 'demo123' };

// ── Utility: Toast Notifications ──────────────────────────────
/**
 * Shows a toast notification at the top-right corner.
 * @param {string} message - Message to display
 * @param {'success'|'error'|'warning'} type - Toast type
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Utility: User Storage ──────────────────────────────────────
/**
 * Retrieves all registered users from localStorage.
 * @returns {Array} Array of user objects
 */
function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

/**
 * Saves users array back to localStorage.
 * @param {Array} users
 */
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * Checks if an email already has a registered account.
 * @param {string} email
 * @returns {Object|undefined}
 */
function findUser(email) {
  const all = getUsers();
  // Also check demo user
  if (email === DEMO_USER.email) return DEMO_USER;
  return all.find(u => u.email.toLowerCase() === email.toLowerCase());
}

// ── Utility: Session Management ───────────────────────────────
/**
 * Saves current user session to localStorage.
 * @param {Object} user
 */
function setSession(user) {
  const session = { name: user.name, email: user.email, loggedIn: true };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Gets the current session (if any).
 * @returns {Object|null}
 */
function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY));
}

// ── Auth Guard: Redirect if already logged in ──────────────────
(function checkAlreadyLoggedIn() {
  const session = getSession();
  if (session && session.loggedIn) {
    window.location.href = 'home.html';
  }
})();

// ── Utility: Validation Helpers ───────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(fieldId, errorId, show = true) {
  const field = document.getElementById(fieldId);
  const err   = document.getElementById(errorId);
  if (show) {
    field.classList.add('error');
    err.classList.add('visible');
  } else {
    field.classList.remove('error');
    err.classList.remove('visible');
  }
}

function clearErrors(...ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('error', 'visible'); }
  });
}

// ── Alert display helper ───────────────────────────────────────
function showAlert(id, message, type = 'error') {
  const el = document.getElementById(id);
  el.textContent  = message;
  el.className    = `alert alert-${type} visible`;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  el.classList.remove('visible');
}

// ── Section Toggle: Login ↔ Signup ─────────────────────────────
document.getElementById('goToSignup').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('signupSection').classList.remove('hidden');
  hideAlert('signupError');
});

document.getElementById('goToLogin').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('signupSection').classList.add('hidden');
  document.getElementById('loginSection').classList.remove('hidden');
  hideAlert('loginError');
});

// ── Password Toggle Visibility ─────────────────────────────────
document.querySelectorAll('.toggle-password').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fa-regular fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fa-regular fa-eye';
    }
  });
});

// ── LOGIN Form Handler ─────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  hideAlert('loginError');

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn      = document.getElementById('loginBtn');
  let   valid    = true;

  // Validate Email
  if (!email || !isValidEmail(email)) {
    showFieldError('loginEmail', 'loginEmailErr');
    valid = false;
  } else {
    showFieldError('loginEmail', 'loginEmailErr', false);
  }

  // Validate Password
  if (!password) {
    showFieldError('loginPassword', 'loginPassErr');
    valid = false;
  } else {
    showFieldError('loginPassword', 'loginPassErr', false);
  }

  if (!valid) return;

  // Show loading state
  btn.disabled   = true;
  btn.innerHTML  = '<span class="spinner"></span>Signing In…';

  // Simulate slight async delay (mimics real auth)
  setTimeout(() => {
    const user = findUser(email);

    if (!user || user.password !== password) {
      showAlert('loginError', '❌ Invalid email or password. Please try again.');
      btn.disabled  = false;
      btn.innerHTML = 'Sign In';
      return;
    }

    // Success!
    setSession(user);
    showToast(`Welcome back, ${user.name}! 🎉`, 'success');
    btn.innerHTML = '✓ Redirecting…';

    setTimeout(() => {
      window.location.href = 'home.html';
    }, 700);
  }, 800);
});

// ── SIGNUP Form Handler ────────────────────────────────────────
document.getElementById('signupForm').addEventListener('submit', function(e) {
  e.preventDefault();
  hideAlert('signupError');

  const name     = document.getElementById('signupName').value.trim();
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm  = document.getElementById('signupConfirm').value;
  const btn      = document.getElementById('signupBtn');
  let   valid    = true;

  // Validate Name
  if (!name || name.length < 2) {
    showFieldError('signupName', 'signupNameErr');
    valid = false;
  } else {
    showFieldError('signupName', 'signupNameErr', false);
  }

  // Validate Email
  if (!email || !isValidEmail(email)) {
    showFieldError('signupEmail', 'signupEmailErr');
    valid = false;
  } else {
    showFieldError('signupEmail', 'signupEmailErr', false);
  }

  // Validate Password
  if (!password || password.length < 6) {
    showFieldError('signupPassword', 'signupPassErr');
    valid = false;
  } else {
    showFieldError('signupPassword', 'signupPassErr', false);
  }

  // Validate Confirm Password
  if (password !== confirm) {
    showFieldError('signupConfirm', 'signupConfirmErr');
    valid = false;
  } else {
    showFieldError('signupConfirm', 'signupConfirmErr', false);
  }

  if (!valid) return;

  // Loading state
  btn.disabled   = true;
  btn.innerHTML  = '<span class="spinner"></span>Creating Account…';

  setTimeout(() => {
    // Check if email already exists
    if (findUser(email)) {
      showAlert('signupError', '❌ This email is already registered. Please sign in.');
      btn.disabled  = false;
      btn.innerHTML = 'Create My Account';
      return;
    }

    // Save new user
    const users = getUsers();
    const newUser = { name, email, password, createdAt: new Date().toISOString() };
    users.push(newUser);
    saveUsers(users);

    // Auto-login
    setSession(newUser);
    showToast(`Account created! Welcome, ${name}! 🚀`, 'success');
    btn.innerHTML = '✓ Redirecting…';

    setTimeout(() => {
      window.location.href = 'home.html';
    }, 700);
  }, 900);
});

// ── DEMO Login Button ──────────────────────────────────────────
document.getElementById('demoLoginBtn').addEventListener('click', () => {
  const btn = document.getElementById('demoLoginBtn');
  btn.innerHTML = '<span class="spinner"></span>Loading Demo…';
  btn.disabled  = true;

  setTimeout(() => {
    setSession(DEMO_USER);
    showToast('Welcome to the Demo! 🎉', 'success');
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 500);
  }, 700);
});

// ── Clear field errors on input ─────────────────────────────────
['loginEmail','loginPassword','signupName','signupEmail','signupPassword','signupConfirm'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => {
      el.classList.remove('error');
      // Find associated error element (next sibling convention)
      const errEl = el.closest('.form-group').querySelector('.form-error');
      if (errEl) errEl.classList.remove('visible');
    });
  }
});