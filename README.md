# Projeto Nexus

Nexus é um aplicativo de mensagens instantâneas multimídia que permite a comunicação local em tempo real sem a necessidade de internet. Desenvolvido para oferecer uma experiência offline, o Nexus combina simplicidade e funcionalidade em sua interface intuitiva.

## Principais Funcionalidades
- Envio de mensagens de texto, links e imagens.
- Comunicação em tempo real sem internet.
- Interface simples e personalizável com opções de configuração de layout.
- Alteração de dados do usuário.

## Tecnologias Utilizadas
- **Back-end:** Node.js, Express, Socket.IO, SQLite3
- **Front-end:** HTML5, CSS3, JavaScript e Electron.JS.

## Estrutura do Projeto
```plaintext
App Nexus/
│   ├── server.js            # Configuração principal do servidor com rotas e banco de dados.
|   ├── main.js             # Configuração do Electron, exibição de interface e execução do server.js.
├── frontend/              # Arquivos do cliente
│   ├── icons/            # Ícones do aplicativo
|   ├── uploads/          # Pasta para armazenar imagens e fotos de perfil enviados pelo chat e na criação de perfil
│   ├── index.html           # Página de login.
|   ├── cadastro.html        # Página de cadastro.
|   ├── chat.html           # Página principal do chat.
|   ├── nexus-chat-.css   # estilo CSS da página principal do chat;
|   └── nexus-style.css  # estilo CSS das páginas de login e cadastro.
├── imgs_projeto/          # Imagens do projeto para documentação
└── README.md              # Documentação do projeto
```

## Como Executar o Projeto
### Pré-requisitos
Certifique-se de ter o seguinte instalado em sua máquina:
- Node.js (versão 14 ou superior)
- npm (gerenciador de pacotes do Node.js)

### Passos
1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/projeto-nexus.git
   cd projeto-nexus
   ```
2. Instale as dependências:
   ```bash
   cd backend
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. Abra o arquivo `index.html` no navegador para acessar o front-end.

## Imagens do Projeto
### Tela de Login
![Tela de Login](imgs_projeto/login.png)

### Tela de Cadastro
![Tela de Cadastro](imgs_projeto/cadsstro.png)

### Tela do Chat Principal
![Tela do Chat Principal](imgs_projeto/chat.png)

## Contribuição
Contribuições são bem-vindas! Siga os passos abaixo para contribuir:
1. Faça um fork do projeto.
2. Crie uma branch para suas alterações:
   ```bash
   git checkout -b minha-nova-feature
   ```
3. Commit suas alterações:
   ```bash
   git commit -m 'Minha nova feature'
   ```
4. Envie para o repositório remoto:
   ```bash
   git push origin minha-nova-feature
   ```
5. Abra um pull request.

## Licença
Este projeto está licenciado sob a Licença MIT. Consulte o arquivo `LICENSE` para mais informações.

---
**Desenvolvido por [Seu Nome].**

