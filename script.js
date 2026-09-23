// ===== EARLY INIT (runs before DOM is ready) =====

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
      { title: '2017-2018 Year Exam', links: [
        { label: 'Past Paper or Quiz',   badge: '107 MCQs',    href: 'IBS_2017-2018.html' },
        
      ]},
      { title: '2018-2019 Year Exam', links: [
        { label: 'End-Block',   badge: '8 MCQs',    href: 'IBS_End-Block_2018-2019.html' },
        { label: 'Final',   badge: '150 MCQs',    href: 'IBS_Final_2018-2019.html' },
        { label: 'Quiz', badge: '20 MCQs', href: 'IBS_Quiz_2018-2019.html' }

      ]},
      { title: '2020-2021 Year Exam', links: [
        { label: 'Final',   badge: '64 MCQs',     href: 'IBS_Final_2020-2021.html' },
        
      ]},
      { title: '2021-2022 Year Exam',   links: [
        { label: 'End-Block', badge: '30 MCQs', href: 'IBS_End-Module_2021-2022.html' },
        { label: 'Final', badge: '87 MCQs', href: 'IBS_Final_2021-2022.html' }

     ]},
     
       { title: '2022-2023 Year Exam',     links: [
        { label: 'End-Block _ Practice', badge: '10 Qs',  href: 'IBS_Practical_exam_2022-2023.html' },
        { label: 'Final', badge: '70 MCQs', href: 'IBS_Final_2022-2023.html' }
      
      ] },


      { title: '2023-2024 Year Exam',     links: [
        { label: 'End-Block _ Theory', badge: '30 MCQs',  href: 'IBS_End-Block_Theory_2023-2024.html' },
        { label: 'End-Block _ Practice', badge: '10 Qs',  href: 'IBS_End-Block_Practice_2023-2024.html' },
        { label: 'Final', badge: '88 MCQs',  href: 'IBS_Final_2023-2024.html' },
 ] },


