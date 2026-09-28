# Project guide: Traffic Incident Detection System

A plain-language reference for this project: what everything does, what has been built, how to run
it, and what is still needed to call the project complete. Written for you, not for a technical
reviewer; `docs/00` through `docs/08` are the precise technical specs this project follows, this
file explains them in everyday terms.

---

## 1. What this project actually is

You feed it a video of a road junction (the kind a CCTV camera records). It watches the video,
draws a box around every car, bus, van, and other vehicle it sees, follows each one frame by
frame, and checks each vehicle against three simple rules:

1. **Did it stop suddenly?** (possible crash, breakdown, or near-miss)
2. **Is it stopped somewhere it shouldn't be, for a long time, while traffic keeps moving around
   it?** (an obstruction, e.g. a broken-down car blocking a lane)
3. **Did two vehicles get close together fast and then one of them react abruptly?** (a
   collision-like event)

When a rule fires, it writes a row to a spreadsheet (`incidents.csv`) with the time, the vehicle
IDs involved, and where it happened, and it saves a copy of the video with boxes drawn on it so a
human can check the flagged moments.

That is the whole product. Everything else in this repository exists to make that work reliably,
to prove it works with tests and real measurements, and to write up the results for a university
final-year project (a BBIT capstone at Strathmore University).

---

## 2. The pipeline, stage by stage

A video goes through seven stages, one after another. Each stage is one Python file in
`src/trafficwatch/`.

```
video file
   |
   v
[1] Ingestion         reads the video, hands out one frame at a time
   |
   v
[2] Preprocessing     resizes the frame to a fixed size the AI model expects
   |
   v
[3] Detection         "where are the vehicles in this frame, and what type is each one"
   |
   v
[4] Tracking          "which box in this frame is the same car as a box in the last frame"
   |
   v
[5] Behaviour rules   "has this car's movement pattern matched a rule"
   |
   v
[6] Incident log      writes a row to incidents.csv when a rule fires
   |
   v
annotated video + incidents.csv + a timing report
```

| Stage | Plain explanation | File |
|---|---|---|
| Ingestion | Opens the video file and reads it frame by frame, like flipping through a flipbook | `src/trafficwatch/ingestion.py` |
| Preprocessing | The AI model only accepts images of an exact size (640x640 pixels). This stage resizes each frame to fit, without stretching it out of shape (it adds grey padding bars instead, like a letterboxed movie) | `src/trafficwatch/preprocessing.py` |
| Detection | This is YOLOv8, the actual "AI" part. It looks at one frame and outputs a list of boxes, each with a label (car, bus, van...) and a confidence score | `src/trafficwatch/detection.py` |
| Tracking | Detection alone does not know that "the car in frame 50" and "the car in frame 51" are the same car. Tracking (DeepSORT) solves that: it assigns each vehicle a number and follows it across frames | `src/trafficwatch/tracking.py` |
| Behaviour rules | Once we know each vehicle's path over time, we can ask "did its speed pattern match a rule". Written as three separate, independent checks | `src/trafficwatch/behaviour/rules.py` |
| Incident log | A simple CSV writer. Every time a rule fires, one line gets added | `src/trafficwatch/incident_log.py` |
| Orchestration | The "conductor" that runs all six stages in order for every frame, times how long each stage takes, and saves the outputs | `src/trafficwatch/pipeline.py` |

---

## 3. Key concepts, explained simply

**YOLOv8**: "You Only Look Once", version 8. A pre-built AI model that finds objects in an image
and draws boxes around them. We do not write this model ourselves; we use one built by a company
called Ultralytics, and we either use it exactly as they trained it (see "stand-in weights"
below), or we retrain it slightly on our own vehicle images so it gets better at spotting cars,
buses, and other specific vehicle types.

**DeepSORT**: the tracking algorithm. "SORT" stands for Simple Online and Realtime Tracking; the
"Deep" part means it also looks at what each vehicle looks like (its appearance), not just where
its box is, so it can tell two similar-looking cars apart even if they cross paths.

**Weights**: the actual numbers inside the AI model that were learned during training. "Stand-in
weights" (`coco_standin`) means we are using YOLOv8 exactly as Ultralytics released it, trained on
a general-purpose dataset called COCO (which includes some vehicle classes, but is not
specialised for this project). "Trained weights" means our own version, retrained specifically on
traffic footage. **Every output made with stand-in weights is clearly labelled as such and is
never counted as a real result**: it exists only so the rest of the pipeline can be built and
tested before the real training finishes.

