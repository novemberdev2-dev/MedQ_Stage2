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

// ----- APP FEEL: block refreshing (keyboard + pull-to-refresh) -----
document.addEventListener('keydown', function (e) {
  const key = e.key ? e.key.toLowerCase() : '';
  const ctrlOrCmd = e.ctrlKey || e.metaKey;
  if (e.key === 'F5' || (ctrlOrCmd && key === 'r')) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}, true);

(function blockPullToRefresh() {
  let startY = 0;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) startY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - startY;
    const atTop = (window.pageYOffset || document.documentElement.scrollTop || 0) <= 0;
    if (atTop && dy > 0 && e.cancelable) e.preventDefault();   // pulling down at the very top = refresh gesture
  }, { passive: false });
})();

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
  nameInput.value  = (localStorage.getItem('medq_profile_name') || DEFAULT_NAME).slice(0, 12);
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
    closeModeDropdown();
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
    closeModeDropdown();
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
        { label: 'Past Paper or Quiz',   badge: '107 MCQs',    href: 'IBS/IBS_PastpaperorQuiz_2017-2018.html' },
        
      ]},
      { title: '2018-2019 Year Exam', links: [
        { label: 'End-Block',   badge: '8 MCQs',    href: 'IBS/IBS_End-Block_2018-2019.html' },
        { label: 'Final',   badge: '150 MCQs',    href: 'IBS/IBS_Final_2018-2019.html' },
        { label: 'Quiz', badge: '20 MCQs', href: 'IBS/IBS_Quiz_2018-2019.html' }

      ]},
      { title: '2020-2021 Year Exam', links: [
        { label: 'Final',   badge: '64 MCQs',     href: 'IBS/IBS_Final_2020-2021.html' },
        
      ]},
      { title: '2021-2022 Year Exam',   links: [
        { label: 'End-Block', badge: '30 MCQs', href: 'IBS/IBS_End-Block_2021-2022.html' },
        { label: 'Final', badge: '87 MCQs', href: 'IBS/IBS_Final_2021-2022.html' }

     ]},
     
       { title: '2022-2023 Year Exam',     links: [
        { label: 'End-Block _ Practice', badge: '10 Qs',  href: 'IBS/IBS_End-Block_Practice_2022-2023.html' },
        { label: 'Final', badge: '71 MCQs', href: 'IBS/IBS_Final_2022-2023.html' }
      
      ] },


      { title: '2023-2024 Year Exam',     links: [
        { label: 'End-Block _ Theory', badge: '30 MCQs',  href: 'IBS/IBS_End-Block_2023-2024.html' },
        { label: 'End-Block _ Practice', badge: '10 Qs',  href: 'IBS/IBS_End-Block_Practice_2023-2024.html' },
        { label: 'Final', badge: '88 MCQs',  href: 'IBS/IBS_Final_2023-2024.html' },
 ] },


