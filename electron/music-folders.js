const fs = require('fs');
const path = require('path');

function readConfig(configPath) {
    try {
        if (!fs.existsSync(configPath)) return { folders: [], folderMetadata: {} };
        const data = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(data);
        return {
            folders: parsed.folders || [],
            folderMetadata: parsed.folderMetadata || {}
        };
    } catch (e) {
        return { folders: [], folderMetadata: {} };
    }
}

function writeConfig(configPath, folders, folderMetadata) {
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
}

function isDuplicateFolder(folders, newPath) {
    return folders.some((folder) => folder.toLowerCase() === newPath.toLowerCase());
}

function removeFolder(folders, targetPath) {
    const normalizedTarget = path.win32.normalize(targetPath);
    return folders.filter((folder) => path.win32.normalize(folder) !== normalizedTarget);
}

function normalizeSongFilePath(url) {
    return url.replace('file:///', '').replace(/\//g, '\\');
}

function computeFolderSongCount(folder, songs) {
    const normalizedFolder = folder.replace(/\\\\/g, '\\').replace(/[\\/]$/, '').toLowerCase();
    const folderPrefix = normalizedFolder + '\\';

    return songs.filter((song) => {
        const filePath = normalizeSongFilePath(song.url).toLowerCase();
        return filePath.startsWith(folderPrefix);
    }).length;
}

function getMusicFolders(configPath) {
    return readConfig(configPath).folders;
}

function addMusicFolder(configPath, folderPath) {
    let newFolder = folderPath.replace(/\\\\/g, '\\');
    const config = readConfig(configPath);
    let folders = config.folders.map((f) => f.replace(/\\\\/g, '\\'));
    const folderMetadata = config.folderMetadata;

    const isDuplicate = isDuplicateFolder(folders, newFolder);
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

    writeConfig(configPath, folders, folderMetadata);

    return {
        success: true,
        folders: folders
    };
}

function removeMusicFolder(configPath, folderPath) {
    const config = readConfig(configPath);
    let folders = config.folders;
    const beforeCount = folders.length;

    folders = removeFolder(folders, folderPath);

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
}

function getFolderStats(configPath, folderPath) {
    const folderMetadata = readConfig(configPath).folderMetadata;
    return folderMetadata[folderPath] || {
        songCount: 0,
        addedTime: null
    };
}

function updateFolderSongCounts(configPath, folders, songs) {
    const config = readConfig(configPath);
    const folderMetadata = config.folderMetadata;

    for (const folder of folders) {
        const folderSongCount = computeFolderSongCount(folder, songs);

        if (folderMetadata[folder]) {
            folderMetadata[folder].songCount = folderSongCount;
        } else {
            folderMetadata[folder] = {
                addedTime: new Date().toISOString(),
                songCount: folderSongCount
            };
        }
    }

    writeConfig(configPath, folders, folderMetadata);
}

module.exports = {
    isDuplicateFolder,
    removeFolder,
    computeFolderSongCount,
    getMusicFolders,
    addMusicFolder,
    removeMusicFolder,
    getFolderStats,
    updateFolderSongCounts
};
