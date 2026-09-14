// ==============================================================================
// TIME FORMATTING
// ==============================================================================
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function toggleTimeDisplay() {
    showRemainingTime = !showRemainingTime;
    updateTimeDisplay();
}

function updateTimeDisplay() {
    if (!audioElement.duration) return;

    if (showRemainingTime) {
        const remaining = audioElement.duration - audioElement.currentTime;
        currentTimeDisplay.textContent = '-' + formatTime(remaining);
    } else {
        currentTimeDisplay.textContent = formatTime(audioElement.currentTime);
    }
}

// ==============================================================================
// PLAYBACK CONTROL — PLAY BUTTON
// ==============================================================================
playButton.onclick = () => {
    if (!audioElement.src) return;

    temporarilySuppressTooltip(playButton);

    if (audioElement.paused) {
        if (!lastPlayedSong && currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
            lastPlayedSong = playbackQueue[currentQueueIndex];
            lastPlayedSongStartTime = Date.now();
        }
        audioElement.play();
    } else {
        audioElement.pause();
    }
};

// ==============================================================================
// SHUFFLE BUTTON
// ==============================================================================
shuffleButton.onclick = () => {
    temporarilySuppressTooltip(shuffleButton);
    isShuffled = !isShuffled;
    shuffleButton.classList.toggle('active', isShuffled);
    updateSubheroShuffleButton();
    shuffleButton.setAttribute('aria-label', isShuffled ? 'Disable shuffle' : 'Enable shuffle');

    if (isShuffled) {
        if (repeatMode === 2) {
            shuffleButton.classList.add('active');
            shuffleButton.setAttribute('aria-label', 'Shuffle on (disabled in repeat one mode)');

            repeatFunctionalityActive = true;
            audioElement.loop = true;

            updateQueueDisplay();

            if (currentView === 'all-songs') {
                renderSongsList(SONGS_DATA, 'all-songs');
            } else if ((currentView === 'search' || currentView === 'search-items') && searchQuery) {
                const filteredSongs = SONGS_DATA.filter(
                    (s) =>
                        s.title.toLowerCase().includes(searchQuery) ||
                        s.artist.toLowerCase().includes(searchQuery) ||
                        s.album.toLowerCase().includes(searchQuery)
                );
                renderSongsList(filteredSongs, 'search-items');
            }
            return;
        }

        repeatVisualState = repeatMode;

        repeatButton.classList.toggle('active', repeatVisualState > 0);
        repeatOneIndicator.style.display = repeatVisualState === 2 ? 'block' : 'none';

        const labels = ['Repeat off', 'Repeat all', 'Repeat one'];
        const currentLabel = labels[repeatVisualState] + ' (disabled in shuffle)';
        repeatButton.setAttribute('aria-label', currentLabel);

        audioElement.loop = false;

        const currentListSongs = getSongsForList(currentView);

        const currentSongId =
            currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]
                ? playbackQueue[currentQueueIndex].song
                    ? playbackQueue[currentQueueIndex].song.id
                    : playbackQueue[currentQueueIndex].id
                : null;

        let remainingSongs;
        let currentSongData = null;

        if (currentSongId !== null) {
            currentSongData = currentListSongs.find((s) => s.id === currentSongId);
            remainingSongs = currentListSongs.filter((s) => s.id !== currentSongId);
        } else {
            remainingSongs = [...currentListSongs];
        }

        const shuffledRemaining = shuffleArray(remainingSongs);

        if (currentSongData) {
            playbackQueue = [
                {
                    song: currentSongData,
                    listId: currentView,
                    ghostSlot: null
                },
                ...shuffledRemaining.map((s) => ({
                    song: s,
                    listId: currentView,
                    ghostSlot: null
                }))
            ];
            currentQueueIndex = 0;
        } else {
            playbackQueue = shuffledRemaining.map((s) => ({
                song: s,
                listId: currentView,
                ghostSlot: null
            }));
            currentQueueIndex = -1;
        }

        shufflePool = shuffleArray([...currentListSongs]);

        updateQueueDisplay();
    } else {
        if (repeatMode === 2) {
            shuffleButton.classList.remove('active');
            shuffleButton.setAttribute('aria-label', 'Shuffle off');

            repeatFunctionalityActive = true;
            audioElement.loop = true;

            updateQueueDisplay();

            if (currentView === 'recent') {
                renderRecentlyPlayed();
            } else if (currentView === 'all-songs') {
                renderSongsList(SONGS_DATA, 'all-songs');
            } else if ((currentView === 'search' || currentView === 'search-items') && searchQuery) {
                const filteredSongs = SONGS_DATA.filter(
                    (s) =>
                        s.title.toLowerCase().includes(searchQuery) ||
                        s.artist.toLowerCase().includes(searchQuery) ||
                        s.album.toLowerCase().includes(searchQuery)
                );
                renderSongsList(filteredSongs, 'search-items');
            }
            return;
        }

        if (repeatVisualState > 0) {
            repeatMode = repeatVisualState;
            repeatButton.classList.toggle('active', repeatMode > 0);
            repeatOneIndicator.style.display = repeatMode === 2 ? 'block' : 'none';

            const labels = ['Repeat off', 'Repeat all', 'Repeat one'];
            repeatButton.setAttribute('aria-label', labels[repeatMode]);

            audioElement.loop = repeatMode === 2;
        }

        const currentListSongs = getSongsForList(currentView);

        playbackQueue = currentListSongs.map((s, idx) => ({
            song: s,
            listId: currentView,
            ghostSlot: idx
        }));

        if (currentQueueIndex >= 0 && playbackQueue.length > 0) {
            const currentSong = document.getElementById('player-title').textContent;
            const currentArtist = document.getElementById('player-artist').textContent;

            const newIndex = playbackQueue.findIndex((item) => {
                const s = item.song || item;
                return s.title === currentSong && s.artist === currentArtist;
            });

            currentQueueIndex = newIndex !== -1 ? newIndex : 0;
        } else {
            currentQueueIndex = -1;
        }

        shufflePool = [];
        updateQueueDisplay();
    }
};

