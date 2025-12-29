// Dados do sistema - Iniciar vazio
let produtos = [];
let receitas = [];
let vendas = [];
let proximoIdProduto = 1;
let proximoIdReceita = 1;
let proximoIdVenda = 1;

// Configurações do sistema
let configuracoes = {
    limites: {
        'kg': { min: 1, max: 10 },
        'g': { min: 100, max: 1000 },
        'L': { min: 1, max: 10 },
        'ml': { min: 100, max: 1000 },
        'un': { min: 5, max: 50 },
        'cx': { min: 2, max: 20 },
        'pct': { min: 3, max: 30 }
    },
    notificacoes: {
        estoqueBaixo: true,
        vencimento: true,
        whatsapp: false,
        diasAntecedencia: 7,
        automatica: false
    },
    contato: {
        whatsapp: '',
        email: ''
    },
    moeda: 'BRL'
};

// Variáveis do sistema de notificações
let alertasAtivos = [];
let ultimaVerificacaoNotificacoes = null;
let intervalNotificacoes = null;

let categorias = [
    'Ingredientes Básicos',
    'Decoração',
    'Embalagens',
    'Laticínios',
    'Frutas'
];

// Variáveis de paginação
let paginaAtual = 1;
let itensPorPagina = 25;
let produtosFiltrados = [];

// Variáveis de paginação de vendas
let paginaAtualVendas = 1;
let vendasPorPagina = 25;
let vendasFiltradas = [];

// Variáveis de importação
let dadosImportacao = [];
let mapeamentoCampos = {};
let camposObrigatorios = ['nome', 'categoria', 'quantidade', 'unidade', 'preco'];

// Variáveis de importação de receitas
let dadosImportacaoReceitas = [];
let mapeamentoCamposReceitas = {};
let camposObrigatoriosReceitas = ['nome', 'rendimento', 'ingredientes'];

// Funções avançadas de importação/exportação
function baixarTemplate() {
    // Criar template Excel
    const wb = XLSX.utils.book_new();
    const templateData = [
        ['nome', 'categoria', 'quantidade', 'unidade', 'preco', 'validade', 'marca', 'codigoBarras'],
        ['Farinha de Trigo', 'Ingredientes Básicos', '2.5', 'kg', '4.50', '2024-12-31', 'Dona Benta', '7891118001507'],
        ['Açúcar Cristal', 'Ingredientes Básicos', '1.8', 'kg', '3.20', '2025-06-15', 'União', '7891000100004'],
        ['Ovos', 'Ingredientes Básicos', '24', 'un', '0.45', '2024-02-10', 'Korin', '7891234567890']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // Definir larguras das colunas
    ws['!cols'] = [
        { wch: 20 }, // nome
        { wch: 20 }, // categoria
        { wch: 12 }, // quantidade
        { wch: 10 }, // unidade
        { wch: 10 }, // preco
        { wch: 12 }, // validade
        { wch: 15 }, // marca
        { wch: 15 }  // codigoBarras
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_produtos.xlsx');
}

function processarArquivo(input) {
    const file = input.files[0];
    if (!file) return;

    // Mostrar arquivo selecionado
    document.getElementById('dropZone').classList.add('hidden');
    document.getElementById('arquivoSelecionado').classList.remove('hidden');
    document.getElementById('nomeArquivo').textContent = file.name;
    document.getElementById('tamanhoArquivo').textContent = `${(file.size / 1024).toFixed(1)} KB`;

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            let data;

            if (file.name.endsWith('.csv')) {
                // Processar CSV
                const csv = e.target.result;
                const lines = csv.split('\n');
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

                data = lines.slice(1).filter(line => line.trim()).map(line => {
                    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = values[index] || '';
                    });
                    return obj;
                });
            } else {
                // Processar Excel
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                data = XLSX.utils.sheet_to_json(worksheet);
            }

            dadosImportacao = data;
            mostrarMapeamentoCampos(data);

        } catch (error) {
            alert('❌ Erro ao processar arquivo: ' + error.message);
            removerArquivo();
        }
    };

    if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
}

function mostrarMapeamentoCampos(data) {
    if (data.length === 0) {
        alert('❌ Arquivo vazio ou sem dados válidos!');
        return;
    }

    const camposArquivo = Object.keys(data[0]);
    const container = document.getElementById('mapeamentoCampos');
    container.innerHTML = '';

    // Resetar mapeamento
    mapeamentoCampos = {};

    camposObrigatorios.forEach(campo => {
        const div = document.createElement('div');
        div.className = 'grid grid-cols-2 gap-4 items-center';

        // Campo obrigatório
        const labelDiv = document.createElement('div');
        labelDiv.innerHTML = `
                    <label class="block text-sm font-medium text-gray-700">
                        ${campo.charAt(0).toUpperCase() + campo.slice(1)} *
                    </label>
                `;

        // Select para mapear
        const selectDiv = document.createElement('div');
        const select = document.createElement('select');
        select.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';
        select.setAttribute('data-campo', campo);
        select.onchange = () => atualizarMapeamento();

        // Opção vazia
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Selecione uma coluna';
        select.appendChild(emptyOption);

        // Opções do arquivo
        camposArquivo.forEach(campoArquivo => {
            const option = document.createElement('option');
            option.value = campoArquivo;
            option.textContent = campoArquivo;

            // Auto-mapear campos similares
            if (campoArquivo.toLowerCase().includes(campo.toLowerCase()) ||
                campo.toLowerCase().includes(campoArquivo.toLowerCase())) {
                option.selected = true;
                mapeamentoCampos[campo] = campoArquivo;
            }

            select.appendChild(option);
        });

        selectDiv.appendChild(select);
        div.appendChild(labelDiv);
        div.appendChild(selectDiv);
        container.appendChild(div);
    });

    // Campos opcionais
    const camposOpcionais = ['validade', 'marca', 'codigoBarras'];
    camposOpcionais.forEach(campo => {
        const div = document.createElement('div');
        div.className = 'grid grid-cols-2 gap-4 items-center';

        const labelDiv = document.createElement('div');
        labelDiv.innerHTML = `
                    <label class="block text-sm font-medium text-gray-500">
                        ${campo.charAt(0).toUpperCase() + campo.slice(1)}
                    </label>
                `;

        const selectDiv = document.createElement('div');
        const select = document.createElement('select');
        select.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';
        select.setAttribute('data-campo', campo);
        select.onchange = () => atualizarMapeamento();

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Não mapear';
        select.appendChild(emptyOption);

        camposArquivo.forEach(campoArquivo => {
            const option = document.createElement('option');
            option.value = campoArquivo;
            option.textContent = campoArquivo;

            if (campoArquivo.toLowerCase().includes(campo.toLowerCase()) ||
                campo.toLowerCase().includes(campoArquivo.toLowerCase())) {
                option.selected = true;
                mapeamentoCampos[campo] = campoArquivo;
            }

            select.appendChild(option);
        });

        selectDiv.appendChild(select);
        div.appendChild(labelDiv);
        div.appendChild(selectDiv);
        container.appendChild(div);
    });

    // Mostrar preview
    atualizarPreviewImportacao();

    // Mostrar seção de mapeamento
    document.getElementById('secaoMapeamento').classList.remove('hidden');
}

function atualizarMapeamento() {
    const selects = document.querySelectorAll('#mapeamentoCampos select');
    mapeamentoCampos = {};

    selects.forEach(select => {
        const campo = select.getAttribute('data-campo');
        if (select.value) {
            mapeamentoCampos[campo] = select.value;
        }
    });

    atualizarPreviewImportacao();
}

function atualizarPreviewImportacao() {
    const tbody = document.getElementById('previewImportacao');
    tbody.innerHTML = '';

    // Mostrar apenas os primeiros 5 registros
    const preview = dadosImportacao.slice(0, 5);

    preview.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

        const nome = item[mapeamentoCampos.nome] || '';
        const categoria = item[mapeamentoCampos.categoria] || '';
        const quantidade = item[mapeamentoCampos.quantidade] || '';
        const unidade = item[mapeamentoCampos.unidade] || '';
        const preco = item[mapeamentoCampos.preco] || '';

        // Validar dados
        const erros = [];
        if (!nome) erros.push('Nome obrigatório');
        if (!categoria) erros.push('Categoria obrigatória');
        if (!quantidade || isNaN(parseFloat(quantidade))) erros.push('Quantidade inválida');
        if (!unidade) erros.push('Unidade obrigatória');
        if (!preco || isNaN(parseFloat(preco))) erros.push('Preço inválido');

        const statusClass = erros.length > 0 ? 'text-red-600' : 'text-green-600';
        const statusIcon = erros.length > 0 ? '❌' : '✅';
        const statusText = erros.length > 0 ? erros.join(', ') : 'OK';

        row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${nome}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${categoria}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${quantidade} ${unidade}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ ${preco}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm ${statusClass}">
                        ${statusIcon} ${statusText}
                    </td>
                `;
        tbody.appendChild(row);
    });

    // Atualizar contador
    const totalRegistros = dadosImportacao.length;
    const registrosValidos = dadosImportacao.filter(item => {
        const nome = item[mapeamentoCampos.nome];
        const categoria = item[mapeamentoCampos.categoria];
        const quantidade = item[mapeamentoCampos.quantidade];
        const unidade = item[mapeamentoCampos.unidade];
        const preco = item[mapeamentoCampos.preco];

        return nome && categoria && quantidade && !isNaN(parseFloat(quantidade)) &&
            unidade && preco && !isNaN(parseFloat(preco));
    }).length;

    document.getElementById('contadorImportacao').textContent =
        `${registrosValidos} de ${totalRegistros} registros válidos`;

    // Habilitar/desabilitar botão de importação
    const btnImportar = document.querySelector('button[onclick="executarImportacao()"]');
    if (registrosValidos > 0) {
        btnImportar.disabled = false;
        btnImportar.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        btnImportar.disabled = true;
        btnImportar.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

function removerArquivo() {
    document.getElementById('arquivoImportacao').value = '';
    document.getElementById('dropZone').classList.remove('hidden');
    document.getElementById('arquivoSelecionado').classList.add('hidden');
    document.getElementById('secaoMapeamento').classList.add('hidden');
    dadosImportacao = [];
    mapeamentoCampos = {};
}

function executarImportacao() {
    if (dadosImportacao.length === 0) {
        alert('❌ Nenhum dado para importar!');
        return;
    }

    let importados = 0;
    let erros = 0;

    dadosImportacao.forEach(item => {
        try {
            const nome = item[mapeamentoCampos.nome];
            const categoria = item[mapeamentoCampos.categoria];
            const quantidade = parseFloat(item[mapeamentoCampos.quantidade]);
            const unidade = item[mapeamentoCampos.unidade];
            const preco = parseFloat(item[mapeamentoCampos.preco]);
            const validade = item[mapeamentoCampos.validade] || null;
            const marca = item[mapeamentoCampos.marca] || '';
            const codigoBarras = item[mapeamentoCampos.codigoBarras] || '';

            // Validar dados obrigatórios
            if (!nome || !categoria || isNaN(quantidade) || !unidade || isNaN(preco)) {
                erros++;
                return;
            }

            // Verificar se produto já existe (por nome ou código de barras)
            const produtoExistente = produtos.find(p =>
                p.nome.toLowerCase() === nome.toLowerCase() ||
                (codigoBarras && p.codigoBarras === codigoBarras)
            );

            if (produtoExistente) {
                // Atualizar produto existente
                produtoExistente.categoria = categoria;
                produtoExistente.quantidade = quantidade;
                produtoExistente.unidade = unidade;
                produtoExistente.preco = preco;
                if (validade) produtoExistente.validade = validade;
                if (marca) produtoExistente.marca = marca;
                if (codigoBarras) produtoExistente.codigoBarras = codigoBarras;
            } else {
                // Criar novo produto
                const novoProduto = {
                    id: proximoIdProduto++,
                    nome,
                    categoria,
                    quantidade,
                    unidade,
                    preco,
                    validade,
                    marca,
                    codigoBarras
                };
                produtos.push(novoProduto);
            }

            importados++;
        } catch (error) {
            erros++;
        }
    });

    // Salvar dados após importação
    if (importados > 0) {
        salvarDados();
    }

    // Fechar modal e atualizar dashboard
    closeModal('modalImportacao');
    atualizarDashboard();

    // Mostrar resultado
    let mensagem = `✅ Importação concluída!\n\n`;
    mensagem += `📦 ${importados} produtos importados com sucesso\n`;
    if (erros > 0) {
        mensagem += `❌ ${erros} registros com erro foram ignorados`;
    }

    alert(mensagem);
}

// Funções de exportação avançadas
function toggleExportMenu() {
    const menu = document.getElementById('exportMenu');
    menu.classList.toggle('hidden');
}

function exportarExcel() {
    if (produtos.length === 0) {
        alert('❌ Nenhum produto para exportar!');
        return;
    }

    // Preparar dados para exportação
    const dadosExportacao = produtos.map(produto => ({
        'Nome': produto.nome,
        'Categoria': produto.categoria,
        'Quantidade': produto.quantidade,
        'Unidade': produto.unidade,
        'Preço Unitário': produto.preco,
        'Valor Total': (produto.quantidade * produto.preco).toFixed(2),
        'Status Estoque': getStatusEstoque(produto.quantidade, produto.unidade) === 'baixo' ? 'Baixo' :
            getStatusEstoque(produto.quantidade, produto.unidade) === 'medio' ? 'Médio' : 'Alto',
        'Validade': produto.validade ? new Date(produto.validade).toLocaleDateString('pt-BR') : '',
        'Marca': produto.marca || '',
        'Código de Barras': produto.codigoBarras || ''
    }));

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExportacao);

    // Definir larguras das colunas
    ws['!cols'] = [
        { wch: 25 }, // Nome
        { wch: 20 }, // Categoria
        { wch: 12 }, // Quantidade
        { wch: 10 }, // Unidade
        { wch: 15 }, // Preço Unitário
        { wch: 15 }, // Valor Total
        { wch: 15 }, // Status Estoque
        { wch: 12 }, // Validade
        { wch: 15 }, // Marca
        { wch: 18 }  // Código de Barras
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Inventário');

    // Gerar nome do arquivo com data
    const agora = new Date();
    const dataFormatada = agora.toISOString().split('T')[0];
    const nomeArquivo = `inventario_${dataFormatada}.xlsx`;

    XLSX.writeFile(wb, nomeArquivo);

    alert(`✅ Arquivo Excel exportado com sucesso!\n📁 ${nomeArquivo}`);
}

function exportarPDF() {
    if (produtos.length === 0) {
        alert('❌ Nenhum produto para exportar!');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configurar fonte
    doc.setFont('helvetica');

    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Inventário', 20, 20);

    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 30);
    doc.text(`Total de produtos: ${produtos.length}`, 20, 40);

    // Resumo
    const totalItens = produtos.length;
    const estoqueBaixo = produtos.filter(p => getStatusEstoque(p.quantidade, p.unidade) === 'baixo').length;
    const valorTotal = produtos.reduce((total, p) => total + (p.quantidade * p.preco), 0);

    doc.text(`Produtos com estoque baixo: ${estoqueBaixo}`, 20, 50);
    doc.text(`Valor total do inventário: R$ ${valorTotal.toFixed(2)}`, 20, 60);

    // Linha separadora
    doc.line(20, 70, 190, 70);

    // Cabeçalho da tabela
    let yPos = 85;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    doc.text('Produto', 20, yPos);
    doc.text('Categoria', 70, yPos);
    doc.text('Qtd', 110, yPos);
    doc.text('Preço', 130, yPos);
    doc.text('Total', 150, yPos);
    doc.text('Status', 170, yPos);

    yPos += 5;
    doc.line(20, yPos, 190, yPos);

    // Dados dos produtos
    doc.setFont('helvetica', 'normal');
    yPos += 10;

    produtos.forEach((produto, index) => {
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        const status = getStatusEstoque(produto.quantidade, produto.unidade);
        const statusText = status === 'baixo' ? 'Baixo' : status === 'medio' ? 'Médio' : 'Alto';

        doc.text(produto.nome.substring(0, 20), 20, yPos);
        doc.text(produto.categoria.substring(0, 15), 70, yPos);
        doc.text(`${produto.quantidade} ${produto.unidade}`, 110, yPos);
        doc.text(`R$ ${produto.preco.toFixed(2)}`, 130, yPos);
        doc.text(`R$ ${(produto.quantidade * produto.preco).toFixed(2)}`, 150, yPos);
        doc.text(statusText, 170, yPos);

        yPos += 8;
    });

    // Salvar PDF
    const agora = new Date();
    const dataFormatada = agora.toISOString().split('T')[0];
    const nomeArquivo = `relatorio_inventario_${dataFormatada}.pdf`;

    doc.save(nomeArquivo);

    alert(`✅ Relatório PDF gerado com sucesso!\n📁 ${nomeArquivo}`);
}

// Funções de navegação
function showSection(sectionName) {
    // Esconder todas as seções
    const sections = document.querySelectorAll('.section-content');
    sections.forEach(section => {
        section.classList.add('hidden');
    });

    // Mostrar a seção selecionada
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // Atualizar botões de navegação (desktop e mobile)
    const navButtons = document.querySelectorAll('.nav-btn');
    const corPrimaria = document.getElementById('corPrimaria') ? document.getElementById('corPrimaria').value : '#ec4899';

    navButtons.forEach(btn => {
        // Resetar estilos
        btn.classList.remove('bg-pink-500', 'text-white');
        btn.classList.add('text-gray-600', 'hover:bg-pink-100');
        btn.style.backgroundColor = '';
        btn.style.color = '';
    });

    // Destacar botão ativo
    let activeBtn = null;

    // Tenta encontrar pelo evento
    if (event && event.target) {
        activeBtn = event.target.closest('.nav-btn');
    }

    // Se não encontrou pelo evento (ex: navegação manual), tenta buscar pelo onclick
    if (!activeBtn && sectionName) {
        // Busca botão que chama esta seção
        activeBtn = document.querySelector(`button[onclick*="'${sectionName}'"]`);
    }

    if (activeBtn) {
        activeBtn.classList.remove('text-gray-600', 'hover:bg-pink-100');
        activeBtn.classList.add('bg-pink-500', 'text-white');

        // Aplica cor personalizada se existir
        if (typeof configuracoes !== 'undefined') {
            // Re-aplica a cor atual selecionada
            activeBtn.style.backgroundColor = corPrimaria;
        }
    }

    // Atualizar dados específicos da seção
    if (sectionName === 'dashboard') {
        atualizarDashboard();
    } else if (sectionName === 'vendas') {
        atualizarVendas();
    } else if (sectionName === 'receitas') {
        atualizarReceitas();
    }
}

// Funções de modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Preparar dados específicos do modal
        if (modalId === 'modalReceita') {
            atualizarIngredientesDisponiveis();
        } else if (modalId === 'modalVenda') {
            atualizarReceitasDisponiveis();
        } else if (modalId === 'modalImportacao') {
            configurarDragAndDrop();
        } else if (modalId === 'modalImportacaoReceitas') {
            configurarDragAndDropReceitas();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');

        // Limpar formulários
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => form.reset());

        // Limpar dados específicos do modal
        if (modalId === 'modalImportacao') {
            removerArquivo();
        } else if (modalId === 'modalImportacaoReceitas') {
            removerArquivoReceitas();
        } else if (modalId === 'modalReceita') {
            // Resetar modal de receita
            receitaEditando = null;
            document.getElementById('tituloModalReceita').textContent = 'Nova Receita';
            document.getElementById('btnSalvarReceita').textContent = 'Salvar Receita';

            // Limpar ingredientes e deixar apenas um
            const container = document.getElementById('ingredientesReceita');
            container.innerHTML = `
                        <div class="flex space-x-2 ingrediente-row">
                            <select class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ingrediente-select" onchange="calcularCustoReceita()">
                                <option value="">Selecione um ingrediente</option>
                            </select>
                            <input type="number" placeholder="Qtd" min="0.01" step="0.01" class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent quantidade-ingrediente" onchange="calcularCustoReceita()">
                            <button type="button" onclick="removerIngrediente(this)" class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">🗑️</button>
                        </div>
                    `;

            // Resetar displays de custo
            document.getElementById('custoTotalDisplay').textContent = 'R$ 0,00';
            document.getElementById('custoPorPorcaoDisplay').textContent = 'R$ 0,00';
            document.getElementById('lucroSugeridoDisplay').textContent = 'R$ 0,00';
            document.getElementById('precoSugerido').value = '';
            document.getElementById('margemLucro').value = '200';
            document.getElementById('meuPreco').value = '';
        }
    }
}

function configurarDragAndDropReceitas() {
    const dropZone = document.getElementById('dropZoneReceitas');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('border-purple-400', 'bg-purple-50');
    }

    function unhighlight(e) {
        dropZone.classList.remove('border-purple-400', 'bg-purple-50');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const input = document.getElementById('arquivoImportacaoReceitas');
            input.files = files;
            processarArquivoReceitas(input);
        }
    }
}

function configurarDragAndDrop() {
    const dropZone = document.getElementById('dropZone');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('border-blue-400', 'bg-blue-50');
    }

    function unhighlight(e) {
        dropZone.classList.remove('border-blue-400', 'bg-blue-50');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const input = document.getElementById('arquivoImportacao');
            input.files = files;
            processarArquivo(input);
        }
    }
}

// Funções de salvamento e carregamento de dados
function salvarDados() {
    const dados = {
        produtos,
        receitas,
        vendas,
        proximoIdProduto,
        proximoIdReceita,
        proximoIdVenda,
        categorias,
        versao: '1.0',
        ultimaSalvamento: new Date().toISOString()
    };

    db.saveSystemData(dados);
    console.log('💾 Dados salvos automaticamente');
}

function carregarDados() {
    try {
        const dadosSalvos = db.getSystemData();
        if (dadosSalvos) {
            const dados = dadosSalvos;

            // Restaurar dados
            produtos = dados.produtos || [];
            receitas = dados.receitas || [];
            vendas = dados.vendas || [];
            proximoIdProduto = dados.proximoIdProduto || 1;
            proximoIdReceita = dados.proximoIdReceita || 1;
            proximoIdVenda = dados.proximoIdVenda || 1;
            categorias = dados.categorias || [
                'Ingredientes Básicos',
                'Decoração',
                'Embalagens',
                'Laticínios',
                'Frutas'
            ];

            console.log(`📂 Dados carregados: ${produtos.length} produtos, ${receitas.length} receitas, ${vendas.length} vendas`);
            return true;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        alert('⚠️ Erro ao carregar dados salvos. O sistema iniciará vazio.');
    }
    return false;
}

function limparTodosDados() {
    const confirmacao = confirm(
        '🗑️ LIMPAR TODOS OS DADOS\n\n' +
        'Esta ação irá remover PERMANENTEMENTE:\n' +
        `• ${produtos.length} produtos\n` +
        `• ${receitas.length} receitas\n` +
        `• ${vendas.length} vendas\n` +
        '• Todas as configurações\n\n' +
        '⚠️ ESTA AÇÃO NÃO PODE SER DESFEITA!\n\n' +
        'Tem certeza que deseja continuar?'
    );

    if (confirmacao) {
        const confirmacaoFinal = confirm(
            '🚨 CONFIRMAÇÃO FINAL\n\n' +
            'Digite "LIMPAR" para confirmar a exclusão de todos os dados:'
        );

        if (confirmacaoFinal) {
            const texto = prompt('Digite "LIMPAR" para confirmar:');
            if (texto === 'LIMPAR') {
                // Limpar todos os dados
                produtos = [];
                receitas = [];
                vendas = [];
                proximoIdProduto = 1;
                proximoIdReceita = 1;
                proximoIdVenda = 1;

                // Limpar localStorage
                localStorage.removeItem('doceControle_dados');
                localStorage.removeItem('configuracoes');
                localStorage.removeItem('personalizacao');

                // Atualizar interface
                atualizarDashboard();
                atualizarReceitas();
                atualizarVendas();
                atualizarListaCategorias();
                atualizarSelectsCategorias();
                atualizarEstatisticasCategorias();

                alert('✅ Todos os dados foram removidos!\n\nO sistema foi reiniciado completamente.');
            } else {
                alert('❌ Confirmação incorreta. Dados não foram removidos.');
            }
        }
    }
}

// Função para adicionar item no dashboard
let itemEditando = null;

function adicionarItemDashboard(event) {
    event.preventDefault();

    const nome = document.getElementById('nomeItemDash').value;
    const categoria = document.getElementById('categoriaItemDash').value;
    const quantidade = parseFloat(document.getElementById('quantidadeItemDash').value);
    const unidade = document.getElementById('unidadeItemDash').value;
    const preco = parseFloat(document.getElementById('precoItemDash').value);
    const validade = document.getElementById('validadeItemDash').value || null;
    const marca = document.getElementById('marcaItemDash').value || '';
    const codigoBarras = document.getElementById('codigoBarrasItemDash').value || '';

    if (itemEditando) {
        // Atualizar produto existente
        const produto = produtos.find(p => p.id === itemEditando);
        if (produto) {
            produto.nome = nome;
            produto.categoria = categoria;
            produto.quantidade = quantidade;
            produto.unidade = unidade;
            produto.preco = preco;
            produto.validade = validade;
            produto.marca = marca;
            produto.codigoBarras = codigoBarras;

            alert('✅ Item atualizado com sucesso!');
        }
        itemEditando = null;
        document.querySelector('#dashboard form button[type="submit"]').textContent = 'Adicionar Item';
    } else {
        // Criar novo produto
        const novoProduto = {
            id: proximoIdProduto++,
            nome,
            categoria,
            quantidade,
            unidade,
            preco,
            validade,
            marca,
            codigoBarras
        };
        produtos.push(novoProduto);
        alert('✅ Item adicionado com sucesso!');
    }

    // Salvar dados automaticamente
    salvarDados();

    // Limpar formulário
    event.target.reset();

    // Atualizar dashboard
    atualizarDashboard();
}

function editarProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    // Preencher formulário
    document.getElementById('nomeItemDash').value = produto.nome;
    document.getElementById('categoriaItemDash').value = produto.categoria;
    document.getElementById('quantidadeItemDash').value = produto.quantidade;
    document.getElementById('unidadeItemDash').value = produto.unidade;
    document.getElementById('precoItemDash').value = produto.preco;
    if (produto.validade) document.getElementById('validadeItemDash').value = produto.validade;
    if (produto.marca) document.getElementById('marcaItemDash').value = produto.marca;
    if (produto.codigoBarras) document.getElementById('codigoBarrasItemDash').value = produto.codigoBarras;

    // Ajustar estado para edição
    itemEditando = id;
    document.querySelector('#dashboard form button[type="submit"]').textContent = 'Atualizar Item';

    // Rolar para o formulário
    document.getElementById('nomeItemDash').scrollIntoView({ behavior: 'smooth' });
}

// Função para atualizar dashboard
function atualizarDashboard() {
    // Atualizar cards de resumo
    const totalItens = produtos.length;
    const estoqueBaixo = produtos.filter(p => getStatusEstoque(p.quantidade, p.unidade) === 'baixo').length;
    const valorTotal = produtos.reduce((total, p) => total + (p.quantidade * p.preco), 0);
    const categorias = [...new Set(produtos.map(p => p.categoria))].length;

    document.getElementById('totalItens').textContent = totalItens;
    document.getElementById('estoqueBaixo').textContent = estoqueBaixo;
    document.getElementById('valorTotal').textContent = `R$ ${valorTotal.toFixed(2)}`;
    document.getElementById('totalCategorias').textContent = categorias;

    // Atualizar Vendas Total no Dash (se existir)
    const vendasTotal = vendas.reduce((sum, v) => sum + v.totalPedido, 0);
    const dashTotalEl = document.getElementById('vendasTotalDash');
    if (dashTotalEl) dashTotalEl.textContent = `R$ ${vendasTotal.toFixed(2)}`;

    // Atualizar ranking de clientes
    if (typeof atualizarTopClientes === 'function') {
        atualizarTopClientes();
    }

    // Aplicar filtros e atualizar tabela
    filtrarInventario();
}

// Função para filtrar e ordenar inventário
function filtrarInventario() {
    const busca = document.getElementById('buscarInventario').value.toLowerCase();
    const filtroCategoria = document.getElementById('filtroCategoria').value;
    const filtroEstoque = document.getElementById('filtroEstoque').value;
    const ordenarPor = document.getElementById('ordenarPor').value;

    // Filtrar produtos
    produtosFiltrados = produtos.filter(produto => {
        // Filtro de busca
        const matchBusca = !busca ||
            produto.nome.toLowerCase().includes(busca) ||
            (produto.marca && produto.marca.toLowerCase().includes(busca)) ||
            (produto.codigoBarras && produto.codigoBarras.includes(busca));

        // Filtro de categoria
        const matchCategoria = !filtroCategoria || produto.categoria === filtroCategoria;

        // Filtro de estoque
        const statusEstoque = getStatusEstoque(produto.quantidade, produto.unidade);
        const matchEstoque = !filtroEstoque || statusEstoque === filtroEstoque;

        return matchBusca && matchCategoria && matchEstoque;
    });

    // Ordenar produtos
    produtosFiltrados.sort((a, b) => {
        switch (ordenarPor) {
            case 'nome':
                return a.nome.localeCompare(b.nome);
            case 'nome-desc':
                return b.nome.localeCompare(a.nome);
            case 'categoria':
                return a.categoria.localeCompare(b.categoria);
            case 'quantidade':
                return a.quantidade - b.quantidade;
            case 'quantidade-desc':
                return b.quantidade - a.quantidade;
            case 'preco':
                return a.preco - b.preco;
            case 'preco-desc':
                return b.preco - a.preco;
            case 'valor-total':
                return (a.quantidade * a.preco) - (b.quantidade * b.preco);
            case 'valor-total-desc':
                return (b.quantidade * b.preco) - (a.quantidade * a.preco);
            case 'validade':
                if (!a.validade && !b.validade) return 0;
                if (!a.validade) return 1;
                if (!b.validade) return -1;
                return new Date(a.validade) - new Date(b.validade);
            default:
                return 0;
        }
    });

    // Resetar para primeira página quando filtros mudarem
    paginaAtual = 1;

    // Atualizar tabela com paginação
    atualizarTabelaInventario();
    atualizarPaginacao();
}

// Função para atualizar tabela do inventário com paginação
function atualizarTabelaInventario() {
    const tbody = document.getElementById('inventarioDashboard');
    tbody.innerHTML = '';

    // Calcular itens da página atual
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const itensPagina = produtosFiltrados.slice(inicio, fim);

    itensPagina.forEach(produto => {
        const status = getStatusEstoque(produto.quantidade, produto.unidade);
        const statusClass = status === 'baixo' ? 'bg-red-100 text-red-800' :
            status === 'medio' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800';
        const statusText = status === 'baixo' ? '🔴 Baixo' :
            status === 'medio' ? '🟡 Médio' :
                '🟢 Alto';

        const row = document.createElement('tr');
        row.className = 'produto-row';
        row.setAttribute('data-produto-id', produto.id);
        row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <input type="checkbox" class="checkbox-produto produto-checkbox" data-produto-id="${produto.id}" onchange="atualizarSelecao()">
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${produto.nome}</div>
                        <div class="text-sm text-gray-500">${produto.marca || 'Sem marca'}</div>
                        ${produto.codigoBarras ? `<div class="text-xs text-gray-400">${produto.codigoBarras}</div>` : ''}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${produto.categoria}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${produto.quantidade} ${produto.unidade}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ ${produto.preco.toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">R$ ${(produto.quantidade * produto.preco).toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                            ${statusText}
                        </span>
                        ${produto.validade ? `<div class="text-xs text-gray-500 mt-1">Validade: ${new Date(produto.validade).toLocaleDateString('pt-BR')}</div>` : ''}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="editarProduto(${produto.id})" class="text-indigo-600 hover:text-indigo-900 mr-3">✏️</button>
                        <button onclick="excluirProduto(${produto.id})" class="text-red-600 hover:text-red-900">🗑️</button>
                    </td>
                `;
        tbody.appendChild(row);
    });

    // Atualizar contador de resultados
    const resultadosDiv = document.getElementById('resultadosFiltro');
    if (produtosFiltrados.length === produtos.length) {
        resultadosDiv.textContent = `Mostrando ${inicio + 1}-${Math.min(fim, produtosFiltrados.length)} de ${produtos.length} itens`;
    } else {
        resultadosDiv.textContent = `Mostrando ${inicio + 1}-${Math.min(fim, produtosFiltrados.length)} de ${produtosFiltrados.length} itens filtrados (${produtos.length} total)`;
    }
}

