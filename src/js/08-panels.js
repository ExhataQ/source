// ==============================================================================
// RIGHT PANEL - TOGGLE / COLLAPSE / EXPAND
// ==============================================================================
function toggleRightPanel() {
    const rightPanel = rightPanelElement;
    const playerToggleButton = document.querySelector('.queue-toggle-btn');
    const queueContent = document.getElementById('queue-content');
    const tagsContent = tagsContentElement;
    const recentlyPlayedContent = document.getElementById('recently-played-content');

    const isInQueueOrRecents =
        queueContent.classList.contains('active') || recentlyPlayedContent.classList.contains('active');
    const isInTags = tagsContent.classList.contains('active');

    if (isInQueueOrRecents) {
        if (lastRightPanelStateBeforeQueue.wasTab === 'tags') {
            if (lastRightPanelStateBeforeQueue.wasCollapsed) {
                collapseRightPanel();
            } else {
                expandRightPanel();
            }
            switchRightPanelTab('tags');
            playerToggleButton.classList.remove('active');
            playerToggleButton.setAttribute('aria-label', 'Open right panel');
        } else {
            collapseRightPanel();
            playerToggleButton.classList.remove('active');
            playerToggleButton.setAttribute('aria-label', 'Open right panel');
        }
        return;
    }

    if (isInTags) {
        lastRightPanelStateBeforeQueue = {
            wasCollapsed: rightPanelCollapsed,
            wasTab: 'tags'
        };

        if (rightPanelCollapsed) {
            expandRightPanel();
        }
        if (!rightPanel.classList.contains('active')) {
            rightPanel.classList.add('active');
        }
        switchRightPanelTab('queue');
        playerToggleButton.classList.add('active');
        playerToggleButton.setAttribute('aria-label', 'Close right panel');
        updateAlbumArt();
        updateScrollbarById('right-panel-content');
        return;
    }

    if (rightPanelCollapsed || !rightPanel.classList.contains('active')) {
        lastRightPanelStateBeforeQueue = {
            wasCollapsed: true,
            wasTab: 'queue'
        };

        expandRightPanel();
        rightPanel.classList.add('active');
        switchRightPanelTab('queue');
        playerToggleButton.classList.add('active');
        playerToggleButton.setAttribute('aria-label', 'Close right panel');
        updateAlbumArt();
        updateScrollbarById('right-panel-content');
        return;
    }
}

function openTagsTab() {
    const rightPanel = rightPanelElement;
    const playerToggleButton = document.querySelector('.queue-toggle-btn');
    const queueContent = document.getElementById('queue-content');
    const recentlyPlayedContent = document.getElementById('recently-played-content');
    const tagsContent = tagsContentElement;

    const isInQueueOrRecents =
        queueContent.classList.contains('active') || recentlyPlayedContent.classList.contains('active');

    if (isInQueueOrRecents) {
        switchRightPanelTab('tags');
        playerToggleButton.classList.remove('active');
        playerToggleButton.setAttribute('aria-label', 'Open right panel');
        updateScrollbarById('right-panel-content');
        return;
    }

    if (rightPanelCollapsed || !rightPanel.classList.contains('active')) {
        expandRightPanel();
        rightPanel.classList.add('active');
        switchRightPanelTab('tags');
        playerToggleButton.classList.remove('active');
        playerToggleButton.setAttribute('aria-label', 'Open right panel');
        updateAlbumArt();
        updateScrollbarById('right-panel-content');
        return;
    }

    if (tagsContent.classList.contains('active') && rightPanel.classList.contains('active')) {
        collapseRightPanel();
        playerToggleButton.classList.remove('active');
        playerToggleButton.setAttribute('aria-label', 'Open right panel');
        return;
    }
}

function collapseRightPanel() {
    rightPanelCollapsed = true;
    const rightPanel = rightPanelElement;
    const collapseBtn = document.getElementById('right-panel-collapse-btn');
    const collapseIcon = document.getElementById('right-panel-collapse-icon');

    rightPanel.classList.add('collapsed');
    if (collapseBtn) collapseBtn.classList.add('active');
    if (collapseIcon) collapseIcon.textContent = 'left_panel_open';
    localStorage.setItem('rightPanelCollapsed', 'true');

    document.querySelectorAll('.queue-toggle-btn').forEach((btn) => {
        btn.classList.remove('active');
    });

    const rightPanelContent = document.querySelector('.right-panel-content');
    if (rightPanelContent) {
        rightPanelContent.style.display = 'none';
    }

    let toggleBtn = document.getElementById('right-panel-expand-toggle');
    if (!toggleBtn) {
        toggleBtn = document.createElement('div');
        toggleBtn.id = 'right-panel-expand-toggle';
        toggleBtn.className = 'right-panel-expand-toggle';
        toggleBtn.innerHTML = '<span class="material-symbols-outlined" style="font-weight: 300;">chevron_left</span>';
        toggleBtn.setAttribute('data-original-title', 'Show now playing view');
        toggleBtn.onclick = function (e) {
            e.stopPropagation();
            temporarilySuppressTooltip(toggleBtn);
            expandRightPanel();
        };
        rightPanel.appendChild(toggleBtn);
        rightPanel.style.cursor = 'pointer';
        rightPanel.onclick = function (e) {
            if (e.target === rightPanel || e.target.closest('.right-panel-expand-toggle')) {
                expandRightPanel();
            }
        };
    }

    recalcLayoutWidths();
    setTimeout(function () {
        if (typeof updateSettingsMargins === 'function') updateSettingsMargins();
    }, 30);
}

function expandRightPanel() {
    rightPanelCollapsed = false;
    const rightPanel = rightPanelElement;
    const collapseBtn = document.getElementById('right-panel-collapse-btn');
    const collapseIcon = document.getElementById('right-panel-collapse-icon');

    rightPanel.classList.remove('collapsed');
    if (collapseBtn) collapseBtn.classList.remove('active');
    if (collapseIcon) collapseIcon.textContent = 'left_panel_close';
    localStorage.setItem('rightPanelCollapsed', 'false');

    const rightPanelContent = document.querySelector('.right-panel-content');
    if (rightPanelContent) {
        rightPanelContent.style.display = '';
    }

    const toggleBtn = document.getElementById('right-panel-expand-toggle');
    if (toggleBtn) {
        toggleBtn.remove();
    }
    if (rightPanelElement) {
        rightPanelElement.style.cursor = '';
        rightPanelElement.onclick = null;
    }

    const queueToggleBtn = document.querySelector('.queue-toggle-btn');
    if (queueToggleBtn && tagsContentElement.classList.contains('active')) {
        queueToggleBtn.classList.remove('active');
    }

    recalcLayoutWidths();
    setTimeout(function () {
        if (typeof updateSettingsMargins === 'function') updateSettingsMargins();
    }, 30);
}