// ==============================================================================
// REPEAT BUTTON
// ==============================================================================
repeatButton.onclick = () => {
    temporarilySuppressTooltip(repeatButton);
    saveCurrentPlaybackState();

    if (isShuffled) {
        const newVisualState = (repeatVisualState + 1) % 3;
        repeatVisualState = newVisualState;
        repeatMode = newVisualState;

        repeatButton.classList.toggle('active', repeatVisualState > 0);
        repeatOneIndicator.style.display = repeatVisualState === 2 ? 'block' : 'none';

        const labels = ['Repeat off', 'Repeat all', 'Repeat one'];
        repeatButton.setAttribute(
            'aria-label',
            labels[repeatVisualState] + (repeatVisualState === 2 ? ' (shuffle disabled)' : ' (visual only)')
        );

        repeatFunctionalityActive = repeatVisualState === 2;
        audioElement.loop = repeatFunctionalityActive;

        if (repeatVisualState !== 2) {
            if (isShuffled) {
                shuffleButton.setAttribute('aria-label', 'Shuffle on');

                if (playbackQueue.length > 0 && currentQueueIndex >= 0) {
                    const currentSong = playbackQueue[currentQueueIndex];
                    const songList = getSongsForList(currentView);

                    const remainingSongs = songList.filter((s) => s.id !== currentSong.id);
                    const shuffledRemaining = shuffleArray([...remainingSongs]);

                    playbackQueue = [currentSong, ...shuffledRemaining];
                    currentQueueIndex = 0;

                    resetShuffle();
                    shufflePool = shuffleArray([...SONGS_DATA]);
                }
            }
        }

        updateQueueDisplay();

        if (currentView === 'recent') {
            renderRecentlyPlayed();
        } else if (currentView === 'all-songs') {
            renderSongsList(SONGS_DATA);
        } else if ((currentView === 'search' || currentView === 'search-items') && searchQuery) {
            const filteredSongs = SONGS_DATA.filter(
                (s) =>
                    s.title.toLowerCase().includes(searchQuery) ||
                    s.artist.toLowerCase().includes(searchQuery) ||
                    s.album.toLowerCase().includes(searchQuery)
            );
            renderSongsList(filteredSongs, 'search-items');
        }
        return;
    }

    repeatMode = (repeatMode + 1) % 3;
    repeatVisualState = repeatMode;

    repeatButton.classList.toggle('active', repeatMode > 0);
    repeatOneIndicator.style.display = repeatMode === 2 ? 'block' : 'none';

    const labels = ['Repeat off', 'Repeat all', 'Repeat one'];
    repeatButton.setAttribute('aria-label', labels[repeatMode]);

    repeatFunctionalityActive = repeatMode > 0;
    audioElement.loop = repeatMode === 2;

    if (repeatMode !== 2 && !isShuffled) {
        if (playbackQueue.length > 0 && currentQueueIndex >= 0) {
            const currentSong = playbackQueue[currentQueueIndex];

            const songList = getSongsForList(currentView);

            const newIndex = songList.findIndex((s) => s.id === currentSong.id);
            if (newIndex !== -1) {
                playbackQueue = [...songList];
                currentQueueIndex = newIndex;
            }
        }
        shufflePool = [];
    }

    updateQueueDisplay();
};