// Função para atualizar paginação
function atualizarPaginacao() {
    const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina);

    document.getElementById('infoPagina').textContent = `Página ${paginaAtual} de ${totalPaginas}`;

    const btnAnterior = document.getElementById('btnAnterior');
    const btnProximo = document.getElementById('btnProximo');

    btnAnterior.disabled = paginaAtual <= 1;
    btnProximo.disabled = paginaAtual >= totalPaginas;
}

// Funções de navegação de páginas
function paginaAnterior() {
    if (paginaAtual > 1) {
        paginaAtual--;
        atualizarTabelaInventario();
        atualizarPaginacao();
        deselecionarTodos();
    }
}

function proximaPagina() {
    const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina);
    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        atualizarTabelaInventario();
        atualizarPaginacao();
        deselecionarTodos();
    }
}

function mudarItensPorPagina() {
    itensPorPagina = parseInt(document.getElementById('itensPorPagina').value);
    paginaAtual = 1;
    atualizarTabelaInventario();
    atualizarPaginacao();
    deselecionarTodos();
}

// Funções de seleção múltipla
function atualizarSelecao() {
    const checkboxes = document.querySelectorAll('.produto-checkbox');
    const selecionados = document.querySelectorAll('.produto-checkbox:checked');
    const selectAll = document.getElementById('selectAll');
    const acoesBatch = document.getElementById('acoesBatch');
    const itensSelecionados = document.getElementById('itensSelecionados');

    // Atualizar contador
    itensSelecionados.textContent = `${selecionados.length} itens selecionados`;

    // Mostrar/esconder ações em lote
    if (selecionados.length > 0) {
        acoesBatch.classList.remove('hidden');
    } else {
        acoesBatch.classList.add('hidden');
    }

    // Atualizar checkbox "selecionar todos"
    if (selecionados.length === 0) {
        selectAll.indeterminate = false;
        selectAll.checked = false;
    } else if (selecionados.length === checkboxes.length) {
        selectAll.indeterminate = false;
        selectAll.checked = true;
    } else {
        selectAll.indeterminate = true;
        selectAll.checked = false;
    }

    // Destacar linhas selecionadas
    document.querySelectorAll('.produto-row').forEach(row => {
        const checkbox = row.querySelector('.produto-checkbox');
        if (checkbox.checked) {
            row.classList.add('linha-selecionada');
        } else {
            row.classList.remove('linha-selecionada');
        }
    });
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.produto-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });

    atualizarSelecao();
}

function selecionarTodos() {
    const checkboxes = document.querySelectorAll('.produto-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    atualizarSelecao();
}

function deselecionarTodos() {
    const checkboxes = document.querySelectorAll('.produto-checkbox');
    const selectAll = document.getElementById('selectAll');

    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    selectAll.checked = false;
    selectAll.indeterminate = false;

    atualizarSelecao();
}

function excluirSelecionados() {
    const selecionados = document.querySelectorAll('.produto-checkbox:checked');
    const ids = Array.from(selecionados).map(cb => parseInt(cb.getAttribute('data-produto-id')));

    if (ids.length === 0) {
        alert('⚠️ Nenhum item selecionado!');
        return;
    }

    const confirmacao = confirm(`Tem certeza que deseja excluir ${ids.length} item(ns) selecionado(s)?`);
    if (confirmacao) {
        // Remover produtos selecionados
        produtos = produtos.filter(produto => !ids.includes(produto.id));

        // Salvar dados
        salvarDados();

        // Atualizar dashboard
        atualizarDashboard();
        deselecionarTodos();

        alert(`✅ ${ids.length} item(ns) excluído(s) com sucesso!`);
    }
}

// Função para limpar filtros
function limparFiltros() {
    document.getElementById('buscarInventario').value = '';
    document.getElementById('filtroCategoria').value = '';
    document.getElementById('filtroEstoque').value = '';
    document.getElementById('ordenarPor').value = 'nome';
    paginaAtual = 1;
    deselecionarTodos();
    filtrarInventario();
}

// Função para determinar status do estoque
function getStatusEstoque(quantidade, unidade) {
    const limite = configuracoes.limites[unidade] || { min: 5, max: 50 };

    if (quantidade <= limite.min) return 'baixo';
    if (quantidade >= limite.max) return 'alto';
    return 'medio';
}

// Variáveis para edição de receita
let receitaEditando = null;

// Função para adicionar/editar receita
function adicionarReceita(event) {
    event.preventDefault();

    const nome = document.getElementById('nomeReceita').value;
    const rendimento = parseInt(document.getElementById('rendimentoReceita').value);
    const modoPreparo = document.getElementById('modoPreparoReceita').value;
    const margemLucro = parseFloat(document.getElementById('margemLucro').value) || 200;
    const meuPreco = parseFloat(document.getElementById('meuPreco').value) || 0;

    // Coletar ingredientes
    const ingredientes = [];
    const ingredienteRows = document.querySelectorAll('.ingrediente-row');

    ingredienteRows.forEach(row => {
        const select = row.querySelector('.ingrediente-select');
        const quantidadeInput = row.querySelector('.quantidade-ingrediente');

        if (select.value && quantidadeInput.value) {
            ingredientes.push({
                produtoId: parseInt(select.value),
                quantidade: parseFloat(quantidadeInput.value)
            });
        }
    });

    if (ingredientes.length === 0) {
        alert('⚠️ Adicione pelo menos um ingrediente!');
        return;
    }

    // Calcular custo
    let custoTotal = 0;
    ingredientes.forEach(ing => {
        const produto = produtos.find(p => p.id === ing.produtoId);
        if (produto) {
            custoTotal += ing.quantidade * produto.preco;
        }
    });

    const custoPorPorcao = custoTotal / rendimento;
    const precoSugerido = custoPorPorcao * (1 + margemLucro / 100);
    const precoVenda = meuPreco > 0 ? meuPreco : precoSugerido;

    if (receitaEditando) {
        // Editando receita existente
        const receita = receitas.find(r => r.id === receitaEditando);
        if (receita) {
            receita.nome = nome;
            receita.rendimento = rendimento;
            receita.ingredientes = ingredientes;
            receita.modoPreparo = modoPreparo;
            receita.custoTotal = custoTotal;
            receita.custoPorPorcao = custoPorPorcao;
            receita.margemLucro = margemLucro;
            receita.precoSugerido = precoSugerido;
            receita.precoVenda = precoVenda;
        }

        alert('✅ Receita atualizada com sucesso!');
    } else {
        // Criando nova receita
        const novaReceita = {
            id: proximoIdReceita++,
            nome,
            rendimento,
            ingredientes,
            modoPreparo,
            custoTotal,
            custoPorPorcao,
            margemLucro,
            precoSugerido,
            precoVenda
        };

        receitas.push(novaReceita);
        alert('✅ Receita adicionada com sucesso!');
    }



    // Salvar dados automaticamente
    salvarDados();

    // Limpar variável de edição
    receitaEditando = null;

    // Fechar modal e atualizar lista
    closeModal('modalReceita');
    atualizarReceitas();
}

// Função para atualizar ingredientes disponíveis
function atualizarIngredientesDisponiveis() {
    const selects = document.querySelectorAll('.ingrediente-select');
    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecione um ingrediente</option>';
        produtos.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = `${produto.nome} (${produto.quantidade} ${produto.unidade})`;
            select.appendChild(option);
        });
    });
}

// Função para adicionar ingrediente na receita
function adicionarIngrediente() {
    const container = document.getElementById('ingredientesReceita');
    const newRow = document.createElement('div');
    newRow.className = 'flex space-x-2 ingrediente-row';
    newRow.innerHTML = `
                <select class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ingrediente-select" onchange="calcularCustoReceita()">
                    <option value="">Selecione um ingrediente</option>
                </select>
                <input type="number" placeholder="Qtd" min="0.01" step="0.01" class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent quantidade-ingrediente" onchange="calcularCustoReceita()">
                <button type="button" onclick="removerIngrediente(this)" class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">🗑️</button>
            `;
    container.appendChild(newRow);

    // Atualizar opções do novo select
    const newSelect = newRow.querySelector('.ingrediente-select');
    produtos.forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.id;
        option.textContent = `${produto.nome} (${produto.unidade})`;
        newSelect.appendChild(option);
    });
}

// Função para remover ingrediente
function removerIngrediente(button) {
    button.parentElement.remove();
    calcularCustoReceita();
}

// Função para calcular custo da receita em tempo real
function calcularCustoReceita() {
    const rendimento = parseInt(document.getElementById('rendimentoReceita').value) || 1;
    const ingredienteRows = document.querySelectorAll('.ingrediente-row');

    let custoTotal = 0;

    ingredienteRows.forEach(row => {
        const select = row.querySelector('.ingrediente-select');
        const quantidadeInput = row.querySelector('.quantidade-ingrediente');

        if (select.value && quantidadeInput.value) {
            const produto = produtos.find(p => p.id === parseInt(select.value));
            if (produto) {
                const quantidade = parseFloat(quantidadeInput.value);
                custoTotal += quantidade * produto.preco;
            }
        }
    });

    const custoPorPorcao = custoTotal / rendimento;

    // Atualizar displays
    document.getElementById('custoTotalDisplay').textContent = `R$ ${custoTotal.toFixed(2)}`;
    document.getElementById('custoPorPorcaoDisplay').textContent = `R$ ${custoPorPorcao.toFixed(2)}`;

    // Recalcular preço sugerido
    calcularPrecoSugerido();
}

// Função para calcular preço sugerido
function calcularPrecoSugerido() {
    const custoTotalText = document.getElementById('custoTotalDisplay').textContent;
    const custoTotal = parseFloat(custoTotalText.replace('R$ ', '').replace(',', '.')) || 0;
    const rendimento = parseInt(document.getElementById('rendimentoReceita').value) || 1;
    const margemLucro = parseFloat(document.getElementById('margemLucro').value) || 200;

    const custoPorPorcao = custoTotal / rendimento;
    const precoSugerido = custoPorPorcao * (1 + margemLucro / 100);
    const lucroSugerido = precoSugerido - custoPorPorcao;

    document.getElementById('precoSugerido').value = precoSugerido.toFixed(2);
    document.getElementById('lucroSugeridoDisplay').textContent = `R$ ${lucroSugerido.toFixed(2)}`;
}

// Função para calcular lucro personalizado
function calcularLucroPersonalizado() {
    const meuPreco = parseFloat(document.getElementById('meuPreco').value) || 0;
    const custoPorPorcaoText = document.getElementById('custoPorPorcaoDisplay').textContent;
    const custoPorPorcao = parseFloat(custoPorPorcaoText.replace('R$ ', '').replace(',', '.')) || 0;

    if (meuPreco > 0) {
        const lucroPersonalizado = meuPreco - custoPorPorcao;
        document.getElementById('lucroSugeridoDisplay').textContent = `R$ ${lucroPersonalizado.toFixed(2)}`;
    } else {
        calcularPrecoSugerido();
    }
}

// Função para atualizar receitas
function atualizarReceitas() {
    const container = document.getElementById('listaReceitas');
    container.innerHTML = '';

    receitas.forEach(receita => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden';

        // Calcular preço sugerido (margem de 200%)
        const precoSugerido = receita.custoPorPorcao * 3;
        const margem = 200;
        const lucro = precoSugerido - receita.custoPorPorcao;

        const ingredientesDetalhados = receita.ingredientes.map(ing => {
            const produto = produtos.find(p => p.id === ing.produtoId);
            if (produto) {
                const custoIngrediente = ing.quantidade * produto.preco;
                return `• ${ing.quantidade} ${produto.unidade} de ${produto.nome} (R$ ${custoIngrediente.toFixed(2)})`;
            }
            return '';
        }).filter(Boolean);

        card.innerHTML = `
                    <!-- Header do Card -->
                    <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h4 class="text-xl font-bold mb-1">${receita.nome}</h4>
                                <p class="text-purple-100 text-sm">Rendimento: ${receita.rendimento} porções</p>
                            </div>
                            <div class="flex space-x-2 ml-4">
                                <button onclick="editarReceita(${receita.id})" class="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-colors duration-200" title="Editar receita">
                                    ✏️
                                </button>
                                <button onclick="excluirReceita(${receita.id})" class="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-colors duration-200" title="Excluir receita">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Conteúdo do Card -->
                    <div class="p-6">
                        <!-- Informações de Custo -->
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="bg-gray-50 rounded-lg p-4">
                                <div class="text-sm text-gray-600 mb-1">Custo Total</div>
                                <div class="text-2xl font-bold text-gray-800">R$ ${receita.custoTotal.toFixed(2)}</div>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-4">
                                <div class="text-sm text-gray-600 mb-1">Custo por Porção</div>
                                <div class="text-2xl font-bold text-gray-800">R$ ${receita.custoPorPorcao.toFixed(2)}</div>
                            </div>
                        </div>

                        <!-- Preço Sugerido -->
                        <div class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
                            <div class="flex items-center justify-between mb-2">
                                <h5 class="font-semibold text-green-800 flex items-center">
                                    💰 Preço de Venda (Sugerido)
                                </h5>
                            </div>
                            <div class="grid grid-cols-3 gap-4 text-sm">
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-green-600">R$ ${precoSugerido.toFixed(2)}</div>
                                    <div class="text-green-700">por porção</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-lg font-bold text-orange-600">${margem.toFixed(1)}%</div>
                                    <div class="text-orange-700">Margem</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-lg font-bold text-purple-600">R$ ${lucro.toFixed(2)}</div>
                                    <div class="text-purple-700">Lucro</div>
                                </div>
                            </div>
                        </div>

                        <!-- Ingredientes -->
                        <div class="mb-4">
                            <h5 class="font-semibold text-gray-800 mb-3 flex items-center">
                                🧄 Ingredientes:
                            </h5>
                            <div class="bg-gray-50 rounded-lg p-4">
                                <div class="space-y-1 text-sm text-gray-700">
                                    ${ingredientesDetalhados.join('<br>')}
                                </div>
                            </div>
                        </div>

                        <!-- Modo de Preparo (se existir) -->
                        ${receita.modoPreparo ? `
                            <div class="border-t pt-4">
                                <h5 class="font-semibold text-gray-800 mb-2 flex items-center">
                                    👨‍🍳 Modo de Preparo:
                                </h5>
                                <p class="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">${receita.modoPreparo}</p>
                            </div>
                        ` : ''}

                        <!-- Ações Rápidas -->
                        <div class="flex space-x-2 mt-4 pt-4 border-t">
                            <button onclick="duplicarReceita(${receita.id})" class="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200">
                                📋 Duplicar
                            </button>
                            <button onclick="calcularReceita(${receita.id})" class="flex-1 bg-green-100 hover:bg-green-200 text-green-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200">
                                🧮 Calcular
                            </button>
                            <button onclick="imprimirReceita(${receita.id})" class="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200">
                                🖨️ Imprimir
                            </button>
                        </div>
                    </div>
                `;
        container.appendChild(card);
    });

    // Mostrar mensagem se não houver receitas
    if (receitas.length === 0) {
        container.innerHTML = `
                    <div class="col-span-full text-center py-12">
                        <div class="text-6xl mb-4">👨‍🍳</div>
                        <h3 class="text-xl font-semibold text-gray-600 mb-2">Nenhuma receita cadastrada</h3>
                        <p class="text-gray-500 mb-6">Comece criando sua primeira receita!</p>
                        <button onclick="openModal('modalReceita')" class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200">
                            ➕ Criar Primeira Receita
                        </button>
                    </div>
                `;
    }
}

// Função para atualizar receitas disponíveis no pedido
function atualizarReceitasDisponiveis() {
    const selects = document.querySelectorAll('.receita-select');
    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecione uma receita</option>';
        receitas.forEach(receita => {
            const option = document.createElement('option');
            option.value = receita.id;
            option.textContent = `${receita.nome} (R$ ${receita.custoPorPorcao.toFixed(2)}/porção)`;
            select.appendChild(option);
        });
    });
}

// Variáveis de Vendas
let tipoVendaAtual = 'produto';
let vendaEditando = null;

// Função para alternar tipo de venda
function toggleTipoVenda(tipo) {
    tipoVendaAtual = tipo;

    const modoProduto = document.getElementById('vendaModoProduto');
    const modoPersonalizado = document.getElementById('vendaModoPersonalizado');

    if (tipo === 'produto') {
        modoProduto.classList.remove('hidden');
        modoPersonalizado.classList.add('hidden');
    } else {
        modoProduto.classList.add('hidden');
        modoPersonalizado.classList.remove('hidden');
    }
}

// Função para calcular total da venda personalizada
function calcularTotalCustom() {
    const qtd = parseFloat(document.getElementById('quantidadeCustom').value) || 0;
    const unitario = parseFloat(document.getElementById('valorUnitarioCustom').value) || 0;
    const total = qtd * unitario;

    document.getElementById('valorVendaCustom').value = total.toFixed(2);
}

// Função para adicionar item personalizado ao pedido
function adicionarItemPedidoCustom() {
    const container = document.getElementById('itensPedidoCustom');
    const itemCount = container.children.length + 1;

    const newItem = document.createElement('div');
    newItem.className = 'item-pedido-custom bg-white border border-gray-200 rounded-lg p-4';

    // Data padrão (hoje)
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    newItem.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <span class="font-medium text-gray-800">Item Personalizado ${itemCount}</span>
            <button type="button" onclick="removerItemPedidoCustom(this)" class="text-red-500 hover:text-red-700">🗑️</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Data da Venda</label>
                <input type="date" class="data-item-custom w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" value="${hojeStr}" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Código do Produto (Opcional)</label>
                <input type="text" class="codigo-custom w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nome do Produto</label>
                <div class="relative">
                    <input type="text" class="nome-custom w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" 
                           list="listaProdutosCustom" 
                           placeholder="Digite para buscar ou cadastrar novo"
                           oninput="buscarProdutosCustom(this)"
                           required>
                    <datalist id="listaProdutosCustom"></datalist>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                <input type="number" class="quantidade-custom w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" min="1" step="1" value="1" oninput="calcularTotalItemCustom(this)" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Valor Unitário (R$)</label>
                <input type="number" class="valor-unitario-custom w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" step="0.01" min="0" value="0" oninput="calcularTotalItemCustom(this)" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Valor Total (R$)</label>
                <input type="number" class="valor-total-custom w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg" step="0.01" min="0" readonly>
            </div>
        </div>
    `;

    container.appendChild(newItem);

    // Atualizar lista de produtos
    atualizarListaProdutosCustom();

    // Mostrar botão de remover em todos os itens se houver mais de um
    const removeButtons = container.querySelectorAll('button[onclick*="removerItemPedidoCustom"]');
    removeButtons.forEach(btn => btn.classList.remove('hidden'));
}

// Função para remover item personalizado do pedido
function removerItemPedidoCustom(button) {
    const container = document.getElementById('itensPedidoCustom');
    button.closest('.item-pedido-custom').remove();

    // Renumerar itens
    const items = container.querySelectorAll('.item-pedido-custom');
    items.forEach((item, index) => {
        const label = item.querySelector('span');
        label.textContent = `Item Personalizado ${index + 1}`;
    });

    // Esconder botão de remover se houver apenas um item
    if (items.length === 1) {
        const removeButton = items[0].querySelector('button[onclick*="removerItemPedidoCustom"]');
        if (removeButton) removeButton.classList.add('hidden');
    }

    calcularTotalPedidoCustom();
}

// Função para calcular total de um item personalizado
function calcularTotalItemCustom(input) {
    const itemDiv = input.closest('.item-pedido-custom');
    const quantidade = parseFloat(itemDiv.querySelector('.quantidade-custom').value) || 0;
    const valorUnitario = parseFloat(itemDiv.querySelector('.valor-unitario-custom').value) || 0;
    const total = quantidade * valorUnitario;

    itemDiv.querySelector('.valor-total-custom').value = total.toFixed(2);

    calcularTotalPedidoCustom();
}

// Função para calcular total do pedido personalizado
function calcularTotalPedidoCustom() {
    const items = document.querySelectorAll('.item-pedido-custom');
    let totalPedido = 0;

    items.forEach(item => {
        const valorTotal = parseFloat(item.querySelector('.valor-total-custom').value) || 0;
        totalPedido += valorTotal;
    });

    // Atualizar resumo do pedido (vendas personalizadas não têm custo)
    document.getElementById('custoTotalPedido').textContent = 'R$ 0,00';
    document.getElementById('totalPedido').textContent = `R$ ${totalPedido.toFixed(2)}`;
    document.getElementById('lucroTotalPedido').textContent = `R$ ${totalPedido.toFixed(2)}`;
    document.getElementById('margemMediaPedido').textContent = '100%';
}

// Função para alternar entre tipos de venda
function toggleTipoVenda(tipo) {
    tipoVendaAtual = tipo;
    const modoProduto = document.getElementById('vendaModoProduto');
    const modoPersonalizado = document.getElementById('vendaModoPersonalizado');

    if (tipo === 'produto') {
        modoProduto.classList.remove('hidden');
        modoPersonalizado.classList.add('hidden');
        calcularTotalPedido();
    } else {
        modoProduto.classList.add('hidden');
        modoPersonalizado.classList.remove('hidden');

        // Inicializar com um item personalizado se não houver nenhum
        const container = document.getElementById('itensPedidoCustom');
        if (container && container.children.length === 0) {
            adicionarItemPedidoCustom();
        }

        calcularTotalPedidoCustom();
    }
}

// Função para atualizar lista de produtos customizados (histórico de vendas)
function atualizarListaProdutosCustom() {
    const datalist = document.getElementById('listaProdutosCustom');
    if (!datalist) return;

    datalist.innerHTML = '';

    // Extrair produtos únicos de vendas personalizadas anteriores
    const produtosUnicos = new Set();

    vendas.forEach(venda => {
        if (venda.tipo === 'personalizada') {
            venda.itens.forEach(item => {
                if (item.receita) {
                    produtosUnicos.add(item.receita);
                }
            });
        }
    });

    // Adicionar opções ao datalist
    Array.from(produtosUnicos).sort().forEach(produto => {
        const option = document.createElement('option');
        option.value = produto;
        datalist.appendChild(option);
    });
}

// Função para buscar produtos enquanto digita
function buscarProdutosCustom(input) {
    const valor = input.value.trim();

    // Se o campo estiver vazio, apenas atualizar a lista
    if (!valor) {
        atualizarListaProdutosCustom();
        return;
    }

    // Buscar em vendas anteriores e sugerir preço
    const produtoEncontrado = vendas.find(venda =>
        venda.tipo === 'personalizada' &&
        venda.itens.some(item => item.receita.toLowerCase() === valor.toLowerCase())
    );

    if (produtoEncontrado) {
        const item = produtoEncontrado.itens.find(i => i.receita.toLowerCase() === valor.toLowerCase());
        if (item) {
            // Sugerir o último preço usado
            const itemDiv = input.closest('.item-pedido-custom');
            const valorUnitarioInput = itemDiv.querySelector('.valor-unitario-custom');

            if (valorUnitarioInput && parseFloat(valorUnitarioInput.value) === 0) {
                valorUnitarioInput.value = item.preco.toFixed(2);
                calcularTotalItemCustom(valorUnitarioInput);
            }
        }
    }
}

// Função para abrir modal de nova venda e resetar formulário
function abrirModalNovaVenda() {
    // Resetar estado de edição
    vendaEditando = null;
    const btnSubmit = document.getElementById('btnFinalizarPedido');
    if (btnSubmit) btnSubmit.textContent = 'Finalizar Pedido';
    const modalTitle = document.querySelector('#modalVenda h3');
    if (modalTitle) modalTitle.textContent = 'Nova Venda';

    // Resetar tipo de venda
    tipoVendaAtual = 'produto';
    const radioProduto = document.querySelector('input[name="tipoVenda"][value="produto"]');
    if (radioProduto) radioProduto.checked = true;
    toggleTipoVenda('produto');

    // Limpar campos comuns
    document.getElementById('clientePedido').value = '';
    document.getElementById('telefonePedido').value = '';
    // Definir data como hoje por padrão
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    if (document.getElementById('dataPedido')) document.getElementById('dataPedido').value = hojeStr;

    // Limpar campos de produto (receita)
    const itensContainer = document.getElementById('itensPedido');
    if (itensContainer) {
        itensContainer.innerHTML = '';
        adicionarItemPedido(); // Adiciona um item vazio inicial
    }

    // Limpar totais
    if (document.getElementById('custoTotalPedido')) document.getElementById('custoTotalPedido').textContent = 'R$ 0,00';
    if (document.getElementById('totalPedido')) document.getElementById('totalPedido').textContent = 'R$ 0,00';
    if (document.getElementById('lucroTotalPedido')) document.getElementById('lucroTotalPedido').textContent = 'R$ 0,00';
    if (document.getElementById('margemMediaPedido')) document.getElementById('margemMediaPedido').textContent = '0%';

    // Limpar campos personalizados
    const itensCustomContainer = document.getElementById('itensPedidoCustom');
    if (itensCustomContainer) {
        itensCustomContainer.innerHTML = '';
        // Não adicionar item aqui, será adicionado quando alternar para modo personalizado
    }

    // Abrir modal
    if (typeof openModal === 'function') {
        openModal('modalVenda');
    } else {
        const modal = document.getElementById('modalVenda');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }
}

// Função para adicionar item ao pedido
function adicionarItemPedido() {
    const container = document.getElementById('itensPedido');
    const itemCount = container.children.length + 1;

    const newItem = document.createElement('div');
    newItem.className = 'item-pedido bg-white border border-gray-200 rounded-lg p-4';
    newItem.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <span class="font-medium text-gray-800">Item ${itemCount}</span>
                    <button type="button" onclick="removerItemPedido(this)" class="text-red-500 hover:text-red-700">🗑️</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Receita</label>
                        <select class="receita-select w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" onchange="atualizarCustoItem(this)" required>
                            <option value="">Selecione uma receita</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                        <input type="number" class="quantidade-item w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" min="1" step="1" value="1" onchange="calcularTotalItem(this)" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Preço Unit. (R$)</label>
                        <input type="number" class="preco-item w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" min="0" step="0.01" onchange="calcularTotalItem(this)" required>
                    </div>
                </div>
                <div class="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div class="bg-gray-50 p-2 rounded">
                        <span class="text-gray-600">Custo:</span>
                        <span class="custo-item font-medium">R$ 0,00</span>
                    </div>
                    <div class="bg-gray-50 p-2 rounded">
                        <span class="text-gray-600">Total:</span>
                        <span class="total-item font-medium">R$ 0,00</span>
                    </div>
                    <div class="bg-gray-50 p-2 rounded">
                        <span class="text-gray-600">Lucro:</span>
                        <span class="lucro-item font-medium text-green-600">R$ 0,00</span>
                    </div>
                </div>
            `;

    container.appendChild(newItem);

    // Atualizar opções de receitas no novo select
    const newSelect = newItem.querySelector('.receita-select');
    receitas.forEach(receita => {
        const option = document.createElement('option');
        option.value = receita.id;
        option.textContent = `${receita.nome} (R$ ${receita.custoPorPorcao.toFixed(2)}/porção)`;
        newSelect.appendChild(option);
    });

    // Mostrar botão de remover se houver mais de um item
    const removeButtons = container.querySelectorAll('button[onclick*="removerItemPedido"]');
    removeButtons.forEach(btn => btn.classList.remove('hidden'));
}

