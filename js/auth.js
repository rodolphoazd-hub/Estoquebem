
// Sistema de Autenticação Simples

const AUTH_KEY = 'doce_controle_user'; // Mudamos a chave para guardar o objeto do usuário

const ROLES = {
    ADMIN: 'admin',
    VENDEDOR: 'vendedor',
    ESTOQUISTA: 'estoquista'
};

// Configurações de permissões por papel
const PERMISSIONS = {
    [ROLES.ADMIN]: ['dashboard', 'vendas', 'receitas', 'configuracoes', 'personalizacao', 'usuarios'],
    [ROLES.VENDEDOR]: ['dashboard', 'vendas'],
    [ROLES.ESTOQUISTA]: ['dashboard', 'receitas'] // Estoquista só vê inventário/receitas, nada de vendas ou config
};

// Inicializar sistema de usuários e auth
function initAuth() {
    let users = db.getUsers();

    // Se não houver usuários, cria o admin padrão
    if (users.length === 0) {
        const adminUser = {
            id: '1',
            username: 'admin',
            password: 'admin', // Em produção, isso deveria ser hash
            name: 'Administrador',
            role: ROLES.ADMIN
        };
        users.push(adminUser);
        db.saveUsers(users);
        console.log('👤 Usuário Admin padrão criado.');
    }
}

// Verificar autenticação ao carregar
function checkAuth() {
    initAuth(); // Garante que usuários existam

    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html');

    if (isLoginPage) {
        if (isAuthenticated()) {
            window.location.href = 'index.html';
        }
        return;
    }

    // Se estivermos na index (ou outra página protegida)
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    } else {
        // Verificar permissões da página atual (se necessário)
        // Por enquanto, validação básica. A UI se encarrega de esconder o que não pode ver.
        updateUIBasedOnRole();
    }
}

// Verificar se possui usuário logado
function isAuthenticated() {
    const user = sessionStorage.getItem(AUTH_KEY);
    return user !== null;
}

// Obter usuário atual
function getCurrentUser() {
    const userStr = sessionStorage.getItem(AUTH_KEY);
    return userStr ? JSON.parse(userStr) : null;
}

// Verificar permissão
function hasPermission(sectionId) {
    const user = getCurrentUser();
    if (!user) return false;

    // Admin tem acesso total
    if (user.role === ROLES.ADMIN) return true;

    // Verificar na lista de permissões
    const userPermissions = PERMISSIONS[user.role] || [];
    return userPermissions.includes(sectionId);
}

// Realizar Login
function handleLogin(event) {
    event.preventDefault();

    const userLogin = document.getElementById('username').value;
    const passLogin = document.getElementById('password').value;

    const users = db.getUsers();
    const validUser = users.find(u => u.username === userLogin && u.password === passLogin);

    if (validUser) {
        // Salvar objeto do usuário na sessão (sem a senha, por segurança básica)
        const sessionUser = { ...validUser };
        delete sessionUser.password;

        sessionStorage.setItem(AUTH_KEY, JSON.stringify(sessionUser));

        // Efeito visual de sucesso
        const btn = event.target.querySelector('button');
        btn.textContent = '✅ Sucesso! Entrando...';
        btn.classList.remove('from-pink-500', 'to-rose-500');
        btn.classList.add('from-green-500', 'to-emerald-500');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } else {
        alert('❌ Usuário ou senha incorretos!');
    }
}

// Realizar Logout
function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        sessionStorage.removeItem(AUTH_KEY);
        window.location.href = 'login.html';
    }
}

// Atualizar UI baseado no papel (esconder botões/seções)
function updateUIBasedOnRole() {
    const user = getCurrentUser();
    if (!user) return;

    // Buscar todos os elementos que deveriam ser restritos?
    // Abordagem: A função showSection no app.js será a guardiã principal das mudanças de tela.
    // Aqui apenas escondemos itens do menu lateral inicialmente.

    const sections = ['vendas', 'receitas', 'configuracoes', 'personalizacao', 'usuarios'];

    // Vamos iterar sobre os botões de navegação se possível, mas como não temos IDs fáceis lá,
    // talvez deixar para o app.js ou injetar estilos CSS.

    // Melhor abordagem: Adicionar uma classe ao body com a role do usuário
    document.body.setAttribute('data-role', user.role);

    // Exibir nome do usuário
    // const sidebarTitle = document.getElementById('sidebarTitle');
    // if(sidebarTitle) sidebarTitle.title = `Logado como: ${user.name} (${user.role})`;
}

// Executar verificação imediata (se não for importado como módulo)
checkAuth();
