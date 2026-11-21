// Monta o contrato de locação já preenchido com os dados da festa.
// CPF e endereço do cliente são digitados na tela só para imprimir (não ficam salvos).
(function (raiz) {
  const C = raiz.CASA_CONFIG;
  const R = raiz.criarRegras(C);
  const T = raiz.Telas;

  const campo = (id, rotulo, largura) =>
    `<label class="ct-campo" style="min-width:${largura}"><span class="ct-rot">${rotulo}</span><input id="${id}" autocomplete="off"><span class="ct-imp" data-de="${id}"></span></label>`;

  function horario(r) {
    const faixa = R.faixaHorario(r);
    return `${C.PERIODOS[r.periodo].nome.toLowerCase()}${faixa ? ` (${faixa})` : ''}`;
  }

  function html(r) {
    const E = C.EMPRESA;
    const d = R.lerData(r.data);
    const hoje = new Date();
    const extras = C.EXTRAS.filter(e => r.extras.includes(e.id)).map(e => e.nome).join(', ');
    const saldo = r.total - r.sinal;
    const horaExtra = C.EXTRAS.find(e => e.id === 'hora');
    const sinalTxt = r.sinalPago ? 'já pago pelo(a) LOCATÁRIO(A)' : 'a ser pago na assinatura deste contrato';
    const saldoTxt = r.saldoPago ? 'já quitado' : `a ser pago até ${C.DIAS_COBRAR_SALDO} dias antes do evento`;
    return `
    <div class="ct-barra nao-imprimir">
      <p><b>Contrato da festa de ${T.esc(r.nome)}</b><br><span class="hint">Complete CPF e endereço do cliente e toque em Imprimir. Modelo: revise com um advogado antes de usar.</span></p>
      <div class="acoes">
        <button type="button" class="btn btn-primary" id="ct-imprimir">Imprimir / Salvar PDF</button>
        <button type="button" class="btn" id="ct-fechar">Fechar</button>
      </div>
    </div>
    <article class="ct-folha">
      <h1>Contrato de Locação de Espaço para Evento</h1>

      <p><b>LOCADORA:</b> ${T.esc(E.nome)}, ${T.esc(E.documento)}, ${T.esc(E.endereco)}.</p>
      <p><b>LOCATÁRIO(A):</b> ${T.esc(r.nome)}, ${campo('ct-cpf', 'CPF', '150px')}, ${campo('ct-end', 'Endereço', '260px')}, WhatsApp ${T.esc(r.fone || '______________')}.</p>

      <h2>1. Objeto</h2>
      <p>A LOCADORA cede ao(à) LOCATÁRIO(A) o uso do espaço <b>${T.esc(E.nome)}</b> para a realização de <b>${T.esc(r.festa)}</b>,
      no dia <b>${T.dataLonga(d).toLowerCase()} de ${d.getFullYear()}</b>, no período da <b>${T.esc(horario(r))}</b>,
      para até <b>${r.convidados} convidados</b>, com o <b>Pacote ${T.esc(C.PACOTES[r.pacote].nome)}</b>${extras ? ` e os extras: <b>${T.esc(extras)}</b>` : ''}.</p>

      <h2>2. Valor e pagamento</h2>
      <p>O valor total da locação é de <b>${T.moeda(r.total)}</b>, pago da seguinte forma:</p>
      <ul>
        <li>Sinal de <b>${T.moeda(r.sinal)}</b>, ${sinalTxt}, para garantir a reserva da data;</li>
        <li>Saldo de <b>${T.moeda(saldo)}</b>, ${saldoTxt}.</li>
      </ul>
      <p>A data só fica garantida após o pagamento do sinal.</p>

      <h2>3. Cancelamento</h2>
      <p>Em caso de desistência pelo(a) LOCATÁRIO(A), o sinal não será devolvido, por se destinar à reserva da data.
      Se a LOCADORA cancelar o evento sem motivo de força maior, devolverá integralmente os valores recebidos.</p>

      <h2>4. Horário</h2>
      <p>O evento deve respeitar o horário contratado. A permanência além dele será cobrada como hora extra${horaExtra ? `, no valor de <b>${T.moeda(horaExtra.preco)}</b> por hora` : ''}.</p>

      <h2>5. Conservação do espaço</h2>
      <p>O(A) LOCATÁRIO(A) se responsabiliza por danos causados ao imóvel, móveis e equipamentos pelos seus convidados ou contratados,
      comprometendo-se a ressarcir os prejuízos.</p>

      <h2>6. Regras de uso</h2>
      <p>O número de convidados não poderá ultrapassar o contratado. O(A) LOCATÁRIO(A) deve seguir as normas do espaço
      e a legislação vigente, inclusive quanto ao volume de som.</p>

      <h2>7. Foro</h2>
      <p>Fica eleito o foro da comarca de <b>${T.esc(E.cidade)}</b> para resolver qualquer questão deste contrato.</p>

      <p class="ct-local">${T.esc(E.cidade)}, ${hoje.getDate()} de ${T.MESES[hoje.getMonth()]} de ${hoje.getFullYear()}.</p>

      <div class="ct-assinaturas">
        <div><span></span><b>${T.esc(E.nome)}</b><small>LOCADORA</small></div>
        <div><span></span><b>${T.esc(r.nome)}</b><small>LOCATÁRIO(A)</small></div>
      </div>
    </article>`;
  }

  // Abre o contrato por cima do app. Na impressão sai só a folha.
  function abrir(r) {
    const caixa = document.querySelector('#contrato');
    caixa.innerHTML = html(r);
    caixa.hidden = false;
    document.body.classList.add('com-contrato');
    // o que é digitado nos campos aparece como texto na impressão
    caixa.querySelectorAll('.ct-campo input').forEach(inp => inp.addEventListener('input', () => {
      caixa.querySelector(`[data-de="${inp.id}"]`).textContent = inp.value;
    }));
    caixa.querySelector('#ct-fechar').addEventListener('click', fechar);
    caixa.querySelector('#ct-imprimir').addEventListener('click', () => window.print());
    caixa.scrollTop = 0;
    caixa.querySelector('#ct-cpf').focus();
  }
  function fechar() {
    const caixa = document.querySelector('#contrato');
    caixa.hidden = true;
    caixa.innerHTML = '';
    document.body.classList.remove('com-contrato');
  }

  raiz.Contrato = { abrir, fechar };
})(window);
