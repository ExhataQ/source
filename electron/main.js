const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

app.disableHardwareAcceleration();

let mainWindow = null;
let loadingWindow = null;

const storePath = path.join(__dirname, 'window-state.json');

function loadWindowState() {
    try {
        if (fs.existsSync(storePath)) {
            const data = fs.readFileSync(storePath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {}
    return {
        width: 1200,
        height: 800,
        x: undefined,
        y: undefined,
        isMaximized: false
    };
}

function saveWindowState() {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();
    const state = {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: isMaximized
    };
    try {
        fs.writeFileSync(storePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {}
}

function createWindow() {
    const windowState = loadWindowState();

    mainWindow = new BrowserWindow({
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#000000',
        frame: false,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'MusicPlayerOutput', 'music_player.html'));

    mainWindow.setThumbarButtons([
        {
            tooltip: 'Previous',
            icon: path.join(__dirname, 'icons', 'prev.png'),
            click: () => {
                if (mainWindow) mainWindow.webContents.send('thumbar-prev');
            }
        },
        {
            tooltip: 'Play/Pause',
            icon: path.join(__dirname, 'icons', 'play.png'),
            click: () => {
                if (mainWindow) mainWindow.webContents.send('thumbar-playpause');
            }
        },
        {
            tooltip: 'Next',
            icon: path.join(__dirname, 'icons', 'next.png'),
            click: () => {
                if (mainWindow) mainWindow.webContents.send('thumbar-next');
            }
        }
    ]);

    if (windowState.isMaximized) {
        mainWindow.maximize();
    } else if (windowState.x === undefined && windowState.y === undefined) {
        mainWindow.center();
    }

    mainWindow.setAlwaysOnTop(true);
    setTimeout(() => {
        mainWindow.setAlwaysOnTop(false);
    }, 1000);

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(`
            const headerR = document.querySelector('.headerR');
            if (headerR) {
                headerR.style.webkitAppRegion = 'drag';
                headerR.style.userSelect = 'none';
                const noDragElements = headerR.querySelectorAll('button, input, .search-box, .notification-panel-btn, .notification-panel');
                noDragElements.forEach(el => {
                    el.style.webkitAppRegion = 'no-drag';
                });
            }
        `);
    });

    mainWindow.on('move', saveWindowState);
    mainWindow.on('close', saveWindowState);

    mainWindow.on('maximize', () => {
        if (mainWindow) mainWindow.webContents.send('window-maximized', true);
    });
    mainWindow.on('unmaximize', () => {
        if (mainWindow) mainWindow.webContents.send('window-maximized', false);
    });

    let resizeTimeout = null;
    mainWindow.on('resize', () => {
        saveWindowState();
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (mainWindow) {
                mainWindow.webContents.executeJavaScript(`
                    if (typeof recalcLayoutWidths === 'function') {
                    }
                `);
            }
        }, 150);
    });
}

function showLoadingWindow() {
    if (loadingWindow) return;
    const loadingHtml = `
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background: #121212;
                    color: #fff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    -webkit-app-region: drag;
                    user-select: none;
                }
                .progress-circle {
                    width: 80px;
                    height: 80px;
                    position: relative;
                    margin-bottom: 16px;
                }
                .progress-circle svg {
                    transform: rotate(-90deg);
                }
                .progress-circle .bg {
                    fill: none;
                    stroke: #333;
                    stroke-width: 4;
                }
                .progress-circle .fill {
                    fill: none;
                    stroke: #1db954;
                    stroke-width: 4;
                    stroke-linecap: round;
                    transition: stroke-dashoffset 0.3s ease;
                }
                .progress-circle .text {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 20px;
                    font-weight: 700;
                }
                .title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
                .step { font-size: 11px; color: #b3b3b3; }
            </style>
        </head>
        <body>
            <div class="progress-circle">
                <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle class="bg" cx="40" cy="40" r="34"/>
                    <circle class="fill" id="progress-fill" cx="40" cy="40" r="34"
                        stroke-dasharray="213.6" stroke-dashoffset="213.6"/>
                </svg>
                <div class="text" id="progress-text">0%</div>
            </div>
            <div class="title" id="step-title">Preparing...</div>
            <div class="step" id="step-count"></div>
        </body>
        </html>
    `;
    loadingWindow = new BrowserWindow({
        width: 360,
        height: 240,
        frame: false,
        transparent: false,
        backgroundColor: '#121212',
        resizable: false,
        parent: mainWindow,
        modal: true,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    loadingWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(loadingHtml));
    loadingWindow.center();
}

function updateLoadingProgress(percent, stepTitle, stepCount) {
    if (!loadingWindow) return;
    const circumference = 213.6;
    const offset = circumference - (percent / 100) * circumference;
    const js = `
        var fill = document.getElementById('progress-fill');
        var text = document.getElementById('progress-text');
        var title = document.getElementById('step-title');
        var count = document.getElementById('step-count');
        var currentStep = title ? title.textContent : '';
        var newStep = '${stepTitle.replace(/'/g, "\\'")}';
        if (fill) {
            if (currentStep && newStep !== currentStep) {
                fill.style.transition = 'none';
                fill.style.strokeDashoffset = '${circumference}';
                fill.offsetHeight;
                fill.style.transition = 'stroke-dashoffset 0.3s ease';
                setTimeout(function() {
                    fill.style.strokeDashoffset = '${offset}';
                }, 50);
            } else {
                fill.style.strokeDashoffset = '${offset}';
            }
        }
        if (text) text.textContent = '${percent}%';
        if (title) title.textContent = newStep;
        if (count) count.textContent = '${(stepCount || '').replace(/'/g, "\\'")}';
    `;
    loadingWindow.webContents.executeJavaScript(js).catch(() => {});
}

function hideLoadingWindow() {
    if (loadingWindow) {
        loadingWindow.close();
        loadingWindow = null;
    }
}

ipcMain.handle('import-dropped-files', async (event, filePaths, targetView) => {
    const scanScriptPath = path.join(__dirname, 'scan-folder.js');
    const outputDir = path.join(__dirname, 'MusicPlayerOutput');
    const coversFolder = path.join(outputDir, 'covers');

    if (!fs.existsSync(coversFolder))
        fs.mkdirSync(coversFolder, {
            recursive: true
        });

    const { fork } = require('child_process');

    return new Promise((resolve) => {
        const child = fork(scanScriptPath, ['__files__', outputDir, 'metadata-only', ...filePaths], {
            silent: true,
            env: {
                ...process.env,
                ELECTRON_RUN_AS_NODE: '1'
            }
        });

        let resultData = '';
        child.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                try {
                    let cleanResult = resultData;
                    cleanResult = cleanResult.replace(/[\r\n].*?\|[█░]*\|[^\n]*/g, '');
                    cleanResult = cleanResult.replace(/[\r\n]+\s*$/g, '').trim();
                    const jsonStart = cleanResult.indexOf('[');
                    const jsonEnd = cleanResult.lastIndexOf(']') + 1;
                    const jsonOnly =
                        jsonStart >= 0 && jsonEnd > jsonStart ? cleanResult.substring(jsonStart, jsonEnd) : cleanResult;

                    const newSongs = JSON.parse(jsonOnly);

                    if (newSongs && newSongs.length > 0) {
                        const existingJsPath = path.join(outputDir, 'player.js');

                        if (fs.existsSync(existingJsPath)) {
                            const existingContent = fs.readFileSync(existingJsPath, 'utf-8');
                            const existingMatch = existingContent.match(/const SONGS_DATA = (\[.*?\]);/s);
                            if (existingMatch) {
                                const existingSongs = JSON.parse(existingMatch[1]);
                                const existingUrls = new Set(existingSongs.map((s) => s.url));
                                const uniqueNewSongs = newSongs.filter((s) => !existingUrls.has(s.url));

                                uniqueNewSongs.forEach((s, i) => {
                                    s.id = existingSongs.length + i;
                                });

                                const merged = [...existingSongs, ...uniqueNewSongs];
                                const newJsContent = existingContent.replace(
                                    /const SONGS_DATA = \[.*?\];/s,
                                    'const SONGS_DATA = ' + JSON.stringify(merged) + ';'
                                );
                                fs.writeFileSync(existingJsPath, newJsContent, 'utf-8');

                                resolve({
                                    success: true,
                                    songs: merged,
                                    newSongs: uniqueNewSongs
                                });
                                return;
                            }
                        }
                    }
                    resolve({
                        success: false,
                        error: 'No valid songs found'
                    });
                } catch (e) {
                    resolve({
                        success: false,
                        error: 'Parse error: ' + e.message
                    });
                }
            } else {
                resolve({
                    success: false,
                    error: 'Scan failed'
                });
            }
        });

        child.on('error', (err) => {
            resolve({
                success: false,
                error: err.message
            });
        });
    });
});