function toggleRightPanelCollapse() {
    const btn = document.getElementById('right-panel-collapse-btn');
    if (btn) temporarilySuppressTooltip(btn);

    if (rightPanelCollapsed) {
        expandRightPanel();
    } else {
        collapseRightPanel();
    }
}

// ==============================================================================
// ALBUM ART & RIGHT PANEL TABS
// ==============================================================================
function updateAlbumArt() {
    const albumArtImage = document.getElementById('album-art-image');
    const tagTitle = document.getElementById('tag-title');
    const tagArtist = document.getElementById('tag-artist');
    const tagAlbum = document.getElementById('tag-album');
    const tagTrack = document.getElementById('tag-track');
    const tagComposer = document.getElementById('tag-composer');
    const tagGenre = document.getElementById('tag-genre');
    const tagYear = document.getElementById('tag-year');
    const tagDuration = document.getElementById('tag-duration');

    if (currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
        const queueItem = playbackQueue[currentQueueIndex];
        const currentSong = queueItem.song || queueItem;
        const largeCover =
            typeof currentSong.largeCover === 'string' && currentSong.largeCover.trim() !== ''
                ? currentSong.largeCover
                : typeof currentSong.cover === 'string' && currentSong.cover.trim() !== ''
                ? currentSong.cover
                : PLACEHOLDER_IMAGE;

        albumArtImage.src = largeCover;

        tagTitle.textContent = currentSong.title || '—';
        tagArtist.innerHTML = buildPlayerArtistHTML(currentSong.artist);
        tagAlbum.textContent = currentSong.album || '—';
        if (currentSong.track && currentSong.track !== '') {
            document.getElementById('tag-track-row').style.display = 'flex';
            tagTrack.textContent = currentSong.track;
        } else {
            document.getElementById('tag-track-row').style.display = 'flex';
            tagTrack.textContent = '';
        }
        tagComposer.textContent = currentSong.composer || '';
        tagGenre.textContent = currentSong.genre || '';
        tagYear.textContent = currentSong.year || '';
        tagDuration.textContent = currentSong.duration || '';

        const moreInfoBtn = document.getElementById('right-panel-more-info');
        if (moreInfoBtn) {
            const tagsActive = tagsContentElement.classList.contains('active');
            if (tagsActive) {
                moreInfoBtn.style.display = 'flex';
                moreInfoBtn.setAttribute('title', `More options for ${currentSong.title.replace(/"/g, '&quot;')}`);
            } else {
                moreInfoBtn.style.display = 'none';
            }
        }

        if (tagsContentElement.classList.contains('active')) {
            const sourceName =
                typeof getCurrentPlayingSourceName === 'function' ? getCurrentPlayingSourceName() : 'Track Info';
            const headerTitle = document.getElementById('right-panel-header-title');
            if (headerTitle) {
                headerTitle.textContent = sourceName;
                headerTitle.classList.remove('active-underline');
                headerTitle.classList.add('source-name-header');
            }
        }
    } else {
        const moreInfoBtn = document.getElementById('right-panel-more-info');
        if (moreInfoBtn) {
            moreInfoBtn.style.display = 'none';
        }
        albumArtImage.src = PLACEHOLDER_IMAGE;

        tagTitle.textContent = '';
        tagArtist.textContent = '';
        tagAlbum.textContent = '';
        document.getElementById('tag-track-row').style.display = 'flex';
        tagTrack.textContent = '';
        tagComposer.textContent = '';
        tagGenre.textContent = '';
        tagYear.textContent = '';
        tagDuration.textContent = '';
    }

    updateInfoButtonVisibility();

    if (currentView === 'lyrics') {
        renderLyricsView();
    }
}

function getCurrentSongForInfo() {
    if (currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
        const queueItem = playbackQueue[currentQueueIndex];
        return queueItem.song || queueItem;
    }
    return null;
}

function hasEnabledExtendedFields() {
    const settings = getExtendedMetadataSettings();
    return EXTENDED_METADATA_FIELDS.some((f) => !f.hidden && settings[f.key]);
}

function updateInfoButtonVisibility() {
    const btn = document.getElementById('track-info-btn');
    if (!btn) return;
    const tagsActive = tagsContentElement.classList.contains('active');
    const hasSong = currentQueueIndex >= 0 && playbackQueue[currentQueueIndex];
    if (tagsActive && hasSong && hasEnabledExtendedFields()) {
        btn.style.display = 'flex';
    } else {
        btn.style.display = 'none';
    }
}

function openExtendedInfoPanel() {
    const overlay = document.getElementById('extended-info-overlay');
    const content = document.getElementById('extended-info-content');
    if (!overlay || !content) return;

    const song = getCurrentSongForInfo();
    if (!song) return;

    const settings = getExtendedMetadataSettings();
    const groups = {};
    const groupOrder = ['People', 'Structure', 'Publishing', 'Identifiers', 'Technical', 'Misc', 'Sort'];

    EXTENDED_METADATA_FIELDS.forEach((f) => {
        if (f.hidden) return;
        if (!settings[f.key]) return;
        const value = song[f.key];
        if (value === undefined || value === null || String(value).trim() === '') return;
        if (!groups[f.group]) groups[f.group] = [];
        groups[f.group].push({
            label: f.label,
            value: String(value)
        });
    });

    let bodyHTML = '';
    let totalRows = 0;
    groupOrder.forEach((groupName) => {
        if (!groups[groupName] || groups[groupName].length === 0) return;
        bodyHTML += `<div class="extended-info-group-label">${escapeHtml(groupName)}</div>`;
        groups[groupName].forEach((row) => {
            bodyHTML += `
                <div class="extended-info-row">
                    <span class="extended-info-label">${escapeHtml(row.label)}</span>
                    <span class="extended-info-value">${escapeHtml(row.value)}</span>
                </div>`;
            totalRows++;
        });
    });

    if (totalRows === 0) {
        bodyHTML = `<div class="extended-info-empty">No extended metadata available for this track</div>`;
    }

    content.innerHTML = `
        <div class="extended-info-header">
            <div class="extended-info-title">Track Information</div>
            <button class="extended-info-close" onclick="closeExtendedInfoPanel()" aria-label="Close">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div class="extended-info-body">${bodyHTML}</div>
    `;

    overlay.classList.add('active');
    document.addEventListener('keydown', extendedInfoKeyHandler);
}

function closeExtendedInfoPanel() {
    const overlay = document.getElementById('extended-info-overlay');
    if (overlay) overlay.classList.remove('active');
    document.removeEventListener('keydown', extendedInfoKeyHandler);
}

