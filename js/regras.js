// Regras da agenda: preços, horários livres, pagamentos, resumo do mês,
// junção de backups (exportar/importar) e planilha para o Excel.
// Não mexe na tela nem no armazenamento: só recebe dados e devolve resultados.
(function (raiz) {
  const APP_ID = 'casa-aurea-agenda';
  const VERSAO_BACKUP = 1;
  const LIMITES = { id: 64, nome: 120, fone: 30, festa: 60, obs: 1000, motivo: 120 };
  const MAX_CONVIDADOS = 2000;
  const MAX_VALOR = 10000000;
  const DIAS_FDS = [5, 6, 0]; // sexta, sábado, domingo
  const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
  const ID_RE = /^[A-Za-z0-9_-]+$/;
  const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

  function criarRegras(C) {
    const pad = n => String(n).padStart(2, '0');
    const lerData = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
    const ativos = regs => regs.filter(r => !r.excluido);

    const temPeriodo = p => typeof p === 'string' && Object.prototype.hasOwnProperty.call(C.PERIODOS, p);
    const temPacote = p => typeof p === 'string' && Object.prototype.hasOwnProperty.call(C.PACOTES, p);
    // Turnos do dia (manhã, tarde, noite...). "dia" é o dia todo e ocupa todos eles.
    const SLOTS = Object.keys(C.PERIODOS).filter(p => p !== 'dia');
    const ordemDe = p => (p === 'dia' ? -1 : SLOTS.indexOf(p));

    // "14:00" -> "14h", "18:30" -> "18h30"
    const hora = h => { const [hh, mm] = h.split(':'); return `${Number(hh)}h${mm === '00' ? '' : mm}`; };
    function faixaHorario(r) {
      const ini = HORA_RE.test(r.inicio || '') ? r.inicio : '';
      const fim = HORA_RE.test(r.fim || '') ? r.fim : '';
      if (ini && fim) return `${hora(ini)} às ${hora(fim)}`;
      if (fim) return `até ${hora(fim)}`;
      if (ini) return `a partir das ${hora(ini)}`;
      return '';
    }

    const PAGAMENTOS = { nada: [false, false], sinal: [true, false], tudo: [true, true] };
    function pagamento(tipo) {
      const [sinalPago, saldoPago] = PAGAMENTOS[tipo] || PAGAMENTOS.nada;
      return { sinalPago, saldoPago };
    }
    const estadoPagamento = r => (r.saldoPago ? 'tudo' : r.sinalPago ? 'sinal' : 'nada');

    function calcular(periodo, pacote, extras) {
      const pac = temPacote(pacote) ? C.PACOTES[pacote] : null;
      const per = temPeriodo(periodo) ? C.PERIODOS[periodo] : null;
      if (!pac || !per) return 0;
      const base = Math.round(pac.preco * per.fator);
      const ext = C.EXTRAS.filter(e => (extras || []).includes(e.id)).reduce((s, e) => s + e.preco, 0);
      return base + ext;
    }
    const centavos = v => Math.round(v * 100) / 100;
    const sinalPadrao = total => centavos(total * C.PCT_SINAL);

    const ocupa = (r, periodo) => r.periodo === 'dia' || periodo === 'dia' || r.periodo === periodo;
    const doDia = (regs, data, ignorarId) => ativos(regs).filter(r => r.data === data && r.id !== ignorarId);
    const periodoLivre = (regs, data, periodo, ignorarId) => !doDia(regs, data, ignorarId).some(r => ocupa(r, periodo));
    const periodosLivres = (regs, data, ignorarId) => Object.keys(C.PERIODOS).filter(p => periodoLivre(regs, data, p, ignorarId));
    const noPeriodo = (regs, data, periodo) => ativos(regs).find(r => r.data === data && (r.periodo === periodo || r.periodo === 'dia')) || null;

    // Dias com dois registros no mesmo horário (pode acontecer ao juntar cópias de dois aparelhos).
    function conflitos(regs) {
      const porDia = new Map();
      ativos(regs).forEach(r => porDia.set(r.data, [...(porDia.get(r.data) || []), r]));
      return [...porDia.entries()]
        .filter(([, lista]) => lista.some((a, i) => lista.slice(i + 1).some(b => ocupa(a, b.periodo))))
        .map(([data]) => data)
        .sort();
    }

    function situacao(r) {
      if (r.kind === 'fechado') return { txt: 'Fechado', cls: 'off', barra: 's-fech' };
      if (r.saldoPago) return { txt: 'Tudo pago', cls: 'ok', barra: 's-pago' };
      if (r.sinalPago) return { txt: 'Confirmada · falta o saldo', cls: 'busy', barra: 's-conf' };
      return { txt: 'Esperando sinal', cls: 'warn', barra: 's-pend' };
    }
    const recebido = r => r.saldoPago ? r.total : r.sinalPago ? r.sinal : 0;

    function resumoDoMes(regs, ano, mes) {
      const festas = ativos(regs).filter(r => {
        if (r.kind !== 'festa') return false;
        const d = lerData(r.data);
        return d.getFullYear() === ano && d.getMonth() === mes;
      });
      const confirmadas = festas.filter(r => r.sinalPago).length;
      const combinado = festas.reduce((s, r) => s + r.total, 0);
      const recebidoMes = festas.reduce((s, r) => s + recebido(r), 0);
      const nDias = new Date(ano, mes + 1, 0).getDate();
      let horariosFds = 0;
      let ocupadosFds = 0;
      for (let n = 1; n <= nDias; n++) {
        const d = new Date(ano, mes, n);
        if (!DIAS_FDS.includes(d.getDay())) continue;
        const k = `${ano}-${pad(mes + 1)}-${pad(n)}`;
        SLOTS.forEach(p => {
          horariosFds++;
          const r = noPeriodo(regs, k, p);
          if (r && r.kind === 'festa') ocupadosFds++;
        });
      }
      return { festas: festas.length, confirmadas, esperando: festas.length - confirmadas, combinado, recebido: recebidoMes, horariosFds, ocupadosFds };
    }

    // Junta o que veio de outro aparelho: o registro mais recente (atualizadoEm) vence.
    function mesclar(locais, vindos) {
      const porId = new Map(locais.map(r => [r.id, r]));
      let novos = 0, atualizados = 0, excluidos = 0;
      vindos.forEach(v => {
        const atual = porId.get(v.id);
        if (!atual) {
          porId.set(v.id, v);
          if (!v.excluido) novos++;
          return;
        }
        if (Date.parse(v.atualizadoEm) <= Date.parse(atual.atualizadoEm)) return;
        porId.set(v.id, v);
        if (v.excluido && !atual.excluido) excluidos++;
        else atualizados++;
      });
      return { registros: Array.from(porId.values()), novos, atualizados, excluidos };
    }

    // ---------- validação do arquivo importado (nunca confiar no conteúdo) ----------
    const texto = (v, max) => (typeof v === 'string' ? v : '').slice(0, max);
    const numero = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= MAX_VALOR) ? v : null;
    function dataValida(v) {
      if (typeof v !== 'string' || !DATA_RE.test(v)) return false;
      const [y, m, d] = v.split('-').map(Number);
      const dt = lerData(v);
      return y >= 2000 && dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
    }

    function limparRegistro(r) {
      if (!r || typeof r !== 'object') return null;
      if (typeof r.id !== 'string' || !ID_RE.test(r.id) || r.id.length > LIMITES.id) return null;
      if (r.kind !== 'festa' && r.kind !== 'fechado') return null;
      if (!dataValida(r.data) || !temPeriodo(r.periodo)) return null;
      const atualizadoEm = typeof r.atualizadoEm === 'string' && !Number.isNaN(Date.parse(r.atualizadoEm))
        ? new Date(r.atualizadoEm).toISOString() : new Date(0).toISOString();
      const base = { id: r.id, kind: r.kind, data: r.data, periodo: r.periodo, atualizadoEm, excluido: r.excluido === true };
      if (base.excluido) return base; // marca de exclusão: só o necessário para apagar no outro aparelho
      if (r.kind === 'fechado') return { ...base, motivo: texto(r.motivo, LIMITES.motivo) || 'Fechado' };
      const total = numero(r.total);
      const sinal = numero(r.sinal);
      const convidados = numero(r.convidados);
      if (!temPacote(r.pacote) || total === null || sinal === null || convidados === null) return null;
      return {
        ...base,
        nome: texto(r.nome, LIMITES.nome),
        fone: texto(r.fone, LIMITES.fone),
        festa: texto(r.festa, LIMITES.festa),
        inicio: HORA_RE.test(r.inicio || '') ? r.inicio : '',
        fim: HORA_RE.test(r.fim || '') ? r.fim : '',
        pacote: r.pacote,
        convidados: Math.min(MAX_CONVIDADOS, Math.round(convidados)),
        extras: Array.isArray(r.extras) ? C.EXTRAS.map(e => e.id).filter(id => r.extras.includes(id)) : [],
        total, sinal: Math.min(sinal, total),
        sinalPago: r.sinalPago === true,
        saldoPago: r.sinalPago === true && r.saldoPago === true,
        obs: texto(r.obs, LIMITES.obs)
      };
    }

    function validarBackup(obj) {
      if (!obj || typeof obj !== 'object') return { ok: false, erro: 'O arquivo está vazio ou corrompido.' };
      if (obj.app !== APP_ID) return { ok: false, erro: 'Esse arquivo não é um backup da agenda.' };
      if (obj.versao !== VERSAO_BACKUP || !Array.isArray(obj.registros)) return { ok: false, erro: 'Esse backup é de uma versão que o app não reconhece.' };
      const registros = obj.registros.map(limparRegistro).filter(Boolean);
      return { ok: true, registros, ignorados: obj.registros.length - registros.length };
    }

    const montarBackup = (regs, agora) => ({ app: APP_ID, versao: VERSAO_BACKUP, exportadoEm: agora.toISOString(), registros: regs });

    // ---------- planilha para o Excel (CSV com ponto e vírgula, padrão brasileiro) ----------
    function celula(v) {
      if (typeof v === 'number') return String(centavos(v)).replace('.', ','); // Excel em português usa vírgula
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // impede o Excel de rodar fórmulas vindas dos dados
      return /[;"\r\n]/.test(s) || s.startsWith("'") ? `"${s.replace(/"/g, '""')}"` : s;
    }
    function paraCSV(regs) {
      const cab = ['Data', 'Horário', 'Cliente', 'WhatsApp', 'Festa', 'Pacote', 'Convidados', 'Extras', 'Total', 'Sinal', 'Saldo', 'Situação'];
      const linhas = ordenar(ativos(regs)).map(r => {
        const d = lerData(r.data);
        const data = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
        const faixa = r.kind === 'festa' ? faixaHorario(r) : '';
        const per = C.PERIODOS[r.periodo].nome + (faixa ? ` (${faixa})` : '');
        if (r.kind === 'fechado') return [data, per, r.motivo, '', '', '', '', '', '', '', '', 'Fechado'];
        const extras = C.EXTRAS.filter(e => r.extras.includes(e.id)).map(e => e.nome).join(', ');
        return [data, per, r.nome, r.fone, r.festa, C.PACOTES[r.pacote].nome, r.convidados, extras,
          r.total, r.sinal, r.total - r.sinal, situacao(r).txt];
      });
      return [cab, ...linhas].map(l => l.map(celula).join(';')).join('\r\n') + '\r\n';
    }

    const ordenar = regs => [...regs].sort((a, b) => a.data.localeCompare(b.data) || ordemDe(a.periodo) - ordemDe(b.periodo));

    return {
      MAX_VALOR, SLOTS, faixaHorario, pagamento, estadoPagamento, calcular, sinalPadrao, periodoLivre, periodosLivres, noPeriodo, doDia, situacao, recebido, conflitos,
      resumoDoMes, mesclar, validarBackup, montarBackup, paraCSV, ordenar, ativos, lerData
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = criarRegras;
  else raiz.criarRegras = criarRegras;
})(typeof window !== 'undefined' ? window : globalThis);
