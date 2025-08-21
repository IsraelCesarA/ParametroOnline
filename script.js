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
        // document.getElementById('linha').value = '';
        // document.getElementById('tabela').value = '';
        // document.getElementById('hora-inicial').value = '';
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

    async function fetchHorariosFromAPI(linha) {
        const data = getFormattedDate();
        const url = `https://api-lyart-chi.vercel.app/ProgramacaoNormal/${linha}?data=${data}`;
        
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
        if (!dadosDaAPI || dadosDaAPI.Message) {
            return null;
        }

        const tabelas = dadosDaAPI.quadro.tabelas;

        for (const tabela of tabelas) {
            const numeroTabelaApi = String(tabela.numero).trim().toUpperCase();
            const numeroTabelaInput = String(tabelaProcurada).trim().toUpperCase();

            if (numeroTabelaApi === numeroTabelaInput) {
                for (const trecho of tabela.trechos) {
                    const horaInicial = trecho.inicio.horario.slice(trecho.inicio.horario.indexOf('T') + 1, trecho.inicio.horario.length - 3);
                    
                    if (horaInicial === horaInicialProcurada) {
                        const horaFinal = trecho.fim.horario.slice(trecho.fim.horario.indexOf('T') + 1, trecho.fim.horario.length - 3);
                        return horaFinal;
                    }
                }
            }
        }
        return null;
    }

    // Seleciona os campos de entrada e os botões
    const linhaInput = document.getElementById('linha');
    const tabelaInput = document.getElementById('tabela');
    const horaInicialInput = document.getElementById('hora-inicial');
    const calcularButton = document.getElementById('calcular');
    const limparButton = document.getElementById('limpar');
    const tabelaSelect = document.getElementById('tabela-select');
    const horaInicialSelect = document.getElementById('hora-inicial-select');
    var dadosDaAPI = null;

    // Adiciona o evento de 'keydown' para cada campo para mudar o foco com a tecla Enter
    linhaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            tabelaInput.focus();
        }
    });

    // tabelaInput.addEventListener('keydown', (e) => {
    //     if (e.key === 'Enter') {
    //         e.preventDefault();
    //         horaInicialInput.focus();
    //     }
    // });

    // horaInicialInput.addEventListener('keydown', async (e) => {
    //     if (e.key === 'Enter') {
    //         e.preventDefault();
    //         // Ao pressionar Enter no último campo, dispara o clique no botão Calcular
    //         calcularButton.click();
    //     }
    // });

    linhaInput.addEventListener('blur', async () => {
        const linha = Number(linhaInput.value.trim());
        if (!isNaN(linha)) {
            const programacao = await fetchHorariosFromAPI(linha);
            dadosDaAPI = programacao;
            if (programacao) {
                if(tabelaSelect.options.length > 1) {
                while (tabelaSelect.options.length > 1) {
                    tabelaSelect.options[1].remove();
                }
                }
                if(horaInicialSelect.options.length > 1) {
                while (horaInicialSelect.options.length > 1) {
                    horaInicialSelect.options[1].remove();
                }
                horaInicialSelect.disabled = true;
                }

                for(let tabela of programacao.quadro.tabelas) {
                    const tabelas = [];
                    tabelas.push(tabela.numero);
                    tabelas.sort((a, b) => a - b); // Ordena as tabelas numericamente
                    for (const numeroTabela of tabelas) {
                        const option = document.createElement('option');
                        option.value = numeroTabela;
                        option.textContent = numeroTabela;
                        tabelaSelect.appendChild(option);
                    }
                }
                tabelaSelect.disabled = false;
                
            }
        }
    });

    tabelaSelect.addEventListener('change', (e) => {
        const tabelaSelecionada = e.target.value;
        if (tabelaSelecionada) {
            horaInicialSelect.disabled = false;
            if(horaInicialSelect.options.length > 1) {
                while (horaInicialSelect.options.length > 1) {
                    horaInicialSelect.options[1].remove();
                }
            }

            for (const trecho of dadosDaAPI.quadro.tabelas.find(t => t.numero == tabelaSelecionada).trechos) {
                const horarios = [];
                horarios.push(trecho.inicio.horario.slice(trecho.inicio.horario.indexOf('T') + 1, trecho.inicio.horario.length - 3)+" - "+trecho.inicio.postoControle.trim());
                horarios.sort((a, b) => parseHM(a) - parseHM(b)); // Ordena os horários
                for (const horario of horarios) {
                    const option = document.createElement('option');
                    const [horarioPosto,nomePosto] =horario.split(" - ");
                    option.value = horarioPosto;
                    option.textContent = `${horarioPosto}  (${nomePosto})`;
                    horaInicialSelect.appendChild(option);
                }
            }
        }
    });

    // horaInicialSelect.addEventListener('change', (e) => {
    //     const horaInicial = e.target.value;
    //     if (horaInicial) {
    //         horaFinalInput.value = calcularHoraFinal(horaInicial);
    //     }
    // });

    // Lógica do botão Calcular (mantida como está)
    calcularButton.addEventListener('click', async () => {
        clearFields();

        // const linha = linhaInput.value;
        // const tabela = tabelaInput.value;
        // const horaInicialInputVal = horaInicialInput.value;

        const linha = linhaInput.value;
        const tabela = tabelaSelect.value;
        const horaInicialInputVal = horaInicialSelect.value;

        if (!linha || !tabela || !horaInicialInputVal) {
            alert('Por favor, preencha a Linha, Tabela e Hora Inicial.');
            return;
        }

        // const dadosDaAPI = await fetchHorariosFromAPI(linha);
        // if (!dadosDaAPI) {
        //     return;
        // }

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
            params = { adiantamento: 50, atraso25: null, atraso100: 150 };
        } else if (tempoViagem > 30 && tempoViagem <= 60) {
            params = { adiantamento: 35, atraso25: 100, atraso100: 150 };
        } else if (tempoViagem > 60 && tempoViagem <= 200) {
            params = { adiantamento: 25, atraso25: 50, atraso100: 150 };
        } else {
            alert('Tempo de viagem fora do intervalo de 0 a 200 minutos.');
            return;
        }

        const adiantamentoLimiteMin = Math.round(tempoViagem * (params.adiantamento / 100));
        const atraso25LimiteMin = (params.atraso25 !== null) ? Math.round(tempoViagem * (params.atraso25 / 100)) : null;
        const atraso100LimiteMin = Math.round(tempoViagem * (params.atraso100 / 100));

        const saidaAdiantamento = horaInicial - adiantamentoLimiteMin;
        const chegadaAdiantamento = parseHM(horaFinal) - adiantamentoLimiteMin;
        
        const saidaAtraso25 = (atraso25LimiteMin !== null) ? horaInicial + atraso25LimiteMin : null;
        const chegadaAtraso25 = (atraso25LimiteMin !== null) ? parseHM(horaFinal) + atraso25LimiteMin : null;
        
        const saidaAtraso100 = horaInicial + atraso100LimiteMin;
        const chegadaAtraso100 = parseHM(horaFinal) + atraso100LimiteMin;

        document.querySelectorAll('.sub-category input').forEach(input => input.value = '');
        if (tempoViagem >= 0 && tempoViagem <= 30) {
            document.getElementById('saida-0-30-100').value = fmtHM(saidaAtraso100);
            document.getElementById('chegada-0-30-100').value = fmtHM(chegadaAtraso100);
            document.getElementById('saida-0-30-ad').value = fmtHM(saidaAdiantamento);
            document.getElementById('chegada-0-30-ad').value = fmtHM(chegadaAdiantamento);
        } else if (tempoViagem > 30 && tempoViagem <= 60) {
            document.getElementById('saida-31-60-25').value = fmtHM(saidaAtraso25);
            document.getElementById('chegada-31-60-25').value = fmtHM(chegadaAtraso25);
            document.getElementById('saida-31-60-100').value = fmtHM(saidaAtraso100);
            document.getElementById('chegada-31-60-100').value = fmtHM(chegadaAtraso100);
            document.getElementById('saida-31-60-ad').value = fmtHM(saidaAdiantamento);
            document.getElementById('chegada-31-60-ad').value = fmtHM(chegadaAdiantamento);
        } else if (tempoViagem > 60 && tempoViagem <= 200) {
            document.getElementById('saida-61-200-25').value = fmtHM(saidaAtraso25);
            document.getElementById('chegada-61-200-25').value = fmtHM(chegadaAtraso25);
            document.getElementById('saida-61-200-100').value = fmtHM(saidaAtraso100);
            document.getElementById('chegada-61-200-100').value = fmtHM(chegadaAtraso100);
            document.getElementById('saida-61-200-ad').value = fmtHM(saidaAdiantamento);
            document.getElementById('chegada-61-200-ad').value = fmtHM(chegadaAdiantamento);
        }
    });

    // Evento de clique do novo botão "Limpar"
    limparButton.addEventListener('click', () => {
        clearInputFields();
        clearFields();
    });
