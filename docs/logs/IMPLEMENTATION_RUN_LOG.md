# Implementation run log (as executed)

Commands run, outputs, integration events, in order. This is the raw material for Chapter 5.2 and 5.4. Never paste secrets or tokens.

## Template

```
## <date> <phase> <short title>
- Command(s):
- Output (trimmed):
- Result and any deviation from plan:
- Files changed:
- Evidence captured (figure IDs):
```

## Entries

## 2026-09-22 Phase 0 Foundation (session 1)
- Environment (measured): Ubuntu 24.04, AMD Ryzen 5 7530U (12 threads), 14 GiB RAM, no GPU, 420 GB free. Python 3.10 was absent; the author ran `sudo apt install -y python3.10 python3.10-venv` (deadsnakes, 3.10.20). Other-project venv on PATH is never used; all commands use `.venv/bin/python`.
- Command(s): scratch venv, unpinned install (torch CPU from the PyTorch CPU index, rest from PyPI), `pip freeze` to `requirements.txt`, fresh `.venv` from the pins, `pip install -e . --no-deps`, then `pip check`, `ruff check`, `ruff format --check`, `pytest -m "not target"`, `pytest -m target`, `scripts/acquire_datasets.py check --strict`.
- Output (trimmed): `pip check`: No broken requirements found. `ruff`: All checks passed, 34 files formatted. `pytest -m "not target"`: 208 passed. `pytest -m target`: 41 failed, all `NotImplementedError: Phase 2`. Import guard: torch, ultralytics, cv2 not loaded by importing trafficwatch. Manifest check: 0 archives, exit 0. Pins: torch 2.14.0+cpu, ultralytics 8.4.158, opencv-python 4.14.0.94, numpy 2.2.6, pandas 2.3.3, deep-sort-realtime 1.3.2, motmetrics 1.4.0.
- Result and deviations from plan: (1) PyPI package is `motmetrics`, not `py-motmetrics`. (2) The resolver chose opencv-python 5.0; pinned `<5` to stay on OpenCV 4.x as the proposal states. (3) ultralytics 8.4 pulls polars. (4) Importing ultralytics created `~/.config/Ultralytics/settings.json`. (5) Network to the PyPI file host stalled repeatedly; installs were retried in chunks. (6) D-21: no training of any size runs locally, so the 200-image smoke epoch moved to Colab (docs 04 and kickoff prompt updated). (7) Target tests assert exact flag frames for the abrupt-stop and lane-obstruction positives and boundaries; collision tests assert flag or no flag. Fencepost-sensitive boundaries (heading 45 versus 44 degrees, post window 1.5 versus 1.6 s, `rearm_s` at exactly 5 s) are left to Phase 2 helper-level tests (doc 02 section 5.5). (8) Built ahead of Phase 1, network-independent and data-free: `data/split.py`, `data/package.py`, `data/yolo.py`, `data/config.py`, `configs/data.yaml`. No dataset was touched.
- Files changed: pyproject.toml, requirements.txt, configs/pipeline.yaml, configs/data.yaml, src/trafficwatch/ (types, config, ingestion, preprocessing, detection, tracking, incident_log, behaviour/, data/), scripts/acquire_datasets.py, tests/ (helpers, package, config, manifest, hygiene, split, yolo_and_package, data_config, three rule files), README.md, docs 02, 03, 04, 07, EXPERT_KICKOFF_PROMPT.
- Evidence captured (figure IDs): none (terminal output only; screenshots not taken).

## 2026-09-22 Git isolation and hardware decision (session 1, addendum)
- Command(s): inspected `.git` (no remotes, no commits, no hooks, no local config; global identity is a different account with `credential.helper cache`). `git remote add origin https://github.com/dilconkihoro/traffic-incident-detection.git`; repo-local `credential.helper` reset to empty, `credential.useHttpPath true`, `credential.username dilconkihoro`, `user.useConfigOnly true`; added `.git/hooks/pre-commit` guard (untracked, local); `.gitignore` now ignores only `docs/reference/` instead of all of `docs/`.
- Output (trimmed): `git remote -v` shows only the new URL for fetch and push; `git ls-files --others --exclude-standard` lists 57 small files, none of `.env`, `.venv`, `data/raw`, `weights`, `docs/reference`, `pr_*.md`.
- Result and any deviation from plan: no commit and no push made. Repo-local `user.name` and `user.email` are still unset by design, so the pre-commit guard blocks any commit until the author supplies them. D-20 and D-22 recorded; open question 3 closed; doc 04 gains the self-contained Colab notebook requirement (section 4a).
- Files changed: .gitignore, docs/04, docs/05, docs/07, this log.
- Evidence captured (figure IDs): none.