// ==============================================================================
// TRACK NAVIGATION — NEXT / PREV
// ==============================================================================
document.getElementById('next-btn').onclick = () => {
    temporarilySuppressTooltip(document.getElementById('next-btn'));
    if (playbackQueue.length === 0) return;

    saveCurrentPlaybackState();

    if (repeatFunctionalityActive && repeatMode === 2 && currentQueueIndex >= 0) {
        if (lastPlayedSong && shouldSaveToRecentlyPlayed(lastPlayedSong)) {
            saveToRecentlyPlayed(lastPlayedSong);
        }

        if (currentView === 'recent') {
            renderRecentlyPlayed();
        }

        audioElement.currentTime = 0;
        audioElement.play();

        if (currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
            lastPlayedSong = playbackQueue[currentQueueIndex];
            lastPlayedSongStartTime = Date.now();
        }
        return;
    }

    if (isShuffled) {
        if (!(repeatFunctionalityActive && repeatMode === 2)) {
            if (currentQueueIndex < playbackQueue.length - 1) {
                isManualPlay = false;
                playSongFromQueue(currentQueueIndex + 1);
            } else {
                const nextSong = getNextShuffledSong();
                if (nextSong) {
                    playbackQueue.push(nextSong);
                    isManualPlay = false;
                    playSongFromQueue(currentQueueIndex + 1);
                }
            }
        }
        return;
    } else {
        if (currentQueueIndex === -1) {
            isManualPlay = false;
            playSongFromQueue(0);
        } else if (currentQueueIndex < playbackQueue.length - 1) {
            isManualPlay = false;
            playSongFromQueue(currentQueueIndex + 1);
        } else if (currentQueueIndex === playbackQueue.length - 1 && repeatMode === 1) {
            isManualPlay = false;
            playSongFromQueue(0);
        }
    }
};

let prevRestartTimeout = null;

document.getElementById('prev-btn').onclick = () => {
    temporarilySuppressTooltip(document.getElementById('prev-btn'));
    if (playbackQueue.length === 0) return;

    const PREV_RESTART_THRESHOLD = 3;

    if (currentQueueIndex >= 0 && audioElement.currentTime > PREV_RESTART_THRESHOLD) {
        if (prevRestartTimeout) {
            clearTimeout(prevRestartTimeout);
        }

        audioElement.currentTime = 0;
        audioElement.pause();

        prevRestartTimeout = setTimeout(() => {
            audioElement.play();
            prevRestartTimeout = null;

            if (lastPlayedSong) {
                lastPlayedSongStartTime = Date.now();
            }
        }, 500);

        return;
    }

    saveCurrentPlaybackState();

    let prevIndex = currentQueueIndex - 1;

    if (prevIndex >= 0) {
        playSongFromQueue(prevIndex);
    } else if (repeatMode === 1) {
        playSongFromQueue(playbackQueue.length - 1);
    }
};

// ==============================================================================
// AUDIO EVENT HANDLERS
// ==============================================================================
function refreshCurrentRowIndicator() {
    const row = document.querySelector('.song-item.playing');
    document.querySelectorAll('.left-panel-main-item.playing').forEach((leftPlaying) => {
        leftPlaying.classList.toggle('paused', audioElement.paused);
    });
    if (!row) return;
    const cell = row.querySelector('.song-number-item');
    if (!cell) return;
    if (audioElement.paused) {
        row.classList.add('paused-song');
        const idxStr = cell.getAttribute('data-song-index');
        const idx = parseInt(idxStr, 10);
        cell.innerHTML = !isNaN(idx) ? String(idx + 1) : '';
    } else {
        row.classList.remove('paused-song');
        paintEqOnNumberCell(row);
    }
}

