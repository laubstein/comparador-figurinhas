<p align="center">
  <img src="assets/og-image.png" alt="Comparador de trocas de figurinhas da Copa 2026" width="720">
</p>

# Comparador de figurinhas da Copa 2026

> **Use o site aqui: [laubstein.github.io/comparador-figurinhas](https://laubstein.github.io/comparador-figurinhas/)**

Sabe aquele momento em que duas pessoas abrem listas enormes de faltantes e repetidas, alguém fala "acho que dá jogo", e cinco minutos depois ninguém sabe mais quem entrega o quê? Este projeto existe para cortar essa parte chata.

Cole as figurinhas faltando e repetidas de cada pessoa, escolha uma estratégia e o comparador monta uma proposta de troca ou uma lista de possibilidades. Tudo roda no navegador, sem login, sem backend e sem coletar dados.

## O que dá para fazer

- Comparar faltantes e repetidas entre duas pessoas.
- Montar propostas com estratégias diferentes: direta, brilhantes, mesmo número, repetidas e outras.
- Ver possibilidades sem exigir uma troca fechada.
- Ignorar figurinhas específicas com `x` e recalcular.
- Copiar texto formatado para mandar no WhatsApp.
- Compartilhar a comparação por link.
- Gerar uma tabela imprimível da coleção.

## Como funciona

O app é estático: HTML, CSS e JavaScript puro. As listas ficam no seu navegador e o link compartilhado carrega os dados codificados na própria URL.

Para publicar, o GitHub Pages usa o workflow em `.github/workflows/pages.yml`, que roda `node build.js` e envia a pasta `dist/`.

## Desenvolvimento

Não há dependências externas. Para validar:

```sh
node --check app.js
node --check table.js
node --check sticker-data.js
node --check build.js
node build.js
git diff --check
```

## Privacidade

O projeto não tem servidor próprio e não coleta dados. O que você cola no app fica no navegador; ao compartilhar, os dados necessários vão codificados no link.
