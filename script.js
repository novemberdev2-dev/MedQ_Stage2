// ===== EARLY INIT (runs before DOM is ready) =====

// ----- PROTECTION: block the app from running when the file is saved
// locally and opened straight from disk (file:// protocol) -----
if (location.protocol === 'file:') {
  document.documentElement.classList.add('file-blocked');
  document.addEventListener('DOMContentLoaded', function () {
    document.body.innerHTML = '';
    var msg = document.createElement('div');
    msg.id = 'file-block-overlay';
    msg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;' +
      'justify-content:center;text-align:center;padding:24px;background:#0c0d0e;' +
      'color:#f1f5f9;font-family:Segoe UI,Roboto,sans-serif;z-index:99999;';
    msg.innerHTML = '<div><h2 style="margin:0 0 10px;font-size:1.2rem;">This app can\'t run from a local file</h2>' +
      '<p style="margin:0;opacity:0.7;font-size:0.9rem;">Please open it through its official website link instead.</p></div>';
    document.body.appendChild(msg);
  });
}

// ----- PROTECTION: disable print & save keyboard shortcuts -----
document.addEventListener('keydown', function (e) {
  const key = e.key ? e.key.toLowerCase() : '';
  const ctrlOrCmd = e.ctrlKey || e.metaKey;
  if (ctrlOrCmd && (key === 's' || key === 'p')) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
});