function handleNumberCellClick(songId, listId, index) {
    const clickedSong = SONGS_DATA.find((s) => s.id === songId);
    if (!clickedSong) return;

    const currentItem =
        currentQueueIndex >= 0 && playbackQueue[currentQueueIndex] ? playbackQueue[currentQueueIndex] : null;
    const currentSong = currentItem ? currentItem.song || currentItem : null;
    const currentListId = currentItem ? currentItem.listId || 'all-songs' : null;

    const isSameSong =
        !!currentSong && !!audioElement.src && currentSong.url === clickedSong.url && currentSong.id === clickedSong.id;

    const isSameList = listId === null || listId === undefined || currentListId === listId;

    if (isSameSong && isSameList) {
        if (audioElement.paused) {
            audioElement.play();
        } else {
            audioElement.pause();
        }
        return;
    }

    playSongFromList(songId, listId, index);
}

function syncPlayPauseButtons() {
    const isPaused = audioElement.paused;

    if (window.electronAPI && window.electronAPI.updateThumbarPlayState) {
        window.electronAPI.updateThumbarPlayState(!isPaused);
    }

    if (playButton) {
        playButton.innerHTML = isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
        playButton.setAttribute('aria-label', isPaused ? 'Play' : 'Pause');
        playButton.setAttribute('title', isPaused ? 'Play' : 'Pause');
    }

    updateSubheroPlayButton(!isPaused);

    document.querySelectorAll('.left-panel-cover-play-btn').forEach((btn) => {
        const btnViewId = btn.getAttribute('data-view');
        const currentPlayingViewId =
            currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]
                ? playbackQueue[currentQueueIndex].listId || 'all-songs'
                : null;
        const shouldPause = currentPlayingViewId && btnViewId === currentPlayingViewId && !isPaused;
        btn.classList.toggle('is-pause', shouldPause);
        btn.setAttribute('aria-label', shouldPause ? 'Pause' : 'Play');
    });

    refreshCurrentRowIndicator();
}

audioElement.onplay = () => {
    if (currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
        lastPlayedSong = playbackQueue[currentQueueIndex];
        lastPlayedSongStartTime = Date.now();
    }
    syncPlayPauseButtons();
};

audioElement.onpause = () => {
    syncPlayPauseButtons();
};

if (window.electronAPI && window.electronAPI.onThumbarPrev) {
    window.electronAPI.onThumbarPrev(() => {
        const prevBtn = document.getElementById('prev-btn');
        if (prevBtn) prevBtn.click();
    });
    window.electronAPI.onThumbarPlayPause(() => {
        if (!audioElement.src) return;
        if (audioElement.paused) {
            audioElement.play();
        } else {
            audioElement.pause();
        }
    });
    window.electronAPI.onThumbarNext(() => {
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) nextBtn.click();
    });
}

let isWindowMaximized = false;
let maximizeIconDebounce = null;

if (window.electronAPI && window.electronAPI.onWindowMaximize) {
    window.electronAPI.onWindowMaximize((isMax) => {
        if (maximizeIconDebounce) {
            clearTimeout(maximizeIconDebounce);
            maximizeIconDebounce = null;
        }
        maximizeIconDebounce = setTimeout(() => {
            maximizeIconDebounce = null;
            isWindowMaximized = isMax;
            updateMaximizeIcon(isMax);
        }, 80);
    });
    if (window.electronAPI.getWindowMaximized) {
        window.electronAPI.getWindowMaximized().then((isMax) => {
            isWindowMaximized = isMax;
            updateMaximizeIcon(isMax);
        });
    }
}