{ title: '2024-2025 Year Exam',     links: [
      { label: 'End-Block _ Theory', badge: '32 MCQs',  href: 'IBS_End-Block_2024-2025.html' },
      { label: 'End-Block _ Practice', badge: '16 Qs',  href: 'IBS_End-Block_Practice_2024-2025.html' },
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
      
          { title: '2022-2023 Year Exam',   links: [
        { label: 'End-Block _ Practice', badge: '5 Qs', href: 'MSD_End-Block_Practice_2022-2023.html' },
        { label: 'Final or End-Block', badge: '31 MCQs', href: 'MSD_FinalorEndblock_2022-2023.html' },

      
     ]},
     
      { title: '2023-2024 Year Exam',   links: [
        { label: 'End-Block _ Practice', badge: '14 Qs', href: 'MSD_End_Block_Practice_2023-2024.html' },
        { label: 'Final', badge: '38 MCQs',  href: 'MSD_Final_2023-2024.html' },

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
       { title: '2022-2023 Year Exam',   links: [

        { label: 'Final', badge: '44 MCQs', href: 'HP_Final_2022-2023.html' },

     ]},
     
      { title: '2023-2024 Year Exam',   links: [
        { label: 'End-Block _ Theory', badge: '20 MCQs',  href: 'HP_End-Block_Theory_2023-or-2024.html' },

        { label: 'Final', badge: '31 MCQs', href: 'HP_Final_2023-2024.html' },
        { label: 'Final or End-Block', badge: '11 MCQs', href: 'HP_FinalorEndblock_2023-2024.html' },

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
      { label: 'Final or End-Block', badge: '112 MCQs',  href: 'HP_FinalorEndblock_Unknown-Year.html' },
    
    ] },
    ]
  },
  
  
   {
    type: 'Cardiovascular System 🫀',
    key: 'cvs',
    cards: [
     
    
      { title: '2020-2021 Year Exam', links: [
        { label: 'Final',   badge: '42 MCQs',     href: 'CVS_Final_2020-2021.html' },
        
      ]},
      { title: '2021-2022 Year Exam',   links: [
        { label: 'Final', badge: '31 MCQs', href: 'CVS_Final_2021-2022.html' },

     ]},
      { title: '2023-2024 Year Exam',   links: [
        { label: 'Final', badge: '43 MCQs', href: 'CVS_Final_2023-2024.html' },
        { label: 'Final or End-Block', badge: '20 MCQs', href: 'CVS_FinalorEndblock_2023-2024.html' },


     ]},
     


 { title: '2024-2025 Year Exam',     links: [
        { label: 'End-Block _ Theory', badge: '35 MCQs',  href: 'CVS_End-Block_Theory_2024-2025.html' },
        { label: 'End-Block _ Practice', badge: '16 Qs',  href: 'CVS_End-Block_Practice_2024-2025.html' },
        { label: 'Final', badge: '47 MCQs',  href: 'CVS_Final_2024-2025.html' },


      ] },


     { title: '2025-2026 Year Exam',     links: [
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

  
      { title: '2023-2024 Year Exam',   links: [
        { label: 'Final', badge: '36 MCQs', href: 'RS_Finall_2023-2024.html' },
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
      { label: 'End-Block _ Theory', badge: '19 MCQs',  href: 'RS_End-Block_Theory_Unknown-Year.html' },

      { label: 'Final', badge: '41 MCQs',  href: 'RS_Final_Unknown-Year.html' },
      { label: 'Final or End-Block', badge: '57 MCQs',  href: 'RS_FinalorEndblock_Unknown-Year.html' },
       
    
    ] },
    ]
  },
 


  

];

// ===== SUBJECT MODE (per section) =====
// Sections that actually have subject cards ready. Others answer "Not yet".
const SUBJECT_CARDS_BY_SECTION = {
  ibs: [
    { title: 'Pharmacology 💊', links: [
      { label: 'Theory',   badge: '127 MCQs', href: 'IBS_Pharmacology.html' },
      { label: 'Practice', badge: '0 Qs', href: 'IBS_Pharmacology_Practice.html' }
    ] },
    { title: 'Pathology 🔬', links: [
      { label: 'Theory',   badge: '318 MCQs', href: 'IBS_Pathology.html' },
      { label: 'Practice', badge: '0 Qs', href: 'IBS_Pathology_Practice.html' }
    ] },
    { title: 'Biochemistry 🧪', links: [
      { label: 'Theory',   badge: '0 MCQs', href: 'IBS_Biochemistry_Theory.html' },
      { label: 'Practice', badge: '0 Qs', href: 'IBS_Biochemistry_Practice.html' }
    ] },
    { title: 'Micro-Immunity 🛡️', links: [
      { label: 'Theory',   badge: '112 MCQs', href: 'IBS_Micro-Immunity.html' },
      { label: 'Practice', badge: '0 Qs', href: 'IBS_Immunology_Practice.html' }
    ] },
    { title: 'Medical Education 📘', links: [
      { label: 'Theory',   badge: '0 MCQs', href: 'IBS_Medical_Education_Theory.html' },
      { label: 'Practice', badge: '0 Qs', href: 'IBS_Medical_Education_Practice.html' }
    ] }
  ]
};

function getSectionModes() {
  return JSON.parse(localStorage.getItem('medq_section_modes') || '{}');
}

function getSectionMode(key) {
  const m = getSectionModes()[key];
  return m === 'subject' ? 'subject' : 'year';
}

function setSectionMode(key, mode) {
  const modes = getSectionModes();
  modes[key] = mode;
  localStorage.setItem('medq_section_modes', JSON.stringify(modes));
}

// ----- the little FILTER box that the section chevron opens -----
const YEAR_ICON_SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19,4H17V3a1,1,0,0,0-2,0V4H9V3A1,1,0,0,0,7,3V4H5A3,3,0,0,0,2,7V19a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V7A3,3,0,0,0,19,4Zm1,15a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V12H20Zm0-9H4V7A1,1,0,0,1,5,6H7V7A1,1,0,0,0,9,7V6h6V7a1,1,0,0,0,2,0V6h2a1,1,0,0,1,1,1Z"/></svg>';
const SUBJECT_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 19V6.2C4 5.0799 4 4.51984 4.21799 4.09202C4.40973 3.71569 4.71569 3.40973 5.09202 3.21799C5.51984 3 6.0799 3 7.2 3H16.8C17.9201 3 18.4802 3 18.908 3.21799C19.2843 3.40973 19.5903 3.71569 19.782 4.09202C20 4.51984 20 5.0799 20 6.2V17H6C4.89543 17 4 17.8954 4 19ZM4 19C4 20.1046 4.89543 21 6 21H20M9 7H15M9 11H15M19 17V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const BOX_CLOSE_SVG = '<svg viewBox="0 0 12 12"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>';

function buildSectionFilterBox(key) {
  const box = document.createElement('div');
  box.className = 'section-filter-box';
  box.id = 'sfbox-' + key;
  box.onclick = (e) => e.stopPropagation();

  box.innerHTML = `
    <div class="section-filter-header">
      Filter
      <div class="settings-close-btn" data-close="1">${BOX_CLOSE_SVG}</div>
    </div>
    <div class="section-filter-list">
      <div class="filter-mode-option" data-mode="year">
        <span class="filter-mode-icon">${YEAR_ICON_SVG}</span>
        <span class="filter-mode-text">By Year</span>
        <span class="filter-mode-check"></span>
      </div>
      <div class="filter-mode-option" data-mode="subject">
        <span class="filter-mode-icon filter-mode-icon-stroke">${SUBJECT_ICON_SVG}</span>
        <span class="filter-mode-text">By Subject</span>
        <span class="filter-mode-check"></span>
      </div>
    </div>
    <div class="section-filter-note" id="sfnote-${key}">Not yet</div>
  `;

  box.querySelector('[data-close="1"]').onclick = () => closeSectionFilterBox(key);
  box.querySelectorAll('.filter-mode-option').forEach(opt => {
    opt.onclick = () => selectSectionMode(key, opt.getAttribute('data-mode'));
  });

  renderSectionFilterBox(key, box);
  return box;
}

function renderSectionFilterBox(key, boxEl) {
  const box = boxEl || document.getElementById('sfbox-' + key);
  if (!box) return;
  const mode = getSectionMode(key);
  box.querySelectorAll('.filter-mode-option').forEach(opt => {
    opt.classList.toggle('selected', opt.getAttribute('data-mode') === mode);
  });
}

function closeAllSectionFilterBoxes() {
  document.querySelectorAll('.section-filter-box.open').forEach(b => b.classList.remove('open'));
  document.querySelectorAll('.category-toggle-btn.box-open').forEach(b => b.classList.remove('box-open'));
  document.querySelectorAll('.section-filter-note.show').forEach(n => n.classList.remove('show'));
}

function closeSectionFilterBox(key) {
  const box = document.getElementById('sfbox-' + key);
  const btn = document.getElementById('toggle-' + key);
  if (box) box.classList.remove('open');
  if (btn) btn.classList.remove('box-open');
  const note = document.getElementById('sfnote-' + key);
  if (note) note.classList.remove('show');
}

function toggleSectionFilterBox(key) {
  const box = document.getElementById('sfbox-' + key);
  const btn = document.getElementById('toggle-' + key);
  if (!box) return;
  const isOpen = box.classList.contains('open');
  closeAllSectionFilterBoxes();
  closeSettingsDropdown();
  if (!isOpen) {
    renderSectionFilterBox(key);
    box.classList.add('open');
    if (btn) btn.classList.add('box-open');
  }
}

function selectSectionMode(key, mode) {
  const note = document.getElementById('sfnote-' + key);
  if (mode === 'subject' && !SUBJECT_CARDS_BY_SECTION[key]) {
    if (note) note.classList.add('show');   // "Not yet"
    return;
  }
  if (note) note.classList.remove('show');
  setSectionMode(key, mode);
  renderSectionFilterBox(key);
  renderSectionCards(key);
  closeSectionFilterBox(key);
}

// Re-renders just the cards of one section according to its current mode
function renderSectionCards(key) {
  const grid = document.getElementById('grid-' + key);
  if (!grid) return;
  const section = ALL_SECTIONS.find(s => (s.key || s.type) === key);
  const mode = getSectionMode(key);
  const cards = (mode === 'subject' && SUBJECT_CARDS_BY_SECTION[key])
    ? SUBJECT_CARDS_BY_SECTION[key]
    : (section ? section.cards : []);
  grid.innerHTML = '';
  cards.forEach(card => grid.appendChild(buildCard(card)));
}

function buildCard(card) {
  const cardEl = document.createElement('div');
  cardEl.className = 'subject-card';
  cardEl.innerHTML = `<div class="card-header"><h1>${card.title}</h1></div>`;
  const linksContainer = document.createElement('div');
  linksContainer.className = 'links-container';
  card.links.forEach(link => {
    const span = document.createElement('span');
    span.className = 'mcq-link';
    span.innerHTML = link.badge
      ? `${link.label} <span class="badge">${link.badge}</span>`
      : `${link.label}`;
    span.onclick = () => location.href = link.href;
    linksContainer.appendChild(span);
  });
  cardEl.appendChild(linksContainer);
  return cardEl;
}

// ===== COLLAPSIBLE SECTIONS (persisted) =====
const CHEVRON_SVG = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 6H19M21 12H16M21 18H16M7 20V13.5612C7 13.3532 7 13.2492 6.97958 13.1497C6.96147 13.0615 6.93151 12.9761 6.89052 12.8958C6.84431 12.8054 6.77934 12.7242 6.64939 12.5617L3.35061 8.43826C3.22066 8.27583 3.15569 8.19461 3.10948 8.10417C3.06849 8.02393 3.03853 7.93852 3.02042 7.85026C3 7.75078 3 7.64677 3 7.43875V5.6C3 5.03995 3 4.75992 3.10899 4.54601C3.20487 4.35785 3.35785 4.20487 3.54601 4.10899C3.75992 4 4.03995 4 4.6 4H13.4C13.9601 4 14.2401 4 14.454 4.10899C14.6422 4.20487 14.7951 4.35785 14.891 4.54601C15 4.75992 15 5.03995 15 5.6V7.43875C15 7.64677 15 7.75078 14.9796 7.85026C14.9615 7.93852 14.9315 8.02393 14.8905 8.10417C14.8443 8.19461 14.7793 8.27583 14.6494 8.43826L11.3506 12.5617C11.2207 12.7242 11.1557 12.8054 11.1095 12.8958C11.0685 12.9761 11.0385 13.0615 11.0204 13.1497C11 13.2492 11 13.3532 11 13.5612V17L7 20Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

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

  const sectionEl = document.createElement('div');
  sectionEl.className = 'section-container';
  sectionEl.id = `section-${key}`;

  const title = document.createElement('h2');
  title.className = 'category-title';

  const titleText = document.createElement('span');
  titleText.className = 'category-title-text';
  titleText.textContent = section.type;
  title.appendChild(titleText);

  const toggleBtn = document.createElement('span');
  toggleBtn.className = 'category-toggle-btn';
  toggleBtn.id = `toggle-${key}`;
  toggleBtn.title = 'Filter';
  toggleBtn.innerHTML = CHEVRON_SVG;
  toggleBtn.onclick = (e) => { e.stopPropagation(); toggleSectionFilterBox(key); };
  title.appendChild(toggleBtn);

  // the FILTER box lives inside the section header, under the chevron
  title.appendChild(buildSectionFilterBox(key));

  sectionEl.appendChild(title);

  const gridWrap = document.createElement('div');
  gridWrap.className = 'subject-grid-wrap';
  gridWrap.id = `gridwrap-${key}`;

  const gridInner = document.createElement('div');
  gridInner.className = 'subject-grid-inner';

  const grid = document.createElement('div');
  grid.className = 'subject-grid';
  grid.id = `grid-${key}`;

  const mode = getSectionMode(key);
  const cards = (mode === 'subject' && SUBJECT_CARDS_BY_SECTION[key])
    ? SUBJECT_CARDS_BY_SECTION[key]
    : section.cards;
  cards.forEach(card => grid.appendChild(buildCard(card)));

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
  if (!e.target.closest || !e.target.closest('.category-title')) closeAllSectionFilterBoxes();
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
