// ==============================================================================
// PLAYBACK - SHUFFLE STATE
// ==============================================================================
let shufflePool = [];

// ==============================================================================
// PLAYBACK - SHUFFLE SYSTEM
// ==============================================================================
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function getNextShuffledSong() {
    if (repeatFunctionalityActive && repeatMode === 2) return null;

    if (shufflePool.length === 0) {
        const currentListSongs = getSongsForList(currentView);
        shufflePool = shuffleArray([...currentListSongs]);
    }

    if (shufflePool.length === 0) return null;

    const nextSong = shufflePool.shift();
    return {
        song: nextSong,
        listId: currentView,
        ghostSlot: null
    };
}

function refillShufflePool() {
    const tempIndices = [...allSongsIndices];

    for (let i = tempIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tempIndices[i], tempIndices[j]] = [tempIndices[j], tempIndices[i]];
    }

    const takeCount = Math.min(20, tempIndices.length);

    for (let i = 0; i < takeCount; i++) {
        const songIndex = tempIndices[i];
        shufflePool.push(SONGS_DATA[songIndex]);
    }
}

function resetShuffle() {
    shufflePool = [];
    refillShufflePool();
}

// ==============================================================================
// PLAYBACK - QUEUE MANAGEMENT
// ==============================================================================
function updateQueueDisplay() {
    const queueList = document.getElementById('queue-list');

    if (repeatFunctionalityActive && repeatMode === 2 && currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
        const currentSong = playbackQueue[currentQueueIndex];
        queueList.innerHTML = `
                                <div class="queue-lables"><span>Now Playing</span></div>
                                ${renderRightPanelItem(currentSong, {
                                    isNowPlaying: true,
                                    onClick: `playFromQueue(${currentQueueIndex})`,
                                    contextMenuArgs: `${currentSong.id}, {queueIndex: ${currentQueueIndex}}`
                                })}
                                <div class="empty-queue">
                                        <i class="fas fa-infinity"></i>
                                        <p>Repeating this song only</p>
                                        <small>Switch to repeat all to see queue</small>
                                </div>`;
        return;
    }

    if (!playbackQueue || playbackQueue.length === 0) {
        queueList.innerHTML = `
                                <div class="empty-queue">
                                        <i class="fas fa-music"></i>
                                        <p>Queue is empty</p>
                                        <small>Play songs to build your queue</small>
                                </div>`;
        return;
    }

    const maxDisplay = 50;
    const windowStart = currentQueueIndex + 1;
    const upcomingSongs = playbackQueue.slice(windowStart);
    const manualQueueSongs = upcomingSongs.filter((item) => item.source === 'manual' || item.addedManually === true);
    const autoQueueSongs = upcomingSongs.filter((item) => !(item.source === 'manual' || item.addedManually === true));

    const manualWindowEnd = Math.min(manualQueueSongs.length, maxDisplay);
    const autoWindowEnd = Math.min(autoQueueSongs.length, maxDisplay - manualWindowEnd);

    let queueHTML = '';

    if (currentQueueIndex >= 0 && currentQueueIndex < playbackQueue.length) {
        const queueItem = playbackQueue[currentQueueIndex];
        const currentSong = queueItem.song || queueItem;
        queueHTML += `<div class="queue-lables"><span>Now Playing</span></div>`;
        queueHTML += renderRightPanelItem(currentSong, {
            isNowPlaying: true,
            onClick: `playFromQueue(${currentQueueIndex})`,
            contextMenuArgs: `${currentSong.id}, {queueIndex: ${currentQueueIndex}}`
        });
    }

    if (manualQueueSongs.length > 0) {
        queueHTML += `<div class="added-to-queue-section">
                                <div class="queue-lables"><span>Added to Queue</span></div>`;

        const displayManualSongs = manualQueueSongs.slice(0, manualWindowEnd);
        displayManualSongs.forEach((queueItem) => {
            const song = queueItem.song || queueItem;
            const originalIndex = playbackQueue.indexOf(queueItem);

            queueHTML += `
                                ${renderRightPanelItem(song, {
                                    onClick: `playFromQueue(${originalIndex})`,
                                    contextMenuArgs: `${song.id}, {queueIndex: ${originalIndex}}`
                                })}`;
        });

        if (manualWindowEnd < manualQueueSongs.length) {
            const remainingCount = manualQueueSongs.length - manualWindowEnd;
            queueHTML += `
                                        <div class="empty-queue" style="padding: 10px; margin: 5px 0;">
                                                <small>${remainingCount} more added song${
                remainingCount !== 1 ? 's' : ''
            }</small>
                                        </div>`;
        }

        queueHTML += `</div>`;
    }

    if (autoQueueSongs.length > 0) {
        queueHTML += `<div class="next-songs-section">
                                <div class="queue-lables"><span>Next Songs</span></div>`;

        const displayAutoSongs = autoQueueSongs.slice(0, autoWindowEnd);
        displayAutoSongs.forEach((queueItem, displayIndex) => {
            const song = queueItem.song || queueItem;
            const originalIndex = playbackQueue.indexOf(queueItem);
            const isNext = manualQueueSongs.length === 0 && displayIndex === 0;

            queueHTML += `
                                ${renderRightPanelItem(song, {
                                    onClick: `playFromQueue(${originalIndex})`,
                                    contextMenuArgs: `${song.id}, {queueIndex: ${originalIndex}}`,
                                    extraClass: isNext ? 'next-in-queue' : ''
                                })}`;
        });

        queueHTML += `</div>`;

        if (autoWindowEnd < autoQueueSongs.length) {
            const remainingCount = autoQueueSongs.length - autoWindowEnd;
            queueHTML += `
                                        <div class="empty-queue" style="padding: 15px; margin-top: 10px;">
                                                <i class="fas fa-ellipsis-h"></i>
                                                <p>${remainingCount} more song${remainingCount !== 1 ? 's' : ''}</p>
                                                <small>Scroll down to see more</small>
                                        </div>`;
        }
    }

    if (manualQueueSongs.length === 0 && autoQueueSongs.length === 0 && currentQueueIndex >= 0) {
        queueHTML += `
                                <div class="next-songs-section">
                                        <div class="empty-queue">
                                                <i class="fas fa-forward"></i>
                                                <p>No more songs in queue</p>
                                                <small>Add more songs to continue</small>
                                        </div>
                                </div>`;
    }

    queueList.innerHTML = queueHTML;
    updateScrollbarById('right-panel-content');
}

