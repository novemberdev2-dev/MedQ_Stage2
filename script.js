// ===== EARLY INIT (runs before DOM is ready) =====
if (localStorage.getItem('medq_theme') === 'light') {
  document.documentElement.classList.add('light-mode-pre');
}
if (localStorage.getItem('medq_active') === 'true') {
  document.documentElement.classList.add('already-activated');
}
(function () {
  var savedImg  = localStorage.getItem('medq_profile_img');
  var savedName = localStorage.getItem('medq_profile_name');
  if (!savedImg && !savedName) return;
  var style = document.createElement('style');
  style.id = 'profile-preload-hide';
  style.textContent = '#app-icon-el img, #app-name-el { opacity: 0; }';
  document.head.appendChild(style);
  document.addEventListener('DOMContentLoaded', function () {
    if (savedImg)  { var el = document.getElementById('profile-img');    if (el) el.src = savedImg; }
    if (savedName) { var el = document.getElementById('app-name-el');    if (el) el.textContent = savedName; }
    if (savedImg)  { var el = document.getElementById('pm-preview-img'); if (el) el.src = savedImg; }
    var s = document.getElementById('profile-preload-hide');
    if (s) s.remove();
  });
})();

// ===== CONSTANTS =====
const DEFAULT_IMG  = 'https://i.imgur.com/AXJmZwo.png';
const DEFAULT_NAME = 'Med-Q';
let pendingImageDataUrl = null;

// ===== PROFILE MODAL =====
function openProfileModal() {
  const backdrop   = document.getElementById('profile-modal-backdrop');
  const nameInput  = document.getElementById('pm-name-input');
  const previewImg = document.getElementById('pm-preview-img');
  nameInput.value  = localStorage.getItem('medq_profile_name') || DEFAULT_NAME;
  previewImg.src   = localStorage.getItem('medq_profile_img')  || DEFAULT_IMG;
  pendingImageDataUrl = null;
  backdrop.classList.add('open');
  backdrop.addEventListener('click', onBackdropClick);
}

function onBackdropClick(e) {
  if (e.target === document.getElementById('profile-modal-backdrop')) closeProfileModal();
}

function closeProfileModal() {
  const backdrop = document.getElementById('profile-modal-backdrop');
  backdrop.classList.remove('open');
  backdrop.removeEventListener('click', onBackdropClick);
  pendingImageDataUrl = null;
}

function saveProfile() {
  const newName = document.getElementById('pm-name-input').value.trim() || DEFAULT_NAME;
  localStorage.setItem('medq_profile_name', newName);
  document.getElementById('app-name-el').textContent = newName;
  if (pendingImageDataUrl) {
    localStorage.setItem('medq_profile_img', pendingImageDataUrl);
    document.getElementById('profile-img').src = pendingImageDataUrl;
  }
  closeProfileModal();
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('profile-file-input').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      pendingImageDataUrl = ev.target.result;
      document.getElementById('pm-preview-img').src = pendingImageDataUrl;
    };
    reader.readAsDataURL(file);
    this.value = '';
  });
});

function restoreProfile() {
  const savedName = localStorage.getItem('medq_profile_name');
  const savedImg  = localStorage.getItem('medq_profile_img');
  if (savedName) document.getElementById('app-name-el').textContent = savedName;
  if (savedImg)  document.getElementById('profile-img').src = savedImg;
}

// ===== SETTINGS DROPDOWN =====
function toggleSettingsDropdown() {
  const dropdown = document.getElementById('settings-dropdown');
  const btn = document.getElementById('settings-btn');
  if (dropdown.classList.contains('open')) {
    dropdown.classList.remove('open');
    btn.classList.remove('dropdown-open');
  } else {
    document.getElementById('filter-dropdown').classList.remove('open');
    document.getElementById('filter-btn').classList.remove('dropdown-open');
    dropdown.classList.add('open');
    btn.classList.add('dropdown-open');
  }
}

