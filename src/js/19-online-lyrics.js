// ============================================================================
// ONLINE LYRICS / LRCLIB
// ============================================================================
let onlineLyricsState = {
    song: null,
    artist: '',
    title: '',
    album: '',
    duration: '',
    results: [],
    exact: false,
    loading: false,
    error: '',
    selectedIndex: -1,
    selectedType: 'lrc',
    page: 0,
    pageSize: 10,
    originalQuery: null,
    pickerOpen: false,
    pickerQuery: '',
    pickerIndex: -1,
    pickerType: 'lrc',
    pickerSelectedSongId: null
};

let onlineLyricsPickerMouseDownOutside = false;

function getCurrentPlaybackSong() {
    if (currentQueueIndex < 0 || !playbackQueue[currentQueueIndex]) return null;
    const item = playbackQueue[currentQueueIndex];
    return item.song || item;
}

function parseSongDurationSeconds(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const text = String(value || '').trim();
    const parts = text.split(':').map(Number);
    if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1];
    if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
}

function escapeOnlineLyricsAttribute(text) {
    return escapeHtml(String(text || '')).replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatOnlineLyricsDuration(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value <= 0) return '';
    const total = Math.round(value);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function openOnlineLyricsView() {
    const song = getCurrentPlaybackSong();
    if (!song) {
        showNotification('No song playing', 'warning', 2000);
        return;
    }

    openOnlineLyricsSearchView(song, true);
}

function openOnlineLyricsSearchView(song = null, autoSearch = false) {
    const fromHeader = !song;
    onlineLyricsState = {
        song: song || null,
        artist: song?.artist || '',
        title: song?.title || '',
        album: song?.album || '',
        duration: song?.duration || '',
        results: [],
        exact: false,
        loading: false,
        error: '',
        selectedIndex: -1,
        selectedType: 'lrc',
        page: 0,
        pageSize: 10,
        fromHeader: fromHeader,
        originalQuery: fromHeader
            ? null
            : {
                  artist: song?.artist || '',
                  title: song?.title || '',
                  album: song?.album || ''
              },
        searched: false,
        pickerOpen: false,
        pickerQuery: '',
        pickerIndex: -1,
        pickerType: 'lrc',
        pickerSelectedSongId: null
    };

    switchView('online-lyrics');
    if (autoSearch) searchOnlineLyrics();
}

async function searchOnlineLyrics() {
    const artistInput = document.getElementById('online-lyrics-artist');
    const titleInput = document.getElementById('online-lyrics-title');
    const albumInput = document.getElementById('online-lyrics-album');

    const artist = artistInput ? artistInput.value.trim() : onlineLyricsState.artist.trim();
    const title = titleInput ? titleInput.value.trim() : onlineLyricsState.title.trim();
    const album = albumInput ? albumInput.value.trim() : onlineLyricsState.album.trim();

    if (!title && !artist) {
        showNotification('Enter an artist or title', 'warning', 2000);
        return;
    }

    onlineLyricsState.artist = artist;
    onlineLyricsState.title = title;
    onlineLyricsState.album = album;
    onlineLyricsState.loading = true;
    onlineLyricsState.error = '';
    onlineLyricsState.results = [];
    onlineLyricsState.selectedIndex = -1;
    onlineLyricsState.selectedType = 'lrc';
    onlineLyricsState.page = 0;
    onlineLyricsState.searched = true;
    updateOnlineLyricsResultsSection();

    try {
        const result = await window.electronAPI.searchOnlineLyrics({
            artist,
            title,
            album,
            duration: parseSongDurationSeconds(onlineLyricsState.duration)
        });

        if (!result || result.success === false) {
            throw new Error((result && result.error) || 'Could not search LRCLIB');
        }

        onlineLyricsState.results = Array.isArray(result.results) ? result.results : [];
        onlineLyricsState.exact = Boolean(result.exact);
        onlineLyricsState.loading = false;
        updateOnlineLyricsResultsSection();
    } catch (error) {
        onlineLyricsState.loading = false;
        onlineLyricsState.error = error.message || 'Could not search LRCLIB';
        updateOnlineLyricsResultsSection();
    }
}

function openOnlineLyricsResult(index) {
    if (index < 0 || index >= onlineLyricsState.results.length) return;
    if (onlineLyricsState.selectedIndex === index) return;
    onlineLyricsState.selectedIndex = index;
    updateOnlineLyricsResultsSection();
}

function closeOnlineLyricsResult() {
    onlineLyricsState.selectedIndex = -1;
    updateOnlineLyricsResultsSection();
}

function selectOnlineLyricsType(index, type) {
    if (index < 0 || index >= onlineLyricsState.results.length) return;
    if (type !== 'lrc' && type !== 'lyrics') return;

    onlineLyricsState.selectedIndex = index;
    onlineLyricsState.selectedType = type;
    updateOnlineLyricsResultsSection();
}

function getOnlineLyricsText(result, type) {
    if (!result) return '';
    return type === 'lrc' ? String(result.syncedLyrics || '') : String(result.plainLyrics || '');
}

function hasOnlineLyricsQueryChanged() {
    if (onlineLyricsState.fromHeader) return true;
    const orig = onlineLyricsState.originalQuery;
    if (!orig) return true;
    return (
        (onlineLyricsState.title || '') !== (orig.title || '') ||
        (onlineLyricsState.artist || '') !== (orig.artist || '') ||
        (onlineLyricsState.album || '') !== (orig.album || '')
    );
}

async function copyOnlineLyrics(index, type) {
    const result = onlineLyricsState.results[index];
    const text = getOnlineLyricsText(result, type);
    if (!text.trim()) {
        showNotification(`No ${type === 'lrc' ? 'LRC' : 'plain lyrics'} available`, 'warning', 2000);
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        showNotification(`${type === 'lrc' ? 'LRC' : 'Lyrics'} copied`, 'success', 1800);
    } catch (error) {
        showNotification('Could not copy to clipboard', 'error', 2000);
    }
}

async function downloadOnlineLyrics(index, type) {
    const result = onlineLyricsState.results[index];
    const text = getOnlineLyricsText(result, type);
    if (!text.trim()) {
        showNotification(`No ${type === 'lrc' ? 'LRC' : 'plain lyrics'} available`, 'warning', 2000);
        return;
    }

    const saved = await window.electronAPI.downloadOnlineLyrics({
        title: result.trackName || onlineLyricsState.title,
        artist: result.artistName || onlineLyricsState.artist,
        type,
        contents: text
    });

    if (saved && saved.success) {
        showNotification(`${type === 'lrc' ? 'LRC' : 'Lyrics'} saved to download folder`, 'success', 2200);
    } else {
        showNotification((saved && saved.error) || 'Could not save lyrics', 'error', 2500);
    }
}

function useOnlineLyrics(index, type) {
    const result = onlineLyricsState.results[index];
    const text = getOnlineLyricsText(result, type);
    const song = onlineLyricsState.song || getCurrentPlaybackSong();

    if (!song || !text.trim()) {
        showNotification('No lyrics available', 'warning', 2000);
        return;
    }

    applyOnlineLyricsToSong(song.id, text, type);
}

function applyOnlineLyricsToSong(songId, text, type) {
    if (!text || !text.trim()) {
        showNotification('No lyrics available', 'warning', 2000);
        return false;
    }

    if (type === 'lrc') {
        if (typeof parseLRC !== 'function' || !parseLRC(text)) {
            showNotification('The returned LRC is invalid', 'error', 2200);
            return false;
        }
        setSyncedLyricsForSong(songId, text);
        showNotification('LRC saved to song', 'success', 2200);
    } else {
        setLyricsForSong(songId, text);
        showNotification('Lyrics saved to song', 'success', 2200);
    }

    if (currentView === 'online-lyrics') {
        updateOnlineLyricsResultsSection();
    }
    return true;
}

function openOnlineLyricsPicker(index, type, anchorEvent) {
    const result = onlineLyricsState.results[index];
    if (!result) return;

    const prefillParts = [result.trackName || '', result.artistName || ''].filter((p) => p.trim() !== '');

    closeOnlineLyricsPicker();

    onlineLyricsState.pickerOpen = true;
    onlineLyricsState.pickerIndex = index;
    onlineLyricsState.pickerType = type;
    onlineLyricsState.pickerQuery = prefillParts.join(' ');
    onlineLyricsState.pickerSelectedSongId = null;

    const picker = document.createElement('div');
    picker.className = 'online-lyrics-picker';
    picker.id = 'online-lyrics-picker';
    picker.style.display = 'flex';
    picker.style.flexDirection = 'column';
    picker.style.visibility = 'hidden';
    picker.innerHTML = `
        <div class="online-lyrics-picker-search">
            <i class="fas fa-search online-lyrics-picker-search-icon"></i>
            <input
                type="text"
                id="online-lyrics-picker-input"
                class="online-lyrics-picker-input"
                placeholder="Search songs..."
                value="${escapeOnlineLyricsAttribute(onlineLyricsState.pickerQuery)}"
                oninput="handleOnlineLyricsPickerInput(this.value)"
                autocomplete="off"
            />
        </div>
        <div class="custom-scrollbar-container online-lyrics-picker-list-container">
            <div class="custom-scrollbar-content" id="online-lyrics-picker-list-content">
                <div class="queue-list" id="online-lyrics-picker-list"></div>
            </div>
            <div class="custom-scrollbar" id="online-lyrics-picker-scrollbar">
                <div class="custom-scrollbar-thumb" id="online-lyrics-picker-scrollbar-thumb"></div>
            </div>
        </div>
        <div class="online-lyrics-picker-footer">
            <button class="lyrics-editor-btn" onclick="closeOnlineLyricsPicker()">Cancel</button>
            <button class="lyrics-editor-btn lyrics-editor-btn-primary" id="online-lyrics-picker-confirm" onclick="confirmOnlineLyricsPicker()" disabled>Save to song</button>
        </div>
    `;

    document.body.appendChild(picker);

    picker.style.height = '460px';
    picker.style.maxHeight = 'calc(100vh - 40px)';

    const menuWidth = picker.offsetWidth;
    const menuHeight = picker.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const anchorX = anchorEvent ? anchorEvent.clientX : 0;
    const anchorY = anchorEvent ? anchorEvent.clientY : 0;

    let posX = anchorX;
    let posY = anchorY + 5;

    const spaceToRight = windowWidth - anchorX;
    if (spaceToRight < menuWidth) {
        posX = anchorX - menuWidth - 7;
    }
    if (posX < 7) {
        posX = 7;
    }

    const spaceToBottom = windowHeight - anchorY;
    if (spaceToBottom < menuHeight) {
        posY = anchorY - menuHeight - 7;
    }
    if (posY < 7) {
        posY = 7;
    }

    picker.style.left = posX + 'px';
    picker.style.top = posY + 'px';
    picker.style.visibility = 'visible';

    setTimeout(() => {
        picker.classList.add('active');
    }, 10);

    updateOnlineLyricsPickerList();

    setTimeout(() => {
        const input = document.getElementById('online-lyrics-picker-input');
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
        if (typeof initExternalScrollbar === 'function') {
            initExternalScrollbar(
                'online-lyrics-picker-list-content',
                'online-lyrics-picker-scrollbar',
                'online-lyrics-picker-scrollbar-thumb'
            );
        }
        updateScrollbarById('online-lyrics-picker-list-content');
    }, 30);

    document.addEventListener('keydown', onlineLyricsPickerKeyHandler);
    setTimeout(() => {
        if (onlineLyricsState.pickerOpen) {
            document.addEventListener('mousedown', onlineLyricsPickerMouseDownHandler, true);
            document.addEventListener('click', onlineLyricsPickerOutsideHandler, true);
        }
    }, 0);
}

function closeOnlineLyricsPicker() {
    onlineLyricsState.pickerOpen = false;
    onlineLyricsState.pickerIndex = -1;
    onlineLyricsState.pickerType = 'lrc';
    onlineLyricsState.pickerSelectedSongId = null;
    const picker = document.getElementById('online-lyrics-picker');
    if (picker) picker.remove();
    document.removeEventListener('keydown', onlineLyricsPickerKeyHandler);
    document.removeEventListener('mousedown', onlineLyricsPickerMouseDownHandler, true);
    document.removeEventListener('click', onlineLyricsPickerOutsideHandler, true);
    onlineLyricsPickerMouseDownOutside = false;
}

function onlineLyricsPickerKeyHandler(e) {
    if (e.key === 'Escape' && onlineLyricsState.pickerOpen) {
        e.preventDefault();
        closeOnlineLyricsPicker();
    }
}

function onlineLyricsPickerMouseDownHandler(e) {
    if (!onlineLyricsState.pickerOpen) return;
    const picker = document.getElementById('online-lyrics-picker');
    if (!picker) {
        onlineLyricsPickerMouseDownOutside = false;
        return;
    }
    const inside =
        picker.contains(e.target) ||
        (e.target.closest && e.target.closest('.online-lyrics-primary-btn')) ||
        (e.target.closest && e.target.closest('#online-lyrics-picker'));
    onlineLyricsPickerMouseDownOutside = !inside;
}

function onlineLyricsPickerOutsideHandler(e) {
    if (!onlineLyricsState.pickerOpen) return;
    if (!onlineLyricsPickerMouseDownOutside) return;
    const picker = document.getElementById('online-lyrics-picker');
    if (!picker) {
        closeOnlineLyricsPicker();
        return;
    }
    if (picker.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.online-lyrics-primary-btn')) return;
    if (e.target.closest && e.target.closest('#online-lyrics-picker')) return;
    closeOnlineLyricsPicker();
}

function getOnlineLyricsPickerSongs() {
    const rawQuery = (onlineLyricsState.pickerQuery || '').toLowerCase().trim();
    const songs = getActiveSongs();
    if (!rawQuery) return songs;

    const tokens = rawQuery
        .replace(/[&\-–—,]/g, ' ')
        .split(/\s+/)
        .filter((token) => token && token !== 'by' && token !== 'feat' && token !== 'ft' && token !== 'with');

    if (tokens.length === 0) return songs;

    const scored = [];
    for (const song of songs) {
        const title = String(song.title || '').toLowerCase();
        const artist = String(song.artist || '').toLowerCase();
        const album = String(song.album || '').toLowerCase();
        const haystack = `${title} ${artist} ${album}`;

        const allInHaystack = tokens.every((token) => haystack.includes(token));
        if (!allInHaystack) continue;

        const titleHit = tokens.some((token) => title.includes(token));
        const artistHit = tokens.some((token) => artist.includes(token));
        const score = (titleHit ? 2 : 0) + (artistHit ? 1 : 0);
        scored.push({ song, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((entry) => entry.song);
}

window.addEventListener('resize', function () {
    if (!onlineLyricsState.pickerOpen) return;
    const picker = document.getElementById('online-lyrics-picker');
    if (!picker) return;

    const menuWidth = picker.offsetWidth;
    const menuHeight = picker.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let posX = parseInt(picker.style.left, 10) || 7;
    let posY = parseInt(picker.style.top, 10) || 7;

    if (posX + menuWidth > windowWidth - 7) {
        posX = windowWidth - menuWidth - 7;
    }
    if (posX < 7) posX = 7;

    if (posY + menuHeight > windowHeight - 7) {
        posY = windowHeight - menuHeight - 7;
    }
    if (posY < 7) posY = 7;

    picker.style.left = posX + 'px';
    picker.style.top = posY + 'px';
});

function updateOnlineLyricsPickerList() {
    const list = document.getElementById('online-lyrics-picker-list');
    if (!list) return;

    const songs = getOnlineLyricsPickerSongs();
    if (songs.length === 0) {
        list.innerHTML = `
            <div class="online-lyrics-picker-empty">
                <span class="material-symbols-outlined">search_off</span>
                <span>No songs match</span>
            </div>
        `;
        updateScrollbarById('online-lyrics-picker-list-content');
        return;
    }

    list.innerHTML = songs
        .map((song) => {
            const isSelected = onlineLyricsState.pickerSelectedSongId === song.id;
            return renderRightPanelItem(song, {
                onClick: `selectOnlineLyricsPickerSong(${song.id})`,
                contextMenuArgs: `${song.id}`,
                extraClass: `online-lyrics-picker-row${isSelected ? ' selected' : ''}`
            });
        })
        .join('');
    updateScrollbarById('online-lyrics-picker-list-content');
}

function selectOnlineLyricsPickerSong(songId) {
    onlineLyricsState.pickerSelectedSongId = songId;
    updateOnlineLyricsPickerList();
    updateOnlineLyricsPickerConfirmButton();
}

function updateOnlineLyricsPickerConfirmButton() {
    const btn = document.getElementById('online-lyrics-picker-confirm');
    if (!btn) return;
    btn.disabled = onlineLyricsState.pickerSelectedSongId === null;
}

function confirmOnlineLyricsPicker() {
    if (onlineLyricsState.pickerSelectedSongId === null) return;
    if (onlineLyricsState.pickerIndex < 0) return;
    const result = onlineLyricsState.results[onlineLyricsState.pickerIndex];
    if (!result) return;
    const text = getOnlineLyricsText(result, onlineLyricsState.pickerType);
    const applied = applyOnlineLyricsToSong(
        onlineLyricsState.pickerSelectedSongId,
        text,
        onlineLyricsState.pickerType
    );
    if (applied) closeOnlineLyricsPicker();
}

function handleOnlineLyricsPickerInput(value) {
    onlineLyricsState.pickerQuery = value;
    updateOnlineLyricsPickerList();
}

function getOnlineLyricsPageCount() {
    return Math.max(1, Math.ceil(onlineLyricsState.results.length / onlineLyricsState.pageSize));
}

function setOnlineLyricsPage(page) {
    const pageCount = getOnlineLyricsPageCount();
    onlineLyricsState.page = Math.max(0, Math.min(page, pageCount - 1));
    onlineLyricsState.selectedIndex = -1;
    onlineLyricsState.selectedType = 'lrc';
    updateOnlineLyricsResultsSection();
}

function nextOnlineLyricsPage() {
    setOnlineLyricsPage(onlineLyricsState.page + 1);
}

function previousOnlineLyricsPage() {
    setOnlineLyricsPage(onlineLyricsState.page - 1);
}

function renderOnlineLyricsResult(result, index) {
    const selected = onlineLyricsState.selectedIndex === index;
    const synced = Boolean(String(result.syncedLyrics || '').trim());
    const plain = Boolean(String(result.plainLyrics || '').trim());
    const activeType = (onlineLyricsState.selectedType === 'lyrics' && plain) || (!synced && plain) ? 'lyrics' : 'lrc';
    const duration = formatOnlineLyricsDuration(result.duration);
    const album = result.albumName || '';
    const activeText = activeType === 'lrc' ? result.syncedLyrics : result.plainLyrics;

    return `
        <div class="online-lyrics-result ${selected ? 'selected' : ''}" ${selected ? '' : `onclick="openOnlineLyricsResult(${index})"`}>
            <button class="online-lyrics-result-header" onclick="event.stopPropagation(); openOnlineLyricsResult(${index})">
                <span class="online-lyrics-result-title">${escapeHtml(result.trackName || 'Unknown title')}</span>
                <span class="online-lyrics-result-artist">${escapeHtml(result.artistName || 'Unknown artist')}</span>
                <span class="online-lyrics-result-album">${escapeHtml(album || '—')}</span>
                <span class="online-lyrics-result-meta">${escapeHtml(duration)}</span>
                <span class="material-symbols-outlined online-lyrics-expand" onclick="event.stopPropagation(); ${selected ? `closeOnlineLyricsResult()` : `openOnlineLyricsResult(${index})`}">${selected ? 'expand_less' : 'expand_more'}</span>
            </button>
            <div class="online-lyrics-badges">
                ${synced ? `<button class="online-lyrics-badge synced ${selected && activeType === 'lrc' ? 'active' : ''}" onclick="event.stopPropagation(); selectOnlineLyricsType(${index}, 'lrc')">Synced LRC</button>` : ''}
                ${plain ? `<button class="online-lyrics-badge ${selected && activeType === 'lyrics' ? 'active' : ''}" onclick="event.stopPropagation(); selectOnlineLyricsType(${index}, 'lyrics')">Lyrics</button>` : ''}
                ${!synced && !plain ? '<span class="online-lyrics-badge unavailable">No lyrics</span>' : ''}
            </div>
            ${selected ? `
                <div class="online-lyrics-preview">
                    <pre>${escapeHtml(activeText || 'No lyrics available')}</pre>
                    <div class="online-lyrics-actions">
                        ${activeType === 'lrc' && synced ? `
                            <button class="lyrics-view-edit-btn" onclick="event.stopPropagation(); copyOnlineLyrics(${index}, 'lrc')">Copy LRC</button>
                            <button class="lyrics-view-edit-btn" onclick="event.stopPropagation(); downloadOnlineLyrics(${index}, 'lrc')">Download LRC</button>
                            ${onlineLyricsState.fromHeader
                                ? `<button class="lyrics-view-edit-btn online-lyrics-primary-btn" onclick="event.stopPropagation(); openOnlineLyricsPicker(${index}, 'lrc', event)">Save LRC to a song</button>`
                                : hasOnlineLyricsQueryChanged()
                                ? `<button class="lyrics-view-edit-btn online-lyrics-primary-btn" onclick="event.stopPropagation(); useOnlineLyrics(${index}, 'lrc')">Use LRC for this song</button>`
                                : ''}
                        ` : ''}
                        ${activeType === 'lyrics' && plain ? `
                            <button class="lyrics-view-edit-btn" onclick="event.stopPropagation(); copyOnlineLyrics(${index}, 'lyrics')">Copy Lyrics</button>
                            <button class="lyrics-view-edit-btn" onclick="event.stopPropagation(); downloadOnlineLyrics(${index}, 'lyrics')">Download Lyrics</button>
                            ${onlineLyricsState.fromHeader
                                ? `<button class="lyrics-view-edit-btn online-lyrics-primary-btn" onclick="event.stopPropagation(); openOnlineLyricsPicker(${index}, 'lyrics', event)">Save Lyrics to a song</button>`
                                : hasOnlineLyricsQueryChanged()
                                ? `<button class="lyrics-view-edit-btn online-lyrics-primary-btn" onclick="event.stopPropagation(); useOnlineLyrics(${index}, 'lyrics')">Use Lyrics for this song</button>`
                                : ''}
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function clearOnlineLyricsSearchInputs() {
    const artistInput = document.getElementById('online-lyrics-artist');
    const titleInput = document.getElementById('online-lyrics-title');
    const albumInput = document.getElementById('online-lyrics-album');
    if (artistInput) artistInput.value = '';
    if (titleInput) titleInput.value = '';
    if (albumInput) albumInput.value = '';
    onlineLyricsState.artist = '';
    onlineLyricsState.title = '';
    onlineLyricsState.album = '';
    onlineLyricsState.results = [];
    onlineLyricsState.selectedIndex = -1;
    onlineLyricsState.selectedType = 'lrc';
    onlineLyricsState.page = 0;
    onlineLyricsState.searched = false;
    onlineLyricsState.error = '';
    updateOnlineLyricsResultsSection();
}

function renderOnlineLyricsView() {
    let container = document.getElementById('lyrics-view-root');
    const songListContainer = document.getElementById('song-list-container');
    const mainContentInner = document.querySelector('.main-content-inner');

    // The online lyrics view can be opened directly from the global header,
    // before the regular Lyrics view has ever created its root container.
    if (!container) {
        container = document.createElement('div');
        container.id = 'lyrics-view-root';
        container.className = 'lyrics-view-root';
        if (mainContentInner) {
            mainContentInner.appendChild(container);
        } else {
            return;
        }
    }

    if (songListContainer) songListContainer.style.display = 'none';
    container.style.display = 'block';

    const state = onlineLyricsState;

    const backButtonHTML = state.fromHeader
        ? ''
        : `<button class="lyrics-view-edit-btn" onclick="switchView('lyrics')">
                    <span class="material-symbols-outlined">arrow_back</span>
                    Back to Lyrics
                </button>`;

    container.innerHTML = `
        <div class="online-lyrics-view-container">
            <div class="online-lyrics-header">
                <div>
                    <div class="online-lyrics-kicker">ONLINE LYRICS</div>
                    <h2>Find lyrics / LRC</h2>
                    <p>Search LRCLIB by artist and title, then use or download the result.</p>
                </div>
                ${backButtonHTML}
            </div>

            <div class="online-lyrics-search-panel">
                <input id="online-lyrics-title" value="${escapeOnlineLyricsAttribute(state.title)}" placeholder="Song title">
                <input id="online-lyrics-artist" value="${escapeOnlineLyricsAttribute(state.artist)}" placeholder="Artist name">
                <input id="online-lyrics-album" value="${escapeOnlineLyricsAttribute(state.album)}" placeholder="Album">
                <button class="lyrics-view-edit-btn online-lyrics-search-btn" onclick="clearOnlineLyricsSearchInputs()" title="Clear search fields">
                    <span class="material-symbols-outlined">backspace</span>
                    Clear
                </button>
                <button class="lyrics-view-edit-btn online-lyrics-search-btn" onclick="searchOnlineLyrics()">
                    <span class="material-symbols-outlined">search</span>
                    Search
                </button>
            </div>

            <div id="online-lyrics-results-section"></div>
        </div>
    `;

    updateOnlineLyricsResultsSection();

    setTimeout(() => {
        if (typeof updateExternalScrollbar === 'function') updateExternalScrollbar();
    }, 50);
}

function updateOnlineLyricsResultsSection() {
    const section = document.getElementById('online-lyrics-results-section');
    if (!section) return;

    const state = onlineLyricsState;
    const pageCount = getOnlineLyricsPageCount();
    const pageStart = state.page * state.pageSize;
    const pageResults = state.results.slice(pageStart, pageStart + state.pageSize);
    const resultsHTML = state.results.length
        ? pageResults.map((result, index) => renderOnlineLyricsResult(result, pageStart + index)).join('')
        : state.loading
        ? '<div class="online-lyrics-status"><span class="material-symbols-outlined online-lyrics-spinner">progress_activity</span><span>Searching LRCLIB…</span></div>'
        : state.error
        ? `<div class="online-lyrics-status error"><span class="material-symbols-outlined">error</span><span>${escapeHtml(state.error)}</span></div>`
        : state.searched
        ? '<div class="online-lyrics-status"><span class="material-symbols-outlined">search_off</span><span>No results found</span></div>'
        : '<div class="online-lyrics-status"><span class="material-symbols-outlined">search</span><span>Enter an artist or title and press Search</span></div>';

    section.innerHTML = `
        <div class="online-lyrics-result-heading">
            <span>Results</span>
            ${state.results.length ? `<small>${pageStart + 1}-${Math.min(pageStart + pageResults.length, state.results.length)} of ${state.results.length}${state.exact && state.page === 0 ? ' · Exact match first' : ''}</small>` : ''}
        </div>
        <div class="online-lyrics-results">${resultsHTML}</div>
        ${state.results.length > state.pageSize ? `
            <div class="online-lyrics-pagination">
                <button class="lyrics-view-edit-btn" onclick="previousOnlineLyricsPage()" ${state.page === 0 ? 'disabled' : ''}>
                    <span class="material-symbols-outlined">chevron_left</span>
                    Previous
                </button>
                <span class="online-lyrics-page-indicator">Page ${state.page + 1} of ${pageCount}</span>
                <button class="lyrics-view-edit-btn" onclick="nextOnlineLyricsPage()" ${state.page >= pageCount - 1 ? 'disabled' : ''}>
                    Next
                    <span class="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
        ` : ''}
    `;

    setTimeout(() => {
        if (typeof updateExternalScrollbar === 'function') updateExternalScrollbar();
    }, 30);
}
