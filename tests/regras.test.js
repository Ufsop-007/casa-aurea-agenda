// Testes das regras da agenda. Rodar com: node --test tests/
const { test } = require('node:test');
const assert = require('node:assert/strict');
const CONFIG = require('../js/config.js');
const criarRegras = require('../js/regras.js');

const R = criarRegras(CONFIG);

const festa = (extra) => ({
  id: 'a1', kind: 'festa', data: '2026-12-05', periodo: 'tarde', nome: 'Maria', fone: '(11) 98888-7777',
  festa: 'Aniversário infantil', pacote: 'completo', convidados: 60, extras: [], total: 2200, sinal: 660,
  sinalPago: false, saldoPago: false, obs: '', motivo: '', atualizadoEm: '2026-11-20T10:00:00.000Z', excluido: false,
  ...extra
});

test('calcular soma pacote, fator do horário e extras', () => {
  assert.equal(R.calcular('tarde', 'completo', []), 2200);
  assert.equal(R.calcular('dia', 'basico', []), Math.round(1200 * 1.6));
  assert.equal(R.calcular('noite', 'basico', ['pula', 'doces']), 1200 + 150 + 280);
});

test('calcular ignora extra ou pacote desconhecido sem quebrar', () => {
  assert.equal(R.calcular('tarde', 'basico', ['nao-existe']), 1200);
  assert.equal(R.calcular('tarde', 'inexistente', []), 0);
});

test('sinalPadrao é 30% arredondado nos centavos', () => {
  assert.equal(R.sinalPadrao(2200), 660);
  assert.equal(R.sinalPadrao(1001), 300.3);
  assert.equal(R.sinalPadrao(1000.05), 300.02);
});

test('paraCSV escreve centavos com vírgula', () => {
  const csv = R.paraCSV([festa({ total: 2200.5, sinal: 660.15 })]);
  assert.match(csv.split('\r\n')[1], /2200,5;660,15;1540,35;/);
});

test('dia inteiro ocupa tarde e noite', () => {
  const regs = [festa({ periodo: 'dia' })];
  assert.equal(R.periodoLivre(regs, '2026-12-05', 'tarde'), false);
  assert.equal(R.periodoLivre(regs, '2026-12-05', 'noite'), false);
  assert.deepEqual(R.periodosLivres(regs, '2026-12-05'), []);
});

test('tarde ocupada deixa manhã e noite livres e bloqueia o dia todo', () => {
  const regs = [festa()];
  assert.deepEqual(R.periodosLivres(regs, '2026-12-05'), ['manha', 'noite']);
});

test('horários do dia em ordem: manhã, tarde, noite', () => {
  assert.deepEqual(R.SLOTS, ['manha', 'tarde', 'noite']);
  const regs = [festa({ id: 'n', periodo: 'noite' }), festa({ id: 'm', periodo: 'manha' }), festa({ id: 't' })];
  assert.deepEqual(R.ordenar(regs).map(r => r.id), ['m', 't', 'n']);
});

test('faixaHorario mostra o horário combinado quando existe', () => {
  assert.equal(R.faixaHorario(festa()), '');
  assert.equal(R.faixaHorario(festa({ inicio: '14:00', fim: '18:30' })), '14h às 18h30');
  assert.equal(R.faixaHorario(festa({ fim: '18:00' })), 'até 18h');
  assert.equal(R.faixaHorario(festa({ inicio: '09:15' })), 'a partir das 9h15');
});

test('pagamento devolve o estado de sinal e saldo', () => {
  assert.deepEqual(R.pagamento('nada'), { sinalPago: false, saldoPago: false });
  assert.deepEqual(R.pagamento('sinal'), { sinalPago: true, saldoPago: false });
  assert.deepEqual(R.pagamento('tudo'), { sinalPago: true, saldoPago: true });
  assert.equal(R.estadoPagamento(festa({ sinalPago: true, saldoPago: true })), 'tudo');
  assert.equal(R.estadoPagamento(festa()), 'nada');
});

test('situacao de festa paga usa a cor de pago', () => {
  assert.equal(R.situacao(festa({ sinalPago: true, saldoPago: true })).barra, 's-pago');
});

test('periodoLivre ignora a própria festa ao editar', () => {
  const regs = [festa()];
  assert.equal(R.periodoLivre(regs, '2026-12-05', 'tarde', 'a1'), true);
});