function closeSettingsDropdown() {
  document.getElementById('settings-dropdown').classList.remove('open');
  document.getElementById('settings-btn').classList.remove('dropdown-open');
}

function updateSettingsThemeUI(isLight) {
  document.getElementById('settings-icon-moon').style.display = isLight ? 'none' : '';
  document.getElementById('settings-icon-sun').style.display  = isLight ? '' : 'none';
  document.getElementById('settings-theme-label').textContent = isLight ? 'Light Mode' : 'Dark Mode';
  document.getElementById('settings-theme-sub').textContent   = isLight ? 'Switch to dark' : 'Switch to light';
}

function toggleThemeFromSettings() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('medq_theme', isLight ? 'light' : 'dark');
  updateSettingsThemeUI(isLight);
}

// ===== FILTER DROPDOWN =====
// Maps pill id suffix -> section type substring for matching
const FILTER_TYPE_MAP = {
  ibs: 'Introduction to basic science',
  msd: 'Musculoskeletal system and dermatology',
  hp:  'Hematopoetic',
  cvs: 'Cardiovascular system',
  rs:  'Respiratory system'
};

// Pending selection while dropdown is open
let _pendingFilter = null;

function toggleFilterDropdown() {
  const dropdown = document.getElementById('filter-dropdown');
  const btn = document.getElementById('filter-btn');
  if (dropdown.classList.contains('open')) {
    dropdown.classList.remove('open');
    btn.classList.remove('dropdown-open');
    _pendingFilter = null;
  } else {
    document.getElementById('settings-dropdown').classList.remove('open');
    document.getElementById('settings-btn').classList.remove('dropdown-open');
    // Initialise pending from saved
    const saved = JSON.parse(localStorage.getItem('medq_filter_v2') || 'null') || ['all'];
    _pendingFilter = saved.slice();
    renderFilterPills();
    dropdown.classList.add('open');
    btn.classList.add('dropdown-open');
  }
}

function renderFilterPills() {
  const allPill = document.getElementById('fpill-all');
  ['all','ibs','msd','hp','cvs','rs'].forEach(key => {
    const el = document.getElementById('fpill-' + key);
    if (!el) return;
    el.classList.toggle('selected', _pendingFilter.includes(key));
  });
}

function toggleFilterPill(key) {
  if (key === 'all') {
    _pendingFilter = ['all'];
  } else {
    // Remove 'all' if it's there
    _pendingFilter = _pendingFilter.filter(k => k !== 'all');
    if (_pendingFilter.includes(key)) {
      _pendingFilter = _pendingFilter.filter(k => k !== key);
      if (_pendingFilter.length === 0) _pendingFilter = ['all'];
    } else {
      _pendingFilter.push(key);
    }
  }
  renderFilterPills();
}

function saveFilter() {
  if (!_pendingFilter || _pendingFilter.length === 0) _pendingFilter = ['all'];
  localStorage.setItem('medq_filter_v2', JSON.stringify(_pendingFilter));
  document.getElementById('filter-dropdown').classList.remove('open');
  document.getElementById('filter-btn').classList.remove('dropdown-open');
  applyFilter(_pendingFilter, true);
  _pendingFilter = null;
}

function cancelFilter() {
  document.getElementById('filter-dropdown').classList.remove('open');
  document.getElementById('filter-btn').classList.remove('dropdown-open');
  _pendingFilter = null;
}

