/**
 * DramaPlayer - Main Application
 * 温暖复古唱片店风格播放器
 */

// ============================================
// Global State
// ============================================
const AppState = {
  dramas: [],
  circles: {},
  cvs: {},
  currentDrama: null,
  currentTrack: null,
  isPlaying: false,
  audio: new Audio(),
  filters: {
    search: '',
    circle: null,
    cv: null
  },
  unlockedDramas: new Set(JSON.parse(localStorage.getItem('dp_unlocked') || '[]'))
};

// ============================================
// DOM Elements
// ============================================
const DOM = {
  get dramaGrid() { return document.getElementById('drama-grid'); },
  get playerView() { return document.getElementById('player-view'); },
  get miniPlayer() { return document.getElementById('mini-player'); },
  get passwordModal() { return document.getElementById('password-modal'); },
  get searchInput() { return document.getElementById('search-input'); },
  get searchClear() { return document.getElementById('search-clear'); },
  get filterCircles() { return document.getElementById('filter-circles'); },
  get filterCvs() { return document.getElementById('filter-cvs'); },
  get sectionCount() { return document.getElementById('section-count'); }
};

// ============================================
// Icons (SVG)
// ============================================
const Icons = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`,
  skipBack: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>`,
  skipForward: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  unlock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  music: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  disc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`
};

// ============================================
// Initialization
// ============================================
async function init() {
  try {
    await loadData();
    renderFilters();
    renderDramas();
    setupEventListeners();
    setupAudioEvents();
  } catch (error) {
    console.error('Failed to initialize:', error);
    showError('データの読み込みに失敗しました');
  }
}

async function loadData() {
  const response = await fetch('data/dramas.json');
  if (!response.ok) throw new Error('Failed to load data');

  const data = await response.json();
  AppState.dramas = data.dramas;
  AppState.circles = data.circles;
  AppState.cvs = data.cvs;
}

// ============================================
// Rendering
// ============================================
function renderFilters() {
  // Circle filters
  const circleStats = {};
  AppState.dramas.forEach(drama => {
    circleStats[drama.circleId] = (circleStats[drama.circleId] || 0) + 1;
  });

  // 计算标签云大小等级 (1-5)
  const getTagSize = (count, maxCount) => {
    if (maxCount <= 1) return 3;
    const ratio = count / maxCount;
    if (ratio >= 0.8) return 5;
    if (ratio >= 0.5) return 4;
    if (ratio >= 0.3) return 3;
    if (ratio >= 0.1) return 2;
    return 1;
  };

  const circleEntries = Object.entries(circleStats);
  const maxCircleCount = Math.max(...circleEntries.map(([, c]) => c), 1);

  DOM.filterCircles.innerHTML = circleEntries
    .map(([id, count]) => {
      const circle = AppState.circles[id];
      const size = getTagSize(count, maxCircleCount);
      return `
        <button class="filter-tag tag-size-${size}" data-filter="circle" data-value="${id}">
          ${circle?.name || id}<span class="count">(${count})</span>
        </button>
      `;
    }).join('');

  // CV filters
  const cvStats = {};
  AppState.dramas.forEach(drama => {
    drama.cvIds.forEach(cvId => {
      cvStats[cvId] = (cvStats[cvId] || 0) + 1;
    });
  });

  const cvEntries = Object.entries(cvStats);
  const maxCvCount = Math.max(...cvEntries.map(([, c]) => c), 1);

  DOM.filterCvs.innerHTML = cvEntries
    .map(([id, count]) => {
      const cv = AppState.cvs[id];
      const size = getTagSize(count, maxCvCount);
      return `
        <button class="filter-tag tag-size-${size}" data-filter="cv" data-value="${id}">
          ${cv?.name || id}<span class="count">(${count})</span>
        </button>
      `;
    }).join('');
}

function renderDramas() {
  const filtered = filterDramas();

  DOM.sectionCount.textContent = `${filtered.length}作品`;

  if (filtered.length === 0) {
    DOM.dramaGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${Icons.disc}</div>
        <h3 class="empty-state-title">作品が見つかりません</h3>
        <p class="empty-state-text">検索条件を変更してください</p>
      </div>
    `;
    return;
  }

  DOM.dramaGrid.innerHTML = filtered.map(drama => {
    const isLocked = drama.password && !AppState.unlockedDramas.has(drama.id);
    const cvNames = drama.cv.slice(0, 2).join(', ') + (drama.cv.length > 2 ? '...' : '');

    return `
      <article class="drama-card" data-id="${drama.id}">
        <div class="drama-cover">
          ${drama.cover
            ? `<img src="${drama.cover}" alt="${drama.title}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="drama-cover-placeholder" style="display:none">${Icons.disc}</div>`
            : `<div class="drama-cover-placeholder">${Icons.disc}</div>`
          }
          <div class="drama-play-btn">${Icons.play}</div>
          ${isLocked ? `<div class="drama-lock-badge">${Icons.lock}</div>` : ''}
        </div>
        <div class="drama-info">
          <h3 class="drama-title">${drama.title}</h3>
          <div class="drama-circle" data-circle="${drama.circleId}">${AppState.circles[drama.circleId]?.name || drama.circle}</div>
          <div class="drama-meta">
            ${drama.cv.map((cv, i) => `
              <span class="drama-cv" data-cv="${drama.cvIds[i]}">${Icons.mic}${cv}</span>
            `).join('')}
            <span class="drama-tracks-count">${drama.tracks.length}曲</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function filterDramas() {
  return AppState.dramas.filter(drama => {
    // Search filter
    if (AppState.filters.search) {
      const query = AppState.filters.search.toLowerCase();
      const searchable = [
        drama.title,
        drama.titleJp,
        drama.circle,
        drama.productId || '',
        ...drama.cv,
        ...drama.tags
      ].join(' ').toLowerCase();

      if (!searchable.includes(query)) return false;
    }

    // Circle filter
    if (AppState.filters.circle && drama.circleId !== AppState.filters.circle) {
      return false;
    }

    // CV filter
    if (AppState.filters.cv && !drama.cvIds.includes(AppState.filters.cv)) {
      return false;
    }

    return true;
  });
}

function renderPlayerView(drama) {
  const playerContent = DOM.playerView.querySelector('.player-content');

  playerContent.innerHTML = `
    <div class="player-album">
      <div class="player-cover ${AppState.isPlaying ? 'playing' : ''}" id="player-cover">
        ${drama.cover
          ? `<img src="${drama.cover}" alt="${drama.title}">`
          : `<div class="drama-cover-placeholder">${Icons.disc}</div>`
        }
      </div>
      <h2 class="player-album-title">${drama.title}</h2>
      <div class="player-album-circle">${AppState.circles[drama.circleId]?.name || drama.circle}</div>
      <div class="player-album-cv">
        ${drama.cv.map(cv => `<span class="player-cv-tag">${cv}</span>`).join('')}
      </div>
    </div>
    <div class="player-tracks">
      <div class="player-tracks-header">
        <h3 class="player-tracks-title">トラックリスト</h3>
      </div>
      <div class="player-tracks-list" id="tracks-list">
        ${drama.tracks.map((track, index) => `
          <div class="track-item ${AppState.currentTrack?.id === track.id ? 'active' : ''}" data-track-id="${track.id}">
            <div class="track-number">
              <span class="track-num">${index + 1}</span>
              <div class="track-playing-icon">
                <span></span><span></span><span></span>
              </div>
            </div>
            <div class="track-info">
              <div class="track-title">${track.title}</div>
              ${track.titleZh ? `<div class="track-title-zh">${track.titleZh}</div>` : ''}
            </div>
            <div class="track-duration">${track.duration}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderMiniPlayer() {
  if (!AppState.currentDrama || !AppState.currentTrack) {
    DOM.miniPlayer.classList.remove('active');
    return;
  }

  const drama = AppState.currentDrama;
  const track = AppState.currentTrack;

  DOM.miniPlayer.innerHTML = `
    <div class="mini-player-cover">
      ${drama.cover
        ? `<img src="${drama.cover}" alt="${drama.title}">`
        : `<div class="drama-cover-placeholder">${Icons.disc}</div>`
      }
    </div>
    <div class="mini-player-info">
      <div class="mini-player-title">${track.title}</div>
      <div class="mini-player-album">${drama.title}</div>
    </div>
    <button class="mini-player-btn" id="mini-play-btn">
      ${AppState.isPlaying ? Icons.pause : Icons.play}
    </button>
    <button class="mini-player-close" id="mini-close-btn">
      ${Icons.close}
    </button>
  `;

  // Don't show mini player when player view is open
  if (!DOM.playerView.classList.contains('active')) {
    DOM.miniPlayer.classList.add('active');
  }
}

function updateAudioControls() {
  const currentTime = formatTime(AppState.audio.currentTime);
  const duration = formatTime(AppState.audio.duration || 0);
  const progress = AppState.audio.duration
    ? (AppState.audio.currentTime / AppState.audio.duration) * 100
    : 0;

  const timeCurrentEl = document.getElementById('time-current');
  const timeDurationEl = document.getElementById('time-duration');
  const progressFillEl = document.getElementById('progress-fill');
  const playBtnEl = document.getElementById('play-btn');
  const playerCoverEl = document.getElementById('player-cover');

  if (timeCurrentEl) timeCurrentEl.textContent = currentTime;
  if (timeDurationEl) timeDurationEl.textContent = duration;
  if (progressFillEl) progressFillEl.style.width = `${progress}%`;
  if (playBtnEl) playBtnEl.innerHTML = AppState.isPlaying ? Icons.pause : Icons.play;
  if (playerCoverEl) {
    playerCoverEl.classList.toggle('playing', AppState.isPlaying);
  }

  // Update mini player
  const miniPlayBtn = document.getElementById('mini-play-btn');
  if (miniPlayBtn) {
    miniPlayBtn.innerHTML = AppState.isPlaying ? Icons.pause : Icons.play;
  }

  // Update track list active state
  document.querySelectorAll('.track-item').forEach(item => {
    const isActive = item.dataset.trackId == AppState.currentTrack?.id;
    item.classList.toggle('active', isActive);
  });
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
  // Filter Toggle
  const filterToggle = document.getElementById('filter-toggle');
  const filterSection = document.querySelector('.filter-section');

  filterToggle?.addEventListener('click', () => {
    filterToggle.classList.toggle('active');
    filterSection?.classList.toggle('active');
  });

  // Breadcrumb clear buttons (use event delegation for dynamic content)
  document.getElementById('filter-breadcrumb')?.addEventListener('click', (e) => {
    const clearBtn = e.target.closest('.breadcrumb-item-clear');
    if (clearBtn) {
      const type = clearBtn.dataset.type;
      if (type) {
        AppState.filters[type] = null;
        // Update filter tag UI
        document.querySelectorAll(`.filter-tag[data-filter="${type}"]`).forEach(tag => {
          tag.classList.remove('active');
        });
        updateFilterBreadcrumb();
        renderDramas();
      }
    }
  });

  // Search
  DOM.searchInput.addEventListener('input', debounce((e) => {
    AppState.filters.search = e.target.value.trim();
    renderDramas();
  }, 300));

  DOM.searchClear.addEventListener('click', () => {
    DOM.searchInput.value = '';
    AppState.filters.search = '';
    renderDramas();
  });

  // Filter tags
  document.addEventListener('click', (e) => {
    const filterTag = e.target.closest('.filter-tag');
    if (filterTag) {
      const filterType = filterTag.dataset.filter;
      const filterValue = filterTag.dataset.value;

      // Toggle filter
      if (AppState.filters[filterType] === filterValue) {
        AppState.filters[filterType] = null;
        filterTag.classList.remove('active');
      } else {
        // Remove active from siblings
        document.querySelectorAll(`.filter-tag[data-filter="${filterType}"]`)
          .forEach(t => t.classList.remove('active'));

        AppState.filters[filterType] = filterValue;
        filterTag.classList.add('active');
      }

      updateFilterBreadcrumb();
      renderDramas();
    }
  });

  // Drama cards
  DOM.dramaGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.drama-card');
    if (!card) return;

    // Check if clicking on circle or CV
    const circleEl = e.target.closest('.drama-circle');
    const cvEl = e.target.closest('.drama-cv');

    if (circleEl) {
      e.stopPropagation();
      setFilter('circle', circleEl.dataset.circle);
      return;
    }

    if (cvEl) {
      e.stopPropagation();
      setFilter('cv', cvEl.dataset.cv);
      return;
    }

    const dramaId = card.dataset.id;
    openDrama(dramaId);
  });

  // Player view
  DOM.playerView.addEventListener('click', (e) => {
    // Back button
    if (e.target.closest('.player-back-btn')) {
      closePlayerView();
      return;
    }

    // Track item
    const trackItem = e.target.closest('.track-item');
    if (trackItem) {
      const trackId = parseInt(trackItem.dataset.trackId);
      playTrack(trackId);
      return;
    }

    // Audio controls
    if (e.target.closest('#play-btn')) {
      togglePlay();
      return;
    }

    if (e.target.closest('#prev-btn')) {
      playPrevTrack();
      return;
    }

    if (e.target.closest('#next-btn')) {
      playNextTrack();
      return;
    }

    if (e.target.closest('#skip-back-btn')) {
      seekRelative(-10);
      return;
    }

    if (e.target.closest('#skip-forward-btn')) {
      seekRelative(10);
      return;
    }
  });

  // Progress bar
  document.addEventListener('click', (e) => {
    const progressBar = e.target.closest('.progress-bar');
    if (progressBar && AppState.audio.duration) {
      const rect = progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      AppState.audio.currentTime = percent * AppState.audio.duration;
    }
  });

  // Mini player
  DOM.miniPlayer.addEventListener('click', (e) => {
    if (e.target.closest('#mini-play-btn')) {
      e.stopPropagation();
      togglePlay();
      return;
    }

    if (e.target.closest('#mini-close-btn')) {
      e.stopPropagation();
      closeMiniPlayer();
      return;
    }

    // Click on mini player opens player view
    if (AppState.currentDrama) {
      openPlayerView(AppState.currentDrama);
    }
  });

  // Password modal
  DOM.passwordModal.addEventListener('click', (e) => {
    if (e.target.closest('.password-cancel') || e.target === DOM.passwordModal) {
      closePasswordModal();
      return;
    }

    if (e.target.closest('.password-submit')) {
      submitPassword();
      return;
    }
  });

  const passwordInput = document.getElementById('password-input');
  if (passwordInput) {
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submitPassword();
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in input
    if (e.target.matches('input, textarea')) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        seekRelative(-10);
        break;
      case 'ArrowRight':
        seekRelative(10);
        break;
      case 'Escape':
        if (DOM.passwordModal.classList.contains('active')) {
          closePasswordModal();
        } else if (DOM.playerView.classList.contains('active')) {
          closePlayerView();
        }
        break;
    }
  });
}

