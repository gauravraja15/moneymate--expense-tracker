/* ============================================================
   MoneyMate – Premium AI-Powered Dashboard
   home.js  ·  Full feature set
   ============================================================
   Features:
   - Auth guard + localStorage per-user data
   - Transactions (CRUD) with categories
   - Monthly Budget tracking
   - Smart Insights (auto-analysis)
   - AI Chatbot (FinBot) with Claude API + smart rule-based fallback
   - Savings Goals tracker
   - Monthly Reports
   - Daily Tracking Streak
   - Charts: Bar, Pie/Doughnut, Line
   - Sidebar navigation (Dashboard, Transactions, Reports, Goals, AI)
   - Export CSV
   ============================================================ */

'use strict';

// ─────────────────────────────────────────────────────────────
// CONSTANTS & CONFIG
// ─────────────────────────────────────────────────────────────
const SESSION_KEY    = 'mm_session';
const TX_KEY_PFX     = 'mm_tx_';
const BUDGET_KEY_PFX = 'mm_budget_';
const GOAL_KEY_PFX   = 'mm_goals_';
const STREAK_KEY_PFX = 'mm_streak_';

// Category metadata: emoji + hex color
const CATEGORIES = {
  food:          { emoji: '🍔', label: 'Food',           color: '#ffab40' },
  shopping:      { emoji: '🛍️', label: 'Shopping',       color: '#a259ff' },
  travel:        { emoji: '🚗', label: 'Travel',          color: '#4a8cff' },
  bills:         { emoji: '💡', label: 'Bills',           color: '#ff4d6d' },
  entertainment: { emoji: '🎬', label: 'Entertainment',   color: '#00e5a0' },
  health:        { emoji: '🏥', label: 'Health',          color: '#00d4ff' },
  salary:        { emoji: '💼', label: 'Salary',          color: '#00e5a0' },
  freelance:     { emoji: '💻', label: 'Freelance',       color: '#4a8cff' },
  investment:    { emoji: '📈', label: 'Investment',      color: '#ffd166' },
  other:         { emoji: '📦', label: 'Other',           color: '#8a95b0' },
};

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
let currentUser   = null;   // { name, email }
let transactions  = [];     // All user transactions
let monthlyBudget = 0;
let goals         = [];     // [{ id, name, target, saved }]
let streak        = { count: 0, lastDate: null };
let selectedType  = 'income';
let filterMonthKey = '';    // 'YYYY-MM' or '' for all-time

// Chart instances
let barChartInst  = null;
let pieChartInst  = null;
let lineChartInst = null;

// Chat history for AI (for context)
let chatHistory   = [];

// ─────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────
const txKey     = () => TX_KEY_PFX     + currentUser.email;
const budgetKey = () => BUDGET_KEY_PFX + currentUser.email;
const goalKey   = () => GOAL_KEY_PFX   + currentUser.email;
const streakKey = () => STREAK_KEY_PFX + currentUser.email;

function loadAll() {
  transactions  = JSON.parse(localStorage.getItem(txKey()))     || [];
  monthlyBudget = parseFloat(localStorage.getItem(budgetKey())) || 0;
  goals         = JSON.parse(localStorage.getItem(goalKey()))   || [];
  streak        = JSON.parse(localStorage.getItem(streakKey())) || { count: 0, lastDate: null };
}

function saveTransactions() { localStorage.setItem(txKey(),     JSON.stringify(transactions)); }
function saveBudget()       { localStorage.setItem(budgetKey(), monthlyBudget); }
function saveGoals()        { localStorage.setItem(goalKey(),   JSON.stringify(goals)); }
function saveStreak()       { localStorage.setItem(streakKey(), JSON.stringify(streak)); }

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────
/** Format number as ₹ Indian Rupees */
function fmt(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/** Format date string (YYYY-MM-DD) → readable */
function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

/** Get current YYYY-MM-DD string */
function todayStr() { return new Date().toISOString().split('T')[0]; }

/** Get YYYY-MM from a date string */
function monthOf(d) { return d.substring(0, 7); }

/** Generate a short unique ID */
function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

/** Current time as HH:MM */
function timeNow() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  el.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ─────────────────────────────────────────────────────────────
// AUTH GUARD
// ─────────────────────────────────────────────────────────────
function checkSession() {
  const s = JSON.parse(localStorage.getItem(SESSION_KEY));
  if (!s || !s.loggedIn) { window.location.href = 'index.html'; return null; }
  return s;
}

// ─────────────────────────────────────────────────────────────
// DEMO DATA SEEDER
// ─────────────────────────────────────────────────────────────
function seedDemo() {
  if (currentUser.email !== 'demo@moneymate.app') return;
  if (transactions.length > 0) return;

  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const pad = n => String(n).padStart(2, '0');
  const d = (day, mo = m) => `${y}-${pad(mo + 1)}-${pad(day)}`;

  transactions = [
    { id: uid(), type: 'income',  desc: 'Monthly Salary',       amount: 55000, date: d(1),      category: 'salary'        },
    { id: uid(), type: 'income',  desc: 'Freelance – Web Dev',  amount: 12000, date: d(5),      category: 'freelance'     },
    { id: uid(), type: 'expense', desc: 'Grocery Shopping',     amount: 3200,  date: d(6),      category: 'food'          },
    { id: uid(), type: 'expense', desc: 'Netflix Subscription', amount: 649,   date: d(7),      category: 'entertainment' },
    { id: uid(), type: 'expense', desc: 'Electricity Bill',     amount: 1800,  date: d(9),      category: 'bills'         },
    { id: uid(), type: 'expense', desc: 'Zomato Orders',        amount: 2400,  date: d(12),     category: 'food'          },
    { id: uid(), type: 'expense', desc: 'Amazon Shopping',      amount: 4500,  date: d(14),     category: 'shopping'      },
    { id: uid(), type: 'expense', desc: 'Metro Card Recharge',  amount: 500,   date: d(15),     category: 'travel'        },
    { id: uid(), type: 'expense', desc: 'Gym Membership',       amount: 1200,  date: d(2),      category: 'entertainment' },
    { id: uid(), type: 'expense', desc: 'Internet Bill',        amount: 999,   date: d(3),      category: 'bills'         },
    { id: uid(), type: 'expense', desc: 'Doctor Visit',         amount: 800,   date: d(8),      category: 'health'        },
    { id: uid(), type: 'income',  desc: 'Monthly Salary',       amount: 55000, date: d(1, m-1), category: 'salary'        },
    { id: uid(), type: 'expense', desc: 'Weekend Trip to Agra', amount: 8500,  date: d(10,m-1), category: 'travel'        },
    { id: uid(), type: 'expense', desc: 'Flipkart Sale',        amount: 6700,  date: d(14,m-1), category: 'shopping'      },
    { id: uid(), type: 'expense', desc: 'Restaurant Dinner',    amount: 2100,  date: d(18,m-1), category: 'food'          },
    { id: uid(), type: 'expense', desc: 'Electricity Bill',     amount: 2100,  date: d(8, m-1), category: 'bills'         },
    { id: uid(), type: 'income',  desc: 'Monthly Salary',       amount: 55000, date: d(1, m-2), category: 'salary'        },
    { id: uid(), type: 'income',  desc: 'Bonus',                amount: 10000, date: d(15,m-2), category: 'other'         },
    { id: uid(), type: 'expense', desc: 'Clothes Shopping',     amount: 5500,  date: d(20,m-2), category: 'shopping'      },
    { id: uid(), type: 'expense', desc: 'Medicine',             amount: 450,   date: d(22,m-2), category: 'health'        },
  ];

  monthlyBudget = 25000;
  goals = [
    { id: uid(), name: 'Emergency Fund', target: 100000, saved: 35000 },
    { id: uid(), name: 'New Laptop',     target: 80000,  saved: 48000 },
  ];
  streak = { count: 7, lastDate: todayStr() };

  saveTransactions(); saveBudget(); saveGoals(); saveStreak();
}

// ─────────────────────────────────────────────────────────────
// STREAK MANAGEMENT
// ─────────────────────────────────────────────────────────────
function updateStreak() {
  const today = todayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  if (streak.lastDate === today) return; // Already updated today

  if (streak.lastDate === yStr) {
    // Consecutive day
    streak.count += 1;
    streak.lastDate = today;
  } else if (!streak.lastDate || streak.lastDate < yStr) {
    // Streak broken or new start
    streak.count = 1;
    streak.lastDate = today;
  }

  saveStreak();
}

function renderStreakUI() {
  const count = streak.count || 0;
  const el = document.getElementById('streakCount');
  const el2 = document.getElementById('sidebarStreak');
  const chip = document.getElementById('streakChip');
  if (el)  el.textContent = count;
  if (el2) el2.textContent = count;
  if (chip) {
    chip.style.display = count > 0 ? 'flex' : 'none';
    if (count >= 7) chip.style.borderColor = 'rgba(255,171,64,0.5)';
  }
}

// ─────────────────────────────────────────────────────────────
// FILTER: Get Transactions for Current Month View
// ─────────────────────────────────────────────────────────────
function getMonthTx() {
  if (!filterMonthKey) return transactions;
  return transactions.filter(t => monthOf(t.date) === filterMonthKey);
}

// ─────────────────────────────────────────────────────────────
// CALCULATIONS
// ─────────────────────────────────────────────────────────────
function calcSummary(txList = getMonthTx()) {
  const income  = txList.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0);
  const expense = txList.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense };
}

