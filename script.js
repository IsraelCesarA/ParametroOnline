const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const https = require('https');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

// 🔴 URL do seu banco de dados (mantém a que você já tem)
const { Pool } = require('pg');
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'sua-url-do-banco-aqui',
  ssl: { rejectUnauthorized: false }
});

// 🔴 URL base da NOVA API
const API_NOVA_BASE = 'https://api-transporte-rose.vercel.app/api';

// ==================== FUNÇÃO AUXILIAR DE REQUISIÇÃO ====================
function buscarJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let corpo = '';
      res.on('data', d => corpo += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(corpo));
        } catch (e) {
          reject(new Error(`Resposta não é JSON: ${corpo.slice(0,200)}`));
        }
      });
    }).on('error', reject);
  });
}

// ==================== FUNÇÃO DE ATUALIZAÇÃO AUTOMÁTICA ====================
async function atualizarDados() {
  console.log("🔄 Atualizando dados da nova API...");
  const hoje = new Date().toISOString().split('T')[0]; // Formato AAAA-MM-DD

  try {
    // 1. Busca lista de linhas
    console.log("📋 Buscando lista de linhas...");
    const linhas = await buscarJSON(`${API_NOVA_BASE}/linhas`);
    for (const l of linhas) {
      await db.query(`
        INSERT INTO linhas(numero, nome, numero_nome, tipo_linha)
        VALUES($1, $2, $3, $4)
        ON CONFLICT(numero) DO UPDATE SET
          nome = $2, numero_nome = $3, tipo_linha = $4, updated_at = NOW()
      `, [l.numero, l.nome, l.numero_nome || `${String(l.numero).padStart(3,'0')}-${l.nome}`, l.tipo_linha || 'Convencional']);
    }
    console.log(`✅ ${linhas.length} linhas atualizadas`);

    // 2. Busca programação do dia
    console.log(`⏰ Buscando horários de ${hoje}...`);
    const programacao = await buscarJSON(`${API_NOVA_BASE}/programacao/dia/${hoje}`);
    
    // Limpa horários antigos do dia antes de inserir os novos
    await db.query('DELETE FROM horarios WHERE data_referencia = $1', [hoje]);

    // Mapeia os dados conforme estrutura da nova API
    for (const item of programacao) {
      // Busca o id da linha correspondente
      const resLinha = await db.query('SELECT id FROM linhas WHERE numero = $1', [item.linha_numero || item.numero_linha]);
      if (resLinha.rows.length === 0) continue;
      const linhaId = resLinha.rows[0].id;

      // Processa tabelas e trechos
      const tabelas = Array.isArray(item.tabelas) ? item.tabelas : [item.tabelas];
      for (const tb of tabelas) {
        const trechos = Array.isArray(tb.trechos) ? tb.trechos : [tb.trechos];
        for (const tr of trechos) {
          await db.query(`
            INSERT INTO horarios(linha_id, tabela, posto_inicio, horario_inicio, horario_fim, data_referencia)
            VALUES($1, $2, $3, $4::TIME, $5::TIME, $6::DATE)
            ON CONFLICT DO NOTHING
          `, [
            linhaId,
            tb.numero || tb.tabela,
            tr.posto_inicio || tr.posto || 'Ponto Inicial',
            tr.horario_inicio || tr.inicio,
            tr.horario_fim || tr.fim,
            hoje
          ]);
        }
      }
    }
    console.log("✅ Horários atualizados com sucesso!");

  } catch (erro) {
    console.error("❌ Falha na atualização:", erro.message);
  }
}

// ==================== AGENDAMENTO ====================
cron.schedule('0 2 * * *', atualizarDados); // Roda todos os dias às 02h da manhã

// ==================== ROTAS DA SUA API ====================
app.get('/linhas', async (req, res) => {
  try {
    const resultado = await db.query('SELECT * FROM linhas ORDER BY numero');
    res.json(resultado.rows);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar linhas', detalhe: e.message });
  }
});

app.get('/linhas/:numero/horarios', async (req, res) => {
  try {
    const num = req.params.numero;
    const linha = await db.query('SELECT * FROM linhas WHERE numero = $1', [num]);
    if (linha.rows.length === 0) return res.status(404).json({ erro: 'Linha não encontrada' });

    const horarios = await db.query(`
      SELECT tabela, posto_inicio, horario_inicio, horario_fim
      FROM horarios 
      WHERE linha_id = $1 AND data_referencia = CURRENT_DATE
      ORDER BY tabela, horario_inicio
    `, [linha.rows[0].id]);

    res.json({ linha: linha.rows[0], horarios: horarios.rows });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar horários', detalhe: e.message });
  }
});

// Rota extra: repassa dados diretamente da nova API se precisar
app.get('/programacao/dia/:data', async (req, res) => {
  try {
    const dados = await buscarJSON(`${API_NOVA_BASE}/programacao/dia/${req.params.data}`);
    res.json(dados);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar programação', detalhe: e.message });
  }
});

// Inicia servidor
const porta = process.env.PORT || 3000;
app.listen(porta, async () => {
  console.log(`🚀 API rodando na porta ${porta}`);
  await atualizarDados(); // Primeira carga logo ao iniciar
});
