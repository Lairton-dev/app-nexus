const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const sqlite3 = require('sqlite3').verbose(); 
const multer = require('multer');
const fs = require('fs').promises;  // Usando fs.promises para operações assíncronas


const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Caminho para o arquivo de controle (lock)
const lockFilePath = path.join(__dirname, 'server.lock');

// Função para verificar se o servidor já está em execução
async function checkServerLock() {
    try {
        await fs.access(lockFilePath, fs.constants.F_OK);  // Verifica se o arquivo existe
        return true;
    } catch (err) {
        return false;  // Arquivo não existe
    }
}

// Função para criar o arquivo de lock
async function createServerLock() {
    try {
        await fs.writeFile(lockFilePath, 'Server lock file');
        console.log('Arquivo de lock criado.');
    } catch (err) {
        console.error('Erro ao criar o arquivo de lock:', err);
    }
}

// Função para remover o arquivo de lock
async function removeServerLock() {
    try {
        // Verifique as permissões do arquivo e log para depuração
        console.log(`Tentando remover o arquivo de lock: ${lockFilePath}`);
        
        await fs.unlink(lockFilePath);
        console.log('Arquivo de lock removido com sucesso.');
    } catch (err) {
        console.error('Erro ao remover o arquivo de lock:', err);
        if (err.code === 'ENOENT') {
            console.log('O arquivo de lock não foi encontrado.');
        } else if (err.code === 'EPERM') {
            console.log('Erro de permissão ao tentar remover o arquivo de lock.');
        } else {
            console.error('Erro desconhecido ao tentar remover o arquivo de lock.');
        }
    }
}


// Servir arquivos estáticos (CSS, JS, imagens, etc.)
app.use(express.static(path.join(__dirname, 'frontend')));

app.use(express.urlencoded({ extended: true })); // Para interpretar application/x-www-form-urlencoded
app.use(express.json()); // Para interpretar application/json

let fileName;

// Configuração do Multer para salvar arquivos com extensão correta
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'frontend','uploads')); // Diretório onde as imagens serão salvas
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname); // Extrai a extensão do arquivo enviado
        fileName = file.fieldname+ '-' + uniqueSuffix + ext;
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Tipo de arquivo não permitido. Apenas imagens JPEG, PNG e GIF são aceitas.'));
        }
        cb(null, true);
    }
});

// Função para obter o IP local
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        for (const interfaceInfo of interfaces[interfaceName]) {
            if (interfaceInfo.family === 'IPv4' && !interfaceInfo.internal) {
                return interfaceInfo.address;
            }
        }
    }
    return '127.0.0.1'; // Caso o IP não seja encontrado, retorna o IP local padrão
}

// Caminho do banco de dados de mensagens e usuários
const dbFile_msg = path.join(__dirname, 'database', 'message.db');
const dbFile_user = path.join(__dirname, 'database', 'users.db');

// Função para inicializar o banco de dados
function initializeDatabase(dbFile) {
    const db = new sqlite3.Database(dbFile, (err) => {
        if (err) {
            console.error('Erro ao abrir o banco de dados:', err.message);
            return;
        }

        console.log('Banco de dados aberto ou criado com sucesso!');

        // Cria a tabela 'messages' se não existir
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            avatar TEXT,
            autor VARCHAR(20),
            conteudo TEXT,
            imagem NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela de mensagens:', err.message);
            } else {
                console.log('Tabela de mensagens criada!');
            }
        });

        // Cria a tabela 'users' se não existir
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            avatar TEXT,
            autor VARCHAR(20),
            senha VARCHAR(8),
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela de usuários:', err.message);
            } else {
                console.log('Tabela de usuários criada!');
            }
        });
    });

    return db;
}

// Inicializa os bancos de dados
const db_msg = initializeDatabase(dbFile_msg);
const db_user = initializeDatabase(dbFile_user);

// Rota para servir o index.html (login)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Rota para servir o cadastro.html (cadastro)
app.get("/cadastro", (req, res) =>{
    res.sendFile(path.join(__dirname, 'frontend', 'cadastro.html'));
})