{ title: '2024-2025 Year Exam',     links: [
      { label: 'End-Block _ Theory', badge: '32 MCQs',  href: 'IBS/IBS_End-Block_2024-2025.html' },
      { label: 'End-Block _ Practice', badge: '16 Qs',  href: 'IBS/IBS_End-Block_Practice_2024-2025.html' },
      { label: 'Final', badge: '61 MCQs',  href: 'IBS/IBS_Final_2024-2025.html' }
  
    
    ] },
     { title: '2025-2026 Year Exam',     links: [
      { label: 'End-Block _ Theory', badge: '30 MCQs',  href: 'IBS/IBS_End-Block_2025-2026.html' },
      { label: 'Final', badge: '66 MCQs',  href: 'IBS/IBS_Final_2025-2026.html' }
    
    ] },
       { title: '2026-2027 Year Exam',     links: [
      { label: 'End-Block _ Theory', badge: '20 MCQs',  href: 'IBS/IBS_End-Block_2026-2027.html' },
        { label: 'End-Block _ Practice', badge: '0 Qs',  href: '#' },
      { label: 'Quiz _ Theory', badge: '81 MCQs',  href: 'IBS/IBS_Quiz_2026-2027.html' },
      { label: 'Quiz _ Practice', badge: '9 Qs',  href: 'IBS/IBS_Quiz_Practice_2026-2027.html' },
     
      
    
    ] },

     { title: 'Unknown Year Exam',     links: [
      { label: 'Final or End-Block', badge: '36 MCQs',  href: 'IBS/IBS_Final_or_End-Block_Unknown-Year.html' },
      { label: 'Quiz', badge: '22 MCQs',  href: 'IBS/IBS_Quiz_Unknown-Year.html' },
     
       
    
    ] },
    ]
  },


  {
    type: 'Musculoskeletal System And Dermatology 🦴',
    key: 'msd',
    cards: [
     
     

      { title: '2021-2022 Year Exam',   links: [
        { label: 'Final _ 1st Term', badge: '38 MCQs', href: 'MSD/MSD_Final_2021-2022.html' },
        { label: 'Final _ 2nd Term', badge: '36 MCQs', href: 'MSD/MSD_Final2_2021-2022.html' },
 ]},
      
          { title: '2022-2023 Year Exam',   links: [
        { label: 'End-Block _ Practice', badge: '5 Qs', href: 'MSD/MSD_End-Block_Practice_2022-2023.html' },
        { label: 'Final or End-Block', badge: '31 MCQs', href: 'MSD/MSD_FinalorEnd-Block_2022-2023.html' },

      
     ]},
     
      { title: '2023-2024 Year Exam',   links: [
        { label: 'End-Block _ Practice', badge: '14 Qs', href: 'MSD/MSD_End-Block_Practice_2023-2024.html' },
        { label: 'Final', badge: '38 MCQs',  href: 'MSD/MSD_Final_2023-2024.html' },

     ]},
     


 { title: '2024-2025 Year Exam',     links: [
        { label: 'End-Block _ Theory', badge: '35 MCQs',  href: 'MSD/MSD_End-Block_2024-2025.html' },
        { label: 'End-Block _ Practice', badge: '14 Qs',  href: 'MSD/MSD_End-Block_Practice_2024-2025.html' },
        { label: 'Final', badge: '37 MCQs',  href: 'MSD/MSD_Final_2024-2025.html' },


      ] },


     { title: '2025-2026 Year Exam',     links: [
      { label: 'End-Block _ Theory', badge: '28 MCQs',  href: 'MSD/MSD_End-Block_2025-2026.html' },
      { label: 'End-Block _ Practice', badge: '10 Qs',  href: 'MSD/MSD_End-Block_Practice_2025-2026.html' },
      { label: 'Final', badge: '38 MCQs',  href: 'MSD/MSD_Final_2025-2026.html' }
      
    
    ] },

     { title: 'Unknown Year Exam',     links: [
      { label: 'Final', badge: '112 MCQs',  href: 'MSD/MSD_Final_Unknown-Year.html' },
    
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
      { label: 'Theory',   badge: '182 MCQs', href: 'IBS/IBS_Pharmacology.html' },
      { label: 'Practice', badge: '8 Qs', href: 'IBS/IBS_Pharmacology_Practice.html' }
    ] },
    { title: 'Pathology 🔬', links: [
      { label: 'Theory',   badge: '333 MCQs', href: 'IBS/IBS_Pathology.html' },
      { label: 'Practice', badge: '13 Qs', href: 'IBS/IBS_Pathology_Practice.html' }
    ] },
    { title: 'Biochemistry 🧪', links: [
      { label: 'Theory',   badge: '309 MCQs', href: 'IBS/IBS_Biochemistry.html' },
      { label: 'Practice', badge: '24 Qs', href: 'IBS/IBS_Biochemistry_Practice.html' }
    ] },
    { title: 'Micro-Immunity 🦠', links: [
      { label: 'Theory',   badge: '172 MCQs', href: 'IBS/IBS_Micro-Immunity.html' },
    
    ] },
    { title: 'Medical Education 📗', links: [
      { label: 'Theory',   badge: '6 MCQs', href: 'IBS/IBS_Medical Education.html' },
     
    ] },
     
  ],

msd: [

  { title: 'Pathology 🔬', links: [
      { label: 'Theory',   badge: '67 MCQs', href: 'MSD/MSD_Pathology.html' },
      { label: 'Practice', badge: '3 Qs', href: 'MSD/MSD_Pathology_Practice.html' }
    ] },
  
   { title: 'Pharmacology 💊', links: [
      { label: 'Theory',   badge: '63 MCQs', href: 'MSD/MSD_Pharmacology.html' },
      { label: 'Practice', badge: '3 Qs', href: 'MSD/MSD_Pharmacology_Practice.html' }
    ] },

    { title: 'Microbiology 🦠', links: [
      { label: 'Theory',   badge: '63 MCQs', href: 'MSD/MSD_Microbiology.html' },
      { label: 'Practice', badge: '15 Qs', href: 'MSD/MSD_Microbiology_Practice.html' }
    ] },
  
    { title: 'Anatomy 🦴', links: [
      { label: 'Theory',   badge: '37 MCQs', href: 'MSD/MSD_Anatomy.html' },
      { label: 'Practice', badge: '19 Qs', href: 'MSD/MSD_Anatomy_Practice.html' }
    ] },

    { title: 'Physiology ⚡', links: [
      { label: 'Theory',   badge: '24 MCQs', href: 'MSD/MSD_Physiology.html' },
      { label: 'Practice', badge: '2 Qs', href: 'MSD/MSD_Physiology_Practice.html' }
    ] },
   
  { title: 'Histology 🫁', links: [
      { label: 'Theory',   badge: '20 MCQs', href: 'MSD/MSD_Histology.html' },
      { label: 'Practice', badge: '1 Q', href: 'MSD/MSD_Histology_Practice.html' }
    ] },

  
  { title: 'Radiology 🩻', links: [
      { label: 'Theory',   badge: '46 MCQs', href: 'MSD/MSD_Radiology.html' }
    ] },
    { title: 'Biochemistry 🧪', links: [
      { label: 'Theory',   badge: '15 MCQs', href: 'MSD/MSD_Biochemistry.html' },
     
    ] },
  
  { title: 'Genetics 🧬', links: [
      { label: 'Theory',   badge: '10 MCQs', href: 'MSD/MSD_Genetics.html' }
    ] },
   { title: 'Medical-Education 📗', links: [
      { label: 'Theory',   badge: '8 MCQs', href: 'MSD/MSD_Medical-Education.html' }
    ] },

    { title: 'Dermatology ✨', links: [
      { label: 'Theory',   badge: '7 MCQs', href: 'MSD/MSD_Dermatology.html' }
    ] },

  

   { title: 'Embryology 👶', links: [
      { label: 'Theory',   badge: '6 MCQs', href: 'MSD/MSD_Embryology.html' }
    ] },

    { title: 'Immunology 🛡️', links: [
      { label: 'Theory',   badge: '5 MCQs', href: 'MSD/MSD_Immunology.html' }
    ] },
  
    { title: 'Bioethics ⚖️', links: [
      { label: 'Theory',   badge: '4 MCQs', href: 'MSD/MSD_Bioethics.html' }
    ] },

     { title: 'Rheumatology 🦴', links: [
      { label: 'Theory',   badge: '2 MCQs', href: 'MSD/MSD_Rheumatology.html' }
    ] },

    { title: 'Orthopedics 🦾', links: [
      { label: 'Theory',   badge: '2 MCQs', href: 'MSD/MSD_Orthopedics.html' }
    ] }
  ]
};

