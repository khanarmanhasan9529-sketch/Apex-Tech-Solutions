/* ============ Apex IT Tech Solutions - Internship Finder ============
   Pure HTML + CSS + JS. All data is stored in the browser's localStorage.
   Default admin  ->  admin@apex.com  /  admin123
=================================================================== */
(() => {
'use strict';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = { users: 'apex_users', jobs: 'apex_internships', apps: 'apex_applications', msgs: 'apex_messages', session: 'apex_session', theme: 'apex_theme' };
const db = {
  get(k, d = []) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('Storage full or blocked!', 'err'); } }
};
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash = s => btoa(unescape(encodeURIComponent('apex::' + s))); // demo-only obfuscation
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const daysLeft = d => { const n = Math.ceil((new Date(d) - new Date()) / 864e5); return n < 0 ? 'Deadline over' : n === 0 ? 'Last day!' : n + ' days left'; };

const CATS = ['Web Development', 'Python', 'Data Science', 'UI/UX Design', 'Digital Marketing', 'Android', 'Cyber Security', 'Full Stack (MERN)', 'AI / ML', 'Cloud & DevOps'];
const EMO = { 'Web Development': '🌐', 'Python': '🐍', 'Data Science': '📊', 'UI/UX Design': '🎨', 'Digital Marketing': '📣', 'Android': '📱', 'Cyber Security': '🛡️', 'Full Stack (MERN)': '⚛️', 'AI / ML': '🤖', 'Cloud & DevOps': '☁️' };
const MODES = ['Remote', 'Onsite', 'Hybrid'];
const STATUSES = ['Pending', 'Shortlisted', 'Selected', 'Rejected'];

/* ---------- data access ---------- */
const users = () => db.get(KEY.users), jobs = () => db.get(KEY.jobs), apps = () => db.get(KEY.apps), msgs = () => db.get(KEY.msgs);
const me = () => { const s = db.get(KEY.session, null); return s ? users().find(u => u.id === s.id) || null : null; };
const jobById = id => jobs().find(j => j.id === id);
const userById = id => users().find(u => u.id === id);

function seed() {
  if (!localStorage.getItem(KEY.users)) {
    db.set(KEY.users, [{ id: 'u_admin', name: 'Apex Admin', email: 'admin@apex.com', pass: hash('admin123'), role: 'admin', createdAt: new Date().toISOString() }]);
  }
  if (!localStorage.getItem(KEY.jobs)) {
    const mk = (title, category, mode, duration, stipend, seats, location, dl, skills, description, featured) => ({
      id: uid('j_'), title, category, mode, duration, stipend, seats, location, deadline: addDays(dl), skills, description, status: 'Open', featured: !!featured, createdAt: new Date().toISOString()
    });
    db.set(KEY.jobs, [
      mk('Frontend Developer Intern', 'Web Development', 'Hybrid', '3 Months', '8,000/mo', 10, 'Pune', 25, 'HTML, CSS, JavaScript, React', 'Build responsive and animated user interfaces for live client projects. Work with senior developers, learn Git workflows and ship real features to production.', true),
      mk('Python Developer Intern', 'Python', 'Remote', '2 Months', '6,000/mo', 8, 'Remote', 18, 'Python, Flask, SQL', 'Automate business tasks, build REST APIs and work with databases. Great start for students who love problem solving and backend logic.', true),
      mk('Data Analyst Intern', 'Data Science', 'Onsite', '3 Months', '10,000/mo', 5, 'Mumbai', 30, 'Excel, SQL, Power BI, Python', 'Clean, analyse and visualise business data. Create dashboards and insights reports that help our teams take smarter decisions.', false),
      mk('UI/UX Design Intern', 'UI/UX Design', 'Remote', '2 Months', '7,000/mo', 6, 'Remote', 22, 'Figma, Wireframing, Prototyping', 'Design modern mobile and web interfaces, run usability tests and create design systems under the guidance of our lead designer.', false),
      mk('MERN Stack Intern', 'Full Stack (MERN)', 'Hybrid', '4 Months', '12,000/mo', 7, 'Pune', 35, 'MongoDB, Express, React, Node.js', 'Develop full stack web apps with authentication, dashboards and REST APIs. Includes mentorship and a live project certificate.', true),
      mk('Digital Marketing Intern', 'Digital Marketing', 'Remote', '1 Month', '4,000/mo', 12, 'Remote', 14, 'SEO, Social Media, Canva', 'Plan social media campaigns, write content, track analytics and help grow our brand online.', false),
      mk('Android App Intern', 'Android', 'Onsite', '3 Months', '9,000/mo', 4, 'Ahilyanagar', 28, 'Java, Kotlin, Firebase', 'Create and maintain Android apps, integrate Firebase and publish builds. Hands-on exposure to the complete app lifecycle.', false),
      mk('Cyber Security Intern', 'Cyber Security', 'Remote', '2 Months', '8,000/mo', 5, 'Remote', 20, 'Networking, Linux, Burp Suite', 'Learn vulnerability assessment, secure coding and incident basics through guided labs and real-world scenarios.', false)
    ]);
  }
  if (!localStorage.getItem(KEY.apps)) db.set(KEY.apps, []);
  if (!localStorage.getItem(KEY.msgs)) db.set(KEY.msgs, []);
}

/* ---------- state / routing ---------- */
const state = { q: '', cat: '', mode: '', sort: 'new', authMode: 'login', dashTab: 'overview', adminTab: 'dashboard', appFilter: '' };
const app = $('#app');
let timers = [];
const route = () => (location.hash.replace('#/', '') || 'home').split('?')[0];
const go = v => { if (route() === v && location.hash) render(); else location.hash = '#/' + v; };

function render() {
  timers.forEach(clearInterval); timers = [];
  closeModal();
  let r = route(); const u = me();
  if (r === 'dashboard' && (!u || u.role !== 'student')) { r = 'auth'; if (!u) toast('Please login first', 'err'); else r = 'admin'; }
  if (r === 'admin' && (!u || u.role !== 'admin')) { toast('Admin access only', 'err'); r = 'auth'; }
  const views = { home: vHome, internships: vInternships, about: vAbout, contact: vContact, auth: vAuth, dashboard: vDashboard, admin: vAdmin };
  app.innerHTML = (views[r] || vHome)();
  app.style.animation = 'none'; void app.offsetWidth; app.style.animation = '';
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  updateNav(r); observe();
  if (r === 'home') startTyped();
}