## 2026-09-22 Phase 2 Pipeline P0, stand-in mode (session 1, partial gate G2)
- Command(s): implemented packages A to G from the approved plan (rules, config additions, store and analyzer, ingestion and preprocessing, detector, tracker, loggers, pipeline, CLI). `.venv/bin/ruff check . && .venv/bin/ruff format --check .`; `.venv/bin/python -m pytest -q`; `.venv/bin/python -m pytest -m target -q`; `.venv/bin/python scripts/fetch_standin_weights.py`; `.venv/bin/python -m pytest -m standin -q`; `.venv/bin/python -m trafficwatch run <synthetic.mp4> --standin`; the same without `--standin` and with `--standin --final`.
- Output (trimmed): ruff clean, 47 files. `pytest`: **360 passed** (of which the 41 white-box target tests now pass with no edits to them, and 2 are real-model `standin` tests). Import guard: importing trafficwatch, behaviour, config, detection, tracking loads no torch, ultralytics or cv2. Stand-in weights: `weights/coco_standin/yolov8n.pt`, source Ultralytics assets release v8.4.0 via the package downloader, sha256 `f59b3d833e2ff32e194b5bb8e08d211dc7c5bdf144b90d2c8412c47ccfc83b36` (git-ignored). CLI on a synthetic 51-frame clip with the real stand-in model: 51 frames, 0 incidents (textured rectangles are not COCO vehicles), outputs written, manifest `weights_kind: coco_standin`. Without `--standin`: `weights contract violated` (CHANGEME weights). With `--standin --final`: `coco_standin weights are not allowed in a final run`. Both exit 2.
- Result and any deviation from plan: (1) Real DeepSORT (Kalman-filtered boxes, MobileNet embedder) plus the rules flagged the synthetic abrupt stop on track 1 at frame 39, the same frame as the hand computation, so no interpolation or box-source change was needed. (2) `ruff format .` reformatted Python code blocks inside `docs/04` once `docs/` became tracked; the file was restored from `HEAD` and `docs` is now excluded from ruff in `pyproject.toml`. (3) Small test-side fixes with reasons: my own kinematics test miscounted samples (`hold(8)` gives 9), and the Phase 0 construction test was rewritten because the detector now correctly refuses the shipped CHANGEME weights. No target test was edited. (4) `BehaviourAnalyzer.step` gained `frame_idx` and the constructor gained `period_s`; `tracks.csv` has no `conf` column because the tracker exposes none; `Prepared` gained `original_wh` and `to_original`. All recorded in docs/02. (5) `preprocess.clahe_clip_limit`, `clahe_tile_grid`, `detector.standin_class_map` and an `output` block were added to `configs/pipeline.yaml` and the validator. (6) The 15.8 FPS printed by the CLI is a synthetic-clip smoke figure on CPU with no vehicles to detect; it is not a result and is not for any table.
- **G2 items still pending:** video in and `incidents.csv` plus annotated video out on 3 real validation sequences (needs Phase 1 data), and the T0 zero-shot baseline (needs the Phase 1 val split and the Phase 5 evaluation harness).
- Files changed: src/trafficwatch/ (behaviour/kinematics.py, behaviour/rules.py, behaviour/analyzer.py, config.py, types.py, ingestion.py, preprocessing.py, detection.py, tracking.py, incident_log.py, run_manifest.py, pipeline.py, cli.py, __main__.py), scripts/fetch_standin_weights.py, configs/pipeline.yaml, pyproject.toml, tests/ (synth.py, test_kinematics.py, test_analyzer.py, test_ingestion_preprocessing.py, test_detection.py, test_tracking.py, test_pipeline.py, plus edits to test_config.py and test_package.py), README.md, docs 01, 02, 07, EXPERT_KICKOFF_PROMPT.
- Evidence captured (figure IDs): none (terminal output only).