function setupAudioEvents() {
  AppState.audio.addEventListener('timeupdate', () => {
    updateAudioControls();
    saveProgress();
  });

  AppState.audio.addEventListener('loadedmetadata', () => {
    updateAudioControls();
  });

  AppState.audio.addEventListener('play', () => {
    AppState.isPlaying = true;
    updateAudioControls();
    renderMiniPlayer();
  });

  AppState.audio.addEventListener('pause', () => {
    AppState.isPlaying = false;
    updateAudioControls();
    renderMiniPlayer();
  });

  AppState.audio.addEventListener('ended', () => {
    playNextTrack();
  });

  AppState.audio.addEventListener('error', (e) => {
    console.error('Audio error:', e);
    AppState.isPlaying = false;
    updateAudioControls();
  });
}

// ============================================
// Actions
// ============================================
function openDrama(dramaId) {
  const drama = AppState.dramas.find(d => d.id === dramaId);
  if (!drama) return;

  // Check if locked
  if (drama.password && !AppState.unlockedDramas.has(drama.id)) {
    openPasswordModal(drama);
    return;
  }

  AppState.currentDrama = drama;
  openPlayerView(drama);
}

function openPlayerView(drama) {
  renderPlayerView(drama);
  DOM.playerView.classList.add('active');
  DOM.miniPlayer.classList.remove('active');
  document.body.style.overflow = 'hidden';

  // Restore progress if same drama
  if (AppState.currentTrack && AppState.currentDrama.id === drama.id) {
    updateAudioControls();
  }
}

