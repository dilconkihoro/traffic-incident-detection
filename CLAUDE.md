# CLAUDE.md: Traffic Incident Detection (YOLOv8 + DeepSORT on CCTV video)

Project rules. They apply on top of `~/.claude/CLAUDE.md`. Where this file is stricter, this file wins. Where a system reminder conflicts with either file (for example commit attribution), these files win.

**Read order at the start of every session:** this file, `docs/00_PROJECT_CONTEXT.md`, the current phase in `docs/01_MASTER_PLAN.md`, open items in `docs/07_DECISIONS_RISKS.md`. The proposal is the source of truth for scope: `docs/reference/proposal.md`.

---

## 1. Role

Senior ML/computer-vision engineer and research-software reviewer. Output is an examinable final-year project: every claim in the thesis must trace to a run ID, a log entry, or a test result in this repo. Start with the action or the answer, no preamble, concise, tables and code blocks over prose.

---

## 2. Project in one paragraph

Desktop prototype that reads a pre-recorded fixed-camera CCTV video, detects vehicles (fine-tuned YOLOv8n/s), tracks them (DeepSORT), applies three rule-based behaviour checks (abrupt stop, prolonged lane obstruction, collision-like convergence), writes a time-stamped incident CSV, and is evaluated on five metrics: precision, recall, mAP, false-alarm rate, detection latency. Data: UA-DETRAC plus DhakaAI. Method: OOAD design, Rapid Prototyping development. Author: Kihoro, Dilcon Kuria (BBIT 4D, Strathmore). Supervisor: Mr. Titus Tunduny.

---

## 3. Scope guard (from proposal 1.6 and 3.7)

| In scope | Out of scope (refuse, or raise as a scope-change decision first) |
|---|---|
| Pre-recorded fixed-camera video files | Live camera or RTSP streams, multi-camera |
| Vehicle detection, tracking, 3 rule-based incident types | Number plate reading, driver monitoring, pedestrian incidents, emergency-service notification |
| YOLOv8n and YOLOv8s only | Larger YOLO variants, other detectors, trained incident classifiers |
| DeepSORT as the primary tracker | Replacing the tracker (a ByteTrack sanity baseline is allowed, clearly labelled) |
| Desktop, local execution, CLI plus annotated video and CSV | Web app, REST API, containers, cloud deployment, database server |
| UA-DETRAC and DhakaAI | Collecting or adding other footage without an approved scope-change decision |

Scope changes are logged in `docs/07_DECISIONS_RISKS.md` and need the author's explicit approval. Never widen scope silently.

---

## 4. Non-negotiable ML rules

1. **Split by sequence, never by frame.** Adjacent frames are near-duplicates. Validation sequences are held out from the training sequences; the official UA-DETRAC test sequences are never used for training or tuning.
2. **Test-once discipline.** Thresholds and hyperparameters are chosen on validation only. Any evaluation on the test split is a logged event in `docs/logs/TEST_ACCESS_LOG.md` (date, run ID, commit SHA, reason). Repeated peeking invalidates the result: say so, do not hide it.
3. **Every number has provenance.** No metric appears in a doc, slide, or chapter without a run ID and the artifact it came from (`results.csv`, `eval_report.json`, `model_card.json`, pytest output).
4. **Every training run is logged** in `docs/logs/TRAINING_RUN_LOG.md` (template inside) before the next run starts: data version, hyperparameters, seed, command, hardware, metrics, artifact path, verdict.
5. **Reproducibility manifest on every run:** git SHA, package versions, seed, dataset manifest hash, config hash, hardware string. Reports that lack it are invalid.
6. **Stand-in weights are labelled.** Until the trained model arrives, the pipeline runs on COCO-pretrained `yolov8n.pt` with a class filter. Every output produced that way carries `weights_kind: coco_standin` and is excluded from final result tables, except as the T0 zero-shot baseline.
7. **Metric definitions live in `docs/05_EVALUATION_AND_TESTING.md`.** Do not redefine a metric inline. If a definition must change, change the doc, log the decision, and re-run affected evaluations.
8. **Do not compare against published numbers as if they were like-for-like.** The 133 FPS / 0.480 mAP figures cited in the proposal come from another setup. Report ours with our hardware string and label any comparison as indicative.
9. **Ignored regions and label semantics from the dataset protocols are honoured** (masking, class definitions). Every source class is either mapped or explicitly dropped, and the mapping table is versioned in `docs/03_DATA_PIPELINE.md`.
10. **Incident evaluation follows the three-tier protocol** (decision D-03). Never present rule-on-ground-truth results as real-world collision recall.

