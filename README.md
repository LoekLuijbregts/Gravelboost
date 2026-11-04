# GravelBoost

Accessible adventures across Europe. Statische site met Astro, gehost op Netlify.

Dit is versie 1. Er is niets live gezet en er is geen DNS aangepast. Op de preview staat alles op `noindex`.

## Lokaal draaien

```bash
npm install
npm run dev
```

Bouwen: `npm run build`. Het resultaat staat in `dist/`.

## Een nieuwe reis toevoegen

Je hebt drie dingen nodig: een contentbestand, een map met foto's en een GPX.

1. **GPX.** Zet het bestand in `gpx-source/<naam>.gpx`. Die map staat niet in git, dus betaalde GPX-bestanden komen nooit in de repo. Draai daarna `npm run gpx`. Dat rekent afstand en hoogtemeters uit en maakt een klein bestand in `src/data/gpx/`. Alleen dat bestand gaat mee in git.
2. **Foto's.** Maak een map `public/photos/<naam>/`. Zet er WebP-bestanden in, maximaal 2400 px breed, met de naam `plek-onderwerp-by-maker.webp`. Gebruik kopieen, nooit originelen.
3. **Contentbestand.** Kopieer `src/content/journeys/tilburg.md` naar `src/content/journeys/<naam>.md` en pas het aan. Bovenin staan de velden (titel, bestemming, dagen, niveau, beste maanden, start en eind, routes, foto's, eerlijke antwoorden, provenance). Onder de streepjes schrijf je het verhaal.
   - Bij `loops` zet je per route de naam van de GPX (`gpx: <naam>`). Afstand en hoogtemeters komen daaruit.
   - Bij `photos` zet je per foto de bestandsnaam, de alt-tekst (wat je ziet en waar), de credit en het focuspunt (`center`, `top`, `bottom`, `left` of `right`).
4. Bouw en kijk: `npm run dev`. De pagina komt op `/journeys/<naam>/`.

Een nieuwe bestemming werkt hetzelfde in `src/content/destinations/`. Een plek staat in `src/content/places/`, een pakket of bundel in `src/content/products/`, een evenement in `src/content/events/`.

## Een prijs aanpassen

Open `src/content/products/<pakket>.yaml` en wijzig `price`. Zolang de prijs fictief is staat `examplePrice: true`. Zet die op `false` als de prijs echt is. Het label "Example price" verdwijnt dan vanzelf. Zet bij `shopifyUrl` de link naar het Shopify-product, dan wordt de koopknop actief.

## Een eerlijk antwoord aanpassen

Open het contentbestand van de reis. Onder `honestAnswers` staan acht antwoorden: `surface`, `trafficFree`, `access`, `foodWater`, `gettingThere`, `sleeping`, `ebike`, `kids`. Pas de tekst bij `answer` aan en zet de datum bij `checked` (bijvoorbeeld `2026-11-04`). Zonder datum toont de pagina "not checked yet".

De Tilburg-pagina staat op `noindex: true` tot de antwoorden echt zijn ingevuld. Zet die regel op `false` als ze klaar zijn.

## Open plekken vinden

Alle `[PLACEHOLDER]`, `[CHECK]` en `[LINK]` zijn op de site geel gemarkeerd. Een lijst per pagina maak je met:

```bash
npm run build && npm run todo
```

Het resultaat staat in `OPEN-ITEMS.md`.

## Omgevingsvariabelen

Zet deze in Netlify onder Site configuration, Environment variables. Zet nooit echte waarden in de repo. `.env.example` laat de namen zien.

| Naam | Waarvoor |
| --- | --- |
| `PUBLIC_GA4_ID` | Google Analytics 4 meet-ID. Zonder ID wordt er niets gemeten. |
| `PUBLIC_HUBSPOT_PORTAL_ID` | HubSpot portal (143902881). |
| `PUBLIC_HUBSPOT_NEWSLETTER_FORM_ID` | HubSpot formulier-ID voor de nieuwsbrief. |
| `PUBLIC_HUBSPOT_REQUEST_FORM_ID` | HubSpot formulier-ID voor "Request a route". |
| `DEEPL_API_KEY` | DeepL-sleutel voor de vertalingen. |
| `KOMOOT_TOKEN_<tour-id>` | Delen-token van een Komoot-tour, voor de "Show on Komoot" knop. |
| `PUBLIC_ALLOW_INDEX` | Zet op `true` op productie als je live bent. Anders staat alles op `noindex` en blokkeert `robots.txt` alles. |

De HubSpot-formulieren moeten deze velden hebben: nieuwsbrief `email`. Route-aanvraag `email`, `firstname`, `company`, `message`.

## Vertalingen

Bij het bouwen vertaalt een stap alle Engelse pagina's naar Nederlands, Duits, Frans en Spaans met DeepL. Het resultaat zijn echte pagina's onder `/nl/`, `/de/`, `/fr/` en `/es/`, met hreflang en een regel "Automatically translated". De vertalingen worden bewaard in `translations/`, zodat een volgende bouw alleen nieuwe zinnen vertaalt. Zonder `DEEPL_API_KEY` en zonder volledige bewaarde vertalingen wordt alleen Engels gebouwd en verdwijnt de taalkeuze. Test de werking zonder sleutel met `TRANSLATE_MOCK=1 npm run build`.

## Meten en toestemming

Google Analytics laadt pas na "Accept" in de cookiebanner (Consent Mode v2, alles standaard op denied). Events: `journey_view`, `destination_view`, `gpx_click`, `pack_click`, `purchase_click`, `request_submit`, `newsletter_submit`, `language_switch`.

## Foto's en kaarten

Foto's staan als WebP in `public/photos/`. De site vraagt via Netlify Image CDN de juiste breedte en uitsnede op (16:9, 4:3, 4:5). Kaarten gebruiken MapLibre met OpenFreeMap en laden pas als je er bij scrolt. Op kaarten van betaalde routes staat een grove voorbeeldlijn, niet de volledige GPX.