function playFromQueue(queueIndex) {
    if (queueIndex >= 0 && queueIndex < playbackQueue.length) {
        playSongFromQueue(queueIndex);
    }
}

function removeFromQueue(queueIndex) {
    if (queueIndex >= 0 && queueIndex < playbackQueue.length) {
        if (queueIndex === currentQueueIndex) {
            saveCurrentPlaybackState();

            const nextIndex = queueIndex < playbackQueue.length - 1 ? queueIndex : queueIndex - 1;
            playbackQueue.splice(queueIndex, 1);

            if (playbackQueue.length > 0 && nextIndex >= 0) {
                playSongFromQueue(nextIndex);
            } else {
                audioElement.pause();
                audioElement.src = '';
                currentQueueIndex = -1;
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                playButton.setAttribute('title', 'Play');
                document.querySelector('.player-song-info').classList.remove('has-song');
                document.getElementById('player-title').textContent = 'No song selected';
                document.getElementById('player-artist').textContent = '—';
            }
        } else {
            if (queueIndex < currentQueueIndex) {
                currentQueueIndex--;
            }
            playbackQueue.splice(queueIndex, 1);
        }

        updateQueueDisplay();
        if (currentView === 'recent') {
            renderRecentlyPlayed();
        } else if (currentView === 'all-songs') {
            renderSongsList(getSongsForList('all-songs'), 'all-songs');
        } else if (currentView === 'search' || currentView === 'search-items') {
            renderSongsList(getSongsForList('search-items'), 'search-items');
        }
    }
}

function cleanupPlaybackQueue() {
    if (playbackQueue.length > 50) {
        const keepFrom = Math.max(0, currentQueueIndex);
        playbackQueue = playbackQueue.slice(keepFrom);
        currentQueueIndex = 0;
    }
}

function addSongToQueueNext(songId) {
    const song = SONGS_DATA.find((s) => s.id === songId);
    if (!song || deletedSongIds.has(song.id)) return;

    let insertPosition = currentQueueIndex + 1;
    if (currentQueueIndex === -1) {
        insertPosition = 0;
    }

    const queueItem = {
        song: song,
        listId: currentView,
        ghostSlot: null,
        source: 'manual',
        addedManually: true
    };

    playbackQueue.splice(insertPosition, 0, queueItem);

    updateQueueDisplay();

    const addButton = document.querySelector(`.add-to-queue-btn[onclick*="${songId}"]`);

    if (addButton) {
        addButton.classList.add('adding');

        setTimeout(() => {
            addButton.classList.remove('adding');
        }, 300);
    }
}

function addToQueueNextFromMenu() {
    if (currentContextSongId !== null) {
        addSongToQueueNext(currentContextSongId);
    }
}