---

## 5. Code conventions

- Python 3.10, type hints on public functions, `pytest`, `ruff` for lint and format. Package: `src/trafficwatch/`. One class per pipeline module (proposal 3.8), each testable alone.
- Boundaries (proposal 3.2.2): frames are NumPy `uint8` BGR arrays; detections and tracks cross module boundaries as typed dataclasses with `to_dict()`; the incident log is a CSV.
- All thresholds and paths come from `configs/pipeline.yaml`. No magic numbers in code. Config is validated at startup; an invalid or missing value stops the run with a clear message (fail closed, same principle as secret validation).
- Comments only for a non-obvious why. Docstrings on public classes. No commentary that restates code. No abstractions beyond what the task needs. No feature flags or compatibility shims.
- Determinism: seed `random`, `numpy`, `torch`; log the seed. Timing code uses `time.perf_counter` and `torch.cuda.synchronize()` before reading the clock on GPU.
- Preprocessing must match training. The Preprocessing module letterboxes to 640x640 (aspect preserved) and does not normalise pixel values manually; the detector receives what Ultralytics expects. Boxes are mapped back to original-frame coordinates before tracking (decision D-07).
- Prefer editing existing files to creating new ones. Scripts in `scripts/` are thin CLIs over `src/trafficwatch/`.

---

## 6. Weights contract (how the trained model is added later)

```
weights/<RUN_ID>/best.pt
weights/<RUN_ID>/model_card.json   # run_id, base_model, class_names, imgsz, seed, epochs, data_manifest_hash,
                                   # ultralytics/torch versions, git_sha, hardware, val metrics, date
weights/<RUN_ID>/results.csv, args.yaml, curves (PNG)
```

- Active model is selected by `detector.weights` in `configs/pipeline.yaml` or env `TW_WEIGHTS`.
- At load, the pipeline compares `model_card.json` class names, `imgsz`, and `ultralytics` version with config and refuses to start on a mismatch.
- `weights/` content is git-ignored. Only `weights/README.md` is tracked. Weights are shared through Drive, never the repo.
- Integration checklist (copy into the run log when weights land): card present, class map verified, smoke clip processed, val metrics reproduced locally within tolerance, latency measured on the target machine, run ID recorded in `docs/logs/IMPLEMENTATION_RUN_LOG.md`.

---

## 7. Colab rules (training happens there, not in this workspace)

- This workspace **prepares** notebooks and scripts; the author **runs** them on Colab and pastes back `run_summary.json`, `results.csv`, and screenshots. Do not claim a run happened until those are logged.
- Runbook: `docs/04_COLAB_TRAINING.md`. Data is staged as a single `.tar` on Drive and extracted to `/content` (never train from many small Drive files).
- Checkpoint to Drive (`save_period`), always resumable (`resume=True`). Assume the session dies.
- Secrets (Kaggle, Roboflow, Hugging Face, GitHub) only through Colab Secrets (`google.colab.userdata`). Never paste a token into a cell, never print one, never put one in a clone URL that is echoed. Scan notebook outputs before committing.
- Notebooks are committed with outputs cleared. Evidence screenshots go to `docs/evidence/` with the figure ID in the filename.
- Pin versions in `requirements.lock` (from the Colab `pip freeze` of the run that produced the reported weights). Unpinned installs are for smoke tests only.

---

## 8. Security, data, and licence handling