ipcMain.handle('download-and-scan', async (event, url, isTemp) => {
    let savedDownloadFolder = null;
    try {
        const cfgPath = path.join(__dirname, 'download-folder-config.json');
        if (fs.existsSync(cfgPath)) {
            const data = fs.readFileSync(cfgPath, 'utf-8');
            const parsed = JSON.parse(data);
            if (parsed.downloadFolder) savedDownloadFolder = parsed.downloadFolder;
        }
    } catch (e) {}
    const downloadFolder = isTemp
        ? path.join(require('os').tmpdir(), 'music-player-temp')
        : savedDownloadFolder || require('electron').app.getPath('downloads');

    if (isTemp && !fs.existsSync(downloadFolder))
        fs.mkdirSync(downloadFolder, {
            recursive: true
        });

    const rawFileName = url.split('/').pop().split('?')[0] || 'downloaded_audio.mp3';
    let fileName = decodeURIComponent(rawFileName);
    let filePath = path.join(downloadFolder, fileName);
    let counter = 1;
    while (fs.existsSync(filePath)) {
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        fileName = `${base} (${counter})${ext}`;
        filePath = path.join(downloadFolder, fileName);
        counter++;
    }

    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;

        protocol
            .get(url, (response) => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    resolve({
                        success: false,
                        error: 'redirect not supported'
                    });
                    return;
                }

                const totalSize = parseInt(response.headers['content-length'] || '0', 10);
                let downloadedSize = 0;

                const fileStream = fs.createWriteStream(filePath);

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    if (totalSize > 0 && mainWindow) {
                        const percent = Math.round((downloadedSize / totalSize) * 100);
                        mainWindow.webContents.executeJavaScript(`
                        if (typeof updateDownloadNotification === 'function') {
                            updateDownloadNotification(${percent}, 'Downloading...');
                        }
                    `);
                    }
                });

                response.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close(() => {
                        const scanScriptPath = path.join(__dirname, 'scan-folder.js');
                        const { fork } = require('child_process');
                        const child = fork(
                            scanScriptPath,
                            [downloadFolder, path.join(__dirname, 'MusicPlayerOutput'), 'metadata-only', filePath],
                            {
                                silent: true,
                                env: {
                                    ...process.env,
                                    ELECTRON_RUN_AS_NODE: '1'
                                }
                            }
                        );

                        let resultData = '';
                        child.stdout.on('data', (data) => {
                            resultData += data.toString();
                        });

                        child.on('close', (code) => {
                            if (code === 0) {
                                try {
                                    let cleanResult = resultData;
                                    cleanResult = cleanResult.replace(/[\r\n].*?\|[█░]*\|[^\n]*/g, '');
                                    cleanResult = cleanResult.replace(/[\r\n]+\s*$/g, '').trim();
                                    const jsonStart = cleanResult.indexOf('[');
                                    const jsonEnd = cleanResult.lastIndexOf(']') + 1;
                                    const jsonOnly =
                                        jsonStart >= 0 && jsonEnd > jsonStart
                                            ? cleanResult.substring(jsonStart, jsonEnd)
                                            : cleanResult;

                                    const newSongs = JSON.parse(jsonOnly);

                                    if (newSongs && newSongs.length > 0) {
                                        const existingJsPath = path.join(__dirname, 'MusicPlayerOutput', 'player.js');

                                        if (fs.existsSync(existingJsPath)) {
                                            const existingContent = fs.readFileSync(existingJsPath, 'utf-8');
                                            const existingMatch =
                                                existingContent.match(/const SONGS_DATA = (\[.*?\]);/s);
                                            if (existingMatch) {
                                                const existingSongs = JSON.parse(existingMatch[1]);
                                                const existingIds = new Set(existingSongs.map((s) => s.url));
                                                const uniqueNewSongs = newSongs.filter((s) => !existingIds.has(s.url));

                                                uniqueNewSongs.forEach((s, i) => {
                                                    s.id = existingSongs.length + i;
                                                });

                                                const merged = [...uniqueNewSongs, ...existingSongs];
                                                const newJsContent = existingContent.replace(
                                                    /const SONGS_DATA = \[.*?\];/s,
                                                    'const SONGS_DATA = ' + JSON.stringify(merged) + ';'
                                                );
                                                fs.writeFileSync(existingJsPath, newJsContent, 'utf-8');

                                                resolve({
                                                    success: true,
                                                    songs: merged,
                                                    newSongs: uniqueNewSongs,
                                                    filePath: filePath,
                                                    isTemp: isTemp
                                                });
                                                return;
                                            }
                                        }
                                    }
                                } catch (e) {
                                    resolve({
                                        success: false,
                                        error: 'Parse error: ' + e.message
                                    });
                                    return;
                                }
                            }

                            resolve({
                                success: false,
                                error: 'Failed to scan file'
                            });
                        });
                    });
                });

                fileStream.on('error', (err) => {
                    resolve({
                        success: false,
                        error: err.message
                    });
                });
            })
            .on('error', (err) => {
                resolve({
                    success: false,
                    error: err.message
                });
            });
    });
});

