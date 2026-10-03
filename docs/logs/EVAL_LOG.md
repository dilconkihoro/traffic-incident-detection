# Evaluation log

Before and after tables, findings, and comparisons across runs. Definitions: `../05_EVALUATION_AND_TESTING.md`. Only trained-weights runs enter result tables; stand-in runs are labelled and used for the T0 baseline only.

Hardware for every latency number is the author's own development machine, CPU only, no GPU (D-22). The exact machine string is recorded in each run's `latency.json` and `run_manifest.json` under `reports/`, which is git-ignored.

## Comparison table (fill after each evaluation)

| Run | Split | Weights kind | P | R | mAP50 | mAP50:95 | FAR per hour | FAR per sequence | Mean ms per frame | FPS | Hardware | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T0 detector | val (2,572 images, 10 sequences) | coco_standin | 0.939 | 0.761 | 0.377 | 0.223 | not measured (incident level, Phase 5) | not measured | n/a | n/a | author's machine, CPU only | Zero-shot baseline at conf 0.35, run `20261002T202404Z_eval_t0_coco_standin` |
| T0 detector | dhaka_val (300 images) | coco_standin | 0.678 | 0.519 | 0.323 | 0.215 | not measured | not measured | n/a | n/a | author's machine, CPU only | Cross-domain check, same run |
| T0 pipeline latency | MVI_40161 clip, 1,490 frames (1,440 measured after 50 warm-up) | coco_standin | n/a | n/a | n/a | n/a | not measured | not measured | 498.6 (p50 492.2, p95 645.5) | 2.0 | author's machine, CPU only | Full pipeline, run `20261003T091505Z_coco_standin_latency_MVI_40161`, source 25 fps |

## Per-class detector results, T0 zero-shot (run `20261002T202404Z_eval_t0_coco_standin`)

Precision and recall at conf 0.35, IoU 0.5. AP is the COCO-style 101-point interpolated AP at IoU 0.5 (this project's own implementation, `src/trafficwatch/evaluation.py`, not the official DETRAC toolkit).

| Split | Class | GT boxes | AP50 | P at conf 0.35 | R at conf 0.35 |
|---|---|---|---|---|---|
| val | car | 13,652 | 0.786 | 0.853 | 0.759 |
| val | van | 1,561 | 0.000 | 1.000 (no predictions; code convention) | 0.000 |
| val | bus | 798 | 0.684 | 0.796 | 0.662 |
| val | other | 58 | 0.040 | 0.078 | 0.276 |
| dhaka_val | car | 557 | 0.540 | 0.558 | 0.614 |
| dhaka_val | van | 150 | 0.000 | 1.000 (no predictions; code convention) | 0.000 |
| dhaka_val | bus | 283 | 0.406 | 0.647 | 0.343 |
| dhaka_val | other | 270 | 0.346 | 0.438 | 0.326 |

## Stratified by UA-DETRAC weather (val, T0 at conf 0.35)

| Weather | Images | P | R |
|---|---|---|---|
| sunny | 290 | 0.946 | 0.819 |
| night | 915 | 0.944 | 0.775 |
| cloudy | 797 | 0.928 | 0.756 |
| rainy | 570 | 0.968 | 0.714 |

Figures: `docs/evidence/F5.6_pr_curve_t0.png` (per-class precision-recall curves, val and dhaka_val), `docs/evidence/F5.13_precision_recall_per_weather.png`, and the latency breakdown `docs/evidence/F5.11_latency_per_stage.png`.

## Findings

1. **Van scores zero by construction, not by a fault in the matching.** COCO has no van class, so the stand-in cannot emit one; vans are detected as cars and counted as false positives for `car` and misses for `van`. The per-class zero is therefore a property of the zero-shot baseline. The headline mAP50 averages over all present classes as docs/05 defines it, so it carries this zero. I am not redefining the metric to remove it. The trained models (T1 onward), fine-tuned on `yolo_ds_v1`'s four classes, are the ones that can learn `van`.
2. **`other` is weak on both splits.** `other` in the unified taxonomy is fed only by COCO truck (id 7), and UA-DETRAC's `others` class is a different population. Val precision for `other` is 0.078 with 188 false positives.
3. **Cross-domain drop on DhakaAI.** Recall falls from 0.761 (val) to 0.519 (dhaka_val) and precision from 0.939 to 0.678. This is the expected gap for a COCO detector on a different camera and traffic mix, and it is the baseline the fine-tuned models have to beat.
4. **Recall is lowest in rain (0.714) and highest in sunny (0.819).** Precision is stable across weather (0.928 to 0.968), so the errors are missed vehicles rather than spurious ones.
5. **Tracking, not detection, dominates frame time.** On the 1,440 measured frames: detection 164 ms mean, tracking 326 ms mean, ingestion 2 ms, preprocessing 1 ms, behaviour 5 ms. DeepSORT with its MobileNet embedder on CPU is about two-thirds of the per-frame cost. This is the first candidate for optimisation before any real-time claim.
6. **The latency clip produced 4 ABRUPT_STOP incidents from untuned, stand-in thresholds.** These are not evaluated against ground truth and are not evidence of detection quality. Tier A and Tier B evaluation (docs/05 section 1) is the place to measure rule quality.
7. **Reproducibility caveat.** The T0 detector run recorded `git_dirty: true`, because it ran with uncommitted changes to the evaluation module. The numbers are reproducible from the recorded config hash and weights SHA, but a clean-checkout re-run is required before any of these numbers goes into a chapter table.
