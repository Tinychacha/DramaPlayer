/**
 * TinyPlayer - Main Application
 * 温暖复古唱片店风格播放器
 */

// ============================================
// Configuration
// ============================================
const Config = {
  // R2 存储基础 URL（音频和封面）
  mediaBaseUrl: 'https://pub-4479f18f775b4579a79d5229aeafc322.r2.dev',

  // 本地媒体文件夹路径（本地开发时使用）
  localBasePath: 'media',

  // 是否使用 R2（false 时使用本地文件）
  useR2: true
};

/**
 * 获取媒体文件的完整 URL
 * @param {string} path - 相对路径，如 'tellmewhy/01.mp3'
 * @returns {string} 完整 URL
 */
function getMediaUrl(path) {
  if (!path) return '';
  if (Config.useR2 && Config.mediaBaseUrl) {
    // R2 模式：编码路径中的特殊字符（如空格），但保留斜杠
    const encodedPath = path.split('/').map(segment => encodeURIComponent(segment)).join('/');
    return `${Config.mediaBaseUrl}/${encodedPath}`;
  }
  // 本地模式：添加本地 base path
  if (Config.localBasePath) {
    return `${Config.localBasePath}/${path}`;
  }
  return path;
}

// ============================================
// Global State
// ============================================
const AppState = {
  dramas: [],
  circles: {},
  cvs: {},
  currentDrama: null,      // 当前查看的作品（详情页）
  currentTrack: null,       // 当前播放的 track
  playingDramaId: null,     // 正在播放的作品 ID（用于跨作品切换检测）
  isPlaying: false,
  audio: new Audio(),
  filters: {
    search: '',
    circle: null,
    cv: null
  },
  sort: localStorage.getItem('dp_sort') || 'newest',
  ratings: JSON.parse(localStorage.getItem('dp_ratings') || '{}'),
  unlockedDramas: new Set(JSON.parse(localStorage.getItem('dp_unlocked') || '[]')),
  // Subtitle System
  subtitles: [],
  currentSubtitle: null,
  subtitleEnabled: JSON.parse(localStorage.getItem('dp_subtitle_enabled') ?? 'true'),
  // Playback Speed
  playbackSpeed: parseFloat(localStorage.getItem('dp_playback_speed')) || 1.0
};

// ============================================
// DOM Elements
// ============================================
const DOM = {
  get dramaGrid() { return document.getElementById('drama-grid'); },
  get detailView() { return document.getElementById('detail-view'); },
  get playerView() { return document.getElementById('player-view'); },
  get tracklistPanel() { return document.getElementById('tracklist-panel'); },
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
  disc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,

  // 昭和喫茶店风格 - 复古咖啡杯
  coffeeEmpty: `<svg viewBox="0 0 24 24" class="rating-icon rating-empty">
    <path d="M5 9h12a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-1a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M17 11h1.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H17" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M6 20h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path class="steam steam-1" d="M8 6c0-1 .5-2 1.5-2s1.5 1 1.5 2" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
    <path class="steam steam-2" d="M12 5c0-1.5.5-2.5 1.5-2.5s1.5 1 1.5 2.5" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.3"/>
  </svg>`,
  coffeeFilled: `<svg viewBox="0 0 24 24" class="rating-icon rating-filled">
    <defs>
      <linearGradient id="coffeeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:var(--rating-fill-top)"/>
        <stop offset="100%" style="stop-color:var(--rating-fill-bottom)"/>
      </linearGradient>
    </defs>
    <path d="M5 9h12a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-1a2 2 0 0 1 2-2z" fill="url(#coffeeGrad)" stroke="currentColor" stroke-width="1.5"/>
    <path d="M17 11h1.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H17" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M6 20h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path class="steam steam-1" d="M8 6c0-1 .5-2 1.5-2s1.5 1 1.5 2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <path class="steam steam-2" d="M12 5c0-1.5.5-2.5 1.5-2.5s1.5 1 1.5 2.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  // 樱花可爱风格 - 精致五瓣樱花（带缺口的心形花瓣）
  sakuraEmpty: `<svg viewBox="0 0 24 24" class="rating-icon rating-empty">
    <g transform="translate(12,12)">
      <path class="petal" d="M0,-9 C-2.5,-9 -4,-7 -4,-5 C-4,-2.5 -2,0 0,1 C2,0 4,-2.5 4,-5 C4,-7 2.5,-9 0,-9 M0,-7.5 C0,-7.5 0,-7.5 0,-7.5" transform="rotate(0)" fill="none" stroke="currentColor" stroke-width="1"/>
      <path class="petal" d="M0,-9 C-2.5,-9 -4,-7 -4,-5 C-4,-2.5 -2,0 0,1 C2,0 4,-2.5 4,-5 C4,-7 2.5,-9 0,-9 M0,-7.5 C0,-7.5 0,-7.5 0,-7.5" transform="rotate(72)" fill="none" stroke="currentColor" stroke-width="1"/>
      <path class="petal" d="M0,-9 C-2.5,-9 -4,-7 -4,-5 C-4,-2.5 -2,0 0,1 C2,0 4,-2.5 4,-5 C4,-7 2.5,-9 0,-9 M0,-7.5 C0,-7.5 0,-7.5 0,-7.5" transform="rotate(144)" fill="none" stroke="currentColor" stroke-width="1"/>
      <path class="petal" d="M0,-9 C-2.5,-9 -4,-7 -4,-5 C-4,-2.5 -2,0 0,1 C2,0 4,-2.5 4,-5 C4,-7 2.5,-9 0,-9 M0,-7.5 C0,-7.5 0,-7.5 0,-7.5" transform="rotate(216)" fill="none" stroke="currentColor" stroke-width="1"/>
      <path class="petal" d="M0,-9 C-2.5,-9 -4,-7 -4,-5 C-4,-2.5 -2,0 0,1 C2,0 4,-2.5 4,-5 C4,-7 2.5,-9 0,-9 M0,-7.5 C0,-7.5 0,-7.5 0,-7.5" transform="rotate(288)" fill="none" stroke="currentColor" stroke-width="1"/>
    </g>
    <circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1"/>
  </svg>`,
  sakuraFilled: `<svg viewBox="0 0 24 24" class="rating-icon rating-filled">
    <defs>
      <radialGradient id="kawaiiPetal" cx="30%" cy="20%" r="80%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="40%" stop-color="#FFCDD6"/>
        <stop offset="100%" stop-color="#FF8BA7"/>
      </radialGradient>
      <radialGradient id="kawaiiCenter" cx="30%" cy="30%" r="60%">
        <stop offset="0%" stop-color="#FFF9C4"/>
        <stop offset="100%" stop-color="#FFCC02"/>
      </radialGradient>
      <filter id="kawaiiGlow">
        <feGaussianBlur stdDeviation="0.6" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <g filter="url(#kawaiiGlow)">
      <!-- Q版圆润花瓣 -->
      <ellipse cx="12" cy="5" rx="3.8" ry="4.5" fill="url(#kawaiiPetal)" stroke="#FF7DAA" stroke-width="0.5"/>
      <ellipse cx="12" cy="5" rx="3.8" ry="4.5" fill="url(#kawaiiPetal)" stroke="#FF7DAA" stroke-width="0.5" transform="rotate(72 12 12)"/>
      <ellipse cx="12" cy="5" rx="3.8" ry="4.5" fill="url(#kawaiiPetal)" stroke="#FF7DAA" stroke-width="0.5" transform="rotate(144 12 12)"/>
      <ellipse cx="12" cy="5" rx="3.8" ry="4.5" fill="url(#kawaiiPetal)" stroke="#FF7DAA" stroke-width="0.5" transform="rotate(216 12 12)"/>
      <ellipse cx="12" cy="5" rx="3.8" ry="4.5" fill="url(#kawaiiPetal)" stroke="#FF7DAA" stroke-width="0.5" transform="rotate(288 12 12)"/>
      <!-- 圆润花蕊 -->
      <circle cx="12" cy="12" r="3.5" fill="url(#kawaiiCenter)" stroke="#FFB347" stroke-width="0.5"/>
      <!-- 高光 -->
      <circle cx="10.8" cy="11" r="1.2" fill="white" opacity="0.5"/>
    </g>
  </svg>`
};

// ============================================
// Initialization
// ============================================
async function init() {
  try {
    // 先显示骨架屏
    renderSkeletons();

    await loadData();
    renderFilters();
    initSort();
    renderDramas();
    setupEventListeners();
    setupAudioEvents();
    initSubtitleToggle();
    initPlaybackSpeed();
    initScriptPanel();
    initRecentPlayButton();
  } catch (error) {
    console.error('Failed to initialize:', error);
    showError('データの読み込みに失敗しました');
  }
}

/**
 * Initialize recent play button (now uses history panel)
 */
function initRecentPlayButton() {
  // History panel handles the button click now
  initHistoryPanel();
}

/**
 * Render skeleton loading cards
 */
function renderSkeletons(count = 6) {
  const skeletonHTML = Array(count).fill(null).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-cover"></div>
      <div class="skeleton-info">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-circle"></div>
        <div class="skeleton-meta">
          <div class="skeleton-line skeleton-tag"></div>
          <div class="skeleton-line skeleton-tag"></div>
        </div>
      </div>
    </div>
  `).join('');

  DOM.dramaGrid.innerHTML = skeletonHTML;
}

