---
title: "OPTIMJACK and the Limits of Trusting Third-Party Scripts"
date: 2026-11-26
tag: SUPPLY CHAIN
authors: K Arya Sekhar Das and Evan Anderson
summary: "An attacker put malicious JavaScript into Optimizely customer projects and 178 organisations served it to their own visitors. Why SRI, CSP and consent banners all missed it, what a reproducible-build verifier would have caught, and the part no tooling fixes."
medium:
cover: optimjack-header.png
---

# OPTIMJACK and the Limits of Trusting Third-Party Scripts

## Sixteen hours on 178 sites

On 16 November 2026, an attacker wrote malicious JavaScript into the "Project JavaScript" field of Optimizely Web customer projects, through a flaw in Optimizely's signup flow. Banks, airlines, retailers and media sites then served it to their own visitors from `cdn.optimizely.com`, exactly as they serve their A/B tests every day. StepSecurity counted 178 affected organizations; most were exposed for about 16 hours.

The payload did three things:

- **Swapped crypto addresses** that visitors copied or pasted, but only checksum-valid ones near payment wording, so it stayed quiet everywhere else.
- **Skimmed cards** by wrapping `fetch`/XHR and form submits, keeping only Luhn-valid numbers plus expiry and CVV.
- **Captured screenshots and readable cookies**, and loaded extra exploit scripts on older iOS.

Nothing here was a CDN compromise. The CDN served precisely the file it was given. The sites trusted a vendor's script, and the vendor's content changed.

## Why the usual defences missed it

Each standard browser defence either didn't apply or was configured in a way that let this through.

- **Subresource Integrity (SRI)** pins a script to known hashes. The `integrity` attribute can list several, so a small set of valid versions works. An experiment snippet changes every time someone publishes a test, so its set of valid versions is effectively unbounded, and nobody pins it.
- **CSP with `strict-dynamic` and a nonce** trusts any script that a trusted script adds. The tampered snippet was trusted, so everything it loaded was too.
- **CSP host allowlists** would have helped: a `script-src` without the payload's host blocks the download, and a tight `connect-src` blocks the exfiltration. But the attacker also shipped an inline copy run through `eval`, so only a policy that forbids `eval` covers every variant.
- **Consent banners** control *when* a script runs, not *what* it contains.

The attacker also hedged against filters: three loader variants (a plain script tag, a base64 URL decoded with `atob()`, and a full inline copy with an `eval` fallback), and about 26 payload rebuilds in a single day.

## Two problems, only one of them fixable with tools

OPTIMJACK mixes two problems that need different answers. The first is a gap in today's tools. The second is more like a law of physics: a limit that comes from the goal itself, which no amount of better tooling removes.

**1. Trusted third-party scripts aren't verified.** A site that includes a vendor's script runs whatever that URL returns. What's missing is a way to say "run this only if it's one of these exact versions", and to extend that to whatever the script loads next. This is a tooling problem: SRI already does part of it, and vendors could publish versioned, immutable bundles with signed hashes.

**2. Some content is meant to change constantly.** An A/B testing snippet exists so that a marketing team can change what the page runs, several times a day, without a deploy. Constant change and "always the same, verifiable bytes" are in direct tension. Verifying content means comparing it with something fixed in advance, such as a hash or reproducible build, and content designed to change at any moment has nothing fixed to compare against. You can verify it or let it change freely, but not both. That's the "physics": a trade-off built into the goal, not a missing feature.

There is a partial way out of the second one: split the vendor's *engine* (code that changes on a release cycle, small enough to pin) from the experiment *config* (data, validated against a schema, never executed). Reproducible-builds work treats timestamps the same way: name the inputs that are allowed to vary and pin everything else. OPTIMJACK is precisely the case where that split breaks down, because Optimizely's "Project JavaScript" field is arbitrary code shipped as config.

## What Unforged would have done

