# Neighborhood life defect trace

| Finding | Cause and correction | Evidence |
|---|---|---|
| New services could be omitted | UI did not supply previous board to model. Reconstruct previous committed board from the last placed cell; newly served destinations get priority. | Independent source review and model priority test |
| Mobile routes displaced | Scaling positioned actor also scaled translation. Scale only inner artwork. | Final actor coordinates checked at 320/390/820/1440 in Chromium/WebKit |
| Gate moved when report expanded | Gate anchored to map including report. Anchor it to the board itself. | Document-coordinate gate position unchanged after expanding disconnected-board report |
| Immediate resize could miss cancellation | First ResizeObserver callback unconditionally skipped. Compare measured dimensions instead. | lifecycle.json: immediate real resize settles and aligns; independent correction review |

Browser harness corrections were separate from product defects: wait for fonts before asserting motion; do not overwrite local save on every reload; compare document coordinates rather than viewport coordinates after a click scrolls the page. A development run was discarded after a source refresh during observation. Final evidence uses the isolated production build.