// Função para remover item do pedido
function removerItemPedido(button) {
    const container = document.getElementById('itensPedido');
    button.closest('.item-pedido').remove();

    // Renumerar itens
    const items = container.querySelectorAll('.item-pedido');
    items.forEach((item, index) => {
        const label = item.querySelector('span');
        label.textContent = `Item ${index + 1}`;
    });

    // Esconder botão de remover se houver apenas um item
    if (items.length === 1) {
        const removeButton = items[0].querySelector('button[onclick*="removerItemPedido"]');
        removeButton.classList.add('hidden');
    }

    calcularTotalPedido();
}

// Função para atualizar custo do item quando receita é selecionada
function atualizarCustoItem(select) {
    const receitaId = parseInt(select.value);
    const receita = receitas.find(r => r.id === receitaId);

    if (receita) {
        const itemDiv = select.closest('.item-pedido');
        const precoInput = itemDiv.querySelector('.preco-item');
        const custoSpan = itemDiv.querySelector('.custo-item');

        // Sugerir preço baseado no custo + margem de 200%
        const precoSugerido = receita.custoPorPorcao * 3;
        precoInput.value = precoSugerido.toFixed(2);

        custoSpan.textContent = `R$ ${receita.custoPorPorcao.toFixed(2)}`;

        calcularTotalItem(precoInput);
    }
}

// Função para calcular total do item
function calcularTotalItem(input) {
    const itemDiv = input.closest('.item-pedido');
    const quantidade = parseFloat(itemDiv.querySelector('.quantidade-item').value) || 0;
    const preco = parseFloat(itemDiv.querySelector('.preco-item').value) || 0;
    const custoText = itemDiv.querySelector('.custo-item').textContent;
    const custo = parseFloat(custoText.replace('R$ ', '').replace(',', '.')) || 0;

    const total = quantidade * preco;
    const custoTotal = quantidade * custo;
    const lucro = total - custoTotal;

    itemDiv.querySelector('.total-item').textContent = `R$ ${total.toFixed(2)}`;
    itemDiv.querySelector('.lucro-item').textContent = `R$ ${lucro.toFixed(2)}`;

    calcularTotalPedido();
}

// Função para calcular total do pedido
function calcularTotalPedido() {
    const items = document.querySelectorAll('.item-pedido');
    let custoTotal = 0;
    let totalPedido = 0;
    let lucroTotal = 0;

    items.forEach(item => {
        const quantidade = parseFloat(item.querySelector('.quantidade-item').value) || 0;
        const preco = parseFloat(item.querySelector('.preco-item').value) || 0;
        const custoText = item.querySelector('.custo-item').textContent;
        const custo = parseFloat(custoText.replace('R$ ', '').replace(',', '.')) || 0;

        custoTotal += quantidade * custo;
        totalPedido += quantidade * preco;
    });

    lucroTotal = totalPedido - custoTotal;
    const margemMedia = totalPedido > 0 ? (lucroTotal / custoTotal * 100) : 0;

    document.getElementById('custoTotalPedido').textContent = `R$ ${custoTotal.toFixed(2)}`;
    document.getElementById('totalPedido').textContent = `R$ ${totalPedido.toFixed(2)}`;
    document.getElementById('lucroTotalPedido').textContent = `R$ ${lucroTotal.toFixed(2)}`;
    document.getElementById('margemMediaPedido').textContent = `${margemMedia.toFixed(1)}%`;
}

// Função para editar venda existente
function editarVenda(id) {
    const idNum = Number(id);
    const venda = vendas.find(v => v.id == idNum);
    if (!venda) {
        // Tenta achar sem conversão por segurança
        const fallbackVenda = vendas.find(v => v.id == id);
        if (!fallbackVenda) return;
        vendaEditando = fallbackVenda.id;
    } else {
        vendaEditando = idNum;
    }

    // Atualizar UI do Modal
    const btnSubmit = document.getElementById('btnFinalizarPedido');
    if (btnSubmit) btnSubmit.textContent = 'Atualizar Venda';
    const modalTitle = document.querySelector('#modalVenda h3');
    if (modalTitle) modalTitle.textContent = 'Editar Venda';

    // Abrir modal (sem resetar)
    if (typeof openModal === 'function') {
        openModal('modalVenda');
    } else {
        const modal = document.getElementById('modalVenda');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    // Preencher campos comuns
    document.getElementById('clientePedido').value = venda.cliente;
    document.getElementById('telefonePedido').value = venda.telefone || '';
    if (venda.data) {
        // Garantir formato YYYY-MM-DD
        const dataFormatada = venda.data.split('T')[0];
        document.getElementById('dataPedido').value = dataFormatada;
    }

    // Configurar Tipo e Campos Específicos
    tipoVendaAtual = venda.tipo || 'produto';
    toggleTipoVenda(tipoVendaAtual);

    // Setar radio button correto
    const radio = document.querySelector(`input[name="tipoVenda"][value="${tipoVendaAtual}"]`);
    if (radio) radio.checked = true;

    if (tipoVendaAtual === 'produto') {
        const itensContainer = document.getElementById('itensPedido');
        itensContainer.innerHTML = ''; // Limpar atuais

        // Recriar itens
        venda.itens.forEach(item => {
            adicionarItemPedido();
            const lastItem = itensContainer.lastElementChild;

            // Encontrar receita correspondente pelo nome
            const receitaObj = receitas.find(r => r.nome === item.receita);
            const select = lastItem.querySelector('.receita-select');

            if (receitaObj) {
                select.value = receitaObj.id;
            } else {
                // Adicionar opção temporária se não encontrar (para visualização)
                const opt = document.createElement('option');
                opt.value = -1; // ID invaalido
                opt.textContent = `${item.receita} (Arquivo)`;
                opt.selected = true;
                select.appendChild(opt);
            }

            lastItem.querySelector('.quantidade-item').value = item.quantidade;
            lastItem.querySelector('.preco-item').value = item.preco;

            // Calcular totais da linha
            calcularTotalItem(lastItem.querySelector('.preco-item'));
        });

        // Recalcular total geral
        calcularTotalPedido();

    } else {
        // Venda Personalizada - Múltiplos Itens
        const itensCustomContainer = document.getElementById('itensPedidoCustom');
        itensCustomContainer.innerHTML = ''; // Limpar atuais

        // Recriar itens personalizados
        venda.itens.forEach(item => {
            adicionarItemPedidoCustom();
            const lastItem = itensCustomContainer.lastElementChild;

            // Preencher data do item (se existir, senão usar data da venda)
            const dataItemInput = lastItem.querySelector('.data-item-custom');
            if (dataItemInput) {
                dataItemInput.value = item.dataVenda || venda.data;
            }

            lastItem.querySelector('.codigo-custom').value = item.codigo || '';
            lastItem.querySelector('.nome-custom').value = item.receita || '';
            lastItem.querySelector('.quantidade-custom').value = item.quantidade || 1;
            lastItem.querySelector('.valor-unitario-custom').value = item.preco || 0;
            lastItem.querySelector('.valor-total-custom').value = item.total || 0;
        });

        // Preencher campos adicionais (agora do formulário comum)
        document.getElementById('pagamentoPedido').value = venda.pagamento || '';
        document.getElementById('enderecoPedido').value = venda.endereco || '';

        // Recalcular total
        calcularTotalPedidoCustom();
    }
}

// Função para finalizar (ou atualizar) pedido
function finalizarPedido() {
    const cliente = document.getElementById('clientePedido').value;
    const telefone = document.getElementById('telefonePedido').value;
    const dataVendaInput = document.getElementById('dataPedido').value;
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const dataVenda = dataVendaInput || hojeStr;

    if (!cliente) {
        showCustomAlert('⚠️ Atenção', 'Por favor, informe o nome do cliente!');
        return;
    }

    let novaVenda;

    if (tipoVendaAtual === 'produto') {
        // Lógica de Venda de Produtos (Receitas)
        const items = document.querySelectorAll('.item-pedido');
        const itensPedido = [];

        let valid = true;
        items.forEach(item => {
            const receitaSelect = item.querySelector('.receita-select');
            const quantidade = parseFloat(item.querySelector('.quantidade-item').value);
            const preco = parseFloat(item.querySelector('.preco-item').value);

            if (!receitaSelect.value || !quantidade || !preco) {
                valid = false;
                return;
            }

            let nomeReceita = '';
            let custoReceita = 0;

            if (receitaSelect.value === '-1') {
                // Item arquivado/importado
                nomeReceita = receitaSelect.options[receitaSelect.selectedIndex].text.replace(' (Arquivo)', '');
                custoReceita = 0; // Assume 0 ou mantem antigo se editar lógica mais fundo
            } else {
                const receita = receitas.find(r => r.id === parseInt(receitaSelect.value));
                nomeReceita = receita.nome;
                custoReceita = receita.custoPorPorcao;
            }

            itensPedido.push({
                receita: nomeReceita,
                quantidade,
                preco,
                custo: custoReceita,
                total: quantidade * preco,
                lucro: (quantidade * preco) - (quantidade * custoReceita)
            });
        });

        if (!valid) {
            showCustomAlert('⚠️ Atenção', 'Por favor, preencha todos os campos dos itens!');
            return;
        }

        const custoTotal = parseFloat(document.getElementById('custoTotalPedido').textContent.replace('R$ ', '').replace('.', '').replace(',', '.'));
        const totalPedido = parseFloat(document.getElementById('totalPedido').textContent.replace('R$ ', '').replace('.', '').replace(',', '.'));
        const lucroTotal = parseFloat(document.getElementById('lucroTotalPedido').textContent.replace('R$ ', '').replace('.', '').replace(',', '.'));
        const margemMediaStr = document.getElementById('margemMediaPedido').textContent.replace('%', '');
        const margemMedia = parseFloat(margemMediaStr) || 0;

        novaVenda = {
            id: vendaEditando !== null ? vendaEditando : proximoIdVenda++, // Usa ID existente ou novo
            data: dataVenda,
            cliente,
            telefone,
            itens: itensPedido,
            custoTotal,
            totalPedido,
            lucroTotal,
            margemMedia,
            tipo: 'produto'
        };

    } else {
        // Lógica de Venda Personalizada - Múltiplos Itens
        const itemsCustom = document.querySelectorAll('.item-pedido-custom');
        const itensPersonalizados = [];

        let valid = true;
        let totalVenda = 0;

        itemsCustom.forEach(item => {
            const dataItem = item.querySelector('.data-item-custom').value;
            const codigo = item.querySelector('.codigo-custom').value;
            const nomeProduto = item.querySelector('.nome-custom').value;
            const quantidade = parseFloat(item.querySelector('.quantidade-custom').value) || 1;
            const valorUnitario = parseFloat(item.querySelector('.valor-unitario-custom').value) || 0;
            const valorTotal = parseFloat(item.querySelector('.valor-total-custom').value) || 0;

            if (!nomeProduto || valorUnitario <= 0 || !dataItem) {
                valid = false;
                return;
            }

            itensPersonalizados.push({
                receita: nomeProduto, // Usando campo 'receita' para manter compatibilidade com tabela
                codigo: codigo,
                quantidade: quantidade,
                preco: valorUnitario, // Preço Unitário
                custo: 0,
                total: valorTotal,    // Total calculado
                lucro: valorTotal,
                dataVenda: dataItem   // Data individual do item
            });

            totalVenda += valorTotal;
        });

        if (!valid || itensPersonalizados.length === 0) {
            showCustomAlert('⚠️ Atenção', 'Preencha todos os campos dos itens personalizados, incluindo a data!');
            return;
        }

        // Obter informações adicionais (agora do formulário comum)
        const pagamento = document.getElementById('pagamentoPedido').value;
        const endereco = document.getElementById('enderecoPedido').value;

        if (!pagamento) {
            showCustomAlert('⚠️ Atenção', 'Selecione a forma de pagamento!');
            return;
        }

        novaVenda = {
            id: vendaEditando !== null ? vendaEditando : proximoIdVenda++,
            data: dataVenda,
            cliente,
            telefone,
            endereco,
            pagamento,
            itens: itensPersonalizados,
            custoTotal: 0,
            totalPedido: totalVenda,
            lucroTotal: totalVenda,
            margemMedia: 100,
            tipo: 'personalizada'
        };
    }

    if (vendaEditando !== null) {
        // Atualizar existente na lista
        const index = vendas.findIndex(v => v.id == vendaEditando);
        if (index !== -1) {
            vendas[index] = novaVenda;
        } else {
            vendas.push(novaVenda);
        }
        showCustomAlert('✅ Sucesso', 'Venda atualizada com sucesso!');
        vendaEditando = null;
    } else {
        // Adicionar nova
        vendas.push(novaVenda);
        showCustomAlert('✅ Sucesso', 'Pedido finalizado com sucesso!');
    }

    // Salvar dados automaticamente
    salvarDados();

    closeModal('modalVenda');

    // Limpar campos customizados (reset manual para garantir)
    document.getElementById('codigoProdutoCustom').value = '';
    document.getElementById('nomeProdutoCustom').value = '';
    document.getElementById('valorVendaCustom').value = '';
    document.getElementById('pagamentoCustom').value = '';
    document.getElementById('enderecoCustom').value = '';

    // Atualizar tudo para garantir consistência
    atualizarVendas();
    if (typeof atualizarDashboard === 'function') {
        atualizarDashboard();
    }
}

// Função para atualizar vendas
function atualizarVendas() {
    // Calcular estatísticas
    const d = new Date();
    const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();

    const vendasHoje = vendas.filter(v => v.data === hoje).reduce((sum, v) => sum + v.totalPedido, 0);
    const vendasMes = vendas.filter(v => {
        const parts = v.data.split('-');
        const vMes = parseInt(parts[1]) - 1;
        const vAno = parseInt(parts[0]);
        return vMes === mesAtual && vAno === anoAtual;
    }).reduce((sum, v) => sum + v.totalPedido, 0);

    const lucroMes = vendas.filter(v => {
        const parts = v.data.split('-');
        const vMes = parseInt(parts[1]) - 1;
        const vAno = parseInt(parts[0]);
        return vMes === mesAtual && vAno === anoAtual;
    }).reduce((sum, v) => sum + v.lucroTotal, 0);

    const margemMedia = vendas.length > 0 ?
        vendas.reduce((sum, v) => sum + v.margemMedia, 0) / vendas.length : 0;

    const vendasTotal = vendas.reduce((sum, v) => sum + v.totalPedido, 0);

    // Atualizar cards
    document.getElementById('vendasHoje').textContent = `R$ ${vendasHoje.toFixed(2)}`;
    document.getElementById('vendasMes').textContent = `R$ ${vendasMes.toFixed(2)}`;
    document.getElementById('lucroMes').textContent = `R$ ${lucroMes.toFixed(2)}`;
    document.getElementById('margemMedia').textContent = `${margemMedia.toFixed(1)}%`;
    const totalEl = document.getElementById('vendasTotal');
    if (totalEl) totalEl.textContent = `R$ ${vendasTotal.toFixed(2)}`;

    // Atualizar gráficos
    atualizarGraficos();

    // Aplicar filtros e atualizar tabela
    filtrarVendas();

    // Atualizar lista de clientes (autocomplete)
    atualizarListaClientes();
}

// Função para atualizar lista de clientes (Autocomplete)
function atualizarListaClientes() {
    const datalist = document.getElementById('listaClientes');
    if (!datalist) return;

    datalist.innerHTML = '';

    // Extrair clientes únicos
    const clientesUnicos = [...new Set(vendas.map(v => v.cliente))].sort();

    clientesUnicos.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente;
        datalist.appendChild(option);
    });
}

// Função para ver histórico do cliente
function verHistoricoCliente() {
    const nomeCliente = document.getElementById('clientePedido').value;
    if (!nomeCliente) {
        showCustomAlert('⚠️ Cliente', 'Digite o nome do cliente primeiro.');
        return;
    }

    const historico = vendas.filter(v => v.cliente.toLowerCase() === nomeCliente.toLowerCase());

    if (historico.length === 0) {
        showCustomAlert('ℹ️ Histórico', `Nenhuma compra encontrada para "${nomeCliente}".`);
        return;
    }

    let msg = `📜 Histórico de: ${historico[0].cliente}\n\n`;
    let totalGasto = 0;

    historico.sort((a, b) => new Date(b.data) - new Date(a.data)); // Mais recente primeiro

    historico.forEach(v => {
        const data = new Date(v.data).toLocaleDateString('pt-BR');
        msg += `📅 ${data} - R$ ${v.totalPedido.toFixed(2)}\n`;
        v.itens.forEach(item => {
            msg += `   • ${item.quantidade}x ${item.receita}\n`;
        });
        msg += '-------------------\n';
        totalGasto += v.totalPedido;
    });

    msg += `\n💰 Total Gasto: R$ ${totalGasto.toFixed(2)}`;
    msg += `\n🛍️ Total Compras: ${historico.length}`;

    // Usar alert simples por enquanto, ideal seria um modal próprio
    alert(msg);
}

// Função para atualizar gráficos
function atualizarGraficos() {
    atualizarGraficoEvolucaoLucro();
    atualizarGraficoVendasLucro();
    atualizarProdutosMaisLucrativos();
    atualizarGraficoDistribuicaoMargem();
    atualizarTopClientes();
    atualizarProdutosMaisVendidos();
}