audioElement.onended = () => {
    saveCurrentPlaybackState();

    if (repeatFunctionalityActive && repeatMode === 2) {
        if (currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
            saveToRecentlyPlayed(playbackQueue[currentQueueIndex]);
        }

        if (currentView === 'recent') {
            renderRecentlyPlayed();
        }

        const recentPanel = document.getElementById('recently-played-content');
        if (recentPanel && recentPanel.classList.contains('active')) {
            renderPortableRecentlyPlayed();
        }

        audioElement.currentTime = 0;
        audioElement.play();

        if (currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
            lastPlayedSong = playbackQueue[currentQueueIndex];
            lastPlayedSongStartTime = Date.now();
        }

        if (currentQueueIndex >= 0 && playbackQueue[currentQueueIndex]) {
            const song = playbackQueue[currentQueueIndex];
            updatePlayingHighlight(song.id, currentView, null);
            updateAlbumArt();
        }
        return;
    }

    const recentPanel = document.getElementById('recently-played-content');
    if (recentPanel && recentPanel.classList.contains('active')) {
        renderPortableRecentlyPlayed();
    }

    if (playbackQueue.length === 0) return;

    if (isShuffled) {
        if (currentQueueIndex < playbackQueue.length - 1) {
            playSongFromQueue(currentQueueIndex + 1);
        } else {
            const nextSong = getNextShuffledSong();
            if (nextSong) {
                playbackQueue.push(nextSong);
                playSongFromQueue(currentQueueIndex + 1);
            } else {
                audioElement.pause();
                audioElement.src = '';
                currentQueueIndex = -1;
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                updateSubheroPlayButton(isCurrentViewPlaying());
                playButton.setAttribute('title', 'Play');
            }
        }
    } else {
        if (currentQueueIndex < playbackQueue.length - 1) {
            playSongFromQueue(currentQueueIndex + 1);
        } else if (currentQueueIndex === playbackQueue.length - 1 && repeatMode === 1) {
            playSongFromQueue(0);
        } else {
            audioElement.pause();
            audioElement.src = '';
            currentQueueIndex = -1;
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            updateSubheroPlayButton(isCurrentViewPlaying());
            document.querySelector('.player-song-info').classList.remove('has-song');
            document.getElementById('player-title').textContent = 'No song selected';
            document.getElementById('player-artist').innerHTML = '—';
            const stoppingRow = document.querySelector('#song-list .song-item.playing');
            if (stoppingRow) {
                stoppingRow.classList.remove('playing');
                stoppingRow.classList.remove('paused-song');
                unpaintEqOnNumberCell(stoppingRow);
            }
            playbackHistoryStack = [];
            historyNavigationIndex = -1;

            const lyricsToggleBtnEl = document.getElementById('lyrics-toggle-btn');
            if (lyricsToggleBtnEl) {
                lyricsToggleBtnEl.disabled = true;
                lyricsToggleBtnEl.setAttribute('data-original-title', 'Lyrics');
                lyricsToggleBtnEl.classList.remove('active');
            }

            if (currentView === 'lyrics') {
                if (typeof teardownLyricsView === 'function') {
                    teardownLyricsView();
                }
                document.body.classList.remove('in-lyrics-view');
                switchView('all-songs');
            }
        }
    }
};

audioElement.ontimeupdate = () => {
    if (audioElement.duration) {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        document.getElementById('progress-bar').style.width = progress + '%';
        document.getElementById('progress-knob').style.left = progress + '%';

        updateTimeDisplay();

        if (totalTimeDisplay.textContent === '0:00') {
            totalTimeDisplay.textContent = formatTime(audioElement.duration);
        }
    }

    if (currentView === 'lyrics' && syncedLyricsState.entries) {
        updateSyncedLyricsHighlight(audioElement.currentTime);
    }
};

audioElement.onloadedmetadata = () => {
    if (audioElement.duration) {
        totalTimeDisplay.textContent = formatTime(audioElement.duration);
    }
};

// ==============================================================================
// PROGRESS BAR SEEKING
// ==============================================================================
let isSeeking = false;

const progressContainer = document.querySelector('.progress-container');
if (progressContainer) {
    progressContainer.addEventListener('mouseenter', showProgressTooltip);
    progressContainer.addEventListener('mouseleave', hideProgressTooltip);
}
let seekAnimationId = null;

function startSeek(e) {
    if (!audioElement.duration) return;

    isSeeking = true;
    wasPlaying = !audioElement.paused;

    if (wasPlaying) {
        audioElement.pause();
    }

    window.originalTimeUpdate = audioElement.ontimeupdate;
    audioElement.ontimeupdate = null;

    e.currentTarget.classList.add('dragging');
    document.body.classList.add('dragging-progress');
    document.body.classList.add('no-select');

    updateSeekPosition(e.clientX);
    updateProgressTooltip(e);

    document.addEventListener('mousemove', doSeekGlobal);
    document.addEventListener('mouseup', stopSeekGlobal);
}

function doSeekGlobal(e) {
    if (!isSeeking) return;

    if (seekAnimationId) {
        cancelAnimationFrame(seekAnimationId);
    }

    seekAnimationId = requestAnimationFrame(() => {
        updateSeekPosition(e.clientX);
        updateProgressTooltip(e);
    });
}

function stopSeekGlobal() {
    isSeeking = false;

    if (seekAnimationId) {
        cancelAnimationFrame(seekAnimationId);
        seekAnimationId = null;
    }

    if (progressTooltip) {
        progressTooltip.remove();
        progressTooltip = null;
    }

    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.classList.remove('dragging');
    }
    document.body.classList.remove('dragging-progress');
    document.body.classList.remove('no-select');

    document.removeEventListener('mousemove', doSeekGlobal);
    document.removeEventListener('mouseup', stopSeekGlobal);

    if (window.originalTimeUpdate) {
        audioElement.ontimeupdate = window.originalTimeUpdate;
        window.originalTimeUpdate = null;
    }

    if (wasPlaying) {
        audioElement.play().catch((e) => {});
    }
    wasPlaying = false;
}

