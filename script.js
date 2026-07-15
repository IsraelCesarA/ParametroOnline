document.addEventListener('DOMContentLoaded', () => {

    // Função auxiliar: Converte string "HH:MM" para minutos totais
    function parseHM(s) {
        if (!s) return null;
        const [hh, mm] = s.split(':').map(Number);
        return hh * 60 + mm;
    }

    // Função auxiliar: Converte minutos totais de volta para "HH:MM"
    function fmtHM(minutos) {
        if (minutos === null || isNaN(minutos)) return '';
        const total = ((Math.round(minutos) % (24 * 60)) + (24 * 60)) % (24 * 60);
        const hh = String(Math.floor(total / 60)).padStart(2, '0');
        const mm = String(total % 60).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    // Limpa apenas os resultados da tela
    function clearFields() {
        document.getElementById('tempo-viagem').innerText = '...';
        const inputs = document.querySelectorAll('.sub-category input');
        inputs.forEach(input => input.value = '');
    }

    // Limpa os campos de digitação
    function clearInputFields() {
        if(document.getElementById('linha')) document.getElementById('linha').value = '';
        if(document.getElementById('tabela')) document.getElementById('tabela').value = '';
        if(document.getElementById('hora-inicial')) document.getElementById('hora-inicial').value = '';
        if(document.getElementById('hora-final')) document.getElementById('hora-final').value = '';
    }

    // Pega os botões na tela
    const calcularButton = document.getElementById('calcular');
    const limparButton = document.getElementById('limpar');

    // Mapeamento de atalhos do teclado (Avançar com a tecla Enter)
    const linhaInput = document.getElementById('linha');
    const tabelaInput = document.getElementById('tabela');
    const horaInicialInput = document.getElementById('hora-inicial');
    const horaFinalInput = document.getElementById('hora-final');

    if (linhaInput) {
        linhaInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); if(tabelaInput) tabelaInput.focus(); } 
        });
    }
    if (tabelaInput) {
        tabelaInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); if(horaInicialInput) horaInicialInput.focus(); } 
        });
    }
    if (horaInicialInput) {
        horaInicialInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); if(horaFinalInput) horaFinalInput.focus(); } 
        });
    }
    if (horaFinalInput) {
        horaFinalInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); if(calcularButton) calcularButton.click(); } 
        });
    }

    // -------------------------------------------------------------
    // EVENTO PRINCIPAL: CLIQUE NO BOTÃO CALCULAR
    // -------------------------------------------------------------
    if (calcularButton) {
        calcularButton.addEventListener('click', () => {
            clearFields();

            const horaInicialInputVal = document.getElementById('hora-inicial').value;
            const horaFinalInputVal = document.getElementById('hora-final').value;

            // Bloqueia e avisa se estiver vazio
            if (!horaInicialInputVal || !horaFinalInputVal) {
                alert('Por favor, preencha a Hora Inicial e a Hora Final.');
                return;
            }

            const horaInicial = parseHM(horaInicialInputVal);
            const horaFinal = parseHM(horaFinalInputVal);
            
            // Calcula tempo de viagem
            let tempoViagem = horaFinal - horaInicial;
            if (tempoViagem < 0) {
                tempoViagem += 24 * 60; // Ajusta se virou a meia-noite
            }

            // Mostra o resultado do tempo de viagem
            document.getElementById('tempo-viagem').innerText = tempoViagem;

            let params = {};
            
            // Regras baseadas no tempo
            if (tempoViagem >= 0 && tempoViagem <= 30) {
                params = { adiantamento: 40, distorcao: 200, atraso25: 100, atraso100: 200 };
            } else if (tempoViagem > 30 && tempoViagem <= 60) {
                params = { adiantamento: 28, distorcao: 200, atraso25: 80, atraso100: 200 };
            } else if (tempoViagem > 60 && tempoViagem <= 200) {
                params = { adiantamento: 20, distorcao: 200, atraso25: 40, atraso100: 200 };
            } else {
                alert('Aviso: O tempo de viagem excede os 200 minutos catalogados na regra.');
                return;
            }

            // Matematica de Limites
            const adiantamentoLimiteMin = Math.round(tempoViagem * (params.adiantamento / 100));
            const distorcaoLimiteMin = Math.round(tempoViagem * (params.distorcao / 100));
            const atraso25LimiteMin = Math.round(tempoViagem * (params.atraso25 / 100));
            const atraso100LimiteMin = Math.round(tempoViagem * (params.atraso100 / 100));

            // Aplica os minutos em cima das horas digitadas
            const saidaAdiantamento = horaInicial - adiantamentoLimiteMin;
            const chegadaAdiantamento = horaFinal - adiantamentoLimiteMin;
            const saidaAdiantamentoDist = horaInicial - distorcaoLimiteMin;
            const chegadaAdiantamentoDist = horaFinal - distorcaoLimiteMin;
            
            const saidaAtraso25 = horaInicial + atraso25LimiteMin;
            const chegadaAtraso25 = horaFinal + atraso25LimiteMin;
            const saidaAtraso100 = horaInicial + atraso100LimiteMin;
            const chegadaAtraso100 = horaFinal + atraso100LimiteMin;

            // Injeta os valores corretos na tela
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
    }

    if (limparButton) {
        limparButton.addEventListener('click', () => {
            clearInputFields();
            clearFields();
        });
    }

}); // Fim do DOMContentLoaded
