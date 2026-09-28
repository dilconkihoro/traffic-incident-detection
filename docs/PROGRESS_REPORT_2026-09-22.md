# Progress report: Traffic Incident Detection System

**As of:** 2026-09-22
**Author:** Kihoro, Dilcon Kuria (BBIT 4D)
**Supervisor:** Mr. Titus Tunduny, Strathmore University

For presenting progress to the supervisor and panel. This is a point-in-time snapshot, not a
living spec: the numbered docs in `docs/00` through `docs/08` are the project's evergreen
reference documents and stay authoritative over this file wherever the two disagree.

---

## 1. Overview

**An Automated Traffic Incident Detection System using YOLOv8 and CCTV Video Data.** A desktop
prototype that reads a pre-recorded, fixed-camera CCTV video, detects and tracks vehicles
(YOLOv8 plus DeepSORT), applies three rule-based behaviour checks (abrupt stop, prolonged lane
obstruction, collision-like convergence), and writes a time-stamped incident log and annotated
video. Evaluated on precision, recall, mAP, false-alarm rate, and detection latency.

**Scope guard (decision D-11):** offline video only, YOLOv8n and YOLOv8s only (no other detector
architecture), DeepSORT as the tracker, UA-DETRAC plus DhakaAI as the two datasets. No plates,
drivers, pedestrians, live streams, or web deployment.

### Status against the master plan

| Phase | Name | Status |
|---|---|---|
| 0 | Foundation | Complete, gate G0 passed |
| 1 | Data | In progress: DhakaAI acquired and verified; UA-DETRAC pending |
| 2 | Pipeline (stand-in weights) | Built and tested; two items pending real video (section 3) |
| 3 | Training (Colab) | Notebook prepared, not yet run |
| 4 to 7 | Integration, evaluation, documentation, demo | Not started |

---

## 2. Phase 0: Foundation

Gate G0 passed: a Python 3.10.20 environment, the package skeleton, and a fail-closed
configuration validator, all test-covered before any pipeline logic was written.

- **Environment:** Python 3.10.20, 55 pinned dependencies in `requirements.txt`
  (CPU-only PyTorch 2.14.0, OpenCV 4.14.0, Ultralytics 8.4.158, DeepSORT 1.3.2), reproducible on a
  clean install.
- **Package `trafficwatch`:** typed dataclasses for every value that crosses a module boundary
  (`Frame`, `Detection`, `Track`, `Incident`), and one class per pipeline module, matching the
  design in `docs/02_ARCHITECTURE_AND_RULES.md`.
- **Configuration validator:** rejects an invalid `pipeline.yaml` before any code runs, listing
  every violation in one message by its exact dotted key (for example
  `detector.conf: must be < 1.0, got 1.5`), rather than stopping at the first error or failing
  silently.
- **Repository:** a fresh, private GitHub repository
  (`github.com/dilconkihoro/traffic-incident-detection`), isolated credentials, no shared history
  with any other project.

**Gate G0 evidence:** `pytest` and `ruff` both green on the skeleton (the white-box rule tests
were deliberately left red at this stage, marked as the Phase 2 target, not skipped or weakened).

---

## 3. Phase 2: Pipeline

All seven modules run end to end in stand-in mode (COCO-pretrained weights, clearly labelled so
the output can never leak into a result table), and the three behaviour rules pass every
hand-computed test with no edits made to weaken them.

| Module | What it does |
|---|---|
| Ingestion | Reads a video file, yields timestamped frames |
| Preprocessing | Letterboxes to 640x640, optional low-light enhancement |
| Detection | YOLOv8 inference; enforces the weights contract (refuses to start on a class or version mismatch) |
| Tracking | DeepSORT; only confirmed tracks are emitted |
| Behaviour analysis | Three rules as pure functions of trajectory history: abrupt stop, prolonged lane obstruction, collision-like convergence |
| Incident log | Time-stamped CSV, one row per incident, with full provenance (run ID, weights kind, rule-parameter hash) |
| Orchestration | Per-stage latency timing, annotated video, a reproducibility manifest on every run (git commit, config hash, seed, hardware) |

**Rule correctness:** 41 white-box tests, each a hand-computed synthetic trajectory (a clean
positive, a clean negative, and the exact boundary of every configured threshold, plus every
suppression path such as queueing and congestion). All 41 pass, unedited, once the rules were
implemented.

**End-to-end proof:** a synthetic video run through the real DeepSORT tracker and the real rules
flagged an abrupt stop at exactly the hand-computed frame, with no interpolation or adjustment
needed.

**What is not done yet:** two Gate G2 items need real video, not synthetic clips: running on 3
validation sequences, and logging the T0 zero-shot baseline. Both are blocked on UA-DETRAC
(section 5).

---

## 4. Phase 3 prep: Colab training notebook

`notebooks/colab_train.ipynb` is built and self-contained: on a blank Colab runtime it clones the
repository, installs pinned requirements, stages the dataset from Drive with a hash check, runs a
smoke test, then trains and compares models. Nothing has been run yet; no training has happened.

