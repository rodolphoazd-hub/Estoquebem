# 📖 Wiki do Projeto: Controle de Estoque - Bem Browneria

Bem-vindo à documentação oficial do sistema **Controle de Estoque Bem**. Este guia foi criado para auxiliar no uso, manutenção e evolução da plataforma.

---

## 🚀 Visão Geral
O sistema é uma solução completa para a gestão de microempresas do ramo de confeitaria (especificamente a Bem Browneria). O objetivo é centralizar o controle de insumos, produção, vendas e análise financeira em uma interface moderna, rápida e intuitiva.

---

## 🛠️ Funcionalidades Principais

### 1. 📊 Painel de Controle (Dashboard)
O Dashboard oferece uma visão instantânea da saúde do negócio:
- **Resumo Financeiro**: Visualização rápida de vendas do dia, vendas do mês, lucro mensal e margem de lucro média.
- **Gráfico de Evolução do Lucro**: Acompanhamento dinâmico do desempenho financeiro com filtros por período.
- **Produtos Mais Vendidos**: Ranking por volume de unidades, facilitando a identificação dos itens favoritos dos clientes.
- **Produtos Mais Lucrativos**: Ranking baseado no lucro líquido por produto, ajudando na estratégia de precificação.
- **Top Clientes**: Lista dos clientes mais fiéis baseada na frequência de compras.

### 2. 📦 Gestão de Estoque e Insumos
- **Catálogo de Itens**: Cadastro detalhado de ingredientes e embalagens com controle de categoria e valores.
- **Alertas Visuais**: Sistema de cores que indica níveis críticos de estoque (Baixo, Médio, Alto).
- **Filtros Avançados**: Busca e filtragem por categoria, nível de estoque ou ordenação customizada.
- **Ações em Massa**: Edição e exclusão de múltiplos itens simultaneamente.

### 3. 💰 Gestão de Vendas
- **Registro de Pedidos**: Suporte para vendas simples (itens prontos) ou personalizadas (vendas diversas).
- **Cálculo de Margem**: O sistema calcula automaticamente o custo de produção, lucro bruto e margem percentual para cada venda.
- **Histórico de Vendas**: Lista completa de todas as transações com filtros por cliente, período e valor.
- **Relatórios**: Exportação de dados para Excel e PDF para fins de contabilidade e backup.

### 4. 🎨 Personalização
- **Identidade Visual**: Possibilidade de alterar o nome da empresa, logo e as cores primárias do sistema.
- **Modo Escuro**: Interface adaptada para uso em ambientes com pouca luz, reduzindo o cansaço visual.

---

## 🏗️ Arquitetura Técnica

### Pilha de Tecnologia
- **Frontend**: HTML5, CSS3 (Tailwind CSS) e JavaScript Puro (Vanilla JS).
- **Armazenamento**: LocalStorage do navegador, utilizando uma camada de abstração personalizada (`db.js`) para salvar e carregar dados com segurança.
- **Relatórios**: 
  - `SheetJS` para geração de arquivos `.xlsx`.
  - `jsPDF` para geração de documentos `.pdf`.

### Estrutura do Projeto
- `index.html`: Arquivo principal contendo toda a estrutura da aplicação.
- `js/app.js`: Motor principal da aplicação (lógica de vendas, estoque e gráficos).
- `js/db.js`: Gerenciador de persistência de dados.
- `js/auth.js` & `js/users.js`: Sistema de login e controle de usuários.

---

## 🔧 Guia de Manutenção

### Correção de Datas e Fuso Horário
O sistema implementa uma lógica robusta para tratamento de datas, garantindo que o dia da venda permaneça correto independentemente de onde o navegador esteja rodando. Isso é feito através do tratamento local de strings no formato `YYYY-MM-DD`.

### Backups
Como o sistema utiliza armazenamento local, é **altamente recomendado** exportar regularmente o estoque e as vendas para arquivos Excel utilizando os botões de exportação integrados. Isso funciona como um backup manual seguro.

---

## 📈 Próximos Passos
- Implementação de controle de validade com notificações automáticas.
- Gráficos comparativos de crescimento ano a ano.
- Sincronização em nuvem para múltiplos dispositivos.
