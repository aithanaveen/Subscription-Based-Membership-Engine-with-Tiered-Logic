// ============================================================
// CINEMANIA – MAIN APP  (Tiered Access Engine v3)
// ============================================================

// ── Plan hierarchy ──────────────────────────────────────────
const PLAN_LEVELS = { free: 0, basic: 1, standard: 2, premium: 3 };

const PLAN_META = {
  free:     { icon: '🆓', label: 'FREE',     color: '#9090a8', bg: 'rgba(144,144,168,.15)' },
  basic:    { icon: '📺', label: 'BASIC',    color: '#38bdf8', bg: 'rgba(56,189,248,.15)'  },
  standard: { icon: '⭐', label: 'STANDARD', color: '#f5c518', bg: 'rgba(245,197,24,.15)'  },
  premium:  { icon: '👑', label: 'PREMIUM',  color: '#a78bfa', bg: 'rgba(167,139,250,.15)' },
};

// ── Helpers ─────────────────────────────────────────────────
function getUserPlanLevel() {
  const sub = api.subscription();
  if (!sub) return 0;
  const name = (sub.plan_name || sub.name || 'free').toLowerCase();
  return PLAN_LEVELS[name] ?? 0;
}
function getUserPlanName() {
  const sub = api.subscription();
  return (sub?.plan_name || sub?.name || 'free').toLowerCase();
}
function canAccess(requiredPlan) {
  const rp = (requiredPlan || 'basic').toLowerCase();
  if (rp === 'free') return true;
  if (!api.isLoggedIn()) return false;
  return getUserPlanLevel() >= (PLAN_LEVELS[rp] ?? 1);
}
function esc(s) {
  return String(s||'').replace(/[&<>"']/g, m =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  const c = document.getElementById('toast-container');
  if (!c) return;
  c.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0'; el.style.transform = 'translateX(120%)';
    setTimeout(() => el.remove(), 320);
  }, 3200);
}
window.toast = toast;

// ── Navbar ───────────────────────────────────────────────────
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (nav) window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 50));
  updateNavUI();
}

function updateNavUI() {
  const logged = api.isLoggedIn();
  const user   = api.user();
  document.querySelectorAll('[data-auth="logged-in"]').forEach(el  => el.classList.toggle('hidden', !logged));
  document.querySelectorAll('[data-auth="logged-out"]').forEach(el => el.classList.toggle('hidden',  logged));

  if (logged && user) {
    document.querySelectorAll('.user-name-display').forEach(el => el.textContent = user.name);
    document.querySelectorAll('.user-avatar-init').forEach(el  => el.textContent = user.name[0].toUpperCase());

    // Navbar plan badge
    const planName = getUserPlanName();
    const pm = PLAN_META[planName] || PLAN_META.free;
    const badge = document.getElementById('nav-plan-badge');
    if (badge) {
      badge.textContent = `${pm.icon} ${pm.label}`;
      badge.style.cssText = `background:${pm.bg};color:${pm.color};padding:.2rem .7rem;border-radius:20px;font-size:.68rem;font-weight:800;border:1px solid ${pm.color}44;letter-spacing:.8px`;
      badge.style.display = 'inline-block';
      badge.onclick = () => openPlansModal();
    }

    // Dropdown plan info
    const sub = api.subscription();
    const di  = document.getElementById('dropdown-plan-info');
    if (di) {
      if (sub && sub.status === 'active') {
        const end = new Date(sub.end_date).toLocaleDateString('en-IN');
        di.innerHTML = `${pm.icon} <strong style="color:${pm.color}">${sub.plan_name}</strong><br><span style="font-size:.72rem;color:var(--text3)">Expires ${end}</span>`;
      } else {
        di.innerHTML = `🆓 <strong>Free</strong> &nbsp;<a onclick="openPlansModal()" style="color:var(--red2);cursor:pointer;font-size:.75rem;text-decoration:underline">Upgrade →</a>`;
      }
    }

    // Admin link
    const al = document.getElementById('admin-link');
    if (al && user.role === 'admin') al.classList.remove('hidden');
  }
}

// ── Modals ───────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open');    }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
window.openModal  = openModal;
window.closeModal = closeModal;
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