function extendedInfoKeyHandler(e) {
    if (e.key === 'Escape') {
        closeExtendedInfoPanel();
    }
}

function showRightPanelContextMenu(event) {
    event.stopPropagation();
    event.preventDefault();

    const clickedMoreInfo = event.target.closest('.more-info');
    if (clickedMoreInfo) {
        temporarilySuppressTooltip(clickedMoreInfo);
    }

    if (currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
        const currentSong = playbackQueue[currentQueueIndex].song || playbackQueue[currentQueueIndex];
        showContextMenu(event, currentSong.id);
    }
}

function switchRightPanelTab(tab) {
    document.querySelectorAll('.panel-content').forEach((c) => c.classList.remove('active'));
    document.getElementById(`${tab}-content`).classList.add('active');
    updateRightPanelHeader(tab);

    const headerContent = document.querySelector('.right-panel-header-content');
    if (headerContent) {
        headerContent.classList.remove('queue-mode', 'tags-mode');
        if (tab === 'tags') {
            headerContent.classList.add('tags-mode');
        } else {
            headerContent.classList.add('queue-mode');
        }
    }

    const moreInfoBtn = document.getElementById('right-panel-more-info');
    const closeBtn = document.getElementById('right-panel-close-btn');

    if (moreInfoBtn) moreInfoBtn.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';

    if (tab === 'tags') {
        if (moreInfoBtn && currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
            moreInfoBtn.style.display = 'flex';
            const currentSong = playbackQueue[currentQueueIndex].song || playbackQueue[currentQueueIndex];
            moreInfoBtn.setAttribute('title', `More options for ${currentSong.title.replace(/"/g, '&quot;')}`);
        }
    } else if (tab === 'queue' || tab === 'recently-played') {
        if (closeBtn) closeBtn.style.display = 'flex';
    }

    if (tab === 'recently-played') {
        renderPortableRecentlyPlayed();
    }

    updateInfoButtonVisibility();

    updateScrollbarById('right-panel-content');
}

function updateRightPanelHeader(tab) {
    const headerTitle = document.getElementById('right-panel-header-title');
    const recentText = document.getElementById('recently-played-text');

    headerTitle.classList.remove('active-underline', 'source-name-header');
    recentText.classList.remove('active-underline');

    if (tab === 'queue') {
        headerTitle.textContent = 'Queue';
        headerTitle.classList.add('active-underline');
        recentText.style.display = 'inline';
        headerTitle.style.pointerEvents = 'auto';
        headerTitle.style.cursor = 'pointer';
        headerTitle.setAttribute('onclick', 'switchToQueuePanel()');
    } else if (tab === 'tags') {
        const sourceName = getCurrentPlayingSourceName();
        headerTitle.textContent = sourceName;
        headerTitle.classList.add('source-name-header');
        headerTitle.style.pointerEvents = 'auto';
        headerTitle.style.cursor = 'pointer';
        headerTitle.setAttribute('onclick', 'navigateToCurrentSourceView()');
        recentText.style.display = 'none';
    } else if (tab === 'recently-played') {
        headerTitle.textContent = 'Queue';
        recentText.classList.add('active-underline');
        recentText.style.display = 'inline';
        headerTitle.style.pointerEvents = 'auto';
        headerTitle.style.cursor = 'pointer';
        headerTitle.setAttribute('onclick', 'switchToQueuePanel()');
    }
}

function getCurrentPlayingSourceName() {
    if (currentQueueIndex < 0 || !playbackQueue[currentQueueIndex]) {
        return 'Track Info';
    }

    const queueItem = playbackQueue[currentQueueIndex];
    const listId = queueItem.listId || 'all-songs';

    if (listId === 'all-songs') {
        return 'All Songs';
    } else if (listId === 'favorites') {
        return 'Liked Songs';
    } else if (listId === 'history') {
        return 'Recents';
    } else if (listId && listId.startsWith('playlist-')) {
        const playlistId = listId.replace('playlist-', '');
        const playlists = getPlaylists();
        const playlist = playlists.find((p) => p.id == playlistId || p.id === playlistId);
        return playlist ? playlist.name : 'Playlist';
    } else if (listId && listId.startsWith('a') && listId.length === 13) {
        const albums = getAlbums();
        const album = albums.find((a) => a.id === listId);
        return album ? album.name : 'Album';
    } else if (listId && listId.startsWith('r') && listId.length === 13) {
        const artists = getArtists();
        const artist = artists.find((a) => a.id === listId);
        return artist ? artist.name : 'Artist';
    }

    return 'Track Info';
}

function navigateToCurrentSourceView() {
    if (currentQueueIndex < 0 || !playbackQueue[currentQueueIndex]) {
        return;
    }

    const queueItem = playbackQueue[currentQueueIndex];
    const listId = queueItem.listId || 'all-songs';

    if (listId === 'all-songs') {
        switchView('all-songs');
    } else if (listId === 'favorites') {
        switchView('favorites');
    } else if (listId === 'history') {
        switchView('history');
    } else if (listId && listId.startsWith('playlist-')) {
        const playlistId = listId.replace('playlist-', '');
        openPlaylist(playlistId);
    } else if (listId && listId.startsWith('a') && listId.length === 13) {
        openDetailView(listId, 'album');
    } else if (listId && listId.startsWith('r') && listId.length === 13) {
        openDetailView(listId, 'artist');
    }
}

function switchToRecentlyPlayedPanel() {
    if (!document.getElementById('recently-played-content').classList.contains('active')) {
        switchRightPanelTab('recently-played');
    }
}

function switchToQueuePanel() {
    switchRightPanelTab('queue');
}