/**
 * Initialize subtitle toggle button state
 */
function initSubtitleToggle() {
  const toggleBtn = document.getElementById('subtitle-toggle');
  if (toggleBtn && AppState.subtitleEnabled) {
    toggleBtn.classList.add('active');
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
            ? `<img src="${getMediaUrl(drama.cover)}" alt="${drama.title}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
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
  let filtered = AppState.dramas.filter(drama => {
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

  // Sort
  filtered = sortDramas(filtered);

  return filtered;
}

/**
 * Get latest play time for a drama (across all tracks)
 */
function getLatestPlayTime(drama) {
  let latest = 0;
  for (const track of drama.tracks) {
    const progress = getProgress(drama.id, track.id);
    if (progress && progress.savedAt > latest) {
      latest = progress.savedAt;
    }
  }
  return latest;
}

/**
 * Sort dramas based on current sort setting
 */
function sortDramas(dramas) {
  const sorted = [...dramas];

  switch (AppState.sort) {
    case 'newest':
      // 按发布日期降序（最新在前）
      sorted.sort((a, b) => {
        const dateA = a.releaseDate || '1970-01-01';
        const dateB = b.releaseDate || '1970-01-01';
        return dateB.localeCompare(dateA);
      });
      break;

    case 'oldest':
      // 按发布日期升序（最旧在前）
      sorted.sort((a, b) => {
        const dateA = a.releaseDate || '1970-01-01';
        const dateB = b.releaseDate || '1970-01-01';
        return dateA.localeCompare(dateB);
      });
      break;

    case 'name':
      // 按 titleJp 假名排序（あいうえお顺）
      sorted.sort((a, b) => {
        const nameA = a.titleJp || a.title || '';
        const nameB = b.titleJp || b.title || '';
        return nameA.localeCompare(nameB, 'ja');
      });
      break;

    case 'rating':
      // 按评分降序（最高在前），未评分的放最后
      sorted.sort((a, b) => {
        const ratingA = AppState.ratings[a.id] || 0;
        const ratingB = AppState.ratings[b.id] || 0;
        if (ratingA === ratingB) {
          // 同评分按日期排序
          const dateA = a.releaseDate || '1970-01-01';
          const dateB = b.releaseDate || '1970-01-01';
          return dateB.localeCompare(dateA);
        }
        return ratingB - ratingA;
      });
      break;

    case 'recent':
      // 按最近播放时间降序（最近播放在前），未播放的放最后
      sorted.sort((a, b) => {
        const timeA = getLatestPlayTime(a);
        const timeB = getLatestPlayTime(b);
        if (timeA === 0 && timeB === 0) {
          // 都没播放过，按日期排序
          const dateA = a.releaseDate || '1970-01-01';
          const dateB = b.releaseDate || '1970-01-01';
          return dateB.localeCompare(dateA);
        }
        if (timeA === 0) return 1;  // a没播放过，排后面
        if (timeB === 0) return -1; // b没播放过，排后面
        return timeB - timeA; // 时间戳降序
      });
      break;
  }

  return sorted;
}

/**
 * Render Detail View - 作品详情页
 */
function renderDetailView(drama) {
  const detailContent = DOM.detailView.querySelector('.detail-content');
  const currentRating = AppState.ratings[drama.id] || 0;

  // Check if any track has saved progress (not completed)
  const hasProgress = drama.tracks.some(track => {
    const saved = getProgress(drama.id, track.id);
    return saved && saved.time > 0 && !saved.completed;
  });
  // Check if all tracks are completed
  const allCompleted = drama.tracks.every(track => {
    const saved = getProgress(drama.id, track.id);
    return saved && saved.completed;
  });
  const playBtnText = hasProgress ? '続きから' : (allCompleted ? '最初から' : '再生する');

  detailContent.innerHTML = `
    <div class="detail-hero">
      <div class="detail-cover">
        ${drama.cover
          ? `<img src="${getMediaUrl(drama.cover)}" alt="${drama.title}">`
          : `<div class="detail-cover-placeholder">${Icons.disc}</div>`
        }
      </div>
      <div class="detail-info">
        <h1 class="detail-title">${drama.title}</h1>
        <div class="detail-circle">${AppState.circles[drama.circleId]?.name || drama.circle}</div>
        <div class="detail-cv-list">
          ${drama.cv.map(cv => `<span class="detail-cv-tag">${Icons.mic} ${cv}</span>`).join('')}
        </div>
        <div class="detail-rating" data-drama-id="${drama.id}">
          ${renderStars(currentRating)}
        </div>
        <div class="detail-actions">
          <button class="detail-play-all-btn" id="play-all-btn">
            ${Icons.play} ${playBtnText}
          </button>
        </div>
      </div>
    </div>
    <div class="detail-tracks">
      <div class="detail-tracks-header">
        <h3 class="detail-tracks-title">トラックリスト (${drama.tracks.length}曲)</h3>
      </div>
      <div class="detail-tracks-list" id="detail-tracks-list">
        ${drama.tracks.map((track, index) => {
          const saved = getProgress(drama.id, track.id);
          const isCompleted = saved && saved.completed;
          const hasProgress = saved && saved.time > 0 && !isCompleted;

          return `
          <div class="detail-track-item ${AppState.currentTrack?.id === track.id ? 'active' : ''}" data-track-id="${track.id}">
            <div class="detail-track-number">${index + 1}</div>
            <div class="detail-track-info">
              <div class="detail-track-title">${track.title}</div>
              ${track.titleZh ? `<div class="detail-track-title-zh">${track.titleZh}</div>` : ''}
            </div>
            ${isCompleted ? `<span class="detail-track-completed">再生済み</span>` : ''}
            ${hasProgress ? `<span class="detail-track-resume">続き ${formatTime(saved.time)}</span>` : ''}
            <div class="detail-track-duration">${track.duration}</div>
          </div>
        `}).join('')}
      </div>
    </div>
  `;
}

/**
 * Render Player View - 专注播放模式（当前单曲）
 */
function renderPlayerView() {
  if (!AppState.currentDrama || !AppState.currentTrack) return;

  const drama = AppState.currentDrama;
  const track = AppState.currentTrack;
  const playerMain = DOM.playerView.querySelector('.player-main');

  playerMain.innerHTML = `
    <div class="player-current">
      <h2 class="player-track-title">${track.title}</h2>
      <div class="player-album-name">${drama.title}</div>
      <div class="player-cover-large ${AppState.isPlaying ? 'playing' : ''}" id="player-cover">
        ${drama.cover
          ? `<img src="${getMediaUrl(drama.cover)}" alt="${drama.title}">`
          : `<div class="drama-cover-placeholder">${Icons.disc}</div>`
        }
      </div>
    </div>
  `;
}

/**
 * Render Tracklist Panel - 侧边栏曲目列表
 */
function renderTracklistPanel() {
  if (!AppState.currentDrama) return;

  const panelContent = DOM.tracklistPanel.querySelector('.tracklist-panel-content');

  panelContent.innerHTML = AppState.currentDrama.tracks.map((track, index) => `
    <div class="track-item ${AppState.currentTrack?.id === track.id ? 'active' : ''}" data-track-id="${track.id}">
      <div class="track-number">${index + 1}</div>
      <div class="track-info">
        <div class="track-title">${track.title}</div>
      </div>
      <div class="track-duration">${track.duration}</div>
    </div>
  `).join('');
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
        ? `<img src="${getMediaUrl(drama.cover)}" alt="${drama.title}">`
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

  // Don't show mini player when player view or detail view is open
  if (!DOM.playerView.classList.contains('active') && !DOM.detailView.classList.contains('active')) {
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

  // Sort dropdown
  const sortBtn = document.getElementById('sort-btn');
  const sortMenu = document.getElementById('sort-menu');

  sortBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    sortMenu?.classList.toggle('active');
  });

  sortMenu?.addEventListener('click', (e) => {
    const option = e.target.closest('.sort-option');
    if (option) {
      const sortValue = option.dataset.sort;
      setSort(sortValue);
      sortMenu.classList.remove('active');
    }
  });

  // Close sort menu when clicking outside
  document.addEventListener('click', () => {
    sortMenu?.classList.remove('active');
  });

  // Detail view events
  DOM.detailView.addEventListener('click', (e) => {
    // Back button
    if (e.target.closest('.detail-back-btn')) {
      closeDetailView();
      return;
    }

    // Play all button
    if (e.target.closest('#play-all-btn')) {
      playAllTracks();
      return;
    }

    // Star rating
    const starBtn = e.target.closest('.rating-btn');
    if (starBtn) {
      const rating = parseInt(starBtn.dataset.star);
      const ratingContainer = starBtn.closest('.detail-rating');
      const dramaId = ratingContainer?.dataset.dramaId;
      if (dramaId) {
        setRating(dramaId, rating);
      }
      return;
    }

    // Track item
    const trackItem = e.target.closest('.detail-track-item');
    if (trackItem) {
      const trackId = parseInt(trackItem.dataset.trackId);
      playTrack(trackId);
      return;
    }
  });

  // Player view
  DOM.playerView.addEventListener('click', (e) => {
    // Back button
    if (e.target.closest('.player-back-btn')) {
      closePlayerView();
      return;
    }

    // Tracklist toggle button
    if (e.target.closest('#tracklist-toggle')) {
      toggleTracklistPanel();
      return;
    }

    // Tracklist panel close button
    if (e.target.closest('.tracklist-panel-close')) {
      toggleTracklistPanel();
      return;
    }

    // Track item in tracklist panel
    const trackItem = e.target.closest('.player-tracklist-panel .track-item');
    if (trackItem) {
      const trackId = parseInt(trackItem.dataset.trackId);
      playTrack(trackId, false); // Don't re-open player view
      renderTracklistPanel(); // Update panel to show new active track
      renderPlayerView(); // Update main display
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

    if (e.target.closest('#subtitle-toggle')) {
      toggleSubtitle();
      return;
    }

    if (e.target.closest('#speed-toggle')) {
      cyclePlaybackSpeed();
      return;
    }
  });

  // Click overlay to close tracklist panel
  DOM.tracklistPanel.addEventListener('click', (e) => {
    // If clicking on the overlay (::before pseudo element area)
    if (e.target === DOM.tracklistPanel) {
      toggleTracklistPanel();
    }
  });

  // Progress bar - click and drag functionality
  const progressBar = document.getElementById('progress-bar');
  const progressPreview = document.getElementById('progress-preview');
  let isDragging = false;

  function updatePreviewPosition(e, bar) {
    if (!AppState.audio.duration) return;

    const rect = bar.getBoundingClientRect();
    let clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));

    const previewTime = percent * AppState.audio.duration;
    progressPreview.textContent = formatTime(previewTime);

    // Position the preview tooltip
    const previewLeft = percent * rect.width;
    progressPreview.style.left = `${previewLeft}px`;
  }

  // Mouse events
  progressBar.addEventListener('mousedown', (e) => {
    if (!AppState.audio.duration) return;
    isDragging = true;
    progressBar.classList.add('dragging');
    updatePreviewPosition(e, progressBar);
  });

  progressBar.addEventListener('mousemove', (e) => {
    updatePreviewPosition(e, progressBar);
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging && AppState.audio.duration) {
      const rect = progressBar.getBoundingClientRect();
      let percent = (e.clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));

      // Update fill position during drag
      document.getElementById('progress-fill').style.width = `${percent * 100}%`;
      updatePreviewPosition(e, progressBar);
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (isDragging && AppState.audio.duration) {
      const rect = progressBar.getBoundingClientRect();
      let percent = (e.clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));
      AppState.audio.currentTime = percent * AppState.audio.duration;
    }
    isDragging = false;
    progressBar.classList.remove('dragging');
  });

  // Touch events for mobile
  progressBar.addEventListener('touchstart', (e) => {
    if (!AppState.audio.duration) return;
    isDragging = true;
    progressBar.classList.add('dragging');
    updatePreviewPosition(e, progressBar);
  }, { passive: true });

  progressBar.addEventListener('touchmove', (e) => {
    if (isDragging && AppState.audio.duration) {
      const rect = progressBar.getBoundingClientRect();
      const touch = e.touches[0];
      let percent = (touch.clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));

      document.getElementById('progress-fill').style.width = `${percent * 100}%`;
      updatePreviewPosition(e, progressBar);
    }
  }, { passive: true });

  progressBar.addEventListener('touchend', (e) => {
    if (isDragging && AppState.audio.duration) {
      const rect = progressBar.getBoundingClientRect();
      const touch = e.changedTouches[0];
      let percent = (touch.clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));
      AppState.audio.currentTime = percent * AppState.audio.duration;
    }
    isDragging = false;
    progressBar.classList.remove('dragging');
  });

  // Click to seek (when not dragging)
  progressBar.addEventListener('click', (e) => {
    if (AppState.audio.duration && !isDragging) {
      const rect = progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      AppState.audio.currentTime = Math.max(0, Math.min(1, percent)) * AppState.audio.duration;
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
    if (AppState.currentDrama && AppState.currentTrack) {
      openPlayerView();
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
    updateCurrentSubtitle();
    updateScriptPanelActive();
    checkPreloadNextTrack();
    updateMediaSessionPosition();
  });

  AppState.audio.addEventListener('loadedmetadata', () => {
    updateAudioControls();
    updateMediaSession();
    updateMediaSessionPosition();
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
    clearPreloadedAudio();
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

/**
 * Open Drama - 点击卡片后打开详情页
 */
function openDrama(dramaId) {
  const drama = AppState.dramas.find(d => d.id === dramaId);
  if (!drama) return;

  // Check if locked
  if (drama.password && !AppState.unlockedDramas.has(drama.id)) {
    openPasswordModal(drama);
    return;
  }

  AppState.currentDrama = drama;
  openDetailView(drama);
}

/**
 * Open Detail View - 打开作品详情页
 */
function openDetailView(drama) {
  renderDetailView(drama);
  DOM.detailView.classList.add('active');
  DOM.miniPlayer.classList.remove('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Close Detail View - 关闭详情页返回主页
 */
function closeDetailView() {
  DOM.detailView.classList.remove('active');
  document.body.style.overflow = '';

  // Show mini player if playing
  if (AppState.currentTrack) {
    renderMiniPlayer();
  }
}

/**
 * Open Player View - 打开播放界面（专注模式）
 */
function openPlayerView() {
  renderPlayerView();
  renderTracklistPanel();
  DOM.playerView.classList.add('active');
  DOM.detailView.classList.remove('active');
  document.body.style.overflow = 'hidden';
  updateAudioControls();
}

/**
 * Close Player View - 关闭播放界面返回详情页
 */
function closePlayerView() {
  DOM.playerView.classList.remove('active');
  DOM.tracklistPanel.classList.remove('active');

  // Return to detail view
  if (AppState.currentDrama) {
    DOM.detailView.classList.add('active');
    // Update detail view to show current track as active
    renderDetailView(AppState.currentDrama);
  }
}

/**
 * Toggle Tracklist Panel - 切换曲目列表侧边栏
 */
function toggleTracklistPanel() {
  DOM.tracklistPanel.classList.toggle('active');
}

function closeMiniPlayer() {
  AppState.audio.pause();
  AppState.currentTrack = null;
  DOM.miniPlayer.classList.remove('active');
}

/**
 * Play Track - 播放指定曲目并打开播放界面
 */
function playTrack(trackId, autoOpenPlayer = true) {
  if (!AppState.currentDrama) return;

  const track = AppState.currentDrama.tracks.find(t => t.id === trackId);
  if (!track) return;

  // If clicking the currently playing track of the SAME drama, just open player view
  const isSameDrama = AppState.playingDramaId === AppState.currentDrama.id;
  const isSameTrack = AppState.currentTrack?.id === trackId;
  if (isSameDrama && isSameTrack) {
    if (autoOpenPlayer) {
      openPlayerView();
    }
    return;
  }

  // Update playing state
  AppState.playingDramaId = AppState.currentDrama.id;
  AppState.currentTrack = track;

  // Get saved progress before loading new source
  const saved = getProgress(AppState.currentDrama.id, track.id);
  const shouldRestore = saved && saved.time > 10;

  // Set audio source (this triggers loading)
  AppState.audio.src = getMediaUrl(track.audioFile);

  // Load subtitles for this track
  loadSubtitles(track.subtitleFile);

  // Open player view if requested
  if (autoOpenPlayer) {
    openPlayerView();
  }

  // Restore progress when metadata is loaded
  if (shouldRestore) {
    const restoreProgress = () => {
      const duration = AppState.audio.duration;
      if (duration && !isNaN(duration) && saved.time < duration - 10) {
        AppState.audio.currentTime = saved.time;
      }
      AppState.audio.removeEventListener('loadedmetadata', restoreProgress);
    };

    // If metadata already loaded, restore immediately; otherwise wait for event
    if (AppState.audio.readyState >= 1) {
      restoreProgress();
    } else {
      AppState.audio.addEventListener('loadedmetadata', restoreProgress);
    }
  }

  // Start playing
  AppState.audio.play().catch(console.error);

  // Save as last played for quick resume
  saveLastPlayed();

  // Save to play history
  saveToHistory(AppState.currentDrama.id, track.id);

  updateAudioControls();
  renderMiniPlayer();
}

/**
 * Play All Tracks - 继续上次暂停的位置，或从头开始
 */
function playAllTracks() {
  if (!AppState.currentDrama?.tracks.length) return;

  const tracks = AppState.currentDrama.tracks;

  // Find the first track with saved progress (not completed)
  for (const track of tracks) {
    const saved = getProgress(AppState.currentDrama.id, track.id);
    if (saved && saved.time > 0 && !saved.completed) {
      playTrack(track.id);
      return;
    }
  }

  // Find the first incomplete track
  for (const track of tracks) {
    const saved = getProgress(AppState.currentDrama.id, track.id);
    if (!saved || !saved.completed) {
      playTrack(track.id);
      return;
    }
  }

  // All tracks completed, start from first track
  playTrack(tracks[0].id);
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

  // Mark the completed track as finished
  markCompleted(AppState.currentDrama.id, AppState.currentTrack.id);

  if (currentIndex < tracks.length - 1) {
    // 自动播放下一轨，但不打开播放页面（静默切换）
    playTrack(tracks[currentIndex + 1].id, false);
  } else {
    // End of playlist - return to detail view
    AppState.audio.pause();
    AppState.audio.currentTime = 0;
    AppState.currentTrack = null;
    updateAudioControls();

    // Close player view and return to detail view
    if (DOM.playerView.classList.contains('active')) {
      DOM.playerView.classList.remove('active');
      DOM.tracklistPanel.classList.remove('active');
      openDetailView(AppState.currentDrama);
    }
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
  const currentTime = AppState.audio.currentTime;

  // Check existing progress - only save if new time is greater
  const existing = getProgress(AppState.currentDrama.id, AppState.currentTrack.id);
  if (existing && !existing.completed && existing.time > currentTime) {
    return; // Don't overwrite with smaller time
  }

  localStorage.setItem(key, JSON.stringify({
    time: currentTime,
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

/**
 * Mark track as completed (played to the end)
 */
function markCompleted(dramaId, trackId) {
  const key = `dp_progress_${dramaId}_${trackId}`;
  localStorage.setItem(key, JSON.stringify({
    completed: true,
    savedAt: Date.now()
  }));
}

/**
 * Save last played info for quick resume
 */
function saveLastPlayed() {
  if (!AppState.currentDrama || !AppState.currentTrack) return;

  localStorage.setItem('dp_last_played', JSON.stringify({
    dramaId: AppState.currentDrama.id,
    trackId: AppState.currentTrack.id,
    savedAt: Date.now()
  }));

  updateRecentPlayButton();
}

/**
 * Get last played info
 */
function getLastPlayed() {
  try {
    return JSON.parse(localStorage.getItem('dp_last_played'));
  } catch {
    return null;
  }
}

/**
 * Update recent play button visibility and state
 * Now delegates to updateHistoryPanel for consistency
 */
function updateRecentPlayButton() {
  updateHistoryPanel();
}

/**
 * Handle recent play button click
 */
function handleRecentPlayClick() {
  const lastPlayed = getLastPlayed();
  if (!lastPlayed) return;

  const drama = AppState.dramas.find(d => d.id === lastPlayed.dramaId);
  if (!drama) return;

  const track = drama.tracks.find(t => t.id === lastPlayed.trackId);
  if (!track) return;

  // Set current drama and play the track
  AppState.currentDrama = drama;
  playTrack(track.id, true); // true = auto open player view
}

// ============================================
// Play History System
// ============================================

const MAX_HISTORY_ITEMS = 5;

/**
 * Save current track to play history
 */
function saveToHistory(dramaId, trackId) {
  if (!dramaId || !trackId) return;

  let history = getPlayHistory();

  // Remove existing entry for same drama+track (to move it to front)
  history = history.filter(h => !(h.dramaId === dramaId && h.trackId === trackId));

  // Add new entry at the beginning
  history.unshift({
    dramaId,
    trackId,
    playedAt: Date.now()
  });

  // Keep only MAX_HISTORY_ITEMS
  history = history.slice(0, MAX_HISTORY_ITEMS);

  localStorage.setItem('dp_history', JSON.stringify(history));
  updateHistoryPanel();
}

/**
 * Get play history list
 */
function getPlayHistory() {
  try {
    return JSON.parse(localStorage.getItem('dp_history')) || [];
  } catch {
    return [];
  }
}

/**
 * Clear all play history
 */
function clearHistory() {
  localStorage.removeItem('dp_history');
  updateHistoryPanel();
}

/**
 * Format relative time (e.g., "3分前", "昨日")
 */
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Update history panel content
 */
function updateHistoryPanel() {
  const panel = document.getElementById('history-panel');
  const btn = document.getElementById('recent-play-btn');
  if (!panel || !btn) return;

  const history = getPlayHistory();

  // Always show button
  btn.style.display = 'flex';

  // Build history list HTML
  let html = '<div class="history-header"><span>再生履歴</span></div>';
  html += '<div class="history-list">';

  if (history.length === 0) {
    // Empty state
    html += '<div class="history-empty">再生履歴がありません</div>';
  } else {
    for (const item of history) {
      const drama = AppState.dramas.find(d => d.id === item.dramaId);
      if (!drama) continue;

      const track = drama.tracks.find(t => t.id === item.trackId);
      if (!track) continue;

      const progress = getProgress(item.dramaId, item.trackId);
      const relativeTime = formatRelativeTime(item.playedAt);

      // Progress bar
      let progressHtml = '';
      if (progress) {
        if (progress.completed) {
          progressHtml = '<div class="history-progress-bar"><div class="history-progress-fill" style="width: 100%"></div></div><span class="history-completed">完了</span>';
        } else if (progress.time > 0) {
          // We need duration to calculate percentage, estimate from track.duration if available
          const durationParts = (track.duration || '0:00').split(':');
          const durationSec = durationParts.length === 2
            ? parseInt(durationParts[0]) * 60 + parseInt(durationParts[1])
            : parseInt(durationParts[0]) * 3600 + parseInt(durationParts[1]) * 60 + parseInt(durationParts[2] || 0);
          const percent = durationSec > 0 ? Math.min(100, Math.round((progress.time / durationSec) * 100)) : 0;
          progressHtml = `<div class="history-progress-bar"><div class="history-progress-fill" style="width: ${percent}%"></div></div><span class="history-percent">${percent}%</span>`;
        }
      }

      html += `
        <div class="history-item" data-drama-id="${item.dramaId}" data-track-id="${item.trackId}">
          <div class="history-cover">
            <img src="${getMediaUrl(drama.cover)}" alt="${drama.title}" loading="lazy">
          </div>
          <div class="history-info">
            <div class="history-title">${drama.title}</div>
            <div class="history-track">${track.titleZh || track.title} · ${relativeTime}</div>
            <div class="history-progress">${progressHtml}</div>
          </div>
        </div>
      `;
    }
  }

  html += '</div>';

  // Only show clear button if there's history
  if (history.length > 0) {
    html += '<div class="history-footer"><button class="history-clear-btn" id="history-clear-btn">履歴をクリア</button></div>';
  }

  panel.innerHTML = html;

  // Re-bind clear button event
  const clearBtn = document.getElementById('history-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearHistory();
    });
  }
}

/**
 * Handle history item click
 */
function handleHistoryItemClick(dramaId, trackId) {
  const drama = AppState.dramas.find(d => d.id === dramaId);
  if (!drama) return;

  const track = drama.tracks.find(t => t.id === parseInt(trackId));
  if (!track) return;

  // Close history panel
  const panel = document.getElementById('history-panel');
  if (panel) panel.classList.remove('active');

  // Set current drama and play
  AppState.currentDrama = drama;
  playTrack(track.id, true);
}

/**
 * Initialize history panel
 */
function initHistoryPanel() {
  const btn = document.getElementById('recent-play-btn');
  const panel = document.getElementById('history-panel');

  if (!btn || !panel) return;

  // Toggle panel on button click
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('active');
  });

  // Handle history item clicks (event delegation)
  panel.addEventListener('click', (e) => {
    const item = e.target.closest('.history-item');
    if (item) {
      const dramaId = item.dataset.dramaId;
      const trackId = item.dataset.trackId;
      handleHistoryItemClick(dramaId, trackId);
    }
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !panel.contains(e.target)) {
      panel.classList.remove('active');
    }
  });

  // Initial render
  updateHistoryPanel();
}

// ============================================
// Subtitle System
// ============================================

/**
 * Parse SRT/WEBVTT format subtitle file
 * Supports both formats:
 * SRT:    00:00:26,330 --> 00:00:27,830 (comma separator)
 * WEBVTT: 00:00:26.330 --> 00:00:27.830 (dot separator)
 *
 * Text format:
 * 中文翻译
 * 日文原文 (optional)
 */
function parseSRT(srtContent) {
  const subtitles = [];
  // Normalize line endings (handle Windows \r\n)
  let normalizedContent = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove WEBVTT header if present
  normalizedContent = normalizedContent.replace(/^WEBVTT\s*\n/, '');

  const blocks = normalizedContent.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // Find the line with time code (could be line 0 or line 1)
    let timeLineIndex = -1;
    let timeMatch = null;

    for (let i = 0; i < Math.min(2, lines.length); i++) {
      // Support both comma (SRT) and dot (WEBVTT) as millisecond separator
      timeMatch = lines[i].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
      if (timeMatch) {
        timeLineIndex = i;
        break;
      }
    }

    if (!timeMatch || timeLineIndex === -1) continue;

    const startTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
    const endTime = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;

    // Get text lines (Chinese first, Japanese second if exists)
    const textZh = lines[timeLineIndex + 1] || '';
    const textJp = lines[timeLineIndex + 2] || '';

    // Get ID from line before time code, or use sequential number
    const idLine = timeLineIndex > 0 ? lines[timeLineIndex - 1] : '';
    const id = parseInt(idLine) || subtitles.length + 1;

    subtitles.push({
      id,
      startTime,
      endTime,
      textZh,
      textJp
    });
  }

  return subtitles;
}

/**
 * Load subtitle file for current track
 */
async function loadSubtitles(subtitleFile) {
  // Reset auto-scroll tracking
  lastActiveSubtitleIndex = -1;

  if (!subtitleFile) {
    AppState.subtitles = [];
    AppState.currentSubtitle = null;
    updateSubtitleDisplay();
    return;
  }

  try {
    const response = await fetch(getMediaUrl(subtitleFile));
    if (!response.ok) throw new Error('Subtitle file not found');

    const srtContent = await response.text();
    AppState.subtitles = parseSRT(srtContent);
    AppState.currentSubtitle = null;
    console.log(`Loaded ${AppState.subtitles.length} subtitles`);
  } catch (error) {
    console.warn('Failed to load subtitles:', error);
    AppState.subtitles = [];
    AppState.currentSubtitle = null;
  }

  updateSubtitleDisplay();

  // 如果台本面板打开，重新渲染
  const panel = document.getElementById('script-panel');
  if (panel?.classList.contains('active')) {
    renderScriptPanel();
  }
}

/**
 * Find and update current subtitle based on audio time
 */
function updateCurrentSubtitle() {
  if (!AppState.subtitleEnabled || AppState.subtitles.length === 0) {
    if (AppState.currentSubtitle !== null) {
      AppState.currentSubtitle = null;
      updateSubtitleDisplay();
    }
    return;
  }

  const currentTime = AppState.audio.currentTime;

  // Find matching subtitle
  const subtitle = AppState.subtitles.find(
    s => currentTime >= s.startTime && currentTime <= s.endTime
  );

  // Only update if changed
  if (subtitle !== AppState.currentSubtitle) {
    AppState.currentSubtitle = subtitle || null;
    updateSubtitleDisplay();
  }
}

/**
 * Update subtitle display in UI
 */
function updateSubtitleDisplay() {
  const subtitleEl = document.getElementById('subtitle-display');
  if (!subtitleEl) return;

  if (!AppState.subtitleEnabled || !AppState.currentSubtitle) {
    subtitleEl.classList.remove('active');
    subtitleEl.innerHTML = '';
    return;
  }

  const { textZh, textJp } = AppState.currentSubtitle;
  subtitleEl.innerHTML = `
    <div class="subtitle-text-zh">${textZh}</div>
    <div class="subtitle-text-jp">${textJp}</div>
  `;
  subtitleEl.classList.add('active');
}

/**
 * Toggle subtitle on/off
 */
function toggleSubtitle() {
  AppState.subtitleEnabled = !AppState.subtitleEnabled;
  localStorage.setItem('dp_subtitle_enabled', JSON.stringify(AppState.subtitleEnabled));

  // Update toggle button state
  const toggleBtn = document.getElementById('subtitle-toggle');
  if (toggleBtn) {
    toggleBtn.classList.toggle('active', AppState.subtitleEnabled);
  }

  updateSubtitleDisplay();
}

// ============================================
// Script Panel System (台本面板)
// ============================================

/**
 * Toggle script panel visibility
 */
function toggleScriptPanel() {
  const panel = document.getElementById('script-panel');
  const btn = document.getElementById('script-toggle');

  if (!panel) return;

  const isActive = panel.classList.toggle('active');
  btn?.classList.toggle('active', isActive);

  if (isActive) {
    renderScriptPanel();
    // Scroll to current subtitle
    setTimeout(() => scrollToCurrentSubtitle(), 100);
  }
}

/**
 * Render all subtitles in the script panel
 */
function renderScriptPanel() {
  const content = document.getElementById('script-panel-content');
  if (!content) return;

  if (AppState.subtitles.length === 0) {
    content.innerHTML = `
      <div class="script-empty">
        <p>字幕がありません</p>
      </div>
    `;
    return;
  }

  content.innerHTML = AppState.subtitles.map((sub, index) => `
    <div class="script-item" data-index="${index}" data-start="${sub.startTime}">
      <div class="script-time">${formatSubtitleTime(sub.startTime)}</div>
      <div class="script-text">
        ${sub.textZh ? `<div class="script-text-zh">${sub.textZh}</div>` : ''}
        ${sub.textJp ? `<div class="script-text-jp">${sub.textJp}</div>` : ''}
      </div>
    </div>
  `).join('');

  // Update active state
  updateScriptPanelActive();
}

/**
 * Format time for script panel (MM:SS)
 */
function formatSubtitleTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Track last active subtitle index for auto-scroll
let lastActiveSubtitleIndex = -1;

/**
 * Update active subtitle in script panel
 */
function updateScriptPanelActive() {
  const panel = document.getElementById('script-panel');
  if (!panel?.classList.contains('active')) return;

  const items = panel.querySelectorAll('.script-item');
  const currentTime = AppState.audio.currentTime;
  let currentActiveIndex = -1;

  items.forEach((item, index) => {
    const sub = AppState.subtitles[index];
    const isActive = sub && currentTime >= sub.startTime && currentTime <= sub.endTime;
    item.classList.toggle('active', isActive);
    if (isActive) {
      currentActiveIndex = index;
    }
  });

  // Auto-scroll when active subtitle changes
  if (currentActiveIndex !== -1 && currentActiveIndex !== lastActiveSubtitleIndex) {
    lastActiveSubtitleIndex = currentActiveIndex;
    scrollToCurrentSubtitle();
  }
}

/**
 * Scroll to current subtitle in script panel
 */
function scrollToCurrentSubtitle() {
  const panel = document.getElementById('script-panel');
  const content = document.getElementById('script-panel-content');
  if (!panel?.classList.contains('active') || !content) return;

  const activeItem = content.querySelector('.script-item.active');
  if (activeItem) {
    activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Seek to subtitle time when clicking on script item
 */
function seekToSubtitle(startTime) {
  if (!AppState.audio.duration) return;
  AppState.audio.currentTime = startTime;

  // Start playing if paused
  if (!AppState.isPlaying) {
    AppState.audio.play().catch(console.error);
  }
}

/**
 * Search subtitles and highlight matches
 */
function searchScript(query) {
  const content = document.getElementById('script-panel-content');
  if (!content) return;

  const items = content.querySelectorAll('.script-item');
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    // Clear search - show all items
    items.forEach(item => {
      item.classList.remove('hidden', 'search-match');
      // Remove highlight
      const textZh = item.querySelector('.script-text-zh');
      const textJp = item.querySelector('.script-text-jp');
      if (textZh) textZh.innerHTML = textZh.textContent;
      if (textJp) textJp.innerHTML = textJp.textContent;
    });
    return;
  }

  items.forEach((item, index) => {
    const sub = AppState.subtitles[index];
    const textZh = sub.textZh?.toLowerCase() || '';
    const textJp = sub.textJp?.toLowerCase() || '';
    const matches = textZh.includes(normalizedQuery) || textJp.includes(normalizedQuery);

    item.classList.toggle('hidden', !matches);
    item.classList.toggle('search-match', matches);

    if (matches) {
      // Highlight matching text
      const textZhEl = item.querySelector('.script-text-zh');
      const textJpEl = item.querySelector('.script-text-jp');

      if (textZhEl && sub.textZh) {
        textZhEl.innerHTML = highlightText(sub.textZh, query);
      }
      if (textJpEl && sub.textJp) {
        textJpEl.innerHTML = highlightText(sub.textJp, query);
      }
    }
  });
}

/**
 * Highlight matching text with <mark> tags
 */
function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Initialize script panel event listeners
 */
function initScriptPanel() {
  // Script toggle button
  const toggleBtn = document.getElementById('script-toggle');
  toggleBtn?.addEventListener('click', toggleScriptPanel);

  // Close button
  const closeBtn = document.getElementById('script-panel-close');
  closeBtn?.addEventListener('click', toggleScriptPanel);

  // Script item click - seek to time
  const content = document.getElementById('script-panel-content');
  content?.addEventListener('click', (e) => {
    const item = e.target.closest('.script-item');
    if (item) {
      const startTime = parseFloat(item.dataset.start);
      if (!isNaN(startTime)) {
        seekToSubtitle(startTime);
      }
    }
  });

  // Search input
  const searchInput = document.getElementById('script-search');
  searchInput?.addEventListener('input', debounce((e) => {
    searchScript(e.target.value);
  }, 200));

  // Search clear button
  const clearBtn = document.getElementById('script-search-clear');
  clearBtn?.addEventListener('click', () => {
    const searchInput = document.getElementById('script-search');
    if (searchInput) {
      searchInput.value = '';
      searchScript('');
    }
  });
}

// ============================================
// Playback Speed System
// ============================================
const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

/**
 * Cycle through playback speeds
 */
function cyclePlaybackSpeed() {
  const currentIndex = PLAYBACK_SPEEDS.indexOf(AppState.playbackSpeed);
  const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
  const newSpeed = PLAYBACK_SPEEDS[nextIndex];

  setPlaybackSpeed(newSpeed);
}

/**
 * Set playback speed
 */
function setPlaybackSpeed(speed) {
  AppState.playbackSpeed = speed;
  AppState.audio.playbackRate = speed;
  localStorage.setItem('dp_playback_speed', speed.toString());

  updateSpeedDisplay();
}

/**
 * Update speed button display
 */
function updateSpeedDisplay() {
  const speedBtn = document.getElementById('speed-toggle');
  if (!speedBtn) return;

  const label = speedBtn.querySelector('.speed-label');
  if (label) {
    // Format: 1x, 1.5x, 2x etc.
    const speedText = AppState.playbackSpeed === 1.0 ? '1x' :
                      AppState.playbackSpeed % 1 === 0 ? `${AppState.playbackSpeed}x` :
                      `${AppState.playbackSpeed}x`;
    label.textContent = speedText;
  }

  // Highlight if not normal speed
  speedBtn.classList.toggle('active', AppState.playbackSpeed !== 1.0);
}

/**
 * Initialize playback speed on audio load
 */
function initPlaybackSpeed() {
  AppState.audio.playbackRate = AppState.playbackSpeed;
  updateSpeedDisplay();
}

// ============================================
// Rating System
// ============================================

/**
 * Render star rating component
 */
function renderStars(rating) {
  // 根据当前主题选择图标
  const isKawaii = document.documentElement.getAttribute('data-theme') === 'kawaii';
  const emptyIcon = isKawaii ? Icons.sakuraEmpty : Icons.coffeeEmpty;
  const filledIcon = isKawaii ? Icons.sakuraFilled : Icons.coffeeFilled;

  let html = '';
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= rating;
    html += `<button class="rating-btn ${isFilled ? 'filled' : ''}" data-star="${i}" aria-label="${i}">
      ${isFilled ? filledIcon : emptyIcon}
    </button>`;
  }
  return html;
}

/**
 * Set rating for a drama
 */
function setRating(dramaId, rating) {
  // Toggle off if clicking same rating
  if (AppState.ratings[dramaId] === rating) {
    delete AppState.ratings[dramaId];
  } else {
    AppState.ratings[dramaId] = rating;
  }

  localStorage.setItem('dp_ratings', JSON.stringify(AppState.ratings));

  // Update UI
  const ratingContainer = document.querySelector(`.detail-rating[data-drama-id="${dramaId}"]`);
  if (ratingContainer) {
    ratingContainer.innerHTML = renderStars(AppState.ratings[dramaId] || 0);
  }
}

/**
 * Set sort order
 */
function setSort(sortValue) {
  AppState.sort = sortValue;
  localStorage.setItem('dp_sort', sortValue);

  // Update UI
  const sortLabel = document.getElementById('sort-label');
  const sortLabels = {
    newest: '新しい順',
    oldest: '古い順',
    name: '名前順',
    rating: 'お気に入り順',
    recent: '最近再生順'
  };
  if (sortLabel) {
    sortLabel.textContent = sortLabels[sortValue] || sortValue;
  }

  // Update active state
  document.querySelectorAll('.sort-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.sort === sortValue);
  });

  // Re-render
  renderDramas();
}

/**
 * Initialize sort UI based on saved state
 */
function initSort() {
  const sortValue = AppState.sort;
  const sortLabel = document.getElementById('sort-label');
  const sortLabels = {
    newest: '新しい順',
    oldest: '古い順',
    name: '名前順',
    rating: 'お気に入り順',
    recent: '最近再生順'
  };

  if (sortLabel) {
    sortLabel.textContent = sortLabels[sortValue] || sortLabels.newest;
  }

  document.querySelectorAll('.sort-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.sort === sortValue);
  });
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

/**
 * Parse duration string "MM:SS" to seconds
 */
function parseDuration(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 0;
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

  // Re-render rating icons if detail view is open
  if (AppState.currentDrama) {
    const ratingContainer = document.querySelector(`.detail-rating[data-drama-id="${AppState.currentDrama.id}"]`);
    if (ratingContainer) {
      ratingContainer.innerHTML = renderStars(AppState.ratings[AppState.currentDrama.id] || 0);
    }
  }
}

function updateThemeColor(theme) {
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.light);
  }
}

// ============================================
// Volume Control System
// ============================================
let savedVolume = parseFloat(localStorage.getItem('dp_volume')) || 1.0;

/**
 * Initialize volume control
 */
function initVolumeControl() {
  const volumeSlider = document.getElementById('volume-slider');
  const volumeToggle = document.getElementById('volume-toggle');

  if (!volumeSlider || !volumeToggle) return;

  // Apply saved volume
  AppState.audio.volume = savedVolume;
  volumeSlider.value = savedVolume * 100;
  updateVolumeIcon(savedVolume);

  // Slider change
  volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value / 100;
    AppState.audio.volume = volume;
    savedVolume = volume;
    localStorage.setItem('dp_volume', volume.toString());
    updateVolumeIcon(volume);
  });

  // Click to mute/unmute
  volumeToggle.addEventListener('click', (e) => {
    // Don't toggle if clicking on slider
    if (e.target.closest('.volume-slider-popup')) return;

    if (AppState.audio.volume > 0) {
      // Mute
      savedVolume = AppState.audio.volume;
      AppState.audio.volume = 0;
      volumeSlider.value = 0;
    } else {
      // Unmute
      AppState.audio.volume = savedVolume || 1.0;
      volumeSlider.value = (savedVolume || 1.0) * 100;
    }
    updateVolumeIcon(AppState.audio.volume);
  });
}

/**
 * Update volume icon based on level
 */
function updateVolumeIcon(volume) {
  const volumeToggle = document.getElementById('volume-toggle');
  if (!volumeToggle) return;

  const iconHigh = volumeToggle.querySelector('.volume-icon-high');
  const iconLow = volumeToggle.querySelector('.volume-icon-low');
  const iconMute = volumeToggle.querySelector('.volume-icon-mute');

  if (!iconHigh || !iconLow || !iconMute) return;

  // Hide all icons first
  iconHigh.style.display = 'none';
  iconLow.style.display = 'none';
  iconMute.style.display = 'none';

  // Show appropriate icon
  if (volume === 0) {
    iconMute.style.display = 'block';
  } else if (volume < 0.5) {
    iconLow.style.display = 'block';
  } else {
    iconHigh.style.display = 'block';
  }
}

// ============================================
// Sleep Timer System
// ============================================
let sleepTimerId = null;
let sleepEndTime = null;
let sleepDisplayInterval = null;

/**
 * Initialize sleep timer
 */
function initSleepTimer() {
  const sleepToggle = document.getElementById('sleep-toggle');
  const sleepPopup = document.getElementById('sleep-timer-popup');

  if (!sleepToggle || !sleepPopup) return;

  // Toggle popup
  sleepToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sleepPopup.classList.toggle('active');
  });

  // Close popup when clicking outside
  document.addEventListener('click', (e) => {
    if (!sleepToggle.contains(e.target) && !sleepPopup.contains(e.target)) {
      sleepPopup.classList.remove('active');
    }
  });

  // Sleep options
  sleepPopup.addEventListener('click', (e) => {
    const option = e.target.closest('.sleep-option');
    if (!option) return;

    const minutes = parseInt(option.dataset.minutes);
    setSleepTimer(minutes);
    sleepPopup.classList.remove('active');

    // Update active state
    sleepPopup.querySelectorAll('.sleep-option').forEach(opt => {
      opt.classList.toggle('active', opt === option && minutes > 0);
    });
  });
}

/**
 * Set sleep timer
 */
function setSleepTimer(minutes) {
  // Clear existing timer
  if (sleepTimerId) {
    clearTimeout(sleepTimerId);
    sleepTimerId = null;
  }
  if (sleepDisplayInterval) {
    clearInterval(sleepDisplayInterval);
    sleepDisplayInterval = null;
  }

  const sleepToggle = document.getElementById('sleep-toggle');
  const sleepLabel = document.getElementById('sleep-time-label');

  if (minutes === 0) {
    // Turn off
    sleepEndTime = null;
    if (sleepLabel) sleepLabel.textContent = '';
    if (sleepToggle) sleepToggle.classList.remove('active');
    return;
  }

  // Set new timer
  sleepEndTime = Date.now() + minutes * 60 * 1000;

  sleepTimerId = setTimeout(() => {
    // Pause playback
    AppState.audio.pause();
    sleepEndTime = null;
    if (sleepLabel) sleepLabel.textContent = '';
    if (sleepToggle) sleepToggle.classList.remove('active');

    // Clear interval
    if (sleepDisplayInterval) {
      clearInterval(sleepDisplayInterval);
      sleepDisplayInterval = null;
    }
  }, minutes * 60 * 1000);

  // Update display
  if (sleepToggle) sleepToggle.classList.add('active');
  updateSleepDisplay();

  // Update display every second
  sleepDisplayInterval = setInterval(updateSleepDisplay, 1000);
}

/**
 * Update sleep timer display
 */
function updateSleepDisplay() {
  const sleepLabel = document.getElementById('sleep-time-label');
  if (!sleepLabel || !sleepEndTime) return;

  const remaining = Math.max(0, sleepEndTime - Date.now());
  const mins = Math.ceil(remaining / 60000);

  if (mins > 0) {
    sleepLabel.textContent = `${mins}`;
  } else {
    sleepLabel.textContent = '';
  }
}

// ============================================
// Media Session API
// ============================================

/**
 * Update Media Session metadata
 */
function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;
  if (!AppState.currentDrama || !AppState.currentTrack) return;

  const drama = AppState.currentDrama;
  const track = AppState.currentTrack;

  // Set metadata
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.titleZh || track.title,
    artist: drama.cv.join(', '),
    album: drama.title,
    artwork: drama.cover ? [
      { src: getMediaUrl(drama.cover), sizes: '512x512', type: 'image/webp' }
    ] : []
  });

  // Set action handlers
  navigator.mediaSession.setActionHandler('play', () => {
    AppState.audio.play().catch(console.error);
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    AppState.audio.pause();
  });

  navigator.mediaSession.setActionHandler('previoustrack', () => {
    playPrevTrack();
  });

  navigator.mediaSession.setActionHandler('nexttrack', () => {
    playNextTrack();
  });

  navigator.mediaSession.setActionHandler('seekbackward', (details) => {
    const skipTime = details.seekOffset || 10;
    seekRelative(-skipTime);
  });

  navigator.mediaSession.setActionHandler('seekforward', (details) => {
    const skipTime = details.seekOffset || 10;
    seekRelative(skipTime);
  });

  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime !== undefined && AppState.audio.duration) {
      AppState.audio.currentTime = details.seekTime;
    }
  });
}

/**
 * Update Media Session position state
 */
function updateMediaSessionPosition() {
  if (!('mediaSession' in navigator)) return;
  if (!AppState.audio.duration || isNaN(AppState.audio.duration)) return;

  try {
    navigator.mediaSession.setPositionState({
      duration: AppState.audio.duration,
      playbackRate: AppState.audio.playbackRate,
      position: AppState.audio.currentTime
    });
  } catch (e) {
    // Ignore errors (some browsers don't support this)
  }
}

// ============================================
// Preload Next Track
// ============================================
let preloadedAudio = null;
let preloadedTrackId = null;

/**
 * Preload next track when current track is 80% complete
 */
function checkPreloadNextTrack() {
  if (!AppState.currentDrama || !AppState.currentTrack) return;
  if (!AppState.audio.duration) return;

  const progress = AppState.audio.currentTime / AppState.audio.duration;
  if (progress < 0.8) return;

  const tracks = AppState.currentDrama.tracks;
  const currentIndex = tracks.findIndex(t => t.id === AppState.currentTrack.id);

  // No next track
  if (currentIndex >= tracks.length - 1) return;

  const nextTrack = tracks[currentIndex + 1];

  // Already preloaded this track
  if (preloadedTrackId === nextTrack.id) return;

  // Preload
  preloadedAudio = new Audio();
  preloadedAudio.preload = 'auto';
  preloadedAudio.src = getMediaUrl(nextTrack.audioFile);
  preloadedTrackId = nextTrack.id;

  console.log(`Preloading next track: ${nextTrack.title}`);
}

/**
 * Clear preloaded audio
 */
function clearPreloadedAudio() {
  if (preloadedAudio) {
    preloadedAudio.src = '';
    preloadedAudio = null;
  }
  preloadedTrackId = null;
}

// ============================================
// Start App
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initViewToggle();
  init(); // 直接初始化（Cloudflare Access 负责访问控制）
  initVolumeControl();
  initSleepTimer();
});