// ── Auth forms ───────────────────────────────────────────────
function initAuthForms() {
  const lf = document.getElementById('login-form');
  if (lf) lf.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = lf.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      const data = await api.post('/auth/login', {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      });
      await api.refreshSession(data.token, data.user);
      toast(`Welcome back, ${data.user.name}! 🎬`, 'success');
      closeModal('auth-modal'); updateNavUI();
      setTimeout(() => window.location.reload(), 600);
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Sign In'; }
  });

  const rf = document.getElementById('register-form');
  if (rf) rf.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = rf.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Creating account…';
    try {
      const data = await api.post('/auth/register', {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value
      });
      await api.refreshSession(data.token, data.user);
      toast('Welcome to Cinemania! 🎬', 'success');
      closeModal('auth-modal'); updateNavUI();
      setTimeout(() => openPlansModal('welcome'), 800);
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Create Account'; }
  });
}

function openAuthModal(tab = 'login') {
  const m = document.getElementById('auth-modal'); if (!m) return;
  m.querySelectorAll('.tab[data-tab]').forEach(t   => t.classList.toggle('active', t.dataset.tab === tab));
  m.querySelectorAll('[data-tab-content]').forEach(c => c.classList.toggle('hidden', c.dataset.tabContent !== tab));
  openModal('auth-modal');
}
window.openAuthModal = openAuthModal;

// ── Content card factory ─────────────────────────────────────
function makeCard(item) {
  const required  = (item.required_plan || 'basic').toLowerCase();
  const hasAccess = item.has_access !== undefined ? item.has_access : canAccess(required);
  const isLocked  = !hasAccess && required !== 'free';
  const pm        = PLAN_META[required] || PLAN_META.basic;
  const thumb     = item.thumbnail || item.thumbnail_url || `https://picsum.photos/seed/${item.id}/400/600`;
  const clickFn   = isLocked
    ? `openUpgradeModal('${required}', '${esc(item.title)}')`
    : `openDetail(${item.id})`;

  const statusBadge = item.is_new
    ? '<span class="card-status-badge badge-new">NEW</span>'
    : item.is_trending ? '<span class="card-status-badge badge-trending">🔥</span>' : '';

  const planBadge = required !== 'basic'
    ? `<span class="card-plan-badge" style="background:${pm.bg};color:${pm.color}">${pm.icon} ${pm.label}</span>`
    : '';

  const lockOverlay = isLocked ? `
    <div class="card-lock-overlay">
      <div class="lock-icon">🔒</div>
      <div class="lock-plan" style="color:${pm.color}">${pm.label}</div>
      <div class="lock-cta">Tap to Upgrade</div>
    </div>` : '';

  const hoverContent = isLocked
    ? `<div class="card-upgrade-btn" style="color:${pm.color}">🔒 ${pm.label} Required</div>`
    : '<div class="card-play">▶</div>';

  return `
    <div class="content-card${isLocked ? ' locked' : ''}" onclick="${clickFn}">
      <img src="${thumb}" alt="${esc(item.title)}" loading="lazy"
           onerror="this.src='https://picsum.photos/seed/${item.id}x/400/600'">
      ${statusBadge}${planBadge}${lockOverlay}
      <div class="card-overlay">
        ${hoverContent}
        <div class="card-title">${esc(item.title)}</div>
        <div class="card-meta">
          <span>${item.release_year || ''}</span>
          <span>${item.type}</span>
          ${item.rating ? `<span>⭐ ${item.rating}</span>` : ''}
        </div>
      </div>
    </div>`;
}
window.makeCard = makeCard;

