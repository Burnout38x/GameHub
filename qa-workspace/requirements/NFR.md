# Nonfunctional requirements v1
NFR-01: On Chrome and WebKit, new games have no horizontal overflow or clipped essential controls at 320/390, 820, and 1440 CSS pixel widths. Four saved themes remain usable.
NFR-02: Tested flows emit no unexplained uncaught page errors or failed app requests.
NFR-03: Controls have accessible names and support keyboard use; reduced motion and 200% zoom keep flows usable. Accessibility baseline only.
NFR-04: Signed-out, outsider, non-host and non-active identities cannot mutate unauthorized rooms/actions; malformed requests fail recoverably.
NFR-05 [authored]: Two local clients converge to the same authoritative state within 10 seconds after accepted commands or restored connectivity. This is a local acceptance threshold, not a production latency promise.
NFR-06: Existing unit, lint, type and relevant browser regression checks pass on the tested revision.
NFR-07: Session duration, subjective fun, balancing and physical device performance remain playtest targets; simulated browser checks do not establish them.
