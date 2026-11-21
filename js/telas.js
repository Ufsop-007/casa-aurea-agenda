// Monta o HTML das telas a partir dos dados. Não guarda estado e não salva nada.
(function (raiz) {
  const C = raiz.CASA_CONFIG;
  const R = raiz.criarRegras(C);
  const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const DIAS = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  const pad = n => String(n).padStart(2, '0');
  const chave = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const moeda = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Valor para os campos de digitar: "8.000,00" (sem o R$, que já aparece ao lado)
  const dinheiro = v => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const lerDinheiro = s => Number(String(s || '').replace(/\./g, '').replace(',', '.')) || 0;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const maiuscula = s => s.charAt(0).toUpperCase() + s.slice(1);
  const dataLonga = d => maiuscula(`${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`);
  const nomeMes = m => `${maiuscula(MESES[m.m])} ${m.y}`;
  // "Tarde" ou "Tarde · 14h às 18h"
  const turno = r => { const f = r.kind === 'festa' ? R.faixaHorario(r) : ''; return C.PERIODOS[r.periodo].nome + (f ? ` · ${f}` : ''); };

  const ICONE_WHATS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3Z"/></svg>';
  const ICONE_AGENDA = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  const ICONE_CONTRATO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14 3v5h5M10 13h6M10 17h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  // ---------- links externos ----------
  function linkWhats(r) {
    const dig = (r.fone || '').replace(/\D/g, '');
    if (dig.length < 10) return '';
    const num = dig.length <= 11 ? '55' + dig : dig;
    const txt = `Olá, ${r.nome.split(' ')[0]}! Aqui é da ${C.NOME}. Sua festa está marcada para ${dataLonga(R.lerData(r.data)).toLowerCase()}, ${turno(r).toLowerCase()}.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(txt)}`;
  }
  // Usa o horário anotado; sem ele, o horário padrão do turno. Se terminar depois da meia-noite, vai para o dia seguinte.
  function datasAgenda(r) {
    const p = C.PERIODOS[r.periodo];
    const [ih, im] = (r.inicio || `${pad(p.ini)}:00`).split(':').map(Number);
    const [fh, fm] = (r.fim || `${pad(p.fim)}:00`).split(':').map(Number);
    const ini = R.lerData(r.data);
    ini.setHours(ih, im);
    const fim = R.lerData(r.data);
    fim.setHours(fh, fm);
    if (fim <= ini) fim.setDate(fim.getDate() + 1);
    const fmt = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    return `${fmt(ini)}/${fmt(fim)}`;
  }
  function linkGoogleAgenda(r) {
    const extras = C.EXTRAS.filter(e => r.extras.includes(e.id)).map(e => e.nome).join(', ') || 'nenhum';
    const det = [
      `Cliente: ${r.nome}`, `WhatsApp: ${r.fone || '-'}`, `Festa: ${r.festa}`,
      `Pacote: ${C.PACOTES[r.pacote].nome} · ${r.convidados} convidados`, `Extras: ${extras}`,
      `Total: ${moeda(r.total)} · ${R.situacao(r).txt}`,
      r.obs ? `Obs.: ${r.obs}` : ''
    ].filter(Boolean).join('\n');
    const q = new URLSearchParams({
      action: 'TEMPLATE', text: `Festa: ${r.nome} (${r.festa})`, dates: datasAgenda(r),
      ctz: 'America/Sao_Paulo', details: det, location: C.NOME
    });
    return `https://calendar.google.com/calendar/render?${q.toString()}`;
  }

  // ---------- calendário ----------
  // Cor do dia: o que pede mais atenção vence (esperando sinal > confirmada > paga > fechado).
  const PRIORIDADE = ['s-pend', 's-conf', 's-pago', 's-fech'];
  function celulaDia(regs, d, sel, hoje, mes) {
    const k = chave(d);
    const doDia = R.ordenar(R.doDia(regs, k));
    const porTurno = R.SLOTS.map(p => R.noPeriodo(regs, k, p));
    const ocupados = porTurno.filter(Boolean).length;
    const cls = ['dia'];
    if (k === chave(hoje)) cls.push('hoje');
    if (d < hoje) cls.push('passado');
    if (k === sel) cls.push('sel');
    if (doDia.length) {
      const cores = doDia.map(r => R.situacao(r).barra);
      cls.push('ocupado', 'c-' + PRIORIDADE.find(c => cores.includes(c)).slice(2));
      if (ocupados === R.SLOTS.length) cls.push('cheio');
    }
    const primeiro = doDia.find(r => r.kind === 'festa');
    const quem = primeiro ? primeiro.nome.split(' ')[0] : doDia.length ? 'Fechado' : '';
    const mais = doDia.length > 1 ? ` +${doDia.length - 1}` : '';
    const desc = R.SLOTS.map((p, i) => `${C.PERIODOS[p].nome.toLowerCase()} ${porTurno[i] ? R.situacao(porTurno[i]).txt + (porTurno[i].nome ? ' (' + porTurno[i].nome + ')' : '') : 'livre'}`).join(', ');
    return `<button type="button" class="${cls.join(' ')}" data-dia="${k}" aria-pressed="${k === sel}" aria-label="${d.getDate()} de ${MESES[mes.m]}: ${esc(desc)}">
      <span class="num">${d.getDate()}</span>
      ${quem ? `<span class="quem">${esc(quem)}${mais}</span>` : ''}
      <span class="slots">${porTurno.map(r => `<i class="s ${r ? R.situacao(r).barra : ''}"></i>`).join('')}</span>
    </button>`;
  }
  function calendario(regs, mes, sel, hoje) {
    const primeiro = new Date(mes.y, mes.m, 1);
    const total = new Date(mes.y, mes.m + 1, 0).getDate();
    let html = '<span class="dia vazio"></span>'.repeat(primeiro.getDay());
    for (let n = 1; n <= total; n++) html += celulaDia(regs, new Date(mes.y, mes.m, n), sel, hoje, mes);
    return html;
  }

  // ---------- cartão de festa ----------
  function botoesPagamento(r) {
    const est = R.estadoPagamento(r);
    if (est === 'tudo') {
      return `<span class="pago-ok">✓ Recebeu o valor integral</span>
        <button type="button" class="btn btn-sm btn-ghost" data-acao="desfazer-pag" data-id="${r.id}">Desfazer</button>`;
    }
    const primeiro = est === 'nada'
      ? `<button type="button" class="btn btn-sm" data-acao="pagar-sinal" data-id="${r.id}">Recebi o sinal</button>`
      : `<button type="button" class="btn btn-sm btn-ghost" data-acao="desfazer-pag" data-id="${r.id}">Desfazer sinal</button>`;
    return `${primeiro}<button type="button" class="btn btn-sm btn-ok" data-acao="pagar-tudo" data-id="${r.id}">${est === 'nada' ? 'Recebi tudo' : 'Recebi o saldo'}</button>`;
  }
  function acoesFesta(r, excluirId) {
    if (excluirId === r.id) {
      return `<div class="confirma">Excluir a festa de ${esc(r.nome)}? Não dá para desfazer.
        <button type="button" class="btn btn-sm btn-danger" data-acao="excluir-sim" data-id="${r.id}">Sim, excluir</button>
        <button type="button" class="btn btn-sm" data-acao="excluir-nao">Não</button></div>`;
    }
    const whats = linkWhats(r);
    return `<div class="acoes">${botoesPagamento(r)}</div>
      <div class="acoes">
        <button type="button" class="btn btn-sm" data-acao="editar" data-id="${r.id}">Editar</button>
        <button type="button" class="btn btn-sm" data-acao="contrato" data-id="${r.id}">${ICONE_CONTRATO}Contrato</button>
        ${whats ? `<a class="btn btn-sm" href="${whats}" target="_blank" rel="noopener">${ICONE_WHATS}WhatsApp</a>` : ''}
        <a class="btn btn-sm" href="${linkGoogleAgenda(r)}" target="_blank" rel="noopener">${ICONE_AGENDA}Google Agenda</a>
        <button type="button" class="btn btn-sm btn-ghost btn-perigo" data-acao="excluir" data-id="${r.id}">Excluir</button>
      </div>`;
  }
  function cartao(r, excluirId) {
    if (r.kind === 'fechado') {
      return `<article class="festa fechado">
        <div class="f-top"><span class="hora">${esc(turno(r))}</span><span class="pill off">Fechado</span></div>
        <p>${esc(r.motivo)}</p>
        <div class="acoes"><button type="button" class="btn btn-sm" data-acao="reabrir" data-id="${r.id}">Reabrir este horário</button></div>
      </article>`;
    }
    const st = R.situacao(r);
    const extras = C.EXTRAS.filter(e => r.extras.includes(e.id)).map(e => e.nome).join(', ');
    const estado = pago => `<em class="${pago ? 'ok-txt' : 'pend-txt'}">${pago ? 'recebido' : 'pendente'}</em>`;
    return `<article class="festa ${st.barra}">
      <div class="f-top"><span class="hora">${esc(turno(r))}</span><span class="pill ${st.cls}">${st.txt}</span></div>
      <h3>${esc(r.nome)}</h3>
      <p>${esc(r.festa)} · Pacote ${C.PACOTES[r.pacote].nome} · ${r.convidados} convidados</p>
      ${extras ? `<p class="muted">Extras: ${extras}</p>` : ''}
      ${r.fone ? `<p class="muted">WhatsApp: ${esc(r.fone)}</p>` : ''}
      ${r.obs ? `<p class="muted">Obs.: ${esc(r.obs)}</p>` : ''}
      <div class="valores">
        <div><small>Sinal</small><b>${moeda(r.sinal)}</b>${estado(r.sinalPago)}</div>
        <div><small>Saldo</small><b>${moeda(r.total - r.sinal)}</b>${estado(r.saldoPago)}</div>
        <div class="v-total"><small>Total</small><b>${moeda(r.total)}</b></div>
      </div>
      ${acoesFesta(r, excluirId)}
    </article>`;
  }

  // ---------- formulário ----------
  function opcoes(nome, tipo, lista, marcado, desligado) {
    return lista.map(o => `
      <label class="chip"><input class="oculto" type="${tipo}" name="${nome}" value="${esc(o.v)}" ${marcado(o.v) ? 'checked' : ''} ${desligado && desligado(o.v) ? 'disabled' : ''}>
        <span>${o.html}</span></label>`).join('');
  }
  // Hora em duas listas (hora e minutos): cabe em qualquer celular, ao contrário do relógio do Android.
  const HORAS = Array.from({ length: 24 }, (_, i) => pad(i));
  const MINUTOS = Array.from({ length: 12 }, (_, i) => pad(i * 5));
  function seletorHora(nome, rotulo, valor) {
    const [h, m] = (valor || '').split(':');
    const mins = m && !MINUTOS.includes(m) ? [...MINUTOS, m].sort() : MINUTOS; // mantém um minuto antigo, ex.: 07
    const ops = (lista, atual, vazio) => `<option value="">${vazio}</option>` +
      lista.map(x => `<option value="${x}" ${x === atual ? 'selected' : ''}>${x}</option>`).join('');
    return `<div class="campo"><span id="lbl-${nome}">${rotulo}</span>
      <div class="hora-sel" role="group" aria-labelledby="lbl-${nome}">
        <select name="${nome}_h" aria-label="${rotulo}: hora">${ops(HORAS, h, '--')}</select>
        <span aria-hidden="true">:</span>
        <select name="${nome}_m" aria-label="${rotulo}: minutos">${ops(mins, m, '--')}</select>
      </div></div>`;
  }

  const PAG_OPCOES = [
    { v: 'nada', html: 'Ainda não pagou' },
    { v: 'sinal', html: 'Pagou o sinal' },
    { v: 'tudo', html: 'Pagou tudo' }
  ];
  function formulario(ed, permitidos, podeCancelar) {
    const pacPadrao = Object.keys(C.PACOTES)[1] || Object.keys(C.PACOTES)[0];
    const v = ed || { periodo: permitidos[0], inicio: '', fim: '', nome: '', fone: '', festa: C.TIPOS[0], pacote: pacPadrao, convidados: C.CONVIDADOS_PADRAO, extras: [], obs: '', sinalPago: false, saldoPago: false };
    const total = ed ? ed.total : R.calcular(v.periodo, v.pacote, v.extras);
    const sinal = ed ? ed.sinal : R.sinalPadrao(total);
    const per = Object.entries(C.PERIODOS).map(([id, p]) => ({ v: id, html: `<b>${p.nome}</b>` }));
    const pac = Object.entries(C.PACOTES).map(([id, p]) => ({ v: id, html: `<b>${p.nome}</b><small>${moeda(p.preco)}</small>` }));
    const tipos = C.TIPOS.includes(v.festa) ? C.TIPOS : [...C.TIPOS, v.festa]; // mantém um tipo antigo ao editar
    return `<form id="form" novalidate>
      <div class="form-tit"><h3>${ed ? 'Editar festa' : 'Marcar festa neste dia'}</h3>
        ${podeCancelar ? '<button type="button" class="btn btn-sm btn-ghost" data-acao="cancelar">Cancelar</button>' : ''}</div>
      <fieldset><legend>Horário</legend>
        <div class="chips chips-4">${opcoes('periodo', 'radio', per, x => x === v.periodo, x => !permitidos.includes(x))}</div>
        <p class="hint">Se quiser, anote o horário combinado:</p>
        <div class="horas-opc">
          ${seletorHora('inicio', 'Começa às', v.inicio)}
          ${seletorHora('fim', 'Termina às', v.fim)}
        </div>
      </fieldset>
      <div class="duas">
        <label class="campo">Nome do cliente<input id="f-nome" name="nome" maxlength="120" autocomplete="off" value="${esc(v.nome)}" placeholder="Ex.: Maria Silva"></label>
        <label class="campo">WhatsApp<input id="f-fone" name="fone" maxlength="30" inputmode="tel" autocomplete="off" value="${esc(v.fone)}" placeholder="(11) 90000-0000"></label>
      </div>
      <fieldset><legend>Tipo de festa</legend>
        <div class="chips-solta">${opcoes('festa', 'radio', tipos.map(t => ({ v: t, html: esc(t) })), x => x === v.festa)}</div></fieldset>
      <fieldset><legend>Pacote</legend>
        <div class="chips">${opcoes('pacote', 'radio', pac, x => x === v.pacote)}</div></fieldset>
      <div class="duas">
        <div class="campo"><span id="lbl-conv">Convidados</span>
          <div class="stepper" role="group" aria-labelledby="lbl-conv">
            <button type="button" data-passo="-5" aria-label="Menos 5 convidados">−</button>
            <input id="f-conv" name="convidados" type="number" min="1" max="2000" inputmode="numeric" value="${v.convidados}" aria-labelledby="lbl-conv">
            <button type="button" data-passo="5" aria-label="Mais 5 convidados">+</button>
          </div>
        </div>
        <fieldset><legend>Extras</legend>
          <div class="chips-solta">${opcoes('extras', 'checkbox', C.EXTRAS.map(e => ({ v: e.id, html: esc(e.nome) })), x => v.extras.includes(x))}</div></fieldset>
      </div>
      <div class="duas">
        <label class="campo">Valor total<span class="dinheiro"><input id="f-total" name="total" type="text" inputmode="numeric" autocomplete="off" value="${dinheiro(total)}"></span></label>
        <label class="campo">Sinal (${Math.round(C.PCT_SINAL * 100)}%)<span class="dinheiro"><input id="f-sinal" name="sinal" type="text" inputmode="numeric" autocomplete="off" value="${dinheiro(sinal)}"></span></label>
      </div>
      <div class="saldo-linha"><span>Saldo a receber depois</span><b id="f-saldo">${moeda(Math.max(0, total - sinal))}</b></div>
      <fieldset><legend>Pagamento</legend>
        <div class="chips">${opcoes('pagamento', 'radio', PAG_OPCOES, x => x === R.estadoPagamento(v))}</div></fieldset>
      <label class="campo">Observações (opcional)<textarea id="f-obs" name="obs" maxlength="1000" rows="2" placeholder="Tema, horário do bolo, pedidos especiais...">${esc(v.obs)}</textarea></label>
      <p class="erro" id="f-erro" role="alert" hidden></p>
      <button class="btn btn-primary btn-lg" type="submit">${ed ? 'Salvar alterações' : 'Salvar festa'}</button>
    </form>`;
  }

  // ---------- ficha do dia ----------
  function painelDia(regs, estado, hoje) {
    const { sel, editId, formAberto, excluirId } = estado;
    if (!sel) {
      return `<div class="vazio-dia"><h2>Escolha um dia no calendário</h2>
        <p class="muted">Aqui aparecem as festas daquele dia. Se o dia estiver livre, você preenche os dados e salva.</p></div>`;
    }
    const d = R.lerData(sel);
    const lista = R.ordenar(R.doDia(regs, sel));
    const visiveis = lista.filter(r => r.id !== editId);
    const ed = editId ? lista.find(r => r.id === editId) : null;
    const livres = R.periodosLivres(regs, sel);
    const vazio = lista.length === 0;
    const mostraForm = !!ed || (livres.length > 0 && (vazio || formAberto));
    const nomesLivres = livres.filter(p => p !== 'dia').map(p => C.PERIODOS[p].nome.toLowerCase()).join(', ');
    const resumo = vazio ? 'Dia livre' : livres.length ? `Ainda livre: ${nomesLivres}` : 'Dia completo';
    return `
      <div class="dia-head"><p class="eyebrow">${d < hoje ? 'Dia que já passou' : 'Dia escolhido'}</p><h2>${dataLonga(d)}</h2><p class="hint">${resumo}</p></div>
      ${visiveis.length ? `<div class="lista">${visiveis.map(r => cartao(r, excluirId)).join('')}</div>` : ''}
      ${mostraForm ? formulario(ed, R.periodosLivres(regs, sel, editId), !!ed || formAberto) : ''}
      ${!mostraForm && livres.length ? '<button type="button" class="btn btn-primary" data-acao="abrir-form">+ Marcar festa no horário livre</button>' : ''}
      ${!mostraForm && !livres.length ? '<p class="cheio-msg">Todos os horários deste dia já estão ocupados.</p>' : ''}
      ${!ed && livres.length ? '<button type="button" class="btn btn-sm btn-ghost" data-acao="fechar">Fechar os horários livres (sem festa)</button>' : ''}`;
  }

  raiz.Telas = { calendario, painelDia, cartao, nomeMes, dataLonga, moeda, dinheiro, lerDinheiro, esc, chave, pad, turno, MESES, DIAS };
})(window);
