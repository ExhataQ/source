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
    pageSize: 10
};

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

function openOnlineLyricsSearchView(song = getCurrentPlaybackSong(), autoSearch = false) {
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
        fromHeader: !song
    };

    switchView('online-lyrics');
    if (autoSearch) searchOnlineLyrics();
}

function getOnlineLyricsCurrentResult() {
    const index = onlineLyricsState.selectedIndex;
    return index >= 0 ? onlineLyricsState.results[index] : null;
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

    if (type === 'lrc') {
        if (typeof parseLRC !== 'function' || !parseLRC(text)) {
            showNotification('The returned LRC is invalid', 'error', 2200);
            return;
        }
        setSyncedLyricsForSong(song.id, text);
    } else {
        setLyricsForSong(song.id, text);
    }

    showNotification(`${type === 'lrc' ? 'LRC' : 'Lyrics'} added to this song`, 'success', 2200);
    if (currentView === 'online-lyrics') {
        renderOnlineLyricsView();
    }
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
                            ${onlineLyricsState.fromHeader ? '' : `<button class="lyrics-view-edit-btn online-lyrics-primary-btn" onclick="event.stopPropagation(); useOnlineLyrics(${index}, 'lrc')">Use LRC</button>`}
                        ` : ''}
                        ${activeType === 'lyrics' && plain ? `
                            <button class="lyrics-view-edit-btn" onclick="event.stopPropagation(); copyOnlineLyrics(${index}, 'lyrics')">Copy Lyrics</button>
                            <button class="lyrics-view-edit-btn" onclick="event.stopPropagation(); downloadOnlineLyrics(${index}, 'lyrics')">Download Lyrics</button>
                            ${onlineLyricsState.fromHeader ? '' : `<button class="lyrics-view-edit-btn online-lyrics-primary-btn" onclick="event.stopPropagation(); useOnlineLyrics(${index}, 'lyrics')">Use Lyrics</button>`}
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
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