function addPlaylistToQueue(playlistId) {
    const songs = getPlaylistSongs(playlistId);
    if (songs.length === 0) {
        showNotification('Playlist is empty', 'warning', 2000);
        return;
    }
    const insertAt = currentQueueIndex >= 0 ? currentQueueIndex + 1 : 0;
    songs.forEach((song, i) => {
        playbackQueue.splice(insertAt + i, 0, {
            song: song,
            listId: `playlist-${playlistId}`,
            ghostSlot: null,
            source: 'manual',
            addedManually: true
        });
    });
    updateQueueDisplay();
    showNotification(`Added ${songs.length} song(s) to queue`, 'success', 2000);
}

function addAlbumToQueue(albumId) {
    const songs = getAlbumSongs(albumId);
    if (songs.length === 0) {
        showNotification('Album is empty', 'warning', 2000);
        return;
    }
    const insertAt = currentQueueIndex >= 0 ? currentQueueIndex + 1 : 0;
    songs.forEach((song, i) => {
        playbackQueue.splice(insertAt + i, 0, {
            song: song,
            listId: albumId,
            ghostSlot: null,
            source: 'manual',
            addedManually: true
        });
    });
    updateQueueDisplay();
    showNotification(`Added ${songs.length} song(s) to queue`, 'success', 2000);
}

function addArtistToQueue(artistId) {
    const songs = getArtistSongs(artistId);
    if (songs.length === 0) {
        showNotification('Artist has no songs', 'warning', 2000);
        return;
    }
    const insertAt = currentQueueIndex >= 0 ? currentQueueIndex + 1 : 0;
    songs.forEach((song, i) => {
        playbackQueue.splice(insertAt + i, 0, {
            song: song,
            listId: artistId,
            ghostSlot: null,
            source: 'manual',
            addedManually: true
        });
    });
    updateQueueDisplay();
    showNotification(`Added ${songs.length} song(s) to queue`, 'success', 2000);
}

function addSongToQueueAt(songId, insertIndex) {
    const song = SONGS_DATA.find((s) => s.id === songId);
    if (!song || deletedSongIds.has(song.id)) return false;

    if (insertIndex < 0) insertIndex = 0;
    if (insertIndex > playbackQueue.length) insertIndex = playbackQueue.length;

    const queueItem = {
        song: song,
        listId: currentView,
        ghostSlot: null,
        source: 'manual',
        addedManually: true
    };

    playbackQueue.splice(insertIndex, 0, queueItem);

    if (insertIndex <= currentQueueIndex) {
        currentQueueIndex++;
    }

    updateQueueDisplay();
    return true;
}

// ==============================================================================
// PLAYBACK - SONG PLAYBACK
// ==============================================================================
function playSongFromQueue(queueIndex) {
    if (queueIndex < 0 || queueIndex >= playbackQueue.length) return;

    saveCurrentPlaybackState();

    currentQueueIndex = queueIndex;
    const queueItem = playbackQueue[queueIndex];
    const song = queueItem.song || queueItem;
    const listId = queueItem.listId || currentView;
    const ghostSlot = queueItem.ghostSlot !== undefined ? queueItem.ghostSlot : null;

    if (listId === 'search' && searchQuery) {
        queueItem.searchQuery = searchQuery;
    }

    audioElement.src = song.url;
    audioElement.play().catch((e) => {});

    pushToHistoryStack(song);

    document.querySelector('.player-song-info').classList.add('has-song');
    document.getElementById('player-title').textContent = song.title;
    document.getElementById('player-artist').innerHTML = buildPlayerArtistHTML(song.artist);
    const songCover = typeof song.cover === 'string' && song.cover.trim() !== '' ? song.cover : PLACEHOLDER_IMAGE;
    document.getElementById('player-cover').src = songCover;
    document.getElementById('player-cover').alt = `Cover for ${song.title}`;

    playButton.innerHTML = '<i class="fas fa-pause"></i>';
    playButton.setAttribute('aria-label', 'Pause');
    playButton.setAttribute('title', 'Pause');
    updateSubheroPlayButton(isCurrentViewPlaying());

    const lyricsToggleBtnEl = document.getElementById('lyrics-toggle-btn');
    if (lyricsToggleBtnEl) {
        const hasLyrics = typeof getLyricsForSong === 'function' && String(getLyricsForSong(song) || '').trim() !== '';
        lyricsToggleBtnEl.disabled = false;
        lyricsToggleBtnEl.setAttribute('data-original-title', hasLyrics ? 'Lyrics' : 'No lyrics for this song');
    }

    totalTimeDisplay.textContent = song.duration;
    updateTimeDisplay();

    updateAlbumArt();

    if (isShuffled) {
        while (playbackQueue.length - currentQueueIndex < 20) {
            const nextSong = getNextShuffledSong();
            if (nextSong) {
                playbackQueue.push(nextSong);
            } else {
                break;
            }
        }
        cleanupPlaybackQueue();
    }

    updateQueueDisplay();

    if (currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
        const currentItem = playbackQueue[currentQueueIndex];
        const currentSong = currentItem.song || currentItem;
        const currentListId = currentItem.listId || currentView;
        const currentGhostSlot = currentItem.ghostSlot !== undefined ? currentItem.ghostSlot : null;

        movePlayedItemToTop(currentListId);
        updatePlayingHighlight(currentSong.id, currentListId, currentGhostSlot);
    }
}

