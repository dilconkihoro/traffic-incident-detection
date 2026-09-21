# 04. Colab training runbook

Training runs on Google Colab (free T4 class GPU); the trained model is added to this repo later. This workspace prepares the dataset tar, the notebook, and the logging; the author runs the notebook and pastes results back. Flow: setup, data, train, compare, export, log.

## 1. Why Colab, and the deviation to disclose

Proposal 1.6 says the project runs on regular lab computers. Training YOLOv8 on roughly 28,000 frames is impractical there, so training moves to Colab (D-02). Chapter 5.2.1 must list both machines (Colab GPU string from `nvidia-smi`, lab machine specs) and say that inference and latency are also measured on the lab machine, because the proposal's desktop domain of execution still holds for the running system.

## 2. Preconditions

| Item | Check |
|---|---|
| Dataset tar `yolo_ds_vN.tar` on Drive under `tid/data/` with SHA-256 in `data/MANIFEST.json` | Gate G1 passed |
| Smoke test on Colab: 1 epoch on about 200 images, proves the data path and `data.yaml` (D-21: no training of any size runs on the local machine) | Passed |
| Drive free space | At least 3 times the tar size plus runs |
| Colab runtime | GPU enabled (Runtime, Change runtime type, T4 or better) |
| Secrets (only if the notebook downloads anything) | Stored in Colab Secrets, never in cells |

## 3. Drive layout

```
MyDrive/tid/
  data/yolo_ds_v1.tar, yolo_ds_v1.sha256
  code/trafficwatch.zip           (optional: repo snapshot instead of a git clone)
  runs/<RUN_ID>/                  (Ultralytics project dir: weights/, results.csv, args.yaml, plots)
  export/<RUN_ID>.zip             (best.pt, model_card.json, results.csv, args.yaml, curves)
```

## 4. Run matrix

| Run ID | Model | Training data | imgsz | Epochs | Purpose |
|---|---|---|---|---|---|
| T0 | yolov8n COCO, no training | none | 640 | 0 | Zero-shot baseline ("before"), stand-in class map |
| T1 | yolov8n | UA-DETRAC (stride 5) | 640 | 30 | Pipeline and baseline check, cheap |
| T2 | yolov8s | UA-DETRAC (stride 5) | 640 | 50 | In-domain main run |
| T3 | yolov8s | UA-DETRAC plus DhakaAI | 640 | 50 | Tests the proposal's diversity claim; evaluate on `val` and `dhaka_val` |
| T4 (optional) | best of T2 or T3 | same | 960 | 40 | Small and distant vehicles; only if T2 or T3 shows a small-object weakness |

Naming: `T<n>_<model>_<data>_s<stride>_e<epochs>_seed<k>`, for example `T2_y8s_detrac_s5_e50_seed0`.

Selection rule: choose on **validation** mAP50:95 first, then recall at the operating confidence, then latency. Report the T2 versus T3 comparison on both `val` and `dhaka_val`: it is the direct evidence for or against the domain-gap argument in Chapter 2.4. If quota allows, repeat the headline run with a second seed and report both; otherwise state single-seed in Chapter 5.

Hyperparameters that stay at Ultralytics defaults unless a run log entry justifies a change: optimiser and learning-rate schedule, mosaic (default closes near the end), HSV augmentation, flips. Any change is logged with the reason and the metric it targeted.

## 4a. Self-contained notebook requirement (author decision D-22, 2026-09-22)

`notebooks/colab_train.ipynb` must run top to bottom on a blank Colab runtime with no manual step outside Colab, Drive and Colab Secrets. It carries the full step-by-step narration, in this order: hardware and versions; code fetch; requirements install; Drive mount and paths; data staging and hash check; seed and train; resume after disconnect; validate on `val` only; model card and export; evidence checklist. Rules:

- **Requirements:** the first run installs from a pinned `requirements-colab.txt` (Colab keeps its preinstalled torch; the file pins `ultralytics` and the other extras to the versions used locally). The `pip freeze` of the run that produces the reported weights becomes `requirements.lock` (CLAUDE.md section 7).
- **Code fetch:** clone `https://github.com/dilconkihoro/traffic-incident-detection.git` using a token read from Colab Secrets (`google.colab.userdata`), passed through a credential helper so it is never echoed or embedded in a printed URL. Fallback for a private repo without a token: the `code/trafficwatch.zip` snapshot on Drive.
- **No local dependency:** nothing in the notebook reads from the local machine. The dataset arrives as the single tar on Drive.
- **Fails loudly:** each cell checks its precondition (GPU present, hash matches, class names equal `data.yaml`) and stops with a plain message.
- **Outputs cleared** before commit; the notebook is generated in Phase 3, not before.

## 5. Notebook structure (`notebooks/colab_train.ipynb`, to be generated and committed with outputs cleared)

Each section starts with a markdown cell stating what it does and which artifact it produces (this becomes Chapter 5.4.1 narrative). Code comments follow the repo rule (why only).

**Cell 1: hardware and versions**

```python
import subprocess, sys, platform
print(subprocess.run(["nvidia-smi"], capture_output=True, text=True).stdout)
print(sys.version)
print(platform.platform())
```

**Cell 2: install (pinned)**

```python
%pip install -q -r requirements.lock
import ultralytics, torch
print(ultralytics.__version__, torch.__version__, torch.cuda.is_available())
```

**Cell 3: Drive and paths**

```python
from google.colab import drive
drive.mount("/content/drive")
DRIVE = "/content/drive/MyDrive/tid"
RUN_ID = "T2_y8s_detrac_s5_e50_seed0"
```