/* ---------- nav / theme ---------- */
function updateNav(r = route()) {
  const u = me();
  let html;
  if (!u) html = `<button class="btn btn-ghost btn-sm" data-act="authMode" data-mode="login">Login</button><button class="btn btn-primary btn-sm" data-act="authMode" data-mode="signup">Sign Up</button>`;
  else html = `<button class="btn btn-ghost btn-sm" data-act="nav" data-go="${u.role === 'admin' ? 'admin' : 'dashboard'}">${u.role === 'admin' ? '⚙️ Admin Panel' : '👤 ' + esc(u.name.split(' ')[0])}</button><button class="btn btn-danger btn-sm" data-act="logout">Logout</button>`;
  $('#authArea').innerHTML = html; $('#authAreaMobile').innerHTML = html;
  $$('.nav-links a[data-link]').forEach(a => a.classList.toggle('active', a.dataset.link === r));
  $('#navLinks').classList.remove('open'); $('.burger').classList.remove('open');
}
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem(KEY.theme, t); } catch {} }
function initTheme() {
  let t = null; try { t = localStorage.getItem(KEY.theme); } catch {}
  if (!t) t = window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(t);
}

/* ---------- toast / modal ---------- */
function toast(msg, type = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + (type === 'err' ? 'err' : ''); t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3700);
}
function openModal(html, cls = '') {
  const m = $('#modal'); m.innerHTML = `<div class="dialog ${cls}"><button class="x" data-act="close" aria-label="Close">✕</button>${html}</div>`;
  m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); document.body.classList.add('lock');
}
function closeModal() { const m = $('#modal'); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); document.body.classList.remove('lock'); }
let pending = null;
function confirmBox(msg, fn) {
  pending = fn;
  openModal(`<div style="font-size:3rem">⚠️</div><h2>Are you sure?</h2><p class="muted" style="margin-top:8px">${msg}</p><div class="btns"><button class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-danger" data-act="confirmYes">Yes, continue</button></div>`, 'sm');
}

/* ---------- scroll reveal / counters / ripple ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('show');
  if (e.target.classList.contains('count')) countUp(e.target);
  io.unobserve(e.target);
}), { threshold: .12 });
function observe() { $$('.reveal:not(.show),.count:not(.done)').forEach(el => io.observe(el)); }
function countUp(el) {
  el.classList.add('done'); const to = +el.dataset.to || 0, suf = el.dataset.suf || ''; let n = 0; const step = Math.max(1, Math.ceil(to / 50));
  const iv = setInterval(() => { n = Math.min(to, n + step); el.textContent = n + suf; if (n >= to) clearInterval(iv); }, 28);
}
function startTyped() {
  const el = $('#typed'); if (!el) return; const w = ['Internship', 'Dream Role', 'Career Start', 'Tech Future']; let i = 0;
  timers.push(setInterval(() => { el.classList.add('out'); setTimeout(() => { i = (i + 1) % w.length; el.textContent = w[i]; el.classList.remove('out'); }, 320); }, 2600));
}

/* ---------- templates: shared ---------- */
const sec = (eyebrow, title, sub) => `<div class="sec-head reveal"><span class="eyebrow">${eyebrow}</span><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}</div>`;
const empty = (emo, msg) => `<div class="empty"><span class="emo">${emo}</span>${msg}</div>`;

function card(j, i = 0) {
  const u = me(); const applied = u && apps().some(a => a.jobId === j.id && a.userId === u.id); const saved = u && (u.saved || []).includes(j.id);
  return `<article class="card job reveal" style="--d:${(i % 6) * 70}ms">
    ${j.featured ? '<span class="ribbon">★ Featured</span>' : ''}
    <div class="job-top"><div class="job-ic">${EMO[j.category] || '💼'}</div><button class="heart ${saved ? 'on' : ''}" data-act="save" data-id="${j.id}" title="Save internship">♥</button></div>
    <h3>${esc(j.title)}</h3><p class="muted small">${esc(j.category)} • ${esc(j.location)}</p>
    <div class="tags"><span class="tag">${esc(j.mode)}</span><span class="tag">⏱ ${esc(j.duration)}</span><span class="tag">₹ ${esc(j.stipend)}</span></div>
    <p class="desc">${esc(j.description.length > 100 ? j.description.slice(0, 100) + '…' : j.description)}</p>
    <div class="job-foot"><span class="badge b-${j.status}">${j.status}</span><span class="small muted">${j.status === 'Open' ? daysLeft(j.deadline) : 'Not accepting'}</span></div>
    <div class="job-actions"><button class="btn btn-ghost btn-sm" data-act="view" data-id="${j.id}">Details</button><button class="btn btn-primary btn-sm" data-act="apply" data-id="${j.id}" ${j.status !== 'Open' ? 'disabled' : ''}>${applied ? 'Applied ✓' : 'Apply Now'}</button></div>
  </article>`;
}

