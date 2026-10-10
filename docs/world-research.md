# Western campaign atlas: historical scope and audit

Research date: 2026-09-26. Reviewed `js/atlas-data.js` as a 715 CE campaign. This is a developer note, not text to display inside leader biographies.

## Scope and explicit abstractions

The atlas covers the western Umayyad domains, Byzantine Mediterranean, Caucasian frontier, and Khazar sphere. It does not depict the full Umayyad empire: Iranian lands, Sind and Central Asia are outside the map. Three playable major powers remain a gameplay choice. A `neutral` city denotes an independently administered local polity or a special arrangement, not one historical country called “Neutral”.

Longitude and latitude provide relative position. Offsets separate nearby clickable settlements. Roads are strategic corridors between represented centres, not archaeological reconstructions of a single paved road. Population, walls, resource modifiers and army sizes are balance scales; none is presented as a census or exact fortification inventory. Borders show campaign control rather than modern national borders or complete ethnic territories.

The year was politically turbulent. Avoid the more precise phrase “early 715” while using Sulayman and Theodosius as simultaneous starting rulers. The map should state “715 CE” with political positions abstracted within that year. A fixed seasonal start must not imply that all later-year accessions had already occurred in January.

## Decisions supported by research

| Area | Evidence and treatment | Implementation recommendation |
| --- | --- | --- |
| Tarsus / طرسوس | Tarsus is ancient. The TDV account records renewed Umayyad control under Abbas b. al-Walid in 712, followed by much later Abbasid refortification in 787. Including it in 715 is appropriate; treating the later fortress establishment as the city's original foundation is not. [TDV, Tarsus](https://islamansiklopedisi.org.tr/tarsus) | Keep `tarsus` Umayyad. Represent a vulnerable frontier base: population scale about 8,000 and wall level 1 rather than a mature major fortress. Preserve its two Taurus pass routes. These numeric values are design recommendations, not sourced statistics. |
| Dvin / دبيل | Iranica identifies Dvin as the seat of the caliph's governor after the conquest, continuing to 789. Its coordinates are approximately 40 N, 44 degrees 41 minutes E. [Iranica, Dvin](https://www.iranicaonline.org/articles/dvin/) | Umayyad ownership is appropriate. Optionally correct longitude from 44.58 to 44.68; cartographic displacement is otherwise immaterial at this scale. Do not give 715 Dvin a later Bagratid kingdom identity. |
| Ramla / الرملة | Sulayman founded Ramla while governor of Palestine under al-Walid, before his caliphate. It became the administrative centre. [TDV, Remle](https://islamansiklopedisi.org.tr/remle) | Keep it Umayyad, as a new administrative town. Modest initial fortifications and a smaller scale than Jerusalem are reasonable. Do not describe Ramla as a Crusader foundation. |
| Darband / باب الأبواب | Iranica records Muslim recapture in 713–714, followed by penetration north of the pass. Its evidence does not support presenting an uncontested Khazar city in 715. [Iranica, Khazars](https://www.iranicaonline.org/articles/khazars/) | Change `derbent` from `khazar` to `umayyad`, or explicitly identify control as a scenario abstraction. Prefer recent-occupation unrest and a threatened garrison; move a starting Khazar army to Samandar. The massive wall complex itself predates the campaign. |
| Balanjar, Samandar and the lower Volga | Iranica identifies Balanjar and Samandar as earlier Khazar capitals; their exact locations are disputed. The capital moved to the Volga estuary later. [Iranica, Khazars](https://www.iranicaonline.org/articles/khazars/) | Keep Balanjar as the campaign seat. Display legacy ID `atil` as “معبر الفولغا”, not a fully developed later capital. Treat its permanent settlement/walls as a small strategic stop; reduce wall level to 0 if possible. Samandar coordinates are approximate. Do not add ninth-century Sarkel. |
| Cyprus / قبرص | Scholarship supports shared Arab-Byzantine fiscal arrangements and continued local/Byzantine administrative life, rather than a simple single-owner conquest narrative. The nature and continuity of the so-called condominium remain debated. [Yılmaz, 2022](https://dergipark.org.tr/en/pub/iusarkiyat/article/1164172), [Oriental Numismatic Society, supplement 193](https://www.orientalnumismaticsociety.org/archive/ONS_Supplement_193.pdf) | `neutral` is an acceptable engine abstraction only with a short context label such as “جزيرة ذات عهد وجباية مشتركة”. Do not call it an independent kingdom or imply an unbroken modern joint-government constitution. A future diplomacy phase can implement special passage/revenue rules. |
| Iberia / الأندلس | By the return of Musa and Tariq in 714, the conquests included major southern/central cities and Zaragoza. Musa left Abd al-Aziz in Seville. [TDV, Musa b. Nusayr](https://islamansiklopedisi.org.tr/musa-b-nusayr), [TDV, Tariq b. Ziyad](https://islamansiklopedisi.org.tr/tarik-b-ziyad) | Seville, Cordoba, Toledo, Merida and Zaragoza may start Umayyad. Recently acquired territory should not be portrayed as uniformly settled political administration. “الأندلس” is a regional name here, not the later independent emirate/caliphate of Cordoba. |
| Barcelona and Narbonne | Barcelona's municipal history dates its period in al-Andalus to 718–801. The exact conquest chronology of northeastern Iberia varies between studies. Narbonne scholarship places conquest around 715–719, conventionally 719. [Barcelona City Council](https://ajuntament.barcelona.cat/horta-guinardo/es/noticia/barxiluna-desmemoria-del-pasado-y-presente-islamico-arranca-este-octubre-2-1214334), [Sénac, Annales du Midi, 1975](https://www.persee.fr/doc/anami_0003-4398_1975_num_87_121_1590) | Keep these two sites outside Umayyad ownership for the chosen start. A local Visigothic context label is appropriate. Do not add Castile, Aragon, a Carolingian Spanish March, or a later County of Barcelona as existing 715 factions. |
| Fustat / الفسطاط | Fustat was founded following the conquest of Egypt in 641; it predates the campaign. [Store norske leksikon, Fustat](https://snl.no/Fustat) | Use Fustat as the main administrative site on the Nile. Do not label it Cairo or introduce the later Fatimid city. Alexandria remains a separate coastal centre. |

## Geography and strategic readability audit

The broad east-west and north-south relationships are coherent: Iberia lies beyond the western strait, the Maghreb links to Egypt along the coast, Palestine connects the Nile frontier to Syria, the Taurus separates Syria/Cilicia from central Anatolia, and the Caucasus has two represented gates.

The following are map/graph corrections or design checks, not new historical claims:

1. `cherson atil` is currently a normal land edge. Its straight rendered segment can traverse the Sea of Azov/Crimean approaches and suggests an implausibly short direct road. Remove it, add an explicit steppe corridor with a geographic bend and meaningful travel cost, or introduce an appropriately represented maritime crossing. Do not silently treat open water as ordinary land.
2. `antioch tarsus` crosses the Gulf of Iskenderun if rendered as a straight line. Render a coast-hugging corridor through the Amanus/Cilician approach; the edge can remain a strategic land route. A pass classification is defensible if this route represents the mountain approach.
3. `tarsus iconium` and `tarsus caesarea` correctly provide alternative Taurus approaches. Keep ownership/hostile-stop rules intact instead of granting a special Tartus–Amorium teleport or bypass.
4. `tartus antioch tarsus iconium amorium` is a coherent overland strategic itinerary. Tartus (طرطوس) and Tarsus (طرسوس) are distinct places and should be visually distinguished in route explanations.
5. The Caucasus should not become a solid mountain wall with no readable gates. Emphasize Darband along the Caspian and Darial north of Tiflis. The `dvin derbent` edge represents a longer eastern Caucasian approach via omitted lowland centres, not a direct climb over every ridge.
6. Label rivers separately from roads. Cairo-era geography must not replace Fustat; ancient coastal access at sites such as Tarsus is an abstraction rather than a claim that today's shore lies at the city marker.
7. Do not assign the iconography of later monumental castles or Ottoman minarets to every city. Distinguish ancient urban walls, modest frontier camps, port settlements, and royal seats through silhouettes and scale.
8. Sea-route permission and port requirements must be readable. Cyprus neutrality should not make its special fiscal context look like an unexplained pathfinding failure.

## Remaining uncertainty

- Border control was fluid; the atlas cannot express layered sovereignty, tribute, and local autonomy with one owner field. Neutral Tiflis, Volubilis, Dongola and Cyprus are different political situations. Describe them locally instead of presenting all as identical independent city-states.
- Balanjar and Samandar locations, population values, and the identity of the Khazar ruler in 715 are uncertain. Avoid invented certainty and do not borrow later famous rulers merely to fill the map.
- The present source pass validates the major chronology/ownership hazards above. It is not an independent archaeological verification of each of the 66 coordinates or a census reconstruction.
- Historical positions do not prescribe later outcomes. A campaign can diverge after its start; future conquests, deaths and dynasties belong in development notes rather than prophetic player biographies.

## Exact edits requested of the integration owner

These were recommendations after read-only audit; this document does not assert they have all been applied:

- `atlas-data.js`: remove “early” from the date comment; `tarsus` population 11000 to approximately 8000 and walls 2 to 1; `derbent` owner `khazar` to `umayyad`; `atil` wall 1 to 0; consider Dvin longitude 44.68.
- Starting-army data: move the Khazar forward army out of `derbent` if ownership changes.
- Renderer/path data: correct the visual/strategic treatment of Cherson–Volga and Antioch–Tarsus.
- Local site captions: add concise contexts for Cyprus, northeast Iberia, and the newly occupied frontier.