// ── Content detail modal ─────────────────────────────────────
async function openDetail(id) {
  const modal = document.getElementById('detail-modal');
  if (!modal) return;

  // Remove any leftover lock overlay
  modal.querySelector('.detail-locked-overlay')?.remove();

  try {
    const item     = await api.get(`/content/${id}`);
    const required = (item.required_plan || 'basic').toLowerCase();
    const hasAccess = item.has_access !== undefined ? item.has_access : canAccess(required);
    const isLocked  = !hasAccess && required !== 'free';
    const pm        = PLAN_META[required] || PLAN_META.basic;

    // Banner
    const bannerEl = modal.querySelector('.detail-banner');
    if (bannerEl) {
      bannerEl.src = item.banner_url || item.thumbnail || item.thumbnail_url || `https://picsum.photos/seed/${id}b/1280/720`;
      bannerEl.onerror = () => { bannerEl.src = `https://picsum.photos/seed/${id}b/1280/720`; };
      bannerEl.style.filter = isLocked ? 'blur(5px) brightness(0.25)' : 'none';
    }

    // Meta text
    modal.querySelector('.detail-title').textContent = item.title;
    modal.querySelector('.detail-desc').textContent  = item.description || '';
    modal.querySelector('.detail-meta').innerHTML = `
      <span class="detail-tag">${item.type}</span>
      <span class="detail-tag">${item.release_year || 'N/A'}</span>
      <span class="detail-tag">${item.language || 'English'}</span>
      ${item.rating       ? `<span class="detail-tag">⭐ ${item.rating}</span>`         : ''}
      ${item.duration_mins ? `<span class="detail-tag">${item.duration_mins} min</span>` : ''}
      <span class="detail-tag" style="background:${pm.bg};color:${pm.color};border:1px solid ${pm.color}33">
        ${pm.icon} ${pm.label}
      </span>`;

    // Action buttons
    const watchBtn     = modal.querySelector('.watch-btn');
    const watchlistBtn = modal.querySelector('.watchlist-btn');

    if (isLocked) {
      // Inject the full locked overlay inside the modal
      const lockedOverlay = document.createElement('div');
      lockedOverlay.className = 'detail-locked-overlay';
      lockedOverlay.innerHTML = `
        <div class="detail-locked-icon">🔒</div>
        <h3 class="detail-locked-title" style="color:${pm.color}">${pm.label} CONTENT</h3>
        <p class="detail-locked-desc">
          <strong style="color:${pm.color}">"${esc(item.title)}"</strong> requires a
          <strong style="color:${pm.color}">${pm.label}</strong> subscription or higher.<br><br>
          Your current plan: <strong>${PLAN_META[getUserPlanName()]?.icon} ${getUserPlanName().toUpperCase()}</strong>
        </p>
        <div class="detail-locked-actions">
          <button class="btn btn-primary"
            style="background:linear-gradient(135deg,${pm.color},${pm.color}99)"
            onclick="closeModal('detail-modal');openUpgradeModal('${required}','${esc(item.title)}')">
            👑 Upgrade to ${pm.label}
          </button>
          <button class="btn btn-outline btn-sm" onclick="closeModal('detail-modal')">
            Go Back
          </button>
        </div>`;
      modal.querySelector('.detail-modal').appendChild(lockedOverlay);

      if (watchBtn) {
        watchBtn.textContent = `🔒 ${pm.label} Required`;
        watchBtn.style.cssText = `background:transparent;border:1.5px solid ${pm.color};color:${pm.color}`;
        watchBtn.onclick = () => { closeModal('detail-modal'); openUpgradeModal(required, item.title); };
      }
    } else {
      if (watchBtn) {
        watchBtn.textContent = '▶ Watch Now';
        watchBtn.style.cssText = '';
        watchBtn.onclick = () => handleWatch(item);
      }
    }

    if (watchlistBtn) {
      watchlistBtn.onclick = () => handleWatchlist(item.id, item.title);
    }

    openModal('detail-modal');
  } catch (err) {
    toast('Failed to load content', 'error');
  }
}
window.openDetail = openDetail;

function handleWatch(item) {
  if (!api.isLoggedIn()) { openAuthModal(); return; }
  toast(`▶ Now playing: ${item.title} 🎬`, 'success');
  api.post(`/content/${item.id}/watch`, {}).catch(() => {});
  closeModal('detail-modal');
}

async function handleWatchlist(id, title) {
  if (!api.isLoggedIn()) { openAuthModal(); return; }
  try {
    await api.post(`/content/${id}/watchlist`, {});
    toast(`Added "${title}" to your list ✓`, 'success');
  } catch (err) {
    if (err.message?.includes('Duplicate')) toast('Already in your list', 'info');
    else toast(err.message || 'Error', 'error');
  }
}