// ----- PROTECTION: catch printing triggered via the browser's Print menu -----
window.addEventListener('beforeprint', function () {
  document.title = 'Printing disabled';
});

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
const DEFAULT_IMG  = 'https://i.imgur.com/yR5Tpv8.png';
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
    key: 'ibs',
    cards: [
      { title: '2017-2018 Year Exam ✅', links: [
        { label: 'Past Paper or Quiz',   badge: '107 MCQs',    href: 'IBS_2017-2018.html' },
        
      ]},
      { title: '2018-2019 Year Exam ✅', links: [
        { label: 'End-Block',   badge: '8 MCQs',    href: 'IBS_End-Block_2018-2019.html' },
        { label: 'Final',   badge: '150 MCQs',    href: 'IBS_Final_2018-2019.html' },
        { label: 'Quiz', badge: '20 MCQs', href: 'IBS_Quiz_2018-2019.html' }

      ]},
      { title: '2020-2021 Year Exam', links: [
        { label: 'Final',   badge: '62 MCQs',     href: 'IBS_Final_2020-2021.html' },
        
      ]},
      { title: '2021-2022 Year Exam',   links: [
        { label: 'End-Block', badge: '30 MCQs', href: 'IBS_End-Module_2021-2022.html' },
        { label: 'Final', badge: '87 MCQs', href: 'IBS_Final_2021-2022.html' }

     ]},
     
       { title: '2022-2023 Year Exam',     links: [{ label: 'End-Block _ Practice', badge: '10 Questions',  href: 'IBS_Practical_exam_2022-2023.html' }] },


      { title: '2023-2024 Year Exam',     links: [
        { label: 'End-Block _ Theory', badge: '30 MCQs',  href: 'IBS_End-Block_Theory_2023-2024.html' },
        { label: 'End-Block _ Practice', badge: '10 Qs',  href: 'IBS_End-Block_Practice_2023-2024.html' },
        { label: 'Final', badge: '88 MCQs',  href: 'IBS_Final_2023-2024.html' },
 ] },


{ title: '2024-2025 Year Exam',     links: [
      { label: 'End-Block _ Theory', badge: '32 MCQs',  href: 'IBS_End-Block_2024-2025.html' },
      { label: 'Final', badge: '61 MCQs',  href: 'IBS_Final_2024-2025.html' }
    
    ] },
     { title: '2025-2026 Year Exam',     links: [
      { label: 'End-Block _ Theory', badge: '30 MCQs',  href: 'IBS_End-Block_2025-2026.html' },
      { label: 'Final', badge: '66 MCQs',  href: 'IBS_Final_2025-2026.html' }
    
    ] },

     { title: 'Unknown Year Exam',     links: [
      { label: 'Quiz', badge: '22 MCQs',  href: 'IBS_Quiz_Unkown year.html' },
    
    ] },
    ]
  },


  {
    type: 'Musculoskeletal System And Dermatology 🦴',
    key: 'msd',
    cards: [
     
     

      { title: '2021-2022 Year Exam',   links: [
        { label: 'Final _ 1st Term', badge: '38 MCQs', href: 'MSD_Final_2021-2022.html' },
        { label: 'Final _ 2nd Term', badge: '36 MCQs', href: 'MSD_Final2_2021-2022.html' },

     ]},
      { title: '2023-2024 Year Exam 🔥',   links: [
        { label: 'Practice', badge: '14 Qs', href: 'MSD_End_Block_Practice_2023-2024.html' },

     ]},
     


 { title: '2024-2025 Year Exam',     links: [
        { label: 'End-Block _ Theory', badge: '35 MCQs',  href: 'MSD_End-Block_Theory_2024-2025.html' },
        { label: 'End-Block _ Practice', badge: '14 Qs',  href: 'MSD_End-Block_Practice_2024-2025.html' },
        { label: 'Final', badge: '37 MCQs',  href: 'MSD_Final_2024-2025.html' },


      ] },


     { title: '2025-2026 Year Exam',     links: [
      { label: 'End-Block _ Theory', badge: '28 MCQs',  href: 'MSD_End-Block_Theory_2025-2026.html' },
      { label: 'End-Block _ Practice', badge: '10 Qs',  href: 'MSD_End-Block_Practice_2025-2026.html' },
      { label: 'Final', badge: '38 MCQs',  href: 'MSD_Final_2025-2026.html' }
      
    
    ] },

     { title: 'Unknown Year Exam',     links: [
      { label: 'Final', badge: '112 MCQs',  href: 'MSD_Final_Unknown Year.html' },
    
    ] },
    ]
  },

   {
    type: 'Hematopoetic 🩸',
    key: 'hp',
    cards: [
     
     

      { title: '2021-2022 Year Exam',   links: [
        { label: 'Final _ 1st Term', badge: '33 MCQs', href: 'HP_Final_2021-2022.html' },
        { label: 'Final _ 2nd Term', badge: '29 MCQs', href: 'HP_Final2_2021-2022.html' },

     ]},
      { title: '2023-2024 Year Exam',   links: [
        { label: 'Final', badge: '11 MCQs', href: 'HP_Final_2023-2024.html' },

     ]},
     


 { title: '2024-2025 Year Exam',     links: [
        { label: 'End-Block _ Theory', badge: '22 MCQs',  href: 'HP_End-Block_Theory_2024-2025.html' },
        { label: 'End-Block _ Practice', badge: '12 Qs',  href: 'HP_End-Block_Practice_2024-2025.html' },
        { label: 'Final', badge: '29 MCQs',  href: 'HP_Final_2024-2025.html' },


      ] },


     { title: '2025-2026 Year Exam',     links: [
      { label: 'End-Block _ Theory', badge: '27 MCQs',  href: 'HP_End-Block_Theory_2025-2026.html' },
      { label: 'End-Block _ Practice', badge: '12 Qs',  href: 'HP_End-Block_Practice_2025-2026.html' },
      { label: 'Final', badge: '31 MCQs',  href: 'HP_Final_2025-2026.html' }
    
    ] },

     { title: 'Unknown Year Exam',     links: [
      { label: 'Final', badge: '34 MCQs',  href: 'HP_Final_Unknown-Year.html' },
      { label: 'End-Block', badge: '0 MCQs',  href: 'HP_End-Block_Unknown-Year.html' },
    
    ] },
    ]
  },
  
  
   {
    type: 'Cardiovascular System 🫀',
    key: 'cvs',
    cards: [
     
      { title: '2018-2019 Year Exam', links: [
        { label: 'Final',   badge: '0 MCQs',    href: 'IBS_Final_2018-2019.html' },
        { label: 'Quiz', badge: '0 MCQs', href: 'IBS_Quiz_2018-2019.html' }

      ]},
      { title: '2020-2021 Year Exam ✅', links: [
        { label: 'Final',   badge: '42 MCQs',     href: 'CVS_Final_2020-2021.html' },
        
      ]},
      { title: '2021-2022 Year Exam 🔥',   links: [
        { label: 'Final', badge: '31 MCQs', href: 'CVS_Final_2021-2022.html' },

     ]},
      { title: '2023-2024 Year Exam 🔥',   links: [
        { label: 'Final', badge: '43 MCQs', href: 'CVS_Final_2023-2024.html' },
        { label: 'Final or End-Block', badge: '20 MCQs', href: 'CVS_FinalorEndblock_2023.2024.html' },


     ]},
     


 { title: '2024-2025 Year Exam 🔥',     links: [
        { label: 'End-Block _ Theory', badge: '35 MCQs',  href: 'CVS_End-Block_Theory_2024-2025.html' },
        { label: 'End-Block _ Practice', badge: '16 Qs',  href: 'CVS_End-Block_Practice_2024-2025.html' },
        { label: 'Final', badge: '47 MCQs',  href: 'CVS_Final_2024-2025.html' },


      ] },


     { title: '2025-2026 Year Exam 🔥',     links: [
      { label: 'End-Block _ Theory', badge: '29 MCQs',  href: 'CVS_End-Block_Theory_2025-2026.html' },
      { label: 'End-Block _ Practice', badge: '12 Qs',  href: 'CVS_End-Block_Practice_2025-2026.html' },
      { label: 'Final', badge: '54 MCQs',  href: 'CVS_Final_2025-2026.html' }
    
    ] },

     { title: 'Unknown Year Exam',     links: [
      { label: 'End-Block _ Theory', badge: '6 MCQs',  href: 'CVS_End-Block_Theory_Unkown Year.html' },
      { label: 'Final', badge: '44 MCQs',  href: 'CVS_Final_Unknown Year.html' },
      { label: 'Quiz', badge: '161 MCQs',  href: 'CVS_Quiz_Unknown Year.html' },
    
    ] },
    ]
  },

  
   {
    type: 'Respiratory System 🫁',
    key: 'rs',
    cards: [
     
     

      { title: '2021-2022 Year Exam',   links: [
        { label: 'Final _ 1st Term', badge: '44 MCQs', href: 'RS_Final_2021-2022.html' },
        { label: 'Final _ 2nd Term', badge: '38 MCQs', href: 'RS_Final2_2021-2022.html' },

     ]},

      { title: '2022-2023 Year Exam',   links: [
        { label: 'End-Block _ Practice', badge: '5 Qs', href: 'RS_End-Block_Practice_2022-2023.html' },
        { label: 'Final or End-Block', badge: '31 MCQs', href: 'RS_FinalorEndblock_2022-2023.html' },

      
     ]},


      { title: '2023-2024 Year Exam',   links: [
        { label: 'Final', badge: '25 MCQs', href: 'RS_Final_2023-2024.html' },
        { label: 'Final or End-Block', badge: '73 MCQs', href: 'RS_FinalorEndblock_2023-2024.html' },


     ]},
     


 { title: '2024-2025 Year Exam',     links: [
        { label: 'End-Block _ Theory', badge: '40 MCQs',  href: 'RS_End-Block_Theory_2024-2025.html' },
        { label: 'End-Block _ Practice', badge: '10 Qs',  href: 'RS_End-Block_Practice_2024-2025.html' },
        { label: 'Final', badge: '43 MCQs',  href: 'RS_Final_2024-2025.html' },


      ] },


     { title: '2025-2026 Year Exam',     links: [
      { label: 'End-Block _ Theory', badge: '30 MCQs',  href: 'RS_End-Block_Theory_2025-2026.html' },
      { label: 'End-Block _ Practice', badge: '10 Qs',  href: 'RS_End-Block_Practice_2025-2026.html' },
      { label: 'Final', badge: '49 MCQs',  href: 'RS_Final_2025-2026.html' }
    
    ] },

     { title: 'Unknown Year Exam',     links: [
      { label: 'Final', badge: '41 MCQs',  href: 'RS_Final_Unknown-Year.html' },
    
    ] },
    ]
  },
 


  

];

