# 07. Decisions, risks, and proposal defects

Status values: DECIDED, PROPOSED (default in force, needs sign-off), OPEN. Any change to scope, tools named in the proposal, or a metric definition is logged here first.

## 1. Decision log

| ID | Decision | Status | Default and rationale | Sign-off |
|---|---|---|---|---|
| D-01 | Repo `traffic-incident-detection`, package `trafficwatch` | DECIDED | Descriptive, short | n/a (confirmed session 1) |
| D-02 | Train on Colab; run and time on the lab machine | DECIDED (by author) | Lab machines cannot train YOLOv8 on about 28k frames. Disclose as a deviation from proposal 1.6 in Chapter 5.2.1 | n/a |
| D-03 | Three-tier incident ground truth (oracle events, adjudicated clips, synthetic scenarios); no claim of real-collision recall | PROPOSED | Datasets have no incident labels; see doc 05 section 1 | Supervisor |
| D-04 | Unified class taxonomy `car, van, bus, other, two_wheeler`, or a class-agnostic `vehicle` variant | OPEN | Decide after EDA; label-noise risk between datasets (doc 03) | Author after EDA |
| D-05 | Roboflow role: in-repo deterministic converter is the source of truth; Roboflow used for DhakaAI format conversion and an augmentation preview, plus a cross-check on a UA-DETRAC sample | PROPOSED | Keeps proposal 3.5 truthful, keeps the pipeline reproducible offline, avoids uploading a large dataset to a third party. VERIFY plan limits if used | Author |
| D-06 | Train on every 5th UA-DETRAC frame | PROPOSED | Adjacent frames are near-duplicates; makes Colab feasible. Final value from EDA | Author after EDA |
| D-07 | Preprocessing letterboxes to 640x640 with aspect preserved, no manual normalisation, boxes mapped back to original coordinates | DECIDED | Matches Ultralytics training-time handling; avoids train and inference mismatch | n/a |
| D-08 | Validation split is by sequence (about 10 to 12 held-out train sequences, seeded, stratified by weather); official test frozen | DECIDED | Prevents frame-level leakage | n/a |
| D-09 | DeepSORT via `deep-sort-realtime` is the system tracker; ByteTrack is a labelled sanity baseline only | PROPOSED | Proposal commits to DeepSORT; default appearance embedder is a generic CNN, not vehicle re-ID, so also report tracker quality (MOTA, IDF1) | Author |
| D-10 | Latency reported as per-frame pipeline latency (ms, FPS) and time-to-flag (s), on named hardware | DECIDED | Proposal definition is ambiguous; both readings are cheap to report | n/a |
| D-11 | Detector variants limited to YOLOv8n and YOLOv8s | DECIDED | Proposal 1.7 | n/a |
| D-12 | Acceptance gates in doc 05 are PROVISIONAL until P1 baselines exist | PROPOSED | Proposal gives no numeric targets | Supervisor |
| D-13 | Interface: CLI plus annotated video plus CSV; optional OpenCV `--display`; no web UI | DECIDED | Scope guard, proposal 3.7 | n/a |
| D-14 | Supplementary crash-clip evaluation (Tier D) | OPEN, off by default | Would improve collision-rule evidence but adds data outside the two named datasets; scope change | Supervisor |
| D-15 | Timeline anchored to a November 2026 demo; replace the proposal's wrong-project Gantt | OPEN | Confirm real submission and demo dates | Author |
| D-16 | Repo stays private; note AGPL-3.0 for Ultralytics before any public release | DECIDED | Proposal 3.2.5 already says private | n/a |
| D-17 | Test split evaluated once, logged in TEST_ACCESS_LOG | DECIDED | Protects validity | n/a |
| D-18 | Detector metrics from Ultralytics `val`; tracker metrics from `py-motmetrics`; neither is the official DETRAC toolkit score | DECIDED | Practicality; disclose in Chapter 5 | n/a |
| D-19 | Estimator definitions for the three rules (speed sample, windows, deceleration time, flow fraction, empty `driving_lanes` means whole frame, 1e-9 comparison tolerance), pinned by the white-box tests | DECIDED (approved with the Phase 2 plan, 2026-09-22; implemented and tested) | Doc 02 section 5.5. The rule text left these open and hand-computed tests cannot exist without them | Author |
| D-20 | Tracked in a fresh, separate GitHub repository `https://github.com/dilconkihoro/traffic-incident-detection.git` (remote `origin`), clean history from the first commit, no link to any other GitHub account. `docs/` is tracked except `docs/reference/` | DECIDED (by author, 2026-09-22) | Repo-local credential settings override the global git identity and helper; a local pre-commit guard refuses commits unless `origin` is this URL and a repo-local `user.name` and `user.email` are set. Nothing is committed or pushed until the author says so. Visibility stays private (D-16) | n/a |
| D-21 | No model training of any size runs on the local machine; the 200-image smoke epoch moves to Colab. Local runs are inference, tests, EDA and conversion only | DECIDED (by author, 2026-09-22) | Protects the local machine (no GPU, 14 GiB RAM). Refines D-02 | n/a |
| D-22 | Target hardware for latency is the author's development machine (AMD Ryzen 5 7530U, 12 threads, 14 GiB RAM, no GPU, Ubuntu 24.04). All training runs on Colab, and the Colab notebook is self-contained from a blank runtime: environment check, code fetch, pinned requirements install, data staging with hash check, training, resume, validation, model card and export | DECIDED (by author, 2026-09-22) | Closes open question 3 below. Extends D-02 and D-21. Latency here is CPU-only and reported as measured against the nominal 25 FPS Colab target | n/a |
| D-23 | Gate G2 processes 3 validation (or train) sequences, never official test sequences | DECIDED (approved with the Phase 2 plan, 2026-09-22) | CLAUDE.md rule 2: any test-split run is a logged one-time event, and looking at rule behaviour on test clips would leak into threshold choices. Replaces the kickoff wording "3 test sequences" | n/a |

