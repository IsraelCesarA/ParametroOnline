// ==================== FUNÇÕES AUXILIARES (IGUAIS ANTES) ====================
function parseHM(s) {
    if (!s) return null;
    const [hh, mm] = s.split(':').map(Number);
    return hh * 60 + mm;
}

function fmtHM(minutos) {
    const total = ((Math.round(minutos) % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
}

function clearFields() {
    document.getElementById('tempo-viagem').innerText = '...';
    document.getElementById('hora-final').value = '';
    const inputs = document.querySelectorAll('.sub-category input');
    inputs.forEach(input => input.value = '');
}

function clearInputFields() {
    document.getElementById('linha').value = '';
    document.getElementById('tabela-select').value = '';
    document.getElementById('hora-inicial-select').value = '';
    document.getElementById('tabela-select').disabled = true;
    document.getElementById('hora-inicial-select').disabled = true;
    while (tabelaSelect.options.length > 1) tabelaSelect.options[1].remove();
    while (horaInicialSelect.options.length > 1) horaInicialSelect.options[1].remove();
}

// ==================== CONFIGURAÇÃO DA SUA API ====================
// Coloque aqui a URL que você gerar ao hospedar o server.js
const URL_API = 'https://sua-api-aqui.vercel.app';

// ==================== BUSCA DADOS DA LINHA ====================
async function buscarDadosLinha(numeroLinha) {
    try {
        const resposta = await fetch(`${URL_API}/linhas/${numeroLinha}/horarios`);
        if (!resposta.ok) throw new Error(`Linha ${numeroLinha} não encontrada`);
        return await resposta.json();
    } catch (erro) {
        alert(`Erro: ${erro.message}`);
        return null;
    }
}

// ==================== VARIÁVEIS GLOBAIS ====================
const linhaInput = document.getElementById('linha');
const calcularButton = document.getElementById('calcular');
const limparButton = document.getElementById('limpar');
const tabelaSelect = document.getElementById('tabela-select');
const horaInicialSelect = document.getElementById('hora-inicial-select');
let dadosCarregados = null;

// ==================== EVENTOS DE USO (MESMO FLUXO DE ANTES) ====================
// Enter no campo linha vai para tabela
linhaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        tabelaSelect.focus();
    }
});

// Ao preencher a linha, carrega as tabelas
linhaInput.addEventListener('blur', async () => {
    const valorLinha = linhaInput.value.trim();
    const linha = Number(valorLinha);

    if (isNaN(linha) || linha <= 0) {
        alert("Digite um número de linha válido (ex: 4, 11, 45).");
        clearInputFields();
        return;
    }

    dadosCarregados = await buscarDadosLinha(linha);
    if (!dadosCarregados) return;

    // Limpa e carrega tabelas
    while (tabelaSelect.options.length > 1) tabelaSelect.options[1].remove();
    while (horaInicialSelect.options.length > 1) horaInicialSelect.options[1].remove();
    horaInicialSelect.disabled = true;

    // Pega tabelas únicas e ordenadas
    const tabelasUnicas = [...new Set(dadosCarregados.horarios.map(h => h.tabela))].sort((a, b) => Number(a) - Number(b));
    tabelasUnicas.forEach(tabela => {
        const option = document.createElement('option');
        option.value = tabela;
        option.textContent = `Tabela ${tabela}`;
        tabelaSelect.appendChild(option);
    });
    tabelaSelect.disabled = false;
});

// Ao escolher tabela, carrega horários e postos
tabelaSelect.addEventListener('change', (e) => {
    const tabelaEscolhida = e.target.value;
    if (!tabelaEscolhida) return;

    horaInicialSelect.disabled = false;
    while (horaInicialSelect.options.length > 1) horaInicialSelect.options[1].remove();

    // Filtra horários da tabela e ordena
    const horariosTabela = dadosCarregados.horarios
        .filter(h => String(h.tabela) === String(tabelaEscolhida))
        .sort((a, b) => parseHM(a.horario_inicio) - parseHM(b.horario_inicio));

    horariosTabela.forEach(item => {
        const option = document.createElement('option');
        option.value = item.horario_inicio;
        option.textContent = `${item.horario_inicio} - ${item.posto_inicio}`;
        horaInicialSelect.appendChild(option);
    });
});

