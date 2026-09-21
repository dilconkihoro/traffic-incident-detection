# 06. Documentation plan (Chapters 4 to 6, diagrams, evidence)

Derived from the faculty guides in `reference/faculty/`. The proposal covered Chapters 1 to 3; this plan covers what remains. Working source is Markdown; the submission is Word.

## 1. Formatting and writing rules (faculty plus global)

| Rule | Value |
|---|---|
| Font, size | Times New Roman, 12 (headings, page numbers, and table of contents included) |
| Line spacing | 1.5 throughout, including the table of contents |
| Body | Justified; margins Normal |
| Chapters | Centred, bold, labelled "Chapter 4:" etc.; sub-chapters bold, numbered 4.1, 4.2 |
| Page numbers | Bottom centre; cover unnumbered; roman numerals from the declaration page; arabic from Chapter 1 |
| Captions | Tables: caption above. Figures: caption below. Numbered by chapter (Table 5.3, Figure 4.2) |
| Referencing | APA 7th |
| Tense | Chapters 4 to 6 in past or past participle. Do not paste future-tense proposal text |
| Dashes | No em dashes anywhere |
| Chapter 6 | One page maximum |

## 2. Chapter 4: System Analysis and Design (Lec 6)

| Section | Content | Repo source |
|---|---|---|
| 4.1 Introduction | What the chapter covers, list of diagrams | this plan |
| 4.2 System requirements (listing format) | 4.2.1 functional: video ingestion, detection, tracking, three incident rules, incident log, evaluation. 4.2.2 non-functional: accuracy, false-alarm control, latency, reproducibility, maintainability, data handling. Each item: what it is and how it was achieved | `00`, `02`, `05` |
| 4.3 Analysis diagrams | Use case; sequence; system sequence (optional); activity (behaviour decision logic) | `docs/diagrams/` |
| 4.4 Design diagrams | Class; ERD (track records and incident log entries); logical schema for the CSV files; system architecture | `02` |

The proposal lists: use case, sequence, system sequence, activity, class, ERD, system architecture. Produce all seven. Tools per faculty: StarUML for class and schema, Visual Paradigm for the others; Mermaid or PlantUML sources are kept in `docs/diagrams/` and exported to `docs/evidence/`.

**Diagram rigor checklist:** use case with stick-figure actors, oval use cases, system boundary, include and extend arrows, external systems as actors (the CCTV video source, the monitoring person); ERD with PK and FK, cardinality, verb phrases, names aligned to the CSV schema; sequence with lifelines, sync and reply arrows, alt blocks for error paths; system sequence with the system as one black box; class diagram with visibility, relationships, and names matching the code; activity with decision nodes, start and end, and the suppression logic; every diagram consistent with the narrative and with `02_ARCHITECTURE_AND_RULES.md`.

## 3. Chapter 5: Implementation and Testing (Lec 9, ML variant)

| Section | Content | Repo source |
|---|---|---|
| 5.1 | Introduction and chapter map | |
| 5.2.1 Hardware specifications | Colab GPU (from `nvidia-smi`), lab machine CPU, RAM, GPU, OS | run logs, `bench` output |
| 5.2.2 Software specifications | Software table: Python, PyTorch, Ultralytics, deep-sort-realtime, OpenCV, pytest, versions from `requirements.lock` | lockfile |
| 5.2.3 System architecture and features | Implemented modules and CLI, annotated video, incident CSV | `02` |
| 5.3 Description of the dataset | Sources, retrieval, sizes, splits, classes, weather and night stratification, class mapping, ignored regions, stride, leakage check | `03`, `MANIFEST.json`, `stats.json` |
| 5.4.1 Model training and evaluation | Data preparation, training runs T0 to T3, curves, how models were analysed and saved, selection | `04`, `TRAINING_RUN_LOG.md` |
| 5.4.2 Testing paradigm | Unit, integration, white-box, black-box, performance, regression; diagram | `05` |
| 5.4.3 Testing tools | pytest, motmetrics, Ultralytics val, timers (screenshots) | |
| 5.5 Testing results and discussion | Table: Test case, Description, Test data, Experimental outcome, Verdict; five-metric results; stratified results; latency table; T2 versus T3 discussion; declared limitations | `EVAL_LOG.md`, `eval_report.json` |
| 5.6 Chapter summary | | |