## 2. Risk register

| ID | Risk | L | I | Mitigation | Trigger |
|---|---|---|---|---|---|
| R-01 | UA-DETRAC access is slow or unavailable at the original host | M | H | Start download in W1; use a documented mirror, record hash and source; compare counts with the citation | No complete archive by end of W1 |
| R-02 | Colab quota, disconnects, or GPU variability | H | M | Resume-able runs, save every 5 epochs, chunked sessions, stride fallback, single main run on Kaggle or Colab Pro as last resort | Two failed sessions in a row |
| R-03 | No incident ground truth in the datasets | H | H | Three-tier protocol (D-03); state the limit in Chapters 5 and 6 | Supervisor rejects D-03 |
| R-04 | Label-definition conflict between datasets (unlabelled two-wheelers, different class sets) | M | M | Explicit mapping, class-agnostic fallback, T2 versus T3 comparison shows harm or benefit | T3 worse than T2 on `val` |
| R-05 | Pixel-space speed varies with depth and camera | H | M | Body-height normalisation, ground-point geometry, per-camera zones | Rule thresholds fail to transfer across sequences |
| R-06 | DeepSORT default embedder is not vehicle-specific; ID switches in dense traffic | M | M | Measure IDF1 and ID switches; tune `max_age`, `n_init`; report honestly | High ID-switch rate |
| R-07 | Lab CPU is too slow for real-time | M | M | Report as measured; use YOLOv8n for the lab benchmark; the proposal claims near-real-time, not guaranteed CPU real-time | Under 5 FPS on lab machine |
| R-08 | Schedule compression toward November | M | H | Critical path in doc 01; W9 buffer; documentation in parallel from W1 | Gate slips by more than a week |
| R-09 | Licence or redistribution problems (datasets, AGPL) | L | M | Manifest with licences; private repo; no data in git | Any public release plan |
| R-10 | Train and test leakage | L | H | Sequence-level splits, script-enforced leakage check, TEST_ACCESS_LOG | Any check fails |
| R-11 | Thesis inconsistencies inherited from the proposal | H | M | Defect list below fixed in Phase 6 | Supervisor comments |
| R-12 | Trained weights arrive late | M | M | Stand-in mode keeps all other work unblocked; weights contract is a drop-in | Weights not integrated by W6 |
| R-13 | Night and rain degrade the detector (the proposal's own domain-shift argument) | M | M | Stratified reporting; optional low-light enhancement toggle; T4 resolution run | Night recall well below day |
| R-14 | Ultralytics or PyTorch API drift | M | L | Pin versions, lockfile, log versions in the model card | Colab default upgrade breaks a cell |
| R-15 | Rule thresholds tuned to a few sequences overfit | M | M | Tune on val only, evaluate on test once, show sensitivity around the chosen point | Big val-to-test gap |

(L = likelihood, I = impact; H, M, L.)

## 3. Proposal defects to fix before final submission

| ID | Where | Defect | Fix |
|---|---|---|---|
| P-01 | Appendix 1 | The Gantt image is titled "Web-Based Decision Support System for Immunization Programs", a different project | Replace with this project's Gantt (Mermaid source in doc 01) |
| P-02 | 1.6 | Garbled sentence ("using two datasets (YOLOv8 and DeepSORT)", "alarm book") | Rewrite: detects and tracks vehicles with YOLOv8 and DeepSORT, evaluated on two datasets; writes a time-stamped incident log |
| P-03 | 3.2.3 vs 2.5.5 | Says "DhakaAI sequences"; DhakaAI is likely still images | VERIFY, then state its role precisely (detector training and cross-domain detector evaluation) |
| P-04 | References and citations | Broken or odd in-text citations such as "(Kenya), 2024)" and "(2025b)"; Le et al. 2025a and 2025b are the same entry; Fang et al. appears as both the arXiv preprint (2023) and the journal article (2024); two reports carry a tracking parameter in their URL and "n.d." dates | One entry per source, cite the published versions, organisation as author with year, strip tracking parameters, re-check every in-text citation against the list |
| P-05 | Abstract | Undefined "VIV" and an unsupported "top-five" accuracy claim | Remove or cite; rewrite the outcome in past tense with actual results |
| P-06 | 1.6 vs execution | Proposal says lab computers; training is on Colab | State the deviation in Chapter 5.2.1 (D-02) |
| P-07 | 3.5 | Roboflow presented as the converter and augmenter | Align with D-05 and say what was actually used |
| P-08 | 3.6 | FAR and incident precision and recall have no defined ground truth | Use doc 05 definitions (D-03) |
| P-09 | 1.5, 2.3.1, 3.5 | "133 FPS, mAP50:95 0.480" is presented as YOLOv8 on "standard hardware" from one benchmark paper | VERIFY the exact variant, hardware, and dataset in the source; do not compare our numbers to it like for like (CLAUDE.md rule 8) |
| P-10 | 2.6, 3.2.2, 3.8 | "Five-stage pipeline" versus "seven modules" | Use one framing in Chapter 4: seven modules, of which evaluation runs offline |
| P-11 | Tense | Proposal is in the future tense | Chapters 4 to 6 in the past tense (Lec 6) |

## 4. Open questions for the author

1. What are the real final submission and demonstration dates (D-15)?
2. Who signs off D-03 and D-14 (supervisor meeting date)?
3. ~~Which lab machine will be the "target hardware" for latency, and does it have a GPU?~~ Answered 2026-09-22 (D-22): the author's development machine, no GPU.