// ==============================================================================
// SETTINGS PANEL
// ==============================================================================
function openSettingsPanel() {
    if (advancedSettingsOpen) {
        renderAdvancedSettingsPanel();
        return;
    }

    const songList = songListElement;
    const songListContainer = document.getElementById('song-list-container');
    const settingsButton = document.querySelector('.settings-toggle-btn');

    if (!songList || !songListContainer) {
        return;
    }

    resetLeftPanelActiveState();
    if (settingsButton) {
        settingsButton.classList.add('active');
    }
    if (typeof updateActiveHighlight === 'function') {
        updateActiveHighlight(null);
    }
    pushViewToHistory('settings');

    showHeroSection(false);
    showTracklistHeader(false);

    setSubheroVisibility('settings');

    const gradientWrapper = document.querySelector('.content-gradient-wrapper');
    if (gradientWrapper) gradientWrapper.classList.add('no-gradient');

    songList.style.display = 'flex';
    songList.style.justifyContent = 'center';
    songList.innerHTML = `
    <div class="settings-panel-content">
            <h3 class="settings-panel-title">Settings</h3>
                <div class="settings-panel-actions">
                    <button class="settings-action-btn" onclick="switchToHistoryFromSettings();">
                        <i class="fas fa-history"></i>
                        <span>View Play History</span>
                    </button>
                    <button class="settings-action-btn" onclick="switchToSearchHistoryFromSettings();">
                        <i class="fas fa-search"></i>
                        <span>Search History</span>
                    </button>
                    <div class="settings-section">
                        <div class="settings-section-title">Theme Color</div>
                        <div class="settings-theme-selector" id="settings-theme-selector">
                        </div>
                    </div>
                    <div class="settings-section">
                        <div class="settings-section-title">Music Source</div>
                        <button class="settings-action-btn settings-action-btn-full" onclick="changeMusicFolder()">
                            <i class="fas fa-folder-open"></i>
                            <span>Change Music Folder (Legacy)</span>
                        </button>
                    </div>
<div class="library-locations-section">
<div class="library-locations-header">
<span class="library-locations-title">Music Source Folders</span>
<div class="library-locations-header-buttons">
<button class="library-locations-add-btn" onclick="addLibraryLocation()">
<i class="fas fa-plus"></i>
Add Folder
</button>
<button class="library-locations-add-btn" onclick="removeSelectedLibraryFolder()" style="border-color: #ff4444; color: #ff4444;">
<i class="fas fa-trash-alt"></i>
Remove Folder
</button>
</div>
</div>
<div class="library-locations-list-container">
<div class="library-locations-list" id="library-locations-list">
<div class="empty-queue" style="padding: 20px; text-align: center;">
<i class="fas fa-folder-open"></i>
<p>No folders added</p>
<small>Click "Add Folder" to include music locations</small>
</div>
</div>
</div>
<div class="library-locations-footer">
<button class="library-locations-rebuild-btn" onclick="rebuildLibraryFromFolders()">
<i class="fas fa-save"></i>
Save and Apply Changes
</button>
</div>
</div>
                    <div class="settings-section">
                        <div class="settings-section-title">Play from URL — Save Location</div>
                        <div class="settings-url-save-row">
                            <div class="settings-url-save-path" id="url-save-path-display" title="">—</div>
                            <button class="settings-action-btn settings-action-btn-half" onclick="changeUrlSaveFolder()">
                                <i class="fas fa-folder-open"></i>
                                <span>Change</span>
                            </button>
                            <button class="settings-action-btn settings-action-btn-half" onclick="resetUrlSaveFolder()">
                                <i class="fas fa-undo"></i>
                                <span>Reset</span>
                            </button>
                        </div>
                        <div class="settings-threshold-hint" style="margin-top: 8px;">
                            Songs downloaded via "Play from URL → Download & Stream" will be saved here.
                        </div>
                    </div>
                    <div class="settings-section">
                        <div class="settings-section-title">Backup & Restore</div>
                        <div class="settings-backup-row">
                            <button class="settings-action-btn settings-action-btn-half" onclick="exportAllData()">
                                <i class="fas fa-download"></i>
                                <span>Export Data</span>
                            </button>
                            <button class="settings-action-btn settings-action-btn-half" onclick="importAllData()">
                                <i class="fas fa-upload"></i>
                                <span>Import Data</span>
                            </button>
                        </div>
                    </div>
                    <div class="settings-section">
                        <div class="settings-section-title">Advanced</div>
                        <button class="settings-action-btn settings-action-btn-full" onclick="openAdvancedSettings()">
                            <i class="fas fa-sliders-h"></i>
                            <span>Advanced Settings</span>
                        </button>
                    </div>
                </div>
            </div>
    `;

    renderLibraryLocations();
    refreshUrlSaveFolderDisplay();
    updateSettingsMargins();

    const currentTheme = document.body.classList.contains('theme-pink')
        ? 'pink'
        : document.body.classList.contains('theme-purple')
        ? 'purple'
        : document.body.classList.contains('theme-yellow')
        ? 'yellow'
        : document.body.classList.contains('theme-white')
        ? 'white'
        : 'green';

    const themes = [
        {
            name: 'green',
            color: '#1db954'
        },
        {
            name: 'pink',
            color: '#ff6b9d'
        },
        {
            name: 'purple',
            color: '#9d4edd'
        },
        {
            name: 'yellow',
            color: '#ffd43b'
        },
        {
            name: 'white',
            color: '#f8f9fa'
        }
    ];

    const themeSelector = document.getElementById('settings-theme-selector');
    if (themeSelector) {
        themeSelector.innerHTML = themes
            .map(
                (t) =>
                    `<button class="settings-theme-btn${t.name === currentTheme ? ' active' : ''}" data-theme="${
                        t.name
                    }" aria-label="${t.name.charAt(0).toUpperCase() + t.name.slice(1)} theme">
                    <i class="fas fa-circle settings-theme-icon" style="color: ${t.color};"></i>
            </button>`
            )
            .join('');
    }

    initThemeButtons();

    setTimeout(() => {
        if (typeof updateExternalScrollbar === 'function') {
            updateExternalScrollbar();
        }
    }, 50);
}

function openAdvancedSettings() {
    pushViewToHistory('settings-advanced');
    advancedSettingsOpen = true;
    renderAdvancedSettingsPanel();
}

function closeAdvancedSettings() {
    pushViewToHistory('settings');
    advancedSettingsOpen = false;
    openSettingsPanel();
}

