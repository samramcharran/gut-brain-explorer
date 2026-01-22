# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gut-Brain Explorer is a static web dashboard visualizing gut-brain axis research data. It demonstrates data engineering skills by aggregating microbiome research into interactive visualizations.

## Architecture

```
Python Data Pipeline → JSON Data Files → Static Frontend (HTML/CSS/JS + Chart.js)
```

- **Data layer**: Python script fetches from PubMed API, processes curated BugSigDB associations, outputs to `data/*.json`
- **Frontend**: Pure HTML/CSS/JavaScript with Chart.js for visualizations, no build step required

## Commands

### Generate/refresh data
```bash
python scripts/data_pipeline.py
```

### Run local development server
```bash
python -m http.server 8000
# Open http://localhost:8000
```

## Key Files

- `scripts/data_pipeline.py` - ETL pipeline that fetches PubMed data and outputs JSON files
- `js/app.js` - Chart.js visualizations and interactivity (bubble/bar/heatmap charts)
- `css/style.css` - All styling with CSS variables for theming
- `data/*.json` - Generated data files (bacteria_conditions, gut_brain_species, diet_microbiome)

## Data Flow

1. `data_pipeline.py` fetches from PubMed E-utilities API and includes curated BugSigDB associations
2. Outputs normalized JSON to `data/` directory
3. Frontend loads JSON via fetch() and renders with Chart.js

## Frontend Chart Types

The main explorer supports three visualization modes (configurable via dropdown):
- Bubble chart: bacteria genus (x) vs condition (y), bubble size = study count
- Bar chart: stacked by effect type (beneficial/enriched/varied)
- Heatmap: matrix view of associations
