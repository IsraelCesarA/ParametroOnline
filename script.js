function parseHM(s) {
    if (!s) return null;
    const [hh, mm] = s.split(':').map(Number);
    return hh * 60 + mm;
}

function fmtHM(minutos) {
    if (minutos === null || isNaN(minutos)) return '';
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
    linhaAtual = '';
}

async function fetchHorariosFromAPI(linha) {
    const urlApiOriginal = `https://info-bus-fortaleza.vercel.app/api/programacao/${linha}`;
    
    // Passa a URL pela ponte do CORS Proxy para evitar o bloqueio de origem cruzada
    const url = `https://corsproxy.io/?${encodeURIComponent(urlApiOriginal)}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }
        const dados = await response.json();
        return dados; 
    } catch (error) {
        console.error("Erro ao buscar dados na API:", error);
        alert("Erro ao buscar horários na API. Verifique a linha e tente novamente.");
        return null;
    }
}

function findHoraFinal(dadosDaAPI, tabelaProcurada, horaInicialProcurada) {
    if (!dadosDaAPI) return null;

    let tabelas = [];
    if (dadosDaAPI.quadro && dadosDaAPI.quadro.tabelas) tabelas = dadosDaAPI.quadro.tabelas;
    else if (dadosDaAPI.tabelas) tabelas = dadosDaAPI.tabelas;
    else if (Array.isArray(dadosDaAPI)) tabelas = dadosDaAPI;

    for (const tabela of tabelas) {
        const numeroTabelaApi = String(tabela.numero).trim().toUpperCase();
        const numeroTabelaInput = String(tabelaProcurada).trim().toUpperCase();

        if (numeroTabelaApi === numeroTabelaInput) {
            for (const trecho of tabela.trechos) {
                const horaInicial = trecho.inicio.horario.slice(trecho.inicio.horario.indexOf('T') + 1, trecho.inicio.horario.length - 3);
                if (horaInicial === horaInicialProcurada) {
                    return trecho.fim.horario.slice(trecho.fim.horario.indexOf('T') + 1, trecho.fim.horario.length - 3);
                }
            }
        }
    }
    return null;
}

const linhaInput = document.getElementById('linha');
const calcularButton = document.getElementById('calcular');
const limparButton = document.getElementById('limpar');
const tabelaSelect = document.getElementById('tabela-select');
const horaInicialSelect = document.getElementById('hora-inicial-select');

var dadosDaAPI = null;
var linhaAtual = '';

async function carregarTabelas() {
    const linha = linhaInput.value.trim();
    if (!linha || isNaN(Number(linha)) || linha === linhaAtual) return;
    linhaAtual = linha;

    tabelaSelect.innerHTML = '<option>Carregando...</option>';
    tabelaSelect.disabled = true;
    horaInicialSelect.innerHTML = '<option></option>';
    horaInicialSelect.disabled = true;

    const programacao = await fetchHorariosFromAPI(linha);
    dadosDaAPI = programacao;

    tabelaSelect.innerHTML = '<option></option>';

    if (programacao) {
        let tabelas = [];
        if (programacao.quadro && programacao.quadro.tabelas) tabelas = programacao.quadro.tabelas;
        else if (programacao.tabelas) tabelas = programacao.tabelas;
        else if (Array.isArray(programacao)) tabelas = programacao;

        if (tabelas.length > 0) {
            const numerosTabelas = tabelas.map(t => t.numero).sort((a, b) => a - b);
            for (const numeroTabela of numerosTabelas) {
                const option = document.createElement('option');
                option.value = numeroTabela;
                option.textContent = numeroTabela;
                tabelaSelect.appendChild(option);
            }
            tabelaSelect.disabled = false;
        } else {
            tabelaSelect.innerHTML = '<option>Sem tabelas</option>';
        }
    } else {
        tabelaSelect.innerHTML = '<option>Erro</option>';
        linhaAtual = '';
    }
}

linhaInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        await carregarTabelas();
        tabelaSelect.focus();
    }
});

linhaInput.addEventListener('blur', async () => {
    await carregarTabelas();
});

tabelaSelect.addEventListener('change', (e) => {
    const tabelaSelecionada = e.target.value;
    
    horaInicialSelect.innerHTML = '<option></option>';
    
    if (tabelaSelecionada && dadosDaAPI) {
        horaInicialSelect.disabled = false;

        let tabelas = [];
        if (dadosDaAPI.quadro && dadosDaAPI.quadro.tabelas) tabelas = dadosDaAPI.quadro.tabelas;
        else if (dadosDaAPI.tabelas) tabelas = dadosDaAPI.tabelas;
        else if (Array.isArray(dadosDaAPI)) tabelas = dadosDaAPI;

        const tabelaEncontrada = tabelas.find(t => t.numero == tabelaSelecionada);
        
        if (tabelaEncontrada && tabelaEncontrada.trechos) {
            const horarios = [];
            for (const trecho of tabelaEncontrada.trechos) {
                const horaStr = trecho.inicio.horario.slice(trecho.inicio.horario.indexOf('T') + 1, trecho.inicio.horario.length - 3);
                horarios.push(horaStr + " - " + trecho.inicio.postoControle.trim());
            }
            horarios.sort((a, b) => parseHM(a.split(" - ")[0]) - parseHM(b.split(" - ")[0]));
            
            for (const horario of horarios) {
                const option = document.createElement('option');
                const [horarioPosto, nomePosto] = horario.split(" - ");
                option.value = horarioPosto;
                option.textContent = `${horarioPosto}  (${nomePosto})`;
                horaInicialSelect.appendChild(option);
            }
        }
    } else {
        horaInicialSelect.disabled = true;
    }
});

calcularButton.addEventListener('click', () => {
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
        alert('Horário correspondente não encontrado para a Linha, Tabela e Hora Inicial informadas. Verifique os dados.');
        return;
    }

    const horaInicial = parseHM(horaInicialInputVal);
    let tempoViagem = parseHM(horaFinal) - horaInicial;
    
    if (tempoViagem < 0) {
        tempoViagem += 24 * 60;
    }

    document.getElementById('hora-final').value = horaFinal;
    document.getElementById('tempo-viagem').innerText = tempoViagem;

    let params = {};
    
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

    const adiantamentoLimiteMin = Math.round(tempoViagem * (params.adiantamento / 100));
    const distorcaoLimiteMin = Math.round(tempoViagem * (params.distorcao / 100));
    const atraso25LimiteMin = Math.round(tempoViagem * (params.atraso25 / 100));
    const atraso100LimiteMin = Math.round(tempoViagem * (params.atraso100 / 100));

    const saidaAdiantamento = horaInicial - adiantamentoLimiteMin;
    const chegadaAdiantamento = parseHM(horaFinal) - adiantamentoLimiteMin;
    
    const saidaAdiantamentoDist = horaInicial - distorcaoLimiteMin;
    const chegadaAdiantamentoDist = parseHM(horaFinal) - distorcaoLimiteMin;
    
    const saidaAtraso25 = horaInicial + atraso25LimiteMin;
    const chegadaAtraso25 = parseHM(horaFinal) + atraso25LimiteMin;
    
    const saidaAtraso100 = horaInicial + atraso100LimiteMin;
    const chegadaAtraso100 = parseHM(horaFinal) + atraso100LimiteMin;

    document.querySelectorAll('.sub-category input').forEach(input => input.value = '');
    
    if (tempoViagem >= 0 && tempoViagem <= 30) {
        document.getElementById('saida-0-30-25').value = fmtHM(saidaAtraso25);
        document.getElementById('chegada-0-30-25').value = fmtHM(chegadaAtraso25);
        document.getElementById('saida-0-30-100').value = fmtHM(saidaAtraso100);
        document.getElementById('chegada-0-30-100').value = fmtHM(chegadaAtraso100);
        document.getElementById('saida-0-30-ad').value = fmtHM(saidaAdiantamento);
        document.getElementById('chegada-0-30-ad').value = fmtHM(chegadaAdiantamento);
        document.getElementById('saida-0-30-ad-dist').value = fmtHM(saidaAdiantamentoDist);
        document.getElementById('chegada-0-30-ad-dist').value = fmtHM(chegadaAdiantamentoDist);
    } else if (tempoViagem > 30 && tempoViagem <= 60) {
        document.getElementById('saida-31-60-25').value = fmtHM(saidaAtraso25);
        document.getElementById('chegada-31-60-25').value = fmtHM(chegadaAtraso25);
        document.getElementById('saida-31-60-100').value = fmtHM(saidaAtraso100);
        document.getElementById('chegada-31-60-100').value = fmtHM(chegadaAtraso100);
        document.getElementById('saida-31-60-ad').value = fmtHM(saidaAdiantamento);
        document.getElementById('chegada-31-60-ad').value = fmtHM(chegadaAdiantamento);
        document.getElementById('saida-31-60-ad-dist').value = fmtHM(saidaAdiantamentoDist);
        document.getElementById('chegada-31-60-ad-dist').value = fmtHM(chegadaAdiantamentoDist);
    } else if (tempoViagem > 60 && tempoViagem <= 200) {
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

limparButton.addEventListener('click', () => {
    clearInputFields();
    clearFields();
});