function closePlayerView() {
  DOM.playerView.classList.remove('active');
  document.body.style.overflow = '';

  // Show mini player if playing
  if (AppState.currentTrack) {
    renderMiniPlayer();
  }
}

function closeMiniPlayer() {
  AppState.audio.pause();
  AppState.currentTrack = null;
  DOM.miniPlayer.classList.remove('active');
}

function playTrack(trackId) {
  if (!AppState.currentDrama) return;

  const track = AppState.currentDrama.tracks.find(t => t.id === trackId);
  if (!track) return;

  AppState.currentTrack = track;
  AppState.audio.src = track.audioFile;

  // Try to restore progress
  const saved = getProgress(AppState.currentDrama.id, track.id);

  AppState.audio.play().then(() => {
    if (saved && saved.time > 10 && saved.time < AppState.audio.duration - 10) {
      AppState.audio.currentTime = saved.time;
    }
  }).catch(err => {
    console.error('Play failed:', err);
  });

  updateAudioControls();
  renderMiniPlayer();
}

function togglePlay() {
  if (!AppState.currentTrack) {
    // Play first track
    if (AppState.currentDrama?.tracks.length) {
      playTrack(AppState.currentDrama.tracks[0].id);
    }
    return;
  }

  if (AppState.isPlaying) {
    AppState.audio.pause();
  } else {
    AppState.audio.play().catch(console.error);
  }
}