function getCategoryTotals(txList) {
  const totals = {};
  txList.filter(t => t.type === 'expense').forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

// ─────────────────────────────────────────────────────────────
// SMART INSIGHTS ENGINE
// ─────────────────────────────────────────────────────────────
function generateInsights() {
  const insights = [];
  const txList = getMonthTx();
  const { income, expense } = calcSummary(txList);
  const catTotals = getCategoryTotals(txList);

  // Budget warnings
  if (monthlyBudget > 0) {
    const pct = (expense / monthlyBudget) * 100;
    if (pct >= 100)
      insights.push({ type: 'danger', icon: '🚨', text: `Budget exceeded! You've spent ${Math.round(pct)}% of your budget.` });
    else if (pct >= 80)
      insights.push({ type: 'warning', icon: '⚠️', text: `Approaching limit! ${Math.round(pct)}% of budget used.` });
  }

  // Top spending category
  if (catTotals.length > 0) {
    const [topCat, topAmt] = catTotals[0];
    const pctOfExpense = expense > 0 ? ((topAmt / expense) * 100) : 0;
    const catMeta = CATEGORIES[topCat] || { emoji: '📦', label: topCat };
    if (pctOfExpense > 35)
      insights.push({ type: 'warning', icon: catMeta.emoji, text: `${catMeta.label} takes ${Math.round(pctOfExpense)}% of your total spending (${fmt(topAmt)}).` });
  }

  // Food overspending
  const foodTotal = txList.filter(t => t.category === 'food' && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  if (foodTotal > 5000)
    insights.push({ type: 'warning', icon: '🍔', text: `High food spend: ${fmt(foodTotal)}. Consider meal prepping to save.` });

  // Savings rate
  if (income > 0) {
    const savingsRate = ((income - expense) / income) * 100;
    if (savingsRate >= 20)
      insights.push({ type: 'success', icon: '🎉', text: `Great! You're saving ${Math.round(savingsRate)}% of income this month.` });
    else if (savingsRate < 0)
      insights.push({ type: 'danger', icon: '📉', text: `Expenses exceed income by ${fmt(expense - income)} this month!` });
    else if (savingsRate < 10)
      insights.push({ type: 'info', icon: '💡', text: `Savings rate is ${Math.round(savingsRate)}%. Aim for at least 20%.` });
  }

  // Compare with previous month
  const now = new Date();
  const prevKey = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  if (prevKey >= '2020-01') {
    const prevTx = transactions.filter(t => monthOf(t.date) === prevKey);
    const prevExp = prevTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    if (prevExp > 0 && expense > prevExp * 1.2)
      insights.push({ type: 'warning', icon: '📊', text: `Expenses up ${Math.round(((expense - prevExp) / prevExp) * 100)}% vs last month.` });
  }

  // Streak achievement
  if (streak.count >= 7)
    insights.push({ type: 'success', icon: '🔥', text: `Amazing! ${streak.count}-day tracking streak. Keep it up!` });

  return insights.slice(0, 5);
}

function renderInsights() {
  const row = document.getElementById('insightsRow');
  if (!row) return;
  const insights = generateInsights();

  if (insights.length === 0) {
    row.innerHTML = `<div class="insight-chip info" style="animation-delay:0s;">
      <span>✨</span> <span>All looks good! Add more transactions for deeper insights.</span>
    </div>`;
    return;
  }

  row.innerHTML = insights.map((ins, i) => `
    <div class="insight-chip ${ins.type}" style="animation-delay:${i * 0.1}s;">
      <span>${ins.icon}</span><span>${ins.text}</span>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────────────────────
// RENDER: SUMMARY CARDS
// ─────────────────────────────────────────────────────────────
function renderSummaryCards() {
  const { income, expense, balance } = calcSummary();

  const balEl = document.getElementById('totalBalance');
  if (balEl) {
    balEl.textContent = fmt(balance);
    balEl.className = 'sc-value' + (balance >= 0 ? ' positive' : ' negative');
  }

  const incEl = document.getElementById('totalIncome');
  if (incEl) incEl.textContent = fmt(income);

  const expEl = document.getElementById('totalExpense');
  if (expEl) expEl.textContent = fmt(expense);

  // Budget
  const bvEl = document.getElementById('budgetValue');
  if (!bvEl) return;

  if (monthlyBudget > 0) {
    const pct = Math.min((expense / monthlyBudget) * 100, 100);
    const rem = monthlyBudget - expense;
    bvEl.textContent = fmt(monthlyBudget);

    const remEl = document.getElementById('budgetRemaining');
    if (remEl) {
      remEl.textContent = fmt(rem);
      remEl.style.color = rem < 0 ? 'var(--accent-red)' : 'var(--accent-green)';
    }

    const fill = document.getElementById('budgetBarFill');
    if (fill) {
      fill.style.width = pct + '%';
      fill.className = 'budget-bar-fill' + (pct >= 100 ? ' danger' : pct >= 80 ? ' warning' : '');
    }

    const pctEl = document.getElementById('budgetPct');
    if (pctEl) pctEl.textContent = Math.round(pct) + '% used';

    // Show notification dot when close to budget
    const dot = document.getElementById('notifDot');
    if (dot) dot.style.display = pct >= 80 ? 'block' : 'none';
  } else {
    bvEl.textContent = 'Not Set';
    const remEl = document.getElementById('budgetRemaining');
    if (remEl) remEl.textContent = '–';
    const pctEl = document.getElementById('budgetPct');
    if (pctEl) pctEl.textContent = '–';
  }
}

// ─────────────────────────────────────────────────────────────
// RENDER: TRANSACTIONS LIST
// ─────────────────────────────────────────────────────────────
function renderTransactions() {
  const listEl = document.getElementById('txList');
  if (!listEl) return;

  let txList = getMonthTx();

  // Apply search filter
  const search = (document.getElementById('txSearch')?.value || '').toLowerCase();
  const typeF  = document.getElementById('txFilter')?.value  || 'all';
  const catF   = document.getElementById('catFilter')?.value || 'all';

  if (search) txList = txList.filter(t => t.desc.toLowerCase().includes(search) || t.category.includes(search));
  if (typeF !== 'all') txList = txList.filter(t => t.type === typeF);
  if (catF  !== 'all') txList = txList.filter(t => t.category === catF);

  // Sort: newest first
  txList.sort((a, b) => new Date(b.date) - new Date(a.date));

  const countEl = document.getElementById('txCountBadge');
  if (countEl) countEl.textContent = `${txList.length} record${txList.length !== 1 ? 's' : ''}`;

  if (txList.length === 0) {
    listEl.innerHTML = `
      <div class="tx-empty">
        <div class="empty-icon">💸</div>
        <p>No transactions found.<br>Add one to get started!</p>
      </div>`;
    return;
  }

  listEl.innerHTML = txList.map(tx => {
    const cat = CATEGORIES[tx.category] || { emoji: '📦', label: tx.category, color: '#8a95b0' };
    return `
    <div class="tx-item" data-id="${tx.id}">
      <div class="tx-cat-icon ${tx.type}" style="color:${cat.color};">${cat.emoji}</div>
      <div class="tx-info">
        <div class="tx-desc">${escHtml(tx.desc)}</div>
        <div class="tx-meta">
          <span>${fmtDate(tx.date)}</span>
          <span class="tx-cat-tag">${cat.emoji} ${cat.label}</span>
        </div>
      </div>
      <div class="tx-amount ${tx.type}">
        ${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount)}
      </div>
      <button class="tx-delete" title="Delete" onclick="deleteTx('${tx.id}')">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>`;
  }).join('');
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ─────────────────────────────────────────────────────────────
// ADD TRANSACTION
// ─────────────────────────────────────────────────────────────
function handleAddTransaction(e) {
  e.preventDefault();
  clearFormErrors();

  const desc   = document.getElementById('txDesc')?.value.trim();
  const amount = parseFloat(document.getElementById('txAmount')?.value);
  const date   = document.getElementById('txDate')?.value;
  const cat    = document.getElementById('txCategory')?.value;

  let valid = true;

  if (!desc || desc.length < 1) { showErr('txDesc', 'txDescErr'); valid = false; }
  if (!amount || amount <= 0 || isNaN(amount)) { showErr('txAmount', 'txAmountErr'); valid = false; }
  if (!cat) { showErr('txCategory', 'txCatErr'); valid = false; }
  if (!valid) return;

  const tx = {
    id:        uid(),
    type:      selectedType,
    desc,
    amount,
    date:      date || todayStr(),
    category:  cat,
    createdAt: new Date().toISOString(),
  };

  transactions.unshift(tx);
  saveTransactions();

  // Update streak since user just added a transaction
  updateStreak();
  renderStreakUI();

  document.getElementById('txForm').reset();
  document.getElementById('txDate').value = todayStr();

  refreshDashboard();
  toast(
    `${selectedType === 'income' ? '💰 Income' : '💸 Expense'} added: ${fmt(amount)}`,
    selectedType === 'income' ? 'success' : 'warning'
  );
}

function showErr(fieldId, errId) {
  const f = document.getElementById(fieldId);
  const e = document.getElementById(errId);
  if (f) f.classList.add('error');
  if (e) e.classList.add('visible');
}

function clearFormErrors() {
  ['txDesc','txAmount','txCategory'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('error');
  });
  ['txDescErr','txAmountErr','txCatErr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  });
}

// ─────────────────────────────────────────────────────────────
// DELETE TRANSACTION
// ─────────────────────────────────────────────────────────────
window.deleteTx = function(id) {
  const idx = transactions.findIndex(t => t.id === id);
  if (idx === -1) return;
  const tx = transactions.splice(idx, 1)[0];
  saveTransactions();
  refreshDashboard();
  toast(`Deleted: ${tx.desc}`, 'error');
};

// ─────────────────────────────────────────────────────────────
// BUDGET
// ─────────────────────────────────────────────────────────────
function handleSetBudget() {
  const val = parseFloat(document.getElementById('budgetInput')?.value);
  if (!val || val <= 0 || isNaN(val)) {
    toast('Please enter a valid budget amount.', 'error');
    return;
  }
  monthlyBudget = val;
  saveBudget();
  const el = document.getElementById('budgetInput');
  if (el) el.value = '';
  refreshDashboard();
  toast(`Budget updated to ${fmt(val)} 🎯`, 'success');
}

// ─────────────────────────────────────────────────────────────
// CHARTS
// ─────────────────────────────────────────────────────────────
const CHART_OPTS = {
  color: '#5d6b88',
  font: { family: 'DM Sans', size: 11 },
  gridColor: 'rgba(255,255,255,0.05)',
};

/** Bar Chart: Income vs Expenses – last 6 months */
function renderBarChart() {
  const canvas = document.getElementById('barChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const labels = [], incData = [], expData = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const txs   = transactions.filter(t => monthOf(t.date) === key);
    labels.push(label);
    incData.push(txs.filter(t => t.type === 'income' ).reduce((s,t) => s+t.amount, 0));
    expData.push(txs.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0));
  }

  if (barChartInst) barChartInst.destroy();

  barChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Income',
          data: incData,
          backgroundColor: 'rgba(0,229,160,0.65)',
          borderColor: '#00e5a0',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Expenses',
          data: expData,
          backgroundColor: 'rgba(255,77,109,0.65)',
          borderColor: '#ff4d6d',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: CHART_OPTS.color, font: CHART_OPTS.font, boxWidth: 12 } },
        tooltip: { callbacks: { label: c => ` ₹${c.raw.toLocaleString('en-IN')}` } }
      },
      scales: {
        x: { ticks: { color: CHART_OPTS.color, font: CHART_OPTS.font }, grid: { color: CHART_OPTS.gridColor } },
        y: {
          ticks: { color: CHART_OPTS.color, font: CHART_OPTS.font, callback: v => '₹'+(v>=1000?v/1000+'k':v) },
          grid: { color: CHART_OPTS.gridColor }
        }
      }
    }
  });
}

/** Pie/Doughnut: Category Breakdown */
function renderPieChart() {
  const canvas = document.getElementById('pieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const entries = getCategoryTotals(getMonthTx());
  const legend  = document.getElementById('pieLegend');

  if (entries.length === 0) {
    if (legend) legend.innerHTML = '<p style="font-size:0.78rem;color:var(--text-muted);text-align:center;width:100%;padding:8px 0;">No expense data.</p>';
    if (pieChartInst) pieChartInst.destroy();
    return;
  }

  const labels = entries.map(e => CATEGORIES[e[0]]?.label || e[0]);
  const data   = entries.map(e => e[1]);
  const colors = entries.map(e => CATEGORIES[e[0]]?.color || '#8a95b0');

  if (pieChartInst) pieChartInst.destroy();

  pieChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.map(c => c + 'bb'), borderColor: colors, borderWidth: 2, hoverOffset: 6 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '66%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.label}: ₹${c.raw.toLocaleString('en-IN')}` } }
      }
    }
  });

  if (legend) {
    legend.innerHTML = entries.map((e, i) => `
      <div class="cl-item">
        <div class="cl-dot" style="background:${colors[i]}"></div>
        <span>${CATEGORIES[e[0]]?.emoji || ''} ${labels[i]}</span>
        <span style="color:var(--text-muted);margin-left:4px;">${fmt(e[1])}</span>
      </div>
    `).join('');
  }
}

