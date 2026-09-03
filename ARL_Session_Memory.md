# ARL Session Memory

Persistent working preferences for the ARL Default Project (opencode + Vercel Control Tower).

## Sync Rules (always apply)
1. **Vercel sync** — Any change to data, settings, or code in this project must also be reflected in the Vercel deployment (`arl-control-tower.vercel.app`). After local edits, redeploy to Vercel so the live Control Tower matches.
2. **Two-laptop sync** — The same opencode setup runs on two different laptops. Any data/setting change made on this laptop must be mirrored to the other laptop's `Default Project` folder as well.

## Sync mechanism (to confirm)
- Vercel: deploy via Vercel CLI (`vercel --prod`) or git push if the repo is linked.
- Other laptop: sync path/mechanism not yet defined. Confirm with the user whether the other laptop is reachable (network path) or should be synced via the git remote.