// Top Clientes Frequentes
function atualizarTopClientes() {
    const container = document.getElementById('topClientesChart');
    if (!container) return;

    container.innerHTML = '';

    if (vendas.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhuma venda registrada.</p>';
        return;
    }

    // Contar frequência, total gasto e pegar o último ID de venda para desempate
    const estatisticas = {};

    vendas.forEach(v => {
        const nome = v.cliente;
        if (!estatisticas[nome]) {
            estatisticas[nome] = {
                frequencia: 0,
                totalGasto: 0,
                ultimoIdVenda: 0
            };
        }
        estatisticas[nome].frequencia += 1;
        estatisticas[nome].totalGasto += v.totalPedido;
        estatisticas[nome].ultimoIdVenda = Math.max(estatisticas[nome].ultimoIdVenda, v.id);
    });

    // Ordenar por frequência DESC, depois totalGasto DESC, depois ultimoIdVenda DESC (mais recente)
    const topClientes = Object.entries(estatisticas)
        .sort(([, a], [, b]) => {
            if (b.frequencia !== a.frequencia) return b.frequencia - a.frequencia;
            if (b.totalGasto !== a.totalGasto) return b.totalGasto - a.totalGasto;
            return b.ultimoIdVenda - a.ultimoIdVenda;
        })
        .slice(0, 5); // Top 5

    const maxFreq = topClientes.length > 0 ? topClientes[0][1].frequencia : 0;

    topClientes.forEach(([cliente, stats], index) => {
        const freq = stats.frequencia;
        const gasto = stats.totalGasto;
        const porcentagem = maxFreq > 0 ? (freq / maxFreq) * 100 : 0;

        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        item.innerHTML = `
            <div class="flex items-center space-x-3 overflow-hidden">
                <div class="text-lg flex-shrink-0">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</div>
                <div class="overflow-hidden">
                    <div class="font-medium text-gray-800 truncate" title="${cliente}">${cliente}</div>
                    <div class="text-xs text-gray-500">${freq} ${freq === 1 ? 'compra' : 'compras'}</div>
                </div>
            </div>
            <div class="text-right flex-shrink-0">
                <div class="font-bold text-blue-600">R$ ${gasto.toFixed(2)}</div>
                <div class="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                    <div class="bg-blue-500 h-1.5 rounded-full" style="width: ${porcentagem}%"></div>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Gráfico de Evolução do Lucro com filtros
function atualizarGraficoEvolucaoLucro() {
    const container = document.getElementById('graficoEvolucaoLucro');
    const labelPeriodo = document.getElementById('labelPeriodoLucro');
    const totalPeriodo = document.getElementById('totalPeriodoLucro');
    const mediaPeriodo = document.getElementById('mediaPeriodoLucro');

    container.innerHTML = '';

    // Obter valores dos filtros
    const diasFiltro = parseInt(document.getElementById('filtroPeríodoLucro')?.value || 30);
    const tipoFiltro = document.getElementById('filtroTipoLucro')?.value || 'lucro';

    // Gerar dados do período selecionado
    const dados = [];
    const hoje = new Date();
    let totalValor = 0;
    let diasComVendas = 0;

    for (let i = diasFiltro - 1; i >= 0; i--) {
        const data = new Date(hoje);
        data.setDate(data.getDate() - i);
        const dataStr = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;

        const vendasDia = vendas.filter(v => v.data === dataStr);

        let valorDia = 0;

        switch (tipoFiltro) {
            case 'lucro':
                valorDia = vendasDia.reduce((sum, v) => sum + v.lucroTotal, 0);
                break;
            case 'vendas':
                valorDia = vendasDia.reduce((sum, v) => sum + v.totalPedido, 0);
                break;
            case 'margem':
                if (vendasDia.length > 0) {
                    valorDia = vendasDia.reduce((sum, v) => sum + v.margemMedia, 0) / vendasDia.length;
                    diasComVendas++;
                }
                break;
        }

        totalValor += valorDia;

        dados.push({
            data: data.getDate(),
            mes: data.getMonth() + 1,
            valor: valorDia,
            dataCompleta: data.toLocaleDateString('pt-BR')
        });
    }

    // Calcular valores máximos para escala
    const maxValor = Math.max(...dados.map(d => d.valor), 1);

    // Definir cores baseadas no tipo
    const cores = {
        'lucro': { from: 'from-green-500', to: 'to-green-300', text: 'text-green-600' },
        'vendas': { from: 'from-blue-500', to: 'to-blue-300', text: 'text-blue-600' },
        'margem': { from: 'from-purple-500', to: 'to-purple-300', text: 'text-purple-600' }
    };

    const cor = cores[tipoFiltro];

    // Criar barras do gráfico
    dados.forEach(dia => {
        const altura = (dia.valor / maxValor) * 100;
        const barra = document.createElement('div');
        barra.className = `bg-gradient-to-t ${cor.from} ${cor.to} rounded-t flex-1 relative group cursor-pointer hover:opacity-80 transition-opacity`;
        barra.style.height = `${altura}%`;
        barra.style.minHeight = '2px';

        // Tooltip com informações detalhadas
        let tooltipText = '';
        switch (tipoFiltro) {
            case 'lucro':
                tooltipText = `${dia.dataCompleta}: R$ ${dia.valor.toFixed(2)} em lucro`;
                break;
            case 'vendas':
                tooltipText = `${dia.dataCompleta}: R$ ${dia.valor.toFixed(2)} em vendas`;
                break;
            case 'margem':
                tooltipText = `${dia.dataCompleta}: ${dia.valor.toFixed(1)}% de margem média`;
                break;
        }
        barra.title = tooltipText;

        container.appendChild(barra);
    });

    // Atualizar labels e estatísticas
    labelPeriodo.textContent = `Últimos ${diasFiltro} dias`;

    let totalTexto = '';
    let mediaTexto = '';

    switch (tipoFiltro) {
        case 'lucro':
            totalTexto = `Total: R$ ${totalValor.toFixed(2)}`;
            mediaTexto = `Média: R$ ${(totalValor / diasFiltro).toFixed(2)}/dia`;
            break;
        case 'vendas':
            totalTexto = `Total: R$ ${totalValor.toFixed(2)}`;
            mediaTexto = `Média: R$ ${(totalValor / diasFiltro).toFixed(2)}/dia`;
            break;
        case 'margem':
            const mediaReal = diasComVendas > 0 ? totalValor / diasComVendas : 0;
            totalTexto = `Dias com vendas: ${diasComVendas}`;
            mediaTexto = `Margem média: ${mediaReal.toFixed(1)}%`;
            break;
    }

    totalPeriodo.textContent = totalTexto;
    mediaPeriodo.textContent = mediaTexto;
}

// Gráfico Vendas vs Lucro (últimos 6 meses)
function atualizarGraficoVendasLucro() {
    const container = document.getElementById('graficoVendasLucro').querySelector('.h-full');
    container.innerHTML = '';

    // Gerar dados dos últimos 6 meses
    const dados = [];
    const hoje = new Date();

    for (let i = 5; i >= 0; i--) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mes = data.toLocaleDateString('pt-BR', { month: 'short' });

        const vendasMes = vendas
            .filter(v => {
                const parts = v.data.split('-');
                const vMes = parseInt(parts[1]) - 1;
                const vAno = parseInt(parts[0]);
                return vMes === data.getMonth() && vAno === data.getFullYear();
            })
            .reduce((sum, v) => sum + v.totalPedido, 0);

        const lucroMes = vendas
            .filter(v => {
                const parts = v.data.split('-');
                const vMes = parseInt(parts[1]) - 1;
                const vAno = parseInt(parts[0]);
                return vMes === data.getMonth() && vAno === data.getFullYear();
            })
            .reduce((sum, v) => sum + v.lucroTotal, 0);

        dados.push({ mes, vendas: vendasMes, lucro: lucroMes });
    }

    const maxValor = Math.max(...dados.map(d => Math.max(d.vendas, d.lucro)), 1);

    dados.forEach(mes => {
        const alturaVendas = (mes.vendas / maxValor) * 100;
        const alturaLucro = (mes.lucro / maxValor) * 100;

        const grupo = document.createElement('div');
        grupo.className = 'flex flex-col items-center space-y-1 flex-1';

        const barras = document.createElement('div');
        barras.className = 'flex items-end space-x-1 h-48';

        const barraVendas = document.createElement('div');
        barraVendas.className = 'bg-blue-500 w-4 rounded-t cursor-pointer';
        barraVendas.style.height = `${alturaVendas}%`;
        barraVendas.style.minHeight = '2px';
        barraVendas.title = `Vendas ${mes.mes}: R$ ${mes.vendas.toFixed(2)}`;

        const barraLucro = document.createElement('div');
        barraLucro.className = 'bg-green-500 w-4 rounded-t cursor-pointer';
        barraLucro.style.height = `${alturaLucro}%`;
        barraLucro.style.minHeight = '2px';
        barraLucro.title = `Lucro ${mes.mes}: R$ ${mes.lucro.toFixed(2)}`;

        const label = document.createElement('div');
        label.className = 'text-xs text-gray-600 text-center';
        label.textContent = mes.mes;

        barras.appendChild(barraVendas);
        barras.appendChild(barraLucro);
        grupo.appendChild(barras);
        grupo.appendChild(label);
        container.appendChild(grupo);
    });
}

// Produtos Mais Lucrativos
function atualizarProdutosMaisLucrativos() {
    const container = document.getElementById('produtosMaisLucrativos');
    if (!container) return;
    container.innerHTML = '';

    // Calcular lucro por produto
    const lucrosPorProduto = {};

    vendas.forEach(venda => {
        venda.itens.forEach(item => {
            if (!lucrosPorProduto[item.receita]) {
                lucrosPorProduto[item.receita] = 0;
            }
            lucrosPorProduto[item.receita] += item.lucro;
        });
    });

    // Ordenar por lucro
    const produtosOrdenados = Object.entries(lucrosPorProduto)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    if (produtosOrdenados.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhuma venda registrada ainda</p>';
        return;
    }

    const maxLucro = produtosOrdenados[0][1];

    produtosOrdenados.forEach(([produto, lucro], index) => {
        const porcentagem = (lucro / maxLucro) * 100;

        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        item.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="text-lg">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</div>
                <div>
                    <div class="font-medium text-gray-800">${produto}</div>
                    <div class="text-xs text-gray-500">R$ ${lucro.toFixed(2)} acumulado</div>
                </div>
            </div>
            <div class="text-right">
                <div class="font-bold text-green-600">R$ ${lucro.toFixed(2)}</div>
                <div class="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                    <div class="bg-green-500 h-1.5 rounded-full" style="width: ${porcentagem}%"></div>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Produtos Mais Vendidos
function atualizarProdutosMaisVendidos() {
    const container = document.getElementById('produtosMaisVendidos');
    if (!container) return;

    container.innerHTML = '';

    // Calcular quantidade por produto
    const qtdsPorProduto = {};

    vendas.forEach(venda => {
        venda.itens.forEach(item => {
            if (!qtdsPorProduto[item.receita]) {
                qtdsPorProduto[item.receita] = 0;
            }
            qtdsPorProduto[item.receita] += item.quantidade;
        });
    });

    // Ordenar por quantidade
    const produtosOrdenados = Object.entries(qtdsPorProduto)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    if (produtosOrdenados.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhuma venda registrada ainda</p>';
        return;
    }

    const maxQtd = produtosOrdenados[0][1];

    produtosOrdenados.forEach(([produto, qtd], index) => {
        const porcentagem = (qtd / maxQtd) * 100;

        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        item.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="text-lg">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</div>
                <div>
                    <div class="font-medium text-gray-800">${produto}</div>
                    <div class="text-xs text-gray-500">${qtd} unidades vendidas</div>
                </div>
            </div>
            <div class="text-right">
                <div class="font-bold text-blue-600">${qtd} un</div>
                <div class="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                    <div class="bg-blue-500 h-1.5 rounded-full" style="width: ${porcentagem}%"></div>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Gráfico de Distribuição de Margem
function atualizarGraficoDistribuicaoMargem() {
    const container = document.getElementById('graficoDistribuicaoMargem');
    container.innerHTML = '';

    if (vendas.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Nenhuma venda para análise</p>';
        return;
    }

    // Calcular distribuição de margem
    let baixa = 0, media = 0, alta = 0;

    vendas.forEach(venda => {
        if (venda.margemMedia < 30) baixa++;
        else if (venda.margemMedia <= 60) media++;
        else alta++;
    });

    const total = vendas.length;
    const dados = [
        { label: 'Baixa', valor: baixa, cor: 'bg-red-500', porcentagem: (baixa / total) * 100 },
        { label: 'Média', valor: media, cor: 'bg-yellow-500', porcentagem: (media / total) * 100 },
        { label: 'Alta', valor: alta, cor: 'bg-green-500', porcentagem: (alta / total) * 100 }
    ];

    // Criar gráfico de pizza simples
    const pizza = document.createElement('div');
    pizza.className = 'relative w-32 h-32 rounded-full mx-auto';
    pizza.style.background = `conic-gradient(
                #ef4444 0deg ${dados[0].porcentagem * 3.6}deg,
                #eab308 ${dados[0].porcentagem * 3.6}deg ${(dados[0].porcentagem + dados[1].porcentagem) * 3.6}deg,
                #22c55e ${(dados[0].porcentagem + dados[1].porcentagem) * 3.6}deg 360deg
            )`;

    // Centro do gráfico
    const centro = document.createElement('div');
    centro.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full flex items-center justify-center';
    centro.innerHTML = '<span class="text-sm font-bold text-gray-800">Margem</span>';

    pizza.appendChild(centro);
    container.appendChild(pizza);

    // Estatísticas
    const stats = document.createElement('div');
    stats.className = 'mt-4 space-y-2 text-sm';
    dados.forEach(item => {
        if (item.valor > 0) {
            const stat = document.createElement('div');
            stat.className = 'flex justify-between items-center';
            stat.innerHTML = `
                        <span class="text-gray-600">${item.label}:</span>
                        <span class="font-medium">${item.valor} (${item.porcentagem.toFixed(1)}%)</span>
                    `;
            stats.appendChild(stat);
        }
    });
    container.appendChild(stats);
}

// Função para filtrar vendas
function filtrarVendas() {
    const busca = document.getElementById('buscarVendas').value.toLowerCase();
    const filtroPeriodo = document.getElementById('filtroPeriodo').value;
    const filtroValor = document.getElementById('filtroValor').value;
    const ordenarPor = document.getElementById('ordenarVendasPor').value;

    // Filtrar vendas
    vendasFiltradas = vendas.filter(venda => {
        // Filtro de busca
        const matchBusca = !busca ||
            venda.cliente.toLowerCase().includes(busca) ||
            venda.itens.some(item => item.receita.toLowerCase().includes(busca));

        // Filtro de período
        let matchPeriodo = true;
        if (filtroPeriodo) {
            const dataVenda = new Date(venda.data);
            const hoje = new Date();

            switch (filtroPeriodo) {
                case 'hoje':
                    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
                    matchPeriodo = venda.data === hojeStr;
                    break;
                case 'semana':
                    const inicioSemana = new Date(hoje);
                    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
                    inicioSemana.setHours(0, 0, 0, 0);
                    const dataVendaLocal = new Date(venda.data + 'T00:00:00');
                    matchPeriodo = dataVendaLocal >= inicioSemana;
                    break;
                case 'mes':
                    const parts = venda.data.split('-');
                    matchPeriodo = (parseInt(parts[1]) - 1) === hoje.getMonth() &&
                        parseInt(parts[0]) === hoje.getFullYear();
                    break;
                case 'trimestre':
                    const inicioTrimestre = new Date(hoje);
                    inicioTrimestre.setMonth(hoje.getMonth() - 3);
                    inicioTrimestre.setHours(0, 0, 0, 0);
                    const dataVendaLocalTrim = new Date(venda.data + 'T00:00:00');
                    matchPeriodo = dataVendaLocalTrim >= inicioTrimestre;
                    break;
            }
        }

        // Filtro de valor
        let matchValor = true;
        if (filtroValor) {
            switch (filtroValor) {
                case 'baixo':
                    matchValor = venda.totalPedido <= 50;
                    break;
                case 'medio':
                    matchValor = venda.totalPedido > 50 && venda.totalPedido <= 200;
                    break;
                case 'alto':
                    matchValor = venda.totalPedido > 200;
                    break;
            }
        }

        return matchBusca && matchPeriodo && matchValor;
    });

    // Ordenar vendas
    vendasFiltradas.sort((a, b) => {
        switch (ordenarPor) {
            case 'data':
                return a.data.localeCompare(b.data);
            case 'data-desc':
                return b.data.localeCompare(a.data);
            case 'cliente':
                return a.cliente.localeCompare(b.cliente);
            case 'cliente-desc':
                return b.cliente.localeCompare(a.cliente);
            case 'total':
                return a.totalPedido - b.totalPedido;
            case 'total-desc':
                return b.totalPedido - a.totalPedido;
            case 'lucro':
                return a.lucroTotal - b.lucroTotal;
            case 'lucro-desc':
                return b.lucroTotal - a.lucroTotal;
            case 'margem':
                return a.margemMedia - b.margemMedia;
            case 'margem-desc':
                return b.margemMedia - a.margemMedia;
            default:
                return 0;
        }
    });

    // Resetar para primeira página quando filtros mudarem
    paginaAtualVendas = 1;

    // Atualizar tabela com paginação
    atualizarTabelaVendas();
    atualizarPaginacaoVendas();
}

// Função para atualizar tabela de vendas com paginação
function atualizarTabelaVendas() {
    const tbody = document.getElementById('tabelaVendas');
    tbody.innerHTML = '';

    // Calcular itens da página atual
    const inicio = (paginaAtualVendas - 1) * vendasPorPagina;
    const fim = inicio + vendasPorPagina;
    const vendasPagina = vendasFiltradas.slice(inicio, fim);

    vendasPagina.forEach(venda => {
        const row = document.createElement('tr');
        row.className = 'venda-row';
        row.setAttribute('data-venda-id', venda.id);

        const itensTexto = venda.itens.map(item => `${item.receita} (${item.quantidade}x)`).join(', ');
        const margemClass = venda.margemMedia < 30 ? 'text-red-600' :
            venda.margemMedia <= 60 ? 'text-yellow-600' : 'text-green-600';

        row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <input type="checkbox" class="checkbox-produto venda-checkbox" data-venda-id="${venda.id}" onchange="atualizarSelecaoVendas()">
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${venda.data.split('-').reverse().join('/')}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${venda.cliente}</div>
                        <div class="text-sm text-gray-500">${venda.telefone || 'Sem telefone'}</div>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900">${itensTexto}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">R$ ${venda.totalPedido.toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">R$ ${venda.lucroTotal.toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${margemClass}">${venda.margemMedia.toFixed(1)}%</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="editarVenda(${venda.id})" class="text-indigo-600 hover:text-indigo-900 mr-2" title="Editar">✏️</button>
                        <button onclick="verDetalhesVenda(${venda.id})" class="text-blue-600 hover:text-blue-900 mr-2" title="Ver Detalhes">👁️</button>
                        <button onclick="excluirVenda(${venda.id})" class="text-red-600 hover:text-red-900" title="Excluir">🗑️</button>
                    </td>
                `;
        tbody.appendChild(row);
    });

    // Atualizar contador de resultados
    const resultadosDiv = document.getElementById('resultadosFiltroVendas');
    if (vendasFiltradas.length === vendas.length) {
        resultadosDiv.textContent = `Mostrando ${inicio + 1}-${Math.min(fim, vendasFiltradas.length)} de ${vendas.length} vendas`;
    } else {
        resultadosDiv.textContent = `Mostrando ${inicio + 1}-${Math.min(fim, vendasFiltradas.length)} de ${vendasFiltradas.length} vendas filtradas (${vendas.length} total)`;
    }
}

// Funções de paginação de vendas
function atualizarPaginacaoVendas() {
    const totalPaginas = Math.ceil(vendasFiltradas.length / vendasPorPagina);

    document.getElementById('infoPaginaVendas').textContent = `Página ${paginaAtualVendas} de ${totalPaginas}`;

    const btnAnterior = document.getElementById('btnAnteriorVendas');
    const btnProximo = document.getElementById('btnProximoVendas');

    btnAnterior.disabled = paginaAtualVendas <= 1;
    btnProximo.disabled = paginaAtualVendas >= totalPaginas;
}

function paginaAnteriorVendas() {
    if (paginaAtualVendas > 1) {
        paginaAtualVendas--;
        atualizarTabelaVendas();
        atualizarPaginacaoVendas();
        deselecionarTodasVendas();
    }
}

function proximaPaginaVendas() {
    const totalPaginas = Math.ceil(vendasFiltradas.length / vendasPorPagina);
    if (paginaAtualVendas < totalPaginas) {
        paginaAtualVendas++;
        atualizarTabelaVendas();
        atualizarPaginacaoVendas();
        deselecionarTodasVendas();
    }
}

function mudarVendasPorPagina() {
    vendasPorPagina = parseInt(document.getElementById('vendasPorPagina').value);
    paginaAtualVendas = 1;
    atualizarTabelaVendas();
    atualizarPaginacaoVendas();
    deselecionarTodasVendas();
}

// Funções de seleção múltipla de vendas
function atualizarSelecaoVendas() {
    const checkboxes = document.querySelectorAll('.venda-checkbox');
    const selecionados = document.querySelectorAll('.venda-checkbox:checked');
    const selectAll = document.getElementById('selectAllVendas');
    const acoesBatch = document.getElementById('acoesVendasBatch');
    const vendasSelecionadas = document.getElementById('vendasSelecionadas');

    // Atualizar contador
    vendasSelecionadas.textContent = `${selecionados.length} vendas selecionadas`;

    // Mostrar/esconder ações em lote
    if (selecionados.length > 0) {
        acoesBatch.classList.remove('hidden');
    } else {
        acoesBatch.classList.add('hidden');
    }

    // Atualizar checkbox "selecionar todas"
    if (selecionados.length === 0) {
        selectAll.indeterminate = false;
        selectAll.checked = false;
    } else if (selecionados.length === checkboxes.length) {
        selectAll.indeterminate = false;
        selectAll.checked = true;
    } else {
        selectAll.indeterminate = true;
        selectAll.checked = false;
    }

    // Destacar linhas selecionadas
    document.querySelectorAll('.venda-row').forEach(row => {
        const checkbox = row.querySelector('.venda-checkbox');
        if (checkbox.checked) {
            row.classList.add('linha-selecionada');
        } else {
            row.classList.remove('linha-selecionada');
        }
    });
}

function toggleSelectAllVendas() {
    const selectAll = document.getElementById('selectAllVendas');
    const checkboxes = document.querySelectorAll('.venda-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });

    atualizarSelecaoVendas();
}

function selecionarTodasVendas() {
    const checkboxes = document.querySelectorAll('.venda-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    atualizarSelecaoVendas();
}

function deselecionarTodasVendas() {
    const checkboxes = document.querySelectorAll('.venda-checkbox');
    const selectAll = document.getElementById('selectAllVendas');

    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    selectAll.checked = false;
    selectAll.indeterminate = false;

    atualizarSelecaoVendas();
}

function excluirVendasSelecionadas() {
    const selecionados = document.querySelectorAll('.venda-checkbox:checked');
    const ids = Array.from(selecionados).map(cb => parseInt(cb.getAttribute('data-venda-id')));

    if (ids.length === 0) {
        alert('⚠️ Nenhuma venda selecionada!');
        return;
    }

    const confirmacao = confirm(`Tem certeza que deseja excluir ${ids.length} venda(s) selecionada(s)?`);
    if (confirmacao) {
        // Remover vendas selecionadas
        vendas = vendas.filter(venda => !ids.includes(venda.id));

        // Salvar dados
        salvarDados();

        // Atualizar vendas
        atualizarVendas();
        deselecionarTodasVendas();

        alert(`✅ ${ids.length} venda(s) excluída(s) com sucesso!`);
    }
}

// Função para limpar filtros de vendas
function limparFiltrosVendas() {
    document.getElementById('buscarVendas').value = '';
    document.getElementById('filtroPeriodo').value = '';
    document.getElementById('filtroValor').value = '';
    document.getElementById('ordenarVendasPor').value = 'data-desc';
    paginaAtualVendas = 1;
    deselecionarTodasVendas();
    filtrarVendas();
}

// Funções de exportação de vendas avançadas
function exportarVendasExcel() {
    if (vendas.length === 0) {
        alert('❌ Nenhuma venda para exportar!');
        return;
    }

    // Preparar dados para exportação
    const dadosExportacao = vendas.map(venda => ({
        'Data': new Date(venda.data).toLocaleDateString('pt-BR'),
        'Cliente': venda.cliente,
        'Telefone': venda.telefone || '',
        'Itens': venda.itens.map(item => `${item.receita} (${item.quantidade}x)`).join('; '),
        'Custo Total': venda.custoTotal.toFixed(2),
        'Total da Venda': venda.totalPedido.toFixed(2),
        'Lucro Total': venda.lucroTotal.toFixed(2),
        'Margem (%)': venda.margemMedia.toFixed(1)
    }));

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExportacao);

    // Definir larguras das colunas
    ws['!cols'] = [
        { wch: 12 }, // Data
        { wch: 25 }, // Cliente
        { wch: 15 }, // Telefone
        { wch: 40 }, // Itens
        { wch: 15 }, // Custo Total
        { wch: 18 }, // Total da Venda
        { wch: 15 }, // Lucro Total
        { wch: 12 }  // Margem
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Vendas');

    // Gerar nome do arquivo com data
    const agora = new Date();
    const dataFormatada = agora.toISOString().split('T')[0];
    const nomeArquivo = `vendas_${dataFormatada}.xlsx`;

    XLSX.writeFile(wb, nomeArquivo);

    alert(`✅ Relatório de vendas exportado com sucesso!\n📁 ${nomeArquivo}`);
}

function exportarVendasPDF() {
    if (vendas.length === 0) {
        alert('❌ Nenhuma venda para exportar!');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configurar fonte
    doc.setFont('helvetica');

    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Vendas', 20, 20);

    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 30);
    doc.text(`Total de vendas: ${vendas.length}`, 20, 40);

    // Resumo
    const totalVendas = vendas.reduce((sum, v) => sum + v.totalPedido, 0);
    const totalLucro = vendas.reduce((sum, v) => sum + v.lucroTotal, 0);
    const margemMedia = vendas.length > 0 ? vendas.reduce((sum, v) => sum + v.margemMedia, 0) / vendas.length : 0;

    doc.text(`Total em vendas: R$ ${totalVendas.toFixed(2)}`, 20, 50);
    doc.text(`Total em lucro: R$ ${totalLucro.toFixed(2)}`, 20, 60);
    doc.text(`Margem média: ${margemMedia.toFixed(1)}%`, 20, 70);

    // Linha separadora
    doc.line(20, 80, 190, 80);

    // Cabeçalho da tabela
    let yPos = 95;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    doc.text('Data', 20, yPos);
    doc.text('Cliente', 45, yPos);
    doc.text('Total', 100, yPos);
    doc.text('Lucro', 130, yPos);
    doc.text('Margem', 160, yPos);

    yPos += 5;
    doc.line(20, yPos, 190, yPos);

    // Dados das vendas
    doc.setFont('helvetica', 'normal');
    yPos += 10;

    vendas.forEach((venda, index) => {
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        doc.text(venda.data.split('-').reverse().join('/'), 20, yPos);
        doc.text(venda.cliente.substring(0, 20), 45, yPos);
        doc.text(`R$ ${venda.totalPedido.toFixed(2)}`, 100, yPos);
        doc.text(`R$ ${venda.lucroTotal.toFixed(2)}`, 130, yPos);
        doc.text(`${venda.margemMedia.toFixed(1)}%`, 160, yPos);

        yPos += 8;
    });

    // Salvar PDF
    const agora = new Date();
    const dataFormatada = agora.toISOString().split('T')[0];
    const nomeArquivo = `relatorio_vendas_${dataFormatada}.pdf`;

    doc.save(nomeArquivo);

    alert(`✅ Relatório de vendas PDF gerado com sucesso!\n📁 ${nomeArquivo}`);
}

// Variáveis de personalização
let personalizacao = {
    nomeEmpresa: 'Doce Controle',
    logo: null,
    logoTipo: 'emoji', // 'emoji' ou 'imagem'
    emoji: '🧁',
    tema: 'rosa',
    coresPersonalizadas: {
        primaria: '#ec4899',
        secundaria: '#a855f7',
        ativo: false
    },
    modoEscuro: false,
    transparencia: 1,
    padrao: 'padrao',
    fundoPersonalizado: null
};

// Funções de personalização básica
function selecionarEmoji(emoji) {
    personalizacao.emoji = emoji;
    personalizacao.logoTipo = 'emoji';
    personalizacao.logo = null;

    document.getElementById('previewLogo').innerHTML = emoji;

    // Atualizar emoji na sidebar e header
    ['sidebarLogo', 'mobileLogo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = emoji;
            el.innerHTML = emoji;
        }
    });

    // Esconder preview de logo se estiver visível
    document.getElementById('logoPreview').classList.add('hidden');

    salvarPersonalizacaoLocal();
}

function atualizarNomeEmpresa() {
    const nome = document.getElementById('nomeEmpresa').value;
    personalizacao.nomeEmpresa = nome;

    document.getElementById('previewNome').textContent = nome;

    // Atualizar nome na sidebar e header
    ['sidebarTitle', 'mobileTitle'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = nome;
    });

    salvarPersonalizacaoLocal();
}

// Funções de logo
function processarLogo(input) {
    const file = input.files[0];
    if (!file) return;

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('❌ Arquivo muito grande! O logo deve ter no máximo 2MB.');
        return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
        alert('❌ Formato inválido! Use PNG, JPG ou SVG.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const logoData = e.target.result;

        personalizacao.logo = logoData;
        personalizacao.logoTipo = 'imagem';

        // Mostrar preview
        document.getElementById('logoImage').src = logoData;
        document.getElementById('logoPreview').classList.remove('hidden');

        // Atualizar preview
        document.getElementById('previewLogo').innerHTML = `<img src="${logoData}" alt="Logo" class="h-8 w-auto">`;

        // Atualizar logo na sidebar e header
        ['sidebarLogo', 'mobileLogo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<img src="${logoData}" alt="Logo" class="h-8 w-auto">`;
        });

        salvarPersonalizacaoLocal();
        alert('✅ Logo carregado com sucesso!');
    };

    reader.readAsDataURL(file);
}

function removerLogo() {
    personalizacao.logo = null;
    personalizacao.logoTipo = 'emoji';

    document.getElementById('logoPreview').classList.add('hidden');
    document.getElementById('logoUpload').value = '';

    // Voltar para emoji
    const emoji = personalizacao.emoji;
    document.getElementById('previewLogo').innerHTML = emoji;

    // Atualizar sidebar e header
    ['sidebarLogo', 'mobileLogo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = emoji;
            el.innerHTML = emoji;
        }
    });

    salvarPersonalizacaoLocal();
    alert('✅ Logo removido com sucesso!');
}

// Funções de tema
function aplicarTema(tema) {
    personalizacao.tema = tema;
    personalizacao.coresPersonalizadas.ativo = false;

    // Remover classes de tema atual e estilos personalizados
    document.body.className = document.body.className.replace(/bg-gradient-to-br from-\w+-50 to-\w+-50/, '');
    document.body.style.background = '';

    // Aplicar novo tema baseado no modo escuro
    let temas;
    if (personalizacao.modoEscuro) {
        temas = {
            'rosa': 'bg-gradient-to-br from-gray-900 to-pink-900',
            'azul': 'bg-gradient-to-br from-gray-900 to-blue-900',
            'verde': 'bg-gradient-to-br from-gray-900 to-green-900',
            'roxo': 'bg-gradient-to-br from-gray-900 to-purple-900'
        };
    } else {
        temas = {
            'rosa': 'bg-gradient-to-br from-pink-50 to-purple-50',
            'azul': 'bg-gradient-to-br from-blue-50 to-indigo-50',
            'verde': 'bg-gradient-to-br from-green-50 to-emerald-50',
            'roxo': 'bg-gradient-to-br from-purple-50 to-violet-50'
        };
    }

    document.body.className += ' ' + temas[tema];

    // Aplicar estilos dinâmicos (cores dos botões)
    if (CORES_TEMAS[tema]) {
        atualizarEstilosDinamicos(CORES_TEMAS[tema].primaria, CORES_TEMAS[tema].secundaria);
    }

    // Atualizar botões de tema
    document.querySelectorAll('.tema-btn').forEach(btn => {
        btn.classList.remove('border-pink-300', 'border-blue-300', 'border-green-300', 'border-purple-300');
        btn.classList.add('border-gray-300');
    });

    if (event && event.target) {
        event.target.closest('.tema-btn').classList.remove('border-gray-300');
        event.target.closest('.tema-btn').classList.add(`border-${tema === 'rosa' ? 'pink' : tema === 'azul' ? 'blue' : tema === 'verde' ? 'green' : 'purple'}-300`);
    }

    salvarPersonalizacaoLocal();
}

