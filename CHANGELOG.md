# Changelog

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
