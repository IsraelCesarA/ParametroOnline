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
    document.querySelectorAll('.sub-category input').forEach(input => input.value = '');
}

function clearInputFields() {
    document.getElementById('linha').value = '';
    const tabelaSelect = document.getElementById('tabela-select');
    const horaInicialSelect = document.getElementById('hora-inicial-select');
    tabelaSelect.value = '';
    tabelaSelect.disabled = true;
    horaInicialSelect.value = '';
    horaInicialSelect.disabled = true;
    
    // Limpa opções
    tabelaSelect.innerHTML = '<option></option>';
    horaInicialSelect.innerHTML = '<option></option>';
}

// Data formatada para a URL
function getFormattedDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function fetchHorariosFromAPI(linha) {
    // URL conforme solicitado
    const url = `https://api-transporte-rose.vercel.app/api/programacao/dia/2026-07-13`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
        const dados = await response.json();
        
        // ADAPTE AQUI: 'linha', 'tabela', 'horario', 'posto' conforme o JSON real
        return dados.filter(item => String(item.linha) === String(linha));
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        alert("Erro ao buscar dados na API.");
        return null;
    }
}

const linhaInput = document.getElementById('linha');
const tabelaSelect = document.getElementById('tabela-select');
const horaInicialSelect = document.getElementById('hora-inicial-select');
let dadosDaAPI = null;

linhaInput.addEventListener('blur', async () => {
    const linha = linhaInput.value.trim();
    if (!linha) return;

    const programacao = await fetchHorariosFromAPI(linha);
    if (programacao && programacao.length > 0) {
        dadosDaAPI = programacao;
        
        tabelaSelect.innerHTML = '<option></option>';
        const tabelas = [...new Set(programacao.map(item => item.tabela))].sort((a,b) => a-b);
        
        tabelas.forEach(num => {
            const opt = document.createElement('option');
            opt.value = num;
            opt.textContent = num;
            tabelaSelect.appendChild(opt);
        });
        tabelaSelect.disabled = false;
    }
});

tabelaSelect.addEventListener('change', (e) => {
    const tabelaSelecionada = e.target.value;
    horaInicialSelect.innerHTML = '<option></option>';
    
    if (!tabelaSelecionada) return;

    const itens = dadosDaAPI.filter(item => item.tabela == tabelaSelecionada);
    
    itens.forEach(item => {
        const option = document.createElement('option');
        // Assume que o item tem 'horario' e 'posto'
        option.value = item.horario; 
        option.textContent = `${item.horario} (${item.posto})`;
        horaInicialSelect.appendChild(option);
    });
    horaInicialSelect.disabled = false;
});

document.getElementById('calcular').addEventListener('click', () => {
    const horaInicialVal = horaInicialSelect.value;
    if (!horaInicialVal) {
        alert('Selecione uma hora inicial.');
        return;
    }
    
    // Busca o objeto correspondente para pegar a hora final
    const itemSelecionado = dadosDaAPI.find(i => i.tabela == tabelaSelect.value && i.horario == horaInicialVal);
    
    if (!itemSelecionado || !itemSelecionado.horario_fim) {
        alert('Não foi possível encontrar o horário de término.');
        return;
    }

    const horaInicialMin = parseHM(itemSelecionado.horario);
    const horaFinalMin = parseHM(itemSelecionado.horario_fim);
    let tempoViagem = horaFinalMin - horaInicialMin;
    if (tempoViagem < 0) tempoViagem += 24 * 60;

    document.getElementById('hora-final').value = itemSelecionado.horario_fim;
    document.getElementById('tempo-viagem').innerText = tempoViagem;
    
    // Lógica de parâmetros existente
    let params = {};
    if (tempoViagem <= 30) params = { adiantamento: 40, distorcao: 200, atraso25: 100, atraso100: 200 };
    else if (tempoViagem <= 60) params = { adiantamento: 28, distorcao: 200, atraso25: 80, atraso100: 200 };
    else params = { adiantamento: 20, distorcao: 200, atraso25: 40, atraso100: 200 };

    // Cálculos e preenchimento (adaptar IDs conforme necessário)
    // Exemplo para o range 0-30:
    const adiantamentoLimiteMin = Math.round(tempoViagem * (params.adiantamento / 100));
    document.getElementById('saida-0-30-ad').value = fmtHM(horaInicialMin - adiantamentoLimiteMin);
    document.getElementById('chegada-0-30-ad').value = fmtHM(horaFinalMin - adiantamentoLimiteMin);
    // ... repetir lógica para outros campos ...
});

document.getElementById('limpar').addEventListener('click', clearInputFields);
