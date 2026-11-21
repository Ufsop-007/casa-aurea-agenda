// Entrega e leitura de arquivos: backup (.json) e planilha (.csv).
// No celular abre o menu de compartilhar (WhatsApp, AirDrop, Salvar em Arquivos);
// no computador baixa o arquivo direto.
(function (raiz) {
  const MAX_BYTES = 5 * 1024 * 1024;
  const pad = n => String(n).padStart(2, '0');

  function hoje() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  const ehCelular = () => raiz.matchMedia('(pointer: coarse)').matches;
  const ehIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function baixar(blob, nome) {
    const url = URL.createObjectURL(blob);
    if (ehIOS()) {
      // No app instalado do iPhone o download direto pode prender a tela: abre numa aba à parte.
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // Devolve 'compartilhado', 'cancelado' ou 'baixado'.
  async function entregar(nome, conteudo, tipo) {
    const blob = new Blob([conteudo], { type: tipo });
    if (ehCelular() && typeof File === 'function' && navigator.canShare) {
      const arquivo = new File([blob], nome, { type: tipo });
      if (navigator.canShare({ files: [arquivo] })) {
        try {
          await navigator.share({ files: [arquivo], title: nome });
          return 'compartilhado';
        } catch (e) {
          if (e && e.name === 'AbortError') return 'cancelado';
          // outro erro: cai para o download abaixo
        }
      }
    }
    baixar(blob, nome);
    return 'baixado';
  }

  function ler(arquivo) {
    return new Promise((ok, falha) => {
      if (!arquivo) return falha(new Error('Nenhum arquivo escolhido.'));
      if (arquivo.size > MAX_BYTES) return falha(new Error('Esse arquivo é grande demais para ser um backup da agenda.'));
      const leitor = new FileReader();
      leitor.onload = () => ok(String(leitor.result));
      leitor.onerror = () => falha(new Error('Não consegui abrir o arquivo.'));
      leitor.readAsText(arquivo);
    });
  }

  raiz.Arquivos = { entregar, ler, hoje };
})(window);