**Cell 4: stage and verify data** (single tar, local disk, hash check; the `.sha256` file holds `<hash>  yolo_ds_v1.tar` with a relative name)

```python
!mkdir -p /content/data
!cd {DRIVE}/data && sha256sum -c yolo_ds_v1.sha256
!tar -xf {DRIVE}/data/yolo_ds_v1.tar -C /content/data
!sed -i 's#^path:.*#path: /content/data/yolo_ds_v1#' /content/data/yolo_ds_v1/data.yaml
```

**Cell 5: seed and train**

```python
from ultralytics import YOLO
model = YOLO("yolov8s.pt")
model.train(
    data="/content/data/yolo_ds_v1/data.yaml",
    epochs=50, imgsz=640, batch=16, seed=0, deterministic=True,
    patience=15, save_period=5, workers=2, amp=True, plots=True,
    project=f"{DRIVE}/runs", name=RUN_ID, exist_ok=False,
)
```

Before committing to 50 epochs, watch epoch 1 and 2 and extrapolate the time. Expect the order of a few hours for about 20,000 to 28,000 images at 640; measure, do not assume.

**Cell 6: resume after a disconnect**

```python
from ultralytics import YOLO
YOLO(f"{DRIVE}/runs/{RUN_ID}/weights/last.pt").train(resume=True)
```

**Cell 7: validate on validation splits only**

```python
best = YOLO(f"{DRIVE}/runs/{RUN_ID}/weights/best.pt")
m_val = best.val(data="/content/data/yolo_ds_v1/data.yaml", split="val", imgsz=640, conf=0.001, iou=0.6, plots=True)
print(m_val.box.map50, m_val.box.map, m_val.box.mp, m_val.box.mr)
```

The test split is **not** evaluated in the notebook. It is evaluated once, locally, with the frozen pipeline (Phase 5, TEST_ACCESS_LOG).

**Cell 8: model card, summary, export**

```python
import json, torch, ultralytics, datetime, shutil, pathlib
run_dir = pathlib.Path(f"{DRIVE}/runs/{RUN_ID}")
card = {
    "run_id": RUN_ID,
    "base_model": "yolov8s.pt",
    "class_names": list(best.names.values()),
    "imgsz": 640,
    "seed": 0,
    "epochs_planned": 50,
    "data_tar_sha256": open(f"{DRIVE}/data/yolo_ds_v1.sha256").read().split()[0],
    "ultralytics": ultralytics.__version__,
    "torch": torch.__version__,
    "gpu": torch.cuda.get_device_name(0),
    "val": {"map50": float(m_val.box.map50), "map50_95": float(m_val.box.map),
            "precision": float(m_val.box.mp), "recall": float(m_val.box.mr)},
    "date": datetime.date.today().isoformat(),
}
(run_dir / "model_card.json").write_text(json.dumps(card, indent=2))
pathlib.Path(f"{DRIVE}/export").mkdir(exist_ok=True)
shutil.make_archive(f"{DRIVE}/export/{RUN_ID}", "zip", run_dir)
```

`git_sha` is added to the card locally when the code snapshot is known. Paste `model_card.json` and `results.csv` back into the dev workspace; download the zip from Drive into `weights/<RUN_ID>/`.

## 6. Session hygiene

| Risk | Rule |
|---|---|
| Free-tier disconnects, idle timeouts, variable GPU availability | Save every 5 epochs to Drive, always resumable, chunk work into sessions of about 3 to 4 hours |
| Slow training from Drive I/O | Extract the tar to `/content` first; never read images from Drive |
| Different GPU each session | Record `nvidia-smi` output in every run; latency numbers from Colab are labelled with the GPU |
| Version drift | Pin in `requirements.lock`; log versions in the model card |
| Token leakage | Colab Secrets only; clear outputs before commit; scan for `hf_`, `ghp_`, `kaggle`, `roboflow` strings |
| Two seeds worth of quota not available | State single-seed honestly in Chapter 5 |
| Test-set peeking | The notebook never touches `split="test"` |

## 7. Evidence to capture (for Chapter 5.4.1)

Screenshots (filename prefix is the figure ID reserved in doc 06): `nvidia-smi` cell; install and version cell; data staging and hash check; first-epoch training log; final training summary; `results.png` (loss and metric curves); PR curve; confusion matrix; a validation batch with predictions; the export cell.

## 8. Run log entry (append to `docs/logs/TRAINING_RUN_LOG.md` after every run)

Use the template in that file. Minimum: run ID, date, purpose, data tar hash and split counts, model, hyperparameters, seed, command or notebook cell, hardware, wall time, best epoch, val metrics, artifact path, verdict, next action.

## 9. Integration checklist (when weights land in `weights/<RUN_ID>/`)

- [ ] `model_card.json` present; class names equal config and `data.yaml`
- [ ] `best.pt` SHA-256 recorded in the run log
- [ ] Smoke clip runs end to end; boxes are sane; class names correct
- [ ] Val metrics re-computed locally match the card within tolerance (state the tolerance)
- [ ] Latency measured on the lab machine (CPU and GPU if present) with `bench`
- [ ] `detector.weights` and `weights_kind: trained` set in config; commit the config change
- [ ] Entry added to `docs/logs/IMPLEMENTATION_RUN_LOG.md`

## 10. If Colab is not enough

Fallback order: reduce epochs and rely on transfer learning; increase frame stride to 8 or 10; drop T4; use Colab Pro or Kaggle Notebooks GPU for a single main run. Log the compromise; do not hide it.
