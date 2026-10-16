const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

let mainWindow = null;
let pythonProcess = null;
let frontendProcess = null;
const BACKEND_URL = 'http://127.0.0.1:8000';
const FRONTEND_URL = 'http://127.0.0.1:8080';

function checkFrontendReady(callback, maxRetries = 25, interval = 500) {
    let retries = 0;
    let finished = false;

    const probe = () => {
        if (finished) return;
        const req = http.get(FRONTEND_URL, (res) => {
            if (finished) return;
            if (res.statusCode >= 200 && res.statusCode < 500) {
                finished = true;
                callback(true);
            } else {
                retry();
            }
        });
        req.on('error', () => {
            if (!finished) retry();
        });
        req.setTimeout(1000, () => {
            req.destroy();
            if (!finished) retry();
        });
    };

    const retry = () => {
        if (finished) return;
        retries++;
        if (retries >= maxRetries) {
            finished = true;
            callback(false);
        } else {
            setTimeout(probe, interval);
        }
    };

    probe();
}

async function startEmbeddedFrontendServer() {
    try {
        const serverPath = app.isPackaged
            ? path.join(process.resourcesPath, 'frontend', '.output', 'server', 'index.mjs')
            : path.join(__dirname, '..', 'frontend', '.output', 'server', 'index.mjs');

        if (require('fs').existsSync(serverPath)) {
            console.log(`[Frontend Embedded] Starting bundled frontend server from: ${serverPath}`);
            process.env.NITRO_PORT = '8080';
            process.env.PORT = '8080';
            process.env.NITRO_HOST = '127.0.0.1';
            process.env.HOST = '127.0.0.1';
            const serverUrl = pathToFileURL(serverPath).href;
            await import(serverUrl);
            console.log('[Frontend Embedded] Server listening on 127.0.0.1:8080');
            return true;
        }
    } catch (err) {
        console.error('[Frontend Embedded] Failed to load bundled frontend server:', err);
    }
    return false;
}

function startFrontendServer() {
    if (app.isPackaged) {
        return;
    }
    const rootDir = path.join(__dirname, '..');
    const frontendDir = path.join(rootDir, 'frontend');
    const isWin = process.platform === 'win32';
    const npmCmd = isWin ? 'npm.cmd' : 'npm';
    try {
        console.log(`[Frontend] Spawning frontend dev server in ${frontendDir}`);
        frontendProcess = spawn(npmCmd, ['run', 'dev'], {
            cwd: frontendDir,
            stdio: 'pipe',
            windowsHide: true,
            shell: isWin
        });
        frontendProcess.on('error', (err) => {
            console.error('[Frontend] Dev server process error:', err);
        });
        frontendProcess.stdout.on('data', (d) => console.log(`[Frontend] ${d}`));
        frontendProcess.stderr.on('data', (d) => console.error(`[Frontend Err] ${d}`));
    } catch (err) {
        console.error('Failed to spawn frontend dev server:', err);
    }
}

function checkBackendReady(callback, maxRetries = 25, interval = 500) {
    let retries = 0;
    let finished = false;

    const probe = () => {
        if (finished) return;
        const req = http.get(BACKEND_URL + '/api/health', (res) => {
            if (finished) return;
            if (res.statusCode >= 200 && res.statusCode < 500) {
                finished = true;
                callback(true);
            } else {
                retry();
            }
        });
        req.on('error', () => {
            if (!finished) retry();
        });
        req.setTimeout(1000, () => {
            req.destroy();
            if (!finished) retry();
        });
    };

    const retry = () => {
        if (finished) return;
        retries++;
        if (retries >= maxRetries) {
            finished = true;
            callback(false);
        } else {
            setTimeout(probe, interval);
        }
    };

    probe();
}

function getBackendExecutable() {
    const isWin = process.platform === 'win32';
    const binaryNames = isWin
        ? ['kestrel-core.exe', 'secstudio-core.exe']
        : ['kestrel-core', 'secstudio-core'];

    // 1. Packaged electron resources path (Production build)
    if (app.isPackaged) {
        for (const name of binaryNames) {
            const packagedPath = path.join(process.resourcesPath, name);
            if (require('fs').existsSync(packagedPath)) {
                return { cmd: packagedPath, args: [], cwd: process.resourcesPath };
            }
        }
    }

    const rootDir = path.join(__dirname, '..');

    // 2. Local virtualenv Python (Preferred in development mode)
    const pythonExe = isWin
        ? path.join(rootDir, 'venv', 'Scripts', 'python.exe')
        : path.join(rootDir, 'venv', 'bin', 'python');
    if (require('fs').existsSync(pythonExe)) {
        return {
            cmd: pythonExe,
            args: ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000'],
            cwd: rootDir
        };
    }

    // 3. Pre-compiled binary in dist_backend directory
    for (const name of binaryNames) {
        const distBinary = path.join(rootDir, 'dist_backend', name);
        if (require('fs').existsSync(distBinary)) {
            return { cmd: distBinary, args: [], cwd: rootDir };
        }
    }

    // 4. Root binary
    for (const name of binaryNames) {
        const rootBinary = path.join(rootDir, name);
        if (require('fs').existsSync(rootBinary)) {
            return { cmd: rootBinary, args: [], cwd: rootDir };
        }
    }

    return {
        cmd: 'python',
        args: ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000'],
        cwd: rootDir
    };
}