function playPrevTrack() {
  if (!AppState.currentDrama || !AppState.currentTrack) return;

  const tracks = AppState.currentDrama.tracks;
  const currentIndex = tracks.findIndex(t => t.id === AppState.currentTrack.id);

  if (currentIndex > 0) {
    playTrack(tracks[currentIndex - 1].id);
  } else if (AppState.audio.currentTime > 3) {
    AppState.audio.currentTime = 0;
  }
}

function playNextTrack() {
  if (!AppState.currentDrama || !AppState.currentTrack) return;

  const tracks = AppState.currentDrama.tracks;
  const currentIndex = tracks.findIndex(t => t.id === AppState.currentTrack.id);

  if (currentIndex < tracks.length - 1) {
    playTrack(tracks[currentIndex + 1].id);
  } else {
    // End of playlist
    AppState.audio.pause();
    AppState.audio.currentTime = 0;
    updateAudioControls();
  }
}

function seekRelative(seconds) {
  if (!AppState.audio.duration) return;
  AppState.audio.currentTime = Math.max(0, Math.min(
    AppState.audio.duration,
    AppState.audio.currentTime + seconds
  ));
}

function setFilter(type, value) {
  // Set this filter without clearing other type
  AppState.filters[type] = value;
  AppState.filters.search = '';
  DOM.searchInput.value = '';

  // Update filter tag UI
  document.querySelectorAll('.filter-tag').forEach(tag => {
    tag.classList.toggle('active',
      (tag.dataset.filter === 'circle' && tag.dataset.value === AppState.filters.circle) ||
      (tag.dataset.filter === 'cv' && tag.dataset.value === AppState.filters.cv)
    );
  });

  updateFilterBreadcrumb();
  renderDramas();
}