// ===== VIEW MODE (global: By Year / By Subject, set from the header) =====
function getViewMode() {
  return localStorage.getItem('medq_view_mode') === 'subject' ? 'subject' : 'year';
}

function setViewMode(mode) {
  localStorage.setItem('medq_view_mode', mode);
}

function renderModeOptions() {
  const mode = getViewMode();
  const y = document.getElementById('mode-opt-year');
  const sj = document.getElementById('mode-opt-subject');
  if (y)  y.classList.toggle('selected', mode === 'year');
  if (sj) sj.classList.toggle('selected', mode === 'subject');
}

function toggleModeDropdown() {
  const dropdown = document.getElementById('mode-dropdown');
  const btn = document.getElementById('mode-btn');
  if (dropdown.classList.contains('open')) {
    closeModeDropdown();
    return;
  }
  // close the other header dropdowns
  closeSettingsDropdown();
  document.getElementById('filter-dropdown').classList.remove('open');
  document.getElementById('filter-btn').classList.remove('dropdown-open');
  _pendingFilter = null;
  renderModeOptions();
  dropdown.classList.add('open');
  btn.classList.add('dropdown-open');
}

function closeModeDropdown() {
  const dropdown = document.getElementById('mode-dropdown');
  const btn = document.getElementById('mode-btn');
  if (dropdown) dropdown.classList.remove('open');
  if (btn) btn.classList.remove('dropdown-open');
}

