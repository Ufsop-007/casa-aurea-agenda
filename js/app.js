// Liga tudo: estado da tela, cliques, formulário, salvar no aparelho, exportar e importar.
(function () {
  const C = window.CASA_CONFIG;
  const R = window.criarRegras(C);
  const T = window.Telas;
  const S = window.Resumo;
  const A = window.Armazenamento;
  const F = window.Arquivos;
  const ABAS = ['agenda', 'resumo', 'planilha'];
  const $ = s => document.querySelector(s);
  const HOJE = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); })();

  // ---------- estado ----------
  const lido = A.carregar();
  const conferido = R.validarBackup(R.montarBackup(lido.lista, new Date()));
  let registros = conferido.registros || [];
  if (conferido.ignorados) A.guardarCopia(lido.lista); // guarda o original antes de qualquer gravação
  let mes = { y: HOJE.getFullYear(), m: HOJE.getMonth() };
  let sel = T.chave(HOJE);
  let editId = null;
  let formAberto = false;
  let excluirId = null;
  let totalManual = false;
  let sinalManual = false;

  const agora = () => new Date().toISOString();
  const novoId = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Devolve true se salvou. Se falhar, mostra o aviso e quem chamou não mostra "sucesso".
  function gravar(lista) {
    registros = lista;
    const ok = A.salvar(registros);
    renderTudo();
    if (!ok) aviso('Não consegui salvar neste aparelho. Toque em Exportar cópia agora para não perder nada.', 10000);
    return ok;
  }
  const alterar = (id, fn) => gravar(registros.map(r => r.id === id ? { ...fn(r), atualizadoEm: agora() } : r));
  const seGravou = (ok, msg) => { if (ok) aviso(msg); };
  // Excluir guarda só uma marca (sem dados pessoais) para a exclusão chegar ao outro aparelho.
  const marcaExclusao = r => ({ id: r.id, kind: r.kind, data: r.data, periodo: r.periodo, excluido: true, atualizadoEm: agora() });

  // ---------- telas ----------
  function renderAgenda() {
    $('#mesTitulo').textContent = T.nomeMes(mes);
    $('#cal').innerHTML = T.calendario(registros, mes, sel, HOJE);
    $('#painel').innerHTML = T.painelDia(registros, { sel, editId, formAberto, excluirId }, HOJE);
    if ($('#form')) ligarFormulario(editId ? registros.find(r => r.id === editId) : null);
  }
  function renderResumo() {
    $('#mesResumo').textContent = T.nomeMes(mes);
    $('#tiles').innerHTML = S.tiles(registros, mes);
    const lista = S.futuras(registros, HOJE);
    $('#proxQtd').textContent = lista.length;
    $('#prox').innerHTML = S.proximas(lista);
    $('#lembretes').innerHTML = S.lembretes(lista, HOJE, A.ultimoExport(), R.ativos(registros).length > 0, R.conflitos(registros));
  }
  function renderTudo() {
    renderAgenda();
    renderResumo();
    $('#tabela').innerHTML = S.planilha(registros);
    $('#totalPlanilha').innerHTML = S.totalRecebido(registros);
  }
  function mostrarAba() {
    const aba = ABAS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'agenda';
    ABAS.forEach(a => { $('#v-' + a).hidden = a !== aba; });
    document.querySelectorAll('.tabs a').forEach(a => {
      if (a.dataset.aba === aba) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  // ---------- formulário ----------
  function lerFormulario(form) {
    const fd = new FormData(form);
    return {
      periodo: fd.get('periodo'),
      nome: String(fd.get('nome') || '').trim(),
      fone: String(fd.get('fone') || '').trim(),
      festa: fd.get('festa') || C.TIPOS[0],
      pacote: fd.get('pacote') || Object.keys(C.PACOTES)[0],
      convidados: Math.min(2000, Math.max(1, Math.round(Number(fd.get('convidados')) || 1))),
      extras: fd.getAll('extras'),
      total: Math.min(R.MAX_VALOR, Math.max(0, Number(fd.get('total')) || 0)),
      sinal: Math.min(R.MAX_VALOR, Math.max(0, Number(fd.get('sinal')) || 0)),
      inicio: String(fd.get('inicio') || ''),
      fim: String(fd.get('fim') || ''),
      ...R.pagamento(fd.get('pagamento')),
      obs: String(fd.get('obs') || '').trim()
    };
  }
  function mascaraFone(v) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  function ligarFormulario(ed) {
    const form = $('#form');
    totalManual = !!ed && ed.total !== R.calcular(ed.periodo, ed.pacote, ed.extras);
    sinalManual = !!ed && ed.sinal !== R.sinalPadrao(ed.total);
    const atualizar = () => {
      const v = lerFormulario(form);
      if (!totalManual && v.periodo) $('#f-total').value = R.calcular(v.periodo, v.pacote, v.extras);
      const total = Number($('#f-total').value) || 0;
      if (!sinalManual) $('#f-sinal').value = R.sinalPadrao(total);
      $('#f-saldo').textContent = T.moeda(Math.max(0, total - (Number($('#f-sinal').value) || 0)));
    };
    form.addEventListener('input', e => {
      if (e.target.id === 'f-total') totalManual = true;
      if (e.target.id === 'f-sinal') sinalManual = true;
      if (e.target.id === 'f-fone') e.target.value = mascaraFone(e.target.value);
      atualizar();
    });
    form.addEventListener('change', atualizar);
    form.addEventListener('click', e => {
      const b = e.target.closest('[data-passo]');
      if (!b) return;
      const inp = $('#f-conv');
      inp.value = Math.min(2000, Math.max(1, (Number(inp.value) || 0) + Number(b.dataset.passo)));
    });
    form.addEventListener('submit', e => { e.preventDefault(); salvarFesta(form, ed); });
  }
  function mostrarErro(msg, campo) {
    const el = $('#f-erro');
    el.textContent = msg;
    el.hidden = false;
    if (campo) $(campo).focus();
  }
  function salvarFesta(form, ed) {
    const v = lerFormulario(form);
    if (!v.periodo) return mostrarErro('Escolha o horário da festa.');
    if (!v.nome) return mostrarErro('Escreva o nome do cliente.', '#f-nome');
    if (!R.periodoLivre(registros, sel, v.periodo, editId)) return mostrarErro('Esse horário já está ocupado neste dia.');
    if (v.total <= 0) return mostrarErro('Coloque o valor total da festa.', '#f-total');
    if (v.sinal > v.total) return mostrarErro('O sinal não pode ser maior que o total.', '#f-sinal');
    const reg = { ...v, id: ed ? ed.id : novoId(), kind: 'festa', data: sel, motivo: '', excluido: false, atualizadoEm: agora() };
    editId = null;
    formAberto = false;
    seGravou(gravar(ed ? registros.map(r => r.id === ed.id ? reg : r) : [...registros, reg]),
      ed ? 'Festa atualizada.' : `Festa de ${v.nome.split(' ')[0]} marcada.`);
  }

  // ---------- ações da ficha do dia ----------
  function fecharLivres() {
    const livres = R.periodosLivres(registros, sel);
    const base = { kind: 'fechado', data: sel, excluido: false, atualizadoEm: agora() };
    const novos = livres.includes('dia')
      ? [{ ...base, id: novoId(), periodo: 'dia', motivo: 'Dia fechado' }]
      : livres.filter(p => p !== 'dia').map(p => ({ ...base, id: novoId(), periodo: p, motivo: 'Horário fechado' }));
    return gravar([...registros, ...novos]);
  }
  const excluir = id => gravar(registros.map(r => r.id === id ? marcaExclusao(r) : r));
  const ACOES = {
    'pagar-sinal': id => seGravou(alterar(id, r => ({ ...r, ...R.pagamento('sinal') })), 'Sinal recebido.'),
    'pagar-tudo': id => seGravou(alterar(id, r => ({ ...r, ...R.pagamento('tudo') })), 'Valor integral recebido.'),
    // Volta um passo: tudo pago -> só sinal -> nada pago
    'desfazer-pag': id => seGravou(alterar(id, r => ({ ...r, ...R.pagamento(r.saldoPago ? 'sinal' : 'nada') })), 'Pagamento desfeito.'),
    editar: id => { editId = id; excluirId = null; },
    cancelar: () => { editId = null; formAberto = false; },
    'abrir-form': () => { formAberto = true; },
    excluir: id => { excluirId = id; },
    'excluir-nao': () => { excluirId = null; },
    'excluir-sim': id => { excluirId = null; seGravou(excluir(id), 'Festa excluída.'); },
    reabrir: id => seGravou(excluir(id), 'Horário reaberto.'),
    fechar: () => seGravou(fecharLivres(), 'Horário fechado.')
  };

  function escolherDia(k, rolar) {
    sel = k; editId = null; formAberto = false; excluirId = null;
    const d = R.lerData(k);
    mes = { y: d.getFullYear(), m: d.getMonth() };
    if (location.hash && location.hash !== '#agenda') location.hash = 'agenda';
    renderTudo();
    if (rolar && window.matchMedia('(max-width:900px)').matches) {
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      $('#painel').scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
    }
  }

  // ---------- exportar / importar / planilha ----------
  async function exportar() {
    const conteudo = JSON.stringify(R.montarBackup(registros, new Date()));
    const res = await F.entregar(`casa-aurea-backup-${F.hoje()}.json`, conteudo, 'application/json');
    if (res === 'cancelado') return;
    A.marcarExport(new Date());
    renderResumo();
    aviso(res === 'compartilhado' ? 'Cópia enviada. No outro aparelho, toque em Importar e escolha esse arquivo.' : 'Cópia baixada. No outro aparelho, toque em Importar e escolha esse arquivo.', 5000);
  }
  async function importar(arquivo) {
    try {
      const txt = await F.ler(arquivo);
      let obj;
      try { obj = JSON.parse(txt); } catch (e) { throw new Error('Esse arquivo não é um backup da agenda.'); }
      const v = R.validarBackup(obj);
      if (!v.ok) throw new Error(v.erro);
      const m = R.mesclar(registros, v.registros);
      if (!gravar(m.registros)) return;
      const partes = [`${m.novos} nova${m.novos === 1 ? '' : 's'}`, `${m.atualizados} atualizada${m.atualizados === 1 ? '' : 's'}`];
      if (m.excluidos) partes.push(`${m.excluidos} excluída${m.excluidos === 1 ? '' : 's'}`);
      const ign = v.ignorados ? ` ${v.ignorados} item(ns) com defeito ficaram de fora.` : '';
      const choque = R.conflitos(registros).length ? ' Atenção: há dias com duas festas no mesmo horário; veja os Lembretes.' : '';
      aviso(`Agenda atualizada: ${partes.join(', ')}.${ign}${choque}`, 8000);
    } catch (e) {
      aviso(e.message || 'Não consegui importar esse arquivo.', 6000);
    }
  }
  async function baixarPlanilha() {
    const res = await F.entregar(`casa-aurea-planilha-${F.hoje()}.csv`, '﻿' + R.paraCSV(registros), 'text/csv');
    if (res !== 'cancelado') aviso('Planilha pronta. Abra o arquivo no Excel.');
  }

  // ---------- instalação no iPhone ----------
  function avisoInstalacao() {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const instalado = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    $('#instalar').hidden = !(ios && !instalado);
  }

  // ---------- eventos ----------
  $('#painel').addEventListener('click', e => {
    const b = e.target.closest('[data-acao]');
    if (!b || !ACOES[b.dataset.acao]) return;
    ACOES[b.dataset.acao](b.dataset.id);
    renderTudo();
    if (b.dataset.acao === 'editar' || b.dataset.acao === 'abrir-form') $('#f-nome').focus();
  });
  $('#cal').addEventListener('click', e => { const b = e.target.closest('[data-dia]'); if (b) escolherDia(b.dataset.dia, true); });
  $('#prox').addEventListener('click', e => { const b = e.target.closest('[data-ir]'); if (b) escolherDia(b.dataset.ir, false); });
  document.querySelectorAll('[data-mes]').forEach(b => b.addEventListener('click', () => {
    const d = new Date(mes.y, mes.m + Number(b.dataset.mes), 1);
    mes = { y: d.getFullYear(), m: d.getMonth() };
    renderTudo();
  }));
  $('#irHoje').addEventListener('click', () => escolherDia(T.chave(HOJE), true));
  $('#exportar').addEventListener('click', exportar);
  $('#importar').addEventListener('click', () => $('#arquivo').click());
  $('#arquivo').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importar(f); });
  $('#baixar').addEventListener('click', baixarPlanilha);
  $('#fecharInstalar').addEventListener('click', () => { $('#instalar').hidden = true; });
  window.addEventListener('hashchange', () => { mostrarAba(); window.scrollTo(0, 0); });
  // Outra janela do app salvou: recarrega a lista para uma não apagar o que a outra fez.
  window.addEventListener('storage', e => {
    if (e.key !== A.CHAVE) return;
    const novo = A.carregar();
    if (!novo.ok) return;
    registros = R.validarBackup(R.montarBackup(novo.lista, new Date())).registros;
    editId = null; formAberto = false; excluirId = null;
    renderTudo();
  });
  // App aberto de um dia para o outro: recarrega para "hoje" ficar certo.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && new Date().toDateString() !== HOJE.toDateString()) location.reload();
  });

  let tempoAviso;
  function aviso(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(tempoAviso);
    tempoAviso = setTimeout(() => { t.hidden = true; }, ms || 2800);
  }

  // ---------- início ----------
  if (!lido.ok) aviso(lido.erro, 10000);
  else if (conferido.ignorados) aviso(`${conferido.ignorados} item(ns) guardados estavam com defeito e foram separados. Se faltar alguma festa, importe a sua última cópia.`, 10000);
  A.pedirPersistencia();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sem modo offline: o app funciona igual online */ });
  }
  avisoInstalacao();
  mostrarAba();
  renderTudo();
})();
