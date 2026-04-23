# AI Paper Tracker 🤖

A PWA that automatically fetches the latest AI research papers from arXiv every 6 hours via GitHub Actions, and displays them as an installable offline-capable web app.

## Features

- 🔄 Auto-updates every 6 hours via GitHub Actions (arXiv API)
- 📱 Installable as a mobile / desktop PWA
- 🔍 Filter by keyword (LLM / RAG / Agent) or full-text search
- ☆ Bookmark papers to read later
- ✓ Mark papers as read
- 🟢 "New" badge for papers published since your last visit
- 🌐 Offline support — cached papers available without internet

## Setup

### 1. Fork this repository

### 2. Enable GitHub Pages

**Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**

### 3. Trigger first fetch

**Actions → Fetch AI Papers → Run workflow**

After it completes, your app is live at:
```
https://<your-username>.github.io/<repo-name>/
```

### 4. Install as PWA

Open the URL in Chrome / Edge / Safari and click **"Add to Home Screen"** or the install icon in the address bar.

---

## Customization

### Change tracked keywords

Edit `scripts/fetch_papers.py`:
```python
KEYWORDS = ["LLM", "RAG", "Agent"]   # change these
MAX_RESULTS = 20                       # papers per fetch
```

After editing, commit and push — the next Actions run will use the new keywords.

### Change fetch schedule

Edit `.github/workflows/fetch-papers.yml`:
```yaml
- cron: "0 0,6,12,18 * * *"   # every 6 hours UTC
```

Use [crontab.guru](https://crontab.guru) to build your schedule.

---

## Project Structure

```
├── .github/workflows/fetch-papers.yml   # Scheduled fetch workflow
├── scripts/fetch_papers.py              # arXiv API fetcher
├── data/papers.json                     # Auto-generated paper data
├── index.html                           # PWA shell
├── app.js                               # App logic
├── style.css                            # Dark-theme styles
├── sw.js                                # Service worker (offline)
├── manifest.json                        # PWA manifest
└── icon.svg                             # App icon
```

## Data source

Papers are fetched from the [arXiv API](https://arxiv.org/help/api/index) — free, public, and officially supported. No API key required.