// ===== COLLAPSIBLE SECTIONS (persisted) =====
const CHEVRON_SVG = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z" fill="currentColor"></path></svg>';

function getCollapsedSections() {
  return JSON.parse(localStorage.getItem('medq_collapsed_sections') || '[]');
}

function setCollapsedSections(arr) {
  localStorage.setItem('medq_collapsed_sections', JSON.stringify(arr));
}

function toggleSection(key) {
  const wrapper   = document.getElementById(`gridwrap-${key}`);
  const sectionEl = document.getElementById(`section-${key}`);
  const btn       = document.getElementById(`toggle-${key}`);
  if (!wrapper || !sectionEl || !btn) return;

  const collapsed = getCollapsedSections();
  const idx = collapsed.indexOf(key);

  if (idx > -1) {
    // Currently hidden -> show cards again
    collapsed.splice(idx, 1);
    wrapper.classList.remove('collapsed');
    sectionEl.classList.remove('collapsed');
    btn.classList.remove('collapsed');
  } else {
    // Currently shown -> hide cards
    collapsed.push(key);
    wrapper.classList.add('collapsed');
    sectionEl.classList.add('collapsed');
    btn.classList.add('collapsed');
  }

  setCollapsedSections(collapsed);
}

// ===== BUILD FUNCTIONS =====
function buildSection(section) {
  const key = section.key || section.type;
  const isCollapsed = getCollapsedSections().includes(key);

  const sectionEl = document.createElement('div');
  sectionEl.className = 'section-container' + (isCollapsed ? ' collapsed' : '');
  sectionEl.id = `section-${key}`;

  const title = document.createElement('h2');
  title.className = 'category-title';

  const titleText = document.createElement('span');
  titleText.className = 'category-title-text';
  titleText.textContent = section.type;
  title.appendChild(titleText);

  const toggleBtn = document.createElement('span');
  toggleBtn.className = 'category-toggle-btn' + (isCollapsed ? ' collapsed' : '');
  toggleBtn.id = `toggle-${key}`;
  toggleBtn.title = 'Show/Hide cards';
  toggleBtn.innerHTML = CHEVRON_SVG;
  toggleBtn.onclick = (e) => { e.stopPropagation(); toggleSection(key); };
  title.appendChild(toggleBtn);

  sectionEl.appendChild(title);

  const gridWrap = document.createElement('div');
  gridWrap.className = 'subject-grid-wrap' + (isCollapsed ? ' collapsed' : '');
  gridWrap.id = `gridwrap-${key}`;

  const gridInner = document.createElement('div');
  gridInner.className = 'subject-grid-inner';

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
      span.onclick = () => location.href = link.href;
      linksContainer.appendChild(span);
    });
    cardEl.appendChild(linksContainer);
    grid.appendChild(cardEl);
  });

  gridInner.appendChild(grid);
  gridWrap.appendChild(gridInner);
  sectionEl.appendChild(gridWrap);
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
