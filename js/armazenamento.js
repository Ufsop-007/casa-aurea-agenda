// Guarda as festas no próprio aparelho (navegador). Sem internet e sem servidor.
// Para passar para outro aparelho, use Exportar/Importar (arquivos.js).
(function (raiz) {
  const CHAVE = 'casa-aurea:registros:v1';
  const CHAVE_EXPORT = 'casa-aurea:ultimo-export';

  const ERRO_LEITURA = 'As festas guardadas neste aparelho estavam com defeito. Guardei uma cópia do que havia; importe a sua última cópia exportada.';

  // Se o conteúdo guardado estiver estragado, separa uma cópia antes de qualquer gravação nova.
  function guardarEstragado(txt) {
    try { raiz.localStorage.setItem(CHAVE + ':defeito-' + Date.now(), txt); } catch (e) { /* sem espaço: segue */ }
  }

  function carregar() {
    let txt = null;
    try {
      txt = raiz.localStorage.getItem(CHAVE);
    } catch (e) {
      return { ok: false, lista: [], erro: 'Este navegador não deixa guardar dados. Use o app instalado, fora do modo anônimo.' };
    }
    if (!txt) return { ok: true, lista: [] };
    try {
      const lista = JSON.parse(txt);
      if (Array.isArray(lista)) return { ok: true, lista };
    } catch (e) { /* tratado abaixo */ }
    guardarEstragado(txt);
    return { ok: false, lista: [], erro: ERRO_LEITURA };
  }

  function salvar(lista) {
    try {
      raiz.localStorage.setItem(CHAVE, JSON.stringify(lista));
      return true;
    } catch (e) {
      return false;
    }
  }

  function ultimoExport() {
    try { return raiz.localStorage.getItem(CHAVE_EXPORT); } catch (e) { return null; }
  }
  function marcarExport(quando) {
    try { raiz.localStorage.setItem(CHAVE_EXPORT, quando.toISOString()); } catch (e) { /* só um lembrete: segue sem ele */ }
  }

  // Pede ao navegador para não apagar os dados quando faltar espaço.
  async function pedirPersistencia() {
    try {
      if (raiz.navigator.storage && raiz.navigator.storage.persist) return await raiz.navigator.storage.persist();
    } catch (e) { /* navegador sem suporte */ }
    return false;
  }

  const guardarCopia = lista => guardarEstragado(JSON.stringify(lista));

  raiz.Armazenamento = { CHAVE, carregar, guardarCopia, salvar, ultimoExport, marcarExport, pedirPersistencia };
})(window);