function selectViewMode(mode) {
  setViewMode(mode);
  renderModeOptions();
  renderAllSectionCards();
  closeModeDropdown();
}

// "Not yet" block shown in the middle of a section that has no subject split yet
function buildNotYetBlock() {
  const el = document.createElement('div');
  el.className = 'not-yet-block';
  el.textContent = 'Not yet';
  return el;
}

// Fills one section's grid according to the current global mode
function fillSectionGrid(grid, section, noAnim) {
  const key  = section.key || section.type;
  const mode = getViewMode();
  grid.innerHTML = '';
  let cards;
  if (mode === 'subject') {
    cards = SUBJECT_CARDS_BY_SECTION[key];
    if (!cards) { grid.appendChild(buildNotYetBlock()); return; }
  } else {
    cards = section.cards;
  }
  // pinned cards go first (saved until the user unpins them)
  const pinned  = getPinnedCards();
  const keyOf   = c => cardPinKey(key, mode, c.title);
  const ordered = [...cards.filter(c => pinned.includes(keyOf(c))), ...cards.filter(c => !pinned.includes(keyOf(c)))];
  ordered.forEach((card, i) => grid.appendChild(buildCard(card, i, {
    pinKey: keyOf(card),
    noAnim: !!noAnim,
    onToggle: () => fillSectionGrid(grid, section, true)
  })));
}