// Cálculo igual ao original
calcularButton.addEventListener('click', () => {
    clearFields();
    const linha = linhaInput.value;
    const tabela = tabelaSelect.value;
    const horaInicial = horaInicialSelect.value;

    if (!linha || !tabela || !horaInicial) {
        alert('Preencha Linha, Tabela e Hora Inicial.');
        return;
    }

    // Encontra o registro completo com horário final
    const registro = dadosCarregados.horarios.find(h => 
        String(h.tabela) === String(tabela) && h.horario_inicio === horaInicial
    );
    if (!registro) {
        alert('Horário correspondente não encontrado.');
        return;
    }

    // Cálculos mantidos exatamente como antes
    const hIniMin = parseHM(horaInicial);
    const hFimMin = parseHM(registro.horario_fim);
    let tempoViagem = hFimMin - hIniMin;
    if (tempoViagem < 0) tempoViagem += 24 * 60;

    document.getElementById('hora-final').value = registro.horario_fim;
    document.getElementById('tempo-viagem').innerText = tempoViagem;

    // Parâmetros oficiais iguais
    let params;
    if (tempoViagem <= 30) {
        params = { adiantamento: 40, distorcao: 200, atraso25: 100, atraso100: 200 };
    } else if (tempoViagem <= 60) {
        params = { adiantamento: 28, distorcao: 200, atraso25: 80, atraso100: 200 };
    } else if (tempoViagem <= 200) {
        params = { adiantamento: 20, distorcao: 200, atraso25: 40, atraso100: 200 };
    } else {
        alert('Tempo de viagem fora do intervalo de 0 a 200 minutos.');
        return;
    }

    // Cálculos dos limites
    const adiantamentoLimiteMin = Math.round(tempoViagem * params.adiantamento / 100);
    const distorcaoLimiteMin = Math.round(tempoViagem * params.distorcao / 100);
    const atraso25LimiteMin = Math.round(tempoViagem * params.atraso25 / 100);
    const atraso100LimiteMin = Math.round(tempoViagem * params.atraso100 / 100);

    const saidaAdiantamento = hIniMin - adiantamentoLimiteMin;
    const chegadaAdiantamento = hFimMin - adiantamentoLimiteMin;
    const saidaAdiantamentoDist = hIniMin - distorcaoLimiteMin;
    const chegadaAdiantamentoDist = hFimMin - distorcaoLimiteMin;
    const saidaAtraso25 = hIniMin + atraso25LimiteMin;
    const chegadaAtraso25 = hFimMin + atraso25LimiteMin;
    const saidaAtraso100 = hIniMin + atraso100LimiteMin;
    const chegadaAtraso100 = hFimMin + atraso100LimiteMin;

    // Limpa e preenche os campos originais
    document.querySelectorAll('.sub-category input').forEach(input => input.value = '');

    if (tempoViagem <= 30) {
        document.getElementById('saida-0-30-25').value = fmtHM(saidaAtraso25);
        document.getElementById('chegada-0-30-25').value = fmtHM(chegadaAtraso25);
        document.getElementById('saida-0-30-100').value = fmtHM(saidaAtraso100);
        document.getElementById('chegada-0-30-100').value = fmtHM(chegadaAtraso100);
        document.getElementById('saida-0-30-ad').value = fmtHM(saidaAdiantamento);
        document.getElementById('chegada-0-30-ad').value = fmtHM(chegadaAdiantamento);
        document.getElementById('saida-0-30-ad-dist').value = fmtHM(saidaAdiantamentoDist);
        document.getElementById('chegada-0-30-ad-dist').value = fmtHM(chegadaAdiantamentoDist);
    } else if (tempoViagem <= 60) {
        document.getElementById('saida-31-60-25').value = fmtHM(saidaAtraso25);
        document.getElementById('chegada-31-60-25').value = fmtHM(chegadaAtraso25);
        document.getElementById('saida-31-60-100').value = fmtHM(saidaAtraso100);
        document.getElementById('chegada-31-60-100').value = fmtHM(chegadaAtraso100);
        document.getElementById('saida-31-60-ad').value = fmtHM(saidaAdiantamento);
        document.getElementById('chegada-31-60-ad').value = fmtHM(chegadaAdiantamento);
        document.getElementById('saida-31-60-ad-dist').value = fmtHM(saidaAdiantamentoDist);
        document.getElementById('chegada-31-60-ad-dist').value = fmtHM(chegadaAdiantamentoDist);
    } else {
        document.getElementById('saida-61-200-25').value = fmtHM(saidaAtraso25);
        document.getElementById('chegada-61-200-25').value = fmtHM(chegadaAtraso25);
        document.getElementById('saida-61-200-100').value = fmtHM(saidaAtraso100);
        document.getElementById('chegada-61-200-100').value = fmtHM(chegadaAtraso100);
        document.getElementById('saida-61-200-ad').value = fmtHM(saidaAdiantamento);
        document.getElementById('chegada-61-200-ad').value = fmtHM(chegadaAdiantamento);
        document.getElementById('saida-61-200-ad-dist').value = fmtHM(saidaAdiantamentoDist);
        document.getElementById('chegada-61-200-ad-dist').value = fmtHM(chegadaAdiantamentoDist);
    }
});

limparButton.addEventListener('click', clearInputFields);