ipcMain.handle('get-music-folders', async () => {
    const configPath = path.join(__dirname, 'music-folders-config.json');
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf-8');
            const parsed = JSON.parse(data);
            return parsed.folders || [];
        }
    } catch (e) {}
    return [];
});

ipcMain.handle('add-music-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Add Music Folder',
        properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
        return {
            success: false,
            reason: 'cancelled'
        };
    }

    let newFolder = result.filePaths[0];
    newFolder = newFolder.replace(/\\\\/g, '\\');

    const configPath = path.join(__dirname, 'music-folders-config.json');

    let folders = [];
    let folderMetadata = {};

    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf-8');
            const parsed = JSON.parse(data);
            folders = parsed.folders || [];
            folderMetadata = parsed.folderMetadata || {};
            folders = folders.map((f) => f.replace(/\\\\/g, '\\'));
        }
    } catch (e) {}

    const isDuplicate = folders.some((f) => f.toLowerCase() === newFolder.toLowerCase());
    if (isDuplicate) {
        return {
            success: false,
            reason: 'duplicate'
        };
    }

    folders.push(newFolder);
    folderMetadata[newFolder] = {
        addedTime: new Date().toISOString(),
        songCount: 0
    };

    fs.writeFileSync(
        configPath,
        JSON.stringify(
            {
                folders: folders,
                folderMetadata: folderMetadata
            },
            null,
            2
        ),
        'utf-8'
    );

    return {
        success: true,
        folders: folders
    };
});

