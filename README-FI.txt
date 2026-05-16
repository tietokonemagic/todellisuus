online-magic v2026.05.12-017

Korjattu: nickname/chat-lisäyksen aiheuttama start screen -kaatuminen lokaalisti ja netissä.
Offline-sync ladataan ennen app-koodia.


v2026.05.12-019:
- Chat player name colors: P1 yellow, P2 turquoise.
- Chat is cleared when the room becomes empty via normal leave/join cleanup.
- Added THROW DICE with 1/2 dice animated throw; dice land as normal table dice.


v2026.05.12-021
- Korjattu maalausvalinta: selectBox luodaan varmasti DOMiin ja näkyy katkoviivana.
- Maalausvalinta valitsee nyt myös pöytänopat.
- Nopille lisätty ohut haalea valintakehys.


v2026.05.15-clean-d6:
- Siivottu päällekkäiset THROW D6 -sidonnat ja vanha DOM/CSS-noppa-animaattori app.js:stä.
- THROW D6 käyttää nyt yhtä kevyttä canvas-pohjaista fake-3D-animaatiota.
- Firebaseen/verkkotilaan tallennetaan vain lopullinen nopan tulos, ei animaatioframeja.
- Säilytetty yhteensopivuus window.throwDiceAnimated()-kutsulle.