## 4. Chapter 6: Conclusions, Recommendations, Future Work (one page)

Conclusions answer research questions i to v explicitly; recommendations are practical (for example collect Kenyan CCTV, add night-specific training data, calibrate per-camera zones); future work includes a trained incident classifier once labelled incidents exist, live streams, and an operator dashboard.

## 5. Front and end matter

| Item | Action |
|---|---|
| Abstract | Update to past tense and to actual results; about 180 to 210 words, four parts (Lec 1) |
| Abbreviations | Add IoU, FAR, MOTA already present; add any new (AP, NMS, ROI) |
| Lists of figures and tables | Generate at the end |
| Appendix 1 | **Replace the Gantt** (the proposal image belongs to a different project). Source: the Mermaid Gantt in `01_MASTER_PLAN.md`, updated with actual dates |
| Appendix 2 | Originality report matching the final document |
| Appendix C | Dataset and training notes, run tables, hyperparameters, `model_card.json` extracts |
| References | Fix defects listed as P-04 in doc 07; APA 7th; no tracking parameters in URLs |

## 6. Evidence capture (screenshots and exports; name files with the figure ID)

| ID | Evidence | When |
|---|---|---|
| F5.1 | Lab machine specs | Phase 0 |
| F5.2 | Colab `nvidia-smi` and versions | Each training run |
| F5.3 | Dataset EDA plots (class counts, box sizes, weather) | Phase 1 |
| F5.4 | Data staging and hash check | Phase 3 |
| F5.5 | Training log, `results.png` curves | Phase 3 |
| F5.6 | PR curve and confusion matrix per run | Phase 3 |
| F5.7 | Validation batch predictions | Phase 3 |
| F5.8 | pytest green output (unit, white-box, integration) | Phase 2 onward |
| F5.9 | Annotated frames showing each incident type | Phase 5 |
| F5.10 | Sample `incidents.csv` | Phase 5 |
| F5.11 | Latency benchmark output and plot | Phase 5 |
| F5.12 | Recall versus FAR calibration curve | Phase 4 |
| F5.13 | Recall, precision, FAR per weather condition | Phase 5 |

## 7. Process documents (kept current)

| File | Purpose |
|---|---|
| `logs/TRAINING_RUN_LOG.md` | One section per run: data, hyperparameters, hardware, metrics, artifact |
| `logs/EVAL_LOG.md` | Before and after tables and findings, comparison across runs |
| `logs/IMPLEMENTATION_RUN_LOG.md` | As-executed commands and outputs, integration events |
| `logs/TEST_ACCESS_LOG.md` | Every look at the test split |
| `07_DECISIONS_RISKS.md` | Decisions, risks, proposal defects |

Per-step Mermaid diagrams for the ML process (collection, EDA, cleaning, preparation, training, evaluation, deployment) go in `docs/diagrams/` and are referenced from Chapter 5.

## 8. Chapter checklist (gate G6)

- [ ] 4.2.1 and 4.2.2 in listing format, past tense
- [ ] All seven diagrams present, consistent with the code and each other
- [ ] 5.2.1 lists both training and running hardware
- [ ] 5.3 covers sources, splits, labels, class mapping, leakage check
- [ ] 5.4.1 has screenshots for every training run reported
- [ ] 5.5 table filled with verdicts; every number has a run ID
- [ ] Limitations from the proposal restated, plus the Colab deviation and the no-real-incident-labels limitation
- [ ] Chapter 6 within one page and answers RQ i to v
- [ ] Gantt replaced; references fixed; originality report current
- [ ] Formatting rules in section 1 applied and checked in Word

## 9. Viva and demonstration prep

Follow the proposal-defence structure (Lec 5) adapted for the final defence: title, abstract, problem, objectives, method, results, demo, limitations, future work. Prepare answers for: why rules instead of a classifier; how false alarms were controlled; why Colab; what the datasets cannot tell you about Kenya; how the test set was protected; what real-collision recall is and why it is not claimed.