// ===== PINNED CARDS (persisted) =====
const PIN_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.1218 1.87023C15.7573 0.505682 13.4779 0.76575 12.4558 2.40261L9.61062 6.95916C9.61033 6.95965 9.60913 6.96167 9.6038 6.96549C9.59728 6.97016 9.58336 6.97822 9.56001 6.9848C9.50899 6.99916 9.44234 6.99805 9.38281 6.97599C8.41173 6.61599 6.74483 6.22052 5.01389 6.87251C4.08132 7.22378 3.61596 8.03222 3.56525 8.85243C3.51687 9.63502 3.83293 10.4395 4.41425 11.0208L7.94975 14.5563L1.26973 21.2363C0.879206 21.6269 0.879206 22.26 1.26973 22.6506C1.66025 23.0411 2.29342 23.0411 2.68394 22.6506L9.36397 15.9705L12.8995 19.5061C13.4808 20.0874 14.2853 20.4035 15.0679 20.3551C15.8881 20.3044 16.6966 19.839 17.0478 18.9065C17.6998 17.1755 17.3043 15.5086 16.9444 14.5375C16.9223 14.478 16.9212 14.4114 16.9355 14.3603C16.9421 14.337 16.9502 14.3231 16.9549 14.3165C16.9587 14.3112 16.9606 14.31 16.9611 14.3098L21.5177 11.4645C23.1546 10.4424 23.4147 8.16307 22.0501 6.79853L17.1218 1.87023ZM14.1523 3.46191C14.493 2.91629 15.2528 2.8296 15.7076 3.28445L20.6359 8.21274C21.0907 8.66759 21.0041 9.42737 20.4584 9.76806L15.9019 12.6133C14.9572 13.2032 14.7469 14.3637 15.0691 15.2327C15.3549 16.0037 15.5829 17.1217 15.1762 18.2015C15.1484 18.2752 15.1175 18.3018 15.0985 18.3149C15.0743 18.3316 15.0266 18.3538 14.9445 18.3589C14.767 18.3699 14.5135 18.2916 14.3137 18.0919L5.82846 9.6066C5.62872 9.40686 5.55046 9.15333 5.56144 8.97583C5.56651 8.8937 5.58877 8.84605 5.60548 8.82181C5.61855 8.80285 5.64516 8.7719 5.71886 8.74414C6.79869 8.33741 7.91661 8.56545 8.68762 8.85128C9.55668 9.17345 10.7171 8.96318 11.3071 8.01845L14.1523 3.46191Z" fill="currentColor"></path></svg>`;
const UNPIN_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.1218 1.87023C15.7573 0.505682 13.4779 0.76575 12.4558 2.40261L9.75191 6.73289L11.1969 8.17793C11.2355 8.1273 11.2723 8.07415 11.3071 8.01845L14.1523 3.46191C14.493 2.91629 15.2528 2.8296 15.7076 3.28445L20.6359 8.21274C21.0907 8.66759 21.0041 9.42737 20.4584 9.76806L15.9019 12.6133C15.8462 12.6481 15.793 12.6848 15.7424 12.7234L17.1874 14.1684L21.5177 11.4645C23.1546 10.4424 23.4147 8.16307 22.0501 6.79852L17.1218 1.87023Z" fill="currentColor"></path><path d="M3.56525 8.85242C3.6015 8.26612 3.84962 7.68582 4.32883 7.27422L5.77735 8.72274C5.75784 8.72967 5.73835 8.7368 5.71886 8.74414C5.64516 8.7719 5.61855 8.80285 5.60548 8.82181C5.58877 8.84604 5.56651 8.8937 5.56144 8.97583C5.55046 9.15333 5.62872 9.40686 5.82846 9.6066L14.3137 18.0919C14.5135 18.2916 14.767 18.3699 14.9445 18.3589C15.0266 18.3538 15.0743 18.3316 15.0985 18.3149C15.1175 18.3018 15.1484 18.2752 15.1762 18.2015C15.1835 18.182 15.1907 18.1625 15.1976 18.143L16.6461 19.5915C16.2345 20.0707 15.6542 20.3188 15.0679 20.3551C14.2853 20.4035 13.4808 20.0874 12.8995 19.5061L9.36397 15.9705L2.68394 22.6506C2.29342 23.0411 1.66025 23.0411 1.26973 22.6506C0.879206 22.26 0.879206 21.6269 1.26973 21.2363L7.94975 14.5563L4.41425 11.0208C3.83293 10.4395 3.51687 9.63502 3.56525 8.85242Z" fill="currentColor"></path><path d="M2.00789 2.00786C1.61736 2.39838 1.61736 3.03155 2.00789 3.42207L20.5862 22.0004C20.9767 22.3909 21.6099 22.3909 22.0004 22.0004C22.391 21.6099 22.391 20.9767 22.0004 20.5862L3.4221 2.00786C3.03158 1.61733 2.39841 1.61733 2.00789 2.00786Z" fill="currentColor"></path></svg>`;
const PINNED_CARDS_KEY = 'medq_pinned_cards';

function getPinnedCards() {
  try { return JSON.parse(localStorage.getItem(PINNED_CARDS_KEY) || '[]') || []; } catch (e) { return []; }
}

function cardPinKey(sectionKey, mode, title) {
  return sectionKey + '|' + mode + '|' + title;
}

function togglePinnedCard(pinKey) {
  const list = getPinnedCards();
  const i = list.indexOf(pinKey);
  if (i > -1) list.splice(i, 1); else list.push(pinKey);
  try { localStorage.setItem(PINNED_CARDS_KEY, JSON.stringify(list)); } catch (e) {}
}

// Re-renders the cards of every visible section
function renderAllSectionCards() {
  ALL_SECTIONS.forEach(section => {
    const grid = document.getElementById('grid-' + (section.key || section.type));
    if (grid) fillSectionGrid(grid, section);
  });
}