**Run matrix (only YOLOv8n and YOLOv8s, per decision D-11):**

| Run | Model | Training data | Purpose |
|---|---|---|---|
| T1 | YOLOv8n | UA-DETRAC | Baseline, cheap |
| T2 | YOLOv8s | UA-DETRAC | Main in-domain run |
| T3 | YOLOv8s | UA-DETRAC + DhakaAI | Tests whether the second dataset improves cross-domain performance |

Each run is validated only on the held-out validation split, never the official test split, and
the notebook compares mAP and recall across runs to recommend a model. "Testing several and
comparing" is this run matrix, not a search over other detector architectures, which is outside
the approved scope.

---

## 5. Phase 1: Data acquisition

| Dataset | Status | Detail |
|---|---|---|
| DhakaAI | Downloaded and verified | 1.44 GB `train.rar` plus 51.8 MB `test1.rar`, sha256-checked against Harvard Dataverse's own listing. Licence confirmed CC0 1.0 (public domain). Download is scripted (`scripts/acquire_datasets.py fetch-dhakaai`) against Dataverse's public API, no account needed |
| UA-DETRAC | Not yet acquired | The dataset's original official host is confirmed dead (every published download URL now redirects to a generic page). A live alternative source was found, but it is a manual download (Google Drive throttles scripted bulk downloads of files this size) |

### DhakaAI content, verified directly, not assumed

`train.rar` contains `Final Train Dataset/`: 3,003 images with matching Pascal VOC XML
annotations (one file is mislabelled: YOLO-format text saved under a `.xml` name, caught and will
be skipped, not silently mis-parsed). A full census of all 3,002 valid annotation files found:

- **24,368 labelled boxes across 21 distinct vehicle classes**, averaging 8.1 boxes per image (a
  dense-traffic dataset, as the proposal expected).
- Image sizes are highly variable (428 distinct sizes, several from phone cameras up to
  4160x3120): this is a curated photo collection, not frames from a fixed camera, which the
  earlier project documentation had only guessed at.
- `test1.rar`'s 500 images carry **no annotations at all**; read together with the dataset's own
  subtitle ("an international AI-based Dhaka Traffic Detection Challenge"), this is the
  competition's unlabeled holdout and cannot be used as ground truth. The project will build its
  own validation split from the 3,002 labelled images instead.
- The class census surfaced two items for a taxonomy decision that the original plan could not
  have anticipated without the real data: three overlapping wheeler classes (`rickshaw` 3,549
  boxes, `three wheelers (CNG)` 2,990, `auto rickshaw` 372) where one was assumed, and an
  `ambulance` class (60 boxes) that was not in the draft taxonomy at all.

---

## 6. Quality evidence

| Check | Result |
|---|---|
| Test suite | 379 tests passing (0 failing) |
| Lint (`ruff`) | Clean, 0 findings |
| White-box rule tests | 41 of 41, hand-computed, cover every threshold boundary and suppression path |
| Import isolation | Importing the package loads no model libraries (torch, ultralytics, cv2), keeping unit tests fast |
| Reproducibility | Every run writes a manifest: git commit SHA, config hash, package versions, seed, hardware string |
| Downloaded data integrity | Both DhakaAI files verified byte-for-byte and hash-for-hash against the source |

---

## 7. Key decisions on record

Full log: `docs/07_DECISIONS_RISKS.md`. Highlights relevant to progress so far:

| ID | Decision | Status |
|---|---|---|
| D-02 | Training moves to Colab (lab machines cannot train YOLOv8 at this scale); disclosed as a deviation from the proposal | Decided |
| D-04 | Unified class taxonomy | Open: real evidence gathered from DhakaAI (section 5); two sub-items need the author's visual review before a final call |
| D-11 | Detector variants limited to YOLOv8n and YOLOv8s | Decided (proposal 1.7) |
| D-19 | Exact rule-threshold definitions (speed estimator, windows, comparisons) | Decided, implemented, and test-covered |
| D-20 | Fresh, isolated private GitHub repository | Decided |
| D-21 | No model training of any size runs on the local machine | Decided |
| D-24 | DhakaAI acquisition scripted; UA-DETRAC stays manual, for a verified reason (host is dead) | Decided |

---

## 8. Next steps

1. **Download UA-DETRAC** (author, manual step; see `docs/03_DATA_PIPELINE.md` section 9 for the
   exact current source and steps). This is the critical path: it blocks the rest of Phase 1, the
   two pending Gate G2 items, and all Colab training runs.
2. **Build the Phase 1 data pipeline** once both datasets are available: the UA-DETRAC XML parser,
   the EDA script, the YOLO-format converter, and the sequence-level splitter with its leakage
   check.
3. **Run the Colab notebook** once the converted dataset is packaged, producing the T1 to T3 model
   comparison.
4. **Local raw-data backup:** a zip of the downloaded `data/` folder has been prepared for manual
   upload to Drive, in case a future download needs to be redone from a slow connection.
5. Confirm the real submission and demonstration dates (decision D-15), and book the supervisor
   meeting to sign off the three-tier incident ground-truth protocol (decision D-03).