[Unforged](https://github.com/intelligent-ears/unforged) is a Firefox extension we built at ETHGlobal Mumbai for a narrower case: dapp frontends, where one tampered file at Safe{Wallet}'s hosting cost Bybit about $1.5B in February 2025. Independent builders rebuild each release from the dapp's public source, sign the resulting manifest and publish it to Arkiv. The extension buffers every document, script, stylesheet and worker, hashes it before it reaches the page, and blocks anything that *k* of those builders didn't produce. Cross-origin scripts are blocked unless the curator's signed policy pins their exact hash.

Applied to a site that had enrolled, each OPTIMJACK variant fails a different check:

| Loader variant | What Unforged checks | Result |
| --- | --- | --- |
| Snippet from `cdn.optimizely.com` | Cross-origin script: allowed only if pinned in the policy, with a matching hash | Blocked (unpinned, or pinned hash no longer matches) |
| Same-origin script | Must be a file in the reproduced release | Blocked: it wasn't built from the site's public source. A closed-source vendor script can only get in as a fixed copy committed to the site's repo, which builders carry through unchanged but can't verify |
| Inline copy added to the page | The HTML document itself is hashed | Blocked: the page no longer matches its release |
| `atob()` / `eval` loaders | Run from one of the scripts above | Never run: their host script was blocked first |

This goes further than SRI in one important way: the check doesn't depend on a hash written into the page, which an attacker who controls the HTML could rewrite. The expected hashes come from builders who don't work for the site.

## Where it stops

The same property that blocks OPTIMJACK is why most of the 178 affected sites couldn't have used Unforged as they are built today.

- **Dynamic vendor scripts don't fit.** To keep Optimizely, a site would have to pin one reviewed build in the policy and publish a new policy version for every change, which ends the "publish an experiment without a deploy" workflow. That's problem 2 again, and no verifier gets around it.
- **It needs a reproducible build.** In our study of 13 open-source dapp frontends, 7 built without network access beyond package registries. Of those, 4 rebuilt byte for byte as published (Lido, ENS, Curve, Safe Transaction Builder) and 3 needed small fixes (Uniswap, Aave, Snapshot). Dapps are a good fit; a marketing site with a tag manager is not.
- **Closed-source code can't be independently reproduced.** Unforged's guarantee comes from rebuilding public source, so a vendor script without public source (Optimizely, most analytics and ad tags) can at best be pinned by hash, which means trusting the vendor's own build rather than verifying it. The open-source parts of a site can be checked; the closed-source parts can only be frozen.
- **Data isn't code, so it isn't checked.** JSON API responses and images pass through. A dapp that takes addresses or calldata from its API stays exposed, and a pinned script that `eval`s fetched data would reopen the OPTIMJACK hole.
- **Some code paths aren't filtered yet.** Only code request types and `.js` paths are checked, so WebAssembly or scripts fetched from other paths pass, and service-worker requests aren't tested.

That's why we built it for dapps: there the address-swapping payload is the whole threat, and dropping a dynamic analytics snippet is a price worth paying.

## Old versions of the same problem

Any scheme that checks web content against an outside list has been tried before, and the failures are instructive.

**Certificate revocation is the cautionary tale.** CRLs and then OCSP added a separate online check at load time. That forced a choice: hard-fail, where the revocation server going down takes every site with it, or soft-fail, where an attacker just blocks the check. Browsers soft-failed, which made the check mostly theatre. The fixes that stuck took the check off the hot path: OCSP stapling (the server ships the proof), and pushed data such as CRLite.

The lessons we took for Unforged:

- **No network request per page load.** The extension syncs all policies and attestations in bulk every 10 minutes and checks pages locally, so there's no "is the verifier up?" question while browsing. As a side effect, the registry never learns which dapps you open.
- **Fail closed on what's new, keep what's known.** If the extension can't reach the registry, it keeps using the last snapshot it synced and blocks anything that isn't in it. The catch is that nothing limits how old that snapshot can get. An attacker who blocks a user's sync can keep a release we've since revoked passing for that user indefinitely. Capping the snapshot's age (for example, a week) and failing closed after that would close the gap, at the cost of breaking dapps for anyone offline that long.
- **Untrusted storage, signed content.** Policies are signed by the curator and attestations by builders, so the storage layer and the mirror can be untrusted, the way stapled proofs make the delivery channel irrelevant.

Reproducible builds are the other precedent. Linux distributions spent years making builds byte-for-byte repeatable, starting from software that was never designed for it, by making every allowed source of variance explicit. The web is roughly where Linux was then.

## What it costs in latency

Latency was the first question the ETHGlobal judges asked, and the real cost isn't where most people expect.

- **Hashing is negligible.** SHA-256 runs at hundreds of MB/s or more, so a typical dapp chunk costs well under a millisecond. Browsers already pay this cost for SRI.
- **Waiting for the whole file is the real cost.** A file can't be passed to the page until its full body has been hashed, so scripts don't start executing while they stream in. That's the same trade-off SRI makes.
- **Fetching the expected hashes costs nothing at page load.** It happens in the background sync, not per visit. A first sync of five dapps is about 1.5 MB (manifests are 3–81 KB gzipped), and later syncs fetch only new releases.

So the overhead on a visit is one buffered body per file plus milliseconds of hashing, and no extra network round trips.

## What to do now

- **Treat "trusted third-party script" as a category to shrink.** Every vendor script on a page that handles money or wallets is code you ship but don't review.
- **Use CSP host allowlists, not just `strict-dynamic`.** List the hosts in `script-src` and `connect-src` and forbid `eval`. That alone would have blocked OPTIMJACK's download, exfiltration and inline variants.
- **Pin what changes rarely.** SRI with a small set of hashes works for vendor code on a release cycle. Ask vendors for versioned, immutable bundles.
- **Move payment and wallet input out of reach.** Card fields in cross-origin hosted iframes were out of the skimmer's reach. For crypto, verify the address on the hardware wallet's screen, not in the page.
- **If you ship a dapp, make it reproducible.** Most of the work is already done for many frontends, and it lets anyone, not just your team, vouch for the bytes your users run.

---

## Sources

- [OPTIMJACK: Optimizely-Hosted Scripts Loaded a Crypto Clipper and Card Skimmer on 178 Organizations](https://www.stepsecurity.io/blog/optimjack-optimizely-hosted-scripts-crypto-clipper-card-skimmer), StepSecurity
- [Unforged](https://github.com/intelligent-ears/unforged): README, threat model and reproducibility study
