// ==============================================================================
// CONSTANTS
// ==============================================================================
const MAX_RECENT_SONGS = 50;

const MAX_HISTORY_ENTRIES = 500;

const MAX_SEARCH_HISTORY = 20;

// ==============================================================================
// RECENTLY PLAYED
// ==============================================================================
function saveToRecentlyPlayed(song) {
    const actualSong = song.song || song;

    let recentSongs = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');

    recentSongs.unshift({
        id: actualSong.id,
        title: actualSong.title,
        artist: actualSong.artist,
        album: actualSong.album,
        cover: actualSong.cover,
        duration: actualSong.duration,
        url: actualSong.url,
        playedAt: Date.now()
    });

    if (recentSongs.length > MAX_RECENT_SONGS) {
        recentSongs = recentSongs.slice(0, MAX_RECENT_SONGS);
    }

    localStorage.setItem('recentlyPlayed', JSON.stringify(recentSongs));
    updateRecentCount();

    const recentPanel = document.getElementById('recently-played-content');
    if (recentPanel && recentPanel.classList.contains('active')) {
        renderPortableRecentlyPlayed();
    }
}

function getRecentlyPlayed() {
    const recentSongs = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');
    return recentSongs;
}

function updateRecentCount() {
    const recentSongs = getRecentlyPlayed();
    const countElement = document.querySelector('.left-panel-item[onclick*="recent"] .song-count');
    if (countElement) {
        countElement.textContent = recentSongs.length;
    }
}

async function clearRecentlyPlayed() {
    const confirmed = await showConfirmDialog({
        title: 'Clear Recently Played',
        message: 'Clear all recently played songs? This cannot be undone.',
        okText: 'Clear',
        cancelText: 'Cancel'
    });

    if (confirmed) {
        localStorage.removeItem('recentlyPlayed');
        clearGhostList('recent');
        updateRecentCount();

        if (currentView === 'recent') {
            renderRecentlyPlayed();
            setTimeout(() => updateExternalScrollbar(), 100);
        }

        const recentPanel = document.getElementById('recently-played-content');
        if (recentPanel && recentPanel.classList.contains('active')) {
            renderPortableRecentlyPlayed();
        }

        showNotification('Recently played list cleared', 'success', 3000);
    }
}

// ==============================================================================
// PLAY HISTORY
// ==============================================================================
function saveToPlayHistory(song, playDuration) {
    const actualSong = song.song || song;

    let history = JSON.parse(localStorage.getItem('playHistory') || '[]');

    const ghostSlotId = addHistoryGhostSlot(actualSong.id);

    const historyEntry = {
        id: actualSong.id,
        title: actualSong.title,
        artist: actualSong.artist,
        album: actualSong.album,
        cover: actualSong.cover,
        duration: actualSong.duration,
        url: actualSong.url,
        playedAt: Date.now(),
        playedDate: new Date().toLocaleString(),
        playDurationSeconds: Math.floor(playDuration / 1000),
        ghostSlotId: ghostSlotId
    };

    history.unshift(historyEntry);

    if (history.length > MAX_HISTORY_ENTRIES) {
        history = history.slice(0, MAX_HISTORY_ENTRIES);
    }

    localStorage.setItem('playHistory', JSON.stringify(history));

    if (currentView === 'history') {
        renderHistoryView();
    }
}

function getPlayHistory() {
    return JSON.parse(localStorage.getItem('playHistory') || '[]');
}

async function clearPlayHistory() {
    const confirmed = await showConfirmDialog({
        title: 'Clear History',
        message: 'Clear all play history? This cannot be undone.',
        okText: 'Clear',
        cancelText: 'Cancel'
    });

    if (confirmed) {
        localStorage.removeItem('playHistory');
        historyGhostSlots = [];
        nextHistorySlotId = 1;

        if (currentView === 'history') {
            showHeroSection(true);
            updateHeroSection('Recents', 0, 'Playlist', 'History');
            renderHistoryView();
            setTimeout(() => {
                if (typeof updateExternalScrollbar === 'function') {
                    updateExternalScrollbar();
                }
            }, 100);
        }

        showNotification('Play history cleared', 'success', 3000);
    }
}

// ==============================================================================
// FAVORITES
// ==============================================================================
function getFavorites() {
    return JSON.parse(localStorage.getItem('favorites') || '[]');
}

function saveFavorite(songId) {
    let favorites = getFavorites();
    if (!favorites.includes(songId)) {
        favorites.unshift(songId);
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }
}

