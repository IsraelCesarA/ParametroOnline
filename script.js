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
    document.querySelectorAll('.sub-category input').forEach(input => input.value = '');
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

// 🔴 URL DA SUA API PRÓPRIA (ou use diretamente a nova se preferir)
const SUA_API = 'https://seu-servidor-aqui.vercel.app/api';

// ==================== BUSCA DADOS ====================
async function buscarHorariosLinha(numeroLinha) {
    try {
        const res = await fetch(`${SUA_API}/linhas/${numeroLinha}/horarios`);
        if (!res.ok) throw new Error(`Linha não encontrada (${res.status})`);
        return await res.json();
    } catch (e) {
        alert(`Erro: ${e.message}`);
        return null;
    }
}

// ==================== VARIÁVEIS E EVENTOS ====================
const linhaInput = document.getElementById('linha');
const calcularButton = document.getElementById('calcular');
const limparButton = document.getElementById('limpar');
const tabelaSelect = document.getElementById('tabela-select');
const horaInicialSelect = document.getElementById('hora-inicial-select');
let dadosCarregados = null;

linhaInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); tabelaSelect.focus(); }
});

linhaInput.addEventListener('blur', async () => {
    const linha = Number(linhaInput.value.trim());
    if (isNaN(linha) || linha <= 0) {
        alert("Digite um número válido.");
        clearInputFields();
        return;
    }

    dadosCarregados = await buscarHorariosLinha(linha);
    if (!dadosCarregados) return;

    // Preenche tabelas
    while (tabelaSelect.options.length > 1) tabelaSelect.options[1].remove();
    while (horaInicialSelect.options.length > 1) horaInicialSelect.options[1].remove();
    horaInicialSelect.disabled = true;

    const tabelasUnicas = [...new Map(dadosCarregados.horarios.map(h => [h.tabela, h]))].map(([_, v]) => v.tabela).sort((a,b) => a - b);
    tabelasUnicas.forEach(tb => {
        const opt = document.createElement('option');
        opt.value = tb;
        opt.textContent = `Tabela ${tb}`;
        tabelaSelect.appendChild(opt);
    });
    tabelaSelect.disabled = false;
});

tabelaSelect.addEventListener('change', e => {
    const tabela = e.target.value;
    if (!tabela) return;

    horaInicialSelect.disabled = false;
    while (horaInicialSelect.options.length > 1) horaInicialSelect.options[1].remove();

    const horariosTabela = dadosCarregados.horarios.filter(h => String(h.tabela) === String(tabela))
        .sort((a,b) => parseHM(a.horario_inicio) - parseHM(b.horario_inicio));

    horariosTabela.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h.horario_inicio;
        opt.textContent = `${h.horario_inicio} - ${h.posto_inicio}`;
        horaInicialSelect.appendChild(opt);
    });
});

calcularButton.addEventListener('click', () => {
    clearFields();
    const linha = linhaInput.value;
    const tabela = tabelaSelect.value;
    const horaIni = horaInicialSelect.value;

    if (!linha || !tabela || !horaIni) {
        alert("Preencha todos os campos.");
        return;
    }

    const registro = dadosCarregados.horarios.find(h => 
        String(h.tabela) === String(tabela) && h.horario_inicio === horaIni
    );
    if (!registro) {
        alert("Horário não encontrado.");
        return;
    }

    const hIniMin = parseHM(horaIni);
    const hFimMin = parseHM(registro.horario_fim);
    let tempoViagem = hFimMin - hIniMin;
    if (tempoViagem < 0) tempoViagem += 24 * 60;

    document.getElementById('hora-final').value = registro.horario_fim;
    document.getElementById('tempo-viagem').innerText = tempoViagem;

    // Resto dos cálculos permanece igual...
    let params;
    if (tempoViagem <= 30) params = { adiantamento: 40, distorcao: 200, atraso25: 100, atraso100: 200 };
    else if (tempoViagem <= 60) params = { adiantamento: 28, distorcao: 200, atraso25: 80, atraso100: 200 };
    else params = { adiantamento: 20, distorcao: 200, atraso25: 40, atraso100: 200 };

    // ... cálculos e preenchimento dos campos como antes
});

limparButton.addEventListener('click', clearInputFields);