ipcMain.handle('remove-music-folder', async (event, folderPath) => {
    const configPath = path.join(__dirname, 'music-folders-config.json');

    let folders = [];

    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf-8');
            const parsed = JSON.parse(data);
            folders = parsed.folders || [];
        } else {
            return {
                success: true,
                folders: []
            };
        }
    } catch (e) {}

    const beforeCount = folders.length;
    const normalizedTarget = path.normalize(folderPath);

    folders = folders.filter((f) => {
        const normalizedFolder = path.normalize(f);
        return normalizedFolder !== normalizedTarget;
    });

    if (beforeCount !== folders.length) {
        fs.writeFileSync(
            configPath,
            JSON.stringify(
                {
                    folders: folders
                },
                null,
                2
            ),
            'utf-8'
        );
    }

    return {
        success: true,
        folders: folders
    };
});

ipcMain.handle('get-folder-stats', async (event, folderPath) => {
    const configPath = path.join(__dirname, 'music-folders-config.json');
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf-8');
            const parsed = JSON.parse(data);
            const folderMeta = parsed.folderMetadata || {};
            return (
                folderMeta[folderPath] || {
                    songCount: 0,
                    addedTime: null
                }
            );
        }
    } catch (e) {}
    return {
        songCount: 0,
        addedTime: null
    };
});