// Funções de cores personalizadas
function aplicarCoresPersonalizadas() {
    const corPrimaria = document.getElementById('corPrimaria').value;
    const corSecundaria = document.getElementById('corSecundaria').value;

    // Atualizar variáveis
    personalizacao.coresPersonalizadas.primaria = corPrimaria;
    personalizacao.coresPersonalizadas.secundaria = corSecundaria;
    personalizacao.coresPersonalizadas.ativo = true;
    personalizacao.tema = 'personalizado';

    // Aplicar cores ao fundo
    aplicarGradientePersonalizado(corPrimaria, corSecundaria);

    // Aplicar cores aos botões
    atualizarEstilosDinamicos(corPrimaria, corSecundaria);

    // Atualizar preview
    atualizarPreviewCores();

    // Desmarcar temas predefinidos
    document.querySelectorAll('.tema-btn').forEach(btn => {
        btn.classList.remove('border-pink-300', 'border-blue-300', 'border-green-300', 'border-purple-300');
        btn.classList.add('border-gray-300');
    });

    salvarPersonalizacaoLocal();

    // Mostrar feedback
    mostrarFeedbackCores('✨ Cores personalizadas aplicadas com sucesso!');
}

function aplicarGradientePersonalizado(corPrimaria, corSecundaria) {
    // Remover classes de tema
    document.body.className = document.body.className.replace(/bg-gradient-to-br from-\w+-50 to-\w+-50/, '');

    // Converter cores hex para RGB para criar tons mais claros
    const rgb1 = hexToRgb(corPrimaria);
    const rgb2 = hexToRgb(corSecundaria);

    // Criar tons mais claros (adicionar branco)
    const cor1Clara = `rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.1)`;
    const cor2Clara = `rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, 0.1)`;

    if (personalizacao.modoEscuro) {
        // Modo escuro: usar cores mais escuras
        const cor1Escura = `rgba(${Math.max(0, rgb1.r - 100)}, ${Math.max(0, rgb1.g - 100)}, ${Math.max(0, rgb1.b - 100)}, 0.8)`;
        const cor2Escura = `rgba(${Math.max(0, rgb2.r - 100)}, ${Math.max(0, rgb2.g - 100)}, ${Math.max(0, rgb2.b - 100)}, 0.8)`;
        document.body.style.background = `linear-gradient(135deg, ${cor1Escura}, ${cor2Escura})`;
    } else {
        // Modo claro: usar tons suaves
        document.body.style.background = `linear-gradient(135deg, ${cor1Clara}, ${cor2Clara})`;
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function sincronizarCorPrimaria() {
    const hex = document.getElementById('corPrimariaHex').value;
    if (isValidHex(hex)) {
        document.getElementById('corPrimaria').value = hex;
        document.getElementById('corPrimariaHex').value = hex;
        atualizarPreviewCores();
    }
}

function sincronizarCorSecundaria() {
    const hex = document.getElementById('corSecundariaHex').value;
    if (isValidHex(hex)) {
        document.getElementById('corSecundaria').value = hex;
        document.getElementById('corSecundariaHex').value = hex;
        atualizarPreviewCores();
    }
}

function isValidHex(hex) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

function atualizarPreviewCores() {
    const corPrimaria = document.getElementById('corPrimaria').value;
    const corSecundaria = document.getElementById('corSecundaria').value;

    // Sincronizar inputs
    document.getElementById('corPrimariaHex').value = corPrimaria;
    document.getElementById('corSecundariaHex').value = corSecundaria;

    // Atualizar preview
    document.getElementById('previewGradiente').style.background = `linear-gradient(135deg, ${corPrimaria}, ${corSecundaria})`;
    document.getElementById('previewPrimaria').textContent = corPrimaria;
    document.getElementById('previewSecundaria').textContent = corSecundaria;
}

function gerarPaletaAleatoria() {
    // Gerar cores aleatórias harmoniosas
    const hue1 = Math.floor(Math.random() * 360);
    const hue2 = (hue1 + 60 + Math.random() * 120) % 360; // Cores complementares ou análogas

    const saturation = 70 + Math.random() * 30; // 70-100%
    const lightness = 45 + Math.random() * 20; // 45-65%

    const cor1 = hslToHex(hue1, saturation, lightness);
    const cor2 = hslToHex(hue2, saturation, lightness);

    // Aplicar cores
    document.getElementById('corPrimaria').value = cor1;
    document.getElementById('corSecundaria').value = cor2;

    atualizarPreviewCores();
    mostrarFeedbackCores('🎲 Paleta aleatória gerada!');
}

function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function aplicarPaletaSugerida(cor1, cor2) {
    document.getElementById('corPrimaria').value = cor1;
    document.getElementById('corSecundaria').value = cor2;

    atualizarPreviewCores();
    mostrarFeedbackCores('💡 Paleta sugerida aplicada!');
}

function mostrarFeedbackCores(mensagem) {
    // Criar elemento de feedback temporário
    const feedback = document.createElement('div');
    feedback.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300';
    feedback.textContent = mensagem;

    document.body.appendChild(feedback);

    // Remover após 3 segundos
    setTimeout(() => {
        feedback.style.opacity = '0';
        feedback.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }, 2000);
}

// Função de modo escuro
function toggleModoEscuro() {
    personalizacao.modoEscuro = document.getElementById('modoEscuro').checked;

    if (personalizacao.modoEscuro) {
        // Aplicar modo escuro
        document.documentElement.classList.add('dark');
        document.body.style.filter = 'invert(1) hue-rotate(180deg)';
        document.querySelectorAll('img, video, svg, .no-invert').forEach(el => {
            el.style.filter = 'invert(1) hue-rotate(180deg)';
        });
    } else {
        // Remover modo escuro
        document.documentElement.classList.remove('dark');
        document.body.style.filter = '';
        document.querySelectorAll('img, video, svg, .no-invert').forEach(el => {
            el.style.filter = '';
        });
    }

    // Reaplicar tema com nova configuração
    aplicarTema(personalizacao.tema);
    salvarPersonalizacaoLocal();
}

// Função de transparência
function ajustarTransparencia(valor) {
    personalizacao.transparencia = parseFloat(valor);

    // Aplicar transparência aos cards
    document.querySelectorAll('.bg-white').forEach(el => {
        if (!el.closest('header')) { // Não aplicar no header
            el.style.opacity = valor;
        }
    });

    salvarPersonalizacaoLocal();
}

// Funções de padrões de fundo
function aplicarPadrao(padrao) {
    personalizacao.padrao = padrao;

    // Remover padrões anteriores
    document.body.style.backgroundImage = '';
    document.body.style.backgroundColor = '';

    // Aplicar novo padrão
    switch (padrao) {
        case 'padrao':
            // Manter gradiente do tema
            break;
        case 'solido':
            document.body.className = document.body.className.replace(/bg-gradient-to-br from-\w+-50 to-\w+-50/, '');
            document.body.style.backgroundColor = personalizacao.modoEscuro ? '#1f2937' : '#f9fafb';
            break;
        case 'geometrico':
            document.body.style.backgroundImage = 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)';
            break;
        case 'ondas':
            document.body.style.backgroundImage = 'radial-gradient(circle at 25% 25%, rgba(0,0,0,0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(0,0,0,0.05) 0%, transparent 50%)';
            break;
        case 'pontos':
            document.body.style.backgroundImage = 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)';
            document.body.style.backgroundSize = '20px 20px';
            break;
        case 'listras':
            document.body.style.backgroundImage = 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)';
            break;
    }

    // Atualizar botões de padrão
    document.querySelectorAll('.padrao-btn').forEach(btn => {
        btn.classList.remove('border-pink-300');
        btn.classList.add('border-gray-300');
    });

    event.target.closest('.padrao-btn').classList.remove('border-gray-300');
    event.target.closest('.padrao-btn').classList.add('border-pink-300');

    salvarPersonalizacaoLocal();
}

// Funções de fundo personalizado
function processarFundoPersonalizado(input) {
    const file = input.files[0];
    if (!file) return;

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ Arquivo muito grande! A imagem deve ter no máximo 5MB.');
        return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
        alert('❌ Formato inválido! Use JPG ou PNG.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const fundoData = e.target.result;

        personalizacao.fundoPersonalizado = fundoData;

        // Aplicar fundo
        document.body.style.backgroundImage = `url(${fundoData})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';

        // Mostrar preview
        document.getElementById('fundoPreview').classList.remove('hidden');

        salvarPersonalizacaoLocal();
        alert('✅ Fundo personalizado aplicado com sucesso!');
    };

    reader.readAsDataURL(file);
}

function removerFundoPersonalizado() {
    personalizacao.fundoPersonalizado = null;

    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundAttachment = '';

    document.getElementById('fundoPreview').classList.add('hidden');
    document.getElementById('fundoUpload').value = '';

    // Reaplicar padrão atual
    aplicarPadrao(personalizacao.padrao);

    salvarPersonalizacaoLocal();
    alert('✅ Fundo personalizado removido!');
}

// Funções de gerenciamento de personalização
function salvarPersonalizacaoLocal() {
    db.save('personalizacao', personalizacao);
    atualizarStatusPersonalizacao();
}

function salvarPersonalizacao() {
    salvarPersonalizacaoLocal();
    alert('✅ Personalização salva com sucesso!\n\nTodas as suas configurações foram preservadas.');
}

function carregarPersonalizacao() {
    const personalizacaoSalva = db.get('personalizacao');
    if (personalizacaoSalva) {
        personalizacao = { ...personalizacao, ...personalizacaoSalva };
        aplicarPersonalizacao();
    }
}

function aplicarPersonalizacao() {
    // Aplicar nome da empresa
    if (document.getElementById('nomeEmpresa')) {
        document.getElementById('nomeEmpresa').value = personalizacao.nomeEmpresa;
        atualizarNomeEmpresa();
    }

    // Aplicar logo
    if (personalizacao.logoTipo === 'imagem' && personalizacao.logo) {
        if (document.getElementById('logoImage')) {
            document.getElementById('logoImage').src = personalizacao.logo;
            document.getElementById('logoPreview').classList.remove('hidden');
        }
        if (document.getElementById('previewLogo')) {
            document.getElementById('previewLogo').innerHTML = `<img src="${personalizacao.logo}" alt="Logo" class="h-8 w-auto">`;
        }

        // Atualizar logo na sidebar e header
        ['sidebarLogo', 'mobileLogo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<img src="${personalizacao.logo}" alt="Logo" class="h-8 w-auto">`;
        });
    } else {
        selecionarEmoji(personalizacao.emoji);
    }

    // Aplicar cores personalizadas
    if (personalizacao.coresPersonalizadas && personalizacao.coresPersonalizadas.ativo) {
        if (document.getElementById('corPrimaria')) {
            document.getElementById('corPrimaria').value = personalizacao.coresPersonalizadas.primaria;
            document.getElementById('corSecundaria').value = personalizacao.coresPersonalizadas.secundaria;
            atualizarPreviewCores();
            aplicarGradientePersonalizado(personalizacao.coresPersonalizadas.primaria, personalizacao.coresPersonalizadas.secundaria);
            atualizarEstilosDinamicos(personalizacao.coresPersonalizadas.primaria, personalizacao.coresPersonalizadas.secundaria);
        }
    } else {
        // Aplicar tema predefinido
        aplicarTema(personalizacao.tema);
    }

    // Aplicar modo escuro
    if (document.getElementById('modoEscuro')) {
        document.getElementById('modoEscuro').checked = personalizacao.modoEscuro;
        if (personalizacao.modoEscuro) {
            toggleModoEscuro();
        }
    }

    // Aplicar transparência
    if (document.getElementById('transparenciaSlider')) {
        document.getElementById('transparenciaSlider').value = personalizacao.transparencia;
        ajustarTransparencia(personalizacao.transparencia);
    }

    // Aplicar padrão
    aplicarPadrao(personalizacao.padrao);

    // Aplicar fundo personalizado
    if (personalizacao.fundoPersonalizado) {
        document.body.style.backgroundImage = `url(${personalizacao.fundoPersonalizado})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
        if (document.getElementById('fundoPreview')) {
            document.getElementById('fundoPreview').classList.remove('hidden');
        }
    }

    atualizarStatusPersonalizacao();
}

function exportarConfiguracoes() {
    const configuracaoCompleta = {
        personalizacao: personalizacao,
        configuracoes: configuracoes,
        versao: '1.0',
        dataExportacao: new Date().toISOString()
    };

    const dataStr = JSON.stringify(configuracaoCompleta, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `configuracoes_personalizacao_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    alert('✅ Configurações exportadas com sucesso!\n\n📁 Arquivo: ' + link.download);
}

function importarConfiguracoes() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const config = JSON.parse(e.target.result);

                if (!config.personalizacao) {
                    throw new Error('Arquivo de configuração inválido');
                }

                const confirmacao = confirm(
                    `Confirma a importação das configurações?\n\n` +
                    `📅 Exportado em: ${new Date(config.dataExportacao).toLocaleDateString('pt-BR')}\n\n` +
                    `⚠️ ATENÇÃO: Suas configurações atuais serão substituídas!`
                );

                if (confirmacao) {
                    personalizacao = { ...personalizacao, ...config.personalizacao };
                    if (config.configuracoes) {
                        configuracoes = { ...configuracoes, ...config.configuracoes };
                    }

                    aplicarPersonalizacao();
                    salvarPersonalizacaoLocal();

                    alert('✅ Configurações importadas com sucesso!\n\nTodas as personalizações foram aplicadas.');
                }

            } catch (error) {
                alert('❌ Erro ao importar configurações: ' + error.message);
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

function restaurarPadraoPersonalizacao() {
    const confirmacao = confirm(
        '🔄 Restaurar Configurações Padrão\n\n' +
        'Tem certeza que deseja restaurar todas as configurações para o padrão?\n\n' +
        '⚠️ Esta ação não pode ser desfeita!'
    );

    if (confirmacao) {
        // Resetar personalização
        personalizacao = {
            nomeEmpresa: 'Doce Controle',
            logo: null,
            logoTipo: 'emoji',
            emoji: '🧁',
            tema: 'rosa',
            coresPersonalizadas: {
                primaria: '#ec4899',
                secundaria: '#a855f7',
                ativo: false
            },
            modoEscuro: false,
            transparencia: 1,
            padrao: 'padrao',
            fundoPersonalizado: null
        };

        // Limpar localStorage
        localStorage.removeItem('personalizacao');

        // Aplicar configurações padrão
        aplicarPersonalizacao();

        alert('✅ Configurações restauradas para o padrão!\n\nTodas as personalizações foram removidas.');
    }
}

function previewPersonalizacao() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
                <div class="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-gray-800">👁️ Preview da Personalização</h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h4 class="font-semibold text-gray-800 mb-3">📋 Configurações Atuais</h4>
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div><strong>Nome:</strong> ${personalizacao.nomeEmpresa}</div>
                                <div><strong>Logo:</strong> ${personalizacao.logoTipo === 'imagem' ? 'Imagem personalizada' : personalizacao.emoji}</div>
                                <div><strong>Tema:</strong> ${personalizacao.tema.charAt(0).toUpperCase() + personalizacao.tema.slice(1)}</div>
                                <div><strong>Modo Escuro:</strong> ${personalizacao.modoEscuro ? 'Ativado' : 'Desativado'}</div>
                                <div><strong>Transparência:</strong> ${Math.round(personalizacao.transparencia * 100)}%</div>
                                <div><strong>Padrão:</strong> ${personalizacao.padrao.charAt(0).toUpperCase() + personalizacao.padrao.slice(1)}</div>
                            </div>
                        </div>
                        
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 class="font-semibold text-blue-800 mb-2">💡 Dicas de Personalização</h4>
                            <ul class="text-blue-700 text-sm space-y-1">
                                <li>• Use logos em formato PNG para melhor qualidade</li>
                                <li>• O modo escuro reduz o cansaço visual</li>
                                <li>• Padrões sutis melhoram a legibilidade</li>
                                <li>• Salve suas configurações regularmente</li>
                            </ul>
                        </div>
                        
                        <div class="flex space-x-3">
                            <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg transition-colors">
                                Fechar
                            </button>
                            <button onclick="salvarPersonalizacao(); this.closest('.fixed').remove()" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors">
                                💾 Salvar e Fechar
                            </button>
                        </div>
                    </div>
                </div>
            `;

    document.body.appendChild(modal);
}

function atualizarStatusPersonalizacao() {
    const status = document.getElementById('statusPersonalizacao');
    const ultima = document.getElementById('ultimaPersonalizacao');

    let modificacoes = 0;
    if (personalizacao.nomeEmpresa !== 'Doce Controle') modificacoes++;
    if (personalizacao.logoTipo === 'imagem') modificacoes++;
    if (personalizacao.emoji !== '🧁') modificacoes++;
    if (personalizacao.tema !== 'rosa' || personalizacao.coresPersonalizadas.ativo) modificacoes++;
    if (personalizacao.coresPersonalizadas.ativo) modificacoes++;
    if (personalizacao.modoEscuro) modificacoes++;
    if (personalizacao.transparencia !== 1) modificacoes++;
    if (personalizacao.padrao !== 'padrao') modificacoes++;
    if (personalizacao.fundoPersonalizado) modificacoes++;

    if (modificacoes === 0) {
        status.textContent = 'Configurações padrão ativas';
    } else {
        status.textContent = `${modificacoes} personalização(ões) ativa(s)`;
    }

    ultima.textContent = new Date().toLocaleString('pt-BR');
}

// Funções auxiliares
function excluirProduto(id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        produtos = produtos.filter(p => p.id !== id);
        salvarDados();
        atualizarDashboard();
        alert('✅ Produto excluído com sucesso!');
    }
}

function editarReceita(id) {
    const receita = receitas.find(r => r.id === id);
    if (!receita) return;

    // Abrir modal primeiro para evitar limpar os campos depois
    openModal('modalReceita');

    // Definir que estamos editando
    receitaEditando = id;

    // Atualizar título do modal
    document.getElementById('tituloModalReceita').textContent = 'Editar Receita';
    document.getElementById('btnSalvarReceita').textContent = 'Atualizar Receita';

    // Preencher campos básicos
    document.getElementById('nomeReceita').value = receita.nome;
    document.getElementById('rendimentoReceita').value = receita.rendimento;
    document.getElementById('modoPreparoReceita').value = receita.modoPreparo || '';
    document.getElementById('margemLucro').value = receita.margemLucro || 200;
    document.getElementById('meuPreco').value = receita.precoVenda || '';

    // Limpar ingredientes existentes
    const container = document.getElementById('ingredientesReceita');
    container.innerHTML = '';

    // Adicionar ingredientes da receita
    receita.ingredientes.forEach((ingrediente, index) => {
        const newRow = document.createElement('div');
        newRow.className = 'flex space-x-2 ingrediente-row';
        newRow.innerHTML = `
                    <select class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ingrediente-select" onchange="calcularCustoReceita()">
                        <option value="">Selecione um ingrediente</option>
                    </select>
                    <input type="number" placeholder="Qtd" min="0.01" step="0.01" class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent quantidade-ingrediente" onchange="calcularCustoReceita()">
                    <button type="button" onclick="removerIngrediente(this)" class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">🗑️</button>
                `;
        container.appendChild(newRow);

        // Preencher select com produtos
        const select = newRow.querySelector('.ingrediente-select');
        const quantidadeInput = newRow.querySelector('.quantidade-ingrediente');

        produtos.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = `${produto.nome} (${produto.unidade})`;
            if (produto.id === ingrediente.produtoId) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        quantidadeInput.value = ingrediente.quantidade;
    });

    // Calcular custos
    setTimeout(() => {
        calcularCustoReceita();
    }, 100);
}

function excluirReceita(id) {
    if (confirm('Tem certeza que deseja excluir esta receita?')) {
        receitas = receitas.filter(r => r.id !== id);
        salvarDados();
        atualizarReceitas();
        alert('✅ Receita excluída com sucesso!');
    }
}

function verDetalhesVenda(id) {
    const venda = vendas.find(v => v.id === id);
    if (venda) {
        const detalhes = venda.itens.map(item =>
            `${item.receita}: ${item.quantidade}x R$ ${item.preco.toFixed(2)} = R$ ${item.total.toFixed(2)}`
        ).join('\n');

        alert(`Detalhes da Venda #${id}\n\nCliente: ${venda.cliente}\nData: ${new Date(venda.data).toLocaleDateString('pt-BR')}\n\nItens:\n${detalhes}\n\nTotal: R$ ${venda.totalPedido.toFixed(2)}\nLucro: R$ ${venda.lucroTotal.toFixed(2)}`);
    }
}

function excluirVenda(id) {
    if (confirm('Tem certeza que deseja excluir esta venda?')) {
        vendas = vendas.filter(v => v.id !== id);
        salvarDados();
        atualizarVendas();
        alert('✅ Venda excluída com sucesso!');
    }
}

// Funções de configuração
function salvarLimites() {
    // Atualizar limites nas configurações
    const unidades = ['kg', 'g', 'L', 'ml', 'un', 'cx', 'pct'];

    unidades.forEach(unidade => {
        const minInput = document.getElementById(`limite-${unidade}-min`);
        const maxInput = document.getElementById(`limite-${unidade}-max`);

        if (minInput && maxInput) {
            configuracoes.limites[unidade] = {
                min: parseFloat(minInput.value) || 0,
                max: parseFloat(maxInput.value) || 0
            };
        }
    });

    // Atualizar resumo
    atualizarResumoLimites();

    // Atualizar dashboard se estiver visível
    if (!document.getElementById('dashboard').classList.contains('hidden')) {
        atualizarDashboard();
    }

    // Salvar no db
    db.save('configuracoes', configuracoes);
}

function atualizarResumoLimites() {
    const container = document.getElementById('resumoLimites');
    container.innerHTML = '';

    Object.entries(configuracoes.limites).forEach(([unidade, limites]) => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-lg p-3 text-center border border-purple-200';
        div.innerHTML = `
                    <div class="font-bold text-purple-800">${unidade}</div>
                    <div class="text-xs text-purple-600">Min: ${limites.min}</div>
                    <div class="text-xs text-purple-600">Max: ${limites.max}</div>
                `;
        container.appendChild(div);
    });
}

function restaurarPadroes() {
    if (confirm('Tem certeza que deseja restaurar os limites padrão? Esta ação não pode ser desfeita.')) {
        // Restaurar valores padrão
        configuracoes.limites = {
            'kg': { min: 1, max: 10 },
            'g': { min: 100, max: 1000 },
            'L': { min: 1, max: 10 },
            'ml': { min: 100, max: 1000 },
            'un': { min: 5, max: 50 },
            'cx': { min: 2, max: 20 },
            'pct': { min: 3, max: 30 }
        };

        // Atualizar inputs
        Object.entries(configuracoes.limites).forEach(([unidade, limites]) => {
            const minInput = document.getElementById(`limite-${unidade}-min`);
            const maxInput = document.getElementById(`limite-${unidade}-max`);

            if (minInput && maxInput) {
                minInput.value = limites.min;
                maxInput.value = limites.max;
            }
        });

        // Atualizar resumo
        atualizarResumoLimites();

        // Salvar
        db.save('configuracoes', configuracoes);

        alert('✅ Limites restaurados para os valores padrão!');
    }
}

function salvarConfiguracoes() {
    // Atualizar notificações
    configuracoes.notificacoes.estoqueBaixo = document.getElementById('notificarEstoqueBaixo').checked;
    configuracoes.notificacoes.vencimento = document.getElementById('notificarVencimento').checked;
    configuracoes.notificacoes.whatsapp = document.getElementById('notificarWhatsApp').checked;
    configuracoes.notificacoes.automatica = document.getElementById('notificacaoAutomatica')?.checked || false;
    configuracoes.notificacoes.diasAntecedencia = parseInt(document.getElementById('diasAntecedencia').value) || 7;

    // Atualizar contatos
    configuracoes.contato.whatsapp = document.getElementById('whatsappContato')?.value || '';
    configuracoes.contato.email = document.getElementById('emailContato')?.value || '';

    // Atualizar moeda
    configuracoes.moeda = document.getElementById('moeda').value;

    // Mostrar/esconder configurações de contato
    const configContato = document.getElementById('configContato');
    if (configuracoes.notificacoes.whatsapp) {
        configContato.classList.remove('hidden');
    } else {
        configContato.classList.add('hidden');
    }

    // Configurar notificação automática
    configurarNotificacaoAutomatica();

    // Salvar no db
    db.save('configuracoes', configuracoes);
}

function carregarConfiguracoes() {
    // Carregar do db
    const configSalvas = db.get('configuracoes');
    if (configSalvas) {
        configuracoes = { ...configuracoes, ...configSalvas };
    }

    // Aplicar aos inputs
    Object.entries(configuracoes.limites).forEach(([unidade, limites]) => {
        const minInput = document.getElementById(`limite-${unidade}-min`);
        const maxInput = document.getElementById(`limite-${unidade}-max`);

        if (minInput && maxInput) {
            minInput.value = limites.min;
            maxInput.value = limites.max;
        }
    });

    // Aplicar notificações
    document.getElementById('notificarEstoqueBaixo').checked = configuracoes.notificacoes.estoqueBaixo;
    document.getElementById('notificarVencimento').checked = configuracoes.notificacoes.vencimento;
    document.getElementById('notificarWhatsApp').checked = configuracoes.notificacoes.whatsapp;
    if (document.getElementById('notificacaoAutomatica')) {
        document.getElementById('notificacaoAutomatica').checked = configuracoes.notificacoes.automatica;
    }
    document.getElementById('diasAntecedencia').value = configuracoes.notificacoes.diasAntecedencia;

    // Aplicar contatos
    if (document.getElementById('whatsappContato')) {
        document.getElementById('whatsappContato').value = configuracoes.contato.whatsapp;
    }
    if (document.getElementById('emailContato')) {
        document.getElementById('emailContato').value = configuracoes.contato.email;
    }

    // Aplicar moeda
    document.getElementById('moeda').value = configuracoes.moeda;

    // Atualizar resumo
    atualizarResumoLimites();

    // Configurar visibilidade de contatos
    salvarConfiguracoes();
}