function renderAdvancedSettingsPanel() {
    const songList = songListElement;

    const settings = getExtendedMetadataSettings();
    const groupOrder = ['People', 'Structure', 'Publishing', 'Identifiers', 'Technical', 'Misc', 'Sort'];
    const groups = {};
    EXTENDED_METADATA_FIELDS.forEach((f) => {
        if (!groups[f.group]) groups[f.group] = [];
        groups[f.group].push(f);
    });

    let checkboxHTML = '';
    groupOrder.forEach((groupName) => {
        if (!groups[groupName]) return;
        const visibleFields = groups[groupName].filter((f) => !f.hidden);
        if (visibleFields.length === 0) return;
        checkboxHTML += `<div class="extended-fields-group-label">${escapeHtml(groupName)}</div>`;
        visibleFields.forEach((f) => {
            const checked = settings[f.key] ? 'checked' : '';
            checkboxHTML += `
                <label class="extended-field-checkbox-row">
                    <input type="checkbox" ${checked}
                           onchange="toggleExtendedMetadataField('${f.key}', this.checked)">
                    <span>${escapeHtml(f.label)}</span>
                </label>`;
        });
    });

    songList.style.display = 'flex';
    songList.style.justifyContent = 'center';
    songList.innerHTML = `
    <div class="settings-panel-content">
            <div class="settings-advanced-header">
                    <button class="settings-advanced-back-btn" onclick="closeAdvancedSettings()" aria-label="Back to settings">
                            <span class="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h3 class="settings-panel-title" style="margin: 0; border-bottom: none; padding-bottom: 0;">Advanced Settings</h3>
            </div>
            <div class="settings-advanced-body">
                    <div class="settings-section">
                            <div class="settings-section-title">Virtual Scroll Threshold</div>
                            <div class="settings-threshold-row">
                                    <input type="range" class="settings-threshold-slider" id="threshold-slider"
                                           min="${MIN_VIRTUAL_SCROLL_THRESHOLD}"
                                           max="${MAX_VIRTUAL_SCROLL_THRESHOLD}"
                                           step="50"
                                           value="${VIRTUAL_SCROLL_THRESHOLD}"
                                           oninput="handleThresholdInput(this.value)"
                                           aria-label="Virtual scroll threshold">
                                    <div class="settings-threshold-value" id="threshold-value-display">${VIRTUAL_SCROLL_THRESHOLD}</div>
                            </div>
                            <div class="settings-threshold-hint">
                                    Lists with more than <span id="threshold-hint-value">${VIRTUAL_SCROLL_THRESHOLD}</span> items will use virtual scrolling.
                            </div>
                    </div>
                    <div class="settings-section">
                            <div class="settings-section-title">Extended Track Info</div>
                            <div class="settings-threshold-hint" style="margin-bottom: 12px;">
                                    Enable fields to extract and display below the standard Track Info section.
                            </div>
                            <div class="extended-fields-list">
                                    ${checkboxHTML}
                            </div>
                    </div>
<div class="library-locations-section">
<div class="library-locations-header">
<span class="library-locations-title">Saved Lyrics</span>
<div class="library-locations-header-buttons">
<button class="library-locations-add-btn" onclick="removeAllSavedLyrics()" style="border-color: #ff4444; color: #ff4444;">
<i class="fas fa-trash-alt"></i>
Remove All
</button>
</div>
</div>
<div class="library-locations-list-container">
<div class="library-locations-list" id="saved-lyrics-list">
</div>
</div>
</div>
            </div>
    </div>
    `;

    renderSavedLyricsList();

    updateSettingsMargins();

    updateThresholdSliderFill(VIRTUAL_SCROLL_THRESHOLD);

    setTimeout(() => {
        if (typeof updateExternalScrollbar === 'function') {
            updateExternalScrollbar();
        }
    }, 50);
}

function handleThresholdInput(value) {
    if (typeof snapVirtualScrollThreshold !== 'function') return;

    const v = snapVirtualScrollThreshold(value);

    const display = document.getElementById('threshold-value-display');
    if (display) display.textContent = v;

    const hint = document.getElementById('threshold-hint-value');
    if (hint) hint.textContent = v;

    updateThresholdSliderFill(v);

    if (typeof setVirtualScrollThreshold === 'function') {
        setVirtualScrollThreshold(v);
    }
}

