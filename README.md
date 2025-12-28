# Controle de Estoque - Bem Browneria

Sistema de controle de estoque e vendas para a Bem Browneria.

## Como Iniciar o Sistema

### Opção 1: Acesso Direto (Mais Simples)
1. Navegue até a pasta do projeto.
2. Dê um clique duplo no arquivo **`login.html`**.
3. O sistema abrirá no seu navegador padrão.
4. Use as credenciais de administrador (se for o primeiro acesso):
   - **Usuário:** `****`
   - **Senha:** `****`

### Opção 2: Servidor Local (Recomendado)
Para uma melhor experiência (e evitar bloqueios de segurança de alguns navegadores), é recomendado usar uma extensão como "Live Server" no VS Code ou rodar um servidor simples via terminal.

**Com Python:**
1. Abra o terminal na pasta do projeto.
2. Execute:
   ```bash
   python -m http.server 8000
   ```
3. Acesse no navegador: `http://localhost:8000/login.html`

## Funcionalidades
- **Dashboard**: Visão geral do estoque, itens baixos e valor total.
- **Vendas**: Registro de saídas e cálculo de lucro.
- **Receitas**: Gestão de fichas técnicas.
- **Configurações/Personalização**: Ajuste de temas e dados da empresa.
- **Usuários**: Gestão de acesso (Admin, Vendedor, Estoquista).

## Estrutura de Arquivos
- `login.html`: Tela de login.
- `index.html`: Sistema principal (protegido por login).
- `js/`: Lógica do sistema (`app.js`, `auth.js`, `db.js`, `users.js`).
- `css/`: Estilos (`style.css`).