function exportarBackup() {
    const backup = {
        produtos,
        receitas,
        vendas,
        configuracoes,
        categorias,
        versao: '1.0',
        dataExportacao: new Date().toISOString()
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `backup_doce_controle_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    alert('✅ Backup exportado com sucesso!\n\n📁 Arquivo salvo como: ' + link.download);
}

function importarBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const backup = JSON.parse(e.target.result);

                // Validar estrutura do backup
                if (!backup.produtos || !backup.receitas || !backup.vendas) {
                    throw new Error('Arquivo de backup inválido');
                }

                const confirmacao = confirm(
                    `Confirma a importação do backup?\n\n` +
                    `📦 ${backup.produtos.length} produtos\n` +
                    `📝 ${backup.receitas.length} receitas\n` +
                    `💰 ${backup.vendas.length} vendas\n` +
                    `📅 Exportado em: ${new Date(backup.dataExportacao).toLocaleDateString('pt-BR')}\n\n` +
                    `⚠️ ATENÇÃO: Todos os dados atuais serão substituídos!`
                );

                if (confirmacao) {
                    // Restaurar dados
                    produtos = backup.produtos || [];
                    receitas = backup.receitas || [];
                    vendas = backup.vendas || [];
                    configuracoes = { ...configuracoes, ...(backup.configuracoes || {}) };
                    categorias = backup.categorias || categorias;

                    // Atualizar IDs
                    proximoIdProduto = Math.max(...produtos.map(p => p.id), 0) + 1;
                    proximoIdReceita = Math.max(...receitas.map(r => r.id), 0) + 1;
                    proximoIdVenda = Math.max(...vendas.map(v => v.id), 0) + 1;

                    // Salvar no db
                    db.save('configuracoes', configuracoes);

                    // Recarregar configurações
                    carregarConfiguracoes();

                    // Atualizar todas as seções
                    atualizarDashboard();
                    atualizarReceitas();
                    atualizarVendas();
                    atualizarEstatisticasCategorias();

                    alert('✅ Backup importado com sucesso!\n\nTodos os dados foram restaurados.');
                }

            } catch (error) {
                alert('❌ Erro ao importar backup: ' + error.message);
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

function adicionarCategoria() {
    const input = document.getElementById('novaCategoria');
    const nome = input.value.trim();

    if (!nome) {
        alert('⚠️ Por favor, digite o nome da categoria!');
        return;
    }

    if (categorias.some(c => c.toLowerCase() === nome.toLowerCase())) {
        alert('⚠️ Esta categoria já existe!');
        return;
    }

    categorias.push(nome);
    input.value = '';

    // Salvar dados
    salvarDados();

    // Atualizar lista visual
    atualizarListaCategorias();

    // Atualizar selects de categoria
    atualizarSelectsCategorias();

    // Atualizar estatísticas
    atualizarEstatisticasCategorias();

    alert('✅ Categoria adicionada com sucesso!');
}

function removerCategoria(nome) {
    // Verificar se há produtos usando esta categoria
    const produtosCategoria = produtos.filter(p => p.categoria === nome);

    if (produtosCategoria.length > 0) {
        const confirmacao = confirm(
            `A categoria "${nome}" está sendo usada por ${produtosCategoria.length} produto(s).\n\n` +
            `Se você remover esta categoria, estes produtos ficarão sem categoria.\n\n` +
            `Deseja continuar?`
        );

        if (!confirmacao) return;

        // Remover categoria dos produtos
        produtos.forEach(produto => {
            if (produto.categoria === nome) {
                produto.categoria = 'Sem Categoria';
            }
        });
    }

    // Remover categoria da lista
    const index = categorias.indexOf(nome);
    if (index > -1) {
        categorias.splice(index, 1);
    }

    // Atualizar lista visual
    atualizarListaCategorias();

    // Atualizar selects de categoria
    atualizarSelectsCategorias();

    // Atualizar estatísticas
    atualizarEstatisticasCategorias();

    // Atualizar dashboard se necessário
    if (produtosCategoria.length > 0) {
        atualizarDashboard();
    }

    alert('✅ Categoria removida com sucesso!');
}

function atualizarListaCategorias() {
    const container = document.getElementById('listaCategorias');
    container.innerHTML = '';

    categorias.forEach(categoria => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        div.innerHTML = `
                    <span class="font-medium categoria-nome" data-categoria="${categoria}">${categoria}</span>
                    <div class="flex space-x-2">
                        <button onclick="editarCategoria('${categoria}')" class="text-blue-500 hover:text-blue-700" title="Editar categoria">✏️</button>
                        <button onclick="removerCategoria('${categoria}')" class="text-red-500 hover:text-red-700" title="Excluir categoria">🗑️</button>
                    </div>
                `;
        container.appendChild(div);
    });
}

function editarCategoria(categoriaAntiga) {
    const novoNome = prompt(`Editar categoria:\n\nNome atual: ${categoriaAntiga}\n\nDigite o novo nome:`, categoriaAntiga);

    if (!novoNome || novoNome.trim() === '') {
        return;
    }

    const nomeFormatado = novoNome.trim();

    if (nomeFormatado === categoriaAntiga) {
        return; // Não houve mudança
    }

    if (categorias.includes(nomeFormatado)) {
        alert('⚠️ Já existe uma categoria com este nome!');
        return;
    }

    // Atualizar categoria na lista
    const index = categorias.indexOf(categoriaAntiga);
    if (index > -1) {
        categorias[index] = nomeFormatado;
    }

    // Atualizar produtos que usam esta categoria
    produtos.forEach(produto => {
        if (produto.categoria === categoriaAntiga) {
            produto.categoria = nomeFormatado;
        }
    });

    // Atualizar interface
    atualizarListaCategorias();
    atualizarSelectsCategorias();
    atualizarEstatisticasCategorias();

    // Atualizar dashboard se necessário
    if (!document.getElementById('dashboard').classList.contains('hidden')) {
        atualizarDashboard();
    }

    alert('✅ Categoria atualizada com sucesso!');
}

function atualizarSelectsCategorias() {
    // Atualizar todos os selects de categoria no sistema
    const selects = document.querySelectorAll('#categoriaItemDash, #filtroCategoria');

    selects.forEach(select => {
        const valorAtual = select.value;

        // Limpar opções (exceto a primeira)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // Adicionar categorias
        categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            select.appendChild(option);
        });

        // Restaurar valor se ainda existir
        if (categorias.includes(valorAtual)) {
            select.value = valorAtual;
        }
    });
}

function atualizarEstatisticasCategorias() {
    const container = document.getElementById('estatisticasCategorias');
    container.innerHTML = '';

    // Calcular estatísticas por categoria
    const stats = {};

    categorias.forEach(categoria => {
        const produtosCategoria = produtos.filter(p => p.categoria === categoria);
        const valorTotal = produtosCategoria.reduce((sum, p) => sum + (p.quantidade * p.preco), 0);

        stats[categoria] = {
            produtos: produtosCategoria.length,
            valor: valorTotal
        };
    });

    // Produtos sem categoria
    const produtosSemCategoria = produtos.filter(p => !categorias.includes(p.categoria));
    if (produtosSemCategoria.length > 0) {
        const valorSemCategoria = produtosSemCategoria.reduce((sum, p) => sum + (p.quantidade * p.preco), 0);
        stats['Sem Categoria'] = {
            produtos: produtosSemCategoria.length,
            valor: valorSemCategoria
        };
    }

    // Exibir estatísticas
    Object.entries(stats).forEach(([categoria, dados]) => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center';
        div.innerHTML = `
                    <span class="text-gray-700">${categoria}:</span>
                    <span class="font-medium">${dados.produtos} itens (R$ ${dados.valor.toFixed(2)})</span>
                `;
        container.appendChild(div);
    });

    if (Object.keys(stats).length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhuma categoria com produtos</p>';
    }
}

// Variáveis do scanner
let scannerAtivo = false;
let inputAtual = null;
let codigoDetectado = null;
let streamAtivo = null;

// Função para iniciar scanner
function iniciarScanner(inputId) {
    // Parar qualquer scanner anterior primeiro
    pararScannerInterno();

    inputAtual = inputId;

    // Verificar se Quagga está disponível
    if (typeof Quagga === 'undefined') {
        alert('❌ Biblioteca de scanner não carregada!\n\nPor favor, digite o código manualmente.');
        return;
    }

    // Verificar se o navegador suporta getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('❌ Seu navegador não suporta acesso à câmera!\n\nPor favor, digite o código manualmente.');
        return;
    }

    openModal('modalScanner');

    // Limpar estado anterior
    document.getElementById('resultado-scanner').classList.add('hidden');
    document.getElementById('btnUsarCodigo').disabled = true;
    document.getElementById('btnUsarCodigo').classList.add('opacity-50', 'cursor-not-allowed');
    codigoDetectado = null;

    // Aguardar um pouco para o modal aparecer
    setTimeout(() => {
        // Verificar se o modal ainda está aberto antes de iniciar
        const modal = document.getElementById('modalScanner');
        if (modal && !modal.classList.contains('hidden')) {
            inicializarQuagga();
        }
    }, 300);
}

function inicializarQuagga() {
    // Configurar Quagga
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {
                width: { min: 320, ideal: 640, max: 1280 },
                height: { min: 240, ideal: 480, max: 720 },
                facingMode: "environment"
            }
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: 2,
        frequency: 10,
        decoder: {
            readers: [
                "code_128_reader",
                "ean_reader",
                "ean_8_reader",
                "code_39_reader",
                "upc_reader",
                "upc_e_reader"
            ]
        },
        locate: true
    }, function (err) {
        if (err) {
            console.error('Erro ao inicializar Quagga:', err);
            handleScannerError(err);
            return;
        }

        console.log("✅ Scanner inicializado com sucesso");

        try {
            Quagga.start();
            scannerAtivo = true;

            // Configurar listener para detecção
            Quagga.onDetected(onBarcodeDetected);

        } catch (startErr) {
            console.error('Erro ao iniciar scanner:', startErr);
            handleScannerError(startErr);
        }
    });
}

function onBarcodeDetected(result) {
    if (!scannerAtivo) return;

    const codigo = result.codeResult.code;
    console.log("📷 Código detectado:", codigo);

    // Validar código (deve ter pelo menos 6 caracteres)
    if (codigo && codigo.length >= 6) {
        // Verificar se não é um código duplicado muito rapidamente
        if (codigoDetectado === codigo) return;

        // Limpar código (remover espaços e caracteres especiais desnecessários)
        const codigoLimpo = codigo.trim().replace(/[^\w\d]/g, '');
        codigoDetectado = codigoLimpo;

        // Mostrar resultado
        document.getElementById('codigo-detectado').textContent = codigoLimpo;
        document.getElementById('resultado-scanner').classList.remove('hidden');

        // Habilitar botão
        document.getElementById('btnUsarCodigo').disabled = false;
        document.getElementById('btnUsarCodigo').classList.remove('opacity-50', 'cursor-not-allowed');

        // Parar scanner após detecção bem-sucedida
        setTimeout(() => {
            if (scannerAtivo) {
                pararScannerInterno();
            }
        }, 500);

        // Feedback sonoro e visual
        try {
            // Som de sucesso
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1;

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (e) {
            // Ignorar erro de áudio
        }

        // Feedback visual
        const container = document.getElementById('scanner-container');
        container.style.border = '3px solid #10B981';
        setTimeout(() => {
            container.style.border = '';
        }, 1000);
    }
}

function handleScannerError(err) {
    let mensagemErro = '❌ Erro ao acessar a câmera!\n\n';

    if (err.name === 'NotAllowedError' || err.message.includes('Permission')) {
        mensagemErro += 'Permissão para usar a câmera foi negada.\n\n';
        mensagemErro += 'Para usar o scanner:\n';
        mensagemErro += '1. Clique no ícone de câmera na barra de endereços\n';
        mensagemErro += '2. Selecione "Permitir"\n';
        mensagemErro += '3. Recarregue a página e tente novamente\n\n';
    } else if (err.name === 'NotFoundError' || err.message.includes('camera')) {
        mensagemErro += 'Nenhuma câmera foi encontrada no dispositivo.\n\n';
    } else if (err.name === 'NotReadableError' || err.message.includes('use')) {
        mensagemErro += 'A câmera está sendo usada por outro aplicativo.\n';
        mensagemErro += 'Feche outros aplicativos que possam estar usando a câmera.\n\n';
    } else if (err.name === 'OverconstrainedError') {
        mensagemErro += 'As configurações da câmera não são suportadas.\n\n';
    } else {
        mensagemErro += 'Erro técnico: ' + (err.message || err.name || 'Desconhecido') + '\n\n';
    }

    mensagemErro += 'Você pode digitar o código de barras manualmente.';
    alert(mensagemErro);
    closeModal('modalScanner');
}

function pararScannerInterno() {
    try {
        if (scannerAtivo) {
            Quagga.stop();
            scannerAtivo = false;
            console.log("🛑 Scanner parado");
        }

        // Remover listener para evitar múltiplas chamadas
        Quagga.offDetected(onBarcodeDetected);

        // Limpar container visual para evitar duplicação de vídeo
        const container = document.querySelector('#interactive');
        if (container) {
            container.innerHTML = '';
        }
    } catch (e) {
        console.error('Erro ao parar scanner:', e);
        // Forçar limpeza mesmo com erro
        const container = document.querySelector('#interactive');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Função para parar scanner
function pararScanner() {
    pararScannerInterno();
    closeModal('modalScanner');
    inputAtual = null;
    codigoDetectado = null;
}

// Função para usar código detectado
function usarCodigoDetectado() {
    if (codigoDetectado && inputAtual) {
        document.getElementById(inputAtual).value = codigoDetectado;

        // Verificar se é único
        verificarCodigoBarrasUnico(inputAtual, inputAtual.includes('Dash') ? 'dashboard' : 'modal');

        pararScanner();
        alert('✅ Código de barras adicionado com sucesso!');
    }
}

function verificarCodigoBarrasUnico(inputId, contexto) {
    // Função para verificar se código de barras já existe
    const codigo = document.getElementById(inputId).value;
    if (codigo) {
        const existe = produtos.some(p => p.codigoBarras === codigo);
        const alertaId = contexto === 'dashboard' ? 'alertaCodigoDash' : 'alertaCodigoModal';
        const alerta = document.getElementById(alertaId);

        if (existe) {
            alerta.classList.remove('hidden');
        } else {
            alerta.classList.add('hidden');
        }
    }
}

// Fechar menu de exportação ao clicar fora
document.addEventListener('click', function (event) {
    const exportMenu = document.getElementById('exportMenu');
    const exportButton = event.target.closest('.mobile-export');

    if (!exportButton && !exportMenu.contains(event.target)) {
        exportMenu.classList.add('hidden');
    }
});

// Função de importação de carga rápida
function importarCargaRapida() {
    const cargasDisponiveis = [
        {
            nome: "Carga Básica de Confeitaria",
            descricao: "Ingredientes essenciais para confeitaria",
            itens: [
                { nome: "Farinha de Trigo Especial", categoria: "Ingredientes Básicos", quantidade: 10, unidade: "kg", preco: 4.80, marca: "Dona Benta" },
                { nome: "Açúcar Refinado", categoria: "Ingredientes Básicos", quantidade: 5, unidade: "kg", preco: 3.50, marca: "União" },
                { nome: "Ovos Grandes", categoria: "Ingredientes Básicos", quantidade: 60, unidade: "un", preco: 0.50, marca: "Korin" },
                { nome: "Manteiga sem Sal", categoria: "Laticínios", quantidade: 2, unidade: "kg", preco: 26.00, marca: "Presidente" },
                { nome: "Leite Integral", categoria: "Laticínios", quantidade: 4, unidade: "L", preco: 4.20, marca: "Parmalat" },
                { nome: "Chocolate em Pó", categoria: "Ingredientes Básicos", quantidade: 1, unidade: "kg", preco: 22.00, marca: "Nestlé" },
                { nome: "Fermento em Pó", categoria: "Ingredientes Básicos", quantidade: 500, unidade: "g", preco: 8.50, marca: "Royal" },
                { nome: "Essência de Baunilha", categoria: "Ingredientes Básicos", quantidade: 100, unidade: "ml", preco: 12.00, marca: "Arcolor" }
            ]
        },
        {
            nome: "Carga Premium de Chocolateria",
            descricao: "Ingredientes especiais para chocolates gourmet",
            itens: [
                { nome: "Chocolate Meio Amargo 70%", categoria: "Ingredientes Básicos", quantidade: 2, unidade: "kg", preco: 45.00, marca: "Callebaut" },
                { nome: "Cacau em Pó Alcalino", categoria: "Ingredientes Básicos", quantidade: 500, unidade: "g", preco: 28.00, marca: "Garoto" },
                { nome: "Creme de Leite Fresco", categoria: "Laticínios", quantidade: 2, unidade: "L", preco: 8.50, marca: "Nestlé" },
                { nome: "Glucose de Milho", categoria: "Ingredientes Básicos", quantidade: 1, unidade: "kg", preco: 15.00, marca: "Karo" },
                { nome: "Manteiga de Cacau", categoria: "Ingredientes Básicos", quantidade: 500, unidade: "g", preco: 35.00, marca: "Sicao" },
                { nome: "Leite Condensado", categoria: "Laticínios", quantidade: 6, unidade: "un", preco: 4.80, marca: "Moça" },
                { nome: "Castanha do Pará", categoria: "Frutas", quantidade: 500, unidade: "g", preco: 18.00, marca: "Nutty" }
            ]
        },
        {
            nome: "Carga de Embalagens e Decoração",
            descricao: "Materiais para apresentação e decoração",
            itens: [
                { nome: "Forminhas de Papel", categoria: "Embalagens", quantidade: 500, unidade: "un", preco: 0.08, marca: "Plumrose" },
                { nome: "Caixas para Bolo", categoria: "Embalagens", quantidade: 50, unidade: "un", preco: 2.50, marca: "Della Fonte" },
                { nome: "Papel Manteiga", categoria: "Embalagens", quantidade: 5, unidade: "un", preco: 3.20, marca: "Wyda" },
                { nome: "Confeitos Coloridos", categoria: "Decoração", quantidade: 200, unidade: "g", preco: 12.00, marca: "Mavalério" },
                { nome: "Chantilly em Pó", categoria: "Decoração", quantidade: 1, unidade: "kg", preco: 18.50, marca: "Amélia" },
                { nome: "Corante Alimentício", categoria: "Decoração", quantidade: 50, unidade: "ml", preco: 6.80, marca: "Arcolor" },
                { nome: "Açúcar de Confeiteiro", categoria: "Decoração", quantidade: 1, unidade: "kg", preco: 8.90, marca: "União" }
            ]
        }
    ];

    let opcoes = "Selecione uma carga para importar:\n\n";
    cargasDisponiveis.forEach((carga, index) => {
        opcoes += `${index + 1}. ${carga.nome}\n   ${carga.descricao} (${carga.itens.length} itens)\n\n`;
    });

    const escolha = prompt(opcoes + "Digite o número da carga desejada:");

    if (escolha && !isNaN(escolha)) {
        const indice = parseInt(escolha) - 1;
        if (indice >= 0 && indice < cargasDisponiveis.length) {
            const cargaSelecionada = cargasDisponiveis[indice];

            const confirmacao = confirm(
                `Confirma a importação da "${cargaSelecionada.nome}"?\n\n` +
                `${cargaSelecionada.descricao}\n` +
                `Total de ${cargaSelecionada.itens.length} itens\n\n` +
                `Os produtos existentes serão atualizados e novos produtos serão adicionados.`
            );

            if (confirmacao) {
                let adicionados = 0;
                let atualizados = 0;

                cargaSelecionada.itens.forEach(item => {
                    // Verificar se produto já existe
                    const produtoExistente = produtos.find(p =>
                        p.nome.toLowerCase() === item.nome.toLowerCase()
                    );

                    if (produtoExistente) {
                        // Atualizar produto existente
                        produtoExistente.categoria = item.categoria;
                        produtoExistente.quantidade += item.quantidade; // Somar quantidades
                        produtoExistente.unidade = item.unidade;
                        produtoExistente.preco = item.preco;
                        produtoExistente.marca = item.marca;
                        atualizados++;
                    } else {
                        // Adicionar novo produto
                        const novoProduto = {
                            id: proximoIdProduto++,
                            nome: item.nome,
                            categoria: item.categoria,
                            quantidade: item.quantidade,
                            unidade: item.unidade,
                            preco: item.preco,
                            validade: null,
                            marca: item.marca,
                            codigoBarras: ''
                        };
                        produtos.push(novoProduto);
                        adicionados++;
                    }
                });

                // Atualizar dashboard
                atualizarDashboard();

                // Mostrar resultado
                alert(`✅ Importação Concluída!\n🆕 Novos: ${adicionados}\n🔄 Existentes (ignorados): ${atualizados}`);
            }
        } else {
            alert('❌ Opção inválida!');
        }
    }
}

// Funções de importação de receitas
function baixarTemplateReceitas() {
    // Criar template Excel para receitas
    const wb = XLSX.utils.book_new();
    const templateData = [
        ['nome', 'rendimento', 'ingredientes', 'modo_preparo', 'margem_lucro'],
        ['Bolo de Chocolate', '12', 'Farinha de Trigo:0.5:kg;Açúcar Cristal:0.3:kg;Ovos:4:un;Cacau em Pó:0.1:kg', 'Misture todos os ingredientes secos, adicione os ovos e bata bem. Asse por 40 minutos a 180°C.', '200'],
        ['Brigadeiro Gourmet', '30', 'Leite Condensado:1:un;Chocolate em Pó:0.05:kg;Manteiga:0.02:kg', 'Misture todos os ingredientes em fogo baixo até desgrudar da panela. Deixe esfriar e faça bolinhas.', '300'],
        ['Torta de Limão', '8', 'Biscoito Maisena:0.2:kg;Manteiga:0.1:kg;Leite Condensado:1:un;Limão:5:un', 'Faça a base com biscoito e manteiga. Prepare o recheio com leite condensado e limão. Monte e leve à geladeira.', '250']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // Definir larguras das colunas
    ws['!cols'] = [
        { wch: 25 }, // nome
        { wch: 12 }, // rendimento
        { wch: 60 }, // ingredientes
        { wch: 50 }, // modo_preparo
        { wch: 15 }  // margem_lucro
    ];

    // Adicionar comentários explicativos
    ws['C1'].c = [{
        a: 'Sistema',
        t: 'Formato: NomeProduto:Quantidade:Unidade;ProximoProduto:Quantidade:Unidade\nExemplo: Farinha de Trigo:0.5:kg;Açúcar:0.3:kg'
    }];

    XLSX.utils.book_append_sheet(wb, ws, 'Template Receitas');
    XLSX.writeFile(wb, 'template_receitas.xlsx');
}

function processarArquivoReceitas(input) {
    const file = input.files[0];
    if (!file) return;

    // Mostrar arquivo selecionado
    document.getElementById('dropZoneReceitas').classList.add('hidden');
    document.getElementById('arquivoSelecionadoReceitas').classList.remove('hidden');
    document.getElementById('nomeArquivoReceitas').textContent = file.name;
    document.getElementById('tamanhoArquivoReceitas').textContent = `${(file.size / 1024).toFixed(1)} KB`;

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            let data;

            if (file.name.endsWith('.csv')) {
                // Processar CSV
                const csv = e.target.result;
                const lines = csv.split('\n');
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

                data = lines.slice(1).filter(line => line.trim()).map(line => {
                    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = values[index] || '';
                    });
                    return obj;
                });
            } else {
                // Processar Excel
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                data = XLSX.utils.sheet_to_json(worksheet);
            }

            dadosImportacaoReceitas = data;
            mostrarMapeamentoCamposReceitas(data);

        } catch (error) {
            alert('❌ Erro ao processar arquivo: ' + error.message);
            removerArquivoReceitas();
        }
    };

    if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
}

function mostrarMapeamentoCamposReceitas(data) {
    if (data.length === 0) {
        alert('❌ Arquivo vazio ou sem dados válidos!');
        return;
    }

    const camposArquivo = Object.keys(data[0]);
    const container = document.getElementById('mapeamentoCamposReceitas');
    container.innerHTML = '';

    // Resetar mapeamento
    mapeamentoCamposReceitas = {};

    camposObrigatoriosReceitas.forEach(campo => {
        const div = document.createElement('div');
        div.className = 'grid grid-cols-2 gap-4 items-center';

        // Campo obrigatório
        const labelDiv = document.createElement('div');
        labelDiv.innerHTML = `
                    <label class="block text-sm font-medium text-gray-700">
                        ${campo.charAt(0).toUpperCase() + campo.slice(1)} *
                    </label>
                `;

        // Select para mapear
        const selectDiv = document.createElement('div');
        const select = document.createElement('select');
        select.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent';
        select.setAttribute('data-campo', campo);
        select.onchange = () => atualizarMapeamentoReceitas();

        // Opção vazia
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Selecione uma coluna';
        select.appendChild(emptyOption);

        // Opções do arquivo
        camposArquivo.forEach(campoArquivo => {
            const option = document.createElement('option');
            option.value = campoArquivo;
            option.textContent = campoArquivo;

            // Auto-mapear campos similares
            if (campoArquivo.toLowerCase().includes(campo.toLowerCase()) ||
                campo.toLowerCase().includes(campoArquivo.toLowerCase())) {
                option.selected = true;
                mapeamentoCamposReceitas[campo] = campoArquivo;
            }

            select.appendChild(option);
        });

        selectDiv.appendChild(select);
        div.appendChild(labelDiv);
        div.appendChild(selectDiv);
        container.appendChild(div);
    });

    // Campos opcionais
    const camposOpcionais = ['modo_preparo', 'margem_lucro'];
    camposOpcionais.forEach(campo => {
        const div = document.createElement('div');
        div.className = 'grid grid-cols-2 gap-4 items-center';

        const labelDiv = document.createElement('div');
        labelDiv.innerHTML = `
                    <label class="block text-sm font-medium text-gray-500">
                        ${campo.replace('_', ' ').charAt(0).toUpperCase() + campo.replace('_', ' ').slice(1)}
                    </label>
                `;

        const selectDiv = document.createElement('div');
        const select = document.createElement('select');
        select.className = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent';
        select.setAttribute('data-campo', campo);
        select.onchange = () => atualizarMapeamentoReceitas();

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Não mapear';
        select.appendChild(emptyOption);

        camposArquivo.forEach(campoArquivo => {
            const option = document.createElement('option');
            option.value = campoArquivo;
            option.textContent = campoArquivo;

            if (campoArquivo.toLowerCase().includes(campo.toLowerCase()) ||
                campo.toLowerCase().includes(campoArquivo.toLowerCase())) {
                option.selected = true;
                mapeamentoCamposReceitas[campo] = campoArquivo;
            }

            select.appendChild(option);
        });

        selectDiv.appendChild(select);
        div.appendChild(labelDiv);
        div.appendChild(selectDiv);
        container.appendChild(div);
    });

    // Mostrar preview
    atualizarPreviewImportacaoReceitas();

    // Mostrar seção de mapeamento
    document.getElementById('secaoMapeamentoReceitas').classList.remove('hidden');
}

function atualizarMapeamentoReceitas() {
    const selects = document.querySelectorAll('#mapeamentoCamposReceitas select');
    mapeamentoCamposReceitas = {};

    selects.forEach(select => {
        const campo = select.getAttribute('data-campo');
        if (select.value) {
            mapeamentoCamposReceitas[campo] = select.value;
        }
    });

    atualizarPreviewImportacaoReceitas();
}

function atualizarPreviewImportacaoReceitas() {
    const tbody = document.getElementById('previewImportacaoReceitas');
    tbody.innerHTML = '';

    // Mostrar apenas os primeiros 5 registros
    const preview = dadosImportacaoReceitas.slice(0, 5);

    preview.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

        const nome = item[mapeamentoCamposReceitas.nome] || '';
        const rendimento = item[mapeamentoCamposReceitas.rendimento] || '';
        const ingredientes = item[mapeamentoCamposReceitas.ingredientes] || '';
        const modoPreparo = item[mapeamentoCamposReceitas.modo_preparo] || '';

        // Validar dados
        const erros = [];
        if (!nome) erros.push('Nome obrigatório');
        if (!rendimento || isNaN(parseInt(rendimento))) erros.push('Rendimento inválido');
        if (!ingredientes) erros.push('Ingredientes obrigatórios');

        // Validar formato dos ingredientes
        if (ingredientes) {
            try {
                const ingredientesArray = ingredientes.split(';');
                let ingredientesValidos = true;
                ingredientesArray.forEach(ing => {
                    const partes = ing.split(':');
                    if (partes.length !== 3 || !partes[0] || !partes[1] || !partes[2]) {
                        ingredientesValidos = false;
                    }
                });
                if (!ingredientesValidos) {
                    erros.push('Formato de ingredientes inválido');
                }
            } catch (e) {
                erros.push('Formato de ingredientes inválido');
            }
        }

        const statusClass = erros.length > 0 ? 'text-red-600' : 'text-green-600';
        const statusIcon = erros.length > 0 ? '❌' : '✅';
        const statusText = erros.length > 0 ? erros.join(', ') : 'OK';

        row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${nome}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rendimento} porções</td>
                    <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">${ingredientes}</td>
                    <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">${modoPreparo}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm ${statusClass}">
                        ${statusIcon} ${statusText}
                    </td>
                `;
        tbody.appendChild(row);
    });

    // Atualizar contador
    const totalRegistros = dadosImportacaoReceitas.length;
    const registrosValidos = dadosImportacaoReceitas.filter(item => {
        const nome = item[mapeamentoCamposReceitas.nome];
        const rendimento = item[mapeamentoCamposReceitas.rendimento];
        const ingredientes = item[mapeamentoCamposReceitas.ingredientes];

        return nome && rendimento && !isNaN(parseInt(rendimento)) && ingredientes;
    }).length;

    document.getElementById('contadorImportacaoReceitas').textContent =
        `${registrosValidos} de ${totalRegistros} registros válidos`;

    // Habilitar/desabilitar botão de importação
    const btnImportar = document.querySelector('button[onclick="executarImportacaoReceitas()"]');
    if (registrosValidos > 0) {
        btnImportar.disabled = false;
        btnImportar.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        btnImportar.disabled = true;
        btnImportar.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

function removerArquivoReceitas() {
    document.getElementById('arquivoImportacaoReceitas').value = '';
    document.getElementById('dropZoneReceitas').classList.remove('hidden');
    document.getElementById('arquivoSelecionadoReceitas').classList.add('hidden');
    document.getElementById('secaoMapeamentoReceitas').classList.add('hidden');
    dadosImportacaoReceitas = [];
    mapeamentoCamposReceitas = {};
}

function executarImportacaoReceitas() {
    if (dadosImportacaoReceitas.length === 0) {
        alert('❌ Nenhum dado para importar!');
        return;
    }

    let importados = 0;
    let erros = 0;

    dadosImportacaoReceitas.forEach(item => {
        try {
            const nome = item[mapeamentoCamposReceitas.nome];
            const rendimento = parseInt(item[mapeamentoCamposReceitas.rendimento]);
            const ingredientesTexto = item[mapeamentoCamposReceitas.ingredientes];
            const modoPreparo = item[mapeamentoCamposReceitas.modo_preparo] || '';
            const margemLucro = parseFloat(item[mapeamentoCamposReceitas.margem_lucro]) || 200;

            // Validar dados obrigatórios
            if (!nome || isNaN(rendimento) || !ingredientesTexto) {
                erros++;
                return;
            }

            // Processar ingredientes
            const ingredientes = [];
            let custoTotal = 0;
            let ingredientesValidos = true;

            try {
                const ingredientesArray = ingredientesTexto.split(';');

                ingredientesArray.forEach(ing => {
                    const partes = ing.trim().split(':');
                    if (partes.length !== 3) {
                        ingredientesValidos = false;
                        return;
                    }

                    const nomeProduto = partes[0].trim();
                    const quantidade = parseFloat(partes[1]);
                    const unidade = partes[2].trim();

                    // Buscar produto no estoque
                    const produto = produtos.find(p =>
                        p.nome.toLowerCase() === nomeProduto.toLowerCase() ||
                        p.nome.toLowerCase().includes(nomeProduto.toLowerCase())
                    );

                    if (produto && !isNaN(quantidade)) {
                        ingredientes.push({
                            produtoId: produto.id,
                            quantidade: quantidade
                        });
                        custoTotal += quantidade * produto.preco;
                    } else {
                        ingredientesValidos = false;
                    }
                });
            } catch (e) {
                ingredientesValidos = false;
            }

            if (!ingredientesValidos || ingredientes.length === 0) {
                erros++;
                return;
            }

            // Verificar se receita já existe
            const receitaExistente = receitas.find(r =>
                r.nome.toLowerCase() === nome.toLowerCase()
            );

            const custoPorPorcao = custoTotal / rendimento;
            const precoSugerido = custoPorPorcao * (1 + margemLucro / 100);

            if (receitaExistente) {
                // Atualizar receita existente
                receitaExistente.rendimento = rendimento;
                receitaExistente.ingredientes = ingredientes;
                receitaExistente.modoPreparo = modoPreparo;
                receitaExistente.custoTotal = custoTotal;
                receitaExistente.custoPorPorcao = custoPorPorcao;
                receitaExistente.margemLucro = margemLucro;
                receitaExistente.precoSugerido = precoSugerido;
                receitaExistente.precoVenda = precoSugerido;
            } else {
                // Criar nova receita
                const novaReceita = {
                    id: proximoIdReceita++,
                    nome,
                    rendimento,
                    ingredientes,
                    modoPreparo,
                    custoTotal,
                    custoPorPorcao,
                    margemLucro,
                    precoSugerido,
                    precoVenda: precoSugerido
                };
                receitas.push(novaReceita);
            }

            importados++;
        } catch (error) {
            erros++;
        }
    });

    // Salvar dados após importação
    if (importados > 0) {
        salvarDados();
    }

    // Fechar modal e atualizar receitas
    closeModal('modalImportacaoReceitas');
    atualizarReceitas();

    // Mostrar resultado
    let mensagem = `✅ Importação de receitas concluída!\n\n`;
    mensagem += `📝 ${importados} receitas importadas com sucesso\n`;
    if (erros > 0) {
        mensagem += `❌ ${erros} registros com erro foram ignorados\n\n`;
        mensagem += `💡 Dica: Verifique se todos os ingredientes existem no estoque`;
    }

    alert(mensagem);
}

// Funções de receitas avançadas
function exportarReceitasExcel() {
    if (receitas.length === 0) {
        alert('❌ Nenhuma receita para exportar!');
        return;
    }

    // Preparar dados para exportação
    const dadosExportacao = receitas.map(receita => {
        const ingredientesTexto = receita.ingredientes.map(ing => {
            const produto = produtos.find(p => p.id === ing.produtoId);
            return produto ? `${ing.quantidade} ${produto.unidade} de ${produto.nome}` : '';
        }).filter(Boolean).join('; ');

        return {
            'Nome da Receita': receita.nome,
            'Rendimento (porções)': receita.rendimento,
            'Custo Total': receita.custoTotal.toFixed(2),
            'Custo por Porção': receita.custoPorPorcao.toFixed(2),
            'Preço Sugerido': (receita.custoPorPorcao * 3).toFixed(2),
            'Margem Sugerida (%)': '200',
            'Ingredientes': ingredientesTexto,
            'Modo de Preparo': receita.modoPreparo || ''
        };
    });

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExportacao);

    // Definir larguras das colunas
    ws['!cols'] = [
        { wch: 25 }, // Nome da Receita
        { wch: 18 }, // Rendimento
        { wch: 15 }, // Custo Total
        { wch: 18 }, // Custo por Porção
        { wch: 18 }, // Preço Sugerido
        { wch: 18 }, // Margem Sugerida
        { wch: 50 }, // Ingredientes
        { wch: 40 }  // Modo de Preparo
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Receitas');

    // Gerar nome do arquivo com data
    const agora = new Date();
    const dataFormatada = agora.toISOString().split('T')[0];
    const nomeArquivo = `receitas_${dataFormatada}.xlsx`;

    XLSX.writeFile(wb, nomeArquivo);

    alert(`✅ Catálogo de receitas exportado com sucesso!\n📁 ${nomeArquivo}`);
}

function exportarReceitasPDF() {
    if (receitas.length === 0) {
        alert('❌ Nenhuma receita para exportar!');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configurar fonte
    doc.setFont('helvetica');

    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Catálogo de Receitas', 20, 20);

    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 30);
    doc.text(`Total de receitas: ${receitas.length}`, 20, 40);

    // Linha separadora
    doc.line(20, 50, 190, 50);

    let yPos = 60;

    receitas.forEach((receita, index) => {
        // Verificar se precisa de nova página
        if (yPos > 220) {
            doc.addPage();
            yPos = 20;
        }

        // Nome da receita
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(receita.nome, 20, yPos);
        yPos += 10;

        // Informações básicas
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Rendimento: ${receita.rendimento} porções`, 20, yPos);
        doc.text(`Custo: R$ ${receita.custoTotal.toFixed(2)} (R$ ${receita.custoPorPorcao.toFixed(2)}/porção)`, 100, yPos);
        yPos += 8;

        // Ingredientes
        doc.setFont('helvetica', 'bold');
        doc.text('Ingredientes:', 20, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'normal');
        receita.ingredientes.forEach(ing => {
            const produto = produtos.find(p => p.id === ing.produtoId);
            if (produto) {
                doc.text(`• ${ing.quantidade} ${produto.unidade} de ${produto.nome}`, 25, yPos);
                yPos += 5;
            }
        });

        // Modo de preparo
        if (receita.modoPreparo) {
            yPos += 3;
            doc.setFont('helvetica', 'bold');
            doc.text('Modo de Preparo:', 20, yPos);
            yPos += 6;

            doc.setFont('helvetica', 'normal');
            const linhas = doc.splitTextToSize(receita.modoPreparo, 170);
            linhas.forEach(linha => {
                doc.text(linha, 20, yPos);
                yPos += 5;
            });
        }

        // Separador entre receitas
        yPos += 10;
        if (index < receitas.length - 1) {
            doc.line(20, yPos, 190, yPos);
            yPos += 10;
        }
    });

    // Salvar PDF
    const agora = new Date();
    const dataFormatada = agora.toISOString().split('T')[0];
    const nomeArquivo = `catalogo_receitas_${dataFormatada}.pdf`;

    doc.save(nomeArquivo);

    alert(`✅ Catálogo de receitas PDF gerado com sucesso!\n📁 ${nomeArquivo}`);
}

// Funções adicionais para os botões dos cards
function duplicarReceita(id) {
    const receita = receitas.find(r => r.id === id);
    if (receita) {
        const novaReceita = {
            ...receita,
            id: proximoIdReceita++,
            nome: receita.nome + ' (Cópia)'
        };
        receitas.push(novaReceita);
        atualizarReceitas();
        alert('✅ Receita duplicada com sucesso!');
    }
}

function calcularReceita(id) {
    const receita = receitas.find(r => r.id === id);
    if (receita) {
        const novoRendimento = prompt(`Calcular receita para quantas porções?\n\nReceita original: ${receita.rendimento} porções`, receita.rendimento);
        if (novoRendimento && !isNaN(novoRendimento)) {
            const fator = parseFloat(novoRendimento) / receita.rendimento;

            let detalhes = `📊 Cálculo para ${novoRendimento} porções:\n\n`;
            detalhes += `🧄 Ingredientes ajustados:\n`;

            receita.ingredientes.forEach(ing => {
                const produto = produtos.find(p => p.id === ing.produtoId);
                if (produto) {
                    const novaQuantidade = (ing.quantidade * fator).toFixed(2);
                    detalhes += `• ${novaQuantidade} ${produto.unidade} de ${produto.nome}\n`;
                }
            });

            const novoCusto = receita.custoTotal * fator;
            detalhes += `\n💰 Custo total: R$ ${novoCusto.toFixed(2)}`;
            detalhes += `\n💰 Custo por porção: R$ ${receita.custoPorPorcao.toFixed(2)}`;

            alert(detalhes);
        }
    }
}

function imprimirReceita(id) {
    const receita = receitas.find(r => r.id === id);
    if (!receita) return;

    // Criar janela de impressão
    const printWindow = window.open('', '_blank');

    const ingredientesHTML = receita.ingredientes.map(ing => {
        const produto = produtos.find(p => p.id === ing.produtoId);
        if (produto) {
            const custoIngrediente = ing.quantidade * produto.preco;
            return `<li>${ing.quantidade} ${produto.unidade} de ${produto.nome} <span class="custo">(R$ ${custoIngrediente.toFixed(2)})</span></li>`;
        }
        return '';
    }).filter(Boolean).join('');

    const precoSugerido = receita.custoPorPorcao * 3;
    const margem = 200;
    const lucro = precoSugerido - receita.custoPorPorcao;

    printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Receita: ${receita.nome}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                            line-height: 1.6;
                        }
                        .header {
                            text-align: center;
                            border-bottom: 2px solid #333;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                        }
                        .title {
                            font-size: 28px;
                            font-weight: bold;
                            color: #333;
                            margin-bottom: 10px;
                        }
                        .info-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 20px;
                            margin-bottom: 30px;
                        }
                        .info-box {
                            background: #f5f5f5;
                            padding: 15px;
                            border-radius: 8px;
                            border-left: 4px solid #8B5CF6;
                        }
                        .info-label {
                            font-weight: bold;
                            color: #666;
                            font-size: 12px;
                            text-transform: uppercase;
                        }
                        .info-value {
                            font-size: 18px;
                            font-weight: bold;
                            color: #333;
                        }
                        .section {
                            margin-bottom: 30px;
                        }
                        .section-title {
                            font-size: 20px;
                            font-weight: bold;
                            color: #333;
                            margin-bottom: 15px;
                            border-bottom: 1px solid #ddd;
                            padding-bottom: 5px;
                        }
                        .ingredients {
                            list-style: none;
                            padding: 0;
                        }
                        .ingredients li {
                            padding: 8px 0;
                            border-bottom: 1px dotted #ccc;
                            display: flex;
                            justify-content: space-between;
                        }
                        .custo {
                            color: #666;
                            font-size: 14px;
                        }
                        .preparo {
                            background: #f9f9f9;
                            padding: 20px;
                            border-radius: 8px;
                            border-left: 4px solid #10B981;
                        }
                        .pricing {
                            background: linear-gradient(135deg, #10B981, #059669);
                            color: white;
                            padding: 20px;
                            border-radius: 8px;
                            margin-top: 30px;
                        }
                        .pricing-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr 1fr;
                            gap: 20px;
                            text-align: center;
                        }
                        .pricing-item {
                            background: rgba(255,255,255,0.1);
                            padding: 15px;
                            border-radius: 6px;
                        }
                        .pricing-value {
                            font-size: 24px;
                            font-weight: bold;
                        }
                        .pricing-label {
                            font-size: 12px;
                            opacity: 0.9;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 40px;
                            padding-top: 20px;
                            border-top: 1px solid #ddd;
                            color: #666;
                            font-size: 12px;
                        }
                        @media print {
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title"> ${receita.nome}</div>
                        <div>Receita para ${receita.rendimento} porções</div>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-box">
                            <div class="info-label">Custo Total</div>
                            <div class="info-value">R$ ${receita.custoTotal.toFixed(2)}</div>
                        </div>
                        <div class="info-box">
                            <div class="info-label">Custo por Porção</div>
                            <div class="info-value">R$ ${receita.custoPorPorcao.toFixed(2)}</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">🧄 Ingredientes</div>
                        <ul class="ingredients">
                            ${ingredientesHTML}
                        </ul>
                    </div>
                    
                    ${receita.modoPreparo ? `
                        <div class="section">
                            <div class="section-title">👨‍🍳 Modo de Preparo</div>
                            <div class="preparo">${receita.modoPreparo}</div>
                        </div>
                    ` : ''}
                    
                    <div class="pricing">
                        <div class="section-title" style="color: white; border-color: rgba(255,255,255,0.3);">💰 Sugestão de Preço</div>
                        <div class="pricing-grid">
                            <div class="pricing-item">
                                <div class="pricing-value">R$ ${precoSugerido.toFixed(2)}</div>
                                <div class="pricing-label">Preço por Porção</div>
                            </div>
                            <div class="pricing-item">
                                <div class="pricing-value">${margem}%</div>
                                <div class="pricing-label">Margem</div>
                            </div>
                            <div class="pricing-item">
                                <div class="pricing-value">R$ ${lucro.toFixed(2)}</div>
                                <div class="pricing-label">Lucro por Porção</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        Receita gerada em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}<br>
                        Sistema de Controle de Estoque - Bem Brownieria

                    </div>
                </body>
                </html>
            `);

    printWindow.document.close();

    // Aguardar carregamento e imprimir
    printWindow.onload = function () {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };
}

// Funções do Sistema de Notificações
function verificarNotificacoes() {
    alertasAtivos = [];

    // Verificar estoque baixo
    if (configuracoes.notificacoes.estoqueBaixo) {
        produtos.forEach(produto => {
            const status = getStatusEstoque(produto.quantidade, produto.unidade);
            if (status === 'baixo') {
                alertasAtivos.push({
                    tipo: 'estoque',
                    prioridade: 'alta',
                    titulo: `Estoque baixo: ${produto.nome}`,
                    descricao: `Apenas ${produto.quantidade} ${produto.unidade} restantes`,
                    produto: produto,
                    timestamp: new Date()
                });
            }
        });
    }

    // Verificar produtos próximos ao vencimento
    if (configuracoes.notificacoes.vencimento) {
        const hoje = new Date();
        const diasAntecedencia = configuracoes.notificacoes.diasAntecedencia;

        produtos.forEach(produto => {
            if (produto.validade) {
                const dataVencimento = new Date(produto.validade);
                const diasRestantes = Math.ceil((dataVencimento - hoje) / (1000 * 60 * 60 * 24));

                if (diasRestantes <= diasAntecedencia && diasRestantes >= 0) {
                    let prioridade = 'media';
                    let emoji = '⚠️';

                    if (diasRestantes <= 2) {
                        prioridade = 'critica';
                        emoji = '🚨';
                    } else if (diasRestantes <= 5) {
                        prioridade = 'alta';
                        emoji = '⚠️';
                    }

                    alertasAtivos.push({
                        tipo: 'vencimento',
                        prioridade: prioridade,
                        titulo: `${emoji} ${produto.nome} vence em ${diasRestantes} dia(s)`,
                        descricao: `Vencimento: ${dataVencimento.toLocaleDateString('pt-BR')}`,
                        produto: produto,
                        diasRestantes: diasRestantes,
                        timestamp: new Date()
                    });
                }
            }
        });
    }

    // Ordenar alertas por prioridade
    const ordemPrioridade = { 'critica': 0, 'alta': 1, 'media': 2, 'baixa': 3 };
    alertasAtivos.sort((a, b) => ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade]);

    // Atualizar timestamp da última verificação
    ultimaVerificacaoNotificacoes = new Date();

    // Atualizar interface
    atualizarInterfaceAlertas();
    atualizarStatusNotificacoes();

    // Mostrar notificação se houver alertas críticos
    const alertasCriticos = alertasAtivos.filter(a => a.prioridade === 'critica');
    if (alertasCriticos.length > 0) {
        mostrarNotificacaoUrgente(alertasCriticos);
    }

    return alertasAtivos;
}

function atualizarInterfaceAlertas() {
    const badge = document.getElementById('badgeAlertas');
    const listaAlertas = document.getElementById('listaAlertas');

    // Atualizar badge
    if (alertasAtivos.length > 0) {
        badge.textContent = alertasAtivos.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    // Atualizar lista de alertas
    listaAlertas.innerHTML = '';

    if (alertasAtivos.length === 0) {
        listaAlertas.innerHTML = `
                    <div class="p-4 text-center text-gray-500">
                        <div class="text-2xl mb-2">✅</div>
                        <div>Nenhum alerta no momento</div>
                        <div class="text-xs mt-1">Tudo está funcionando bem!</div>
                    </div>
                `;
    } else {
        alertasAtivos.forEach(alerta => {
            const div = document.createElement('div');
            div.className = `p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${getPrioridadeClass(alerta.prioridade)}`;

            const tempoRelativo = getTempoRelativo(alerta.timestamp);

            div.innerHTML = `
                        <div class="flex items-start space-x-3">
                            <div class="flex-shrink-0 mt-1">
                                ${getPrioridadeIcon(alerta.prioridade)}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-sm text-gray-900">${alerta.titulo}</div>
                                <div class="text-xs text-gray-600 mt-1">${alerta.descricao}</div>
                                <div class="text-xs text-gray-400 mt-1">${tempoRelativo}</div>
                            </div>
                            <button onclick="resolverAlerta('${alerta.produto.id}', '${alerta.tipo}')" class="text-gray-400 hover:text-gray-600" title="Marcar como resolvido">
                                ✕
                            </button>
                        </div>
                    `;

            // Adicionar ação ao clicar
            div.onclick = function (e) {
                if (e.target.tagName !== 'BUTTON') {
                    mostrarDetalhesAlerta(alerta);
                }
            };

            listaAlertas.appendChild(div);
        });
    }
}

function atualizarStatusNotificacoes() {
    const countEstoqueBaixo = document.getElementById('countEstoqueBaixo');
    const countVencimento = document.getElementById('countVencimento');
    const ultimaVerificacao = document.getElementById('ultimaVerificacao');

    if (countEstoqueBaixo) {
        const estoqueBaixo = alertasAtivos.filter(a => a.tipo === 'estoque').length;
        countEstoqueBaixo.textContent = estoqueBaixo;
    }

    if (countVencimento) {
        const vencimento = alertasAtivos.filter(a => a.tipo === 'vencimento').length;
        countVencimento.textContent = vencimento;
    }

    if (ultimaVerificacao && ultimaVerificacaoNotificacoes) {
        ultimaVerificacao.textContent = ultimaVerificacaoNotificacoes.toLocaleTimeString('pt-BR');
    }
}

function getPrioridadeClass(prioridade) {
    switch (prioridade) {
        case 'critica': return 'border-l-4 border-red-500 bg-red-50';
        case 'alta': return 'border-l-4 border-orange-500 bg-orange-50';
        case 'media': return 'border-l-4 border-yellow-500 bg-yellow-50';
        default: return 'border-l-4 border-blue-500 bg-blue-50';
    }
}

function getPrioridadeIcon(prioridade) {
    switch (prioridade) {
        case 'critica': return '🚨';
        case 'alta': return '⚠️';
        case 'media': return '⚡';
        default: return 'ℹ️';
    }
}

function getTempoRelativo(timestamp) {
    const agora = new Date();
    const diff = agora - timestamp;
    const minutos = Math.floor(diff / (1000 * 60));

    if (minutos < 1) return 'Agora mesmo';
    if (minutos < 60) return `${minutos} min atrás`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `${horas}h atrás`;

    const dias = Math.floor(horas / 24);
    return `${dias}d atrás`;
}

function toggleAlertas() {
    const dropdown = document.getElementById('dropdownAlertas');
    dropdown.classList.toggle('hidden');

    // Verificar notificações ao abrir
    if (!dropdown.classList.contains('hidden')) {
        verificarNotificacoes();
    }
}

function mostrarNotificacaoUrgente(alertasCriticos) {
    let mensagem = '🚨 ALERTAS CRÍTICOS!\n\n';

    alertasCriticos.forEach(alerta => {
        mensagem += `• ${alerta.titulo}\n`;
    });

    mensagem += '\n⚠️ Ação imediata necessária!';

    // Mostrar alerta nativo do navegador
    alert(mensagem);

    // Tentar mostrar notificação do navegador se permitido
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Doce Controle - Alertas Críticos', {
            body: `${alertasCriticos.length} alerta(s) crítico(s) detectado(s)`,
            icon: '🚨',
            requireInteraction: true
        });
    }
}

