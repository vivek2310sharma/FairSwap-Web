# Manufacturer review — 11 November 2026

The immutable 607-row CSV remains an unverified legacy source. This is a focused gap review, not certification of every legacy row or of regional feature support. Only the 22 additions and two type overrides in [supplement.v1.1.json](supplement.v1.1.json) have new evidence. Every entry records verification date, manufacturer URL, disposition, reason and availability. No release-year data is inferred.

| Brand group | Review / disposition | Manufacturer evidence |
|---|---|---|
| Apple | Series 11, SE 3 and Ultra 3 already present. Add Series 12 and Ultra 4, announced September 2026; retain older resale models. | [Watch newsroom](https://www.apple.com/in/newsroom/topics/watch/); exact releases in supplement |
| Samsung | Watch8/Classic and Ultra (2025) retained; add Watch9 and Ultra2 from manufacturer-confirmed 2026 references. | [India Watch8 release](https://news.samsung.com/in/samsung-galaxy-watch8-series-ultra-comfort-from-sleep-to-workout) |
| Google | Pixel Watch 4 retained; add Pixel Watch 5 from Google India Blog. No size/connectivity duplicates. | [India product](https://store.google.com/in/product/pixel_watch_4?hl=en-IN) |
| Noise | Add five distinct products. Existing Noise Pro 6 is retained; do not create a second ColorFit Pro 6 spelling as another product. Kids products and finish/strap bundles are not additions. | [Manufacturer collection](https://www.gonoise.com/collections/all-smartwatch) |
| boAt | Add Valour Watch 1 GPS and 1R as separate products. | [Manufacturer collection](https://www.boat-lifestyle.com/collections/smart-watches/all-products) |
| Fire-Boltt | Add Brillia; black and other colours are finish choices. | [Manufacturer product](https://www.fireboltt.com/products/brillia-black) |
| Fastrack / Titan | Add Smart Jupiter R3 Pro and Celestor 2.0; keep Celestor V1. | Exact India manufacturer collection links in supplement |
| Boult | Add GoBoult Mustang Stallion under existing immutable Boult brand ID. The former manufacturer site redirects to GoBoult. | [Manufacturer collection](https://goboult.co.in/collections/smart-watches) |
| Nothing / CMF | Watch 3 Pro already present. No evidence-based changes to the other legacy CMF names in this pass; their prior approval is not newly verified. | [India product](https://in.nothing.tech/products/cmf-watch-3-pro) |
| Xiaomi | Smart Band 10 already present; add Smart Band 10 Pro from global manufacturer product. India retail availability remains unverified. | [Manufacturer product](https://www.mi.com/global/product/xiaomi-smart-band-10-pro/) |
| OnePlus | Add Watch Lite based on UK manufacturer product. India retail availability remains unverified; do not rename any legacy identities. | [Manufacturer product](https://www.oneplus.com/uk/oneplus-watch-lite) |
| Realme | Watch 5 already present; add Watch S2 and S5 listed in the India store. | [India store](https://buy.realme.com/in/goods/213) |
| Amazfit | Add Balance 2 and T-Rex 3 Pro; correct Active Edge to smartwatch. Correct Helio Strap to fitness_band but retain quarantine: screenless hardware cannot satisfy V1 display-condition fields truthfully. | Exact product/manual URLs in supplement; [screen-free tracker collection](https://us.amazfit.com/collections/helio-collection) |
| Garmin | Existing recent models include Forerunner 570/970, Venu 4/X1 and Fenix 8 Pro. No additional independently reviewed model added in this pass. | [Manufacturer India catalogue](https://www.garmin.com/en-IN/) |
| Ultrahuman | Ring Pro already present. Keep Home excluded and legacy finish/edition quarantines pending separate evidence and policy review. | [Manufacturer Ring PRO](https://www.ultrahuman.com/us/ring-pro/) |

## Identity and variant decisions

No rows are deleted, collapsed or renamed. Existing Galaxy Watch 42/46 mm, OnePlus Watch 3 43mm, Garmin S/Music/Pro and other materially distinct legacy rows keep their identities. New products use the existing case-size, connectivity and finish fields rather than expanding every SKU combination. Existing quarantines for ring finishes/editions remain; this does not assert those products do not exist. No new aliases are needed for the added selections or buyer filters. Picker/API shapes and accessible search remain unchanged.

Outstanding legacy research includes CMF Band/Watch naming, speculative-looking legacy names and hybrid-watch boundaries. Lack of fresh evidence is not used to silently delete or rename resale identities. Helio Strap approval requires a separately tested screenless display-condition contract in Web and SQL.

## Evidence correction — 14 November 2026

All 22 supplemental entries now use model-specific manufacturer references recorded individually in the supplement. ColorFit Ultra 4 is directly identified at https://www.gonoise.com/products/noise-colorfit-ultra-4-smartwatch and stays approved. Samsung's Watch9 page currently says “Not for sale”; the entry qualifies availability rather than promising stock. Watch Ultra2's sports/GPS type matches the existing 2024/2025 Samsung Ultra rows. Pixel Watch 5 has an India Blog announcement. No new SKU variants are split into model records. Helio Strap stays quarantined.