// ── UPGRADE MODAL (the "you need to upgrade" dialog) ─────────
async function openUpgradeModal(requiredPlan = 'standard', contentTitle = null) {
  if (!api.isLoggedIn()) { openAuthModal(); return; }

  const modal = document.getElementById('upgrade-modal');
  if (!modal) { openPlansModal(); return; }

  const pm          = PLAN_META[requiredPlan] || PLAN_META.standard;
  const currentPlan = getUserPlanName();
  const cpm         = PLAN_META[currentPlan] || PLAN_META.free;

  modal.querySelector('.upgrade-modal-icon').textContent  = pm.icon;
  modal.querySelector('.upgrade-modal-title').innerHTML   = contentTitle
    ? `<span style="color:${pm.color}">"${esc(contentTitle)}"</span> is ${pm.label} Content`
    : `${pm.label} Plan Required`;
  modal.querySelector('.upgrade-modal-desc').innerHTML    = `
    Your current plan: <strong style="color:${cpm.color}">${cpm.icon} ${currentPlan.toUpperCase()}</strong>
    &nbsp;→&nbsp;
    Upgrade to <strong style="color:${pm.color}">${pm.icon} ${pm.label}</strong> or higher to unlock this content.`;

  openModal('upgrade-modal');
  await _renderUpgradePlans(requiredPlan);
}
window.openUpgradeModal = openUpgradeModal;

async function _renderUpgradePlans(highlightPlan) {
  const grid = document.getElementById('upgrade-plans-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    const raw   = await api.get('/subscriptions/plans');
    const plans = Array.isArray(raw) ? raw : (raw.data || []);
    const hLevel = PLAN_LEVELS[highlightPlan] || 1;
    const curr   = getUserPlanName();

    grid.innerHTML = plans.map(p => {
      const pn   = p.name.toLowerCase();
      const pm2  = PLAN_META[pn] || PLAN_META.basic;
      const pLvl = PLAN_LEVELS[pn] || 1;
      const isCurr    = pn === curr;
      const isHighlight = pn === highlightPlan;
      const meetsReq  = pLvl >= hLevel;

      return `
        <div class="upc-card${isHighlight ? ' upc-highlighted' : ''}${!meetsReq ? ' upc-dimmed' : ''}">
          ${isHighlight ? '<div class="upc-rec-badge">⭐ RECOMMENDED</div>' : ''}
          ${isCurr ? '<div class="upc-curr-badge">Current</div>' : ''}
          <div class="upc-icon">${pm2.icon}</div>
          <div class="upc-name" style="color:${pm2.color}">${p.name}</div>
          <div class="upc-price">₹${p.price}<span>/mo</span></div>
          <ul class="upc-feats">
            <li>✓ ${p.video_quality || p.quality || 'HD'}</li>
            <li>✓ ${p.max_screens || 1} Screen(s)</li>
            <li>${(p.downloads || p.downloads_allowed) ? '✓' : '✗'} Downloads</li>
          </ul>
          ${isCurr
            ? `<button class="btn btn-secondary full-width btn-sm" disabled>✓ Current</button>`
            : meetsReq
              ? `<button class="btn btn-primary full-width btn-sm"
                   style="background:linear-gradient(135deg,${pm2.color},${pm2.color}88)"
                   onclick="subscribePlan(${p.id},'${p.name}',${p.price},true)">
                   Upgrade Now
                 </button>`
              : `<button class="btn full-width btn-sm" style="opacity:.35;cursor:default;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--text3)" disabled>Too Low</button>`}
        </div>`;
    }).join('');
  } catch {
    grid.innerHTML = '<p style="color:var(--text3);text-align:center;padding:2rem">Failed to load plans</p>';
  }
}

// ── Plans modal ───────────────────────────────────────────────
async function openPlansModal(mode = '') {
  if (!api.isLoggedIn()) { openAuthModal(); return; }
  const modal = document.getElementById('plans-modal');
  if (!modal) { window.location.href = 'pages/subscription.html'; return; }
  const t = modal.querySelector('.plans-modal-title');
  if (t && mode === 'welcome') t.textContent = 'START YOUR JOURNEY';
  openModal('plans-modal');
  await loadPlans();
}
window.openPlansModal = openPlansModal;

