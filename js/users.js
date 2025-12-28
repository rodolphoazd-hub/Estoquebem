// Gerenciamento de Usuários

let usuarios = [];
let usuarioEditando = null;

function carregarUsuarios() {
    usuarios = db.getUsers();
    renderizarTabelaUsuarios();
}

function renderizarTabelaUsuarios() {
    const tbody = document.getElementById('listaUsuarios');
    if (!tbody) return;

    tbody.innerHTML = '';

    usuarios.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-gray-50';

        // Formatar papel
        let roleBadgeClass = 'bg-gray-100 text-gray-800';
        let roleName = user.role;

        if (user.role === ROLES.ADMIN) {
            roleBadgeClass = 'bg-purple-100 text-purple-800';
            roleName = 'Administrador';
        } else if (user.role === ROLES.VENDEDOR) {
            roleBadgeClass = 'bg-green-100 text-green-800';
            roleName = 'Vendedor';
        } else if (user.role === ROLES.ESTOQUISTA) {
            roleBadgeClass = 'bg-blue-100 text-blue-800';
            roleName = 'Estoquista';
        }

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.username}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleBadgeClass}">
                    ${roleName}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                <button onclick="editarUsuario('${user.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                <button onclick="excluirUsuario('${user.id}')" class="text-red-600 hover:text-red-900" ${user.username === 'admin' ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalUsuario(id = null) {
    const modal = document.getElementById('modalUsuario');
    const titulo = document.getElementById('tituloModalUsuario');
    const form = document.getElementById('formUsuario');

    // Resetar form
    form.reset();

    if (id) {
        usuarioEditando = usuarios.find(u => u.id === id);
        if (usuarioEditando) {
            titulo.textContent = 'Editar Usuário';
            document.getElementById('userNome').value = usuarioEditando.name;
            document.getElementById('userUsername').value = usuarioEditando.username;
            document.getElementById('userRole').value = usuarioEditando.role;
            // Senha fica vazia, só preenche se quiser mudar
            document.getElementById('userPassword').required = false;
            document.getElementById('helpPassword').classList.remove('hidden');
        }
    } else {
        usuarioEditando = null;
        titulo.textContent = 'Novo Usuário';
        document.getElementById('userPassword').required = true;
        document.getElementById('helpPassword').classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function fecharModalUsuario() {
    const modal = document.getElementById('modalUsuario');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    usuarioEditando = null;
}

function salvarUsuario(event) {
    event.preventDefault();

    const nome = document.getElementById('userNome').value;
    const username = document.getElementById('userUsername').value;
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;

    if (usuarioEditando) {
        // Editar existente
        usuarioEditando.name = nome;
        usuarioEditando.username = username;
        usuarioEditando.role = role;
        if (password) { // Só atualiza senha se fornecida
            usuarioEditando.password = password;
        }

        // Verificar se não está duplicando username (se mudou)
        // ... (implementação simples por enquanto)

    } else {
        // Criar novo
        // Verificar duplicidade de username
        if (usuarios.some(u => u.username === username)) {
            alert('❌ Este nome de usuário já existe!');
            return;
        }

        const novoUsuario = {
            id: Date.now().toString(),
            name: nome,
            username: username,
            password: password,
            role: role
        };
        usuarios.push(novoUsuario);
    }

    db.saveUsers(usuarios);
    renderizarTabelaUsuarios();
    fecharModalUsuario();
    alert('✅ Usuário salvo com sucesso!');
}

function excluirUsuario(id) {
    const user = usuarios.find(u => u.id === id);
    if (!user) return;

    if (user.username === 'admin') {
        alert('🚫 Não é possível excluir o administrador padrão.');
        return;
    }

    if (confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
        usuarios = usuarios.filter(u => u.id !== id);
        db.saveUsers(usuarios);
        renderizarTabelaUsuarios();
    }
}

// Inicializar quando o documento carregar (via app.js ou chamada direta se script carregado depois)
// Como vamos adicionar o script no final do body, podemos deixar uma função global de inicialização
window.inicializarGerenciamentoUsuarios = function () {
    carregarUsuarios();
}
