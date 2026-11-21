// Junta o app inteiro num arquivo só: pacote/Agenda Casa Áurea.html
// (estilo, scripts e ícone ficam dentro do HTML). Serve para usar no PC com dois cliques.
// Uso: node ferramentas/gerar-arquivo-unico.js
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const ler = rel => fs.readFileSync(path.join(raiz, rel), 'utf8');
const SAIDA = path.join(raiz, 'pacote', 'Agenda Casa Áurea.html');

let html = ler('index.html');
const icone = 'data:image/png;base64,' + fs.readFileSync(path.join(raiz, 'icones', 'icone-192.png')).toString('base64');

function trocar(de, para) {
  if (!html.includes(de)) throw new Error(`Não achei no index.html: ${de}`);
  html = html.split(de).join(para);
}

// Scripts embutidos precisam de 'unsafe-inline' (no arquivo único não há outra origem para "self").
html = html.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/,
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; object-src 'none'; base-uri 'none'; form-action 'none'">`);

trocar('<link rel="manifest" href="manifest.webmanifest">\n', '');
trocar('<link rel="apple-touch-icon" href="icones/apple-touch-icon.png">\n', '');
trocar('href="icones/icone-192.png"', `href="${icone}"`);
trocar('src="icones/icone-192.png"', `src="${icone}"`);
trocar('<link rel="stylesheet" href="styles.css?v=1.1.4">', `<style>\n${ler('styles.css')}</style>`);

const scripts = [...html.matchAll(/<script src="(js\/[a-z]+\.js)\?v=[\d.]+"><\/script>/g)];
if (scripts.length !== 7) throw new Error(`Esperava 7 scripts, achei ${scripts.length}`);
scripts.forEach(([tag, arquivo]) => {
  const codigo = ler(arquivo);
  if (/<\/script/i.test(codigo)) throw new Error(`${arquivo} contém "</script" e quebraria o HTML`);
  html = html.replace(tag, () => `<script>\n${codigo}</script>`); // função: evita que "$" do código vire padrão de troca
});

fs.mkdirSync(path.dirname(SAIDA), { recursive: true });
fs.writeFileSync(SAIDA, html, 'utf8');
console.log(`Gerado: ${SAIDA} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
