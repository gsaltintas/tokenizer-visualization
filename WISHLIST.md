# Wishlist

Ideas and follow-ups not yet done. Move items to a commit message when they land.

## Shareable links
- [ ] Put per-view inputs in the URL for the remaining views (Tokenize text, Vocab search/sort/page, Compare text, Merge Forest, Pre-tokenization, Intrinsic Eval languages). Done so far: Multiplicity (`?q=`, `?page=`), Merge Tree (`?text=`), and comparison selection (`?cmp=`) for all views.
- [ ] Merge Tree only uses the first two `cmp` selections; let the user pick which two.
- [ ] Confirm the production host serves `index.html` for all app paths (SPA fallback), otherwise deep links like `/multiplicity?tok=...` 404.

## Per-user tokenizer list
- [ ] Make comparison views re-load evicted tokenizers too (the backend cache is shared and LRU-limited to 10; the selector and shared links re-load, ticking a Compare checkbox does not).
- [ ] Sync the loaded list across open tabs (`storage` event).
- [ ] Remove or restrict the backend `GET /api/tokenizers` listing, which still exposes every tokenizer loaded by anyone (the UI no longer uses it).

## Misc
- [ ] Fix lint error in `IntrinsicEvalView.tsx:168` (no-unused-expressions).
