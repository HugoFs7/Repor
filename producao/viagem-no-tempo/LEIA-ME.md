# Curiozando: viagem no tempo do Caio (parte 1)

Vídeo vertical 720x1280 com o personagem desenhado em 2D (SVG) por cima de cenários em 3D (three.js) e moldura de HQ.
A prévia pronta é `Curiozando-Viagem-no-Tempo-Previa.mp4`, na raiz do repositório. Ela ainda está **sem vozes**.

## História
1. O Caio acha um aparelho estranho na rua e aperta o botão. Na tela aparece 1985, mas ele não percebe.
2. A rua fica antiga (anos 80) e o celular fica sem sinal.
3. Ele pergunta a um moço de patins onde tem Wi-Fi ("Wi-quê?"). O moço se distrai, bate no orelhão e cai.
4. A carteira mostra "José Carlos, nascido em 1962". É o avô do Caio (foto de casa: "Vô Zé e Vó Lúcia").
5. A avó Lúcia, jovem, chega e ajuda o avô. Foi assim que eles se conheceram.
6. O Caio percebe que estava tudo escrito: o passado não muda (autoconsistência, na física).
7. Ele aperta o botão e volta pra casa, em 2026.
8. O aparelho apita e mostra 2085. Gancho: "Na parte 2: o Caio vai pro futuro? Comenta TEMPO".

## Roteiro por voz
O narrador nunca fala junto com os personagens.

| Quem | Fala |
|---|---|
| Narrador | O Caio achou um aparelho estranho no meio da rua. |
| Caio | Ué… o que é isso? |
| Narrador | Ele aperta o botão… e nada parece mudar. |
| Caio | Sem sinal? Que estranho… |
| Narrador | E a rua parece meio antiga. |
| Caio | Moço, onde tem Wi-Fi? |
| Zé | Wi-quê? |
| Narrador | Ele se distrai… e cai feio. No documento: nascido em 1962. |
| Caio | É o meu avô?! |
| Narrador | Aí chega uma moça pra ajudar. |
| Lúcia | Tá tudo bem aí, moço? |
| Caio | É a Vó Lúcia?! |
| Narrador | Foi assim que eles se conheceram. O passado não podia ser mudado. |
| Caio | Foi por minha causa que eles se conheceram! |
| Narrador | O Caio aperta o botão e volta pra casa. |
| Caio | Ufa! |
| Narrador | Mas o aparelho começa a apitar… 2085. Comenta TEMPO que eu te mando a parte 2. |

Vozes previstas:
- **Narrador:** grave, de suspense.
- **Caio:** jovem.
- **Zé:** adulto, animado, anos 80.
- **Lúcia:** jovem, simpática.

## Próximo passo: vídeo final com vozes
1. Gerar uma voz por fala no ElevenLabs (modelo `eleven_multilingual_v2`), uma voz diferente por personagem.
2. Medir a duração de cada áudio.
3. Ajustar a tabela `SCENES` em `app.js` para que cada cena dure o tempo das falas dela.
4. Sincronizar os balões de fala com o áudio do personagem.
5. Mostrar a legenda com a cor de quem fala.
6. Tirar o selo "ENSAIO VISUAL · SEM NARRAÇÃO".
7. Mixar os áudios em sequência, sem sobreposição, e juntar ao vídeo com ffmpeg.

## Como rodar
Precisa de Node 18+, Python 3 e ffmpeg.

```
npm install
npx playwright install chromium
npm run quadros   # alguns quadros de teste em ./quadros
npm run video     # todos os quadros + previa.mp4
```

- `render.mjs` sobe um servidor local na porta 8768, abre `index.html` no Chromium e chama `window.renderAt(t)` para cada quadro.
- Em `app.js`:
  - `character()` desenha o personagem 2D;
  - `buildQuarto`, `buildRua('sun' | '80s')` e as outras funções `build*` montam os cenários 3D;
  - `SCENES` e `renderAt` controlam a linha do tempo.
