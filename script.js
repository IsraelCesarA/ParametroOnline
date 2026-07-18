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
  const tempo = document.getElementById('tempo-viagem');
  const fim = document.getElementById('hora-final');
  if (tempo) tempo.innerText = '...';
  if (fim) fim.value = '';
  document.querySelectorAll('.sub-category input').forEach(i => i.value = '');
}

function clearInputFields() {
  const linha = document.getElementById('linha');
  const tab = document.getElementById('tabela-select');
  const hr = document.getElementById('hora-inicial-select');
  if (linha) linha.value = '';
  if (tab) { tab.value = ''; tab.disabled = true; while(tab.options.length>1) tab.remove(1); }
  if (hr) { hr.value = ''; hr.disabled = true; while(hr.options.length>1) hr.remove(1); }
}

// 🔴 COLOQUE A URL DA SUA API HOSPEDADA (Render/Vercel) — NÃO USE LOCALHOST!
const URL_API = 'https://api-transporte-fortaleza.onrender.com';

// ==================== SÓ RODA DEPOIS DO HTML CARREGAR ====================
document.addEventListener('DOMContentLoaded', () => {
  const linhaInput = document.getElementById('linha');
  const btnCalc = document.getElementById('calcular');
  const btnLimpar = document.getElementById('limpar');
  const tabelaSel = document.getElementById('tabela-select');
  const horaSel = document.getElementById('hora-inicial-select');
  let dados = null;

  async function buscarLinha(num) {
    try {
      const res = await fetch(`${URL_API}/linhas/${num}/horarios`);
      if (!res.ok) throw new Error(`Linha ${num} não encontrada`);
      return await res.json();
    } catch (e) {
      alert(`Erro: ${e.message}\nVerifique se a API está online.`);
      return null;
    }
  }

  linhaInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); tabelaSel?.focus(); }
  });

  linhaInput?.addEventListener('blur', async () => {
    const num = Number(linhaInput.value.trim());
    if (isNaN(num) || num <= 0) {
      alert('Digite um número de linha válido.');
      clearInputFields();
      return;
    }
    dados = await buscarLinha(num);
    if (!dados) return;

    while(tabelaSel.options.length>1) tabelaSel.remove(1);
    while(horaSel.options.length>1) horaSel.remove(1);
    horaSel.disabled = true;

    const tabs = [...new Set(dados.horarios.map(h => h.tabela))].sort((a,b)=>a-b);
    tabs.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = `Tabela ${t}`;
      tabelaSel.appendChild(opt);
    });
    tabelaSel.disabled = false;
  });

  tabelaSel?.addEventListener('change', e => {
    const tab = e.target.value;
    if (!tab) return;
    horaSel.disabled = false;
    while(horaSel.options.length>1) horaSel.remove(1);

    const hrs = dados.horarios.filter(h => String(h.tabela) === String(tab))
      .sort((a,b) => parseHM(a.horario_inicio) - parseHM(b.horario_inicio));
    hrs.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.horario_inicio;
      opt.textContent = `${h.horario_inicio} - ${h.posto_inicio}`;
      horaSel.appendChild(opt);
    });
  });

  btnCalc?.addEventListener('click', () => {
    clearFields();
    const linha = linhaInput.value;
    const tab = tabelaSel.value;
    const hrIni = horaSel.value;
    if (!linha || !tab || !hrIni) { alert('Preencha Linha, Tabela e Hora Inicial.'); return; }

    const reg = dados.horarios.find(h => String(h.tabela) === String(tab) && h.horario_inicio === hrIni);
    if (!reg) { alert('Horário não encontrado.'); return; }

    const hIni = parseHM(hrIni);
    const hFim = parseHM(reg.horario_fim);
    let tempo = hFim - hIni;
    if (tempo < 0) tempo += 24*60;

    document.getElementById('hora-final').value = reg.horario_fim;
    document.getElementById('tempo-viagem').innerText = tempo;

    let params;
    if (tempo <=30) params = {a:40, d:200, at25:100, at100:200};
    else if (tempo <=60) params = {a:28, d:200, at25:80, at100:200};
    else params = {a:20, d:200, at25:40, at100:200};

    const limAd = Math.round(tempo * params.a/100);
    const limDis = Math.round(tempo * params.d/100);
    const limAt25 = Math.round(tempo * params.at25/100);
    const limAt100 = Math.round(tempo * params.at100/100);

    const sAd = hIni - limAd;
    const cAd = hFim - limAd;
    const sAdD = hIni - limDis;
    const cAdD = hFim - limDis;
    const sAt25 = hIni + limAt25;
    const cAt25 = hFim + limAt25;
    const sAt100 = hIni + limAt100;
    const cAt100 = hFim + limAt100;

    if (tempo <=30) {
      document.getElementById('saida-0-30-25').value = fmtHM(sAt25);
      document.getElementById('chegada-0-30-25').value = fmtHM(cAt25);
      document.getElementById('saida-0-30-100').value = fmtHM(sAt100);
      document.getElementById('chegada-0-30-100').value = fmtHM(cAt100);
      document.getElementById('saida-0-30-ad').value = fmtHM(sAd);
      document.getElementById('chegada-0-30-ad').value = fmtHM(cAd);
      document.getElementById('saida-0-30-ad-dist').value = fmtHM(sAdD);
      document.getElementById('chegada-0-30-ad-dist').value = fmtHM(cAdD);
    } else if (tempo <=60) {
      document.getElementById('saida-31-60-25').value = fmtHM(sAt25);
      document.getElementById('chegada-31-60-25').value = fmtHM(cAt25);
      document.getElementById('saida-31-60-100').value = fmtHM(sAt100);
      document.getElementById('chegada-31-60-100').value = fmtHM(cAt100);
      document.getElementById('saida-31-60-ad').value = fmtHM(sAd);
      document.getElementById('chegada-31-60-ad').value = fmtHM(cAd);
      document.getElementById('saida-31-60-ad-dist').value = fmtHM(sAdD);
      document.getElementById('chegada-31-60-ad-dist').value = fmtHM(cAdD);
    } else {
      document.getElementById('saida-61-200-25').value = fmtHM(sAt25);
      document.getElementById('chegada-61-200-25').value = fmtHM(cAt25);
      document.getElementById('saida-61-200-100').value = fmtHM(sAt100);
      document.getElementById('chegada-61-200-100').value = fmtHM(cAt100);
      document.getElementById('saida-61-200-ad').value = fmtHM(sAd);
      document.getElementById('chegada-61-200-ad').value = fmtHM(cAd);
      document.getElementById('saida-61-200-ad-dist').value = fmtHM(sAdD);
      document.getElementById('chegada-61-200-ad-dist').value = fmtHM(cAdD);
    }
  });

  btnLimpar?.addEventListener('click', clearInputFields);
});