function createQueueFromSongList(songList, startIndex = 0, listId = 'all-songs') {
    playbackQueue = songList.map((song, idx) => ({
        song: song,
        listId: listId,
        ghostSlot: idx
    }));
    currentQueueIndex = startIndex;

    updateQueueDisplay();

    if (playbackQueue.length > 0 && currentQueueIndex >= 0 && currentQueueIndex < playbackQueue.length) {
        playSongFromQueue(currentQueueIndex);
    }
}

function playSongFromList(songId, listId = null, clickedIndex = null) {
    const existingItem =
        currentQueueIndex >= 0 && playbackQueue[currentQueueIndex] ? playbackQueue[currentQueueIndex] : null;
    const existingSong = existingItem ? existingItem.song || existingItem : null;
    if (existingSong && existingSong.id === songId && audioElement.src) {
        if (audioElement.paused) {
            audioElement.play();
        }
        return;
    }

    saveCurrentPlaybackState();

    isPrevNavigation = false;
    isManualPlay = true;
    const song = SONGS_DATA.find((s) => s.id === songId);
    if (!song) return;

    const activeListId = listId || currentView;

    const songList = getSongsForList(activeListId);

    if (activeListId === 'search-items' || activeListId === 'search') {
        ghostLists['search-items'] = [];
        for (let i = 0; i < songList.length; i++) {
            ghostLists['search-items'].push(`SearchItem${String(i + 1).padStart(5, '0')}`);
        }
        nextSearchItemSlotId = songList.length + 1;
    } else if (activeListId === 'favorites') {
        ghostLists['favorites'] = [];
        for (let i = 0; i < songList.length; i++) {
            ghostLists['favorites'].push(`Favorites${String(i + 1).padStart(5, '0')}`);
        }
        nextFavoriteSlotId = songList.length + 1;
    } else if (activeListId && activeListId.startsWith('playlist-')) {
        const playlistId = activeListId.replace('playlist-', '');
        initGhostSlots(activeListId, songList, `Playlist${playlistId}`);
    } else if (activeListId && activeListId.startsWith('a') && activeListId.length === 13) {
        initGhostSlots(activeListId, songList, `Album-${activeListId}`);
    } else if (activeListId && activeListId.startsWith('r') && activeListId.length === 13) {
        initGhostSlots(activeListId, songList, `Artist-${activeListId}`);
    }

    const startIndex = songList.findIndex((s) => s.id === songId);
    if (startIndex === -1) return;

    const ghostSlotIndex = clickedIndex !== null ? clickedIndex : startIndex;

    if (isShuffled) {
        const currentListSongs = getSongsForList(activeListId);

        const remainingSongs = currentListSongs.filter((s) => s.id !== song.id);
        const shuffledRemaining = shuffleArray([...remainingSongs]);

        playbackQueue = [
            {
                song: song,
                listId: activeListId,
                ghostSlot: ghostSlotIndex
            }
        ];

        for (let i = 0; i < Math.min(19, shuffledRemaining.length); i++) {
            playbackQueue.push({
                song: shuffledRemaining[i],
                listId: activeListId,
                ghostSlot: null
            });
        }

        currentQueueIndex = 0;
        playSongFromQueue(0);
    } else {
        const queueItems = songList.map((s, idx) => ({
            song: s,
            listId: activeListId,
            ghostSlot: idx
        }));
        playbackQueue = queueItems;
        currentQueueIndex = startIndex;

        updateQueueDisplay();

        if (playbackQueue.length > 0 && currentQueueIndex >= 0) {
            playSongFromQueue(currentQueueIndex);
        }
    }

    movePlayedItemToTop(activeListId);
    updatePlayingHighlight(songId, activeListId, ghostSlotIndex);
}