test('registros excluídos não ocupam horário', () => {
  const regs = [festa({ excluido: true })];
  assert.deepEqual(R.periodosLivres(regs, '2026-12-05'), ['manha', 'tarde', 'noite', 'dia']);
});

test('situacao reflete os pagamentos', () => {
  assert.equal(R.situacao(festa()).txt, 'Esperando sinal');
  assert.equal(R.situacao(festa({ sinalPago: true })).txt, 'Confirmada · falta o saldo');
  assert.equal(R.situacao(festa({ sinalPago: true, saldoPago: true })).txt, 'Tudo pago');
  assert.equal(R.situacao({ kind: 'fechado' }).txt, 'Fechado');
});

test('recebido conta sinal e saldo', () => {
  assert.equal(R.recebido(festa()), 0);
  assert.equal(R.recebido(festa({ sinalPago: true })), 660);
  assert.equal(R.recebido(festa({ sinalPago: true, saldoPago: true })), 2200);
});

test('resumoDoMes conta só as festas do mês pedido', () => {
  const regs = [
    festa({ id: 'a', data: '2026-12-04', periodo: 'noite', sinalPago: true }),       // sexta
    festa({ id: 'b', data: '2026-12-05', sinalPago: true, saldoPago: true }),         // sábado
    festa({ id: 'c', data: '2026-12-10' }),                                           // quinta
    festa({ id: 'd', data: '2027-01-02' }),                                           // outro mês
    festa({ id: 'e', data: '2026-12-12', excluido: true }),
    { id: 'f', kind: 'fechado', data: '2026-12-06', periodo: 'dia', atualizadoEm: '2026-11-20T10:00:00.000Z' }
  ];
  const r = R.resumoDoMes(regs, 2026, 11);
  assert.equal(r.festas, 3);
  assert.equal(r.confirmadas, 2);
  assert.equal(r.esperando, 1);
  assert.equal(r.combinado, 2200 * 3);
  assert.equal(r.recebido, 660 + 2200);
  assert.equal(r.ocupadosFds, 2);
  assert.equal(r.horariosFds, 12 * 3); // dez/2026 começa numa terça: 12 dias de sexta a domingo × manhã, tarde, noite
});

test('mesclar junta novos, troca pelos mais recentes e mantém os locais mais novos', () => {
  const locais = [
    festa({ id: 'x', nome: 'Antigo', atualizadoEm: '2026-11-20T10:00:00.000Z' }),
    festa({ id: 'y', nome: 'Local novo', atualizadoEm: '2026-11-22T10:00:00.000Z' })
  ];
  const vindos = [
    festa({ id: 'x', nome: 'Editado no iPhone', atualizadoEm: '2026-11-21T10:00:00.000Z' }),
    festa({ id: 'y', nome: 'Velho do iPhone', atualizadoEm: '2026-11-19T10:00:00.000Z' }),
    festa({ id: 'z', nome: 'Novo', atualizadoEm: '2026-11-21T10:00:00.000Z' })
  ];
  const r = R.mesclar(locais, vindos);
  const porId = Object.fromEntries(r.registros.map(x => [x.id, x.nome]));
  assert.deepEqual(porId, { x: 'Editado no iPhone', y: 'Local novo', z: 'Novo' });
  assert.equal(r.novos, 1);
  assert.equal(r.atualizados, 1);
  assert.equal(locais[0].nome, 'Antigo', 'não altera a lista original');
});

test('mesclar leva exclusões feitas no outro aparelho', () => {
  const locais = [festa({ id: 'x', atualizadoEm: '2026-11-20T10:00:00.000Z' })];
  const vindos = [festa({ id: 'x', excluido: true, atualizadoEm: '2026-11-21T10:00:00.000Z' })];
  const r = R.mesclar(locais, vindos);
  assert.equal(r.registros[0].excluido, true);
  assert.equal(r.excluidos, 1);
});

test('validarBackup aceita arquivo do app e recusa outros', () => {
  const ok = R.validarBackup({ app: 'casa-aurea-agenda', versao: 1, registros: [festa()] });
  assert.equal(ok.ok, true);
  assert.equal(ok.registros.length, 1);

  assert.equal(R.validarBackup(null).ok, false);
  assert.equal(R.validarBackup({ app: 'outro', registros: [] }).ok, false);
  assert.equal(R.validarBackup({ app: 'casa-aurea-agenda', versao: 1, registros: 'x' }).ok, false);
});