ipcMain.handle('rebuild-from-folders', async () => {
    const configPath = path.join(__dirname, 'music-folders-config.json');

    let folders = [];

    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf-8');
            const parsed = JSON.parse(data);
            folders = parsed.folders || [];
        }
    } catch (e) {}

    if (folders.length === 0) {
        return {
            success: false,
            reason: 'no-folders'
        };
    }

    const scanScriptPath = path.join(__dirname, 'scan-folder.js');
    const outputDir = path.join(__dirname, 'MusicPlayerOutput');

    showLoadingWindow();
    updateLoadingProgress(0, 'Starting scan...', '');

    return new Promise((resolve) => {
        const { fork } = require('child_process');
        const child = fork(scanScriptPath, ['__rebuild__', outputDir, 'rebuild-all'], {
            silent: true,
            env: {
                ...process.env,
                ELECTRON_RUN_AS_NODE: '1'
            }
        });

        let stdoutBuffer = '';
        let resultData = '';

        child.stdout.on('data', (data) => {
            const text = data.toString();
            stdoutBuffer += text;

            const lines = stdoutBuffer.split('\n');
            stdoutBuffer = lines.pop() || '';
            for (const line of lines) {
                const progressMatch = line.match(/\|█+\|?\s*(\d+)%/);
                if (progressMatch) {
                    const percent = parseInt(progressMatch[1]);
                    let stepTitle = 'Processing...';
                    if (line.includes('Extracting covers')) stepTitle = 'Extracting Covers';
                    if (line.includes('Scanning songs')) stepTitle = 'Scanning Songs';
                    if (line.includes('GENERATING')) stepTitle = 'Generating Player';
                    updateLoadingProgress(percent, stepTitle, '');
                }
            }

            resultData += text;
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            const lines = text.split('\n');
            for (const line of lines) {
                const match = line.match(/^PROGRESS:(\d+):(.+)$/);
                if (match) {
                    const percent = parseInt(match[1]);
                    const prefix = match[2];
                    let stepTitle = 'Processing...';
                    if (prefix.includes('Extracting covers')) stepTitle = 'Extracting Covers';
                    if (prefix.includes('Scanning songs')) stepTitle = 'Scanning Songs';
                    if (prefix.includes('GENERATING')) stepTitle = 'Generating Player';
                    updateLoadingProgress(percent, stepTitle, '');
                }
            }
        });

        child.on('close', (code) => {
            hideLoadingWindow();

            if (code !== 0) {
                resolve({
                    success: false,
                    reason: 'scan-error',
                    code: code
                });
                return;
            }

            try {
                let jsonStr = resultData.trim();
                const jsonStart = jsonStr.indexOf('{');
                const jsonEnd = jsonStr.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1) {
                    jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
                }

                const parsed = JSON.parse(jsonStr);

                if (parsed.success && parsed.songs) {
                    const jsPath = path.join(outputDir, 'player.js');
                    if (fs.existsSync(jsPath)) {
                        let jsContent = fs.readFileSync(jsPath, 'utf-8');
                        const newJsContent = jsContent.replace(
                            /const SONGS_DATA = \[.*?\];/s,
                            'const SONGS_DATA = ' + JSON.stringify(parsed.songs) + ';'
                        );
                        fs.writeFileSync(jsPath, newJsContent, 'utf-8');
                        // Update folderMetadata with song counts
                        const configData = fs.readFileSync(configPath, 'utf-8');
                        const configParsed = JSON.parse(configData);
                        const folderMetadata = configParsed.folderMetadata || {};

                        for (const folder of folders) {
                            const folderSongCount = parsed.songs.filter((song) => {
                                const filePath = song.url.replace('file:///', '').replace(/\//g, '\\');
                                const normalizedFolder = folder.replace(/\\\\/g, '\\');
                                return filePath.toLowerCase().startsWith(normalizedFolder.toLowerCase());
                            }).length;

                            if (folderMetadata[folder]) {
                                folderMetadata[folder].songCount = folderSongCount;
                            } else {
                                folderMetadata[folder] = {
                                    addedTime: new Date().toISOString(),
                                    songCount: folderSongCount
                                };
                            }
                        }

                        fs.writeFileSync(
                            configPath,
                            JSON.stringify(
                                {
                                    folders: folders,
                                    folderMetadata: folderMetadata
                                },
                                null,
                                2
                            ),
                            'utf-8'
                        );
                        resolve({
                            success: true,
                            songs: parsed.songs
                        });
                    } else {
                        resolve({
                            success: false,
                            reason: 'file-not-found'
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        reason: 'no-songs',
                        error: parsed.error
                    });
                }
            } catch (err) {
                resolve({
                    success: false,
                    reason: 'parse-error',
                    error: err.message
                });
            }
        });

        child.on('error', (err) => {
            hideLoadingWindow();
            resolve({
                success: false,
                reason: 'spawn-error',
                error: err.message
            });
        });
    });
});