function playSongFromHistory(songId) {
    const song = SONGS_DATA.find((s) => s.id === songId);
    if (!song || deletedSongIds.has(song.id)) return;

    if (isShuffled) {
        let currentListSongs = getActiveSongs();
        const remainingSongs = currentListSongs.filter((s) => s.id !== songId);
        const shuffledRemaining = shuffleArray([...remainingSongs]);

        playbackQueue = [
            {
                song: song,
                listId: 'all-songs',
                ghostSlot: null
            }
        ];

        for (let i = 0; i < Math.min(19, shuffledRemaining.length); i++) {
            playbackQueue.push({
                song: shuffledRemaining[i],
                listId: 'all-songs',
                ghostSlot: null
            });
        }

        currentQueueIndex = 0;
        playSongFromQueue(0);
    } else {
        playbackQueue = SONGS_DATA.map((s, idx) => ({
            song: s,
            listId: 'all-songs',
            ghostSlot: idx
        }));
        currentQueueIndex = SONGS_DATA.findIndex((s) => s.id === songId);

        updateQueueDisplay();

        if (playbackQueue.length > 0 && currentQueueIndex >= 0) {
            playSongFromQueue(currentQueueIndex);
        }
    }
}

function playAllFromCurrentView() {
    const currentItem =
        currentQueueIndex >= 0 && playbackQueue[currentQueueIndex] ? playbackQueue[currentQueueIndex] : null;
    const currentListId = currentItem ? currentItem.listId || 'all-songs' : null;
    const isSameViewPaused = currentItem && currentListId === currentView && audioElement.paused;

    if (isSameViewPaused) {
        audioElement.play();
        return;
    }

    playCurrentViewFromStart();
}

function playCurrentViewFromStart() {
    saveCurrentPlaybackState();

    isPrevNavigation = false;
    isManualPlay = true;

    let songsToPlay = [];
    let listId = currentView;

    if (currentView === 'all-songs') {
        songsToPlay = [...SONGS_DATA];
    } else if (currentView === 'favorites') {
        const favorites = getFavorites();
        songsToPlay = favorites.map((id) => SONGS_DATA.find((s) => s.id === id)).filter((s) => s);
    } else if (currentView === 'history') {
        const history = getPlayHistory();
        songsToPlay = history.map((entry) => SONGS_DATA.find((s) => s.id === entry.id)).filter((s) => s);
    } else if (currentView === 'search-items' || currentView === 'search') {
        songsToPlay = getSongsForList('search-items');
    } else if (currentView && currentView.startsWith('playlist-')) {
        const playlistId = currentView.replace('playlist-', '');
        songsToPlay = getPlaylistSongs(playlistId);
    } else if (currentView && currentView.startsWith('a') && currentView.length === 13) {
        songsToPlay = getAlbumSongs(currentView);
    } else if (currentView && currentView.startsWith('r') && currentView.length === 13) {
        songsToPlay = getArtistSongs(currentView);
    } else {
        songsToPlay = getActiveSongs();
    }

    if (songsToPlay.length === 0) {
        showNotification('No songs to play', 'warning', 2000);
        return;
    }

    if (repeatFunctionalityActive && repeatMode === 2) {
        isShuffled = false;
        shuffleButton.classList.remove('active');
        playbackQueue = [
            {
                song: songsToPlay[0],
                listId: listId,
                ghostSlot: 0
            }
        ];
        currentQueueIndex = 0;
        audioElement.loop = true;
    } else if (isShuffled) {
        const randomIndex = Math.floor(Math.random() * songsToPlay.length);
        const firstSong = songsToPlay[randomIndex];
        playbackQueue = [
            {
                song: firstSong,
                listId: listId,
                ghostSlot: randomIndex
            }
        ];
        currentQueueIndex = 0;
        shufflePool = shuffleArray(songsToPlay.filter((s) => s.id !== firstSong.id));
    } else {
        playbackQueue = songsToPlay.map((s, idx) => ({
            song: s,
            listId: listId,
            ghostSlot: idx
        }));
        currentQueueIndex = 0;
    }

    movePlayedItemToTop(listId);
    updateQueueDisplay();
    playSongFromQueue(0);
}

function isCurrentViewPlaying() {
    if (currentQueueIndex < 0 || !playbackQueue[currentQueueIndex]) return false;
    const currentItem = playbackQueue[currentQueueIndex];
    const currentListId = currentItem.listId || 'all-songs';
    return currentListId === currentView && !audioElement.paused;
}

function togglePlayAllFromCurrentView() {
    const btn = document.getElementById('subhero-play-btn');
    if (btn) temporarilySuppressTooltip(btn);

    if (isCurrentViewPlaying()) {
        audioElement.pause();
    } else {
        playAllFromCurrentView();
    }
}