/* ---------- views: public ---------- */
function vHome() {
  const J = jobs(), open = J.filter(j => j.status === 'Open'), feat = (J.filter(j => j.featured && j.status === 'Open').concat(open)).filter((j, i, a) => a.indexOf(j) === i).slice(0, 6);
  const stu = users().filter(u => u.role === 'student').length;
  return `
  <section class="hero"><div class="container hero-grid">
    <div class="reveal">
      <span class="hero-badge">🚀 Apex IT Tech Solutions • Internship Finder</span>
      <h1>Find Your Perfect <span class="grad-text typed" id="typed">Internship</span></h1>
      <p class="lead">Explore verified IT internships in web, data, design, security and more. Create your profile, apply in seconds and track every application in one place.</p>
      <div class="hero-search"><input id="heroQ" placeholder="Search e.g. Python, React, Design…"><button class="btn btn-primary" data-act="quick">🔍 Search</button></div>
      <div class="hero-cta"><button class="btn btn-ghost" data-act="nav" data-go="internships">Browse All</button><button class="btn btn-ghost" data-act="authMode" data-mode="signup">Create Free Account</button></div>
    </div>
    <div class="hero-visual reveal" style="--d:150ms"><div class="orbit"></div>
      <div class="float-card"><div class="emo">💻</div><div><b>Web Development</b><span class="s">Build real products</span></div></div>
      <div class="float-card"><div class="emo">📊</div><div><b>Data Science</b><span class="s">Turn data into insight</span></div></div>
      <div class="float-card"><div class="emo">🎓</div><div><b>Certificate + LOR</b><span class="s">On successful completion</span></div></div>
    </div>
  </div></section>

  <section class="section" style="padding-top:30px"><div class="container stats">
    <div class="stat reveal"><div class="num count" data-to="${open.length}">0</div><p>Open Internships</p></div>
    <div class="stat reveal" style="--d:80ms"><div class="num count" data-to="${stu}">0</div><p>Registered Students</p></div>
    <div class="stat reveal" style="--d:160ms"><div class="num count" data-to="${apps().length}">0</div><p>Applications</p></div>
    <div class="stat reveal" style="--d:240ms"><div class="num count" data-to="${CATS.length}" data-suf="+">0</div><p>Domains</p></div>
  </div></section>

  <section class="section"><div class="container">${sec('Domains', 'Pick Your <span class="grad-text">Tech Domain</span>', 'Choose a field you love and start applying.')}
    <div class="cats">${CATS.map((c, i) => `<button class="cat reveal" style="--d:${(i % 5) * 60}ms" data-act="cat" data-cat="${esc(c)}"><span class="emo">${EMO[c]}</span><b>${c}</b><span class="small muted">${J.filter(j => j.category === c && j.status === 'Open').length} open</span></button>`).join('')}</div>
  </div></section>

  <section class="section"><div class="container">${sec('Featured', 'Latest <span class="grad-text">Internships</span>', 'Fresh openings handpicked for students.')}
    <div class="grid">${feat.length ? feat.map(card).join('') : empty('📭', 'No internships yet.')}</div>
    <div style="text-align:center;margin-top:34px" class="reveal"><button class="btn btn-primary" data-act="nav" data-go="internships">View All Internships →</button></div>
  </div></section>

  <section class="section"><div class="container">${sec('How It Works', 'Get Started in <span class="grad-text">3 Easy Steps</span>')}
    <div class="steps">
      <div class="card step reveal"><div class="n">1</div><h3>Create Account</h3><p class="muted small">Sign up as a student with your college details.</p></div>
      <div class="card step reveal" style="--d:100ms"><div class="n">2</div><h3>Apply to Internships</h3><p class="muted small">Pick the roles you like and apply with one form.</p></div>
      <div class="card step reveal" style="--d:200ms"><div class="n">3</div><h3>Track &amp; Get Selected</h3><p class="muted small">Watch your status move from Pending to Selected.</p></div>
    </div></div></section>

  <section class="section" style="padding-top:20px"><div class="container"><div class="cta reveal"><h2>Ready to Launch Your Career?</h2><p>Join Apex IT Tech Solutions and work on real projects with industry mentors.</p><button class="btn btn-ghost" data-act="authMode" data-mode="signup">Join Now 🚀</button></div></div></section>`;
}