/** Line Chart: Monthly Savings Trend */
function renderLineChart() {
  const canvas = document.getElementById('lineChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const labels = [], savData = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const txs   = transactions.filter(t => monthOf(t.date) === key);
    const inc   = txs.filter(t => t.type === 'income' ).reduce((s,t) => s+t.amount, 0);
    const exp   = txs.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0);
    labels.push(label);
    savData.push(inc - exp);
  }

  if (lineChartInst) lineChartInst.destroy();

  lineChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Net Savings',
        data: savData,
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0,212,255,0.07)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#00d4ff',
        pointBorderColor: '#060b17',
        pointRadius: 5,
        pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: CHART_OPTS.color, font: CHART_OPTS.font, boxWidth: 12 } },
        tooltip: { callbacks: { label: c => ` ₹${c.raw.toLocaleString('en-IN')}` } }
      },
      scales: {
        x: { ticks: { color: CHART_OPTS.color, font: CHART_OPTS.font }, grid: { color: CHART_OPTS.gridColor } },
        y: {
          ticks: { color: CHART_OPTS.color, font: CHART_OPTS.font, callback: v => '₹'+(v>=1000?v/1000+'k':v) },
          grid: { color: CHART_OPTS.gridColor }
        }
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────────────────────
function handleSetGoal() {
  const name   = document.getElementById('goalNameInput')?.value.trim();
  const target = parseFloat(document.getElementById('goalAmountInput')?.value);
  const saved  = parseFloat(document.getElementById('goalSavedInput')?.value) || 0;

  if (!name || !target || target <= 0) {
    toast('Please fill in goal name and target amount.', 'error');
    return;
  }

  goals.push({ id: uid(), name, target, saved });
  saveGoals();

  document.getElementById('goalNameInput').value   = '';
  document.getElementById('goalAmountInput').value = '';
  document.getElementById('goalSavedInput').value  = '';

  renderGoals();
  toast(`Goal "${name}" saved! 🎯`, 'success');
}

window.deleteGoal = function(id) {
  goals = goals.filter(g => g.id !== id);
  saveGoals();
  renderGoals();
  toast('Goal removed.', 'warning');
};

window.updateGoalSaved = function(id, delta) {
  const g = goals.find(g => g.id === id);
  if (!g) return;
  g.saved = Math.max(0, Math.min(g.target, g.saved + delta));
  saveGoals();
  renderGoals();
};

function renderGoals() {
  const grid = document.getElementById('goalsGrid');
  if (!grid) return;

  if (goals.length === 0) {
    grid.innerHTML = `
      <div class="goals-empty" style="grid-column:1/-1;">
        <span class="empty-icon">🎯</span>
        <p>No savings goals yet.<br>Set your first goal above!</p>
      </div>`;
    return;
  }

  grid.innerHTML = goals.map(g => {
    const pct     = Math.min(Math.round((g.saved / g.target) * 100), 100);
    const rem     = g.target - g.saved;
    const isDone  = pct >= 100;
    const colors  = ['#00d4ff','#4a8cff','#00e5a0','#ffd166','#a259ff','#ff4d6d'];
    const color   = colors[goals.indexOf(g) % colors.length];

    return `
    <div class="goal-card">
      <button class="goal-delete-btn" onclick="deleteGoal('${g.id}')" title="Delete goal">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="goal-header">
        <div class="goal-name">🎯 ${escHtml(g.name)}</div>
        <span class="goal-pct-badge ${isDone ? 'complete' : 'progress'}">${pct}%</span>
      </div>
      <div class="goal-current" style="color:${color};">${fmt(g.saved)}</div>
      <div class="goal-amounts">
        <span>Saved</span>
        <span>Target: ${fmt(g.target)}</span>
      </div>
      <div class="goal-prog-bar-track">
        <div class="goal-prog-bar-fill" style="width:${pct}%; background:${isDone ? '#00e5a0' : color};"></div>
      </div>
      <div class="goal-remaining">${isDone ? '✅ Goal achieved!' : `${fmt(rem)} remaining`}</div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button onclick="updateGoalSaved('${g.id}', 1000)"
          style="flex:1;padding:7px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.2);border-radius:8px;color:var(--accent-cyan);font-size:0.78rem;font-weight:600;cursor:pointer;">
          +₹1,000
        </button>
        <button onclick="updateGoalSaved('${g.id}', 5000)"
          style="flex:1;padding:7px;background:rgba(0,229,160,0.1);border:1px solid rgba(0,229,160,0.2);border-radius:8px;color:var(--accent-green);font-size:0.78rem;font-weight:600;cursor:pointer;">
          +₹5,000
        </button>
        <button onclick="updateGoalSaved('${g.id}', -1000)"
          style="flex:1;padding:7px;background:rgba(255,77,109,0.08);border:1px solid rgba(255,77,109,0.15);border-radius:8px;color:var(--accent-red);font-size:0.78rem;font-weight:600;cursor:pointer;">
          -₹1,000
        </button>
      </div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────
// MONTHLY REPORTS
// ─────────────────────────────────────────────────────────────
function buildReportMonthSelector() {
  const sel = document.getElementById('reportMonthSel');
  if (!sel) return;
  const today = new Date();
  sel.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const d   = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const lbl = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = lbl;
    if (i === 0) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => renderReport(sel.value));
  renderReport(sel.value);
}

function renderReport(monthKey) {
  const txList = transactions.filter(t => monthOf(t.date) === monthKey);
  const { income, expense, balance } = calcSummary(txList);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('rpIncome',  fmt(income));
  set('rpExpense', fmt(expense));
  set('rpSavings', fmt(balance));
  set('rpCount',   txList.length);

  const savEl = document.getElementById('rpSavings');
  if (savEl) savEl.className = 'rs-value' + (balance >= 0 ? ' positive' : ' negative');

  // Category breakdown table
  const entries = getCategoryTotals(txList);
  const catEl = document.getElementById('reportCategoryBreakdown');
  if (catEl) {
    if (entries.length === 0) {
      catEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">No expenses this month.</div>';
    } else {
      const maxAmt = entries[0][1];
      catEl.innerHTML = entries.map(([cat, amt]) => {
        const meta = CATEGORIES[cat] || { emoji: '📦', label: cat, color: '#8a95b0' };
        const barW = ((amt / maxAmt) * 100).toFixed(1);
        return `
        <div class="cat-row">
          <span class="cat-row-emoji">${meta.emoji}</span>
          <span class="cat-row-name">${meta.label}</span>
          <div class="cat-row-bar">
            <div class="cat-row-bar-fill" style="width:${barW}%; background:${meta.color};"></div>
          </div>
          <span class="cat-row-amount">${fmt(amt)}</span>
        </div>`;
      }).join('');
    }
  }

  // Transaction list for the month
  const rpTxEl = document.getElementById('reportTxList');
  if (rpTxEl) {
    const sorted = [...txList].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sorted.length === 0) {
      rpTxEl.innerHTML = '<div class="tx-empty"><div class="empty-icon">📭</div><p>No transactions this month.</p></div>';
    } else {
      rpTxEl.innerHTML = sorted.map(tx => {
        const cat = CATEGORIES[tx.category] || { emoji: '📦', label: tx.category, color: '#8a95b0' };
        return `
        <div class="tx-item">
          <div class="tx-cat-icon ${tx.type}" style="color:${cat.color};">${cat.emoji}</div>
          <div class="tx-info">
            <div class="tx-desc">${escHtml(tx.desc)}</div>
            <div class="tx-meta"><span>${fmtDate(tx.date)}</span><span class="tx-cat-tag">${cat.label}</span></div>
          </div>
          <div class="tx-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount)}</div>
        </div>`;
      }).join('');
    }
  }
}

// ─────────────────────────────────────────────────────────────
// AI CHATBOT – FinBot
// ─────────────────────────────────────────────────────────────

/**
 * FinBot Response Engine
 * Uses Anthropic Claude API (via fetch) with intelligent rule-based fallback.
 * Provides personalized responses using actual user financial data.
 */

/** Build context string from user's actual data for AI */
function buildFinancialContext() {
  const txList = getMonthTx();
  const { income, expense, balance } = calcSummary(txList);
  const entries = getCategoryTotals(txList);
  const topSpend = entries.length > 0 ? entries[0] : null;
  const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : 0;

  return `User's current financial data:
- Monthly Income: ₹${income.toLocaleString('en-IN')}
- Monthly Expenses: ₹${expense.toLocaleString('en-IN')}
- Net Balance: ₹${balance.toLocaleString('en-IN')}
- Savings Rate: ${savingsRate}%
- Budget: ${monthlyBudget > 0 ? '₹' + monthlyBudget.toLocaleString('en-IN') : 'Not set'}
- Top spending category: ${topSpend ? (CATEGORIES[topSpend[0]]?.label || topSpend[0]) + ' (₹' + topSpend[1].toLocaleString('en-IN') + ')' : 'N/A'}
- Tracking Streak: ${streak.count} days
- Active Goals: ${goals.length}`;
}

/** Smart Rule-Based Fallback Responses */
function getSmartResponse(msg) {
  const m = msg.toLowerCase();
  const { income, expense, balance } = calcSummary(getMonthTx());
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;
  const entries = getCategoryTotals(getMonthTx());

  // Analyze spending patterns
  if (m.includes('analyze') || m.includes('spending') || m.includes('analysis')) {
    const topCats = entries.slice(0, 3);
    const insightText = topCats.map(([cat, amt]) => {
      const meta = CATEGORIES[cat] || { emoji: '📦', label: cat };
      return `• ${meta.emoji} **${meta.label}**: ${fmt(amt)}`;
    }).join('\n');

    return `Here's your spending analysis for this month:

**Income:** ${fmt(income)}
**Expenses:** ${fmt(expense)}
**Savings:** ${fmt(balance)} (${savingsRate}% rate)

**Top spending categories:**
${insightText || '• No expense data yet'}

${savingsRate >= 20 ? '✅ Great job! You\'re saving more than 20% of income.' :
  savingsRate < 0 ? '🚨 Alert: Expenses exceed income! Review immediately.' :
  '💡 Tip: Target 20% savings rate by reducing discretionary spend.'}`;
  }

  // Saving money
  if (m.includes('save money') || m.includes('how to save') || m.includes('saving tips')) {
    return `**Top ways to save more money in India:**

• **50/30/20 Rule** – 50% needs, 30% wants, 20% savings
• **Auto-transfer savings** on salary day before spending
• **Cancel unused subscriptions** (OTT platforms, gym, etc.)
• **Cook at home** – reduces food expenses by 40-60%
• **Use UPI cashback** offers and credit card rewards
• **Buy in bulk** for household staples during sales
• **Avoid EMI traps** – save first, buy later

${income > 0 ? `Based on your income of ${fmt(income)}, saving ${fmt(Math.round(income * 0.2))} per month would give you ₹${Math.round(income * 0.2 * 12).toLocaleString('en-IN')} annually! 🎯` : ''}`;
  }

  // Food expenses
  if (m.includes('food') || m.includes('grocery') || m.includes('zomato') || m.includes('restaurant')) {
    const foodAmt = getMonthTx().filter(t => t.category === 'food' && t.type === 'expense').reduce((s,t) => s + t.amount, 0);
    return `**Tips to reduce food expenses:**

• **Meal prep on Sundays** – cuts weekday takeout costs drastically
• **Limit food delivery** (Zomato/Swiggy) to max 2x/week
• **Use supermarkets** over convenience stores for groceries
• **Plan weekly menus** before shopping to avoid waste
• **Batch cook** staples like dal, rice, sabzi on weekends
• **Explore home brands** for basic groceries

${foodAmt > 0 ? `You've spent ${fmt(foodAmt)} on food this month. Reducing by 30% would save ${fmt(Math.round(foodAmt * 0.3))} monthly.` : 'Track your food expenses to see where you can cut back.'}`;
  }

  // Budget management
  if (m.includes('budget') || m.includes('manage') || m.includes('plan')) {
    return `**Smart budget management strategies:**

• **Zero-based budgeting** – assign every rupee a job
• **Envelope method** – separate cash envelopes per category
• **Weekly check-ins** – review spending every Sunday
• **Set spending limits** per category using MoneyMate
• **Emergency fund first** – aim for 3-6 months expenses
• **Track all transactions** – awareness reduces overspending

${monthlyBudget > 0 
  ? `Your current budget is ${fmt(monthlyBudget)}. You've used ${expense > 0 ? Math.round((expense / monthlyBudget) * 100) : 0}% so far.`
  : '💡 Set a monthly budget in MoneyMate to get spending alerts!'}`;
  }

  // Investment tips
  if (m.includes('invest') || m.includes('mutual fund') || m.includes('stock') || m.includes('sip')) {
    return `**Investment basics for India:**

• **Emergency fund first** – 6 months expenses in liquid funds
• **PPF** – Tax-free, 7.1% guaranteed, 15-year lock-in
• **ELSS Mutual Funds** – Tax saving + market returns (80C)
• **SIP in Index Funds** – Low cost, long-term wealth creation
• **NPS** – Extra ₹50,000 tax deduction under 80CCD(1B)
• **Gold Bonds (SGBs)** – Better than physical gold

**Rule of thumb:** Emergency fund → Insurance → ELSS/SIP → PPF → NPS

⚠️ *This is general guidance. Consult a SEBI-registered advisor for personal advice.*`;
  }

  // Goals
  if (m.includes('goal') || m.includes('target') || m.includes('dream')) {
    return `**Setting and achieving financial goals:**

• **Be specific** – "Save ₹50,000 for laptop" not "save money"
• **Set deadlines** – gives urgency and direction
• **Break it down** – monthly targets from annual goals
• **Automate savings** – set up recurring transfers
• **Celebrate milestones** – 25%, 50%, 75% progress

${goals.length > 0 
  ? `You have ${goals.length} active goal${goals.length > 1 ? 's' : ''}. Visit the Goals section to track progress!`
  : '💡 Add your first savings goal in the Goals section!'}`;
  }

  // Salary / income
  if (m.includes('income') || m.includes('salary') || m.includes('earn more')) {
    return `**Ways to grow your income:**

• **Freelancing** – Offer skills on Upwork, Fiverr, Toptal
• **Part-time remote work** – Content writing, tutoring, design
• **Skill upgradation** – Certifications that increase salary
• **Negotiate salary** – Many miss this – research market rates
• **Passive income** – Dividends, rental income, content creation
• **Side hustles** – Delivery, tutoring, online selling

${income > 0 ? `Your current income is ${fmt(income)}. Even a 20% increase would add ${fmt(Math.round(income * 0.2))} to your monthly budget!` : ''}`;
  }

  // Debt
  if (m.includes('debt') || m.includes('loan') || m.includes('emi') || m.includes('credit card')) {
    return `**Managing debt smartly:**

• **Avalanche method** – Pay off highest interest rate first (saves most money)
• **Snowball method** – Pay off smallest balance first (psychological wins)
• **Never miss EMIs** – Damages credit score significantly
• **Avoid minimum credit card payments** – Interest compounds fast
• **Consolidate debt** – Single loan at lower interest rate
• **Credit score target** – Aim for 750+ CIBIL score

⚠️ *High-interest debt (credit cards at 36-42% p.a.) should be the top priority to eliminate!*`;
  }

  // Hello / greeting
  if (m.includes('hello') || m.includes('hi ') || m === 'hi' || m.includes('hey')) {
    return `Hey there! 👋 I'm **FinBot**, your AI financial assistant.

I can help you with:
• 💰 Saving strategies
• 📊 Spending analysis
• 🎯 Goal planning
• 📈 Investment basics
• 💳 Debt management
• 🧾 Budget tips

What would you like to know about your finances today?`;
  }

  // Default / generic helpful response
  return `I'm here to help with all your financial questions! Here are some popular topics:

• **"How to save money?"** – Saving strategies
• **"Analyze my spending"** – Personalized breakdown
• **"Investment tips"** – Wealth building basics
• **"Budget tips"** – Smarter budgeting
• **"Reduce food expenses"** – Category-specific advice
• **"How to manage debt?"** – Debt elimination strategies

What financial challenge can I help you tackle? 💪`;
}

/** Send message to Claude API */
async function callClaudeAPI(userMsg) {
  const context = buildFinancialContext();

  const systemPrompt = `You are FinBot, an AI-powered personal finance assistant embedded in MoneyMate, a financial tracking app used in India. You provide practical, actionable financial advice tailored to Indian users.

Key guidelines:
- Give concise, practical advice (use bullet points and **bold** for emphasis)
- Use ₹ (Indian Rupees) for amounts
- Reference Indian financial products (PPF, ELSS, NPS, SGB, UPI, etc.)
- Be encouraging but honest
- Keep responses to 150-250 words max
- Format nicely with emojis for readability

${context}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          ...chatHistory.slice(-6), // Keep last 6 messages for context
          { role: 'user', content: userMsg }
        ]
      })
    });

    if (!resp.ok) throw new Error('API error: ' + resp.status);
    const data = await resp.json();
    return data.content?.[0]?.text || getSmartResponse(userMsg);

  } catch (err) {
    console.log('FinBot using smart fallback:', err.message);
    return getSmartResponse(userMsg);
  }
}