// Rota para servir o chat (chat em tempo real)
app.get("/chat", (req, res) =>{
    res.sendFile(path.join(__dirname, 'frontend', 'chat.html'));
})
// Rota para obter as mensagens salvas do banco de dados
app.get('/mensagens', (req, res) => {
    const stmt = db_msg.prepare('SELECT * FROM messages ORDER BY timestamp ASC'); // Ordena pelas mais antigas
    stmt.all((err, rows) => {
        if (err) {
            console.error('Erro ao recuperar mensagens:', err.message);
            return res.status(500).json({ message: 'Erro ao recuperar mensagens' });
        }

        // Envia as mensagens para o cliente
        res.json(rows);
    });
});


// Rota para criar o perfil de usuário
app.post('/criar-perfil', upload.single('foto'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado!' });
    }

    const { nomeuser, senhauser } = req.body;
    const avatar = `/uploads/${fileName}`; // Caminho para a foto salva no servidor

    const stmt = db_user.prepare('INSERT INTO users (avatar, autor, senha) VALUES (?, ?, ?)');
    stmt.run(avatar, nomeuser, senhauser, function(err) {
        if (err) {
            console.error('Erro ao inserir usuário no banco:', err.message);
            return res.status(500).json({ message: 'Erro ao criar perfil.' });
        }
    
        // Consulta para pegar o ID do último usuário inserido
        db_user.get('SELECT id FROM users WHERE autor = ? AND senha = ?', [nomeuser, senhauser], (err, row) => {
            if (err) {
                console.error('Erro ao recuperar ID do usuário:', err.message);
                return res.status(500).json({ message: 'Erro ao recuperar ID do usuário.' });
            }
    
            if (row) {
                const userId = row.id; // O ID recuperado diretamente da consulta
                console.log('Perfil criado com sucesso! UserId:', userId);
                return res.status(200).json({
                    message: 'Perfil criado com sucesso!',
                    userId: userId,  // Envia o ID diretamente
                    avatar: avatar   // Envia a URL da imagem
                });
            } else {
                console.error('Erro: Não foi possível recuperar o ID do usuário.');
                return res.status(500).json({ message: 'Erro ao recuperar ID do usuário.' });
            }
        });
    });
    
    stmt.finalize();
});

// upload da imagem no chat
app.post("/upload", upload.single("imagem"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado ou formato inválido!" });
    }
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
});


// rota para entrar na conta
app.post('/entrar-conta', (req, res) => {
    const { nomeuser, senhauser } = req.body;

    if (!nomeuser || !senhauser) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios!' });
    }

    const stmt = db_user.prepare('SELECT * FROM users WHERE autor = ? AND senha = ?');
    stmt.get(nomeuser, senhauser, (err, row) => {
        if (err) {
            console.error('Erro ao verificar o usuário:', err.message);
            return res.status(500).json({ message: 'Erro ao verificar o usuário.' });
        }

        if (row) {
            console.log('Usuário encontrado:', row);
            return res.status(200).json({ message: 'Login bem-sucedido!', user: row });
        } else {
            console.log('Usuário não encontrado ou senha incorreta.');
            return res.status(400).json({ message: 'Usuário ou senha incorretos.' });
        }
    });
    stmt.finalize();
});

// Altera os dados do usuário
app.post('/alterar-dados-perfil', upload.single('newavatar'), (req, res) => {

    try {
        // Verifica se a imagem foi enviada
        let avatarUrl = null;
        if (req.file) {
            // Se o arquivo foi enviado, cria a URL da imagem
            avatarUrl = `/uploads/${req.file.filename}`;
        }

        const { newnomeuser, newsenhauser, userId } = req.body;
        const newAvatar = avatarUrl || null; // Usa avatarUrl se a imagem for fornecida

        // Atualiza o banco de dados com os novos dados
        const stmt = db_user.prepare(
            `UPDATE users SET 
                autor = COALESCE(?, autor), 
                senha = COALESCE(?, senha), 
                avatar = COALESCE(?, avatar) 
             WHERE id = ?`
        );
        stmt.run(newnomeuser || null, newsenhauser || null, newAvatar, userId, (err) => {
            if (err) {
                console.error('Erro ao atualizar dados do usuário:', err.message);
                return res.status(500).json({ message: 'Erro ao atualizar os dados do usuário.' });
            }
            // Responde com os dados atualizados
            return res.status(200).json({
                message: 'Dados alterados com sucesso!',
                newAvatar: avatarUrl,  // Envia a URL do novo avatar, se houver
                userId: userId        // Envia o id do usuário atualizado
            });
        });
    
        stmt.finalize();

    } catch (error) {
        console.error('Erro ao processar dados:', error);
        return res.status(500).json({ message: 'Erro ao alterar os dados.' });
    }
});