function filteredJobs() {
  const q = state.q.trim().toLowerCase();
  let L = jobs().filter(j => (!q || [j.title, j.category, j.skills, j.location, j.description].join(' ').toLowerCase().includes(q)) && (!state.cat || j.category === state.cat) && (!state.mode || j.mode === state.mode));
  if (state.sort === 'new') L.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (state.sort === 'deadline') L.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  if (state.sort === 'az') L.sort((a, b) => a.title.localeCompare(b.title));
  return L;
}
function listHtml() { const L = filteredJobs(); return L.length ? L.map(card).join('') : `<div style="grid-column:1/-1">${empty('🔎', 'No internships match your filters.')}</div>`; }
function vInternships() {
  return `<div class="container"><div class="page-title reveal"><h1>Explore <span class="grad-text">Internships</span></h1><p class="muted">Search, filter and apply to the right opportunity.</p></div>
  <div class="filters reveal">
    <input data-filter="q" placeholder="🔍 Search title, skill, location…" value="${esc(state.q)}">
    <select data-filter="cat"><option value="">All Categories</option>${CATS.map(c => `<option ${state.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    <select data-filter="mode"><option value="">All Modes</option>${MODES.map(m => `<option ${state.mode === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
    <select data-filter="sort"><option value="new" ${state.sort === 'new' ? 'selected' : ''}>Newest First</option><option value="deadline" ${state.sort === 'deadline' ? 'selected' : ''}>Deadline Soon</option><option value="az" ${state.sort === 'az' ? 'selected' : ''}>A → Z</option></select>
  </div>
  <div class="grid" id="list" style="padding-bottom:40px">${listHtml()}</div></div>`;
}

function vAbout() {
  return `<div class="container"><div class="page-title reveal"><h1>About <span class="grad-text">Apex IT Tech Solutions</span></h1><p class="muted" style="max-width:640px;margin:10px auto 0">We connect talented students with practical, project-based internships so they graduate with real experience, not just theory.</p></div>
  <div class="section"><div class="about-grid">
    <div class="card reveal"><span class="emo">🎯</span><h3>Our Mission</h3><p class="muted small">Make quality IT training accessible to every student through hands-on internships.</p></div>
    <div class="card reveal" style="--d:100ms"><span class="emo">👨‍🏫</span><h3>Expert Mentors</h3><p class="muted small">Learn directly from working developers, designers and analysts.</p></div>
    <div class="card reveal" style="--d:200ms"><span class="emo">🏆</span><h3>Certification</h3><p class="muted small">Get an internship certificate and project letter on completion.</p></div>
  </div></div></div>`;
}

function vContact() {
  return `<div class="container"><div class="page-title reveal"><h1>Contact <span class="grad-text">Us</span></h1><p class="muted">Have a question? Send us a message.</p></div>
  <div class="section contact-grid">
    <div class="card reveal"><h3 style="margin-bottom:10px">Get in touch</h3>
      <div class="info-row"><div class="ic">📍</div><div><b>Office</b><p class="muted small">Apex IT Tech Solutions, Maharashtra, India</p></div></div>
      <div class="info-row"><div class="ic">✉️</div><div><b>Email</b><p class="muted small">apextechsolutions666@gmail.com</p></div></div>
      <div class="info-row"><div class="ic">📞</div><div><b>Phone</b><p class="muted small">+91 xxxxxxxxxx </p></div></div></div>
    <form class="card reveal" style="--d:100ms" data-form="contact"><h3 style="margin-bottom:14px">Send a message</h3>
      <div class="form-grid"><div class="field"><label>Name</label><input name="name" required></div><div class="field"><label>Email</label><input type="email" name="email" required></div>
      <div class="field full"><label>Subject</label><input name="subject" required></div><div class="field full"><label>Message</label><textarea name="message" required></textarea></div></div>
      <button class="btn btn-primary btn-block">Send Message ✈️</button></form>
  </div></div>`;
}

function vAuth() {
  const login = state.authMode === 'login';
  return `<div class="container"><div class="auth reveal show">
    <div class="auth-side"><h2>${login ? 'Welcome Back! 👋' : 'Start Your Journey 🚀'}</h2><p>${login ? 'Login to track applications and discover new internships.' : 'Create a free student account and apply to internships in minutes.'}</p>
      <ul><li>✅ One-click applications</li><li>✅ Live status tracking</li><li>✅ Save favourite internships</li></ul></div>
    <div class="auth-form"><div class="auth-tabs"><button class="${login ? 'active' : ''}" data-act="authMode" data-mode="login">Login</button><button class="${!login ? 'active' : ''}" data-act="authMode" data-mode="signup">Sign Up</button></div>
    ${login ? `<form data-form="login">
      <div class="field"><label>Email</label><input type="email" name="email" required placeholder="you@example.com"></div>
      <div class="field"><label>Password</label><div class="pw"><input type="password" name="password" required placeholder="••••••••"><button type="button" data-act="pw">👁</button></div></div>
      <button class="btn btn-primary btn-block">Login</button>
      </form>`
    : `<form data-form="signup"><div class="form-grid">
      <div class="field full"><label>Full Name</label><input name="name" required></div>
      <div class="field"><label>Email</label><input type="email" name="email" required></div>
      <div class="field"><label>Phone</label><input name="phone" pattern="[0-9+\\- ]{10,15}" title="Enter a valid phone number" required></div>
      <div class="field"><label>College</label><input name="college" required></div>
      <div class="field"><label>Course / Year</label><input name="course" placeholder="e.g. BE Computer, 3rd Year" required></div>
      <div class="field"><label>Password</label><div class="pw"><input type="password" name="password" minlength="6" required><button type="button" data-act="pw">👁</button></div></div>
      <div class="field"><label>Confirm Password</label><input type="password" name="confirm" minlength="6" required></div></div>
      <button class="btn btn-primary btn-block">Create Account</button></form>`}
    </div></div></div>`;
}

/* ---------- layout for dashboards ---------- */
function layout(head, tabs, active, key, body) {
  return `<section class="panel-wrap"><aside class="side"><div class="side-head"><div class="avatar">${esc(head.name[0].toUpperCase())}</div><b>${esc(head.name)}</b><span>${esc(head.sub)}</span></div>
    ${tabs.map(t => `<button class="side-link ${t.id === active ? 'active' : ''}" data-act="tab" data-key="${key}" data-id="${t.id}"><span>${t.icon}</span>${t.label}${t.badge ? `<em>${t.badge}</em>` : ''}</button>`).join('')}</aside>
    <div class="panel-body">${body}</div></section>`;
}
const sc = (ic, n, l) => `<div class="sc"><div class="ic">${ic}</div><div><b>${n}</b><span>${l}</span></div></div>`;

/* ---------- student dashboard ---------- */
function vDashboard() {
  const u = me(), A = apps().filter(a => a.userId === u.id), tab = state.dashTab;
  const tabs = [{ id: 'overview', icon: '🏠', label: 'Overview' }, { id: 'applications', icon: '📄', label: 'My Applications' }, { id: 'saved', icon: '💖', label: 'Saved' }, { id: 'profile', icon: '👤', label: 'Profile' }];
  let body = '';
  if (tab === 'overview') {
    const rec = jobs().filter(j => j.status === 'Open' && !A.some(a => a.jobId === j.id)).slice(0, 3);
    body = `<h2>Hello, ${esc(u.name.split(' ')[0])} 👋</h2><p class="muted" style="margin-bottom:20px">Here is your internship activity.</p>
      <div class="stat-cards">${sc('📄', A.length, 'Applied')}${sc('⏳', A.filter(a => a.status === 'Pending').length, 'Pending')}${sc('⭐', A.filter(a => a.status === 'Shortlisted').length, 'Shortlisted')}${sc('🎉', A.filter(a => a.status === 'Selected').length, 'Selected')}</div>
      <div class="box"><h3>Recommended for you</h3><div class="grid">${rec.length ? rec.map(card).join('') : empty('🎯', 'You have applied to everything open!')}</div></div>`;
  } else if (tab === 'applications') {
    body = `<h2>My Applications</h2><p class="muted" style="margin-bottom:18px">Track the status of each application.</p>` + (A.length ? `<div class="table-wrap"><table><thead><tr><th>Internship</th><th>Applied On</th><th>Status</th><th>Action</th></tr></thead><tbody>${A.map(a => { const j = jobById(a.jobId); return `<tr><td><b>${esc(j ? j.title : 'Removed internship')}</b><div class="small muted">${j ? esc(j.category) : ''}</div></td><td>${fmt(a.date)}</td><td><span class="badge b-${a.status}">${a.status}</span></td><td><button class="btn btn-danger btn-sm" data-act="withdraw" data-id="${a.id}">Withdraw</button></td></tr>`; }).join('')}</tbody></table></div>` : empty('📭', 'No applications yet. Go apply!'));
  } else if (tab === 'saved') {
    const S = (u.saved || []).map(jobById).filter(Boolean);
    body = `<h2>Saved Internships</h2><p class="muted" style="margin-bottom:18px">Your bookmarked opportunities.</p><div class="grid">${S.length ? S.map(card).join('') : `<div style="grid-column:1/-1">${empty('💔', 'Nothing saved yet. Tap the ♥ on any internship.')}</div>`}</div>`;
  } else {
    body = `<h2>My Profile</h2><p class="muted" style="margin-bottom:18px">Keep your details up to date.</p><form class="box" data-form="profile"><div class="form-grid">
      <div class="field"><label>Full Name</label><input name="name" value="${esc(u.name)}" required></div><div class="field"><label>Email</label><input value="${esc(u.email)}" disabled></div>
      <div class="field"><label>Phone</label><input name="phone" value="${esc(u.phone)}" required></div><div class="field"><label>College</label><input name="college" value="${esc(u.college)}" required></div>
      <div class="field"><label>Course / Year</label><input name="course" value="${esc(u.course)}" required></div><div class="field"><label>New Password (optional)</label><input type="password" name="password" minlength="6" placeholder="Leave blank to keep current"></div></div>
      <button class="btn btn-primary">Save Changes</button></form>`;
  }
  return layout({ name: u.name, sub: u.email }, tabs, tab, 'dashTab', body);
}

/* ---------- admin panel ---------- */
function vAdmin() {
  const u = me(), tab = state.adminTab, J = jobs(), A = apps(), S = users().filter(x => x.role === 'student'), M = msgs();
  const pend = A.filter(a => a.status === 'Pending').length;
  const tabs = [{ id: 'dashboard', icon: '📈', label: 'Dashboard' }, { id: 'internships', icon: '💼', label: 'Internships' }, { id: 'applications', icon: '📄', label: 'Applications', badge: pend || '' }, { id: 'students', icon: '🎓', label: 'Students' }, { id: 'messages', icon: '✉️', label: 'Messages', badge: M.length || '' }, { id: 'settings', icon: '⚙️', label: 'Settings' }];
  let body = '';
  if (tab === 'dashboard') {
    const rows = CATS.map(c => ({ c, apps: A.filter(a => (jobById(a.jobId) || {}).category === c).length, jobs: J.filter(j => j.category === c).length })).filter(r => r.jobs || r.apps);
    const max = Math.max(1, ...rows.map(r => r.apps));
    body = `<h2>Admin Dashboard</h2><p class="muted" style="margin-bottom:20px">Overview of the whole platform.</p>
      <div class="stat-cards">${sc('💼', J.length, 'Internships')}${sc('🎓', S.length, 'Students')}${sc('📄', A.length, 'Applications')}${sc('🎉', A.filter(a => a.status === 'Selected').length, 'Selected')}</div>
      <div class="two"><div class="box"><h3>Applications by Domain</h3><div class="bars">${rows.length ? rows.map(r => `<div class="row"><div class="lab"><span>${EMO[r.c]} ${r.c}</span><span>${r.apps} apps • ${r.jobs} roles</span></div><div class="track"><div class="bar" style="--w:${Math.max(4, r.apps / max * 100)}%"></div></div></div>`).join('') : '<p class="muted">No data yet.</p>'}</div></div>
      <div class="box"><h3>Recent Applications</h3>${A.length ? A.slice(-5).reverse().map(a => { const s = userById(a.userId), j = jobById(a.jobId); return `<div class="list-item"><div><b>${esc(s ? s.name : 'Deleted user')}</b><div class="small muted">${esc(j ? j.title : 'Removed')}</div></div><span class="badge b-${a.status}">${a.status}</span></div>`; }).join('') : '<p class="muted">No applications yet.</p>'}</div></div>`;
  } else if (tab === 'internships') {
    body = `<div class="panel-top"><div><h2>Manage Internships</h2><p class="muted small">Create, edit, close or delete internships.</p></div><button class="btn btn-primary" data-act="jobNew">＋ Add Internship</button></div>
      ${J.length ? `<div class="table-wrap"><table><thead><tr><th>Title</th><th>Category</th><th>Mode</th><th>Seats</th><th>Deadline</th><th>Status</th><th>Actions</th></tr></thead><tbody>${J.map(j => `<tr><td><b>${esc(j.title)}</b>${j.featured ? ' <span class="badge b-Shortlisted">★</span>' : ''}<div class="small muted">₹ ${esc(j.stipend)} • ${esc(j.duration)}</div></td><td>${esc(j.category)}</td><td>${esc(j.mode)}</td><td>${j.seats}</td><td>${fmt(j.deadline)}</td><td><span class="badge b-${j.status}">${j.status}</span></td>
        <td><div class="acts"><button class="btn btn-ghost btn-sm" data-act="jobEdit" data-id="${j.id}">✏️ Edit</button><button class="btn btn-ghost btn-sm" data-act="jobToggle" data-id="${j.id}">${j.status === 'Open' ? '🔒 Close' : '🔓 Open'}</button><button class="btn btn-ghost btn-sm" data-act="jobFeat" data-id="${j.id}">${j.featured ? '☆' : '★'}</button><button class="btn btn-danger btn-sm" data-act="jobDel" data-id="${j.id}">🗑</button></div></td></tr>`).join('')}</tbody></table></div>` : empty('💼', 'No internships. Click “Add Internship”.')}`;
  } else if (tab === 'applications') {
    const L = A.filter(a => !state.appFilter || a.status === state.appFilter);
    body = `<div class="panel-top"><div><h2>Applications</h2><p class="muted small">Review candidates and update their status.</p></div>
      <div class="acts"><select class="sel" data-change="appFilter"><option value="">All Status</option>${STATUSES.map(s => `<option ${state.appFilter === s ? 'selected' : ''}>${s}</option>`).join('')}</select><button class="btn btn-ghost btn-sm" data-act="csv">⬇ Export CSV</button></div></div>
      ${L.length ? `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Internship</th><th>College</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>${L.slice().reverse().map(a => { const s = userById(a.userId) || {}, j = jobById(a.jobId) || {}; return `<tr><td><b>${esc(s.name || 'Deleted')}</b><div class="small muted">${esc(s.email || '')}</div></td><td>${esc(j.title || 'Removed')}</td><td>${esc(a.college || s.college || '-')}</td><td>${fmt(a.date)}</td>
        <td><select class="sel" data-change="appStatus" data-id="${a.id}">${STATUSES.map(x => `<option ${a.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
        <td><div class="acts"><button class="btn btn-ghost btn-sm" data-act="appView" data-id="${a.id}">👁 View</button><button class="btn btn-danger btn-sm" data-act="appDel" data-id="${a.id}">🗑</button></div></td></tr>`; }).join('')}</tbody></table></div>` : empty('📄', 'No applications found.')}`;
  } else if (tab === 'students') {
    body = `<h2>Registered Students</h2><p class="muted small" style="margin-bottom:18px">Block or remove student accounts.</p>
      ${S.length ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Contact</th><th>College</th><th>Joined</th><th>Apps</th><th>Account</th><th>Actions</th></tr></thead><tbody>${S.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.email)}<div class="small muted">${esc(s.phone)}</div></td><td>${esc(s.college)}<div class="small muted">${esc(s.course)}</div></td><td>${fmt(s.createdAt)}</td><td>${A.filter(a => a.userId === s.id).length}</td><td><span class="badge b-${s.blocked ? 'Blocked' : 'Active'}">${s.blocked ? 'Blocked' : 'Active'}</span></td>
        <td><div class="acts"><button class="btn ${s.blocked ? 'btn-ok' : 'btn-ghost'} btn-sm" data-act="userBlock" data-id="${s.id}">${s.blocked ? 'Unblock' : 'Block'}</button><button class="btn btn-danger btn-sm" data-act="userDel" data-id="${s.id}">🗑</button></div></td></tr>`).join('')}</tbody></table></div>` : empty('🎓', 'No students registered yet.')}`;
  } else if (tab === 'messages') {
    body = `<h2>Contact Messages</h2><p class="muted small" style="margin-bottom:18px">Messages sent from the Contact page.</p>
      ${M.length ? M.slice().reverse().map(m => `<div class="box"><div class="list-item" style="border:none;padding:0 0 8px"><div><b>${esc(m.subject)}</b><div class="small muted">${esc(m.name)} • ${esc(m.email)} • ${fmt(m.date)}</div></div><button class="btn btn-danger btn-sm" data-act="msgDel" data-id="${m.id}">🗑</button></div><p class="small">${esc(m.message)}</p></div>`).join('') : empty('✉️', 'Inbox is empty.')}`;
  } else {
    body = `<h2>Settings</h2><p class="muted small" style="margin-bottom:18px">Admin account and data tools.</p>
      <form class="box" data-form="adminPass"><h3>Change Admin Password</h3><div class="form-grid"><div class="field"><label>Current Password</label><input type="password" name="old" required></div><div class="field"><label>New Password</label><input type="password" name="new" minlength="6" required></div></div><button class="btn btn-primary">Update Password</button></form>
      <div class="box"><h3>Data Tools</h3><p class="muted small" style="margin-bottom:14px">All data lives in this browser's localStorage.</p><div class="acts"><button class="btn btn-ghost" data-act="backup">⬇ Download Backup (JSON)</button><button class="btn btn-danger" data-act="reset">♻ Reset All Data</button></div></div>`;
  }
  return layout({ name: u.name, sub: 'Administrator' }, tabs, tab, 'adminTab', body);
}

/* ---------- internship form (create / edit) ---------- */
function jobForm(j) {
  j = j || { title: '', category: CATS[0], mode: 'Remote', duration: '', stipend: '', seats: 5, location: '', deadline: addDays(30), skills: '', description: '', status: 'Open', featured: false };
  const opt = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
  openModal(`<h2>${j.id ? '✏️ Edit' : '＋ Add'} Internship</h2><p class="muted small" style="margin-bottom:16px">Fill in the details below.</p>
  <form data-form="job"><input type="hidden" name="id" value="${j.id || ''}"><div class="form-grid">
    <div class="field full"><label>Title</label><input name="title" value="${esc(j.title)}" required></div>
    <div class="field"><label>Category</label><select name="category">${opt(CATS, j.category)}</select></div>
    <div class="field"><label>Mode</label><select name="mode">${opt(MODES, j.mode)}</select></div>
    <div class="field"><label>Duration</label><input name="duration" value="${esc(j.duration)}" placeholder="3 Months" required></div>
    <div class="field"><label>Stipend (₹)</label><input name="stipend" value="${esc(j.stipend)}" placeholder="8,000/mo or Unpaid" required></div>
    <div class="field"><label>Seats</label><input type="number" min="1" name="seats" value="${j.seats}" required></div>
    <div class="field"><label>Location</label><input name="location" value="${esc(j.location)}" required></div>
    <div class="field"><label>Last Date</label><input type="date" name="deadline" value="${esc(j.deadline)}" required></div>
    <div class="field"><label>Status</label><select name="status">${opt(['Open', 'Closed'], j.status)}</select></div>
    <div class="field full"><label>Skills (comma separated)</label><input name="skills" value="${esc(j.skills)}" required></div>
    <div class="field full"><label>Description</label><textarea name="description" required>${esc(j.description)}</textarea></div>
    <label class="check full"><input type="checkbox" name="featured" ${j.featured ? 'checked' : ''}> Mark as Featured</label></div>
    <div class="btns"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">${j.id ? 'Save Changes' : 'Create Internship'}</button></div></form>`);
}

function jobDetail(j) {
  const u = me(), applied = u && apps().some(a => a.jobId === j.id && a.userId === u.id);
  openModal(`<div class="job-top" style="justify-content:flex-start;gap:14px"><div class="job-ic">${EMO[j.category] || '💼'}</div><div><h2>${esc(j.title)}</h2><p class="muted small">${esc(j.category)} • ${esc(j.location)}</p></div></div>
  <div class="kv"><div><small>Mode</small>${esc(j.mode)}</div><div><small>Duration</small>${esc(j.duration)}</div><div><small>Stipend</small>₹ ${esc(j.stipend)}</div><div><small>Seats</small>${j.seats}</div><div><small>Last Date</small>${fmt(j.deadline)}</div><div><small>Status</small>${j.status}</div></div>
  <h4>About the role</h4><p class="muted small" style="margin:6px 0 14px">${esc(j.description)}</p>
  <h4>Skills required</h4><div class="tags">${j.skills.split(',').map(s => `<span class="tag">${esc(s.trim())}</span>`).join('')}</div>
  <div class="btns"><button class="btn btn-ghost" data-act="close">Close</button><button class="btn btn-primary" data-act="apply" data-id="${j.id}" ${j.status !== 'Open' ? 'disabled' : ''}>${applied ? 'Applied ✓' : 'Apply Now'}</button></div>`);
}

/* ---------- actions (click delegation) ---------- */
const act = {
  nav: d => go(d.go),
  menu: () => { $('#navLinks').classList.toggle('open'); $('.burger').classList.toggle('open'); },
  theme: () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'),
  close: closeModal,
  confirmYes: () => { const f = pending; pending = null; closeModal(); f && f(); },
  pw: (d, el) => { const i = el.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; },
  authMode: d => { state.authMode = d.mode; go('auth'); },
  logout: () => { localStorage.removeItem(KEY.session); toast('Logged out successfully'); go('home'); updateNav(); },
  quick: () => { state.q = ($('#heroQ').value || ''); state.cat = ''; state.mode = ''; go('internships'); },
  cat: d => { state.cat = d.cat; state.q = ''; go('internships'); },
  tab: d => { state[d.key] = d.id; render(); },
  view: d => { const j = jobById(d.id); j && jobDetail(j); },
  save: d => {
    const u = me(); if (!u) { toast('Login to save internships', 'err'); return; } if (u.role === 'admin') return;
    const all = users(), x = all.find(z => z.id === u.id); x.saved = x.saved || [];
    const i = x.saved.indexOf(d.id); i > -1 ? x.saved.splice(i, 1) : x.saved.push(d.id); db.set(KEY.users, all);
    toast(i > -1 ? 'Removed from saved' : 'Saved ♥'); if (route() === 'dashboard' && state.dashTab === 'saved') render(); else $$(`.heart[data-id="${d.id}"]`).forEach(h => h.classList.toggle('on', i === -1));
  },
  apply: d => {
    const u = me(), j = jobById(d.id); if (!j) return;
    if (!u) { toast('Please login or sign up to apply', 'err'); state.authMode = 'login'; go('auth'); return; }
    if (u.role === 'admin') { toast('Admin cannot apply to internships', 'err'); return; }
    if (apps().some(a => a.jobId === j.id && a.userId === u.id)) { toast('You already applied to this internship', 'err'); return; }
    openModal(`<h2>Apply: ${esc(j.title)}</h2><p class="muted small" style="margin-bottom:16px">Confirm your details and submit.</p>
      <form data-form="apply"><input type="hidden" name="jobId" value="${j.id}"><div class="form-grid">
      <div class="field"><label>Name</label><input value="${esc(u.name)}" disabled></div><div class="field"><label>Email</label><input value="${esc(u.email)}" disabled></div>
      <div class="field"><label>Phone</label><input name="phone" value="${esc(u.phone)}" required></div><div class="field"><label>College</label><input name="college" value="${esc(u.college)}" required></div>
      <div class="field full"><label>Resume / Portfolio Link (optional)</label><input type="url" name="resume" placeholder="https://drive.google.com/…"></div>
      <div class="field full"><label>Why should we select you?</label><textarea name="note" required></textarea></div></div>
      <div class="btns"><button type="button" class="btn btn-ghost" data-act="close">Cancel</button><button class="btn btn-primary">Submit Application 🚀</button></div></form>`);
  },
  withdraw: d => confirmBox('Withdraw this application?', () => { db.set(KEY.apps, apps().filter(a => a.id !== d.id)); toast('Application withdrawn'); render(); }),
  jobNew: () => jobForm(),
  jobEdit: d => jobForm(jobById(d.id)),
  jobToggle: d => { const L = jobs(), j = L.find(x => x.id === d.id); j.status = j.status === 'Open' ? 'Closed' : 'Open'; db.set(KEY.jobs, L); toast('Status: ' + j.status); render(); },
  jobFeat: d => { const L = jobs(), j = L.find(x => x.id === d.id); j.featured = !j.featured; db.set(KEY.jobs, L); render(); },
  jobDel: d => confirmBox('This internship and its applications will be deleted permanently.', () => { db.set(KEY.jobs, jobs().filter(j => j.id !== d.id)); db.set(KEY.apps, apps().filter(a => a.jobId !== d.id)); toast('Internship deleted'); render(); }),
  appView: d => {
    const a = apps().find(x => x.id === d.id), s = userById(a.userId) || {}, j = jobById(a.jobId) || {};
    openModal(`<h2>Application Details</h2><div class="kv"><div><small>Student</small>${esc(s.name)}</div><div><small>Email</small>${esc(s.email)}</div><div><small>Phone</small>${esc(a.phone || s.phone)}</div><div><small>College</small>${esc(a.college || s.college)}</div><div><small>Course</small>${esc(s.course)}</div><div><small>Internship</small>${esc(j.title)}</div></div>
    <h4>Statement</h4><p class="muted small" style="margin:6px 0 14px">${esc(a.note)}</p>${a.resume ? `<p><a class="tag" href="${esc(a.resume)}" target="_blank" rel="noopener noreferrer">📎 Open Resume Link</a></p>` : '<p class="small muted">No resume link provided.</p>'}<div class="btns"><button class="btn btn-ghost" data-act="close">Close</button></div>`);
  },
  appDel: d => confirmBox('Delete this application?', () => { db.set(KEY.apps, apps().filter(a => a.id !== d.id)); toast('Application deleted'); render(); }),
  userBlock: d => { const L = users(), s = L.find(x => x.id === d.id); s.blocked = !s.blocked; db.set(KEY.users, L); toast(s.blocked ? 'Student blocked' : 'Student unblocked'); render(); },
  userDel: d => confirmBox('Student account and their applications will be removed.', () => { db.set(KEY.users, users().filter(u => u.id !== d.id)); db.set(KEY.apps, apps().filter(a => a.userId !== d.id)); toast('Student removed'); render(); }),
  msgDel: d => { db.set(KEY.msgs, msgs().filter(m => m.id !== d.id)); toast('Message deleted'); render(); },
  csv: () => {
    const rows = [['Student', 'Email', 'Phone', 'College', 'Internship', 'Date', 'Status']];
    apps().forEach(a => { const s = userById(a.userId) || {}, j = jobById(a.jobId) || {}; rows.push([s.name, s.email, a.phone || s.phone, a.college || s.college, j.title, fmt(a.date), a.status]); });
    download('apex-applications.csv', rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
  },
  backup: () => download('apex-backup.json', JSON.stringify({ users: users().map(u => ({ ...u, pass: '***' })), internships: jobs(), applications: apps(), messages: msgs() }, null, 2), 'application/json'),
  reset: () => confirmBox('All internships, students, applications and messages will be erased and demo data restored.', () => { [KEY.users, KEY.jobs, KEY.apps, KEY.msgs, KEY.session].forEach(k => localStorage.removeItem(k)); seed(); toast('Data reset to default'); go('home'); updateNav(); })
};
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); }

document.addEventListener('click', e => {
  const b = e.target.closest('.btn'); if (b) { const r = document.createElement('span'), s = Math.max(b.offsetWidth, b.offsetHeight), rc = b.getBoundingClientRect(); r.className = 'ripple'; r.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - rc.left - s / 2}px;top:${e.clientY - rc.top - s / 2}px`; b.appendChild(r); setTimeout(() => r.remove(), 600); }
  if (e.target.id === 'modal') return closeModal();
  const t = e.target.closest('[data-act]'); if (!t) return;
  if (t.tagName === 'A') e.preventDefault();
  act[t.dataset.act] && act[t.dataset.act](t.dataset, t, e);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* filters + selects */
document.addEventListener('input', e => {
  const f = e.target.dataset.filter; if (!f) return; state[f] = e.target.value; const l = $('#list'); if (l) { l.innerHTML = listHtml(); observe(); }
});
document.addEventListener('change', e => {
  const t = e.target; if (t.dataset.filter) { state[t.dataset.filter] = t.value; const l = $('#list'); if (l) { l.innerHTML = listHtml(); observe(); } return; }
  if (t.dataset.change === 'appFilter') { state.appFilter = t.value; render(); }
  if (t.dataset.change === 'appStatus') { const L = apps(), a = L.find(x => x.id === t.dataset.id); a.status = t.value; db.set(KEY.apps, L); toast('Status updated to ' + t.value); }
});

/* ---------- forms ---------- */
const forms = {
  login(f) {
    const u = users().find(x => x.email === f.email.trim().toLowerCase());
    if (!u || u.pass !== hash(f.password)) return toast('Invalid email or password', 'err');
    if (u.blocked) return toast('Your account is blocked. Contact admin.', 'err');
    db.set(KEY.session, { id: u.id }); toast('Welcome back, ' + u.name.split(' ')[0] + ' 👋'); go(u.role === 'admin' ? 'admin' : 'dashboard');
  },
  signup(f) {
    const email = f.email.trim().toLowerCase();
    if (f.password !== f.confirm) return toast('Passwords do not match', 'err');
    if (users().some(x => x.email === email)) return toast('Email already registered', 'err');
    const u = { id: uid('u_'), name: f.name.trim(), email, phone: f.phone.trim(), college: f.college.trim(), course: f.course.trim(), pass: hash(f.password), role: 'student', saved: [], blocked: false, createdAt: new Date().toISOString() };
    db.set(KEY.users, [...users(), u]); db.set(KEY.session, { id: u.id }); toast('Account created! 🎉'); state.dashTab = 'overview'; go('dashboard');
  },
  contact(f, form) { db.set(KEY.msgs, [...msgs(), { id: uid('m_'), ...f, date: new Date().toISOString() }]); form.reset(); toast('Message sent. We will contact you soon!'); },
  apply(f) {
    const u = me(); if (!u) return;
    if (apps().some(a => a.jobId === f.jobId && a.userId === u.id)) return toast('Already applied', 'err');
    db.set(KEY.apps, [...apps(), { id: uid('a_'), jobId: f.jobId, userId: u.id, phone: f.phone, college: f.college, resume: f.resume, note: f.note, status: 'Pending', date: new Date().toISOString() }]);
    closeModal(); toast('Application submitted successfully 🚀'); render();
  },
  profile(f) {
    const L = users(), u = L.find(x => x.id === me().id); Object.assign(u, { name: f.name.trim(), phone: f.phone.trim(), college: f.college.trim(), course: f.course.trim() });
    if (f.password) u.pass = hash(f.password); db.set(KEY.users, L); toast('Profile updated'); updateNav(); render();
  },
  job(f) {
    const L = jobs(), data = { title: f.title.trim(), category: f.category, mode: f.mode, duration: f.duration.trim(), stipend: f.stipend.trim(), seats: +f.seats || 1, location: f.location.trim(), deadline: f.deadline, skills: f.skills.trim(), description: f.description.trim(), status: f.status, featured: f.featured === 'on' };
    if (f.id) { Object.assign(L.find(j => j.id === f.id), data); toast('Internship updated ✅'); }
    else { L.unshift({ id: uid('j_'), ...data, createdAt: new Date().toISOString() }); toast('Internship created 🎉'); }
    db.set(KEY.jobs, L); closeModal(); render();
  },
  adminPass(f, form) {
    const L = users(), u = L.find(x => x.id === me().id);
    if (u.pass !== hash(f.old)) return toast('Current password is wrong', 'err');
    u.pass = hash(f.new); db.set(KEY.users, L); form.reset(); toast('Password updated');
  }
};
document.addEventListener('submit', e => {
  const form = e.target.closest('form[data-form]'); if (!form) return; e.preventDefault();
  const fd = Object.fromEntries(new FormData(form).entries()); forms[form.dataset.form](fd, form);
});

/* ---------- scroll UI ---------- */
window.addEventListener('scroll', () => { $('#navbar').classList.toggle('scrolled', scrollY > 10); $('#toTop').classList.toggle('show', scrollY > 500); }, { passive: true });
$('#toTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.addEventListener('hashchange', render);

/* ---------- boot ---------- */
initTheme(); seed(); $('#year').textContent = new Date().getFullYear(); render();
})();