/** Render a chat message bubble */
function appendMsg(role, text, isTyping = false) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const isBot = role === 'bot';
  const initials = currentUser?.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || 'U';

  // Parse basic markdown: **bold** and bullet points
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n• /g, '\n<li>')
    .replace(/^• /gm, '<li>')
    .replace(/\n/g, '<br>')
    .replace(/<li>(.*?)(<br>|$)/g, '<li>$1</li>');

  const row = document.createElement('div');
  row.className = `msg-row ${isBot ? 'bot' : 'user'}`;
  row.id = isTyping ? 'typing-row' : '';

  row.innerHTML = `
    <div class="msg-avatar ${isBot ? 'bot-av' : 'user-av'}">${isBot ? '🤖' : initials}</div>
    <div>
      <div class="msg-bubble ${isBot ? 'bot' : 'user'}">
        ${isTyping ? `<div class="typing-indicator"><span></span><span></span><span></span></div>` : formatted}
      </div>
      <div class="msg-time">${timeNow()}</div>
    </div>`;

  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
  return row;
}

/** Handle send message */
async function handleChatSend() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';

  // User bubble
  appendMsg('user', msg);

  // Update history
  chatHistory.push({ role: 'user', content: msg });

  // Typing indicator
  const typingRow = appendMsg('bot', '', true);

  // Disable input
  input.disabled = true;
  const sendBtn = document.getElementById('chatSendBtn');
  if (sendBtn) sendBtn.disabled = true;

  // Get response
  const response = await callClaudeAPI(msg);

  // Remove typing indicator
  if (typingRow) typingRow.remove();

  // Bot response
  appendMsg('bot', response);

  // Update history
  chatHistory.push({ role: 'assistant', content: response });

  // Re-enable
  input.disabled = false;
  if (sendBtn) sendBtn.disabled = false;
  input.focus();
}