function updateThresholdSliderFill(value) {
    const slider = document.getElementById('threshold-slider');
    if (!slider) return;
    const min = parseInt(slider.min, 10) || 0;
    const max = parseInt(slider.max, 10) || 100;
    const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
    slider.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--bg-hover) ${pct}%, var(--bg-hover) 100%)`;
}

function enterSettingsFromHistory() {
    advancedSettingsOpen = false;
    currentView = 'settings';
    resetLeftPanelActiveState();
    resetViewScroll();
    setSubheroVisibility('settings');
    showHeroSection(false);
    showTracklistHeader(false);
    updateHeroCover('settings');

    const settingsToggleBtn = document.querySelector('.settings-toggle-btn');
    if (settingsToggleBtn) settingsToggleBtn.classList.add('active');

    openSettingsPanel();
}

function enterAdvancedSettingsFromHistory() {
    advancedSettingsOpen = true;
    currentView = 'settings';
    resetLeftPanelActiveState();
    resetViewScroll();
    setSubheroVisibility('settings');
    showHeroSection(false);
    showTracklistHeader(false);
    updateHeroCover('settings');

    const settingsToggleBtn = document.querySelector('.settings-toggle-btn');
    if (settingsToggleBtn) settingsToggleBtn.classList.add('active');

    renderAdvancedSettingsPanel();
}

function closeSettingsPanelOnly() {
    advancedSettingsOpen = false;
    if (currentView === 'all-songs') {
        teardownLazyLoading();
    }

    const settingsButton = document.querySelector('.settings-toggle-btn');
    const songList = songListElement;

    if (settingsButton) {
        settingsButton.classList.remove('active');
    }
    if (songList) {
        songList.style.display = '';
        songList.style.justifyContent = '';
    }

    const gradientWrapper = document.querySelector('.content-gradient-wrapper');
    if (gradientWrapper) gradientWrapper.classList.remove('no-gradient');

    const viewToRestore = currentView === 'settings' ? 'all-songs' : currentView;
    switchView(viewToRestore);
    updateSettingsMargins();
}

function closeSettingsPanel() {
    closeSettingsPanelOnly();
}

function toggleSettingsPanel() {
    if (currentView === 'settings' && advancedSettingsOpen) {
        closeAdvancedSettings();
        return;
    }
    if (currentView === 'settings') {
        closeSettingsPanelOnly();
    } else {
        if (currentView === 'lyrics') {
            if (typeof teardownLyricsView === 'function') {
                teardownLyricsView();
            }
            document.body.classList.remove('in-lyrics-view');
            const songListContainer = document.getElementById('song-list-container');
            if (songListContainer) songListContainer.style.display = '';
            const lyricsToggleBtn = document.getElementById('lyrics-toggle-btn');
            if (lyricsToggleBtn) lyricsToggleBtn.classList.remove('active');
            lyricsSavedView = null;
        }

        advancedSettingsOpen = false;
        pushViewToHistory('settings');
        currentView = 'settings';
        resetLeftPanelActiveState();
        resetViewScroll();

        if (typeof clearAllSelections === 'function') {
            clearAllSelections();
        }

        resetSearchState();
        resetSubheroSearch();

        const settingsToggleBtn = document.querySelector('.settings-toggle-btn');
        if (settingsToggleBtn) {
            settingsToggleBtn.classList.add('active');
        }

        setSubheroVisibility('settings');
        showHeroSection(false);
        showTracklistHeader(false);
        openSettingsPanel();

        updateHeroCover('settings');

        setTimeout(() => {
            if (typeof updateExternalScrollbar === 'function') {
                updateExternalScrollbar();
            }
        }, 50);
    }
}

async function refreshUrlSaveFolderDisplay() {
    const el = document.getElementById('url-save-path-display');
    if (!el) return;
    if (!window.electronAPI || !window.electronAPI.getDownloadFolder) {
        el.textContent = 'Not available in browser mode';
        el.title = '';
        return;
    }
    try {
        const res = await window.electronAPI.getDownloadFolder();
        if (res && res.folder) {
            el.textContent = res.folder;
            el.title = res.folder;
        } else {
            el.textContent = '—';
            el.title = '';
        }
    } catch (e) {
        el.textContent = '—';
        el.title = '';
    }
}

async function changeUrlSaveFolder() {
    if (!window.electronAPI || !window.electronAPI.pickDownloadFolder) {
        showNotification('Not available in browser mode', 'warning', 2000);
        return;
    }
    const res = await window.electronAPI.pickDownloadFolder();
    if (res && res.success) {
        await refreshUrlSaveFolderDisplay();
        showNotification('Download folder updated', 'success', 2000);
    } else if (res && res.reason !== 'cancelled') {
        showNotification('Failed to change folder', 'error', 2000);
    }
}

async function resetUrlSaveFolder() {
    if (!window.electronAPI || !window.electronAPI.pickDownloadFolder) {
        showNotification('Not available in browser mode', 'warning', 2000);
        return;
    }
    const confirmed = await showConfirmDialog({
        title: 'Reset Download Folder',
        message: 'Reset the Play-from-URL save location back to your system Downloads folder?',
        okText: 'Reset',
        cancelText: 'Cancel'
    });
    if (!confirmed) return;
    const res = await window.electronAPI.resetDownloadFolder?.();
    if (res && res.success) {
        await refreshUrlSaveFolderDisplay();
        showNotification('Reset to default Downloads folder', 'success', 2000);
    } else {
        await refreshUrlSaveFolderDisplay();
        showNotification('Reset to default Downloads folder', 'success', 2000);
    }
}

// ==============================================================================
// EXTENDED METADATA SETTINGS
// ==============================================================================
function getExtendedMetadataSettings() {
    try {
        const saved = localStorage.getItem('extendedMetadataEnabled');
        if (saved) {
            const parsed = JSON.parse(saved);
            const result = {};
            EXTENDED_METADATA_FIELDS.forEach((f) => {
                if (f.hidden) {
                    result[f.key] = false;
                    return;
                }
                result[f.key] = parsed[f.key] !== undefined ? !!parsed[f.key] : !!f.defaultOn;
            });
            return result;
        }
    } catch (e) {}
    const defaults = {};
    EXTENDED_METADATA_FIELDS.forEach((f) => {
        defaults[f.key] = f.hidden ? false : !!f.defaultOn;
    });
    return defaults;
}

function saveExtendedMetadataSettings(settings) {
    localStorage.setItem('extendedMetadataEnabled', JSON.stringify(settings));
}

function toggleExtendedMetadataField(fieldKey, enabled) {
    const settings = getExtendedMetadataSettings();
    settings[fieldKey] = !!enabled;
    saveExtendedMetadataSettings(settings);
    updateInfoButtonVisibility();
}

// ==============================================================================
// SAVED LYRICS MANAGEMENT
// ==============================================================================
function getSavedLyricsEntries() {
    const store = getCustomLyricsStore();
    const entries = [];
    const activeSongs = getActiveSongs();

    for (const key in store) {
        const text = store[key];
        if (!text || String(text).trim() === '') continue;

        let song = null;

        if (isNaN(parseInt(key, 10)) || String(parseInt(key, 10)) !== key) {
            song = activeSongs.find((s) => s.url === key);
        }
        if (!song) {
            const idNum = parseInt(key, 10);
            if (!isNaN(idNum)) {
                song = activeSongs.find((s) => s.id === idNum);
            }
        }

        entries.push({
            key: key,
            text: String(text),
            song: song,
            title: song ? song.title : 'Unknown Track',
            artist: song ? song.artist : 'Unknown Artist',
            duration: song ? song.duration : '—',
            missing: !song
        });
    }

    entries.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return entries;
}

function renderSavedLyricsList() {
    const container = document.getElementById('saved-lyrics-list');
    if (!container) return;

    const entries = getSavedLyricsEntries();

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="empty-queue" style="padding: 40px 20px; text-align: center;">
                <i class="fas fa-align-left" style="font-size: 32px; opacity: 0.5;"></i>
                <p style="margin-top: 12px;">No saved lyrics</p>
                <small>Edited or added lyrics will appear here</small>
            </div>
        `;
        return;
    }

    container.innerHTML = entries
        .map((entry, idx) => {
            const safeKey = escapeHtml(entry.key);
            const titleText = escapeHtml(entry.title || 'Unknown Track');
            const artistText = entry.missing ? 'File not found' : escapeHtml(entry.artist || 'Unknown Artist');
            const icon = entry.missing ? 'fa-unlink' : 'fa-file-alt';
            const iconColor = entry.missing ? '#ff4444' : '';

            return `
            <div class="library-location-item" data-lyrics-key="${safeKey}" onclick="openSavedLyricsViewer('${safeKey.replace(
                /'/g,
                "\\'"
            )}')">
                <div class="library-location-name">
                    <i class="fas ${icon}" style="${iconColor ? 'color: ' + iconColor + ';' : ''}"></i>
                    <span>${titleText}</span>
                </div>
                <div class="library-location-path" title="${escapeHtml(
                    entry.text.substring(0, 200)
                )}">${artistText}</div>
                <div class="library-location-song-count">${entry.duration}</div>
            </div>
        `;
        })
        .join('');
}

