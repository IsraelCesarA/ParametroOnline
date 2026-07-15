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
    while (tabelaSelect.options.length > 1) {
        tabelaSelect.options[1].remove();
    }
    while (horaInicialSelect.options.length > 1) {
        horaInicialSelect.options[1].remove();
    }
}

function getFormattedDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// ==================== FUNÇÃO AUXILIAR: CONVERSÃO XML PARA OBJETO ====================
function xmlParaObjeto(xmlTexto) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlTexto, "text/xml");
    
    // Função recursiva para converter nós XML em objeto JS
    function converterNo(no) {
        const objeto = {};
        const filhos = no.children;

        // Se não tem filhos, retorna o valor do texto
        if (filhos.length === 0) return no.textContent.trim();

        // Agrupa elementos repetidos em arrays
        for (let i = 0; i < filhos.length; i++) {
            const filho = filhos[i];
            const nome = filho.tagName;

            if (objeto[nome]) {
                if (!Array.isArray(objeto[nome])) {
                    objeto[nome] = [objeto[nome]];
                }
                objeto[nome].push(converterNo(filho));
            } else {
                objeto[nome] = converterNo(filho);
            }
        }
        return objeto;
    }

    // Extrai o conteúdo principal de <ArrayOfProgramacao>
    const raiz = xmlDoc.documentElement;
    return converterNo(raiz);
}