function updateFilterBreadcrumb() {
  const breadcrumb = document.getElementById('filter-breadcrumb');
  const breadcrumbTag = document.getElementById('breadcrumb-tag');
  if (!breadcrumb || !breadcrumbTag) return;

  const { circle, cv } = AppState.filters;
  const parts = [];

  if (circle) {
    const circleName = AppState.circles[circle]?.name || circle;
    parts.push(`<span class="breadcrumb-item" data-type="circle"><span style="opacity:0.7">サークル:</span> ${circleName} <button class="breadcrumb-item-clear" data-type="circle">×</button></span>`);
  }
  if (cv) {
    const cvName = AppState.cvs[cv]?.name || cv;
    parts.push(`<span class="breadcrumb-item" data-type="cv"><span style="opacity:0.7">CV:</span> ${cvName} <button class="breadcrumb-item-clear" data-type="cv">×</button></span>`);
  }

  if (parts.length > 0) {
    breadcrumbTag.innerHTML = parts.join('<span class="breadcrumb-separator">+</span>');
    breadcrumb.style.display = 'flex';
  } else {
    breadcrumb.style.display = 'none';
  }
}

function clearFilter() {
  AppState.filters.circle = null;
  AppState.filters.cv = null;

  // Clear active state from filter tags
  document.querySelectorAll('.filter-tag').forEach(tag => {
    tag.classList.remove('active');
  });

  updateFilterBreadcrumb();
  renderDramas();
}

