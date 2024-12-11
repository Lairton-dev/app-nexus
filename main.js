const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { startServer, localIP, PORT, removeServerLock } = require('./server');// Importa o servidor

let mainWindow;

app.on('ready', () => {
    // Inicia o servidor ao abrir o app
    startServer();

    // Cria a janela principal
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        icon: path.join(__dirname, 'frontend', 'icons', 'icon-nexus.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
        },
    });

    // Remover o menu padrão
   Menu.setApplicationMenu(null);
    // Altere a URL para o IP local, ao invés de 'localhost'
    mainWindow.loadURL(`http://${localIP}:${PORT}`); // Aqui você pode usar o IP local

    // Verifica se o Electron abriu corretamente
    mainWindow.webContents.on('did-finish-load', () => {
        console.log("Página carregada no Electron!");
    });
});

// Quando todas as janelas forem fechadas
app.on('window-all-closed', async () => {
    // Se não for no macOS (onde o app pode ficar ativo), fecha o app
    if (process.platform !== 'darwin') {
        // Remove o arquivo de lock ao fechar o app
        await removeServerLock();
        app.quit();
    }
});
