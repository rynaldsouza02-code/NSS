/**
 * NSS Unit Live Leaderboard, Camp Photo Gallery & Admin Portal
 * Dr. B. B. Hegde First Grade College, Kundapura
 * A Unit of Coondapur Education Society (R)
 */

(function () {
  'use strict';

  // ================= STORAGE KEYS =================
  const STORAGE_KEYS = {
    TEAMS: 'nss_teams_data_v3',
    ACTIVITIES: 'nss_activities_data_v3',
    PHOTOS: 'nss_photos_data_v3',
    SETTINGS: 'nss_settings_data_v3',
    THEME: 'nss_theme_pref_v3',
    ADMIN_SESSION: 'nss_admin_auth_session_v3'
  };

  const BROADCAST_CHANNEL_NAME = 'nss_live_sync_v3';

  // ================= DEFAULT SETTINGS =================
  const DEFAULT_SETTINGS = {
    eventTitle: 'Inter-Team Camp Leaderboard',
    eventSubtitle: 'Dr. B. B. Hegde First Grade College, Kundapura — Annual Special Camp 2026',
    campTag: 'Annual Special Camp 2026',
    adminPasscode: 'nss@2026',
    soundEnabled: true
  };

  // ================= DEFAULT TEAMS (CLEARED) =================
  const DEFAULT_TEAMS = [];

  // ================= DEFAULT ACTIVITIES (CLEARED) =================
  const DEFAULT_ACTIVITIES = [];

  // Helper to generate crisp SVG camp banner images for default demonstration
  function createCampSvg(title, bg1, bg2, icon) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bg1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${bg2};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="600" height="380" fill="url(#g)" />
        <circle cx="300" cy="155" r="54" fill="rgba(255,255,255,0.2)" />
        <text x="300" y="178" font-family="'Outfit', sans-serif" font-size="46" fill="#FFFFFF" text-anchor="middle">${icon}</text>
        <text x="300" y="255" font-family="'Plus Jakarta Sans', sans-serif" font-weight="bold" font-size="20" fill="#FFFFFF" text-anchor="middle">${title}</text>
        <text x="300" y="285" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" fill="rgba(255,255,255,0.8)" text-anchor="middle">Dr. B. B. Hegde First Grade College &bull; NSS Special Camp</text>
      </svg>
    `.trim();
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  // Default Photos: cleared for now as requested
  const DEFAULT_PHOTOS = [];

  // ================= APP STATE =================
  let teams = [];
  let activities = [];
  let photos = [];
  let settings = { ...DEFAULT_SETTINGS };
  let currentTheme = 'light';
  let currentSearchQuery = '';
  let activeTab = 'leaderboard';
  let activeGalleryCategory = 'ALL';
  let broadcastChannel = null;
  let tempPhotoDataUrl = '';

  // Audio Synthesizer
  let audioCtx = null;

  // ================= INITIALIZATION =================
  function init() {
    setupIntroSplash();
    initTheme();
    loadStateFromStorage();
    setupBroadcastChannel();
    bindEvents();
    renderAll();
  }

  // ================= 1. INTRO SPLASH TRANSITION =================
  function setupIntroSplash() {
    const splash = document.getElementById('introSplash');
    const skipBtn = document.getElementById('skipSplashBtn');
    if (!splash) return;

    function hideSplash() {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 500);
    }

    // Auto fade-out after 1.4s
    const splashTimer = setTimeout(hideSplash, 1400);

    // Skip on button or click
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTimeout(splashTimer);
        hideSplash();
      });
    }

    splash.addEventListener('click', () => {
      clearTimeout(splashTimer);
      hideSplash();
    });
  }

  // ================= 2. THEME (LIGHT / DARK) =================
  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    currentTheme = saved ? saved : 'light'; // Default Light Mode
    applyTheme(currentTheme);
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = theme === 'light' ? 'theme-light' : 'theme-dark';

    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    if (icon && text) {
      if (theme === 'light') {
        icon.className = 'fa-solid fa-moon';
        text.textContent = 'Dark';
      } else {
        icon.className = 'fa-solid fa-sun';
        text.textContent = 'Light';
      }
    }
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    showToast(`Switched to ${newTheme === 'light' ? 'Light' : 'Dark'} Mode`, 'info');
  }

  // ================= 3. STORAGE & BROADCAST =================
  function loadStateFromStorage() {
    try {
      // Purge old legacy keys (v1 and v2) from visitors' browsers/phones so outdated 'squad' data is removed
      ['nss_teams_data', 'nss_teams_data_v2', 'nss_settings_data', 'nss_settings_data_v2', 'nss_activities_data', 'nss_activities_data_v2'].forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });

      let storedTeams = localStorage.getItem(STORAGE_KEYS.TEAMS);
      let storedActivities = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      let storedPhotos = localStorage.getItem(STORAGE_KEYS.PHOTOS);
      let storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);

      // If stored data on device contains legacy "squad", invalidate it
      if (storedSettings && storedSettings.toLowerCase().includes('squad')) {
        storedSettings = null;
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      }

      // Check if stored teams are the old dummy demo teams (e.g. Team Vivekananda with 460 pts)
      if (storedTeams) {
        try {
          const parsed = JSON.parse(storedTeams);
          const hasDummy = parsed.some(t => (t.id === 'team-1' && t.points === 460) || (t.motto && t.motto.includes('Arise, Awake')));
          if (hasDummy) {
            storedTeams = null;
            localStorage.removeItem(STORAGE_KEYS.TEAMS);
            localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
            storedActivities = null;
          }
        } catch (_) {}
      }

      teams = storedTeams ? JSON.parse(storedTeams) : [];
      activities = storedActivities ? JSON.parse(storedActivities) : [];
      
      // Clean photos state
      if (storedPhotos) {
        try {
          const parsed = JSON.parse(storedPhotos);
          const hasDummy = parsed.some(p => p.id && p.id.startsWith('photo-'));
          photos = hasDummy ? [] : parsed;
        } catch (e) {
          photos = [];
        }
      } else {
        photos = [];
      }
      localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(photos));

      settings = storedSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) } : { ...DEFAULT_SETTINGS };
      settings.eventTitle = 'Inter-Team Camp Leaderboard';

      if (!storedTeams) {
        saveStateToStorage(false);
      }
    } catch (e) {
      console.error('Storage load error:', e);
      teams = JSON.parse(JSON.stringify(DEFAULT_TEAMS));
      activities = JSON.parse(JSON.stringify(DEFAULT_ACTIVITIES));
      photos = [];
      settings = { ...DEFAULT_SETTINGS };
    }
  }

  function saveStateToStorage(broadcast = true, updatedTeamId = null, pointsDelta = 0) {
    try {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
      localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(photos));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

      if (broadcast && broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'SYNC',
          updatedTeamId,
          pointsDelta,
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  function setupBroadcastChannel() {
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'SYNC') {
          handleIncomingSync(event.data);
        }
      };
    }

    window.addEventListener('storage', () => {
      loadStateFromStorage();
      renderAll();
    });
  }

  function handleIncomingSync(data) {
    const prevLeaderId = getSortedTeams()[0]?.id;
    loadStateFromStorage();
    renderAll();
    const newLeaderId = getSortedTeams()[0]?.id;

    if (data.updatedTeamId) {
      const team = teams.find(t => t.id === data.updatedTeamId);
      if (team) {
        const sign = data.pointsDelta >= 0 ? `+${data.pointsDelta}` : `${data.pointsDelta}`;
        showToast(`⚡ Live Update: ${team.name} received ${sign} pts!`, 'info');
        playChime(data.pointsDelta > 0);
      }
    }

    if (newLeaderId && prevLeaderId && newLeaderId !== prevLeaderId) {
      triggerConfetti();
      const champion = teams.find(t => t.id === newLeaderId);
      showToast(`🏆 NEW #1 LEADER: ${champion ? champion.name : 'Squad'}!`, 'success');
    }
  }

  // ================= 4. SOUND & EFFECTS =================
  function playChime(isPositive = true) {
    if (!settings.soundEnabled) return;
    try {
      if (!audioCtx) {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (AudioClass) audioCtx = new AudioClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      if (isPositive) {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.45);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  function triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#1B2A6B', '#C41E3A', '#059669', '#FFFFFF']
      });
    }
  }

  // ================= 5. COMPUTED HELPERS =================
  function getSortedTeams() {
    return [...teams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name);
    });
  }

  function getFilteredTeams() {
    const sorted = getSortedTeams();
    if (!currentSearchQuery.trim()) return sorted;
    const q = currentSearchQuery.toLowerCase().trim();
    return sorted.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.leader && t.leader.toLowerCase().includes(q)) ||
      (t.motto && t.motto.toLowerCase().includes(q))
    );
  }

  function formatDate(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // ================= 6. RENDERING =================
  function renderAll() {
    renderBanner();
    renderPodium();
    renderTable();
    renderGallery();
    renderActivities();
    renderAdminViews();
    populateSelects();
  }

  function renderBanner() {
    document.getElementById('eventTitle').textContent = settings.eventTitle;
    document.getElementById('eventSubtitle').textContent = settings.eventSubtitle;
    document.getElementById('campTag').innerHTML = `<i class="fa-solid fa-campground"></i> ${settings.campTag}`;

    const sorted = getSortedTeams();
    document.getElementById('totalTeamsCount').textContent = teams.length;
    const totalPts = teams.reduce((acc, t) => acc + (Number(t.points) || 0), 0);
    document.getElementById('totalPointsCount').textContent = totalPts.toLocaleString();

    const leadingEl = document.getElementById('leadingSquadName');
    leadingEl.textContent = sorted.length > 0 ? sorted[0].name : '—';
  }

  // Top 3 Podium
  function renderPodium() {
    const row = document.getElementById('podiumRow');
    const sorted = getSortedTeams();

    if (sorted.length === 0) {
      row.innerHTML = `
        <div class="podium-empty-box">
          <div class="icon-circle" style="margin: 0 auto 0.75rem;"><i class="fa-solid fa-trophy"></i></div>
          <h4>No Teams Enrolled Yet</h4>
          <p>NSS Officers can add participating teams and start scoring in the Admin Portal.</p>
        </div>
      `;
      return;
    }

    const first = sorted[0] || null;
    const second = sorted[1] || null;
    const third = sorted[2] || null;

    let html = '';
    if (second) html += createPodiumCard(second, 2);
    if (first) html += createPodiumCard(first, 1);
    if (third) html += createPodiumCard(third, 3);
    row.innerHTML = html;
  }

  function createPodiumCard(team, rank) {
    const initials = team.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'TM';
    const badgeText = rank === 1 ? '<i class="fa-solid fa-crown"></i>' : `#${rank}`;
    return `
      <div class="podium-card rank-${rank}">
        <div class="podium-badge">${badgeText}</div>
        <div class="podium-avatar" style="background: ${team.color || '#1B2A6B'};">
          ${initials}
        </div>
        <div class="podium-info">
          <h4 class="podium-name">${escapeHtml(team.name)}</h4>
          <p class="podium-sub">Leader: ${escapeHtml(team.leader || '—')}</p>
        </div>
        <div class="podium-score-pill">
          <span class="podium-points">${team.points}</span>
          <span class="podium-unit">PTS</span>
        </div>
      </div>
    `;
  }

  // Table
  function renderTable() {
    const tbody = document.getElementById('standingsTableBody');
    const noTeams = document.getElementById('noTeamsState');
    const filtered = getFilteredTeams();
    const sorted = getSortedTeams();

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      noTeams.style.display = 'block';
      return;
    }
    noTeams.style.display = 'none';

    tbody.innerHTML = filtered.map(team => {
      const rank = sorted.findIndex(t => t.id === team.id) + 1;
      const initials = team.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'SQ';
      const recentAct = activities.find(a => a.teamId === team.id);

      let rankClass = '';
      if (rank === 1) rankClass = 'gold';
      else if (rank === 2) rankClass = 'silver';
      else if (rank === 3) rankClass = 'bronze';

      return `
        <tr>
          <td style="text-align: center;">
            <span class="rank-pill ${rankClass}">#${rank}</span>
          </td>
          <td>
            <div class="team-cell">
              <div class="team-badge" style="background: ${team.color || '#1B2A6B'};">${initials}</div>
              <div>
                <div class="team-title">${escapeHtml(team.name)}</div>
              </div>
            </div>
          </td>
          <td><strong>${escapeHtml(team.leader || '—')}</strong></td>
          <td>
            ${recentAct 
              ? `<span style="color:var(--green); font-weight:700;">+${recentAct.points} pts</span> <span style="font-size:0.75rem; color:var(--text-muted);">(${recentAct.category.split(' ')[0]})</span>` 
              : '<span style="color:var(--text-muted); font-size:0.78rem;">Enrolled</span>'}
          </td>
          <td style="text-align: right;">
            <span class="points-text">${team.points}</span>
          </td>
          <td style="text-align: center;">
            <button class="action-btn view-history-btn" data-tid="${team.id}" title="Audit Log">
              <i class="fa-solid fa-list-check"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.view-history-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        openHistoryModal(e.currentTarget.getAttribute('data-tid'));
      });
    });
  }

  // Photos Gallery
  function renderGallery() {
    const grid = document.getElementById('photoGrid');
    const noPhotos = document.getElementById('noPhotosState');
    if (!grid) return;

    let filtered = [...photos];
    if (activeGalleryCategory !== 'ALL') {
      filtered = filtered.filter(p => p.category === activeGalleryCategory);
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      noPhotos.style.display = 'block';
      return;
    }
    noPhotos.style.display = 'none';

    grid.innerHTML = filtered.map(p => `
      <div class="photo-card" data-pid="${p.id}">
        <div class="photo-thumb-wrap">
          <img src="${p.url}" alt="${escapeHtml(p.title)}" class="photo-img" loading="lazy">
          <span class="photo-tag">${escapeHtml(p.category)}</span>
        </div>
        <div class="photo-card-info">
          <h4 class="photo-card-title">${escapeHtml(p.title)}</h4>
          <span class="photo-card-date"><i class="fa-regular fa-calendar"></i> ${escapeHtml(p.date || 'Camp Session')}</span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.photo-card').forEach(card => {
      card.addEventListener('click', (e) => {
        openLightbox(e.currentTarget.getAttribute('data-pid'));
      });
    });
  }

  function openLightbox(pid) {
    const photo = photos.find(p => p.id === pid);
    if (!photo) return;
    document.getElementById('lightboxImage').src = photo.url;
    document.getElementById('lightboxTag').textContent = photo.category;
    document.getElementById('lightboxHeading').textContent = photo.title;
    document.getElementById('lightboxSub').textContent = photo.date || '';
    openModal('lightboxModal');
  }

  // Activity Feed
  function renderActivities() {
    const timeline = document.getElementById('activityTimeline');
    const filter = document.getElementById('activityTeamFilter');
    const selectedTid = filter ? filter.value : 'ALL';

    let list = [...activities];
    if (selectedTid && selectedTid !== 'ALL') {
      list = list.filter(a => a.teamId === selectedTid);
    }

    if (list.length === 0) {
      timeline.innerHTML = `<div style="text-align:center; padding:2.5rem; color:var(--text-muted);"><p>No activity records logged.</p></div>`;
      return;
    }

    timeline.innerHTML = list.map(act => {
      const isNegative = act.points < 0;
      return `
        <div class="act-item ${isNegative ? 'negative' : ''}">
          <div class="act-left">
            <div class="act-icon"><i class="fa-solid fa-award"></i></div>
            <div>
              <div class="act-team">${escapeHtml(act.teamName)}</div>
              <div class="act-cat">${escapeHtml(act.category)}</div>
              ${act.remark ? `<div class="act-remark">${escapeHtml(act.remark)}</div>` : ''}
            </div>
          </div>
          <div style="text-align: right;">
            <div class="act-pts">${isNegative ? act.points : '+' + act.points} PTS</div>
            <div class="act-time">${formatDate(act.timestamp)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Admin Views
  function renderAdminViews() {
    const mini = document.getElementById('adminMiniStandings');
    const squadsBody = document.getElementById('adminSquadsTableBody');
    const photosGrid = document.getElementById('adminPhotosGrid');
    const sCount = document.getElementById('adminSquadsCount');
    const pCount = document.getElementById('adminPhotosCount');

    const sorted = getSortedTeams();
    if (sCount) sCount.textContent = teams.length;
    if (pCount) pCount.textContent = photos.length;

    // Mini standings
    if (mini) {
      mini.innerHTML = sorted.map((t, idx) => `
        <div class="mini-standing-row">
          <span><strong>#${idx + 1}</strong> ${escapeHtml(t.name)}</span>
          <strong style="color:var(--navy);">${t.points} pts</strong>
        </div>
      `).join('');
    }

    // Teams table
    if (squadsBody) {
      squadsBody.innerHTML = teams.map((t, idx) => `
        <tr>
          <td><span class="rank-pill" style="font-size:0.75rem; padding: 2px 7px;">#${idx + 1}</span></td>
          <td><strong>${escapeHtml(t.name)}</strong></td>
          <td>${escapeHtml(t.leader || '—')}</td>
          <td><strong>${t.points} pts</strong></td>
          <td style="text-align: right;">
            <button class="action-btn edit-squad-btn" data-tid="${t.id}" title="Edit Team"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn delete-squad-btn" data-tid="${t.id}" style="color:var(--nss-red);" title="Delete Team"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `).join('');

      squadsBody.querySelectorAll('.edit-squad-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openEditSquad(e.currentTarget.getAttribute('data-tid')));
      });
      squadsBody.querySelectorAll('.delete-squad-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteSquad(e.currentTarget.getAttribute('data-tid')));
      });
    }

    // Admin photos
    const pBadge = document.getElementById('adminPhotosCountBadge');
    if (pBadge) pBadge.textContent = photos.length;

    if (photosGrid) {
      if (photos.length === 0) {
        photosGrid.innerHTML = `
          <div style="grid-column: 1/-1; text-align:center; padding: 2rem 1rem; color:var(--text-muted);">
            <i class="fa-solid fa-camera" style="font-size:1.8rem; margin-bottom:0.5rem; opacity:0.6;"></i>
            <p style="font-size:0.82rem;">No camp photos uploaded yet.<br>Use the form on the left to add photos!</p>
          </div>
        `;
      } else {
        photosGrid.innerHTML = photos.map(p => `
          <div class="admin-photo-card">
            <img src="${p.url}" alt="${escapeHtml(p.title)}">
            <div class="admin-photo-meta">
              <span style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(p.title)}</span>
              <button class="action-btn delete-photo-btn" data-pid="${p.id}" style="color:var(--nss-red);"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        `).join('');

        photosGrid.querySelectorAll('.delete-photo-btn').forEach(btn => {
          btn.addEventListener('click', (e) => deletePhoto(e.currentTarget.getAttribute('data-pid')));
        });
      }
    }
  }

  function populateSelects() {
    const awardSelect = document.getElementById('awardTargetTeam');
    const actFilter = document.getElementById('activityTeamFilter');
    if (!awardSelect) return;

    const currentVal = awardSelect.value;
    awardSelect.innerHTML = '<option value="" disabled selected>-- Select competing squad --</option>' +
      teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)} (${t.points} pts)</option>`).join('');
    if (currentVal && teams.some(t => t.id === currentVal)) awardSelect.value = currentVal;

    if (actFilter) {
      const curFilter = actFilter.value;
      actFilter.innerHTML = '<option value="ALL">All Competing Squads</option>' +
        teams.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
      if (curFilter) actFilter.value = curFilter;
    }
  }

  // ================= 7. EVENT BINDINGS =================
  function bindEvents() {
    // Theme Switch
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

    // Nav Switch
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        switchNavTab(tab);
      });
    });

    // Gallery Category Chips
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeGalleryCategory = e.currentTarget.getAttribute('data-category');
        renderGallery();
      });
    });

    // Admin Direct Photo Upload Toggle (File vs URL)
    document.querySelectorAll('input[name="adminPhotoSource"]').forEach(r => {
      r.addEventListener('change', (e) => {
        const isFile = e.target.value === 'file';
        const fileGroup = document.getElementById('adminPhotoFileGroup');
        const urlGroup = document.getElementById('adminPhotoUrlGroup');
        if (fileGroup) fileGroup.style.display = isFile ? 'block' : 'none';
        if (urlGroup) urlGroup.style.display = isFile ? 'none' : 'block';
      });
    });

    // Admin Direct File Preview
    const adminFileInput = document.getElementById('adminPhotoFileInput');
    if (adminFileInput) {
      adminFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
          const img = new Image();
          img.onload = function () {
            const canvas = document.createElement('canvas');
            const MAX = 800;
            let w = img.width, h = img.height;
            if (w > h && w > MAX) { h *= MAX / w; w = MAX; }
            else if (h > MAX) { w *= MAX / h; h = MAX; }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            tempPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.82);
            const box = document.getElementById('adminPhotoPreviewBox');
            if (box) box.innerHTML = `<img src="${tempPhotoDataUrl}" alt="Preview">`;
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    // Admin Direct URL Preview
    const adminUrlInput = document.getElementById('adminPhotoUrlInput');
    if (adminUrlInput) {
      adminUrlInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        const box = document.getElementById('adminPhotoPreviewBox');
        if (box) {
          box.innerHTML = url ? `<img src="${url}" alt="Preview" onerror="this.src='';">` : '<div class="preview-empty"><i class="fa-solid fa-image"></i><span>No image selected</span></div>';
        }
      });
    }

    // Admin Direct Photo Form Submit
    const adminPhotoForm = document.getElementById('adminDirectPhotoForm');
    if (adminPhotoForm) {
      adminPhotoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const srcType = document.querySelector('input[name="adminPhotoSource"]:checked')?.value || 'file';
        const title = document.getElementById('adminPhotoTitleInput').value.trim();
        const category = document.getElementById('adminPhotoCatSelect').value;
        const date = document.getElementById('adminPhotoDateInput').value.trim();

        let finalUrl = '';
        if (srcType === 'file') {
          if (!tempPhotoDataUrl) {
            showToast('Please choose an image file first', 'error');
            return;
          }
          finalUrl = tempPhotoDataUrl;
        } else {
          finalUrl = document.getElementById('adminPhotoUrlInput').value.trim();
          if (!finalUrl) {
            showToast('Please enter an image link URL', 'error');
            return;
          }
        }

        const newPhoto = {
          id: 'camp-photo-' + Date.now(),
          title,
          category,
          date: date || 'Camp Memory',
          url: finalUrl,
          timestamp: Date.now()
        };

        photos.unshift(newPhoto);
        saveStateToStorage(true);
        renderGallery();
        renderAdminViews();

        // Reset form
        adminPhotoForm.reset();
        tempPhotoDataUrl = '';
        const box = document.getElementById('adminPhotoPreviewBox');
        if (box) box.innerHTML = '<div class="preview-empty"><i class="fa-solid fa-image"></i><span>No image selected</span></div>';
        showToast('Camp photo published to live gallery!', 'success');
      });
    }

    // Clear All Photos Button in Admin
    const clearPhotosBtn = document.getElementById('adminClearAllPhotosBtn');
    if (clearPhotosBtn) {
      clearPhotosBtn.addEventListener('click', () => {
        if (photos.length === 0) {
          showToast('Gallery is already empty', 'info');
          return;
        }
        if (confirm('Are you sure you want to clear all photos from the gallery?')) {
          photos = [];
          saveStateToStorage(true);
          renderGallery();
          renderAdminViews();
          showToast('All photos cleared from gallery', 'info');
        }
      });
    }

    // Search
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      clearBtn.style.display = currentSearchQuery ? 'block' : 'none';
      renderTable();
    });
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      currentSearchQuery = '';
      clearBtn.style.display = 'none';
      renderTable();
      searchInput.focus();
    });

    // Sound toggle
    document.getElementById('soundToggleBtn').addEventListener('click', () => {
      settings.soundEnabled = !settings.soundEnabled;
      saveStateToStorage(false);
      showToast(settings.soundEnabled ? 'Scoring sound enabled' : 'Sound muted', 'info');
      const icon = document.querySelector('#soundToggleBtn i');
      if (icon) icon.className = settings.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
      if (settings.soundEnabled) playChime(true);
    });

    // Projector Fullscreen Mode
    document.getElementById('projectorBtn').addEventListener('click', toggleProjector);

    // Activity filter
    document.getElementById('activityTeamFilter').addEventListener('change', renderActivities);

    // Admin Auth
    document.getElementById('adminLoginBtn').addEventListener('click', openAdminAuth);
    document.getElementById('footerAdminBtn').addEventListener('click', openAdminAuth);
    document.getElementById('authForm').addEventListener('submit', handleAdminAuth);
    document.getElementById('togglePasswordBtn').addEventListener('click', togglePasscodeVisibility);

    // Admin Tabs
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const atab = e.currentTarget.getAttribute('data-atab');
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        document.getElementById('adminTabAward').classList.toggle('active', atab === 'award');
        document.getElementById('adminTabSquads').classList.toggle('active', atab === 'squads');
        document.getElementById('adminTabPhotos').classList.toggle('active', atab === 'photos');
        document.getElementById('adminTabData').classList.toggle('active', atab === 'data');
      });
    });

    // Quick score presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.getElementById('awardPointsAmount').value = e.currentTarget.getAttribute('data-pts');
      });
    });

    // Award points submit
    document.getElementById('awardPointsForm').addEventListener('submit', handleAwardSubmit);

    // Squad Modal
    document.getElementById('openAddSquadBtn').addEventListener('click', openAddSquad);
    document.getElementById('squadForm').addEventListener('submit', handleSquadSubmit);

    // Admin Logout
    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
      closeModal('adminModal');
      showToast('Admin session closed', 'info');
    });

    // Data tools
    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
    document.getElementById('exportJsonBtn').addEventListener('click', exportJson);
    document.getElementById('resetPointsBtn').addEventListener('click', resetPoints);

    // Close buttons & Backdrop clicks
    document.querySelectorAll('.modal-close-btn, [data-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.getAttribute('data-close');
        if (modalId) closeModal(modalId);
      });
    });
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal.id);
      });
    });
  }

  function switchNavTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });

    document.getElementById('leaderboardTab').classList.toggle('active', tab === 'leaderboard');
    document.getElementById('galleryTab').classList.toggle('active', tab === 'gallery');
    document.getElementById('activitiesTab').classList.toggle('active', tab === 'activities');
    document.getElementById('aboutTab').classList.toggle('active', tab === 'about');

    if (tab === 'gallery') renderGallery();
    if (tab === 'activities') renderActivities();
  }

  function toggleProjector() {
    const isProj = document.body.classList.toggle('projector-mode');
    const btn = document.getElementById('projectorBtn');
    if (isProj) {
      btn.innerHTML = '<i class="fa-solid fa-compress"></i> <span>Exit</span>';
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      showToast('Auditorium Fullscreen Active', 'info');
    } else {
      btn.innerHTML = '<i class="fa-solid fa-expand"></i> <span>Projector</span>';
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  // ================= 8. PHOTO UPLOAD LOGIC =================
  function openAddPhotoModal() {
    // If not authenticated, require admin pass
    const isAuth = sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true';
    if (!isAuth) {
      openAdminAuth();
      return;
    }

    tempPhotoDataUrl = '';
    document.getElementById('photoTitleInput').value = '';
    document.getElementById('photoDateInput').value = 'Day 3 - Special Camp';
    document.getElementById('photoFileInput').value = '';
    document.getElementById('photoUrlInput').value = '';
    document.getElementById('previewBox').innerHTML = '<div class="preview-empty"><i class="fa-solid fa-image"></i><span>No image selected yet</span></div>';
    openModal('addPhotoModal');
  }

  function handleImageFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
      const img = new Image();
      img.onload = function () {
        // Compress using Canvas
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX) {
          h *= MAX / w;
          w = MAX;
        } else if (h > MAX) {
          w *= MAX / h;
          h = MAX;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        tempPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.82);

        document.getElementById('previewBox').innerHTML = `<img src="${tempPhotoDataUrl}" alt="Preview">`;
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handlePhotoSubmit(e) {
    e.preventDefault();
    const type = document.querySelector('input[name="uploadType"]:checked').value;
    const title = document.getElementById('photoTitleInput').value.trim();
    const category = document.getElementById('photoCategorySelect').value;
    const date = document.getElementById('photoDateInput').value.trim();

    let finalUrl = '';
    if (type === 'file') {
      if (!tempPhotoDataUrl) {
        showToast('Please pick an image file first', 'error');
        return;
      }
      finalUrl = tempPhotoDataUrl;
    } else {
      finalUrl = document.getElementById('photoUrlInput').value.trim();
      if (!finalUrl) {
        showToast('Please enter an image link URL', 'error');
        return;
      }
    }

    const newPhoto = {
      id: 'photo-' + Date.now(),
      title,
      category,
      date: date || 'Camp Memory',
      url: finalUrl,
      timestamp: Date.now()
    };

    photos.unshift(newPhoto);
    saveStateToStorage(true);
    renderGallery();
    renderAdminViews();
    closeModal('addPhotoModal');
    showToast('Camp photo added successfully!', 'success');
  }

  function deletePhoto(pid) {
    if (confirm('Delete this photo?')) {
      photos = photos.filter(p => p.id !== pid);
      saveStateToStorage(true);
      renderGallery();
      renderAdminViews();
      showToast('Photo removed', 'info');
    }
  }

  // ================= 9. SCORING & ADMIN ACTIONS =================
  function openAdminAuth() {
    const isAuth = sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true';
    if (isAuth) {
      openModal('adminModal');
      renderAdminViews();
    } else {
      document.getElementById('adminPasscode').value = '';
      document.getElementById('authErrorMsg').style.display = 'none';
      openModal('authModal');
    }
  }

  function handleAdminAuth(e) {
    e.preventDefault();
    const entered = document.getElementById('adminPasscode').value.trim();
    if (entered === settings.adminPasscode) {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
      closeModal('authModal');
      openModal('adminModal');
      renderAdminViews();
      showToast('Officer access granted', 'success');
    } else {
      const err = document.getElementById('authErrorMsg');
      err.textContent = 'Incorrect password. Please try again.';
      err.style.display = 'block';
      playChime(false);
    }
  }

  function togglePasscodeVisibility() {
    const input = document.getElementById('adminPasscode');
    const icon = document.querySelector('#togglePasswordBtn i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fa-solid fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fa-solid fa-eye';
    }
  }

  function handleAwardSubmit(e) {
    e.preventDefault();
    const tid = document.getElementById('awardTargetTeam').value;
    const delta = parseInt(document.getElementById('awardPointsAmount').value, 10);
    const category = document.getElementById('awardCategory').value;
    const remark = document.getElementById('awardRemark').value.trim();

    if (!tid) {
      showToast('Please choose a team', 'error');
      return;
    }
    if (isNaN(delta) || delta === 0) {
      showToast('Please enter valid points', 'error');
      return;
    }

    const team = teams.find(t => t.id === tid);
    if (!team) return;

    const prevLeaderId = getSortedTeams()[0]?.id;
    team.points = (Number(team.points) || 0) + delta;
    team.lastUpdated = Date.now();

    activities.unshift({
      id: 'act-' + Date.now(),
      teamId: team.id,
      teamName: team.name,
      points: delta,
      category,
      remark: remark || `Awarded for ${category}`,
      timestamp: Date.now()
    });

    saveStateToStorage(true, team.id, delta);
    renderAll();

    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    showToast(`Committed ${sign} pts to ${team.name}!`, 'success');
    playChime(delta > 0);

    const newLeaderId = getSortedTeams()[0]?.id;
    if (newLeaderId === team.id && prevLeaderId !== team.id) {
      triggerConfetti();
      showToast(`🏆 ${team.name} took 1st PLACE!`, 'success');
    }

    document.getElementById('awardPointsAmount').value = '';
    document.getElementById('awardRemark').value = '';
  }

  function openAddSquad() {
    document.getElementById('squadModalTitle').textContent = 'Add New Team';
    document.getElementById('editSquadId').value = '';
    document.getElementById('squadNameInput').value = '';
    document.getElementById('squadLeaderInput').value = '';
    openModal('squadModal');
  }

  function openEditSquad(tid) {
    const team = teams.find(t => t.id === tid);
    if (!team) return;
    document.getElementById('squadModalTitle').textContent = 'Edit Team';
    document.getElementById('editSquadId').value = team.id;
    document.getElementById('squadNameInput').value = team.name;
    document.getElementById('squadLeaderInput').value = team.leader || '';
    openModal('squadModal');
  }

  const TEAM_COLORS = ['#1B2A6B', '#C8102E', '#0D9488', '#EA580C', '#7C3AED', '#2563EB', '#059669', '#D97706'];

  function handleSquadSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('editSquadId').value;
    const name = document.getElementById('squadNameInput').value.trim();
    const leader = document.getElementById('squadLeaderInput').value.trim();

    if (!name || !leader) {
      showToast('Team name and leader name are required', 'error');
      return;
    }

    if (editId) {
      const team = teams.find(t => t.id === editId);
      if (team) {
        team.name = name;
        team.leader = leader;
        team.lastUpdated = Date.now();
        showToast(`Team "${name}" updated`, 'success');
      }
    } else {
      const color = TEAM_COLORS[teams.length % TEAM_COLORS.length];
      teams.push({
        id: 'team-' + Date.now(),
        name,
        leader,
        members: 15,
        motto: '',
        color,
        points: 0,
        createdAt: Date.now(),
        lastUpdated: Date.now()
      });
      showToast(`Added Team "${name}"!`, 'success');
    }

    saveStateToStorage(true);
    renderAll();
    closeModal('squadModal');
  }

  function deleteSquad(tid) {
    const team = teams.find(t => t.id === tid);
    if (!team) return;
    if (confirm(`Remove "${team.name}"?`)) {
      teams = teams.filter(t => t.id !== tid);
      activities = activities.filter(a => a.teamId !== tid);
      saveStateToStorage(true);
      renderAll();
      showToast(`Team removed`, 'info');
    }
  }

  function openHistoryModal(tid) {
    const team = teams.find(t => t.id === tid);
    if (!team) return;

    document.getElementById('historyTeamName').textContent = team.name;
    document.getElementById('historyTeamSub').textContent = `Captain: ${team.leader || '—'} &bull; Score: ${team.points} pts`;

    const list = document.getElementById('historyTimelineList');
    const teamActs = activities.filter(a => a.teamId === team.id);

    if (teamActs.length === 0) {
      list.innerHTML = `<p style="text-align:center; padding:1.5rem; color:var(--text-muted);">No activity logged yet. Base score: ${team.points} pts.</p>`;
    } else {
      list.innerHTML = teamActs.map(act => `
        <div class="act-item ${act.points < 0 ? 'negative' : ''}">
          <div>
            <strong>${escapeHtml(act.category)}</strong>
            <div style="font-size:0.75rem; color:var(--text-secondary);">${escapeHtml(act.remark || '')}</div>
            <small style="color:var(--text-muted); font-size:0.7rem;">${formatDate(act.timestamp)}</small>
          </div>
          <strong style="font-size:1.05rem; color:${act.points < 0 ? 'var(--nss-red)' : 'var(--green)'};">
            ${act.points < 0 ? act.points : '+' + act.points} PTS
          </strong>
        </div>
      `).join('');
    }

    openModal('historyModal');
  }

  // Backup
  function exportCsv() {
    const sorted = getSortedTeams();
    let csv = 'Rank,Squad Name,Leader,Volunteers,Points,Motto\n';
    sorted.forEach((t, i) => {
      csv += `${i + 1},"${t.name}","${t.leader || ''}",${t.members || 14},${t.points},"${t.motto || ''}"\n`;
    });
    downloadBlob(csv, `NSS_Scores_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    showToast('Exported CSV', 'success');
  }

  function exportJson() {
    const data = { institution: 'Dr. B. B. Hegde College NSS', settings, teams, activities, photos };
    downloadBlob(JSON.stringify(data, null, 2), `NSS_Backup_${Date.now()}.json`, 'application/json');
    showToast('Exported JSON', 'success');
  }

  function resetPoints() {
    if (confirm('Reset all squad scores to 0?')) {
      teams.forEach(t => t.points = 0);
      activities = [];
      saveStateToStorage(true);
      renderAll();
      showToast('Points reset to 0', 'info');
    }
  }

  function downloadBlob(content, name, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Modal helpers
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  // Toasts
  function showToast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${escapeHtml(msg)}</span>`;
    c.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.25s ease';
      setTimeout(() => t.remove(), 250);
    }, 3000);
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