function buildCard(card, index, opts) {
  opts = opts || {};
  const cardEl = document.createElement('div');
  cardEl.className = 'subject-card' + (opts.noAnim ? '' : ' card-pop');
  if (!opts.noAnim) cardEl.style.animationDelay = Math.min((index || 0) * 55, 440) + 'ms';
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

  if (opts.pinKey) {
    const isP = getPinnedCards().includes(opts.pinKey);
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'card-pin-btn';
    pin.dataset.pinned = String(isP);
    pin.title = isP ? 'Unpin card' : 'Pin card';
    pin.setAttribute('aria-label', pin.title);
    pin.innerHTML = isP ? UNPIN_SVG : PIN_SVG;
    pin.onclick = function (e) {
      e.stopPropagation();
      togglePinnedCard(opts.pinKey);
      if (opts.onToggle) opts.onToggle();
    };
    cardEl.appendChild(pin);
  }
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

  sectionEl.appendChild(title);

  const gridWrap = document.createElement('div');
  gridWrap.className = 'subject-grid-wrap';
  gridWrap.id = `gridwrap-${key}`;

  const gridInner = document.createElement('div');
  gridInner.className = 'subject-grid-inner';

  const grid = document.createElement('div');
  grid.className = 'subject-grid';
  grid.id = `grid-${key}`;

  fillSectionGrid(grid, section);

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
  const modeWrapper = document.querySelector('.mode-dropdown-wrapper');
  if (modeWrapper && !modeWrapper.contains(e.target)) closeModeDropdown();
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
  renderModeOptions();

  const savedFilter = JSON.parse(localStorage.getItem('medq_filter_v2') || 'null') || ['all'];
  applyFilter(savedFilter, false);
};

// ===== WARM-UP: pre-load the data of the linked pages in the background =====
// Quiz pages read the config of their sibling files (see tools.js). Doing that for the first time
// on a phone / tablet makes the page open late, so it is done here quietly while the person is
// still looking at the cards. Same cache key + format as tools.js ('medq_cfg_v1|' + absolute URL).
(function warmLinkedPages() {
  var PREFIX = 'medq_cfg_v1|';
  var MISSING = '\u0000missing';
  function run() {
    try {
      if (!window.fetch || !window.DOMParser) return;
      var c = navigator.connection;
      if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;   // don't spend data on slow / data-saver connections
      var urls = [], seen = {};
      ALL_SECTIONS.forEach(function (sec) {
        (sec.cards || []).forEach(function (card) {
          (card.links || []).forEach(function (l) {
            if (!l.href || l.href === '#') return;
            var abs;
            try { abs = new URL(encodeURI(l.href), location.href).href.split('#')[0]; } catch (e) { return; }
            if (seen[abs]) return;
            seen[abs] = 1;
            var have = null;
            try { have = localStorage.getItem(PREFIX + abs); } catch (e) {}
            if (have === null) urls.push(abs);
          });
        });
      });
      var i = 0;
      function next() {
        if (i >= urls.length) return;
        var url = urls[i++];
        fetch(url)
          .then(function (r) {
            if (r.status === 404 || r.status === 410) { try { localStorage.setItem(PREFIX + url, MISSING); } catch (e) {} return; }
            if (!r.ok) return;
            return r.text().then(function (t) {
              var doc = new DOMParser().parseFromString(t, 'text/html');
              var sc = Array.prototype.find.call(doc.querySelectorAll('script:not([src])'), function (x) { return x.textContent.indexOf('QUIZ_CONFIG') >= 0; });
              if (sc) { try { localStorage.setItem(PREFIX + url, sc.textContent); } catch (e) {} }
            });
          })
          .catch(function () {})
          .then(next);
      }
      next(); next();
    } catch (e) {}
  }
  function schedule() {
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 2500);
  }
  if (document.readyState === 'complete') schedule(); else window.addEventListener('load', function () { setTimeout(schedule, 800); });
})();

// ===== FIXED HEADER: reserve its height in the page =====
function updateHeaderHeight() {
  const header = document.querySelector('.main-header');
  if (!header) return;
  document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
}
document.addEventListener('DOMContentLoaded', function () {
  updateHeaderHeight();
  const header = document.querySelector('.main-header');
  if (header && window.ResizeObserver) new ResizeObserver(updateHeaderHeight).observe(header);
});
window.addEventListener('resize', updateHeaderHeight);
window.addEventListener('load', updateHeaderHeight);