function openSavedLyricsViewer(key) {
    const store = getCustomLyricsStore();
    if (store[key] === undefined) return;

    let song = null;
    const activeSongs = getActiveSongs();

    if (isNaN(parseInt(key, 10)) || String(parseInt(key, 10)) !== key) {
        song = activeSongs.find((s) => s.url === key);
    }
    if (!song) {
        const idNum = parseInt(key, 10);
        if (!isNaN(idNum)) song = activeSongs.find((s) => s.id === idNum);
    }

    const title = song ? song.title : 'Unknown Track';
    const artist = song ? song.artist : 'Unknown Artist';
    const lyricsText = store[key];

    let overlay = document.getElementById('saved-lyrics-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'saved-lyrics-overlay';
        overlay.className = 'extended-info-overlay';
        overlay.onclick = closeSavedLyricsViewer;
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div class="extended-info-modal saved-lyrics-modal" onclick="event.stopPropagation()">
            <div class="extended-info-header">
                <div>
                    <div class="extended-info-title">${escapeHtml(title)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(
                        artist
                    )}</div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="extended-info-close" onclick="deleteSavedLyricsEntry('${key.replace(
                        /'/g,
                        "\\'"
                    )}')" title="Delete lyrics" aria-label="Delete lyrics" style="color: #ff4444;">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                    <button class="extended-info-close" onclick="closeSavedLyricsViewer()" aria-label="Close">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
            <div class="extended-info-body saved-lyrics-body">${escapeHtml(
                String(lyricsText).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
            )}</div>
        </div>
    `;

    overlay.classList.add('active');
    document.addEventListener('keydown', savedLyricsKeyHandler);
}

function closeSavedLyricsViewer() {
    const overlay = document.getElementById('saved-lyrics-overlay');
    if (overlay) overlay.classList.remove('active');
    document.removeEventListener('keydown', savedLyricsKeyHandler);
}

function savedLyricsKeyHandler(e) {
    if (e.key === 'Escape') {
        closeSavedLyricsViewer();
    }
}

function deleteSavedLyricsEntry(key) {
    const store = getCustomLyricsStore();
    delete store[key];
    saveCustomLyricsStore(store);

    closeSavedLyricsViewer();
    renderSavedLyricsList();

    if (currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
        const queueItem = playbackQueue[currentQueueIndex];
        const song = queueItem.song || queueItem;
        if (song.url === key || String(song.id) === key) {
            renderLyricsView();
        }
    }
}

async function removeAllSavedLyrics() {
    const entries = getSavedLyricsEntries();
    if (entries.length === 0) {
        showNotification('No saved lyrics to remove', 'warning', 2000);
        return;
    }

    const confirmed = await showConfirmDialog({
        title: 'Remove All Saved Lyrics',
        message: `Remove all ${entries.length} saved lyrics entries? This cannot be undone.`,
        okText: 'Remove All',
        cancelText: 'Cancel'
    });

    if (!confirmed) return;

    saveCustomLyricsStore({});
    renderSavedLyricsList();
    showNotification(`Removed ${entries.length} saved lyrics`, 'success', 2000);

    if (currentView === 'lyrics') {
        renderLyricsView();
    }
}

// ==============================================================================
// SEARCH PANEL
// ==============================================================================
function resetSearchState() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    searchQuery = '';
    currentSearchSessionId = null;
}

function resetSubheroSearch() {
    const input = document.getElementById('subhero-search-input');
    if (input) {
        input.value = '';
        input.classList.remove('active');
    }
    const wrapper = document.getElementById('subhero-search-wrapper');
    if (wrapper) {
        wrapper.classList.remove('expanded');
        wrapper.classList.add('collapsed');
        wrapper.onmousedown = null;
    }
}

function performSearch() {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    searchTimeout = setTimeout(() => {
        searchQuery = document.getElementById('search-input').value.toLowerCase().trim();

        if (searchQuery === '') {
            pushViewToHistory('all-songs');
            currentView = 'all-songs';
            currentSearchSessionId = null;
            const allSongs = getSongsForList('all-songs');
            renderSongsList(allSongs, 'all-songs');
            reapplyHighlightAfterFilter('all-songs', allSongs);
            reapplySelectionAfterFilter('all-songs', allSongs);
            document.getElementById('all-songs-count').textContent = allSongs.length;
            resetLeftPanelActiveState();
            activateLeftPanelItem('all-songs');
        } else {
            const filteredSongs = getSongsForList('search');

            pushViewToHistory('search-items');
            currentView = 'search-items';

            currentSearchSessionId = 'Search' + Date.now();
            ghostLists['search'] = [currentSearchSessionId];

            ghostLists['search-items'] = [];
            for (let i = 0; i < filteredSongs.length; i++) {
                ghostLists['search-items'].push(`SearchItem${String(i + 1).padStart(5, '0')}`);
            }
            nextSearchItemSlotId = filteredSongs.length + 1;

            saveSearchToHistory(searchQuery, currentSearchSessionId, filteredSongs.length);

            showTracklistHeader(true);
            setupHeroSection(
                true,
                `"${escapeHtml(searchQuery)}"`,
                filteredSongs.length,
                'Search Results',
                currentSearchSessionId,
                false
            );
            updateHeroCover('search-items');

            const countElement = document.getElementById('all-songs-count');
            if (countElement) {
                countElement.textContent = filteredSongs.length;
            }
            renderSongsList(filteredSongs, 'search-items');
            reapplyHighlightAfterFilter('search-items', filteredSongs);
            reapplySelectionAfterFilter('search-items', filteredSongs);

            resetLeftPanelActiveState();
        }

        setTimeout(() => {
            updateExternalScrollbar();
        }, 100);
    }, 500);
}

function focusSubheroSearch() {
    const input = document.getElementById('subhero-search-input');
    const wrapper = document.getElementById('subhero-search-wrapper');
    if (!input) return;
    if (input.classList.contains('active')) return;
    input.classList.add('active');
    input.focus();
    if (wrapper) {
        wrapper.classList.remove('collapsed');
        wrapper.classList.add('expanded');
        wrapper.onmousedown = function (e) {
            input.focus();
        };
    }
}

function clearSubheroSearch() {
    const input = document.getElementById('subhero-search-input');
    if (!input) return;
    input.value = '';
    performSubheroSearch();
    input.focus();
}

function handleSubheroSearchBlur() {
    setTimeout(() => {
        const input = document.getElementById('subhero-search-input');
        const wrapper = document.getElementById('subhero-search-wrapper');
        const activeEl = document.activeElement;
        if (!input) return;
        if (activeEl === input) return;
        if (input.value.trim() === '') {
            input.classList.remove('active');
            if (wrapper) {
                wrapper.classList.remove('expanded');
                wrapper.classList.add('collapsed');
                wrapper.onmousedown = null;
            }
        }
    }, 100);
}

function performSubheroSearch() {
    const input = document.getElementById('subhero-search-input');
    const clearBtn = document.getElementById('subhero-search-clear');
    if (!input) return;
    const query = input.value.toLowerCase().trim();
    const songs = getSongsForList(currentView);

    if (clearBtn) {
        if (input.value.length > 0) {
            clearBtn.classList.add('has-text');
        } else {
            clearBtn.classList.remove('has-text');
        }
    }

    if (query === '') {
        renderSongsList(songs, currentView);
        reapplyHighlightAfterFilter(currentView, songs);
        reapplySelectionAfterFilter(currentView, songs);
        return;
    }

    const filtered = songs.filter(
        (s) =>
            s.title.toLowerCase().includes(query) ||
            s.artist.toLowerCase().includes(query) ||
            s.album.toLowerCase().includes(query)
    );

    renderSongsList(filtered, currentView);
    reapplyHighlightAfterFilter(currentView, filtered);
    reapplySelectionAfterFilter(currentView, filtered);
}

function focusLeftPanelSearch() {
    const input = document.getElementById('left-panel-search-input');
    const wrapper = document.getElementById('left-panel-search-wrapper');
    if (!input) return;
    if (input.classList.contains('active')) return;
    input.classList.add('active');
    input.focus();
    if (wrapper) {
        wrapper.classList.remove('collapsed');
        wrapper.classList.add('expanded');
        wrapper.onmousedown = function (e) {
            input.focus();
        };
    }
}

function clearLeftPanelSearch() {
    const input = document.getElementById('left-panel-search-input');
    if (!input) return;
    input.value = '';
    performLeftPanelSearch();
    input.focus();
}

function handleLeftPanelSearchBlur() {
    setTimeout(() => {
        const input = document.getElementById('left-panel-search-input');
        const wrapper = document.getElementById('left-panel-search-wrapper');
        const activeEl = document.activeElement;
        if (!input) return;
        if (activeEl === input) return;
        if (input.value.trim() === '') {
            input.classList.remove('active');
            if (wrapper) {
                wrapper.classList.remove('expanded');
                wrapper.classList.add('collapsed');
                wrapper.onmousedown = null;
            }
        }
    }, 100);
}

function performLeftPanelSearch() {
    const input = document.getElementById('left-panel-search-input');
    const clearBtn = document.getElementById('left-panel-search-clear');
    if (!input) return;
    const query = input.value.toLowerCase().trim();

    if (clearBtn) {
        if (input.value.length > 0) {
            clearBtn.classList.add('has-text');
        } else {
            clearBtn.classList.remove('has-text');
        }
    }

    const leftPanelMainList = document.querySelector('.left-panel-main-list');
    if (!leftPanelMainList) return;

    const allItems = leftPanelMainList.querySelectorAll('.left-panel-main-item');

    if (query === '') {
        allItems.forEach((item) => {
            item.style.display = '';
        });
        renderLeftPanelMainList();
        return;
    }

    allItems.forEach((item) => {
        const title = item.querySelector('.main-item-title');
        const subtitle = item.querySelector('.main-item-subtitle');
        const itemText = (title ? title.textContent : '') + ' ' + (subtitle ? subtitle.textContent : '');

        if (itemText.toLowerCase().includes(query)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });

    updateScrollbarById('left-panel-main-content');
}

// ==============================================================================
// SEARCH PANEL INPUTS — SUBHERO
// ==============================================================================
function focusSubheroSearch() {
    const input = document.getElementById('subhero-search-input');
    const wrapper = document.getElementById('subhero-search-wrapper');
    if (!input) return;
    if (input.classList.contains('active')) return;
    input.classList.add('active');
    input.focus();
    if (wrapper) {
        wrapper.classList.remove('collapsed');
        wrapper.classList.add('expanded');
        wrapper.onmousedown = function (e) {
            input.focus();
        };
    }
}

function clearSubheroSearch() {
    const input = document.getElementById('subhero-search-input');
    if (!input) return;
    input.value = '';
    performSubheroSearch();
    input.focus();
}

function handleSubheroSearchBlur() {
    setTimeout(() => {
        const input = document.getElementById('subhero-search-input');
        const wrapper = document.getElementById('subhero-search-wrapper');
        const activeEl = document.activeElement;
        if (!input) return;
        if (activeEl === input) return;
        if (input.value.trim() === '') {
            input.classList.remove('active');
            if (wrapper) {
                wrapper.classList.remove('expanded');
                wrapper.classList.add('collapsed');
                wrapper.onmousedown = null;
            }
        }
    }, 100);
}

function performSubheroSearch() {
    const input = document.getElementById('subhero-search-input');
    const clearBtn = document.getElementById('subhero-search-clear');
    if (!input) return;
    const query = input.value.toLowerCase().trim();
    const songs = getSongsForList(currentView);

    if (clearBtn) {
        if (input.value.length > 0) {
            clearBtn.classList.add('has-text');
        } else {
            clearBtn.classList.remove('has-text');
        }
    }

    if (query === '') {
        renderSongsList(songs, currentView);
        reapplyHighlightAfterFilter(currentView, songs);
        reapplySelectionAfterFilter(currentView, songs);
        return;
    }

    const filtered = songs.filter(
        (s) =>
            s.title.toLowerCase().includes(query) ||
            s.artist.toLowerCase().includes(query) ||
            s.album.toLowerCase().includes(query)
    );

    renderSongsList(filtered, currentView);
    reapplyHighlightAfterFilter(currentView, filtered);
    reapplySelectionAfterFilter(currentView, filtered);
}

// ==============================================================================
// SEARCH PANEL INPUTS — LEFT PANEL
// ==============================================================================
function focusLeftPanelSearch() {
    const input = document.getElementById('left-panel-search-input');
    const wrapper = document.getElementById('left-panel-search-wrapper');
    if (!input) return;
    if (input.classList.contains('active')) return;
    input.classList.add('active');
    input.focus();
    if (wrapper) {
        wrapper.classList.remove('collapsed');
        wrapper.classList.add('expanded');
        wrapper.onmousedown = function (e) {
            input.focus();
        };
    }
}

function clearLeftPanelSearch() {
    const input = document.getElementById('left-panel-search-input');
    if (!input) return;
    input.value = '';
    performLeftPanelSearch();
    input.focus();
}

function handleLeftPanelSearchBlur() {
    setTimeout(() => {
        const input = document.getElementById('left-panel-search-input');
        const wrapper = document.getElementById('left-panel-search-wrapper');
        const activeEl = document.activeElement;
        if (!input) return;
        if (activeEl === input) return;
        if (input.value.trim() === '') {
            input.classList.remove('active');
            if (wrapper) {
                wrapper.classList.remove('expanded');
                wrapper.classList.add('collapsed');
                wrapper.onmousedown = null;
            }
        }
    }, 100);
}

function performLeftPanelSearch() {
    const input = document.getElementById('left-panel-search-input');
    const clearBtn = document.getElementById('left-panel-search-clear');
    if (!input) return;
    const query = input.value.toLowerCase().trim();

    if (clearBtn) {
        if (input.value.length > 0) {
            clearBtn.classList.add('has-text');
        } else {
            clearBtn.classList.remove('has-text');
        }
    }

    const leftPanelMainList = document.querySelector('.left-panel-main-list');
    if (!leftPanelMainList) return;

    const allItems = leftPanelMainList.querySelectorAll('.left-panel-main-item');

    if (query === '') {
        allItems.forEach((item) => {
            item.style.display = '';
        });
        renderLeftPanelMainList();
        return;
    }

    allItems.forEach((item) => {
        const title = item.querySelector('.main-item-title');
        const subtitle = item.querySelector('.main-item-subtitle');
        const itemText = (title ? title.textContent : '') + ' ' + (subtitle ? subtitle.textContent : '');

        if (itemText.toLowerCase().includes(query)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });

    updateScrollbarById('left-panel-main-content');
}