function mostrarDetalhesAlerta(alerta) {
    let detalhes = `📋 Detalhes do Alerta\n\n`;
    detalhes += `Produto: ${alerta.produto.nome}\n`;
    detalhes += `Categoria: ${alerta.produto.categoria}\n`;

    if (alerta.tipo === 'estoque') {
        detalhes += `Quantidade atual: ${alerta.produto.quantidade} ${alerta.produto.unidade}\n`;
        const limite = configuracoes.limites[alerta.produto.unidade];
        detalhes += `Limite mínimo: ${limite.min} ${alerta.produto.unidade}\n`;
        detalhes += `\n💡 Sugestão: Reabastecer o estoque`;
    } else if (alerta.tipo === 'vencimento') {
        detalhes += `Data de vencimento: ${new Date(alerta.produto.validade).toLocaleDateString('pt-BR')}\n`;
        detalhes += `Dias restantes: ${alerta.diasRestantes}\n`;
        detalhes += `\n💡 Sugestão: Usar o produto em breve ou fazer promoção`;
    }

    alert(detalhes);
}

function resolverAlerta(produtoId, tipo) {
    // Remover alerta da lista
    alertasAtivos = alertasAtivos.filter(a =>
        !(a.produto.id == produtoId && a.tipo === tipo)
    );

    // Atualizar interface
    atualizarInterfaceAlertas();
    atualizarStatusNotificacoes();
}

function configurarNotificacaoAutomatica() {
    // Limpar intervalo anterior se existir
    if (intervalNotificacoes) {
        clearInterval(intervalNotificacoes);
        intervalNotificacoes = null;
    }

    // Configurar novo intervalo se ativado
    if (configuracoes.notificacoes.automatica) {
        // Verificar a cada 30 minutos (1800000 ms)
        intervalNotificacoes = setInterval(() => {
            verificarNotificacoes();
        }, 1800000);

        console.log('✅ Verificação automática de notificações ativada (30 min)');
    } else {
        console.log('❌ Verificação automática de notificações desativada');
    }
}

function solicitarPermissaoNotificacao() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('✅ Permissão para notificações concedida');
                new Notification('Doce Controle', {
                    body: 'Notificações ativadas com sucesso!',
                    icon: '🧁'
                });
            }
        });
    }
}

// Funções dos menus de configuração
function toggleConfigMenu() {
    const menu = document.getElementById('configMenu');
    menu.classList.toggle('hidden');
}

function toggleMobileConfigMenu() {
    const menu = document.getElementById('mobileConfigMenu');
    menu.classList.toggle('hidden');
}

// Fechar dropdowns ao clicar fora
document.addEventListener('click', function (event) {
    const dropdownAlertas = document.getElementById('dropdownAlertas');
    const botaoAlertas = event.target.closest('button[onclick="toggleAlertas()"]');

    if (dropdownAlertas && !botaoAlertas && !dropdownAlertas.contains(event.target)) {
        dropdownAlertas.classList.add('hidden');
    }

    const exportMenu = document.getElementById('exportMenu');
    const exportButton = event.target.closest('.mobile-export');

    if (exportMenu && !exportButton && !exportMenu.contains(event.target)) {
        exportMenu.classList.add('hidden');
    }

    // Fechar menu de configurações desktop
    const configMenu = document.getElementById('configMenu');
    const configButton = event.target.closest('button[onclick="toggleConfigMenu()"]');

    if (configMenu && !configButton && !configMenu.contains(event.target)) {
        configMenu.classList.add('hidden');
    }

    // Fechar menu de configurações mobile
    const mobileConfigMenu = document.getElementById('mobileConfigMenu');
    const mobileConfigButton = event.target.closest('button[onclick="toggleMobileConfigMenu()"]');

    if (mobileConfigMenu && !mobileConfigButton && !mobileConfigMenu.contains(event.target)) {
        mobileConfigMenu.classList.add('hidden');
    }
});

// Toggle Sidebar Function
function toggleSidebar() {
    const sidebar = document.getElementById('desktopSidebar');
    const sidebarTitle = document.getElementById('sidebarTitle');
    const navTexts = document.querySelectorAll('.nav-text');
    const isCollapsed = sidebar.classList.toggle('w-20');

    // Toggle width classes
    if (isCollapsed) {
        sidebar.classList.remove('w-64');
        sidebarTitle.classList.add('hidden');
        navTexts.forEach(text => text.classList.add('hidden'));
    } else {
        sidebar.classList.add('w-64');
        sidebarTitle.classList.remove('hidden');
        navTexts.forEach(text => text.classList.remove('hidden'));
    }

    // Update time immediately to adapt format
    updateTime();
}

