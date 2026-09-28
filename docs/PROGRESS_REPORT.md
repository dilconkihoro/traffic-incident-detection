# Progress report: An Automated Traffic Incident Detection System using YOLOv8 and CCTV Video Data

Dilcon Kuria Kihoro, BBIT 4D, Strathmore University  
Supervisor: Mr. Titus Tunduny  
28 September 2026  
This is a living document. I update it as I go, so it always reflects where the project actually stands, not just where it stood when I last wrote a report.

## Where I am right now

I am building a desktop system that takes a recorded CCTV video of a road junction, detects and tracks every vehicle in it, and flags three kinds of incidents using simple, transparent rules: a vehicle stopping abruptly, a vehicle blocking a lane for too long, and two vehicles converging in a way that looks like a collision. The output is a CSV log of every flagged incident and a copy of the video with the detections drawn on it. I am evaluating it on precision, recall, mAP, false alarm rate, and detection speed, using two public datasets, UA-DETRAC and DhakaAI.

At a glance, here is where each phase of my plan stands:

- Phase 0, Foundation: complete.
- Phase 1, Data: in progress. Both datasets are fully downloaded and verified; I still need to build the code that converts them into a training-ready format.
- Phase 2, Pipeline: built and tested end to end on a stand-in model, including real video. Two small items are still blocked on Phase 1.
- Phase 3, Training: my Colab notebook is ready. I have not run it yet.
- Phases 4 to 7 (integration, evaluation, documentation, demo): not started, since each depends on a trained model.
- A supplementary web dashboard: built, tested on real videos, and in use for demonstration, on top of the core system.

## What I have completed

### Phase 0: Foundation

I set up a Python 3.10.20 environment with 55 pinned dependencies (CPU-only PyTorch 2.14.0, OpenCV 4.14.0, Ultralytics 8.4.158, and deep-sort-realtime 1.3.2 for tracking), so the environment is reproducible from a clean install rather than “whatever happened to be on my machine”. I built the package skeleton (trafficwatch) with a typed data model for everything that moves between pipeline stages, and a configuration validator that refuses to start the program if a setting is missing or out of range, rather than running silently with a wrong value. I also set up a fresh, private GitHub repository for the project with its own isolated credentials.

I proved this phase was solid with a full green test suite and a clean lint pass before writing any of the actual detection or tracking logic.

### Phase 1: Data

Both datasets I am using are now fully downloaded and verified, which was the single biggest practical obstacle so far.

**DhakaAI** is done. I confirmed its licence is CC0 1.0 (public domain), downloaded both archives through Harvard Dataverse's public API, and checked every byte against the source (sha256 hashes match exactly). I then went through every one of its 3,003 annotation files myself, not just downloaded them blindly: 3,002 parsed correctly as Pascal VOC XML, and one file was actually a YOLO-format text file mislabelled with an .xml extension, which my parser detects and reports rather than silently mishandling. Across the valid files there are 24,368 labelled vehicle boxes across 21 distinct classes, an average of about 8 vehicles per image. I also confirmed that DhakaAI's separate “test” file has no annotations at all: it turns out to be an unlabelled competition holdout, not usable ground truth, so I will build my own validation split from the labelled images instead.

**UA-DETRAC** is also fully downloaded now, including the 9.85 GB video-frame archive, and every file is hash-verified. Its original official host has been dead for some time (every published link now redirects to a generic page), so I had to find and use a live alternative source. Going through its annotation files directly, I confirmed its real structure and confirmed it uses exactly four vehicle classes (car, van, bus, and an “others” category), with 598,281 labelled boxes across 61 training sequences and 41 test sequences, and zero two-wheeler labels of any kind. That last point matters: it means I cannot casually merge DhakaAI's motorbike and scooter labels into the combined dataset without thinking it through first, since UA-DETRAC would then be full of unlabelled motorbikes in its background, which would actively confuse training.

