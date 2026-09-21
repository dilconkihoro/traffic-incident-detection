# 00. Project context (digest of the proposal)

Source of truth: `reference/proposal.md` (text copy) and `reference/Proposal_Draft__Kihoro_Dilcon.docx` (original). Section numbers below refer to the proposal. Where this digest and the proposal disagree, the proposal wins unless a decision in `07_DECISIONS_RISKS.md` says otherwise.

## 1. Identity

| Item | Value |
|---|---|
| Title | An Automated Traffic Incident Detection System using YOLOv8 and CCTV Video Data |
| Author | Kihoro, Dilcon Kuria, BBIT 4D |
| Supervisor | Mr. Titus Tunduny |
| Institution | School of Computing and Engineering Sciences, Strathmore University, Nairobi |
| Degree | Bachelor of Business in Information Technology |
| Proposal date | June 2026 |
| Design paradigm | OOAD |
| Development methodology | Rapid Prototyping (5 stages, section 3.2) |
| Domain of execution | Desktop, local, offline video files (section 3.7) |

## 2. Problem, aim, objectives

**Problem (1.2).** Kenyan CCTV is monitored manually; one operator cannot watch many feeds, response lags, and existing automated work is mostly dashcam, drone, or high-income-country data, not fixed overhead CCTV. Kenya recorded 11,173 road traffic accidents in 2024 (KNBS), up 11.8 percent on 2023.

**General objective (1.3.1).** Develop an automated traffic incident detection system using YOLOv8 and CCTV video data.

| # | Specific objective (1.3.2) | Answered by | Phase |
|---|---|---|---|
| i | Analyse characteristics and detection challenges of incidents in fixed-camera CCTV | Chapter 2 (done), EDA insights (P1) | 1 |
| ii | Evaluate datasets, detectors, trackers for suitability | EDA, T0 to T3 comparison, tracker check | 1, 3 |
| iii | Design the detect-track-flag pipeline | Chapter 4, `02_ARCHITECTURE_AND_RULES.md` | 0, 2 |
| iv | Develop the prototype (Python, OpenCV, PyTorch, YOLOv8) | `src/trafficwatch/`, Colab-trained weights | 2, 3, 4 |
| v | Evaluate with precision, recall, mAP, false-alarm rate, latency | `05_EVALUATION_AND_TESTING.md`, Chapter 5 | 5 |

Research questions (1.4) mirror the objectives one to one; Chapter 6 must answer each explicitly.

## 3. Scope (1.6, 3.7)

In: pre-recorded fixed-camera video; vehicle detection, tracking, rule-based flagging of three incident types (abrupt stop, prolonged lane obstruction, collision-like convergence); time-stamped incident log; five-metric evaluation; YOLOv8n and YOLOv8s; UA-DETRAC plus DhakaAI; desktop execution.

Out: plates, drivers, pedestrians, emergency notification, live or multi-stream input, deployment, REST or containers, purpose-collected Kenyan footage.

## 4. Pipeline (2.6, 3.8)

Seven modules, run in sequence; Evaluation runs separately.

| # | Module | Input | Output |
|---|---|---|---|
| 1 | Video Ingestion | video file, fps setting | frames (NumPy) |
| 2 | Preprocessing | frame | 640x640 frame, optional low-light enhancement |
| 3 | YOLOv8 Detection | frame | boxes, class, confidence (below threshold dropped) |
| 4 | DeepSORT Tracking | detections | track IDs, trajectory records |
| 5 | Behaviour Analysis | trajectories | incident flags (3 rules) |
| 6 | Incident Log | flags | CSV: timestamp, incident type, more (see doc 02) |
| 7 | Evaluation | outputs plus ground truth | five metrics, performance report |

Final outputs (2.6): time-stamped incident alerts, annotated video, structured incident log, performance report.

## 5. Data (2.5.5)

| Dataset | What the proposal says | Use |
|---|---|---|
| UA-DETRAC (Wen et al., 2020) | 100 sequences, over 140,000 annotated frames, over 1.21 million boxes; Beijing and Tianjin | Primary train, val, and test; detector, tracker, and incident evaluation |
| DhakaAI (Shihavuddin and Rashid, 2020) | Dense mixed urban traffic, Dhaka; DOI 10.7910/DVN/POREXF | Training diversity; cross-domain evaluation. VERIFY whether it is images only (likely) before promising "sequences" |

Full facts to verify at acquisition, conversion rules, splits: `03_DATA_PIPELINE.md`.

## 6. Tools (3.5)

Python 3.10, YOLOv8 (Ultralytics), DeepSORT, OpenCV 4.x, PyTorch 2.x, NumPy, pandas, Matplotlib, Seaborn, Roboflow (annotation conversion and augmentation; see D-05), VS Code, Jupyter, Git/GitHub (private). Testing: pytest.

## 7. Evaluation (1.3.2 v, 3.6)

Five metrics: precision, recall, mAP (mAP50 and mAP50:95), false-alarm rate, detection latency. Precision and recall at IoU 0.5. Latency: mean time from frame ingestion to incident flag over 1,000 representative frames. FAR: incorrectly flagged non-incident events over evaluated sequences. Exact operational definitions and the incident ground-truth strategy: `05_EVALUATION_AND_TESTING.md`.

## 8. Declared limitations (1.7) to carry into Chapters 5 and 6

Dataset domain gap (China and Bangladesh, not Kenya); scarce incident data (hence rules, not a classifier); offline latency optimistic versus live; limited compute (hence n and s variants, transfer learning); rule-based false alarms (for example a car stopping at a crossing). Add: training was done on Colab, not lab machines (hardware deviation, D-02).

## 9. Literature anchors (reuse, do not re-derive)

| Claim | Source in proposal |
|---|---|
| Incidents are long-tailed and heterogeneous | Fang et al. (2023, 2024) |
| Day-night domain shift hurts detectors | Yang et al. (2026) |
| YOLOv8 anchor-free, real-time | Jocher et al. (2022); Le et al. (2025) |
| DeepSORT = Kalman plus appearance descriptor | Wojke et al. (2017) |
| YOLOv8 plus DeepSORT best of three on a drone dataset | Gandhi et al. (2025) |
| StrongSORT heavier, not chosen | Du et al. (2023) |
| Integrated systems lack open, reproducible rules and latency reporting | Bartolome-Hornillos et al. (2024), Tahir et al. (2023), Pramanik et al. (2021) |
| UA-DETRAC protocol | Wen et al. (2020) |
| Prototyping methodology | Sommerville (2016); Pressman and Maxim (2020) |

Full reference list: bottom of `reference/proposal.md`. Known reference defects are tracked as P-04 in `07_DECISIONS_RISKS.md`.

## 10. What is left to produce

Chapter 4 (analysis and design), Chapter 5 (implementation and testing), Chapter 6 (conclusions), a corrected Appendix 1 Gantt, the working prototype, the trained model (Colab), the evaluation report, and the demonstration. Plan: `01_MASTER_PLAN.md`; documentation map: `06_DOCUMENTATION_PLAN.md`.