test('validarBackup descarta registros com formato errado', () => {
  const r = R.validarBackup({ app: 'casa-aurea-agenda', versao: 1, registros: [
    festa(),
    festa({ id: 'b', data: '05/12/2026' }),
    festa({ id: 'c', periodo: 'madrugada' }),
    festa({ id: 'd', total: 'muito' }),
    { id: 'e', kind: 'hacker' }
  ] });
  assert.equal(r.ok, true);
  assert.equal(r.registros.length, 1);
  assert.equal(r.ignorados, 4);
});

test('validarBackup mantém exclusões mesmo sem os dados da festa', () => {
  const marca = { id: 'x', kind: 'festa', data: '2026-12-05', periodo: 'tarde', excluido: true, atualizadoEm: '2026-11-21T10:00:00.000Z' };
  const r = R.validarBackup({ app: 'casa-aurea-agenda', versao: 1, registros: [marca] });
  assert.equal(r.registros.length, 1);
  assert.equal(r.registros[0].excluido, true);
  assert.equal(r.registros[0].nome, undefined, 'não guarda dados pessoais de festa excluída');
});

test('validarBackup recusa chaves do protótipo e datas impossíveis', () => {
  const r = R.validarBackup({ app: 'casa-aurea-agenda', versao: 1, registros: [
    festa({ id: 'p1', periodo: 'constructor' }),
    festa({ id: 'p2', pacote: '__proto__' }),
    festa({ id: 'p3', pacote: 'toString' }),
    festa({ id: 'd1', data: '2026-02-31' }),
    festa({ id: 'd2', data: '0099-01-01' }),
    festa({ id: 'ok' })
  ] });
  assert.deepEqual(r.registros.map(x => x.id), ['ok']);
  assert.equal(R.calcular('constructor', 'basico', []), 0);
});

test('conflitos aponta dois registros no mesmo horário', () => {
  const regs = [
    festa({ id: 'a', periodo: 'tarde' }),
    festa({ id: 'b', periodo: 'dia' }),
    festa({ id: 'c', data: '2026-12-06', periodo: 'tarde' }),
    festa({ id: 'd', data: '2026-12-06', periodo: 'noite' }),
    festa({ id: 'e', data: '2026-12-07', periodo: 'tarde' }),
    festa({ id: 'f', data: '2026-12-07', periodo: 'tarde', excluido: true })
  ];
  assert.deepEqual(R.conflitos(regs), ['2026-12-05']);
});

test('validarBackup guarda horário válido e descarta horário inválido', () => {
  const r = R.validarBackup({ app: 'casa-aurea-agenda', versao: 1, registros: [
    festa({ id: 'h1', inicio: '14:00', fim: '18:00' }),
    festa({ id: 'h2', inicio: '25:00', fim: '<b>' })
  ] });
  assert.equal(r.registros[0].inicio, '14:00');
  assert.equal(r.registros[0].fim, '18:00');
  assert.equal(r.registros[1].inicio, '');
  assert.equal(r.registros[1].fim, '');
});

test('paraCSV coloca o horário combinado junto do turno', () => {
  const csv = R.paraCSV([festa({ inicio: '14:00', fim: '18:00' })]);
  assert.match(csv.split('\r\n')[1], /^05\/12\/2026;Tarde \(14h às 18h\);/);
});

test('validarBackup limita o tamanho dos textos', () => {
  const r = R.validarBackup({ app: 'casa-aurea-agenda', versao: 1, registros: [festa({ nome: 'a'.repeat(5000) })] });
  assert.ok(r.registros[0].nome.length <= 120);
});

test('paraCSV gera planilha com ponto e vírgula e valores em reais', () => {
  const csv = R.paraCSV([festa({ nome: 'Ana; "Bia"' }), festa({ id: 'z', excluido: true })]);
  const linhas = csv.trim().split('\r\n');
  assert.equal(linhas.length, 2, 'cabeçalho + 1 festa (excluída fica de fora)');
  assert.match(linhas[0], /^Data;Horário;Cliente/);
  assert.match(linhas[1], /^05\/12\/2026;Tarde;"Ana; ""Bia""";/);
  assert.match(linhas[1], /2200;660;1540;Esperando sinal$/);
});

test('paraCSV neutraliza fórmulas no início do texto', () => {
  const csv = R.paraCSV([festa({ nome: '=HYPERLINK("x")' })]);
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
});