// WebSocket para mensagens instantâneas
io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id);

    // Quando uma mensagem é recebida do cliente
    socket.on('mensagem', (msg) => {
        console.log('Mensagem recebida:', msg);
        let message;
        // Defina as variáveis para avatar, autor, conteúdo, e imagem
        const { avatar, autor, conteudo, imagem, timestamp } = msg;

        // Verifica se a mensagem tem imagem (se 'imagem' não for nulo ou vazio)
        if (imagem && imagem !== '') {
            // Se a mensagem tem uma imagem, armazenar a imagem junto com o conteúdo no banco de dados
            console.log('Mensagem com imagem recebida!');
            const stmt = db_msg.prepare('INSERT INTO messages (avatar, autor, conteudo, imagem) VALUES (?, ?, ?, ?)');
            stmt.run(avatar, autor, conteudo, imagem, (err) => {
                if (err) {
                    console.error('Erro ao inserir mensagem com imagem no banco de dados:', err.message);
                    io.emit('errorMSG', "Mensagem não foi enviada, tente novamente...");
                } else {
                    io.emit('sucessMSG', "Mensagem com imagem enviada com sucesso!");
                }
            });
            stmt.finalize();
            message = { avatar, autor, conteudo, imagem, timestamp };
            // Reenvia a mensagem para todos os clientes conectados
            io.emit('mensagem', message);
        } else {
            // Se a mensagem não tem imagem, apenas armazena o texto
            console.log('Mensagem de texto recebida!');
            const stmt = db_msg.prepare('INSERT INTO messages (avatar, autor, conteudo, imagem) VALUES (?, ?, ?, ?)');
            stmt.run(avatar, autor, conteudo, null, (err) => {  // Passa 'null' para 'imagem' se não houver imagem
                if (err) {
                    console.error('Erro ao inserir mensagem de texto no banco de dados:', err.message);
                    io.emit('errorMSG', "Mensagem não foi enviada, tente novamente...");
                } else {
                    io.emit('sucessMSG', "Mensagem de texto enviada com sucesso!");
                }
            });
            stmt.finalize();
            message = { avatar, autor, conteudo, timestamp };
            // Reenvia a mensagem para todos os clientes conectados
            io.emit('mensagem', message);
        }
    });

    // Quando um usuário começa a digitar
    socket.on('digitando', (data) => {
        // Envia para todos os clientes conectados, exceto o próprio cliente
        socket.broadcast.emit('mostrar-digitando', data.nome);
    });

    // Quando o usuário para de digitar (sem enviar novas mensagens por um tempo)
    socket.on('parou-de-digitando', (nome) => {
        // Envia para todos os clientes conectados que o usuário parou de digitar
        socket.broadcast.emit('parou-de-digitando', nome);
    });


    // Envia mensagem no console quando o usuário desconectar
    socket.on('disconnect', () => {
        console.log('Usuário desconectado:', socket.id);
    });
});



// Obter o IP local
const localIP = getLocalIP();
const PORT = 8080;

// Função para iniciar o servidor
function startServer() {
    checkServerLock().then((isLocked) => {
        if (isLocked) {
            console.log(`Servidor já está em execução em http://${localIP}:${PORT}`);
        } else {
            // Se o arquivo de lock não existe, cria o arquivo de lock e inicia o servidor
            createServerLock().then(() => {
                server.listen(PORT, localIP, () => {
                    console.log(`Servidor rodando em http://${localIP}:${PORT}`);
                });

            }).catch((err) => {
                console.error('Erro ao criar o arquivo de lock:', err);
            });
        }
    }).catch((err) => {
        console.error('Erro ao verificar o arquivo de lock:', err);
    });
}

//criar um modulo para exportar a função de Iniciar o servidor e vriáveis de porta e IP para o main.js
module.exports = { startServer, localIP, PORT, removeServerLock };