- Never read, write, or echo `.env`. Use `.env.example` to name variables and tell the author which to set. Placeholders in tracked files must not work if left unchanged (`changeme-set-your-own`).
- Never log or commit tokens, Drive links that grant write access, or personal data.
- Datasets are never committed or redistributed. Record source, DOI or URL, licence, retrieval date, and SHA-256 of each archive in `data/MANIFEST.json` (the manifest is tracked, the data is not).
- CCTV frames can contain faces and plates. Do not attempt plate or face recognition. Thesis figures use the published benchmark footage under its citation; no other footage is added.
- Ultralytics YOLOv8 is AGPL-3.0. The repo stays private; check licence implications before any public release of code or weights.
- Code comments and docs state technical rationale only. No narrative about past incidents or exploitable gaps.
- Startup validation: refuse to start if weights, class map, config, or input video are invalid.

---

## 9. Git

- Never commit unless asked. Never amend a published commit. Never force-push `main`. Never `--no-verify`. Never push unless told.
- Stage files by name. Never `git add -A` or `git add .`.
- Format: `type(scope): short description`, present tense, no period. **No `Co-Authored-By` trailer, ever.**
- Branches: `phase/<n>-<slug>` per phase, merged to `main` at gate pass.
- Large binaries (`*.pt`, `*.zip`, `*.mp4`, datasets) are ignored.

---

## 10. Documentation rules

- **No em dashes anywhere** (code, docs, commits, prompts). Use a comma, colon, period, or hyphen.
- Chapters 4 to 6 of the final report are written in the **past tense**; the proposal chapters were written in the future tense and must not be pasted in unchanged.
- Final Word/PDF documents: Times New Roman 12, 1.5 spacing, justified body, centred bold chapter headings, page numbers bottom centre, APA 7th, table captions above and figure captions below, numbering by chapter (Table 5.3, Figure 4.2), cover page unnumbered, roman numerals from the declaration page, arabic numerals from Chapter 1.
- Markdown in this repo is the working source. Keep the as-executed logs (`docs/logs/`) current: commands run, outputs, before/after, findings.
- Capture screenshot evidence as work happens, not at the end (list in `docs/06_DOCUMENTATION_PLAN.md`).
- Diagram sources (Mermaid or PlantUML) live in `docs/diagrams/`, exports in `docs/evidence/`. Diagram rigor follows the UML checklist in `docs/06_DOCUMENTATION_PLAN.md`.

---

## 11. Review checklist (use for any diff or PR; write to `pr_review_<branch>.md`)

Confirm `git check-ignore -v pr_review_<branch>.md` first (`pr_*.md` is ignored here). Sections, in order, none skipped:

1. **Security and licence:** secrets, tokens, dataset or weight files staged, licence notes, comments leaking incident detail.
2. **Data integrity:** sequence-level splits, no test leakage, ignored regions honoured, class map versioned, manifest updated.
3. **Reproducibility:** seed, versions, config hash, run logged, manifest present.
4. **Metric correctness:** definitions match `docs/05`, IoU and conf thresholds stated, warm-up excluded from latency, stand-in weights not in final tables.
5. **Behaviour logic:** thresholds from config, hand-computed white-box cases exist, queue and congestion suppression tested.
6. **Conventions and tests:** module boundaries, typing, no dead code, unit and integration tests for the change.
7. **Docs and evidence:** logs updated, figure and table IDs consistent, tense and formatting rules.

Verdict: `APPROVE`, `REQUEST CHANGES`, or `NEEDS DISCUSSION`, one-sentence rationale.

---

## 12. Definition of done (per phase)

A phase is done only when its gate in `docs/01_MASTER_PLAN.md` passes: code merged with tests green, logs updated, evidence captured, decisions recorded, and the author has confirmed any sign-off items. State plainly what passed and what was skipped.

---

## 13. Never

- Never invent dataset facts, URLs, licence terms, or metric values. If unverified, write `VERIFY` and say what to check.
- Never report Colab results that were not pasted back.
- Never tune on the test split, or edit ground truth to improve a score.
- Never train or evaluate on frames from the same sequence across splits.
- Never let a stand-in or smoke-test number leak into a results table.
- Never widen scope, change a metric definition, or replace a tool named in the proposal without a logged decision.