**Config file (`configs/pipeline.yaml`)**: every number the pipeline uses (how fast is "stopped",
how long counts as "prolonged", how close is "collision-like") lives in this one file, not buried
in the code. Change a number, rerun, no code edits needed. If the file has a mistake in it (a
typo, a missing value, a number out of range), the program refuses to start and tells you exactly
which line is wrong, instead of running with a silently wrong setting.

**Tests**: small programs that check the real program behaves correctly. Three kinds are used
here:

- **Unit tests** check one small piece in isolation (e.g. "does the CSV writer format a row
  correctly").
- **White-box / hand-computed tests** check the three behaviour rules against trajectories where
  we worked out the correct answer by hand first (e.g. "a car moving at exactly the stop
  threshold speed should not be flagged, one unit slower should be"). There are 41 of these, one
  for every important edge case, and all 41 currently pass.
- **Integration / end-to-end tests** run the whole pipeline on a short fake video and check the
  final output is correct, not just one piece of it.

**Datasets: UA-DETRAC and DhakaAI**: two collections of already-labelled traffic images/video
used to teach and test the AI model. UA-DETRAC is real fixed-camera traffic video from China.
DhakaAI is a collection of individually-photographed traffic scenes from Dhaka, Bangladesh (not
video, just photos, each with boxes already drawn around every vehicle by a human). See section 6
for their current status.

**Colab vs local**: training an AI model (making it learn from data) needs a lot of computing
power, specifically a graphics card (GPU). Your own machine does not have one. Google Colab is a
free website that lends you one temporarily. So: everything except the actual training step (data
downloading, code, tests, running the finished pipeline on a video) happens on your own machine;
only the training step happens on Colab, using a notebook already prepared for you
(`notebooks/colab_train.ipynb`).

**Git and GitHub**: Git tracks every change made to the code, like an infinite undo history with
labelled checkpoints (called commits). GitHub is where that history is stored online, at
`github.com/dilconkihoro/traffic-incident-detection`, privately, so only you can see it.

---

## 4. What has actually been built so far

| Piece | Status | In plain terms |
|---|---|---|
| Project setup | Done | Python installed, all the code libraries installed and pinned to exact versions so it works the same way every time |
| The seven pipeline stages | Done | All seven run, end to end, and have been proven correct on test videos |
| The three behaviour rules | Done | All 41 hand-checked test cases pass |
| A way to run the pipeline yourself | Done | The command-line tool described in section 5 |
| The Colab training notebook | Done, not yet run | Ready to go the moment the data is ready |
| DhakaAI dataset | Downloaded and checked | 3,003 labelled traffic photos, verified byte-for-byte against the source, real content inspected (not just downloaded blindly) |
| UA-DETRAC dataset | In progress | Annotation files downloaded; the 9.2 GB video-frame archive is downloading now |
| The actual data-conversion pipeline (turning the raw datasets into a format the AI model can train on) | Not started | Waiting on the UA-DETRAC download to finish |
| A trained (non-stand-in) model | Not started | Needs the data conversion step above, then a Colab run |
| The five-metric evaluation report | Not started | Needs a trained model first |
| The written thesis chapters | Not started | Needs real results from the steps above |

---

## 5. How to actually run it and see it work

There is a command-line interface (a CLI): you type a command in the terminal, it runs, and it
prints results. The CLI plus the annotated video output plus the CSV file together are the
official interface, and this is what the proposal describes and what gets evaluated as the core
deliverable (decision D-13, `docs/07_DECISIONS_RISKS.md`).

A supplementary web dashboard also exists (`webapp/`, decision D-25): upload a video in a browser,
watch it process live, and browse past runs, with a login screen in front of it. It is a bonus
showcase layer that calls this same CLI pipeline underneath, not a replacement for it, and it does
not change how the core system is evaluated. See `webapp/README.md` for how to run it.

```bash
cd ~/IS/traffic-incident-detection
source .venv/bin/activate

# one-time: download the stand-in AI model (about 6 MB)
python scripts/fetch_standin_weights.py

# run the pipeline on any video file you have
python -m trafficwatch run path/to/some_video.mp4 --standin
```

`--standin` tells it to use the general-purpose stand-in model rather than a trained one (which
does not exist yet). Leaving it off, once a trained model is ready, will use the real one.

After it finishes, look in `reports/<a long run name>/` for:

- **`incidents.csv`**: every flagged incident, one row each, with the time and which vehicles
  were involved.
- **`annotated.mp4`**: the same video with boxes drawn around every tracked vehicle, and a red
  banner when an incident is flagged.
- **`latency.json`**: how fast the pipeline ran, frame by frame.
- **`run_manifest.json`**: a record of exactly what code, settings, and model version produced
  this specific run, so any number can always be traced back to how it was made.

Right now, run it on any ordinary traffic video you can find (a phone recording of a road works
fine for a demo). It will draw real boxes and track real vehicles, using the general-purpose
model. It has not yet been trained on the two specific datasets, so its accuracy has not been
formally measured, only its ability to run correctly.

---

## 6. Full requirements for the project to be considered complete

This follows the project's official phase plan (`docs/01_MASTER_PLAN.md`). A phase is "done" only
when everything in its row is true.

| # | Phase | Done means | Status |
|---|---|---|---|
| 0 | Foundation | Project set up, all basic tests passing | **Done** |
| 1 | Data | Both datasets downloaded and verified; a script that turns them into AI-training format; training and testing data kept strictly separate (never mixed, or the results would not be trustworthy) | **In progress** |
| 2 | Pipeline | All seven stages working, all rule tests passing, running successfully on real (not fake) video | **Mostly done**, needs real video once UA-DETRAC lands |
| 3 | Training | The AI model actually retrained on the real datasets, on Colab, at least three separate training attempts compared against each other | **Not started** |
| 4 | Integration | The retrained model plugged in, the rule thresholds fine-tuned using real results | **Not started** |
| 5 | Evaluation | The five official metrics measured and reported: precision, recall, mAP, false-alarm rate, and speed (latency) | **Not started** |
| 6 | Documentation | Chapters 4, 5, and 6 of the thesis written, using only real, traceable numbers from the steps above | **Not started** |
| 7 | Demonstration | A live run-through prepared for the viva/defence, plus a backup recording in case something breaks on the day | **Not started** |

**Also required, running alongside every phase, not as a separate step:**
- Every important choice made along the way is written down with the reasoning (`docs/07`), so
  nothing is a mystery later.
- Every AI training attempt is logged with its exact settings and results
  (`docs/logs/TRAINING_RUN_LOG.md`), so the thesis can always point to real evidence.
- The one-time, no-peeking rule: a portion of UA-DETRAC is set aside as a final exam the model
  only sees once, right at the end, to prove it was not just memorising the practice questions.

---

## 7. What is pending right now, in order

1. Finish downloading UA-DETRAC (images archive in progress; three small annotation files already
   done).
2. Once the annotation files are available, build the actual data-conversion code for UA-DETRAC
   (parsing its files, building the training/testing split, checking for accidental overlap
   between them).
3. Decide the final list of vehicle categories the model should recognise, now that both datasets'
   real content is known (a couple of specific judgement calls are open, listed in
   `docs/07_DECISIONS_RISKS.md` under D-04).
4. Run the prepared Colab notebook to actually train the model (three separate attempts, compared).
5. Once training results are pasted back, plug the trained model in, measure the five official
   metrics, and start writing the results into the thesis chapters.
6. Confirm the real submission and demonstration dates, and book time with the supervisor to
   approve how "incidents" are graded (since neither dataset has real crash data, a three-tier
   grading method was designed and needs the supervisor's sign-off before it counts as final).

---

## 8. Glossary

| Term | Meaning |
|---|---|
| CLI | Command-line interface, a way of controlling a program by typing text commands instead of clicking buttons |
| CSV | A plain spreadsheet file (Comma-Separated Values), openable in Excel or Google Sheets |
| GPU | Graphics card; needed to train an AI model in reasonable time |
| mAP | Mean Average Precision, a standard score for "how good is this object detector", from 0 to 1 (or 0% to 100%) |
| IoU | Intersection over Union, a way of measuring how well a predicted box overlaps the true box |
| FPS | Frames Per Second, how fast the video plays, and also used for how fast the pipeline processes it |
| Latency | How long something takes, here measured in milliseconds per frame |
| Sequence-level split | Keeping all frames from the same video clip together in either the training set or the testing set, never both, so the AI cannot "cheat" by memorising a clip it saw a slightly different frame of |
| Class taxonomy | The fixed list of vehicle category names the model is allowed to use (e.g. car, van, bus) |
| Model card | A small file recording exactly how a specific trained model was made, so it can be checked and trusted later |
| Repository (repo) | The project's whole folder of code and files, tracked by Git |
| Commit | One saved checkpoint of changes in Git, with a short description |
| Push | Uploading your saved checkpoints to GitHub |