ipcMain.handle('change-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select New Music Folder',
        properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
        return {
            success: false,
            reason: 'cancelled'
        };
    }

    const selectedFolder = result.filePaths[0];
    const scanScriptPath = path.join(__dirname, 'scan-folder.js');
    const outputDir = path.join(__dirname, 'MusicPlayerOutput');

    showLoadingWindow();
    updateLoadingProgress(0, 'Starting scan...', '');

    return new Promise((resolve) => {
        const { fork } = require('child_process');
        const child = fork(scanScriptPath, [selectedFolder, outputDir], {
            silent: true,
            env: {
                ...process.env,
                ELECTRON_RUN_AS_NODE: '1'
            }
        });

        let stdoutBuffer = '';
        let resultData = '';

        child.stdout.on('data', (data) => {
            const text = data.toString();
            stdoutBuffer += text;

            const lines = stdoutBuffer.split('\n');
            stdoutBuffer = lines.pop() || '';
            for (const line of lines) {
                const progressMatch = line.match(/\|█+\|?\s*(\d+)%/);
                if (progressMatch) {
                    const percent = parseInt(progressMatch[1]);
                    let stepTitle = 'Processing...';
                    if (line.includes('Extracting covers')) stepTitle = 'Extracting Covers';
                    if (line.includes('Scanning songs')) stepTitle = 'Scanning Songs';
                    if (line.includes('GENERATING')) stepTitle = 'Generating Player';
                    if (!updateLoadingProgress.lastStep) updateLoadingProgress.lastStep = '';
                    if (stepTitle !== updateLoadingProgress.lastStep) {
                        updateLoadingProgress(0, stepTitle, '');
                        updateLoadingProgress.lastStep = stepTitle;
                    }
                    updateLoadingProgress(percent, stepTitle, '');
                }
            }

            resultData += text;
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            const lines = text.split('\n');
            for (const line of lines) {
                const match = line.match(/^PROGRESS:(\d+):(.+)$/);
                if (match) {
                    const percent = parseInt(match[1]);
                    const prefix = match[2];
                    let stepTitle = 'Processing...';
                    if (prefix.includes('Extracting covers')) stepTitle = 'Extracting Covers';
                    if (prefix.includes('Scanning songs')) stepTitle = 'Scanning Songs';
                    if (prefix.includes('GENERATING')) stepTitle = 'Generating Player';
                    if (!updateLoadingProgress.lastStep) updateLoadingProgress.lastStep = '';
                    if (stepTitle !== updateLoadingProgress.lastStep) {
                        updateLoadingProgress(0, stepTitle, '');
                        updateLoadingProgress.lastStep = stepTitle;
                    }
                    updateLoadingProgress(percent, stepTitle, '');
                }
            }
        });

        child.on('close', (code) => {
            hideLoadingWindow();

            if (code !== 0) {
                resolve({
                    success: false,
                    reason: 'scan-error'
                });
                return;
            }

            try {
                const jsonMatch = resultData.match(/\{.*\}/s);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.success) {
                        const jsPath = path.join(outputDir, 'player.js');
                        const jsContent = fs.readFileSync(jsPath, 'utf-8');
                        const songsMatch = jsContent.match(/const SONGS_DATA = (\[.*?\]);/s);
                        if (songsMatch) {
                            const songsData = JSON.parse(songsMatch[1]);
                            resolve({
                                success: true,
                                songs: songsData
                            });
                        } else {
                            resolve({
                                success: false,
                                reason: 'parse-error'
                            });
                        }
                    } else {
                        resolve({
                            success: false,
                            reason: 'scan-error',
                            error: parsed.error
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        reason: 'parse-error'
                    });
                }
            } catch (err) {
                resolve({
                    success: false,
                    reason: 'parse-error',
                    error: err.message
                });
            }
        });

        child.on('error', (err) => {
            hideLoadingWindow();
            resolve({
                success: false,
                reason: 'spawn-error',
                error: err.message
            });
        });
    });
});

