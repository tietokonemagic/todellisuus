Online Magic v2026.05.12-009

Korjaukset:
- HELP poistettu kokonaan käytöstä ja käyttöliittymästä.
- Menu-asetukset:
  menuFontSize: 12
  menuButtonPaddingY: 2
  menuButtonPaddingX: 15
  menuGap: 5
  menuWidth: 160
- Kaikki corner radiukset pakotettu nollaan.
- Versionumero näkyy huoneen/pelaajan valinnassa.

Deploy:
Lataa tämän kansion sisältö nettiin. Älä lataa _original_reference/docs kansioita.


v2026.05.12-009
- Korttien border-radius palautettu 7px, UI pysyy teräväkulmaisena.
- Yksivärisiin sleeveihin lisätty karhea/texturoitu pinta.


v2026.05.12-010
- Sleeve noise voimakkuus lisätty dev paneeliin (dev.sleeveNoiseStrength, 0-40).
- Noise overlay käyttää CSS-muuttujaa --sleeve-noise-strength.
- Tarkistettu että zip sisältää koko deploy-rakenteen.


v2026.05.12-011:
- Offline-testauksen tuki säilytetty.
- Thumb.png kääntyy nyt viuhkan scrollauksen mukana; min/max rotation säädöt dev-paneelissa.
- Help- ja inspector-ruutujen oletuspaikoille lisätty dev-paneelin X/Y-säädöt.
- Sleeve noise käyttää nyt tiedostoa sleevenoise.png projektin juuressa. Lisää tämä kuva samaan kansioon index.html:n kanssa.
- Alpha-korteille oma isompi corner radius; normaaleille korteille oma radius. Molemmille säädöt dev-paneelissa.