function removeFavorite(songId) {
    let favorites = getFavorites();
    favorites = favorites.filter((id) => id !== songId);
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function isFavorite(songId) {
    const favorites = getFavorites();
    return favorites.includes(songId);
}

// ==============================================================================
// PINNED ITEMS & ITEM ORDER
// ==============================================================================
function getPinnedItems() {
    return JSON.parse(localStorage.getItem('pinnedItems') || '[]');
}

function savePinnedItems(pinnedIds) {
    localStorage.setItem('pinnedItems', JSON.stringify(pinnedIds));
}

function isItemPinned(itemId) {
    const pinned = getPinnedItems();
    return pinned.includes(itemId);
}

function togglePinItem(itemId, itemName) {
    let pinned = getPinnedItems();

    if (pinned.includes(itemId)) {
        pinned = pinned.filter((id) => id !== itemId);
        // Move to first position in unpinned section by updating played order
        let playedOrder = getPlayedItemOrder();
        playedOrder = playedOrder.filter((id) => id !== itemId);
        playedOrder.unshift(itemId);
        savePlayedItemOrder(playedOrder);
        showNotification(`"${itemName}" unpinned`, 'info', 2000);
    } else {
        pinned.push(itemId);
        showNotification(`"${itemName}" pinned`, 'success', 2000);
    }

    savePinnedItems(pinned);
    renderLeftPanelMainList();

    // Refresh virtual scroll to reflect new pin order
    if (leftPanelVirtualState.enabled) {
        const newItems = getLeftPanelItemsArray();
        leftPanelVirtualState.currentItems = newItems;
        renderLeftPanelVisibleItems(false);
    }

    updateScrollbarById('left-panel-main-content');
}

function getPlayedItemOrder() {
    return JSON.parse(localStorage.getItem('playedItemOrder') || '[]');
}

function savePlayedItemOrder(order) {
    localStorage.setItem('playedItemOrder', JSON.stringify(order));
}

function movePlayedItemToTop(listId) {
    if (
        listId === 'all-songs' ||
        listId === 'favorites' ||
        listId === 'albums' ||
        listId === 'artists' ||
        (listId &&
            (listId.startsWith('playlist-') ||
                (listId.startsWith('a') && listId.length === 13) ||
                (listId.startsWith('r') && listId.length === 13)))
    ) {
        const pinnedIds = getPinnedItems();
        if (pinnedIds.includes(listId)) return;

        let order = getPlayedItemOrder();
        if (order[0] === listId) return;

        order = order.filter((id) => id !== listId);
        order.unshift(listId);
        savePlayedItemOrder(order);
        renderPlaylistsView();
        renderAlbumLeftPanelItems();
        renderArtistLeftPanelItems();

        // Refresh virtual scroll (no auto-scroll)
        if (typeof leftPanelVirtualState !== 'undefined' && leftPanelVirtualState.enabled) {
            const currentScrollTop = leftPanelVirtualState.container?.scrollTop || 0;
            const newItems = getLeftPanelItemsArray();
            leftPanelVirtualState.currentItems = newItems;
            if (typeof renderLeftPanelVisibleItems === 'function') {
                renderLeftPanelVisibleItems(false);
            }
            // Restore original scroll position
            if (leftPanelVirtualState.container) {
                leftPanelVirtualState.container.scrollTop = currentScrollTop;
            }
        }

        updateScrollbarById('left-panel-main-content');
    }
}

// ==============================================================================
// FOLDER-SCOPED PINNED ITEMS
// ==============================================================================
function getFolderPinnedItemsMap() {
    try {
        const saved = localStorage.getItem('folderPinnedItems');
        if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
}

function saveFolderPinnedItemsMap(map) {
    localStorage.setItem('folderPinnedItems', JSON.stringify(map));
}

function getFolderPinnedItems(folderId) {
    if (!folderId) return [];
    const map = getFolderPinnedItemsMap();
    return Array.isArray(map[folderId]) ? map[folderId] : [];
}

function isItemPinnedInFolder(folderId, itemId) {
    return getFolderPinnedItems(folderId).includes(itemId);
}

function togglePinItemInFolder(folderId, itemId, itemName) {
    const map = getFolderPinnedItemsMap();
    const current = Array.isArray(map[folderId]) ? map[folderId] : [];
    const isPinned = current.includes(itemId);
    if (isPinned) {
        map[folderId] = current.filter((id) => id !== itemId);
    } else {
        map[folderId] = [...current, itemId];
    }
    saveFolderPinnedItemsMap(map);
    showNotification(isPinned ? `"${itemName}" unpinned` : `"${itemName}" pinned`, isPinned ? 'info' : 'success', 2000);
    refreshLeftPanelAfterFolderPinChange(folderId);
}

function refreshLeftPanelAfterFolderPinChange(folderId) {
    if (currentOpenFolderId === folderId) {
        renderFolderContents(folderId);
    } else {
        if (leftPanelVirtualState.enabled) {
            leftPanelVirtualState.currentItems = getLeftPanelItemsArray();
            renderLeftPanelVisibleItems(false);
        } else {
            renderLeftPanelMainList();
        }
    }
    updateScrollbarById('left-panel-main-content');
}

// ==============================================================================
// PLAYLISTS
// ==============================================================================
function getPlaylists() {
    return JSON.parse(localStorage.getItem('playlists') || '[]');
}

function updatePlaylistCount(playlistId, count) {
    const playlistItem = document.querySelector(`.left-panel-main-item[data-view="playlist-${playlistId}"]`);
    if (playlistItem) {
        const countSpan = playlistItem.querySelector('.main-item-count');
        if (countSpan) {
            countSpan.textContent = `${count} ${count === 1 ? 'song' : 'songs'}`;
        }
    }
}

function savePlaylists(playlists) {
    localStorage.setItem('playlists', JSON.stringify(playlists));
}

function createPlaylist(name) {
    let playlists = getPlaylists();
    const newPlaylist = {
        id: generateLongId('p'),
        name: name,
        songs: [],
        createdAt: new Date().toLocaleString()
    };
    playlists.unshift(newPlaylist);
    savePlaylists(playlists);

    let order = getPlayedItemOrder();
    order = order.filter((id) => id !== `playlist-${newPlaylist.id}`);
    order.unshift(`playlist-${newPlaylist.id}`);
    savePlayedItemOrder(order);

    renderPlaylistsView();
    renderLeftPanelMainList();

    // Refresh virtual scroll
    if (typeof leftPanelVirtualState !== 'undefined' && leftPanelVirtualState.enabled) {
        const newItems = getLeftPanelItemsArray();
        leftPanelVirtualState.currentItems = newItems;
        if (typeof renderLeftPanelVisibleItems === 'function') {
            renderLeftPanelVisibleItems(false);
        }
    }

    updateScrollbarById('left-panel-main-content');

    return newPlaylist;
}

function deletePlaylist(playlistId) {
    let playlists = getPlaylists();
    const wasCurrentView =
        currentView &&
        currentView.startsWith('playlist-') &&
        (currentView.replace('playlist-', '') == playlistId || currentView.replace('playlist-', '') === playlistId);

    const remainingPlaylists = playlists.filter((p) => p.id != playlistId && p.id !== playlistId);

    let deletedIndex = -1;
    if (wasCurrentView) {
        const pinnedIds = getPinnedItems();
        const playedOrder = getPlayedItemOrder();
        const sortedPlaylists = [...playlists].sort((a, b) => {
            const aId = `playlist-${a.id}`;
            const bId = `playlist-${b.id}`;
            const aPinned = pinnedIds.includes(aId);
            const bPinned = pinnedIds.includes(bId);
            if (aPinned && bPinned) return pinnedIds.indexOf(aId) - pinnedIds.indexOf(bId);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            const aPlayedIndex = playedOrder.indexOf(aId);
            const bPlayedIndex = playedOrder.indexOf(bId);
            if (aPlayedIndex !== -1 && bPlayedIndex !== -1) return aPlayedIndex - bPlayedIndex;
            if (aPlayedIndex !== -1) return -1;
            if (bPlayedIndex !== -1) return 1;
            return 0;
        });
        deletedIndex = sortedPlaylists.findIndex((p) => p.id == playlistId || p.id === playlistId);
    }

    playlists = remainingPlaylists;
    savePlaylists(playlists);
    removeItemFromAllFolders(playlistId, 'playlist');

    if (currentView === 'playlists') {
        switchView('playlists');
    } else if (wasCurrentView) {
        if (playlists.length > 0) {
            const pinnedIds = getPinnedItems();
            const playedOrder = getPlayedItemOrder();
            const sortedRemaining = [...playlists].sort((a, b) => {
                const aId = `playlist-${a.id}`;
                const bId = `playlist-${b.id}`;
                const aPinned = pinnedIds.includes(aId);
                const bPinned = pinnedIds.includes(bId);
                if (aPinned && bPinned) return pinnedIds.indexOf(aId) - pinnedIds.indexOf(bId);
                if (aPinned && !bPinned) return -1;
                if (!aPinned && bPinned) return 1;
                const aPlayedIndex = playedOrder.indexOf(aId);
                const bPlayedIndex = playedOrder.indexOf(bId);
                if (aPlayedIndex !== -1 && bPlayedIndex !== -1) return aPlayedIndex - bPlayedIndex;
                if (aPlayedIndex !== -1) return -1;
                if (bPlayedIndex !== -1) return 1;
                return 0;
            });

            let targetPlaylist;
            if (deletedIndex < sortedRemaining.length) {
                targetPlaylist = sortedRemaining[deletedIndex];
            } else {
                targetPlaylist = sortedRemaining[sortedRemaining.length - 1];
            }

            switchView(`playlist-${targetPlaylist.id}`);
        } else {
            switchView('all-songs');
        }
    }

    renderPlaylistsView();
    renderLeftPanelMainList();

    // Refresh virtual scroll
    if (typeof leftPanelVirtualState !== 'undefined' && leftPanelVirtualState.enabled) {
        const newItems = getLeftPanelItemsArray();
        leftPanelVirtualState.currentItems = newItems;
        if (typeof renderLeftPanelVisibleItems === 'function') {
            renderLeftPanelVisibleItems(false);
        }
    }

    updateScrollbarById('left-panel-main-content');
}

async function deletePlaylistAndClose(playlistId) {
    const playlists = getPlaylists();
    const playlist = playlists.find((p) => p.id == playlistId || p.id === playlistId);
    const playlistName = playlist ? playlist.name : 'Playlist';

    const confirmed = await showConfirmDialog({
        title: 'Delete Playlist',
        message: `Delete playlist "${playlistName}"? This cannot be undone.`,
        okText: 'Delete',
        cancelText: 'Cancel'
    });

    if (confirmed) {
        deletePlaylist(playlistId);
        renderPlaylistsView();
        renderLeftPanelMainList();
        updateScrollbarById('left-panel-main-content');
        showNotification(`Playlist "${playlistName}" deleted`, 'error', 2000);
    }
}

function getPlaylistSongs(playlistId) {
    const playlists = getPlaylists();
    const playlist = playlists.find((p) => p.id == playlistId || p.id === playlistId);
    if (!playlist) return [];
    return filterDeletedSongs(playlist.songs.map((songId) => SONGS_DATA.find((s) => s.id === songId)));
}

function removeSongFromPlaylist(songId, playlistId) {
    let playlists = getPlaylists();
    const playlistIndex = playlists.findIndex((p) => p.id == playlistId || p.id === playlistId);
    if (playlistIndex === -1) return false;

    const originalLength = playlists[playlistIndex].songs.length;
    playlists[playlistIndex].songs = playlists[playlistIndex].songs.filter((id) => id !== songId);
    if (playlists[playlistIndex].songs.length === originalLength) return false;

    savePlaylists(playlists);
    updatePlaylistCount(playlistId, playlists[playlistIndex].songs.length);
    return true;
}

function addSongToPlaylist(songId, playlistId) {
    let playlists = getPlaylists();
    const playlistIndex = playlists.findIndex((p) => p.id == playlistId || p.id === playlistId);
    if (playlistIndex === -1) return false;

    if (!playlists[playlistIndex].songs.includes(songId)) {
        playlists[playlistIndex].songs.push(songId);
        savePlaylists(playlists);
        updatePlaylistCount(playlistId, playlists[playlistIndex].songs.length);
        return true;
    }
    return false;
}

// ==============================================================================
// FOLDERS
// ==============================================================================
function getFolders() {
    return JSON.parse(localStorage.getItem('folders') || '[]');
}

function saveFolders(folders) {
    localStorage.setItem('folders', JSON.stringify(folders));
}

function createFolder(name) {
    let folders = getFolders();
    const newFolder = {
        id: generateLongId('f'),
        name: name,
        children: [],
        createdAt: new Date().toLocaleString()
    };
    folders.unshift(newFolder);
    saveFolders(folders);

    let order = getPlayedItemOrder();
    order = order.filter((id) => id !== `folder-${newFolder.id}`);
    order.unshift(`folder-${newFolder.id}`);
    savePlayedItemOrder(order);

    renderFoldersView();
    renderLeftPanelMainList();

    // Refresh virtual scroll
    if (typeof leftPanelVirtualState !== 'undefined' && leftPanelVirtualState.enabled) {
        const newItems = getLeftPanelItemsArray();
        leftPanelVirtualState.currentItems = newItems;
        if (typeof renderLeftPanelVisibleItems === 'function') {
            renderLeftPanelVisibleItems(false);
        }
    }

    updateScrollbarById('left-panel-main-content');

    return newFolder;
}

function deleteFolder(folderId, deleteContents = false) {
    let folders = getFolders();
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;

    const wasCurrentView =
        currentView && currentView.startsWith('folder-') && currentView.replace('folder-', '') === folderId;

    if (deleteContents && folder.children.length > 0) {
        for (const child of [...folder.children]) {
            if (child.type === 'folder') {
                deleteFolder(child.id, true);
            } else if (child.type === 'playlist') {
                let playlists = getPlaylists();
                playlists = playlists.filter((p) => p.id !== child.id);
                savePlaylists(playlists);
                removeItemFromAllFolders(child.id, 'playlist');
            }
        }
    }

    for (const f of folders) {
        if (f.id !== folderId) {
            f.children = f.children.filter((c) => c.id !== folderId);
        }
    }

    folders = folders.filter((f) => f.id !== folderId);
    saveFolders(folders);
    removeItemFromAllFolders(folderId, 'folder');

    if (wasCurrentView) {
        switchView('all-songs');
    }

    renderFoldersView();
    renderLeftPanelMainList();

    // Refresh virtual scroll
    if (typeof leftPanelVirtualState !== 'undefined' && leftPanelVirtualState.enabled) {
        const newItems = getLeftPanelItemsArray();
        leftPanelVirtualState.currentItems = newItems;
        if (typeof renderLeftPanelVisibleItems === 'function') {
            renderLeftPanelVisibleItems(false);
        }
    }

    updateScrollbarById('left-panel-main-content');
}

function getFolderContents(folderId) {
    const folders = getFolders();
    const folder = folders.find((f) => f.id === folderId);
    if (!folder)
        return {
            folders: [],
            playlists: [],
            albums: [],
            artists: [],
            specials: []
        };

    const childFolders = [];
    const childPlaylists = [];
    const childAlbums = [];
    const childArtists = [];
    const childSpecials = [];

    for (const child of folder.children) {
        if (child.type === 'folder') {
            const f = folders.find((f) => f.id === child.id);
            if (f)
                childFolders.push({
                    data: f,
                    shortcut: !!child.shortcut
                });
        } else if (child.type === 'playlist') {
            const playlists = getPlaylists();
            const p = playlists.find((p) => p.id === child.id);
            if (p)
                childPlaylists.push({
                    data: p,
                    shortcut: !!child.shortcut
                });
        } else if (child.type === 'album') {
            const albums = getAlbums();
            const a = albums.find((a) => a.id === child.id);
            if (a)
                childAlbums.push({
                    data: a,
                    shortcut: !!child.shortcut
                });
        } else if (child.type === 'artist') {
            const artists = getArtists();
            const a = artists.find((a) => a.id === child.id);
            if (a)
                childArtists.push({
                    data: a,
                    shortcut: !!child.shortcut
                });
        } else if (child.type === 'special') {
            childSpecials.push({
                data: {
                    id: child.id,
                    name: child.id === 'all-songs' ? 'All Songs' : child.id === 'favorites' ? 'Liked Songs' : child.id
                },
                shortcut: !!child.shortcut
            });
        }
    }

    return {
        folders: childFolders,
        playlists: childPlaylists,
        albums: childAlbums,
        artists: childArtists,
        specials: childSpecials
    };
}

function addToFolder(folderId, itemId, itemType, asShortcut = false) {
    if (itemType === 'folder' && folderId === itemId) return false;
    let folders = getFolders();
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return false;

    const existingIndex = folder.children.findIndex((c) => c.id === itemId && c.type === itemType);

    if (existingIndex !== -1) {
        if (asShortcut || !folder.children[existingIndex].shortcut) {
            return false;
        }
        folder.children.splice(existingIndex, 1);
    }

    if (!asShortcut) {
        for (const f of folders) {
            if (f.id !== folderId) {
                f.children = f.children.filter((c) => !(c.id === itemId && c.type === itemType && !c.shortcut));
            }
        }
    }

    folder.children.push({
        id: itemId,
        type: itemType,
        shortcut: asShortcut
    });
    saveFolders(folders);
    return true;
}

function removeItemFromAllFolders(itemId, itemType) {
    let folders = getFolders();
    let changed = false;
    for (const f of folders) {
        const before = f.children.length;
        f.children = f.children.filter((c) => !(c.id === itemId && c.type === itemType));
        if (f.children.length !== before) changed = true;
    }
    if (changed) saveFolders(folders);
    return changed;
}

function removeItemFromFolder(folderId, itemId, itemType) {
    let folders = getFolders();
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return false;

    const before = folder.children.length;
    folder.children = folder.children.filter((c) => !(c.id === itemId && c.type === itemType));
    if (folder.children.length !== before) {
        saveFolders(folders);
        return true;
    }
    return false;
}

function updateFolderCount(folderId) {
    const folders = getFolders();
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
        const playlistItems = folder.children.filter((c) => c.type === 'playlist').length;
        const folderItems = folder.children.filter((c) => c.type === 'folder').length;
        let countText = '';
        if (folderItems > 0) countText += `${folderItems} folder${folderItems !== 1 ? 's' : ''}`;
        if (playlistItems > 0) {
            if (countText) countText += ' • ';
            countText += `${playlistItems} playlist${playlistItems !== 1 ? 's' : ''}`;
        }
        return countText || 'Empty';
    }
    return 'Empty';
}

function isItemInAnyFolder(itemId, itemType) {
    const folders = getFolders();
    for (const folder of folders) {
        if (folder.children.some((c) => c.id === itemId && c.type === itemType && !c.shortcut)) {
            return true;
        }
    }
    return false;
}

function getItemFolderState(folderId, itemId, itemType) {
    const folders = getFolders();
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return null;
    const child = folder.children.find((c) => c.id === itemId && c.type === itemType);
    if (!child) return null;
    return {
        shortcut: !!child.shortcut
    };
}

function getExpandedFolderKeys() {
    return JSON.parse(localStorage.getItem('expandedFolders') || '[]');
}

function saveExpandedFolderKeys(keys) {
    localStorage.setItem('expandedFolders', JSON.stringify(keys));
}

function isFolderExpanded(parentKey, folderId) {
    const keys = getExpandedFolderKeys();
    return keys.includes(parentKey + '/' + folderId);
}

function toggleFolderExpanded(parentKey, folderId) {
    const key = parentKey + '/' + folderId;
    let keys = getExpandedFolderKeys();
    if (keys.includes(key)) {
        keys = keys.filter((k) => k !== key);
    } else {
        keys.push(key);
    }
    saveExpandedFolderKeys(keys);
    return keys.includes(key);
}

function countFolderChildren(folderId) {
    const c = getFolderContents(folderId);
    return c.folders.length + c.playlists.length + c.albums.length + c.artists.length + c.specials.length;
}

function buildFolderChildItems(folderId, parentKey) {
    const { folders, playlists, albums, artists, specials } = getFolderContents(folderId);
    const pinnedIds = getFolderPinnedItems(folderId);
    const playedOrder = getPlayedItemOrder();
    const items = [];

    folders.forEach((f) => {
        items.push({
            type: 'folder',
            id: f.data.id,
            title: f.data.name,
            viewId: `folder-${f.data.id}`,
            pinId: `folder-${f.data.id}`,
            countText: updateFolderCount(f.data.id),
            isPinned: pinnedIds.includes(`folder-${f.data.id}`),
            playedIndex: playedOrder.indexOf(`folder-${f.data.id}`),
            isShortcut: !!f.shortcut,
            parentKey: parentKey
        });
    });
    playlists.forEach((p) => {
        items.push({
            type: 'playlist',
            id: p.data.id,
            title: p.data.name,
            viewId: `playlist-${p.data.id}`,
            pinId: `playlist-${p.data.id}`,
            count: `${p.data.songs.length} ${p.data.songs.length === 1 ? 'song' : 'songs'}`,
            cover: p.data.cover,
            isPinned: pinnedIds.includes(`playlist-${p.data.id}`),
            playedIndex: playedOrder.indexOf(`playlist-${p.data.id}`),
            isShortcut: !!p.shortcut,
            parentKey: parentKey
        });
    });
    albums.forEach((a) => {
        items.push({
            type: 'album',
            id: a.data.id,
            title: a.data.name,
            viewId: a.data.id,
            pinId: a.data.id,
            count: a.data.songCount,
            cover: a.data.cover,
            isPinned: pinnedIds.includes(a.data.id),
            playedIndex: playedOrder.indexOf(a.data.id),
            isShortcut: !!a.shortcut,
            parentKey: parentKey
        });
    });
    artists.forEach((a) => {
        items.push({
            type: 'artist',
            id: a.data.id,
            title: a.data.name,
            viewId: a.data.id,
            pinId: a.data.id,
            count: a.data.songCount,
            cover: a.data.cover,
            isPinned: pinnedIds.includes(a.data.id),
            playedIndex: playedOrder.indexOf(a.data.id),
            isShortcut: !!a.shortcut,
            parentKey: parentKey
        });
    });
    specials.forEach((s) => {
        items.push({
            type: 'special',
            id: s.data.id,
            title: s.data.name,
            viewId: s.data.id,
            pinId: s.data.id,
            countText: '',
            isPinned: pinnedIds.includes(s.data.id),
            playedIndex: playedOrder.indexOf(s.data.id),
            isShortcut: !!s.shortcut,
            parentKey: parentKey
        });
    });

    items.sort((a, b) => {
        if (a.isPinned && b.isPinned) return pinnedIds.indexOf(a.pinId) - pinnedIds.indexOf(b.pinId);
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const aPlayed = a.playedIndex !== -1 ? a.playedIndex : 999;
        const bPlayed = b.playedIndex !== -1 ? b.playedIndex : 999;
        if (aPlayed !== bPlayed) return aPlayed - bPlayed;
        return 0;
    });
    return items;
}

function flattenLeftPanelItems(items, depth, parentKey, out, visited) {
    if (depth > 50) return;
    for (const item of items) {
        const cloned = Object.assign({}, item);
        cloned.depth = depth;
        cloned.parentKey = parentKey;
        if (cloned.type === 'folder') {
            cloned.childCount = countFolderChildren(cloned.id);
            cloned.isExpanded = isFolderExpanded(parentKey, cloned.id);
            cloned.isFolder = true;
        } else {
            cloned.isFolder = false;
            cloned.isExpanded = false;
        }
        out.push(cloned);
        if (cloned.type === 'folder' && cloned.isExpanded) {
            const branch = visited ? new Set(visited) : new Set();
            if (branch.has(cloned.id)) continue;
            branch.add(cloned.id);
            const children = buildFolderChildItems(cloned.id, cloned.id);
            flattenLeftPanelItems(children, depth + 1, cloned.id, out, branch);
        }
    }
}

// ==============================================================================
// SEARCH HISTORY
// ==============================================================================
function getSearchHistory() {
    return JSON.parse(localStorage.getItem('searchHistory') || '[]');
}

function saveSearchToHistory(searchQuery, searchSessionId, resultCount) {
    let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');

    const searchEntry = {
        sessionId: searchSessionId,
        query: searchQuery,
        resultCount: resultCount,
        timestamp: Date.now(),
        displayTime: new Date().toLocaleString()
    };

    searchHistory = searchHistory.filter((entry) => entry.sessionId !== searchSessionId);
    searchHistory.unshift(searchEntry);

    if (searchHistory.length > MAX_SEARCH_HISTORY) {
        searchHistory = searchHistory.slice(0, MAX_SEARCH_HISTORY);
    }

    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

async function clearSearchHistory() {
    const confirmed = await showConfirmDialog({
        title: 'Clear Search History',
        message: 'Clear all search history? This cannot be undone.',
        okText: 'Clear',
        cancelText: 'Cancel'
    });

    if (confirmed) {
        localStorage.removeItem('searchHistory');

        if (currentView === 'search-history') {
            renderSearchHistoryView();
        }

        showNotification('Search history cleared', 'success', 3000);
    }
}

// ==============================================================================
// LIBRARY LOCATIONS (MULTI-FOLDER SUPPORT)
// ==============================================================================

let libraryLocationsPanelOpen = false;

async function loadLibraryLocations() {
    if (!window.electronAPI || !window.electronAPI.getMusicFolders) {
        return [];
    }
    try {
        const folders = await window.electronAPI.getMusicFolders();
        return folders;
    } catch (e) {
        return [];
    }
}

async function getFolderStats(folderPath) {
    if (!window.electronAPI || !window.electronAPI.getFolderStats) {
        return {
            songCount: 0,
            addedTime: null
        };
    }
    try {
        return await window.electronAPI.getFolderStats(folderPath);
    } catch (e) {
        return {
            songCount: 0,
            addedTime: null
        };
    }
}

let selectedLibraryFolder = null;

function selectLibraryFolder(element, folderPath) {
    document.querySelectorAll('.library-location-item').forEach((item) => {
        item.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedLibraryFolder = folderPath;
}

async function renderLibraryLocations() {
    const container = document.getElementById('library-locations-list');
    if (!container) return;

    const folders = await loadLibraryLocations();

    if (!folders || folders.length === 0) {
        container.innerHTML = `
            <div class="empty-queue" style="padding: 40px 20px; text-align: center;">
                <i class="fas fa-folder-open" style="font-size: 32px; opacity: 0.5;"></i>
                <p style="margin-top: 12px;">No folders added</p>
                <small>Click "Add Folder" to include music locations</small>
            </div>
        `;
        selectedLibraryFolder = null;
        return;
    }

    const allSongs = getActiveSongs();
    const folderSongCounts = {};

    for (const song of allSongs) {
        const filePath = song.url.replace('file:///', '').replace(/\//g, '\\');
        for (const folder of folders) {
            const normalizedFolder = folder.replace(/\\\\/g, '\\');
            if (filePath.toLowerCase().startsWith(normalizedFolder.toLowerCase())) {
                folderSongCounts[folder] = (folderSongCounts[folder] || 0) + 1;
                break;
            }
        }
    }

    const foldersWithStats = [];
    for (const folder of folders) {
        const folderName = folder.split('\\').pop() || folder;
        const escapedFolderForClick = folder.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const songCount = folderSongCounts[folder] || 0;

        foldersWithStats.push({
            folder,
            folderName,
            escapedFolderForClick,
            songCount
        });
    }

    container.innerHTML = foldersWithStats
        .map(
            (item) => `
        <div class="library-location-item" data-folder="${escapeHtml(
            item.folder
        )}" onclick="selectLibraryFolder(this, '${item.escapedFolderForClick}')">
            <div class="library-location-name">
                <i class="fas fa-folder"></i>
                <span>${escapeHtml(item.folderName)}</span>
            </div>
            <div class="library-location-path" title="${escapeHtml(item.folder)}">${escapeHtml(item.folder)}</div>
            <div class="library-location-song-count">${item.songCount} song${item.songCount !== 1 ? 's' : ''}</div>
        </div>
    `
        )
        .join('');

    selectedLibraryFolder = null;
}

async function removeSelectedLibraryFolder() {
    if (!selectedLibraryFolder) {
        showNotification('No folder selected', 'warning', 2000);
        return;
    }

    const folderPath = selectedLibraryFolder;
    const folderName = folderPath.split('\\').pop() || folderPath;

    const confirmed = await showConfirmDialog({
        title: 'Remove Music Folder',
        message: `Remove "${folderName}" from your music library?\n\nSongs from this folder will be removed from the player.`,
        okText: 'Remove',
        cancelText: 'Cancel'
    });

    if (!confirmed) return;

    if (!window.electronAPI || !window.electronAPI.removeMusicFolder) {
        showNotification('Not available', 'warning', 2000);
        return;
    }

    const result = await window.electronAPI.removeMusicFolder(folderPath);

    if (result && result.success) {
        selectedLibraryFolder = null;
        await renderLibraryLocations();
        showNotification(`Removed "${folderName}". Click "Rebuild Library" to update songs.`, 'info', 4000);
    } else {
        showNotification('Failed to remove folder', 'error', 2000);
    }
}

async function addLibraryLocation() {
    if (!window.electronAPI || !window.electronAPI.addMusicFolder) {
        showNotification('Not available', 'warning', 2000);
        return;
    }

    const result = await window.electronAPI.addMusicFolder();

    if (result && result.success) {
        await renderLibraryLocations();
        showNotification('Folder added. Click "Rebuild Library" to scan it.', 'success', 3000);
    } else if (result && result.reason === 'duplicate') {
        showNotification('Folder already in library', 'warning', 2000);
    } else {
        showNotification('Failed to add folder', 'error', 2000);
    }
}

async function rebuildLibraryFromFolders() {
    if (!window.electronAPI || !window.electronAPI.rebuildFromFolders) {
        showNotification('Not available', 'warning', 2000);
        return;
    }

    const folders = await loadLibraryLocations();

    if (!folders || folders.length === 0) {
        showNotification('No folders in library. Add a folder first.', 'warning', 2000);
        return;
    }

    const confirmed = await showConfirmDialog({
        title: 'Rebuild Library',
        message: `Rebuild library from ${folders.length} folder(s)?\n\nThis will scan all folders and update your song library.`,
        okText: 'Rebuild',
        cancelText: 'Cancel'
    });

    if (!confirmed) return;

    showNotification(`Rebuilding library from ${folders.length} folder(s)...`, 'info', 3000);

    const result = await window.electronAPI.rebuildFromFolders();

    if (result && result.success && result.songs && result.songs.length > 0) {
        SONGS_DATA.length = 0;
        Array.prototype.push.apply(SONGS_DATA, result.songs);

        clearGhostList('all-songs');
        clearGhostList('favorites');
        clearGhostList('history');

        for (const key in activeSlotHighlights) {
            activeSlotHighlights[key] = null;
        }

        currentQueueIndex = -1;
        playbackQueue = [];
        audioElement.pause();
        audioElement.src = '';
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        document.querySelector('.player-song-info').classList.remove('has-song');
        document.getElementById('player-title').textContent = 'No song selected';
        document.getElementById('player-artist').textContent = '—';
        document.getElementById('player-cover').src = PLACEHOLDER_IMAGE;

        updateQueueDisplay();
        updateAlbumArt();

        updateAllCounts();
        updateLeftPanelCounts();
        renderPlaylistsView();
        renderAlbumLeftPanelItems();
        renderArtistLeftPanelItems();
        renderLeftPanelMainList();

        if (currentView === 'all-songs') {
            const songs = getSongsForList('all-songs');
            renderSongsList(songs, 'all-songs');
            setupHeroSection(true, 'All Songs', songs.length, 'Playlist');
        }

        await renderLibraryLocations();

        showNotification(`Loaded ${result.songs.length} songs from ${folders.length} folder(s)`, 'success', 4000);
    } else {
        const errorMsg = result ? result.reason || result.error || 'Unknown error' : 'No response';
        showNotification(`Failed to rebuild library: ${errorMsg}`, 'error', 4000);
    }
}

function changeMusicFolder() {
    if (!window.electronAPI || !window.electronAPI.changeMusicFolder) {
        showNotification('Not available in browser mode', 'warning', 2000);
        return;
    }

    showNotification('Selecting folder...', 'info', 5000);

    window.electronAPI
        .changeMusicFolder()
        .then((result) => {
            if (!result.success) {
                if (result.reason !== 'cancelled') {
                    showNotification('Failed to change folder', 'error', 3000);
                }
                return;
            }

            SONGS_DATA.length = 0;
            Array.prototype.push.apply(SONGS_DATA, result.songs);

            clearGhostList('all-songs');
            clearGhostList('favorites');
            clearGhostList('history');

            for (const key in activeSlotHighlights) {
                activeSlotHighlights[key] = null;
            }

            currentQueueIndex = -1;
            playbackQueue = [];
            audioElement.pause();
            audioElement.src = '';
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            playButton.setAttribute('title', 'Play');
            document.querySelector('.player-song-info').classList.remove('has-song');
            document.getElementById('player-title').textContent = 'No song selected';
            document.getElementById('player-artist').textContent = '—';
            document.getElementById('player-cover').src = PLACEHOLDER_IMAGE;

            updateQueueDisplay();
            updateAlbumArt();

            updateAllCounts();
            updateLeftPanelCounts();
            renderPlaylistsView();
            renderAlbumLeftPanelItems();
            renderArtistLeftPanelItems();
            renderLeftPanelMainList();

            updateAllCounts();
            if (currentView === 'all-songs') {
                const songs = getSongsForList('all-songs');
                renderSongsList(songs, 'all-songs');
                setupHeroSection(true, 'All Songs', songs.length, 'Playlist');
            }

            showNotification(`Loaded ${result.songs.length} songs from new folder`, 'success', 3000);
        })
        .catch((err) => {
            showNotification('Error changing folder', 'error', 3000);
        });
}

function deleteSearchHistoryEntry(sessionId) {
    let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    searchHistory = searchHistory.filter((entry) => entry.sessionId !== sessionId);
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));

    if (currentView === 'search-history') {
        renderSearchHistoryView();
    }

    showNotification('Search removed from history', 'error', 2000);
}

// ==============================================================================
// ALBUMS & ARTISTS
// ==============================================================================
function getAlbums() {
    const albums = {};
    for (const song of SONGS_DATA) {
        if (!song.album || song.album.trim() === '') continue;
        const albumName = song.album.trim();
        if (!albums[albumName]) {
            albums[albumName] = {
                name: albumName,
                songs: [],
                coverCounts: {}
            };
        }
        if (!deletedSongIds.has(song.id)) {
            albums[albumName].songs.push(song.id);
        }
        const coverKey = song.cover || '__none__';
        albums[albumName].coverCounts[coverKey] = (albums[albumName].coverCounts[coverKey] || 0) + 1;
    }

    const albumList = Object.values(albums).map((album) => {
        let bestCover = '';
        let maxCount = 0;
        for (const [cover, count] of Object.entries(album.coverCounts)) {
            if (cover !== '__none__' && count > maxCount) {
                maxCount = count;
                bestCover = cover;
            }
        }
        return {
            id: generateConsistentId('a', album.name),
            name: album.name,
            songs: album.songs,
            cover: bestCover,
            songCount: album.songs.length
        };
    });

    return albumList;
}

function getAlbumSongs(albumId) {
    const albums = getAlbums();
    const album = albums.find((a) => a.id === albumId);
    if (!album) return [];
    const songs = filterDeletedSongs(album.songs.map((id) => SONGS_DATA.find((s) => s.id === id)));
    songs.sort((a, b) => {
        const trackA = parseInt(a.track) || 0;
        const trackB = parseInt(b.track) || 0;
        if (trackA > 0 && trackB > 0) return trackA - trackB;
        if (trackA > 0 && trackB === 0) return -1;
        if (trackA === 0 && trackB > 0) return 1;
        return (a.title || '').localeCompare(b.title || '');
    });
    return songs;
}

function getArtistNamesForSong(song) {
    if (!song || !song.artist) return [];
    const raw = song.artist;
    let pieces = [];
    if (Array.isArray(raw)) {
        for (const entry of raw) {
            pieces.push(...String(entry).split(/[;/]/));
        }
    } else {
        pieces = String(raw).split(/[;/]/);
    }
    pieces = pieces.map((s) => s.trim()).filter((s) => s !== '');
    const seen = new Set();
    const result = [];
    for (const name of pieces) {
        if (name === 'Unknown Artist') continue;
        if (seen.has(name)) continue;
        seen.add(name);
        result.push(name);
    }
    return result;
}

function getArtists() {
    const artists = {};
    for (const song of SONGS_DATA) {
        const names = getArtistNamesForSong(song);
        for (const artistName of names) {
            if (!artists[artistName]) {
                artists[artistName] = {
                    name: artistName,
                    songs: []
                };
            }
            if (!deletedSongIds.has(song.id)) {
                artists[artistName].songs.push(song.id);
            }
        }
    }

    const artistList = Object.values(artists).map((artist) => {
        const sortedSongs = artist.songs
            .map((id) => SONGS_DATA.find((s) => s.id === id))
            .filter((s) => s)
            .sort((a, b) => {
                const yearA = parseInt(a.year) || 0;
                const yearB = parseInt(b.year) || 0;
                if (yearA !== yearB) return yearB - yearA;
                return (a.title || '').localeCompare(b.title || '');
            });

        const latestCover = sortedSongs.length > 0 ? sortedSongs[0].cover || '' : '';

        return {
            id: generateConsistentId('r', artist.name),
            name: artist.name,
            songs: artist.songs,
            cover: latestCover,
            songCount: artist.songs.length
        };
    });

    return artistList;
}

function getArtistSongs(artistId) {
    const artists = getArtists();
    const artist = artists.find((a) => a.id === artistId);
    if (!artist) return [];
    const songs = filterDeletedSongs(artist.songs.map((id) => SONGS_DATA.find((s) => s.id === id)));
    songs.sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        if (yearA !== yearB) return yearB - yearA;
        return (a.title || '').localeCompare(b.title || '');
    });
    return songs;
}

// ==============================================================================
// IMPORT / EXPORT
// ==============================================================================
function exportAllData() {
    const data = {
        playlists: getPlaylists(),
        folders: getFolders(),
        favorites: getFavorites(),
        playHistory: getPlayHistory(),
        recentlyPlayed: getRecentlyPlayed(),
        searchHistory: getSearchHistory(),
        pinnedItems: getPinnedItems(),
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `music_player_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Data exported successfully', 'success', 2000);
}

function importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                showImportChoiceModal(data, file.name);
            } catch (err) {
                showNotification('Invalid backup file', 'error', 2000);
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

function showImportChoiceModal(data, filename) {
    const { modal, overlay } = createModal('playlist-modal', 'playlist-modal-overlay', closeImportChoiceModal);
    modal.onclick = (e) => e.stopPropagation();

    modal.innerHTML = `
                        <h3 class="playlist-modal-title">Import Data</h3>
                        <p style="color: var(--text-secondary); font-size: 13px; margin: 10px 0;">
                                File: ${filename}
                        </p>
                        <p style="color: var(--text-secondary); font-size: 13px; margin: 10px 0;">
                                How would you like to import?
                        </p>
                        <div class="playlist-modal-buttons" style="flex-direction: column; gap: 8px;">
                                <button onclick="doImportMerge(${JSON.stringify(data).replace(
                                    /"/g,
                                    '&quot;'
                                )}); closeImportChoiceModal();" class="playlist-modal-create-btn" style="width: 100%;">
                                        <i class="fas fa-plus"></i> Merge with existing data
                                </button>
                                <button onclick="doImportReplace(${JSON.stringify(data).replace(
                                    /"/g,
                                    '&quot;'
                                )}); closeImportChoiceModal();" class="playlist-modal-cancel-btn" style="width: 100%;">
                                        <i class="fas fa-sync-alt"></i> Replace all existing data
                                </button>
                        </div>
                `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function closeImportChoiceModal() {
    const modal = document.querySelector('.playlist-modal');
    const overlay = document.querySelector('.playlist-modal-overlay');
    if (modal) modal.remove();
    if (overlay) overlay.remove();
}

function doImportMerge(data) {
    if (data.playlists) {
        const existing = getPlaylists();
        const merged = [...existing];
        data.playlists.forEach((p) => {
            if (!merged.find((e) => e.id === p.id)) {
                merged.push(p);
            }
        });
        savePlaylists(merged);
    }
    if (data.favorites) {
        const existing = getFavorites();
        const merged = [...new Set([...existing, ...data.favorites])];
        localStorage.setItem('favorites', JSON.stringify(merged));
    }
    if (data.pinnedItems) {
        const existing = getPinnedItems();
        const merged = [...new Set([...existing, ...data.pinnedItems])];
        savePinnedItems(merged);
    }
    if (data.folders) {
        const existing = getFolders();
        const merged = [...existing];
        data.folders.forEach((f) => {
            if (!merged.find((e) => e.id === f.id)) {
                merged.push(f);
            }
        });
        saveFolders(merged);
    }
    finishImport();
}

function doImportReplace(data) {
    if (data.playlists) savePlaylists(data.playlists);
    if (data.favorites) localStorage.setItem('favorites', JSON.stringify(data.favorites));
    if (data.playHistory) localStorage.setItem('playHistory', JSON.stringify(data.playHistory));
    if (data.recentlyPlayed) localStorage.setItem('recentlyPlayed', JSON.stringify(data.recentlyPlayed));
    if (data.searchHistory) localStorage.setItem('searchHistory', JSON.stringify(data.searchHistory));
    if (data.pinnedItems) savePinnedItems(data.pinnedItems);
    if (data.folders) saveFolders(data.folders);
    finishImport();
}

function finishImport() {
    renderPlaylistsView();
    renderFoldersView();
    renderLeftPanelMainList();
    updateRecentCount();
    showNotification('Data imported successfully', 'success', 2000);
}