function updateSeekPosition(clientX) {
    if (!audioElement.duration) return;

    const progressContainer = document.querySelector('.progress-container');
    if (!progressContainer) return;

    const rect = progressContainer.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    const progress = x / rect.width;

    audioElement.currentTime = progress * audioElement.duration;

    const progressPercent = progress * 100 + '%';
    document.getElementById('progress-bar').style.width = progressPercent;
    document.getElementById('progress-knob').style.left = progressPercent;

    updateTimeDisplay();
}

let progressTooltip = null;

function createProgressTooltip() {
    const el = document.createElement('div');
    el.className = 'custom-tooltip progress-tooltip';
    return el;
}

function updateProgressTooltip(e) {
    const progressContainer = document.querySelector('.progress-container');
    if (!progressContainer) return;

    const rect = progressContainer.getBoundingClientRect();
    let x = e.clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    const progress = x / rect.width;
    const time = audioElement.duration ? progress * audioElement.duration : 0;

    if (!progressTooltip) {
        progressTooltip = createProgressTooltip();
        document.body.appendChild(progressTooltip);
    }

    progressTooltip.textContent = formatTime(time);

    let left = rect.left + x;
    let top = rect.top - 2;

    const tooltipRect = progressTooltip.getBoundingClientRect();

    if (left < rect.left) {
        left = rect.left;
    }
    if (left > rect.right) {
        left = rect.right;
    }
    if (top - tooltipRect.height < 6) {
        top = rect.bottom + 6;
        progressTooltip.style.transform = 'translate(-50%, 0)';
    } else {
        progressTooltip.style.transform = 'translate(-50%, -100%)';
    }

    progressTooltip.style.left = left + 'px';
    progressTooltip.style.top = top + 'px';
}

function showProgressTooltip() {
    const progressContainer = document.querySelector('.progress-container');
    if (!progressContainer) return;
    progressContainer.addEventListener('mousemove', updateProgressTooltip);
}

function hideProgressTooltip() {
    if (isSeeking) return;
    if (progressTooltip) {
        progressTooltip.remove();
        progressTooltip = null;
    }
}

// ==============================================================================
// VOLUME CONTROL
// ==============================================================================
function setVolume(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width;
    updateVolume(progress);
}

function updateVolume(percentage) {
    audioElement.volume = Math.max(0, Math.min(1, percentage));
    const volumePercent = audioElement.volume * 100 + '%';
    document.getElementById('volume-fill').style.width = volumePercent;
    document.getElementById('volume-knob').style.left = volumePercent;

    const icon = document.getElementById('volume-icon');
    if (audioElement.volume === 0) {
        icon.innerHTML = '<i class="fas fa-volume-mute"></i>';
        icon.setAttribute('aria-label', 'Unmute');
        icon.setAttribute('title', 'Unmute');
    } else {
        icon.innerHTML = '<i class="fas fa-volume-up"></i>';
        icon.setAttribute('aria-label', 'Mute');
        icon.setAttribute('title', 'Mute');
    }
}

function toggleMute() {
    if (audioElement.volume > 0) {
        window.lastVolume = audioElement.volume;
        audioElement.volume = 0;
        updateVolume(0);
    } else {
        audioElement.volume = window.lastVolume || 0.5;
        updateVolume(audioElement.volume);
    }
}

const volumeSlider = document.getElementById('volume-slider');
let isDraggingVolume = false;

volumeSlider.addEventListener('mousedown', (e) => {
    isDraggingVolume = true;
    document.body.classList.add('no-select');
    volumeSlider.classList.add('dragging');

    const rect = volumeSlider.getBoundingClientRect();
    const progress = (e.clientX - rect.left) / rect.width;
    updateVolume(progress);
});

document.addEventListener('mousemove', (e) => {
    if (isDraggingVolume) {
        const rect = volumeSlider.getBoundingClientRect();
        const progress = (e.clientX - rect.left) / rect.width;
        updateVolume(progress);
    }
});

document.addEventListener('mouseup', () => {
    if (isDraggingVolume) {
        document.body.classList.remove('no-select');
        volumeSlider.classList.remove('dragging');
    }
    isDraggingVolume = false;
});
