# Changelog

## [0.7.2](https://github.com/smorinlabs/difftree-action/compare/v0.7.1...v0.7.2) (2026-09-01)


### Documentation

* remove fleet-specific private records from the public repo ([a7b545d](https://github.com/smorinlabs/difftree-action/commit/a7b545de9062e0a48461a5ebf9c2efd6333bdc69))
* remove fleet-specific private records from the public repo ([9c8aedc](https://github.com/smorinlabs/difftree-action/commit/9c8aedcfc64ad4490b4964a069b066571cb5204f))

## [0.7.1](https://github.com/smorinlabs/difftree-action/compare/v0.7.0...v0.7.1) (2026-09-01)


### Documentation

* fan-out wave log (F77–F80) and tracker (relocated to a private tracker) ([6d8fe55](https://github.com/smorinlabs/difftree-action/commit/6d8fe5541acf3ce984e3c7acb91fa91750669d05))
* fan-out wave log (F77–F80) and tracker (relocated to a private tracker) ([1544e2b](https://github.com/smorinlabs/difftree-action/commit/1544e2bd1ee451b08b432105df30f2757a02b259))
* close P06 (fold merged completes T10); version ref v0.7.0 ([35b63db](https://github.com/smorinlabs/difftree-action/commit/35b63db7ebd0ab0bc7d198c3cacbafdec113f66f))
* renumber the private tracker block to P06 (P05 taken by foldable sections) ([241d7ba](https://github.com/smorinlabs/difftree-action/commit/241d7ba14dae3f8fa0af57ffa3b60e31b11cea46))

## [0.7.0](https://github.com/smorinlabs/difftree-action/compare/v0.6.2...v0.7.0) (2026-09-01)


### Features

* **comment:** foldable plain + colored sections (color-section / plain-section) ([930a76b](https://github.com/smorinlabs/difftree-action/commit/930a76bae22a03eb545b31c018576e187fd99cde))


### Bug Fixes

* **comment:** exact fence-delimiter reserves and no double SCAFFOLD subtraction; review fixes ([f964431](https://github.com/smorinlabs/difftree-action/commit/f96443156fb05d75e994a7b96ecdc04cccabc1c5))


### Documentation

* **readme:** sketch the output layout for each color-section/plain-section configuration ([fb22dfa](https://github.com/smorinlabs/difftree-action/commit/fb22dfa3018972826e4822b04f9c67b34f2a6454))

## [0.6.2](https://github.com/smorinlabs/difftree-action/compare/v0.6.1...v0.6.2) (2026-09-01)


### Documentation

* flip T38 (template-press merged c0992d8); fan-out handoff; wording fix ([3d82873](https://github.com/smorinlabs/difftree-action/commit/3d828737ddada63d45bd2ff174e6edb381c4a090))
* log fan-out wave 5 (final); tick T36,T39-T41,T43; close T19; T38 pending ci-ok ([07d8ec6](https://github.com/smorinlabs/difftree-action/commit/07d8ec692a9c1e18a1207ca69449c86899b2b698))
* log final fan-out wave; tick T36,T39-T41,T43; close T19 ([81a1676](https://github.com/smorinlabs/difftree-action/commit/81a1676cd8c5c4e923ed57155620342dfd9901e5))
* reconcile fleet count (39/39 targets + dogfood) in wave-5 standing ([eeee131](https://github.com/smorinlabs/difftree-action/commit/eeee131ea8cff9c7ec2b41716f4d8e23931728b1))

## [0.6.1](https://github.com/smorinlabs/difftree-action/compare/v0.6.0...v0.6.1) (2026-09-01)


### Documentation

* **projects:** close P04 — v0.6.0 released ([dd63aa1](https://github.com/smorinlabs/difftree-action/commit/dd63aa1da8d675fe784ffb4b80e5e0d266787557))
* **projects:** close P04 — v0.6.0 released, canary and dogfood verified ([00c51cf](https://github.com/smorinlabs/difftree-action/commit/00c51cfe68e372db65d409d6466dd3addc884338))

## [0.6.0](https://github.com/smorinlabs/difftree-action/compare/v0.5.1...v0.6.0) (2026-09-01)


### ⚠ BREAKING CHANGES

* **skill:** rename workflow to difftree-pr-comment across template, skill, docs

### Features

* **comment:** colored PR comment by default, plain fence via color:"false" ([76c4b6a](https://github.com/smorinlabs/difftree-action/commit/76c4b6a8ff1381eb8291053ba1f0bdf4bf031a9e))
* **comment:** render the PR comment in color by default; color:"false" keeps the plain fence ([b70ce28](https://github.com/smorinlabs/difftree-action/commit/b70ce28f0c4f588ee5b2f7cc3c486a65c7b4c7cd))
* **skill:** rename workflow to difftree-pr-comment across template, skill, docs ([a57fb25](https://github.com/smorinlabs/difftree-action/commit/a57fb25f62cf24be0151b6abc81eaeec645d13fb))


### Bug Fixes

* **comment:** defeat GitHub autolinking inside math expressions ([5a1df6d](https://github.com/smorinlabs/difftree-action/commit/5a1df6d36a41c6d42d5cc89acfc536c685ade778))
* **comment:** defeat GitHub autolinking inside math expressions ([cf88522](https://github.com/smorinlabs/difftree-action/commit/cf885225230ec89a0947d4a934cc3448cd4e3da9))
* **comment:** keep pure-space tree prefixes aligned with │ prefixes ([ee68803](https://github.com/smorinlabs/difftree-action/commit/ee688031fe23c80eb7b57f31881a38d8ad20d843))
* **comment:** keep pure-space tree prefixes aligned with │ prefixes ([b266b08](https://github.com/smorinlabs/difftree-action/commit/b266b08efb33ce7574b66b2309b094343d060c79))
* **comment:** keep the comment-size contract when color declines; RUNBOOK expects colored rows ([de75236](https://github.com/smorinlabs/difftree-action/commit/de7523682e8bcd66b2d9d4d016a258ef5fb1012f))
* **skill:** define &lt;clone&gt; in the no-clone path; quote &lt;clone&gt;/&lt;wt&gt; operands ([1e05da3](https://github.com/smorinlabs/difftree-action/commit/1e05da31deb533a6217d8e4ef309c3ded0968eee))
* **skill:** define &lt;old-basename&gt;; clarify status check and wave-4 summary wording ([9152e77](https://github.com/smorinlabs/difftree-action/commit/9152e77063564d37c75932280880a1b75eaf759d))
* **skill:** grep for stale old-path references after a replace-in-place (F76); log wave 4; tick 10 P03 rows ([329c6f5](https://github.com/smorinlabs/difftree-action/commit/329c6f504254b33b95c45d842e5d800d072277f5))
* **skill:** grep for stale old-path refs after replace-in-place (F76); log wave 4 ([c928692](https://github.com/smorinlabs/difftree-action/commit/c928692d5764f9c9718b3084b544af18c9fbe547))
* **skill:** harden §4 step 9 against arg substitution; log cold retest 3 (F72) ([c302bb3](https://github.com/smorinlabs/difftree-action/commit/c302bb3fbcc20adfefb85d1d8225c47636821b79))
* **skill:** harden step 9 against arg substitution; log cold retest 3 (F72) ([5a52775](https://github.com/smorinlabs/difftree-action/commit/5a52775eeee688033d2713595030579b85b04ffe))
* **skill:** replace machine-specific ~/c paths with &lt;clone&gt;/&lt;wt&gt; placeholders (F73) ([26ad1b7](https://github.com/smorinlabs/difftree-action/commit/26ad1b732d2b4b608e1ed66d739120fd7c56d4ae))
* **skill:** replace machine-specific ~/c paths with generic placeholders (F73) ([bb4c5bc](https://github.com/smorinlabs/difftree-action/commit/bb4c5bc7c1aa9e3f1239e10342bd7f1f6f1aa87c))
* **skill:** tighten replace-in-place pairing; RUNBOOK and mirror accuracy ([b62a104](https://github.com/smorinlabs/difftree-action/commit/b62a104d0e1d4a57e95213f33c0e1f49f4b72b40))


### Documentation

* **color:** add GitHub math color guide and copy-paste examples ([6da6322](https://github.com/smorinlabs/difftree-action/commit/6da6322d40cafb37b02fd6ab51bd197cd926b3e0))
* fix [@v0](https://github.com/v0).1.0 marker and code-format branch name in P03 ticks ([1d3b643](https://github.com/smorinlabs/difftree-action/commit/1d3b643581cf51e2d7a732dc4b1252f168387d09))
* log fan-out wave 3 (10 repos) and F75; tick T12-T15,T18,T20,T21,T23,T32,T35 ([7b49bfa](https://github.com/smorinlabs/difftree-action/commit/7b49bfae20e5d92e78e696ea0b0523f35144d26a))
* log fan-out wave 3 and F75; tick 10 P03 rows ([af23898](https://github.com/smorinlabs/difftree-action/commit/af23898e326dc9aebb3845c8dabe9a0fe11c1b85))
* log rename resync wave and fan-out wave 2; tick T07/T08/T16 ([9468c69](https://github.com/smorinlabs/difftree-action/commit/9468c692a5cda0e36b80bc05499b9fe38ad7d33b))
* log rename resync wave and fan-out wave 2; tick T07/T08/T16 ([3acbfeb](https://github.com/smorinlabs/difftree-action/commit/3acbfeb86dc09af7dd90a7dc11d998f7fdb600b0))
* point P03 goal and deliverable at renamed difftree-pr-comment.yml ([d8aa531](https://github.com/smorinlabs/difftree-action/commit/d8aa531ebedd3c9c2ee8ae5fa6dec2fa4ce0857f))
* reword wave-4 summary (no run needed a skill correction; F76 folded afterward) ([a8ac69b](https://github.com/smorinlabs/difftree-action/commit/a8ac69b3c37314dbf013fddd333a3e8e58fa5685))

## [0.5.1](https://github.com/smorinlabs/difftree-action/compare/v0.5.0...v0.5.1) (2026-08-31)


### Bug Fixes

* **skill:** address PR [#18](https://github.com/smorinlabs/difftree-action/issues/18) review — anchor origin check to github.com, bind $PROV, retry deletes remote too ([c4d0e76](https://github.com/smorinlabs/difftree-action/commit/c4d0e76b8878b19f53c08e6b0fbe7a7820e4aad9))
* **skill:** address PR [#19](https://github.com/smorinlabs/difftree-action/issues/19) review — full command form in retry prose, qualified PR reference ([f17530b](https://github.com/smorinlabs/difftree-action/commit/f17530b75d5f14ce3ad22b1c15f339261c5dd919))
* **skill:** cold-retest-1 corrections — origin check, canned bot answers, branch -d retry ([38c561d](https://github.com/smorinlabs/difftree-action/commit/38c561dadba45bd4049da1fc7c8fcc618d2765ca))
* **skill:** cold-retest-1 corrections — origin check, canned bot answers, branch -d retry ([68e1a76](https://github.com/smorinlabs/difftree-action/commit/68e1a7636840a640f60fdc4bb6d4875432d02fed))
* **skill:** drift proof falls back to git show when $PROV is unpublished ([7cc3a05](https://github.com/smorinlabs/difftree-action/commit/7cc3a0598d0f3b202345d5610973771d14e876e4))
* **skill:** F66 retry refreshes the tracking ref through the transport that worked ([4663a49](https://github.com/smorinlabs/difftree-action/commit/4663a495122906ce44692735371389ad463e8970))
* **skill:** F71 — branch -d retry unsets the stale upstream instead of fetching; log cold retest 2 ([3f6448b](https://github.com/smorinlabs/difftree-action/commit/3f6448bc50a25b5fc08ccc32ff81e2908f76c4f5))
* **skill:** F71 — branch -d retry unsets the stale upstream instead of fetching; log cold retest 2 ([a5e0b6f](https://github.com/smorinlabs/difftree-action/commit/a5e0b6fdb723dc8db14732fc43bae36050fe50bc))
* **skill:** require a clean working-tree template on the in-repo resolver path ([059c55f](https://github.com/smorinlabs/difftree-action/commit/059c55fe373eec3b8fb0f3a5e8309cf015edb958))
* **skill:** scope the no-fetch claim in the branch -d retry to all remote states ([dc5aaf6](https://github.com/smorinlabs/difftree-action/commit/dc5aaf6f3fb16af43137ecd4a647252abe747ddd))


### Documentation

* **handoff:** fan-out count is 31 — exclude difftree-action (T19) as well as shelf ([ac5bdf5](https://github.com/smorinlabs/difftree-action/commit/ac5bdf541729676c0e25adba30821228efbfb9d4))
* **handoff:** P03 cold-retest handoff for a fresh session ([1d90044](https://github.com/smorinlabs/difftree-action/commit/1d90044a88a804337d44cf83946abd8a3e128870))
* **handoff:** P03 cold-retest handoff for a fresh session ([0798951](https://github.com/smorinlabs/difftree-action/commit/079895100573f7657a3953a9f56bde9ad8b55fb1))
* **handoff:** P03 run-3 (shelf) + fan-out handoff for a fresh session ([caa5dd4](https://github.com/smorinlabs/difftree-action/commit/caa5dd4492762bcf0e96fc5111ac64ce1d7a2615))
* **handoff:** P03 run-3 (shelf) + fan-out handoff for a fresh session ([c4204e7](https://github.com/smorinlabs/difftree-action/commit/c4204e757b3763e709b7cfe36d1e51977ec0cb5d))

## [0.5.0](https://github.com/smorinlabs/difftree-action/compare/v0.4.0...v0.5.0) (2026-08-30)


### Features

* P03 pilot phase — §4 verification checklist, template batch, findings F01–F65 ([0d0a94c](https://github.com/smorinlabs/difftree-action/commit/0d0a94c7d11ec81cc72839cf4a1fe915ede54edf))
* **template:** fork-PR note, edited-event re-render, tag and runner guidance, checkout v6, persist-credentials off ([38936cb](https://github.com/smorinlabs/difftree-action/commit/38936cbfcf07421960c249aa3372fd9ff08c7784))


### Bug Fixes

* **docs:** README usage snippet mirrors the template (job-level if + concurrency, checkout@v6); template sha example marked e.g. ([0af0b4e](https://github.com/smorinlabs/difftree-action/commit/0af0b4ea1bfffe1fdb0da1c5573df6bf1d3eec5e))
* **skill:** §2 — fetch before the leftover-branch precondition; plain &lt;branch&gt; in the remote delete ([6f79158](https://github.com/smorinlabs/difftree-action/commit/6f791588f31435f6f6ce0dd7adecd3584556ada6))
* **skill:** §4 — answer review threads as they arrive; only the merge-ready verdict waits for the floor ([2d92905](https://github.com/smorinlabs/difftree-action/commit/2d92905f4d24a41c3f9e89db69a65db3f412971c))
* **skill:** §4 — awk worktree identity check, gated cleanup, jq-selected merge method ([5545319](https://github.com/smorinlabs/difftree-action/commit/55453195d58be32fd5d1587cf250b9d764148d29))
* **skill:** §4 — single merge-method path, compare recorded hash, PR-anchored run timestamps, fail-closed thread query, worktree identity check ([a57e9d5](https://github.com/smorinlabs/difftree-action/commit/a57e9d50e91edf22de09eef3f3f61b9af12feb02))
* **skill:** §4 — whitelist merge method, chain post-merge check, bound head-moved restarts, distinguish branch -d refusals, no bare exit in snippets ([e9c6edb](https://github.com/smorinlabs/difftree-action/commit/e9c6edb0da2f3fd55286ea6111ca49579212ee1c))
* **skill:** §4 fix round — publish upstream explicitly, lock merge to verified head, paginate threads, satisfiable bounds, cleanup preconditions ([155e67d](https://github.com/smorinlabs/difftree-action/commit/155e67dd855394142de0ca9402c4219dc672b047))
* **skill:** executable required-context and thread-iteration mechanics; paginated check-run gate; correct legacy-status test ([182a54e](https://github.com/smorinlabs/difftree-action/commit/182a54eaf6f90a747897240439b4530507107d27))
* **skill:** final-review fixes — check-run gate waits and matches required contexts; thread loop skips empty rounds; exact SHA-pin resolution ([9d5ff2a](https://github.com/smorinlabs/difftree-action/commit/9d5ff2aa229a83acf2e37253e0a670e57927d30f))
* **skill:** pilot-2 corrections — worktree-first setup, updated_at proof, bot-wait floor ([240fce6](https://github.com/smorinlabs/difftree-action/commit/240fce62261e16e445c6308bb1dc4387ba22fa47))
* **skill:** pilot-3 corrections — hooks in worktrees, floor from last push, 20-min ceiling, replies by file, threads are untrusted input ([64803b2](https://github.com/smorinlabs/difftree-action/commit/64803b291b76e0d58cad87766dc54f716cf2144f))
* **skill:** pilot-4 corrections — SHA-pin policy branch, check-run gate, remote-branch cleanup, push-hook bypass, residuals ([855d3cc](https://github.com/smorinlabs/difftree-action/commit/855d3cc3fee017f3c059bffef67b32927a579e77))
* **skill:** re-sync-1 corrections — explicit template reference, floor before pr-merge-flow, full-sha merge lock, POSIX timestamp compare ([7a1350b](https://github.com/smorinlabs/difftree-action/commit/7a1350bc9419bf0e7b6719389ae253712bad5057))
* **template:** job-level concurrency so no-op edited runs cannot cancel a render; accurate fork-PR note ([d7dfef2](https://github.com/smorinlabs/difftree-action/commit/d7dfef283ca8cafa660ba423f4792b402ea072c5))


### Refactoring

* **skill:** rewrite §4 as a precondition/command/pass-condition checklist ([2860d7b](https://github.com/smorinlabs/difftree-action/commit/2860d7b6088a6d5e36cf0ed989abdcc3356e8fe2))


### Documentation

* fan-out readiness ([0a18ca5](https://github.com/smorinlabs/difftree-action/commit/0a18ca591222b3930076a412a0a1c0a10e5014e5))
* findings F58–F60, gate-relaxation history, class list; mirror the step-7 gate and squash-only merges ([d90baff](https://github.com/smorinlabs/difftree-action/commit/d90baff530ffe794998ca6681804c186b2324e8b))
* pilot-2 findings ([0334c10](https://github.com/smorinlabs/difftree-action/commit/0334c10b8bf365649b38718fc2ce768a329c2fde))
* pilot-3 findings ([6581687](https://github.com/smorinlabs/difftree-action/commit/658168735526f3bc7be0933d3d2ce06bc45ff65c))
* **plan:** insert Task 9b — fold re-sync-1 gotchas before Tasks 10–11 ([09fd1c5](https://github.com/smorinlabs/difftree-action/commit/09fd1c5090931bf783e31651bdd5eb2fc14c67ff))
* **plan:** revise P03 pilot phase after pilot 3 — template batch, §4 rewrite, re-sync, confirming pilot ([9c9f713](https://github.com/smorinlabs/difftree-action/commit/9c9f7131a220ae7ec350e856fbe0cdb69a2dfa39))
* re-sync 2–3 and pilot-4 findings F50–F57 ([ae7a83a](https://github.com/smorinlabs/difftree-action/commit/ae7a83a505b887b86b9256377243a15280e3c43e))
* re-sync-1 findings F38–F49 ([a6e6df2](https://github.com/smorinlabs/difftree-action/commit/a6e6df244103877f742301fddd722e65f612528a))
* **skill:** state the intent of every command-bearing step so repos that differ can be adapted, not reverse-engineered ([5ae3f7e](https://github.com/smorinlabs/difftree-action/commit/5ae3f7e1b7722ad9ecbb6e606bdf3b097cf01494))
* T45 template batch ([49ba79b](https://github.com/smorinlabs/difftree-action/commit/49ba79bfe3d26154cf06a96fa4f92a686ec23d08))
* track F61-F65 from the final Codex pass for the cold-retest session ([dbb0cd0](https://github.com/smorinlabs/difftree-action/commit/dbb0cd0e4219b1ed60ac1237768b6f050fede7c2))

## [0.4.0](https://github.com/smorinlabs/difftree-action/compare/v0.3.0...v0.4.0) (2026-08-30)


### Features

* fleet rollout prep — skill verification section, difftree 0.3.1 default, P03 ([d8b08cb](https://github.com/smorinlabs/difftree-action/commit/d8b08cbe8be5c7fee607713abb2d3ce2eb67bf99))


### Bug Fixes

* default difftree-version to 0.3.1 ([47f4c72](https://github.com/smorinlabs/difftree-action/commit/47f4c7222dd82a2453145fbbfe454a09f5b67882))
* **skill:** pilot-1 corrections — template resolver, review-thread handling, cleanup order ([68ae112](https://github.com/smorinlabs/difftree-action/commit/68ae1127896c96796459368905e88d7b499de4f2))
* **skill:** resolve template from any placement; clear review threads before merge ([886a5d3](https://github.com/smorinlabs/difftree-action/commit/886a5d3bd31336e1c12f824b3f2431fceb48b130))


### Documentation

* add fleet rollout findings log ([071a856](https://github.com/smorinlabs/difftree-action/commit/071a856c157e32cffcb500994736c9dcbd5a7c45))
* pilot-1 findings F04–F16 ([eb16ac2](https://github.com/smorinlabs/difftree-action/commit/eb16ac2a48789e7f3cbacbf6e33197b228e0ce00))
* **skill:** add verification section and in-place replace to difftree-action-setup ([6e3db99](https://github.com/smorinlabs/difftree-action/commit/6e3db99278eb8596c83524cbb6a611c2da849d63))

## [0.3.0](https://github.com/smorinlabs/difftree-action/compare/v0.2.0...v0.3.0) (2026-07-17)


### Features

* add setup-difftree skill and canonical example workflow ([755e8a3](https://github.com/smorinlabs/difftree-action/commit/755e8a37d174ff13dd70a2a215625a681f4a49c2))
* add setup-difftree skill and canonical example workflow ([6b3e22c](https://github.com/smorinlabs/difftree-action/commit/6b3e22c22fda2382f733988f3245180d4f7c5b9f))

## [0.2.0](https://github.com/smorinlabs/difftree-action/compare/v0.1.0...v0.2.0) (2026-07-06)


### Features

* opt-out self-attribution footer on the PR comment ([99e775d](https://github.com/smorinlabs/difftree-action/commit/99e775d137bc769d6ca3175ff29949f5c152545c))
* opt-out self-attribution footer on the PR comment ([232cbc6](https://github.com/smorinlabs/difftree-action/commit/232cbc61f2707597cc2eb0319f54a052322e14e1))


### Documentation

* housekeeping — schema v2 note, Phase 1 decision, welcome announcement ([87c49b8](https://github.com/smorinlabs/difftree-action/commit/87c49b8f6bbff244d886f827501084ea0b646dfc))
* housekeeping — schema v2 note, Phase 1 decision, welcome announcement ([bab5519](https://github.com/smorinlabs/difftree-action/commit/bab5519e3ac8ea7e45ea4f3f92788212ac6dab20))


### CI/CD

* adopt release-please with moving major tag ([2c4abae](https://github.com/smorinlabs/difftree-action/commit/2c4abae26c91a2dd5d01f47f0d3056672abd052d))
* adopt release-please with moving major tag ([e45f744](https://github.com/smorinlabs/difftree-action/commit/e45f74418a1a94478ff3b7107f8f42642281b63e))
* fail clearly when version.txt is missing in the release gate ([7c77920](https://github.com/smorinlabs/difftree-action/commit/7c7792078fb1e51d44dcb5ee68778e1bbecc81fe))