function startBackendServer() {
    const target = getBackendExecutable();

    try {
        console.log(`[Engine] Spawning backend process: ${target.cmd} in ${target.cwd}`);
        pythonProcess = spawn(target.cmd, target.args, {
            cwd: target.cwd,
            stdio: 'pipe',
            windowsHide: true
        });

        pythonProcess.on('error', (err) => {
            console.error('[Engine] Backend process error:', err);
        });

        pythonProcess.stdout.on('data', (data) => {
            console.log(`[Engine] ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`[Engine Err] ${data}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`[Engine] Backend process exited with code ${code}`);
        });
    } catch (err) {
        console.error('Failed to spawn backend process:', err);
    }
}

function createWindow() {
    const appIconPath = process.platform === 'win32'
        ? path.join(__dirname, 'assets', 'icon.ico')
        : path.join(__dirname, 'assets', 'kestrel-app-icon.png');

    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1080,
        minHeight: 700,
        backgroundColor: '#0B0B0D',
        title: 'Kestrel - Hunt flaws. Ship armor.',
        icon: appIconPath,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    Menu.setApplicationMenu(null);
    mainWindow.setMenu(null);

    mainWindow.loadURL(FRONTEND_URL).catch((err) => {
        console.warn('Failed to load FRONTEND_URL, attempting fallback to BACKEND_URL:', err);
        mainWindow.loadURL(BACKEND_URL).catch((e) => {
            console.error('Failed to load BACKEND_URL fallback:', e);
        });
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Native OS Open Folder Dialog IPC Handler
ipcMain.handle('dialog:openDirectory', async () => {
    if (!mainWindow) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Open Workspace Folder - Kestrel'
    });
    if (canceled || filePaths.length === 0) {
        return null;
    }
    return filePaths[0];
});

// Native OS Open File Dialog IPC Handler
ipcMain.handle('dialog:openFile', async () => {
    if (!mainWindow) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        title: 'Open File - Kestrel',
        filters: [
            { name: 'All Files', extensions: ['*'] },
            { name: 'Code Files', extensions: ['py', 'js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'yml', 'yaml', 'yar', 'rules', 'sql', 'md', 'sh', 'bat', 'ps1', 'txt'] }
        ]
    });
    if (canceled || filePaths.length === 0) {
        return null;
    }
    return filePaths[0];
});

function probeServiceOnce(url, callback) {
    const req = http.get(url, (res) => {
        callback(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => callback(false));
    req.setTimeout(500, () => {
        req.destroy();
        callback(false);
    });
}

app.whenReady().then(async () => {
    function launchWhenReady() {
        if (!mainWindow) {
            createWindow();
        }
    }

    // In packaged production, start the embedded frontend server
    if (app.isPackaged) {
        await startEmbeddedFrontendServer();
    }

    // Check if backend is already running (single immediate probe)
    probeServiceOnce(BACKEND_URL + '/api/health', (backendRunning) => {
        if (!backendRunning) {
            console.log('[Kestrel] Spawning Python backend engine...');
            startBackendServer();
        } else {
            console.log('[Kestrel] Detected active backend server on 127.0.0.1:8000');
        }

        // In dev mode, check if frontend dev server is running
        probeServiceOnce(FRONTEND_URL, (frontendRunning) => {
            if (!frontendRunning && !app.isPackaged) {
                console.log('[Kestrel] Spawning frontend dev server...');
                startFrontendServer();
            }

            // Wait for frontend to be responsive and launch main window
            checkFrontendReady((ready) => {
                launchWhenReady();
            }, 35, 400);
        });
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (frontendProcess) {
        try {
            frontendProcess.kill();
        } catch (e) {
            console.error('Error terminating frontend process:', e);
        }
    }
    if (pythonProcess) {
        try {
            pythonProcess.kill();
        } catch (e) {
            console.error('Error terminating python process:', e);
        }
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