app.whenReady().then(async () => {
    ipcMain.handle('get-window-maximized', () => {
        return mainWindow ? mainWindow.isMaximized() : false;
    });

    ipcMain.on('close-app', () => {
        saveWindowState();
        if (mainWindow) {
            mainWindow.close();
        }
        app.quit();
    });

    ipcMain.on('minimize-app', () => {
        if (mainWindow) mainWindow.minimize();
    });

    ipcMain.on('maximize-app', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });

    ipcMain.on('show-file-in-explorer', (event, filePath) => {
        shell.showItemInFolder(filePath);
    });

    ipcMain.on('delete-file', (event, filePath) => {
        const { exec } = require('child_process');
        const psCommand = `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${filePath.replace(
            /'/g,
            "''"
        )}', 'OnlyErrorDialogs', 'SendToRecycleBin')`;
        exec(`powershell -Command "& { ${psCommand} }"`);
    });

    ipcMain.on('focus-window', () => {
        if (mainWindow) {
            mainWindow.focus();
            mainWindow.webContents.focus();
        }
    });

    ipcMain.on('update-thumbar-state', (event, isPlaying) => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const playIcon = isPlaying
            ? path.join(__dirname, 'icons', 'pause.png')
            : path.join(__dirname, 'icons', 'play.png');
        mainWindow.setThumbarButtons([
            {
                tooltip: 'Previous',
                icon: path.join(__dirname, 'icons', 'prev.png'),
                click: () => {
                    if (mainWindow) mainWindow.webContents.send('thumbar-prev');
                }
            },
            {
                tooltip: isPlaying ? 'Pause' : 'Play',
                icon: playIcon,
                click: () => {
                    if (mainWindow) mainWindow.webContents.send('thumbar-playpause');
                }
            },
            {
                tooltip: 'Next',
                icon: path.join(__dirname, 'icons', 'next.png'),
                click: () => {
                    if (mainWindow) mainWindow.webContents.send('thumbar-next');
                }
            }
        ]);
    });

    ipcMain.handle('save-lyrics-file', async (event, defaultName, contents) => {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Lyrics',
            defaultPath: defaultName,
            filters: [
                {
                    name: 'LRC File',
                    extensions: ['lrc']
                },
                {
                    name: 'Text File',
                    extensions: ['txt']
                },
                {
                    name: 'All Files',
                    extensions: ['*']
                }
            ]
        });
        if (result.canceled || !result.filePath)
            return {
                success: false,
                reason: 'cancelled'
            };
        try {
            fs.writeFileSync(result.filePath, contents, 'utf-8');
            return {
                success: true,
                filePath: result.filePath
            };
        } catch (e) {
            return {
                success: false,
                reason: e.message
            };
        }
    });

    ipcMain.handle('pick-download-folder', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Download Folder',
            properties: ['openDirectory', 'createDirectory']
        });
        if (result.canceled || result.filePaths.length === 0) {
            return {
                success: false,
                reason: 'cancelled'
            };
        }
        const folder = result.filePaths[0];
        const cfgPath = path.join(__dirname, 'download-folder-config.json');
        try {
            fs.writeFileSync(
                cfgPath,
                JSON.stringify(
                    {
                        downloadFolder: folder
                    },
                    null,
                    2
                ),
                'utf-8'
            );
        } catch (e) {
            return {
                success: false,
                reason: e.message
            };
        }
        return {
            success: true,
            folder: folder
        };
    });

    ipcMain.handle('get-download-folder', async () => {
        const cfgPath = path.join(__dirname, 'download-folder-config.json');
        try {
            if (fs.existsSync(cfgPath)) {
                const data = fs.readFileSync(cfgPath, 'utf-8');
                const parsed = JSON.parse(data);
                if (parsed.downloadFolder)
                    return {
                        folder: parsed.downloadFolder
                    };
            }
        } catch (e) {}
        return {
            folder: require('electron').app.getPath('downloads')
        };
    });

    ipcMain.handle('reset-download-folder', async () => {
        const cfgPath = path.join(__dirname, 'download-folder-config.json');
        try {
            if (fs.existsSync(cfgPath)) fs.unlinkSync(cfgPath);
        } catch (e) {
            return {
                success: false,
                reason: e.message
            };
        }
        return {
            success: true
        };
    });

    ipcMain.handle('read-lyrics-file', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Open LRC File',
            properties: ['openFile'],
            filters: [
                {
                    name: 'LRC File',
                    extensions: ['lrc']
                },
                {
                    name: 'Text File',
                    extensions: ['txt']
                },
                {
                    name: 'All Files',
                    extensions: ['*']
                }
            ]
        });
        if (result.canceled || result.filePaths.length === 0)
            return {
                success: false,
                reason: 'cancelled'
            };
        try {
            const contents = fs.readFileSync(result.filePaths[0], 'utf-8');
            return {
                success: true,
                contents: contents,
                filePath: result.filePaths[0]
            };
        } catch (e) {
            return {
                success: false,
                reason: e.message
            };
        }
    });

    const configPath = path.join(__dirname, 'music-folder-config.json');
    const playerJsPath = path.join(__dirname, 'MusicPlayerOutput', 'player.js');

    let hasSongs = false;

    if (fs.existsSync(playerJsPath)) {
        try {
            const content = fs.readFileSync(playerJsPath, 'utf-8');
            const match = content.match(/const SONGS_DATA = (\[.*?\]);/s);
            if (match) {
                const songs = JSON.parse(match[1]);
                hasSongs = songs.length > 0;
            }
        } catch (e) {}
    }

    const needsSetup = !fs.existsSync(configPath) && !hasSongs;

    if (needsSetup) {
        createWindow();
        mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.executeJavaScript(`
                showWelcomeDialog();
            `);
        });

        ipcMain.handle('welcome-select-folder', async () => {
            const folderResult = await dialog.showOpenDialog(mainWindow, {
                title: 'Select Music Folder',
                properties: ['openDirectory']
            });

            if (folderResult.canceled || folderResult.filePaths.length === 0) {
                return {
                    selected: false
                };
            }

            const selectedFolder = folderResult.filePaths[0];
            fs.writeFileSync(
                configPath,
                JSON.stringify({
                    musicFolder: selectedFolder
                }),
                'utf-8'
            );

            showLoadingWindow();
            updateLoadingProgress(0, 'Starting scan...', '');

            const scanScriptPath = path.join(__dirname, 'scan-folder.js');
            const outputDir = path.join(__dirname, 'MusicPlayerOutput');
            const { fork } = require('child_process');

            await new Promise((resolve) => {
                const child = fork(scanScriptPath, [selectedFolder, outputDir], {
                    silent: true,
                    env: {
                        ...process.env,
                        ELECTRON_RUN_AS_NODE: '1'
                    }
                });

                let stdoutBuffer = '';
                child.stdout.on('data', (data) => {
                    const text = data.toString();
                    stdoutBuffer += text;
                    const progressMatch = stdoutBuffer.match(/\|█+\|?\s*(\d+)%/);
                    if (progressMatch) {
                        updateLoadingProgress(parseInt(progressMatch[1]), 'Scanning...', '');
                        stdoutBuffer = '';
                    }
                });

                child.on('close', () => {
                    hideLoadingWindow();
                    resolve();
                });

                child.on('error', () => {
                    hideLoadingWindow();
                    resolve();
                });
            });

            mainWindow.webContents.executeJavaScript(`
                location.reload();
            `);

            return {
                selected: true
            };
        });

        return;
    }

    if (!needsSetup) {
        createWindow();
    }
});

app.on('window-all-closed', () => {
    app.quit();
});