/** Initialize chat with welcome message */
function initChat() {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const { income, expense } = calcSummary(getMonthTx());
  const name = currentUser?.name.split(' ')[0] || 'there';

  const welcomeMsg = `Hello ${name}! 👋 I'm **FinBot**, your AI financial assistant.

${income > 0 ? `This month you've earned ${fmt(income)} and spent ${fmt(expense)}.` : 'Start adding transactions to get personalized insights.'}

I can help you with savings strategies, spending analysis, investment advice, and more. What would you like to know?`;

  appendMsg('bot', welcomeMsg);
}

/** Render AI Insights panel */
function renderAIPanel() {
  const listEl = document.getElementById('aiInsightsList');
  const statsEl = document.getElementById('aiQuickStats');

  if (listEl) {
    const insights = generateInsights();
    listEl.innerHTML = insights.map(ins => `
      <div class="ai-insight-item">
        <span class="ii-emoji">${ins.icon}</span>
        <span>${ins.text}</span>
      </div>
    `).join('') || '<div class="ai-insight-item"><span class="ii-emoji">✨</span><span>Add transactions to see insights.</span></div>';
  }

  if (statsEl) {
    const { income, expense, balance } = calcSummary(getMonthTx());
    const rate = income > 0 ? Math.round((balance/income)*100) : 0;
    statsEl.innerHTML = `
      <div class="qs-item"><span class="qs-label">Monthly Income</span><span class="qs-value" style="color:var(--accent-green);">${fmt(income)}</span></div>
      <div class="qs-item"><span class="qs-label">Monthly Expense</span><span class="qs-value" style="color:var(--accent-red);">${fmt(expense)}</span></div>
      <div class="qs-item"><span class="qs-label">Savings Rate</span><span class="qs-value" style="color:var(--accent-cyan);">${rate}%</span></div>
      <div class="qs-item"><span class="qs-label">Active Goals</span><span class="qs-value">${goals.length}</span></div>
      <div class="qs-item"><span class="qs-label">Streak</span><span class="qs-value" style="color:var(--accent-gold);">🔥 ${streak.count} days</span></div>
    `;
  }
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR NAVIGATION
// ─────────────────────────────────────────────────────────────
let currentPage = 'dashboard';
let chatInitialized = false;
let reportInitialized = false;

function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

  // Deactivate nav items
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

  // Show target page
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.remove('hidden');

  // Activate nav item
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  // Update breadcrumb
  const breadcrumbs = { dashboard: 'Dashboard', transactions: 'Transactions', reports: 'Reports', goals: 'Goals', ai: 'AI Assistant' };
  const bc = document.getElementById('breadcrumbText');
  if (bc) bc.textContent = breadcrumbs[page] || 'Dashboard';

  currentPage = page;

  // Page-specific initialization
  if (page === 'transactions') {
    renderTransactions();
  } else if (page === 'reports' && !reportInitialized) {
    buildReportMonthSelector();
    reportInitialized = true;
  } else if (page === 'goals') {
    renderGoals();
  } else if (page === 'ai') {
    renderAIPanel();
    if (!chatInitialized) {
      initChat();
      chatInitialized = true;
    }
  } else if (page === 'dashboard') {
    refreshDashboard();
  }

  // Close mobile sidebar
  document.getElementById('sidebar')?.classList.remove('mobile-open');
}

// ─────────────────────────────────────────────────────────────
// MONTH FILTER (top navbar)
// ─────────────────────────────────────────────────────────────
function buildMonthFilter() {
  const sel = document.getElementById('monthFilter');
  if (!sel) return;
  const today = new Date();
  sel.innerHTML = '<option value="">All Time</option>';

  for (let i = 0; i < 12; i++) {
    const d   = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const lbl = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = lbl;
    if (i === 0) { opt.selected = true; filterMonthKey = key; }
    sel.appendChild(opt);
  }

  sel.addEventListener('change', () => {
    filterMonthKey = sel.value;
    const parts = filterMonthKey ? filterMonthKey.split('-') : null;
    const lbl = parts
      ? new Date(+parts[0], +parts[1]-1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      : 'All Time';
    const labelEl = document.getElementById('currentMonthLabel');
    if (labelEl) labelEl.textContent = lbl;
    refreshDashboard();
  });

  // Set initial label
  const parts = filterMonthKey.split('-');
  const d = new Date(+parts[0], +parts[1]-1, 1);
  const labelEl = document.getElementById('currentMonthLabel');
  if (labelEl) labelEl.textContent = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
// EXPORT CSV
// ─────────────────────────────────────────────────────────────
function exportCSV() {
  const rows = [['Date', 'Description', 'Type', 'Category', 'Amount (INR)']];
  transactions.forEach(t => rows.push([t.date, t.desc, t.type, t.category, t.amount]));
  const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `moneymate_${todayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Data exported as CSV! 📁', 'success');
}

// ─────────────────────────────────────────────────────────────
// PROFILE DROPDOWN
// ─────────────────────────────────────────────────────────────
function initProfileDropdown() {
  const btn = document.getElementById('profileBtn');
  const dd  = document.getElementById('profileDropdown');
  if (!btn || !dd) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dd.style.display !== 'none';
    dd.style.display = isOpen ? 'none' : 'block';
  });

  document.addEventListener('click', () => { if (dd) dd.style.display = 'none'; });
}

