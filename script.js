// ==================== FUNÇÕES AUXILIARES ====================
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

function getFormattedDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// ==================== CONVERSÃO XML PARA OBJETO ====================
function xmlParaObjeto(xmlTexto) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlTexto, "text/xml");

    function converterNo(no) {
        const objeto = {};
        const filhos = no.children;
        if (filhos.length === 0) return no.textContent.trim();

        for (let i = 0; i < filhos.length; i++) {
            const filho = filhos[i];
            const nome = filho.tagName;
            if (objeto[nome]) {
                if (!Array.isArray(objeto[nome])) objeto[nome] = [objeto[nome]];
                objeto[nome].push(converterNo(filho));
            } else {
                objeto[nome] = converterNo(filho);
            }
        }
        return objeto;
    }

    const raiz = xmlDoc.documentElement;
    return converterNo(raiz);
}

// ==================== 1. BUSCA LISTA DE LINHAS (COM PROXY PARA EVITAR CORS) ====================
async function carregarListaLinhas() {
    const urlOriginal = "https://info-bus-fortaleza.vercel.app/api/linhas";
    // Usa o mesmo proxy da ETUFOR para contornar bloqueio CORS
    const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlOriginal)}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro: ${response.status} ${response.statusText}`);
        const linhas = await response.json();
        console.log("✅ Lista de linhas carregada com sucesso:", linhas.length, "linhas");
        return linhas;
    } catch (error) {
        console.error("❌ Falha ao carregar linhas:", error);
        alert("Não foi possível carregar a lista de referência — a busca por horários funcionará normalmente se o número da linha for válido.");
        return []; // Retorna lista vazia para não travar o sistema
    }
}

// ==================== 2. BUSCA HORÁRIOS NA API DA ETUFOR ====================
async function fetchHorariosFromAPI(linha) {
    const data = getFormattedDate();
    const urlBaseEtufor = `http://gistapis.etufor.ce.gov.br:8081/api/programacaoDia/${data}?linha=${linha}`;
    const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlBaseEtufor)}`;

    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/xml, text/xml, */*' }
        });
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        
        const xmlTexto = await response.text();
        const dadosXml = xmlParaObjeto(xmlTexto);
        return dadosXml?.ArrayOfProgramacao?.programacao;

    } catch (error) {
        console.error("❌ Falha na busca de horários:", error);
        alert("Erro ao buscar horários — verifique o número da linha e tente novamente.");
        return null;
    }
}

// ==================== LOCALIZAÇÃO DO HORÁRIO FINAL ====================
function findHoraFinal(dadosDaAPI, tabelaProcurada, horaInicialProcurada) {
    if (!dadosDaAPI) return null;
    const quadro = dadosDaAPI.quadro;
    let tabelas = quadro.tabelas.tabela;
    if (!Array.isArray(tabelas)) tabelas = [tabelas];

    for (const tabela of tabelas) {
        if (String(tabela.numero).trim() !== String(tabelaProcurada).trim()) continue;
        
        let trechos = tabela.trechos.trecho;
        if (!Array.isArray(trechos)) trechos = [trechos];

        for (const trecho of trechos) {
            const horaInicial = trecho.inicio.horario.split('T')[1].slice(0, 5);
            if (horaInicial === horaInicialProcurada) {
                return trecho.fim.horario.split('T')[1].slice(0, 5);
            }
        }
    }
    return null;
}

// ==================== VARIÁVEIS E INICIALIZAÇÃO ====================
const linhaInput = document.getElementById('linha');
const calcularButton = document.getElementById('calcular');
const limparButton = document.getElementById('limpar');
const tabelaSelect = document.getElementById('tabela-select');
const horaInicialSelect = document.getElementById('hora-inicial-select');
let dadosDaAPI = null;
let listaLinhas = [];

// Carrega lista ao abrir a página
document.addEventListener('DOMContentLoaded', async () => {
    listaLinhas = await carregarListaLinhas();
});

// ==================== EVENTOS ====================
linhaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        tabelaSelect.focus();
    }
});

linhaInput.addEventListener('blur', async () => {
    const valorLinha = linhaInput.value.trim();
    const linha = Number(valorLinha);

    // Valida apenas formato numérico
    if (isNaN(linha) || linha <= 0) {
        alert("Digite um número de linha válido (ex: 4, 11, 45).");
        clearInputFields();
        return;
    }

    // Busca horários diretamente — não depende da lista de referência
    const programacao = await fetchHorariosFromAPI(linha);
    dadosDaAPI = programacao;

    if (!programacao) {
        alert(`Nenhum horário encontrado para a linha ${linha}. Verifique o número.`);
        clearInputFields();
        return;
    }

    // Preenche tabelas
    while (tabelaSelect.options.length > 1) tabelaSelect.options[1].remove();
    while (horaInicialSelect.options.length > 1) horaInicialSelect.options[1].remove();
    horaInicialSelect.disabled = true;

    const quadro = programacao.quadro;
    let tabelas = quadro.tabelas.tabela;
    if (!Array.isArray(tabelas)) tabelas = [tabelas];

    tabelas.sort((a, b) => Number(a.numero) - Number(b.numero));
    tabelas.forEach(tabela => {
        const option = document.createElement('option');
        option.value = tabela.numero;
        option.textContent = `Tabela ${tabela.numero}`;
        tabelaSelect.appendChild(option);
    });
    tabelaSelect.disabled = false;
});

tabelaSelect.addEventListener('change', (e) => {
    const tabelaSelecionada = e.target.value;
    if (!tabelaSelecionada) return;

    horaInicialSelect.disabled = false;
    while (horaInicialSelect.options.length > 1) horaInicialSelect.options[1].remove();

    const quadro = dadosDaAPI.quadro;
    let tabelas = quadro.tabelas.tabela;
    if (!Array.isArray(tabelas)) tabelas = [tabelas];
    const tabela = tabelas.find(t => String(t.numero) === String(tabelaSelecionada));

    let trechos = tabela.trechos.trecho;
    if (!Array.isArray(trechos)) trechos = [trechos];

    trechos.sort((a, b) => parseHM(a.inicio.horario.split('T')[1].slice(0, 5)) - parseHM(b.inicio.horario.split('T')[1].slice(0, 5)));
    trechos.forEach(trecho => {
        const horario = trecho.inicio.horario.split('T')[1].slice(0, 5);
        const posto = trecho.inicio.postoControle.trim();
        const option = document.createElement('option');
        option.value = horario;
        option.textContent = `${horario} - ${posto}`;
        horaInicialSelect.appendChild(option);
    });
});

calcularButton.addEventListener('click', () => {
    clearFields();
    const linha = linhaInput.value;
    const tabela = tabelaSelect.value;
    const horaInicialInputVal = horaInicialSelect.value;

    if (!linha || !tabela || !horaInicialInputVal) {
        alert('Preencha todos os campos: Linha, Tabela e Hora Inicial.');
        return;
    }

    const horaFinal = findHoraFinal(dadosDaAPI, tabela, horaInicialInputVal);
    if (!horaFinal) {
        alert('Horário correspondente não encontrado nos dados.');
        return;
    }

    const horaInicial = parseHM(horaInicialInputVal);
    let tempoViagem = parseHM(horaFinal) - horaInicial;
    if (tempoViagem < 0) tempoViagem += 24 * 60;

    document.getElementById('hora-final').value = horaFinal;
    document.getElementById('tempo-viagem').innerText = tempoViagem;

    // Parâmetros oficiais atualizados em 01/06/2026
    let params;
    if (tempoViagem <= 30) params = { adiantamento: 40, distorcao: 200, atraso25: 100, atraso100: 200 };
    else if (tempoViagem <= 60) params = { adiantamento: 28, distorcao: 200, atraso25: 80, atraso100: 200 };
    else if (tempoViagem <= 200) params = { adiantamento: 20, distorcao: 200, atraso25: 40, atraso100: 200 };
    else { alert('Tempo de viagem fora do intervalo permitido (0 a 200 minutos).'); return; }

    // Cálculos dos limites
    const adiantamentoLimiteMin = Math.round(tempoViagem * params.adiantamento / 100);
    const distorcaoLimiteMin = Math.round(tempoViagem * params.distorcao / 100);
    const atraso25LimiteMin = Math.round(tempoViagem * params.atraso25 / 100);
    const atraso100LimiteMin = Math.round(tempoViagem * params.atraso100 / 100);

    const saidaAdiantamento = horaInicial - adiantamentoLimiteMin;
    const chegadaAdiantamento = parseHM(horaFinal) - adiantamentoLimiteMin;
    const saidaAdiantamentoDist = horaInicial - distorcaoLimiteMin;
    const chegadaAdiantamentoDist = parseHM(horaFinal) - distorcaoLimiteMin;
    const saidaAtraso25 = horaInicial + atraso25LimiteMin;
    const chegadaAtraso25 = parseHM(horaFinal) + atraso25LimiteMin;
    const saidaAtraso100 = horaInicial + atraso100LimiteMin;
    const chegadaAtraso100 = parseHM(horaFinal) + atraso100LimiteMin;

    document.querySelectorAll('.sub-category input').forEach(input => input.value = '');

    // Preenche resultados conforme intervalo
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
