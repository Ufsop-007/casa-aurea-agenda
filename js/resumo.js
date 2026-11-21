// Monta as telas Resumo (números do mês, próximas festas, lembretes) e Planilha.
(function (raiz) {
  const C = raiz.CASA_CONFIG;
  const R = raiz.criarRegras(C);
  const T = raiz.Telas;
  const DIAS_LEMBRAR_BACKUP = 7;
  const DIA_MS = 86400000;

  function tiles(regs, mes) {
    const r = R.resumoDoMes(regs, mes.y, mes.m);
    const pctRecebido = r.combinado ? Math.round(r.recebido / r.combinado * 100) : 0;
    const pctFds = r.horariosFds ? Math.round(r.ocupadosFds / r.horariosFds * 100) : 0;
    return `
      <div class="card tile"><span class="eyebrow">Festas no mês</span><span class="valor">${r.festas}</span>
        <small>${r.confirmadas} confirmada${r.confirmadas === 1 ? '' : 's'} · ${r.esperando} esperando sinal</small></div>
      <div class="card tile"><span class="eyebrow">Combinado no mês</span><span class="valor">${T.moeda(r.combinado)}</span>
        <small>soma de todas as festas do mês</small></div>
      <div class="card tile"><span class="eyebrow">Já recebido</span><span class="valor">${T.moeda(r.recebido)}</span>
        <small>falta receber ${T.moeda(r.combinado - r.recebido)}</small>
        <div class="barra" role="img" aria-label="${pctRecebido}% recebido"><i style="width:${pctRecebido}%"></i></div></div>
      <div class="card tile"><span class="eyebrow">Fins de semana ocupados</span><span class="valor">${pctFds}%</span>
        <small>${r.ocupadosFds} de ${r.horariosFds} horários de sexta a domingo</small>
        <div class="barra" role="img" aria-label="${pctFds}% ocupado"><i class="barra-acc" style="width:${pctFds}%"></i></div></div>`;
  }

  function futuras(regs, hoje) {
    return R.ordenar(R.ativos(regs).filter(r => r.kind === 'festa' && R.lerData(r.data) >= hoje));
  }

  function proximas(lista) {
    if (!lista.length) return '<p class="muted">Nenhuma festa marcada daqui para frente. Vá na Agenda, toque num dia e preencha.</p>';
    return lista.map(r => {
      const d = R.lerData(r.data);
      const st = R.situacao(r);
      return `<button type="button" class="item" data-ir="${r.data}">
        <span class="data-chip"><b>${d.getDate()}</b><span>${T.MESES[d.getMonth()].slice(0, 3)} · ${T.DIAS[d.getDay()].slice(0, 3)}</span></span>
        <span class="info"><b>${T.esc(r.nome)}</b><span>${T.esc(T.turno(r))} · ${T.esc(r.festa)} · ${r.convidados} convidados</span></span>
        <span class="item-dir"><b>${T.moeda(r.total)}</b><span class="pill ${st.cls}">${st.txt}</span></span>
      </button>`;
    }).join('');
  }

  function lembretes(lista, hoje, ultimoExport, temRegistros, conflitos) {
    const limite = new Date(hoje.getTime() + C.DIAS_COBRAR_SALDO * DIA_MS);
    const itens = (conflitos || []).map(k => {
      const d = R.lerData(k);
      return `<li class="dot-busy"><span><b>Horário repetido:</b> dia ${d.getDate()}/${T.pad(d.getMonth() + 1)} tem duas festas no mesmo horário. Abra o dia na Agenda e ajuste.</span></li>`;
    });
    const prox = lista[0];
    if (prox) {
      itens.push(`<li class="dot-acc"><span><b>Próxima festa:</b> ${T.esc(prox.nome)}, ${T.dataLonga(R.lerData(prox.data)).toLowerCase()}, ${T.esc(T.turno(prox).toLowerCase())}.</span></li>`);
    }
    lista.filter(r => r.sinalPago && !r.saldoPago && R.lerData(r.data) <= limite).forEach(r => {
      itens.push(`<li class="dot-busy"><span><b>Cobrar o saldo</b> de ${T.esc(r.nome)}: ${T.moeda(r.total - r.sinal)}. A festa é dia ${R.lerData(r.data).getDate()}.</span></li>`);
    });
    lista.filter(r => !r.sinalPago).forEach(r => {
      const d = R.lerData(r.data);
      itens.push(`<li class="dot-pend"><span><b>Sinal pendente:</b> ${T.esc(r.nome)} (${T.moeda(r.sinal)}), dia ${d.getDate()}/${T.pad(d.getMonth() + 1)}.</span></li>`);
    });
    const dias = ultimoExport ? Math.floor((Date.now() - Date.parse(ultimoExport)) / DIA_MS) : null;
    if (temRegistros && (dias === null || dias >= DIAS_LEMBRAR_BACKUP)) {
      const quando = dias === null ? 'Você ainda não exportou nenhuma cópia' : `Faz ${dias} dias que você não exporta uma cópia`;
      itens.push(`<li class="dot-off"><span><b>Cópia de segurança:</b> ${quando}. Toque em <b>Exportar</b> lá embaixo.</span></li>`);
    }
    return itens.length ? itens.join('') : '<li class="dot-ok"><span>Nada pendente. Tudo em dia.</span></li>';
  }

  function planilha(regs) {
    const cols = ['Data', 'Horário', 'Cliente', 'WhatsApp', 'Festa', 'Pacote', 'Convid.', 'Total', 'Sinal', 'Saldo', 'Situação'];
    const linhas = R.ordenar(R.ativos(regs));
    const letras = cols.map((_, i) => `<th>${String.fromCharCode(65 + i)}</th>`).join('');
    const corpo = linhas.map((r, i) => {
      const d = R.lerData(r.data);
      const data = `${T.pad(d.getDate())}/${T.pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      const per = T.esc(T.turno(r));
      if (r.kind === 'fechado') {
        return `<tr class="fech"><td class="n">${i + 2}</td><td>${data}</td><td>${per}</td><td>${T.esc(r.motivo)}</td><td>—</td><td>—</td><td>—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td>Fechado</td></tr>`;
      }
      const st = R.situacao(r);
      const pendencia = r.saldoPago ? '' : r.sinalPago ? 'l-saldo' : 'l-sinal'; // linha colorida quando falta receber
      return `<tr class="${pendencia}"><td class="n">${i + 2}</td><td>${data}</td><td>${per}</td><td>${T.esc(r.nome)}</td><td>${T.esc(r.fone) || '—'}</td><td>${T.esc(r.festa)}</td><td>${C.PACOTES[r.pacote].nome}</td>
        <td class="num">${r.convidados}</td><td class="num">${T.moeda(r.total)}</td><td class="num">${T.moeda(r.sinal)}</td><td class="num">${T.moeda(r.total - r.sinal)}</td><td><span class="pill ${st.cls}">${st.txt}</span></td></tr>`;
    }).join('');
    const vazio = linhas.length ? '' : `<tr><td class="n">2</td><td colspan="${cols.length}" class="muted">Nenhuma festa ainda. O que você marcar na Agenda aparece aqui.</td></tr>`;
    return `<thead><tr class="letras"><th class="n"></th>${letras}</tr>
      <tr class="cab"><th class="n">1</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${corpo}${vazio}</tbody>`;
  }

  // Total já recebido de todas as festas (sinais + saldos pagos) e quanto ainda falta.
  function totalRecebido(regs) {
    const festas = R.ativos(regs).filter(r => r.kind === 'festa');
    const recebido = festas.reduce((s, r) => s + R.recebido(r), 0);
    const falta = festas.reduce((s, r) => s + r.total, 0) - recebido;
    return `<span class="eyebrow">Já recebido</span>
      <span class="valor">${T.moeda(recebido)}</span>
      <small>${falta > 0 ? `falta receber <b>${T.moeda(falta)}</b>` : 'nada pendente'}</small>`;
  }

  raiz.Resumo = { tiles, futuras, proximas, lembretes, planilha, totalRecebido };
})(window);