// Funções de envio manual de alertas
function enviarAlertasWhatsApp() {
    const whatsapp = configuracoes.contato.whatsapp;

    if (!whatsapp) {
        alert('⚠️ Por favor, configure um número de WhatsApp primeiro!');
        return;
    }

    // Verificar alertas atuais
    verificarNotificacoes();

    if (alertasAtivos.length === 0) {
        const confirmacao = confirm('✅ Não há alertas ativos no momento.\n\nDeseja enviar um relatório de status mesmo assim?');
        if (!confirmacao) return;
    }

    // Gerar mensagem para WhatsApp
    let mensagem = `🧁 *DOCE CONTROLE - RELATÓRIO DE ALERTAS*\n`;
    mensagem += `📅 ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n\n`;

    if (alertasAtivos.length === 0) {
        mensagem += `✅ *TUDO OK!*\n`;
        mensagem += `Nenhum alerta ativo no momento.\n`;
        mensagem += `Seu estoque está funcionando perfeitamente! 🎉\n\n`;
    } else {
        mensagem += `⚠️ *${alertasAtivos.length} ALERTA(S) DETECTADO(S)*\n\n`;

        // Agrupar por tipo
        const estoquesBaixos = alertasAtivos.filter(a => a.tipo === 'estoque');
        const vencimentos = alertasAtivos.filter(a => a.tipo === 'vencimento');

        if (estoquesBaixos.length > 0) {
            mensagem += `📦 *ESTOQUE BAIXO (${estoquesBaixos.length}):*\n`;
            estoquesBaixos.forEach(alerta => {
                mensagem += `• ${alerta.produto.nome}: ${alerta.produto.quantidade} ${alerta.produto.unidade}\n`;
            });
            mensagem += `\n`;
        }

        if (vencimentos.length > 0) {
            mensagem += `⏰ *PRÓXIMOS AO VENCIMENTO (${vencimentos.length}):*\n`;
            vencimentos.forEach(alerta => {
                mensagem += `• ${alerta.produto.nome}: ${alerta.diasRestantes} dia(s)\n`;
            });
            mensagem += `\n`;
        }
    }

    // Adicionar resumo do estoque
    const totalProdutos = produtos.length;
    const valorTotal = produtos.reduce((sum, p) => sum + (p.quantidade * p.preco), 0);

    mensagem += `📊 *RESUMO DO ESTOQUE:*\n`;
    mensagem += `• Total de produtos: ${totalProdutos}\n`;
    mensagem += `• Valor total: R$ ${valorTotal.toFixed(2)}\n`;
    mensagem += `• Última verificação: ${new Date().toLocaleTimeString('pt-BR')}\n\n`;

    mensagem += `🤖 _Mensagem automática do sistema Doce Controle_`;

    // Criar link do WhatsApp
    const numeroLimpo = whatsapp.replace(/\D/g, '');
    const mensagemCodificada = encodeURIComponent(mensagem);
    const linkWhatsApp = `https://wa.me/55${numeroLimpo}?text=${mensagemCodificada}`;

    // Abrir WhatsApp
    window.open(linkWhatsApp, '_blank');

    alert('📱 WhatsApp aberto com a mensagem pronta!\n\nRevise e envie a mensagem.');
}

function enviarAlertasEmail() {
    const email = configuracoes.contato.email;

    if (!email) {
        alert('⚠️ Por favor, configure um email primeiro!');
        return;
    }

    // Verificar alertas atuais
    verificarNotificacoes();

    if (alertasAtivos.length === 0) {
        const confirmacao = confirm('✅ Não há alertas ativos no momento.\n\nDeseja enviar um relatório de status mesmo assim?');
        if (!confirmacao) return;
    }

    // Gerar assunto e corpo do email
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    let assunto = '';
    let corpo = '';

    if (alertasAtivos.length === 0) {
        assunto = `Doce Controle - Status OK (${dataAtual})`;
        corpo = `DOCE CONTROLE - RELATÓRIO DE STATUS\n`;
        corpo += `Data: ${dataAtual} às ${new Date().toLocaleTimeString('pt-BR')}\n\n`;
        corpo += `✅ TUDO OK!\n\n`;
        corpo += `Nenhum alerta ativo no momento.\n`;
        corpo += `Seu estoque está funcionando perfeitamente!\n\n`;
    } else {
        const alertasCriticos = alertasAtivos.filter(a => a.prioridade === 'critica').length;
        assunto = alertasCriticos > 0 ?
            `🚨 URGENTE - Doce Controle (${alertasAtivos.length} alertas)` :
            `⚠️ Doce Controle - ${alertasAtivos.length} Alerta(s) (${dataAtual})`;

        corpo = `DOCE CONTROLE - RELATÓRIO DE ALERTAS\n`;
        corpo += `Data: ${dataAtual} às ${new Date().toLocaleTimeString('pt-BR')}\n\n`;
        corpo += `⚠️ ${alertasAtivos.length} ALERTA(S) DETECTADO(S)\n\n`;

        // Agrupar por prioridade
        const criticos = alertasAtivos.filter(a => a.prioridade === 'critica');
        const altos = alertasAtivos.filter(a => a.prioridade === 'alta');
        const medios = alertasAtivos.filter(a => a.prioridade === 'media');

        if (criticos.length > 0) {
            corpo += `🚨 CRÍTICOS (${criticos.length}):\n`;
            criticos.forEach(alerta => {
                corpo += `• ${alerta.titulo}\n  ${alerta.descricao}\n`;
            });
            corpo += `\n`;
        }

        if (altos.length > 0) {
            corpo += `⚠️ ALTA PRIORIDADE (${altos.length}):\n`;
            altos.forEach(alerta => {
                corpo += `• ${alerta.titulo}\n  ${alerta.descricao}\n`;
            });
            corpo += `\n`;
        }

        if (medios.length > 0) {
            corpo += `⚡ MÉDIA PRIORIDADE (${medios.length}):\n`;
            medios.forEach(alerta => {
                corpo += `• ${alerta.titulo}\n  ${alerta.descricao}\n`;
            });
            corpo += `\n`;
        }
    }

    // Adicionar resumo do estoque
    const totalProdutos = produtos.length;
    const valorTotal = produtos.reduce((sum, p) => sum + (p.quantidade * p.preco), 0);

    corpo += `📊 RESUMO DO ESTOQUE:\n`;
    corpo += `• Total de produtos: ${totalProdutos}\n`;
    corpo += `• Valor total: R$ ${valorTotal.toFixed(2)}\n`;
    corpo += `• Última verificação: ${new Date().toLocaleTimeString('pt-BR')}\n\n`;

    corpo += `---\n`;
    corpo += `Este é um relatório automático do sistema Doce Controle.\n`;
    corpo += `Para mais detalhes, acesse o sistema diretamente.`;

    // Criar link do email
    const assuntoCodificado = encodeURIComponent(assunto);
    const corpoCodificado = encodeURIComponent(corpo);
    const linkEmail = `mailto:${email}?subject=${assuntoCodificado}&body=${corpoCodificado}`;

    // Abrir cliente de email
    window.location.href = linkEmail;

    alert('📧 Cliente de email aberto com a mensagem pronta!\n\nRevise e envie o email.');
}

function gerarRelatorioAlertas() {
    // Verificar alertas atuais
    verificarNotificacoes();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Configurar fonte
    doc.setFont('helvetica');

    // Cabeçalho
    doc.setFontSize(20);
    doc.text('🧁 DOCE CONTROLE', 20, 20);
    doc.setFontSize(16);
    doc.text('Relatório de Alertas do Sistema', 20, 30);

    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 45);

    // Linha separadora
    doc.line(20, 55, 190, 55);

    let yPos = 70;

    // Status geral
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');

    if (alertasAtivos.length === 0) {
        doc.setTextColor(0, 150, 0); // Verde
        doc.text('✅ STATUS: TUDO OK!', 20, yPos);
        yPos += 15;

        doc.setTextColor(0, 0, 0); // Preto
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text('Nenhum alerta ativo detectado no momento.', 20, yPos);
        doc.text('Seu estoque está funcionando perfeitamente!', 20, yPos + 8);
        yPos += 25;
    } else {
        doc.setTextColor(200, 0, 0); // Vermelho
        doc.text(`⚠️ ${alertasAtivos.length} ALERTA(S) DETECTADO(S)`, 20, yPos);
        yPos += 20;

        // Alertas por prioridade
        const prioridades = [
            { nome: 'CRÍTICOS', filtro: 'critica', cor: [200, 0, 0], icon: '🚨' },
            { nome: 'ALTA PRIORIDADE', filtro: 'alta', cor: [255, 140, 0], icon: '⚠️' },
            { nome: 'MÉDIA PRIORIDADE', filtro: 'media', cor: [255, 200, 0], icon: '⚡' }
        ];

        prioridades.forEach(prioridade => {
            const alertasPrioridade = alertasAtivos.filter(a => a.prioridade === prioridade.filtro);

            if (alertasPrioridade.length > 0) {
                doc.setTextColor(...prioridade.cor);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text(`${prioridade.icon} ${prioridade.nome} (${alertasPrioridade.length}):`, 20, yPos);
                yPos += 10;

                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);

                alertasPrioridade.forEach(alerta => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }

                    doc.text(`• ${alerta.titulo}`, 25, yPos);
                    yPos += 6;
                    doc.text(`  ${alerta.descricao}`, 25, yPos);
                    yPos += 8;
                });

                yPos += 5;
            }
        });
    }

    // Resumo do estoque
    if (yPos > 200) {
        doc.addPage();
        yPos = 20;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('📊 RESUMO DO ESTOQUE', 20, yPos);
    yPos += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    const totalProdutos = produtos.length;
    const valorTotal = produtos.reduce((sum, p) => sum + (p.quantidade * p.preco), 0);
    const estoqueBaixo = produtos.filter(p => getStatusEstoque(p.quantidade, p.unidade) === 'baixo').length;
    const totalCategorias = [...new Set(produtos.map(p => p.categoria))].length;

    doc.text(`Total de produtos cadastrados: ${totalProdutos}`, 20, yPos);
    yPos += 8;
    doc.text(`Produtos com estoque baixo: ${estoqueBaixo}`, 20, yPos);
    yPos += 8;
    doc.text(`Número de categorias: ${totalCategorias}`, 20, yPos);
    yPos += 8;
    doc.text(`Valor total do inventário: R$ ${valorTotal.toFixed(2)}`, 20, yPos);
    yPos += 15;

    // Produtos com estoque baixo (detalhado)
    if (estoqueBaixo > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('🔴 PRODUTOS COM ESTOQUE BAIXO:', 20, yPos);
        yPos += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        produtos.filter(p => getStatusEstoque(p.quantidade, p.unidade) === 'baixo').forEach(produto => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            doc.text(`• ${produto.nome}: ${produto.quantidade} ${produto.unidade}`, 25, yPos);
            yPos += 6;
        });
    }

    // Rodapé
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Página ${i} de ${totalPages}`, 20, 290);
        doc.text('Relatório gerado automaticamente pelo sistema Doce Controle', 105, 290, { align: 'center' });
    }

    // Salvar PDF
    const dataFormatada = new Date().toISOString().split('T')[0];
    const horaFormatada = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
    const nomeArquivo = `relatorio_alertas_${dataFormatada}_${horaFormatada}.pdf`;

    doc.save(nomeArquivo);

    alert(`📋 Relatório completo gerado com sucesso!\n\n📁 ${nomeArquivo}\n\n${alertasAtivos.length > 0 ? '⚠️ ' + alertasAtivos.length + ' alerta(s) detectado(s)' : '✅ Nenhum alerta ativo'}`);
}

// Definição de cores dos temas padrão
const CORES_TEMAS = {
    'rosa': { primaria: '#ec4899', secundaria: '#a855f7' }, // pink-500, purple-500
    'azul': { primaria: '#3b82f6', secundaria: '#6366f1' }, // blue-500, indigo-500
    'verde': { primaria: '#22c55e', secundaria: '#10b981' }, // green-500, emerald-500
    'roxo': { primaria: '#a855f7', secundaria: '#8b5cf6' }  // purple-500, violet-500
};

function atualizarEstilosDinamicos(primaria, secundaria) {
    let style = document.getElementById('dynamic-theme-styles');
    if (!style) {
        style = document.createElement('style');
        style.id = 'dynamic-theme-styles';
        document.head.appendChild(style);
    }

    style.innerHTML = `
        :root {
            --cor-primaria: ${primaria};
            --cor-secundaria: ${secundaria};
        }
        
        /* Botões e elementos principais (Pink replacements) */
        .bg-pink-500 { background-color: var(--cor-primaria) !important; }
        .bg-pink-600 { background-color: var(--cor-primaria) !important; }
        .hover\\:bg-pink-600:hover { filter: brightness(0.9); }
        .text-pink-500 { color: var(--cor-primaria) !important; }
        .text-pink-600 { color: var(--cor-primaria) !important; }
        .border-pink-500 { border-color: var(--cor-primaria) !important; }
        .border-pink-300 { border-color: var(--cor-primaria) !important; opacity: 0.5; }
        
        /* Botões secundários ou gradientes (Purple replacements) */
        .bg-purple-500 { background-color: var(--cor-primaria) !important; } /* Unify to primary for buttons? or keep separate? */
        /* Actually keep secondary distinct */
        .bg-purple-600 { background-color: var(--cor-secundaria) !important; }
        .text-purple-600 { color: var(--cor-secundaria) !important; }
        .text-purple-800 { color: var(--cor-secundaria) !important; filter: brightness(0.7); }
        .border-purple-200 { border-color: var(--cor-secundaria) !important; opacity: 0.3; }
        
        /* Gradientes de botão */
        .from-pink-500 { --tw-gradient-from: var(--cor-primaria) !important; }
        .to-purple-600 { --tw-gradient-to: var(--cor-secundaria) !important; }
        
        /* Destaques e focos */
        .focus\\:ring-pink-500:focus { --tw-ring-color: var(--cor-primaria) !important; }
        .focus\\:ring-purple-500:focus { --tw-ring-color: var(--cor-secundaria) !important; }
        
        /* Sidebar active items */
        .sidebar-item.active { background-color: var(--cor-primaria) !important; color: white !important; }
    `;
}

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString('pt-BR');

    const sidebarTime = document.getElementById('sidebar-time');
    const sidebar = document.getElementById('desktopSidebar');

    if (sidebarTime) {
        // Check if sidebar is collapsed (w-20 class present)
        const isCollapsed = sidebar && sidebar.classList.contains('w-20');

        if (isCollapsed) {
            // Minimized: Show only Time or Date/Time in stacked small font?
            // User asked to adapt. Showing just time is cleanest for 80px width
            sidebarTime.innerHTML = `<div class="text-center"><div>${timeString}</div><div class="text-[10px]">${dateString}</div></div>`;
        } else {
            // Expanded: Full line
            sidebarTime.textContent = `${dateString} - ${timeString}`;
        }
    }
}

// Função Adicionar Item Cadastro (Estoque)
function adicionarItemCadastro(event) {
    event.preventDefault();

    const nome = document.getElementById('nomeItemCadastro').value;
    const categoria = document.getElementById('categoriaItemCadastro').value;
    // Quantidade agora é apenas número
    const quantidade = parseFloat(document.getElementById('quantidadeItemCadastro').value);

    // Gramatura e Unidade Juntos
    const gramatura = parseFloat(document.getElementById('gramaturaItemCadastro').value);
    const unidadeMedida = document.getElementById('unidadeItemCadastro').value; // g, kg, ml, L

    const preco = parseFloat(document.getElementById('precoItemCadastro').value);
    const validade = document.getElementById('validadeItemCadastro').value;
    const marca = document.getElementById('marcaItemCadastro').value;
    const codigoBarras = document.getElementById('codigoBarrasItemCadastro').value;

    if (!nome || isNaN(quantidade) || isNaN(preco)) {
        showCustomAlert('Erro', 'Preencha os campos obrigatórios!');
        return;
    }

    const novoItem = {
        id: proximoIdProduto++,
        nome,
        categoria,
        quantidade,
        gramatura,
        unidade: unidadeMedida, // Mantendo compatibilidade com campo 'unidade'
        preco,
        validade,
        marca,
        codigoBarras
    };

    produtos.push(novoItem);
    salvarDados();

    // Atualizar dashboard e outras telas
    atualizarDashboard();

    // Limpar formulário
    event.target.reset();

    showCustomAlert('Sucesso!', '✅ Produto cadastrado com sucesso!');
}

// ==========================================
// FIXES & OVERRIDES FOR THEME & SIDEBAR
// ==========================================

// CUSTOM ALERT FUNCTION
window.showCustomAlert = function (title, message) {
    const modal = document.getElementById('modalAlert');
    const titleEl = document.getElementById('modalAlertTitle');
    const msgEl = document.getElementById('modalAlertMessage');
    const iconEl = document.getElementById('modalAlertIcon');

    if (!modal) {
        alert(message); // Fallback
        return;
    }

    titleEl.textContent = title || 'Atenção';
    msgEl.textContent = message;

    // Simple icon logic
    if (title.toLowerCase().includes('sucesso')) iconEl.textContent = '✅';
    else if (title.toLowerCase().includes('erro')) iconEl.textContent = '❌';
    else iconEl.textContent = '⚠️';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

window.closeModalAlert = function () {
    const modal = document.getElementById('modalAlert');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// UPDATE BUSINESS NAME
window.atualizarNomeEmpresa = function () {
    const nomeInput = document.getElementById('nomeEmpresa');
    if (!nomeInput) return;
    const novoNome = nomeInput.value;

    // Save to db
    let personalizacao = db.get('personalizacao') || {};
    personalizacao.nomeEmpresa = novoNome;
    db.save('personalizacao', personalizacao);

    // Update preview in Personalizar section
    const preview = document.getElementById('previewNome');
    if (preview) preview.textContent = novoNome;
}

// Override or definition of color application
window.aplicarCoresPersonalizadas = function () {
    const corPrimaria = document.getElementById('corPrimaria').value;
    const corSecundaria = document.getElementById('corSecundaria').value;
    const corPrimariaHex = document.getElementById('corPrimariaHex').value;
    const corSecundariaHex = document.getElementById('corSecundariaHex').value;

    // Capture Nome Empresa as well
    const nomeEmpresa = document.getElementById('nomeEmpresa')?.value;

    const finalPrimaria = corPrimaria || corPrimariaHex;
    const finalSecundaria = corSecundaria || corSecundariaHex;

    // Apply CSS Variables
    document.documentElement.style.setProperty('--cor-primaria', finalPrimaria);
    document.documentElement.style.setProperty('--cor-secundaria', finalSecundaria);

    // Update Preview Elements if they exist
    const previewPrimaria = document.getElementById('previewPrimaria');
    if (previewPrimaria) previewPrimaria.textContent = finalPrimaria;

    const previewSecundaria = document.getElementById('previewSecundaria');
    if (previewSecundaria) previewSecundaria.textContent = finalSecundaria;

    const previewGradiente = document.getElementById('previewGradiente');
    if (previewGradiente) previewGradiente.style.background = `linear-gradient(135deg, ${finalPrimaria}, ${finalSecundaria})`;

    // Update Status
    const status = document.getElementById('statusPersonalizacao');
    if (status) status.textContent = 'Cores personalizadas ativas';

    // UPDATE SIDEBAR COLORS
    updateSidebarColors(finalPrimaria);

    // Save
    let personalizacao = db.get('personalizacao') || {};
    personalizacao.corPrimaria = finalPrimaria;
    personalizacao.corSecundaria = finalSecundaria;
    if (nomeEmpresa) personalizacao.nomeEmpresa = nomeEmpresa;

    if (typeof salvarPersonalizacaoLocal === 'function') {
        if (window.personalizacao) {
            window.personalizacao.corPrimaria = finalPrimaria;
            window.personalizacao.corSecundaria = finalSecundaria;
            if (nomeEmpresa) window.personalizacao.nomeEmpresa = nomeEmpresa;
        }
        salvarPersonalizacaoLocal();
    } else {
        db.save('personalizacao', personalizacao);
    }
};

window.aplicarTema = function (temaNome) {
    // Defined themes
    const themes = {
        'rosa': { primaria: '#ec4899', secundaria: '#a855f7' },
        'azul': { primaria: '#3b82f6', secundaria: '#10b981' },
        'roxo': { primaria: '#8b5cf6', secundaria: '#ec4899' },
        'verde': { primaria: '#10b981', secundaria: '#3b82f6' },
        'laranja': { primaria: '#f97316', secundaria: '#ef4444' },
        'escuro': { primaria: '#1f2937', secundaria: '#4b5563' } // Example
    };

    const tema = themes[temaNome];
    if (tema) {
        document.documentElement.style.setProperty('--cor-primaria', tema.primaria);
        document.documentElement.style.setProperty('--cor-secundaria', tema.secundaria);

        // Update inputs
        if (document.getElementById('corPrimaria')) document.getElementById('corPrimaria').value = tema.primaria;
        if (document.getElementById('corSecundaria')) document.getElementById('corSecundaria').value = tema.secundaria;
        if (document.getElementById('corPrimariaHex')) document.getElementById('corPrimariaHex').value = tema.primaria;
        if (document.getElementById('corSecundariaHex')) document.getElementById('corSecundariaHex').value = tema.secundaria;

        // Update sidebar
        updateSidebarColors(tema.primaria);

        if (typeof salvarPersonalizacao === 'function') salvarPersonalizacao();
    }
};

function updateSidebarColors(color) {
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    sidebarBtns.forEach(btn => {
        // If active (e.g. bg-pink-500 which we might have removed or want to override)
        // We check if it SHOULD be active based on current section? 
        // For now, let's just assume the "active" class logic is handled by showSection
        // We just ensure dynamic hovering works or active state gets the color.

        if (btn.classList.contains('bg-pink-500') || btn.classList.contains('text-white') || btn.style.backgroundColor !== '') {
            btn.style.backgroundColor = color;
            btn.style.color = '#fff';
            btn.classList.remove('bg-pink-500'); // Remove tailwind class if present to allow inline style
        }

        // Add hover effect listeners if not present (difficult to check, so we clone)
        // Actually, let's just set the CSS variable for sidebar and use it in CSS?
        // But we are in JS mode.

        btn.onmouseover = function () {
            if (this.style.color !== 'rgb(255, 255, 255)' && this.style.color !== 'white') {
                this.style.color = color;
                this.style.backgroundColor = '#f3f4f6'; // gray-100
            }
        };
        btn.onmouseout = function () {
            if (this.style.color !== 'rgb(255, 255, 255)' && this.style.color !== 'white') {
                this.style.color = '';
                this.style.backgroundColor = '';
            }
        };
    });
}

// Inicializar sistema
document.addEventListener('DOMContentLoaded', function () {
    console.log('🧁 Iniciando Doce Controle...');

    // Iniciar relógio
    updateTime();
    setInterval(updateTime, 1000);

    // Carregar dados salvos primeiro
    const dadosCarregados = carregarDados();

    // Carregar configurações salvas
    carregarConfiguracoes();

    // Carregar personalização salva
    carregarPersonalizacao();

    // Atualizar interface
    atualizarDashboard();
    atualizarReceitas();
    atualizarVendas();
    atualizarListaCategorias();
    atualizarSelectsCategorias();
    atualizarEstatisticasCategorias();

    // Configurar sistema de notificações
    verificarNotificacoes();
    configurarNotificacaoAutomatica();
    solicitarPermissaoNotificacao();

    // Mostrar status de inicialização
    if (dadosCarregados) {
        console.log(`✅ Sistema carregado com dados existentes`);
        console.log(`📦 ${produtos.length} produtos | 📝 ${receitas.length} receitas | 💰 ${vendas.length} vendas`);
    } else {
        console.log('🆕 Sistema iniciado vazio - Pronto para receber dados!');

        // Mostrar mensagem de boas-vindas apenas na primeira vez
        setTimeout(() => {
            if (produtos.length === 0 && receitas.length === 0 && vendas.length === 0) {
                alert(
                    '🧁 Bem-vindo ao Doce Controle!\n\n' +
                    '✨ Sistema iniciado com sucesso!\n\n' +
                    '📋 Para começar:\n' +
                    '• Adicione seus primeiros produtos no Dashboard\n' +
                    '• Crie receitas na seção Receitas\n' +
                    '• Registre vendas na seção Vendas\n\n' +
                    '💾 Todos os dados são salvos automaticamente no seu navegador!'
                );
            }
        }, 1000);
    }

    // Sincronização automática entre abas
    window.addEventListener('storage', (event) => {
        if (event.key === db.prefix + 'dados') {
            console.log('🔄 Dados atualizados em outra aba, sincronizando...');
            if (carregarDados()) {
                atualizarDashboard();
                atualizarVendas();
                atualizarReceitas();
                verificarNotificacoes();
            }
        }
    });
});

// Funcao para importar produtos do Site (window.PRODUCTS_DATA)
function importarProdutosSite() {
    if (!window.PRODUCTS_DATA || window.PRODUCTS_DATA.length === 0) {
        alert('❌ Nenhum dado de produto encontrado (window.PRODUCTS_DATA).');
        return;
    }

    let adicionados = 0;
    let atualizados = 0;

    window.PRODUCTS_DATA.forEach(p => {
        // Verificar se categoria existe, senão criar
        if (p.category && !categorias.some(c => c.toLowerCase() === p.category.toLowerCase())) {
            categorias.push(p.category);
        }

        // Verificar se receita (produto venda) já existe pelo nome
        const existe = receitas.find(r => r.nome.toLowerCase() === p.name.toLowerCase());

        if (existe) {
            atualizados++;
        } else {
            // Criar nova receita baseada no produto do site
            const novaReceita = {
                id: proximoIdReceita++,
                nome: p.name,
                rendimento: 1,
                ingredientes: [], // Produto final
                modoPreparo: p.description || '',
                custoTotal: 0,
                custoPorPorcao: 0,
                margemLucro: 100,
                precoSugerido: p.price,
                precoVenda: p.price,
                imagem: p.image,
                categoria: p.category,
                badges: p.badges || [],
                origem: 'site'
            };
            receitas.push(novaReceita);
            adicionados++;
        }
    });

    salvarDados();
    if (typeof atualizarReceitas === 'function') atualizarReceitas();

    alert(`✅ Importação Concluída!\n🆕 Novos: ${adicionados}\n🔄 Existentes (ignorados): ${atualizados}`);
}

// Funcao para importar historico de vendas (window.HISTORIC_SALES)
function importarHistoricoVendas() {
    if (!window.HISTORIC_SALES || window.HISTORIC_SALES.length === 0) {
        alert('❌ Nenhum dado histórico encontrado.');
        return;
    }

    let adicionados = 0;

    window.HISTORIC_SALES.forEach(item => {
        // Criar objeto de venda
        const novaVenda = {
            id: proximoIdVenda++,
            data: item.data, // Data vinda do arquivo histórico
            cliente: 'Cliente Histórico',
            telefone: '',
            endereco: '',
            pagamento: 'Outro',
            itens: [{
                receita: item.produto,
                codigo: 'IMP',
                quantidade: item.qtd,
                preco: item.valor / item.qtd,
                custo: 0,
                total: item.valor,
                lucro: item.valor
            }],
            custoTotal: 0,
            totalPedido: item.valor,
            lucroTotal: item.valor,
            margemMedia: 100,
            tipo: 'personalizada'
        };

        vendas.push(novaVenda);
        adicionados++;
    });

    salvarDados();

    // Atualizar telas
    if (typeof atualizarVendas === 'function') atualizarVendas();
    if (typeof atualizarDashboard === 'function') atualizarDashboard();

    alert(`✅ Histórico Importado!\n📦 ${adicionados} vendas adicionadas.`);
}