// ===================== CONFIGURAÇÃO DA CASA ÁUREA =====================
// Aqui ficam o nome, os horários, os pacotes e os preços.
// Para mudar algo, troque só os valores entre aspas ou os números e salve.
(function (raiz) {
  const CONFIG = {
    NOME: 'Casa Áurea',

    // Porcentagem do sinal (0.3 = 30%)
    PCT_SINAL: 0.3,

    // Quantos dias antes da festa aparece o lembrete de cobrar o saldo
    DIAS_COBRAR_SALDO: 7,

    // Turnos que ela aluga. "fator" multiplica o preço do pacote (dia todo = 1.6x).
    // "ini" e "fim" são as horas usadas no Google Agenda quando ela não anota um horário.
    // O turno "dia" ocupa todos os outros; deixe-o sempre por último.
    PERIODOS: {
      manha: { nome: 'Manhã', ini: 8, fim: 12, fator: 1 },
      tarde: { nome: 'Tarde', ini: 13, fim: 18, fator: 1 },
      noite: { nome: 'Noite', ini: 19, fim: 23, fator: 1 },
      dia:   { nome: 'Dia todo', ini: 8, fim: 23, fator: 1.6 }
    },

    PACOTES: {
      basico:   { nome: 'Básico', preco: 1200 },
      completo: { nome: 'Completo', preco: 2200 },
      premium:  { nome: 'Premium', preco: 3400 }
    },

    EXTRAS: [
      { id: 'pula', nome: 'Pula-pula', preco: 150 },
      { id: 'doces', nome: 'Mesa de doces', preco: 280 },
      { id: 'garcom', nome: 'Garçom extra', preco: 180 },
      { id: 'hora', nome: 'Hora extra', preco: 250 }
    ],

    TIPOS: ['Aniversário infantil', '15 anos', 'Casamento', 'Batizado', 'Chá de bebê', 'Empresa', 'Outro'],

    CONVIDADOS_PADRAO: 50,

    // Dados da Casa Áurea que aparecem no contrato. Preencha com os dados reais.
    EMPRESA: {
      nome: 'Casa Áurea',
      documento: 'CNPJ/CPF: ____________________',
      endereco: 'Endereço: ____________________________________',
      cidade: '______________'   // cidade do foro e da assinatura
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
  else raiz.CASA_CONFIG = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