What is left in this phase: the datasets are ready, but the code that turns them into a single, training-ready dataset is not built yet. That is the actual next piece of work: a parser for UA-DETRAC's XML format (I already built one for DhakaAI's Pascal VOC format), a script to explore and sanity-check the combined data, a converter into the YOLO training format, and a splitter that keeps entire video sequences together between training and validation, so the model is never tested on frames it has effectively already seen. I also still need to make two judgement calls on the exact vehicle-class list before that converter can be finished: how to treat DhakaAI's three overlapping “small three-wheeler” classes (rickshaw, three-wheeler CNG, and auto-rickshaw), and whether to add a separate ambulance class. Both are genuinely my own call to make, not something that can be scripted or guessed.

### Phase 2: Pipeline

All seven stages of the pipeline run end to end: reading the video, resizing frames for the model, detection, tracking, the three behaviour rules, writing the incident log, and orchestrating the whole run with per-stage timing and a full reproducibility record (git commit, config, seed, hardware) on every output. Since my trained model is not ready yet, this has all been built and proven against a general-purpose, off-the-shelf version of YOLOv8, clearly labelled everywhere as a stand-in so it can never accidentally be mistaken for a real result later.

I hand-computed the correct answer for every one of my three behaviour rules across 41 test cases, covering the clean positive and negative case for each rule and the exact boundary of every threshold, and all 41 pass with the rules implemented exactly as designed, with no shortcuts taken to make them pass. I also ran real UA-DETRAC video clips (not synthetic ones) through the full pipeline: on the first short clip, 21 real vehicles were correctly detected and tracked from the raw footage and the system produced a valid annotated video. I have also produced three short, real demonstration clips, one per incident type, each confirmed to make the real detector and rules flag it, and each re-run a second time to confirm the same result: one for an abrupt stop, one for a lane obstruction (shown as a time-lapse, since that rule needs 15 seconds of real time to fire), and one for a collision-like convergence (the flagged moment there is a car passing behind a stopped bus from the camera's angle, a real rule trigger worth showing but not a real crash, and I am noting that honestly rather than overselling it). I also tried a close-up crash-test video, and the system did not flag the collision. I traced why, and it is a limit of scope rather than a bug: the rules are built for a fixed camera looking down a road, where vehicles are small in the frame. In the crash-test video the cars fill most of the frame, the detector only sees them intermittently while they approach and hit, and by the time both are tracked steadily they are already stopped, so there is no approach for the collision rule to measure. I will record this as a limitation in my write-up rather than tune my thresholds to a clip that is outside my scope. Thresholds have not been tuned on real data yet, so these are “the system works end to end” milestones, not a formal accuracy result.

Two small items in this phase are still open, and both are blocked on Phase 1 rather than on anything in the pipeline itself: running the pipeline on three real validation sequences, and logging a zero-shot baseline before any training happens.

### Phase 3: Training, preparation

My Colab notebook is fully built: from a completely blank Colab session, it clones the repository, installs the exact pinned package versions, stages the dataset from Drive with a hash check, runs a quick smoke test, then trains and compares models, checkpointing regularly so a dropped Colab session does not lose progress. I have not run it yet, since it depends on the Phase 1 conversion work above. When I do run it, the plan is three training runs: a YOLOv8n baseline on UA-DETRAC alone, a stronger YOLOv8s run on UA-DETRAC alone, and a third run adding DhakaAI to the training data, so I can see directly whether the second dataset actually helps or not, rather than assuming it does.

### A supplementary web dashboard

On top of the core CLI system above, I also built a browser-based dashboard: a login screen, a page to upload a CCTV video, a live view of it being processed, and a history of every past run. I want to be upfront about what this is: my proposal and my own scope decisions specify a command-line tool plus an annotated video and a CSV file as the official interface, deliberately excluding a web application, and that has not changed. This dashboard is an extra layer on top of that, built to call the exact same underlying pipeline, and it does not replace or weaken the CLI in any way. I have logged it as a scope addition in my decision log so there is a clear record of it, and I still need to agree with my supervisor how it should be framed in my final submission, since the panel will be evaluating against my approved proposal. I would appreciate guidance on this.

Each finished run has its own page, designed so that someone who has not seen the code can follow a video from upload to results. It shows the original video I uploaded next to the processed one (a box around every tracked vehicle and a red banner when an incident fires), both playable in the browser and downloadable. Below that it lists the incidents in the order they were flagged, and clicking one jumps the video to that moment. It also shows every tracked vehicle's position in every frame, with a plain-language explanation of what that data is, also downloadable.

Testing it on real videos taught me several things that I have since fixed. Browsers cannot play the video format OpenCV writes, so both the original and the processed video are now converted for the browser. My machine has no GPU and processes roughly 1.5 frames per second, so I capped the length of an upload to keep a run to about two minutes at worst. A long video I uploaded before that cap existed kept my laptop busy for about an hour and eventually froze it, so I made the dashboard protect the machine: only one run is processed at a time (the others wait in a queue), a run uses at most half the CPU cores at a lower priority, and every queued or running run has a Cancel button that stops it and discards its half-written output. A run that was cut off by restarting the server used to look as though it was still running forever; it is now marked as failed with the reason, and its page warns when nothing has progressed for a while. I also checked that runs made before these fixes still open correctly.

## Quality evidence

I take testing seriously throughout, not just at the end. The fast core test suite has 370 tests passing with zero failures, and the 41 hand-computed rule tests and 2 real-model tests, which I run separately because they are slower, pass as well. The dashboard's backend has 63 tests, including one that drives a real video through the real model end to end, all passing. My linter reports zero issues across the whole codebase, and the dashboard's frontend builds and lints cleanly. Every run of the system writes a full reproducibility record, so any number I eventually report can be traced back to exactly the code, configuration, and data that produced it.

## Decisions I have made along the way, and why

A few things came up during implementation that were not fully specified in my proposal, and I have written each one down with my reasoning rather than deciding it silently:

- Training cannot happen on a local lab machine at this scale, so all training runs on Google Colab instead, and I am disclosing this as a deviation from the proposal.
- My validation split is done by entire video sequence, never by individual frame, since adjacent frames are near-duplicates and splitting by frame would let the model effectively see its own test data.
- The official UA-DETRAC test sequences are only ever touched once, and I am logging that single access when it happens, so I cannot accidentally tune my thresholds against it. For the same reason I only use training sequences for my demonstration clips.
- Neither of my two datasets has real incident or collision labels, so I designed a three-tier way of evaluating the behaviour rules (using known events, adjudicated clips, and synthetic scenarios), and I am not presenting results from that as if they were a measured real-world collision detection rate. I still need my supervisor's sign-off on this approach.

The full list, with rationale for each, is in my decision log.

## What is still pending, in the order I plan to do it

1. Build the actual Phase 1 conversion pipeline now that both datasets are downloaded: the UA-DETRAC parser, an exploratory data analysis script, the YOLO-format converter, and the sequence-level splitter with its leakage check.
2. Settle the two remaining vehicle-class judgement calls mentioned above, since the converter needs a final answer before it can run.
3. Run the three validation sequences and the zero-shot baseline through the pipeline, closing out Phase 2.
4. Run the Colab training notebook: the three-run comparison across model sizes and datasets.
5. Once a trained model exists: plug it in, calibrate the rule thresholds on real validation data, run the full five-metric evaluation, and start writing the results into my thesis chapters.
6. Confirm my actual submission and demonstration dates with my supervisor, and get sign-off on the three-tier incident evaluation approach and on how the web dashboard should be described in the final submission.

## What I would like from my supervisor

- Confirmation of the real submission and demo dates, since my current schedule is provisional.
- A short conversation to sign off the three-tier incident evaluation approach, since neither dataset has real collision labels and I want to make sure this is acceptable before I build the rest of my evaluation around it.
- Guidance on how to present the supplementary web dashboard in my final submission, given it goes beyond what my proposal originally scoped.