// ============================================
// Password System
// ============================================
let pendingDrama = null;

function openPasswordModal(drama) {
  pendingDrama = drama;

  const titleEl = DOM.passwordModal.querySelector('.password-subtitle');
  if (titleEl) {
    titleEl.textContent = `「${drama.title}」を開くにはパスワードが必要です`;
  }

  const input = document.getElementById('password-input');
  const errorEl = DOM.passwordModal.querySelector('.password-error');

  if (input) {
    input.value = '';
    input.classList.remove('error');
  }
  if (errorEl) {
    errorEl.classList.remove('visible');
  }

  DOM.passwordModal.classList.add('active');
  setTimeout(() => input?.focus(), 100);
}

function closePasswordModal() {
  DOM.passwordModal.classList.remove('active');
  pendingDrama = null;
}

function submitPassword() {
  if (!pendingDrama) return;

  const input = document.getElementById('password-input');
  const errorEl = DOM.passwordModal.querySelector('.password-error');
  const password = input?.value || '';

  if (password === pendingDrama.password) {
    // Unlock drama
    AppState.unlockedDramas.add(pendingDrama.id);
    localStorage.setItem('dp_unlocked', JSON.stringify([...AppState.unlockedDramas]));

    closePasswordModal();

    // Re-render to remove lock badge
    renderDramas();

    // Open the drama
    AppState.currentDrama = pendingDrama;
    openPlayerView(pendingDrama);
  } else {
    // Show error
    input?.classList.add('error');
    errorEl?.classList.add('visible');

    setTimeout(() => {
      input?.classList.remove('error');
    }, 500);
  }
}

// ============================================
// Progress System
// ============================================
function saveProgress() {
  if (!AppState.currentDrama || !AppState.currentTrack) return;
  if (!AppState.audio.duration || AppState.audio.currentTime < 5) return;

  const key = `dp_progress_${AppState.currentDrama.id}_${AppState.currentTrack.id}`;
  localStorage.setItem(key, JSON.stringify({
    time: AppState.audio.currentTime,
    savedAt: Date.now()
  }));
}

function getProgress(dramaId, trackId) {
  const key = `dp_progress_${dramaId}_${trackId}`;
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

// ============================================
// Utilities
// ============================================
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function showError(message) {
  DOM.dramaGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${Icons.close}</div>
      <h3 class="empty-state-title">エラー</h3>
      <p class="empty-state-text">${message}</p>
    </div>
  `;
}

// ============================================
// View Toggle (详细/封面模式)
// ============================================
const VIEWS = ['detail', 'cover'];

function initViewToggle() {
  const toggle = document.getElementById('view-toggle');
  const savedView = localStorage.getItem('dp_view') || 'detail';

  // 应用保存的视图模式
  applyView(savedView);

  // 切换按钮事件
  toggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-view') || 'detail';
    const currentIndex = VIEWS.indexOf(current);
    const nextIndex = (currentIndex + 1) % VIEWS.length;
    const newView = VIEWS[nextIndex];

    applyView(newView);
    localStorage.setItem('dp_view', newView);
  });
}

function applyView(view) {
  document.documentElement.setAttribute('data-view', view === 'detail' ? '' : view);
}

// ============================================
// Theme Toggle
// ============================================
const THEMES = ['light', 'kawaii'];
const THEME_COLORS = {
  light: '#c9bfb2',
  kawaii: '#fff5f8'
};

function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('dp_theme') || 'light';

  // 应用保存的主题
  applyTheme(savedTheme);

  // 切换按钮事件 - 循环切换：light → dark → kawaii → light
  toggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const currentIndex = THEMES.indexOf(current);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    const newTheme = THEMES[nextIndex];

    applyTheme(newTheme);
    localStorage.setItem('dp_theme', newTheme);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? '' : theme);
  updateThemeColor(theme);
}

function updateThemeColor(theme) {
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.light);
  }
}

// ============================================
// Start App
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initViewToggle();
  init(); // 直接初始化（Cloudflare Access 负责访问控制）
});
