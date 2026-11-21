# Agenda Casa Áurea

Agenda de festas só da dona. Três telas:

- **Agenda:** toca no dia, preenche os campos e salva.
- **Resumo:** números do mês, próximas festas e lembretes.
- **Planilha:** todas as festas numa tabela, com botão para baixar e abrir no Excel.

As festas ficam guardadas **no próprio aparelho**. Não tem servidor, login nem mensalidade. Para levar as festas de um aparelho para o outro, use **Exportar cópia** e **Importar cópia**, que ficam no rodapé de todas as telas.

---

## 1. Usar no PC

**Instalar no PC dela (mais simples):** mande o `pacote/Casa Aurea - PC.zip`. Ela descompacta e dá dois cliques em **Instalar no PC.cmd**: o app vai para `AppData\Local\CasaAurea` e o atalho dourado **Agenda Casa Áurea** aparece na Área de Trabalho (abre numa janela própria do Edge). Se o Windows mostrar "O Windows protegeu o computador", clique em **Mais informações → Executar assim mesmo** (o aviso aparece para qualquer arquivo baixado sem assinatura digital).

O zip tem o app inteiro num arquivo só (`Agenda Casa Áurea.html`), o ícone e o instalador. Depois de mudar o `js/config.js`, gere de novo com `node ferramentas/gerar-arquivo-unico.js`.

**Neste PC:** já existe o atalho **Agenda Casa Áurea** na área de trabalho. Ele abre o app numa janela própria do Edge, direto desta pasta.

**No PC dela, depois de publicado (passo 3):**

1. Abra o endereço do app no Chrome ou no Edge.
2. Clique no ícone **Instalar** na barra de endereço.
3. O atalho aparece na área de trabalho e no menu Iniciar.

---

## 2. Passar as festas entre o iPhone e o PC

1. **No aparelho onde ela marcou as festas**, toque em **Exportar cópia**.
   - **No iPhone**, abre o menu de compartilhar. Ela manda o arquivo para o PC pelo WhatsApp, por e-mail, por AirDrop ou salvando em Arquivos.
   - **No PC**, o arquivo `casa-aurea-backup-AAAA-MM-DD.json` vai para a pasta Downloads.
2. **No outro aparelho**, toque em **Importar cópia** e escolha esse arquivo.
3. A agenda é **atualizada** sem apagar nada:
   - o que é novo entra;
   - quando a mesma festa foi editada nos dois aparelhos, vale a edição mais recente;
   - o que foi excluído num aparelho sai também do outro.

Esse arquivo também é a **cópia de segurança**. O Resumo avisa quando faz mais de 7 dias sem exportar.

> Os relógios dos dois aparelhos precisam estar na hora certa (data e hora automáticas). É o horário de cada edição que decide qual versão vale.

---

## 3. Colocar online, para instalar no iPhone

O iPhone só instala o app a partir de um endereço da internet. A hospedagem é o **GitHub Pages**, que é grátis. Faça tudo **na conta dela**, para não ficar nada no seu nome.

1. **Ela cria uma conta** em https://github.com/signup com o e-mail da Casa Áurea. O nome de usuário vira o endereço, por exemplo `casaaurea`. A senha fica com ela.
2. **Repositório:** **+ → New repository**, nome `agenda`, marcado como **Public**, e depois **Create repository**.
   - O código fica visível, mas as festas não, porque elas nunca saem do aparelho.
3. **Ajudante (opcional):** em **Settings → Collaborators → Add people**, ela adiciona o seu usuário para você poder atualizar o app.
4. **Enviar os arquivos:** clique em **uploading an existing file** e arraste estes arquivos e pastas:
   - `index.html`, `styles.css`, `manifest.webmanifest` e `sw.js`;
   - as pastas `js` e `icones`.

   Não precisa enviar `tests`, `ferramentas` nem `.claude`. Depois clique em **Commit changes**.
5. **Publicar:** em **Settings → Pages → Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e clique em **Save**.
6. Depois de 1 a 2 minutos, o endereço fica `https://casaaurea.github.io/agenda/`.

**Limites do plano grátis do GitHub Pages:** 1 GB de site e 100 GB de transferência por mês. O app tem menos de 100 KB.

---

## 4. Instalar no iPhone

1. Abra o endereço no **Safari**.
2. Toque em **Compartilhar** (o quadrado com a seta para cima).
3. Toque em **Adicionar à Tela de Início** e depois em **Adicionar**.

O ícone dourado aparece na tela, e o app abre em tela cheia e funciona sem internet.

> **Importante:** use sempre pelo ícone da Tela de Início. Aberto direto no Safari, o iPhone pode apagar os dados de sites que ficam muitos dias sem uso. Instalado na Tela de Início, isso não acontece. Mesmo assim, exporte uma cópia de vez em quando.

---

## 5. Mudar preços, pacotes e horários

Tudo fica no arquivo `js/config.js`: nome, horários, pacotes, extras, tipos de festa e a porcentagem do sinal. Troque os valores, salve e envie o arquivo de novo ao GitHub.

**Quando publicar uma versão nova**, faça duas mudanças para o iPhone baixar os arquivos novos:

1. No `sw.js`, aumente a `VERSAO`, por exemplo de `casa-aurea-v1.0.0` para `casa-aurea-v1.0.1`.
2. No `index.html` e no `sw.js`, troque o `?v=1.0.0` pelo número novo.

---

## 6. Quando ela quiser seguir sozinha

No GitHub dela, em **Settings → Collaborators**, ela remove você. O app e as festas continuam funcionando, porque as festas estão nos aparelhos dela, e não fica nenhum vínculo com você.

---

## Para quem for mexer no código

- **Testes:** rode `node --test tests/`. Eles cobrem as regras de preço, os horários livres, o resumo, a junção de cópias, a validação do arquivo importado e a planilha.
- **Ícones:** para gerar de novo, rode `powershell -ExecutionPolicy Bypass -File ferramentas\gerar-icones.ps1`.
- **Onde ficam os dados:** no `localStorage`, na chave `casa-aurea:registros:v1`.
- **Exclusões:** uma festa excluída vira uma marca sem dados pessoais (`excluido: true`), para a exclusão chegar ao outro aparelho.
- **Arquivo importado:** é sempre validado. Formato, tamanho dos textos, valores e datas são conferidos, e itens com defeito são descartados.
- **Planilha:** o CSV usa ponto e vírgula, que é o padrão do Excel em português, e neutraliza fórmulas vindas dos dados.