async function loadPlans() {
  const grid = document.getElementById('plans-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-center"><div class="spinner"></div></div>';
  try {
    const raw   = await api.get('/subscriptions/plans');
    const plans = Array.isArray(raw) ? raw : (raw.data || []);
    const curr  = getUserPlanName();

    grid.innerHTML = plans.map((p, i) => {
      const pn  = p.name.toLowerCase();
      const pm2 = PLAN_META[pn] || PLAN_META.basic;
      const isCurr = pn === curr;
      const isPopular = i === 2;

      return `
        <div class="plan-card${isPopular ? ' popular' : ''}${isCurr ? ' current-plan' : ''}">
          ${isCurr
            ? '<div class="plan-popular-badge" style="background:linear-gradient(135deg,#22c55e,#15803d)">✓ YOUR PLAN</div>'
            : isPopular ? '<div class="plan-popular-badge">⭐ MOST POPULAR</div>' : ''}
          <div class="plan-icon">${pm2.icon}</div>
          <div class="plan-name" style="color:${pm2.color}">${p.name}</div>
          <div class="plan-price"><sup>₹</sup>${p.price}<span>/mo</span></div>
          <div class="plan-period">${p.duration_days} days</div>
          <ul class="plan-features">
            <li><span class="check">✓</span> ${p.video_quality || 'HD'} Quality</li>
            <li><span class="check">✓</span> ${p.max_screens || 1} Screen(s)</li>
            <li>${(p.downloads || p.downloads_allowed) ? '<span class="check">✓</span>' : '<span class="cross">✗</span>'} Downloads</li>
            <li>${(p.offline_viewing || p.downloads)   ? '<span class="check">✓</span>' : '<span class="cross">✗</span>'} Offline</li>
          </ul>
          <button class="btn full-width btn-sm ${isCurr ? 'btn-secondary' : 'btn-primary'}"
            style="${!isCurr ? `background:linear-gradient(135deg,${pm2.color},${pm2.color}88)` : ''}"
            onclick="subscribePlan(${p.id},'${p.name}',${p.price})" ${isCurr ? 'disabled' : ''}>
            ${isCurr ? '✓ Current Plan' : p.price == 0 ? 'Get Free' : `Upgrade — ₹${p.price}/mo`}
          </button>
        </div>`;
    }).join('');
  } catch {
    grid.innerHTML = '<p style="color:var(--text3);text-align:center;padding:2rem">Failed to load plans</p>';
  }
}

async function subscribePlan(planId, planName, price, fromUpgrade = false) {
  if (!api.isLoggedIn()) { openAuthModal(); return; }
  const ok = confirm(`Upgrade to ${planName} plan for ₹${price}/month?\nYour previous subscription will be replaced.`);
  if (!ok) return;
  try {
    const res = await api.post('/subscriptions/subscribe', {
      plan_id: planId, payment_method: 'card', transaction_id: `TXN_${Date.now()}`
    });
    toast(res.message || `Subscribed to ${planName}! 🎉`, 'success');
    await api.fetchAndStoreSubscription();
    updateNavUI();
    closeModal('upgrade-modal'); closeModal('plans-modal');
    setTimeout(() => window.location.reload(), 1000);
  } catch (err) {
    toast(err.message || 'Subscription failed', 'error');
  }
}
window.subscribePlan = subscribePlan;

// ── Search ───────────────────────────────────────────────────
let _st;
function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', () => {
    clearTimeout(_st);
    const q   = input.value.trim();
    const ph  = document.getElementById('search-placeholder');
    const res = document.getElementById('search-results');
    if (q.length < 2) {
      if (res) res.classList.add('hidden');
      if (ph)  ph.classList.remove('hidden');
      return;
    }
    if (ph) ph.classList.add('hidden');
    _st = setTimeout(async () => {
      try {
        const data = await api.get(`/content?search=${encodeURIComponent(q)}&limit=20`);
        const items = Array.isArray(data) ? data : (data.data || []);
        if (res) {
          res.innerHTML = items.length
            ? items.map(makeCard).join('')
            : '<p style="color:var(--text3);padding:2rem;text-align:center;grid-column:1/-1">No results</p>';
          res.classList.remove('hidden');
        }
      } catch {}
    }, 350);
  });
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initAuthForms();
  initSearch();

  // Tab switching
  document.querySelectorAll('.tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.dataset.tab;
      const scope = tab.closest('.modal') || tab.closest('.tabs-wrapper');
      if (!scope) return;
      scope.querySelectorAll('.tab[data-tab]').forEach(x  => x.classList.toggle('active',           x.dataset.tab === t));
      scope.querySelectorAll('[data-tab-content]').forEach(c => c.classList.toggle('hidden', c.dataset.tabContent !== t));
    });
  });
});
