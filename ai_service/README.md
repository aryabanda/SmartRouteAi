# AI Service — setup and honest expectations

## What this actually is
A small Python (FastAPI) service that trains and serves an **Isolation Forest**
— an unsupervised anomaly-detection model — over your logged journey data.
It replaces the placeholder rules in `deviationClassifier.js` as the primary
decision-maker for "intentional reroute" vs "suspicious deviation", with the
rules kept as an automatic fallback if this service is down.

**Why unsupervised, not a trained classifier with labels:** nobody has
manually labeled which of your past deviations were genuinely suspicious
vs. just a normal detour — that data doesn't exist and would be expensive to
create. Isolation Forest sidesteps this: it learns what "normal" deviation
events look like from your logged data and flags statistical outliers,
no labels needed. This was always the plan (see the original hybrid-AI
discussion) — this is that plan actually implemented.

## Setup
```bash
cd ai_service
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
cp .env.example .env
# edit .env - same DATABASE_URL as your backend's .env
```

## Training
```bash
python train.py
```
This reads every `journey_locations` row, groups consecutive off-route pings
into "deviation events", engineers 4 features per event (max distance,
average speed, heading change, duration), and trains the model.

**Read the console output.** If you have very few logged journeys so far,
you'll see a warning that the model is undertrained — this is expected and
not a bug. Re-run `train.py` periodically as you log more real journeys
(walk/drive test routes with the app running) — the model only improves
with real data, there's no way around actually collecting it.

## Running the service
```bash
uvicorn main:app --port 5001
```
Leave this running alongside your Node backend (`npm run dev`) and Postgres.
Check `http://localhost:5001/health` — `modelLoaded: true` means `train.py`
has been run at least once successfully.

## What happens if you don't run this at all
Nothing breaks. `deviationClassifier.js` tries to reach this service with a
3-second timeout; if it's not running, it silently falls back to the
original rule-based logic. The mobile app and Node backend need zero
awareness of whether this service exists — that's by design, so you can
demo the rest of the app without this piece if you run out of time to set
it up.

## Retraining as a habit
There's no automatic retraining — this is a manual step (`python train.py`)
you run whenever you want the model to reflect newly logged journeys. For a
college project this is fine; a production system would run this on a
schedule (cron job, or triggered after N new journeys logged).

## Honest limitations worth stating in your report
- Untested against real distress scenarios (thankfully you don't have real
  labeled "person actually in trouble" data to validate against, and
  shouldn't try to manufacture it).
- `confidence` in the response is a bounded heuristic from the model's raw
  decision score, not a calibrated probability — don't cite it as "X%
  confident" without that caveat.
- Feature set is intentionally small (4 features) to match what the mobile
  app already computes in real time. A richer model could use more signals
  (time of day, road type, historical patterns for that specific user) but
  that's meaningfully more engineering than this project needs.