// ==================== BUSCA DE DADOS NA API (AJUSTADO PARA XML) ====================
async function fetchHorariosFromAPI(linha) {
    const data = getFormattedDate();
    const urlBaseEtufor = `http://gistapis.etufor.ce.gov.br:8081/api/programacaoDia/${data}?linha=${linha}`;
    
    // Use o proxy que funcionar melhor — troque se precisar
    const url = `https://corsproxy.io/?url=${encodeURIComponent(urlBaseEtufor)}`;
    console.log("URL da requisição:", url);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/xml, text/xml, */*' },
            mode: 'cors'
        });

        if (!response.ok) throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        
        // ✅ LÊ COMO TEXTO E CONVERTE XML PARA OBJETO
        const xmlTexto = await response.text();
        const dadosXml = xmlParaObjeto(xmlTexto);
        console.log("Dados XML convertidos:", dadosXml);

        // Acessa a estrutura correta conforme a resposta que você mostrou
        const dados = dadosXml?.ArrayOfProgramacao?.programacao;
        return dados;

    } catch (error) {
        console.error("❌ Falha na requisição ou leitura:", error);
        let mensagemErro = "Erro ao buscar horários na API.";
        
        if (error.message.includes('ERR_CERT') || error.message.includes('certificado')) {
            mensagemErro += "\nMotivo: Problema de segurança no acesso ao servidor.";
        } else if (error.message.includes('Failed to fetch')) {
            mensagemErro += "\nMotivo: Servidor indisponível ou bloqueado.";
        } else if (error.message.includes('XML')) {
            mensagemErro += "\nMotivo: Formato de dados inválido recebido do servidor.";
        }

        alert(mensagemErro);
        return null;
    }
}

// ==================== LOCALIZAÇÃO DO HORÁRIO FINAL (AJUSTADO PARA ESTRUTURA XML) ====================
function findHoraFinal(dadosDaAPI, tabelaProcurada, horaInicialProcurada) {
    if (!dadosDaAPI) return null;
    
    // Acessa quadro -> tabelas (pode ser objeto único ou array)
    const quadro = dadosDaAPI.quadro;
    let tabelas = quadro.tabelas.tabela;
    if (!Array.isArray(tabelas)) tabelas = [tabelas]; // Trata caso só tenha 1 tabela

    for (const tabela of tabelas) {
        const numeroTabelaApi = String(tabela.numero).trim().toUpperCase();
        const numeroTabelaInput = String(tabelaProcurada).trim().toUpperCase();

        if (numeroTabelaApi === numeroTabelaInput) {
            let trechos = tabela.trechos.trecho;
            if (!Array.isArray(trechos)) trechos = [trechos]; // Trata caso só tenha 1 trecho

            for (const trecho of trechos) {
                const horarioCompleto = trecho.inicio.horario;
                const horaInicial = horarioCompleto.slice(horarioCompleto.indexOf('T') + 1, horarioCompleto.length - 3);
                
                if (horaInicial === horaInicialProcurada) {
                    const horarioFimCompleto = trecho.fim.horario;
                    return horarioFimCompleto.slice(horarioFimCompleto.indexOf('T') + 1, horarioFimCompleto.length - 3);
                }
            }
        }
    }
    return null;
}

// ==================== VARIÁVEIS GLOBAIS E EVENTOS ====================
const linhaInput = document.getElementById('linha');
const calcularButton = document.getElementById('calcular');
const limparButton = document.getElementById('limpar');
const tabelaSelect = document.getElementById('tabela-select');
const horaInicialSelect = document.getElementById('hora-inicial-select');
let dadosDaAPI = null;

// Evento Enter no campo Linha
linhaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        tabelaSelect.focus();
    }
});

// Busca dados ao sair do campo Linha
linhaInput.addEventListener('blur', async () => {
    const linha = Number(linhaInput.value.trim());
    if (!isNaN(linha)) {
        const programacao = await fetchHorariosFromAPI(linha);
        dadosDaAPI = programacao;
        
        if (programacao) {
            // Limpa opções antigas
            while (tabelaSelect.options.length > 1) tabelaSelect.options[1].remove();
            while (horaInicialSelect.options.length > 1) horaInicialSelect.options[1].remove();
            horaInicialSelect.disabled = true;

            // Carrega tabelas da estrutura XML
            const quadro = programacao.quadro;
            let tabelas = quadro.tabelas.tabela;
            if (!Array.isArray(tabelas)) tabelas = [tabelas];

            // Ordena tabelas por número
            const numerosTabelas = tabelas.map(t => t.numero).sort((a, b) => Number(a) - Number(b));
            numerosTabelas.forEach(numeroTabela => {
                const option = document.createElement('option');
                option.value = numeroTabela;
                option.textContent = numeroTabela;
                tabelaSelect.appendChild(option);
            });
            tabelaSelect.disabled = false;
        }
    }
});

// Carrega horários ao selecionar tabela
tabelaSelect.addEventListener('change', (e) => {
    const tabelaSelecionada = e.target.value;
    if (tabelaSelecionada) {
        horaInicialSelect.disabled = false;
        while (horaInicialSelect.options.length > 1) horaInicialSelect.options[1].remove();

        // Busca trechos da tabela selecionada
        const quadro = dadosDaAPI.quadro;
        let tabelas = quadro.tabelas.tabela;
        if (!Array.isArray(tabelas)) tabelas = [tabelas];
        const tabela = tabelas.find(t => String(t.numero) === String(tabelaSelecionada));

        let trechos = tabela.trechos.trecho;
        if (!Array.isArray(trechos)) trechos = [trechos];

        // Ordena horários corretamente
        const horariosOrdenados = trechos
            .map(trecho => {
                const horarioCompleto = trecho.inicio.horario;
                const horario = horarioCompleto.slice(horarioCompleto.indexOf('T') + 1, horarioCompleto.length - 3);
                const posto = trecho.inicio.postoControle.trim();
                return { horario, posto };
            })
            .sort((a, b) => parseHM(a.horario) - parseHM(b.horario));

        horariosOrdenados.forEach(({ horario, posto }) => {
            const option = document.createElement('option');
            option.value = horario;
            option.textContent = `${horario}  (${posto})`;
            horaInicialSelect.appendChild(option);
        });
    }
});

// Cálculo dos limites ao clicar em Calcular
calcularButton.addEventListener('click', async () => {
    clearFields();
    const linha = linhaInput.value;
    const tabela = tabelaSelect.value;
    const horaInicialInputVal = horaInicialSelect.value;

    if (!linha || !tabela || !horaInicialInputVal) {
        alert('Por favor, preencha a Linha, Tabela e Hora Inicial.');
        return;
    }

    const horaFinal = findHoraFinal(dadosDaAPI, tabela, horaInicialInputVal);
    if (!horaFinal) {
        alert('Horário correspondente não encontrado. Verifique os dados.');
        return;
    }

    const horaInicial = parseHM(horaInicialInputVal);
    let tempoViagem = parseHM(horaFinal) - horaInicial;
    if (tempoViagem < 0) tempoViagem += 24 * 60;

    document.getElementById('hora-final').value = horaFinal;
    document.getElementById('tempo-viagem').innerText = tempoViagem;

    // Parâmetros oficiais atualizados em 01/06/2026
    let params;
    if (tempoViagem >= 0 && tempoViagem <= 30) {
        params = { adiantamento: 40, distorcao: 200, atraso25: 100, atraso100: 200 };
    } else if (tempoViagem > 30 && tempoViagem <= 60) {
        params = { adiantamento: 28, distorcao: 200, atraso25: 80, atraso100: 200 };
    } else if (tempoViagem > 60 && tempoViagem <= 200) {
        params = { adiantamento: 20, distorcao: 200, atraso25: 40, atraso100: 200 };
    } else {
        alert('Tempo de viagem fora do intervalo de 0 a 200 minutos.');
        return;
    }

    // Cálculos de limites
    const adiantamentoLimiteMin = Math.round(tempoViagem * (params.adiantamento / 100));
    const distorcaoLimiteMin = Math.round(tempoViagem * (params.distorcao / 100));
    const atraso25LimiteMin = Math.round(tempoViagem * (params.atraso25 / 100));
    const atraso100LimiteMin = Math.round(tempoViagem * (params.atraso100 / 100));

    // Adiantamentos
    const saidaAdiantamento = horaInicial - adiantamentoLimiteMin;
    const chegadaAdiantamento = parseHM(horaFinal) - adiantamentoLimiteMin;
    const saidaAdiantamentoDist = horaInicial - distorcaoLimiteMin;
    const chegadaAdiantamentoDist = parseHM(horaFinal) - distorcaoLimiteMin;

    // Atrasos
    const saidaAtraso25 = horaInicial + atraso25LimiteMin;
    const chegadaAtraso25 = parseHM(horaFinal) + atraso25LimiteMin;
    const saidaAtraso100 = horaInicial + atraso100LimiteMin;
    const chegadaAtraso100 = parseHM(horaFinal) + atraso100LimiteMin;

    // Limpa campos antigos
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

// Limpar formulário
limparButton.addEventListener('click', clearInputFields);