// ===== SUBJECT DATA =====
const ALL_SECTIONS = [
  {
    type: 'Introduction To Basic Science 🧪',
    cards: [
      { title: '2017-2018 Year Exam', links: [
        { label: 'Theory',   badge: '22 MCQs',    href: 'IBS_2017-2018.html' },
        { label: 'Practice', badge: '7 Questions', href: 'Anatomylabs.html' }
      ]},
      { title: '2018-2019 Year Exam', links: [
        { label: 'Theory',   badge: '131 MCQs',    href: 'IBS_2017-2018.html' },
        { label: 'Practice', badge: '32 Questions', href: 'Microbiology labs.html' }
      ]},
      { title: '2020-2021 Year Exam', links: [
        { label: 'Theory',   badge: '82 MCQs',     href: 'Molecular biology.html' },
        { label: 'Practice', badge: '4 Questions',  href: 'M.biology-practical.html' }
      ]},
      { title: '2021-2022 Year Exam',   links: [{ label: 'Theory', badge: '204 MCQs', href: 'Physiology.html' }] },
       { title: '2022-2023 Year Exam',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: '2023-2024 Year Exam',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
     { title: '2024-2025 Year Exam',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: '2025-2026 Year Exam',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
    ]
  },
  {
    type: 'Musculoskeletal system and dermatology 🦴',
    cards: [
      { title: 'Anatomy 🦴', links: [
        { label: 'Theory',   badge: '196 MCQs',    href: 'Anatomy.html' },
        { label: 'Practice', badge: '70 Questions', href: 'Anatomylabs.html' }
      ]},
      { title: 'Biochemistry 🧪', links: [
        { label: 'Theory',   badge: '131 MCQs',    href: 'Microbiology.html' },
        { label: 'Practice', badge: '32 Questions', href: 'Microbiology labs.html' }
      ]},
      { title: 'Dermatology ', links: [
        { label: 'Theory',   badge: '82 MCQs',     href: 'Molecular biology.html' },
        { label: 'Practice', badge: '4 Questions',  href: 'M.biology-practical.html' }
      ]},
      { title: 'Genetics 🧬',   links: [{ label: 'Theory', badge: '204 MCQs', href: 'Physiology.html' }] },
      { title: 'Histology 🫁',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Medical education 📕',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Microbiology 🦠',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Pathology ',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Pharmacology 💊',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Physiology ⚡',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Radiology ☢️',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
    
    ]
  },
  {
    type: 'Hematopoetic 🩸',
    cards: [
      { title: 'Bioethics', links: [
        { label: 'Theory',   badge: '196 MCQs',    href: 'Anatomy.html' },
        { label: 'Practice', badge: '70 Questions', href: 'Anatomylabs.html' }
      ]},
      { title: 'Biochemistry 🧪', links: [
        { label: 'Theory',   badge: '131 MCQs',    href: 'Microbiology.html' },
        { label: 'Practice', badge: '32 Questions', href: 'Microbiology labs.html' }
      ]},
      { title: 'Community medicine ', links: [
        { label: 'Theory',   badge: '82 MCQs',     href: 'Molecular biology.html' },
        { label: 'Practice', badge: '4 Questions',  href: 'M.biology-practical.html' }
      ]},
      { title: 'Genetics 🧬',   links: [{ label: 'Theory', badge: '204 MCQs', href: 'Physiology.html' }] },
      { title: 'Histology 🫁',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Medicine',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Microbiology 🦠',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Pathology ',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Pharmacology 💊',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Physiology ⚡',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      
    
    ]
  },
  {
    type: 'Cardiovascular system 🫀',
    cards: [
      { title: 'Anatomy 🦴', links: [
        { label: 'Theory',   badge: '196 MCQs',    href: 'Anatomy.html' },
        { label: 'Practice', badge: '70 Questions', href: 'Anatomylabs.html' }
      ]},
      { title: 'Biochemistry 🧪', links: [
        { label: 'Theory',   badge: '131 MCQs',    href: 'Microbiology.html' },
        { label: 'Practice', badge: '32 Questions', href: 'Microbiology labs.html' }
      ]},
      { title: 'Community medicine ', links: [
        { label: 'Theory',   badge: '82 MCQs',     href: 'Molecular biology.html' },
        { label: 'Practice', badge: '4 Questions',  href: 'M.biology-practical.html' }
      ]},
      { title: 'Histology 🫁',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      
      
      { title: 'Medical education 📕',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
    { title: 'Medicine',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Microbiology 🦠',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Pathology ',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Pharmacology 💊',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Physiology ⚡',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Radiology ☢️',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Sugery 👨‍⚕️ ',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
    
    ]
  },
  {
    type: 'Respiratory system 🫁',
    cards: [
      { title: 'Anatomy 🦴', links: [
        { label: 'Theory',   badge: '196 MCQs',    href: 'Anatomy.html' },
        { label: 'Practice', badge: '70 Questions', href: 'Anatomylabs.html' }
      ]},
      
      { title: 'Genetics 🧬 ', links: [
        { label: 'Theory',   badge: '82 MCQs',     href: 'Molecular biology.html' },
        { label: 'Practice', badge: '4 Questions',  href: 'M.biology-practical.html' }
      ]},
      { title: 'Histology 🫁',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      
       { title: 'Medical education 📕',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
    { title: 'Medicine',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Microbiology 🦠',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Pathology ',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Pharmacology 💊',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Physiology ⚡',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
      { title: 'Radiology ☢️',     links: [{ label: 'Theory', badge: '54 MCQs',  href: 'Genetics.html' }] },
    
    ]
  },
  
  

];

// ===== BUILD FUNCTIONS =====
function buildSection(section) {
  const sectionEl = document.createElement('div');
  sectionEl.className = 'section-container';
  sectionEl.id = `section-${section.type}`;

  const title = document.createElement('h2');
  title.className = 'category-title';
  title.textContent = section.type;
  sectionEl.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'subject-grid';

  section.cards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = 'subject-card';
    cardEl.innerHTML = `<div class="card-header"><h1>${card.title}</h1></div>`;
    const linksContainer = document.createElement('div');
    linksContainer.className = 'links-container';
    card.links.forEach(link => {
      const span = document.createElement('span');
      span.className = 'mcq-link';
      span.innerHTML = `${link.label} <span class="badge">${link.badge}</span>`;
      span.onclick = () => location.replace(link.href);
      linksContainer.appendChild(span);
    });
    cardEl.appendChild(linksContainer);
    grid.appendChild(cardEl);
  });

  sectionEl.appendChild(grid);
  return sectionEl;
}

function buildFilterView(activeKeys) {
  const container = document.getElementById('filter-view');
  container.innerHTML = '';
  let sections;
  if (activeKeys.includes('all')) {
    sections = ALL_SECTIONS;
  } else {
    sections = ALL_SECTIONS.filter(s => {
      return activeKeys.some(key => {
        const pattern = FILTER_TYPE_MAP[key];
        return pattern && s.type.toLowerCase().startsWith(pattern.toLowerCase());
      });
    });
  }
  sections.forEach(section => container.appendChild(buildSection(section)));
}

function applyFilter(activeKeys, animate) {
  const filterView = document.getElementById('filter-view');
  buildFilterView(activeKeys || ['all']);
  filterView.classList.add('active');
}

// ===== GLOBAL CLICK OUTSIDE =====
document.addEventListener('click', function (e) {
  const settingsWrapper = document.querySelector('.settings-dropdown-wrapper');
  if (settingsWrapper && !settingsWrapper.contains(e.target)) closeSettingsDropdown();
  const filterWrapper = document.querySelector('.filter-dropdown-wrapper');
  if (filterWrapper && !filterWrapper.contains(e.target)) {
    document.getElementById('filter-dropdown').classList.remove('open');
    document.getElementById('filter-btn').classList.remove('dropdown-open');
  }
});

// ===== INIT =====
window.onload = function () {
  document.documentElement.classList.remove('light-mode-pre');

  const savedTheme = localStorage.getItem('medq_theme');
  if (savedTheme === 'light') { document.body.classList.add('light-mode'); updateSettingsThemeUI(true); }
  else { updateSettingsThemeUI(false); }

  restoreProfile();

  const savedFilter = JSON.parse(localStorage.getItem('medq_filter_v2') || 'null') || ['all'];
  applyFilter(savedFilter, false);
};