// ─────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────
function handleLogout() {
  localStorage.removeItem(SESSION_KEY);
  toast('Signed out. See you soon! 👋', 'success');
  setTimeout(() => { window.location.href = 'index.html'; }, 700);
}

// ─────────────────────────────────────────────────────────────
// TYPE TOGGLE (Income / Expense)
// ─────────────────────────────────────────────────────────────
function initTypeToggle() {
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedType = btn.dataset.type;
      document.getElementById('incomeBtn').className  = 'type-btn' + (selectedType === 'income'  ? ' active-income'  : '');
      document.getElementById('expenseBtn').className = 'type-btn' + (selectedType === 'expense' ? ' active-expense' : '');
    });
  });
}

// ─────────────────────────────────────────────────────────────
// FULL DASHBOARD REFRESH
// ─────────────────────────────────────────────────────────────
function refreshDashboard() {
  renderSummaryCards();
  renderInsights();
  renderTransactions();
  renderBarChart();
  renderPieChart();
  renderLineChart();
}

// ─────────────────────────────────────────────────────────────
// APP INITIALIZATION
// ─────────────────────────────────────────────────────────────
function initApp() {
  // 1. Auth guard
  currentUser = checkSession();
  if (!currentUser) return;

  // 2. Load all data
  loadAll();
  seedDemo();

  // 3. Update streak
  updateStreak();

  // 4. Set user UI elements
  const initials = currentUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setTxt('sidebarAvatar',  initials);
  setTxt('sidebarName',    currentUser.name.split(' ')[0]);
  setTxt('topbarAvatar',   initials);
  setTxt('topbarName',     currentUser.name.split(' ')[0]);
  setTxt('pdAvatar',       initials);
  setTxt('pdName',         currentUser.name);
  setTxt('pdEmail',        currentUser.email);
  setTxt('welcomeName',    currentUser.name.split(' ')[0]);

  renderStreakUI();

  // 5. Set today's date in form
  const txDateEl = document.getElementById('txDate');
  if (txDateEl) txDateEl.value = todayStr();

  // 6. Build UI components
  buildMonthFilter();
  initTypeToggle();
  initProfileDropdown();

  // 7. Sidebar navigation
  document.querySelectorAll('[data-page]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Sidebar toggle (collapse/expand)
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
  });

  // Mobile menu
  document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('mobile-open');
  });

  // 8. Event listeners
  document.getElementById('txForm')?.addEventListener('submit', handleAddTransaction);
  document.getElementById('setBudgetBtn')?.addEventListener('click', handleSetBudget);
  document.getElementById('budgetInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSetBudget(); });
  document.getElementById('setGoalBtn')?.addEventListener('click', handleSetGoal);

  document.getElementById('logoutBtn')?.addEventListener('click', e => { e.preventDefault(); handleLogout(); });
  document.getElementById('pdLogout')?.addEventListener('click', handleLogout);
  document.getElementById('pdExport')?.addEventListener('click', exportCSV);
  document.getElementById('exportNavBtn')?.addEventListener('click', e => { e.preventDefault(); exportCSV(); });
  document.getElementById('exportReportBtn')?.addEventListener('click', exportCSV);

  // Add TX FAB button
  const addFab = document.getElementById('addTxFab');
  const addCard = document.getElementById('addTxCard');
  const closeBtn = document.getElementById('closeAddTx');
  if (addFab && addCard) {
    addFab.addEventListener('click', () => { addCard.style.display = 'block'; addCard.scrollIntoView({ behavior: 'smooth' }); });
  }
  if (closeBtn && addCard) {
    closeBtn.addEventListener('click', () => { addCard.style.display = 'none'; });
  }

  // Filters
  ['txSearch', 'txFilter', 'catFilter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderTransactions);
    document.getElementById(id)?.addEventListener('change', renderTransactions);
  });

  // Notification bell
  document.getElementById('notifBtn')?.addEventListener('click', () => {
    const insights = generateInsights();
    if (insights.length > 0) {
      toast(insights[0].text, insights[0].type === 'danger' ? 'error' : insights[0].type === 'success' ? 'success' : 'warning');
    } else {
      toast('All good! No alerts right now. ✅', 'success');
    }
  });

  // AI Chatbot
  document.getElementById('chatSendBtn')?.addEventListener('click', handleChatSend);
  document.getElementById('chatInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) handleChatSend();
  });

  // Chat suggestions
  document.querySelectorAll('.chat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('chatInput');
      if (input) {
        input.value = chip.dataset.msg;
        handleChatSend();
      }
    });
  });

  // Clear chat
  document.getElementById('chatClearBtn')?.addEventListener('click', () => {
    const container = document.getElementById('chatMessages');
    if (container) { container.innerHTML = ''; chatHistory = []; chatInitialized = false; initChat(); chatInitialized = true; }
  });

  // 9. Initial render
  refreshDashboard();

  // 10. Show app, hide loader
  setTimeout(() => {
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('appShell').style.display = 'flex';
  }, 900);
}

// Bootstrap
window.addEventListener('DOMContentLoaded', initApp);