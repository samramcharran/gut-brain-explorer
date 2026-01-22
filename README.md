# Gut-Brain Explorer

An interactive dashboard exploring the connection between gut bacteria and mental health conditions.

## Overview

Gut-Brain Explorer is a data-driven web application that visualizes research findings from the gut-brain axis literature. It demonstrates how gut microbiome composition correlates with various mental health conditions, and how diet influences these microbial communities.

### Features

- **Bacteria-Condition Explorer**: Interactive chart showing which gut bacteria are associated with depression, anxiety, stress, cognitive function, and other conditions
- **Key Species Profiles**: Detailed cards on the most researched psychobiotics
- **Diet & Microbiome**: Visualizations of how dietary patterns affect gut bacteria

## Architecture

```
Python Scripts (Data Ops)     →     JSON Files     →     Static Frontend
    ↓                                    ↓                     ↓
- Fetch PubMed data              - bacteria_conditions.json  - HTML/CSS/JS
- Process BugSigDB               - gut_brain_species.json    - Chart.js visualizations
- Curate diet associations       - diet_microbiome.json      - Interactive filters
```

## Quick Start

### 1. Generate Data

```bash
python scripts/data_pipeline.py
```

This fetches and processes data from public sources into clean JSON files.

### 2. View Dashboard

Open `index.html` in a web browser, or start a local server:

```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000
```

### 3. Deploy to GitHub Pages

1. Push to GitHub
2. Go to Settings → Pages
3. Select source branch (main) and root folder
4. Your dashboard will be live at `https://username.github.io/repository-name`

## Data Sources

All data is manually curated from peer-reviewed sources:

1. **BugSigDB-Inspired Curation**
   - Associations manually curated based on entries in BugSigDB (bugsigdb.org)
   - Each association includes PubMed IDs for verification
   - Note: This is not a live API integration

2. **PubMed E-utilities API**
   - Fetches recent gut-brain axis research papers
   - Used for the "Recent Papers" feature

3. **Review Literature**
   - Diet-microbiome relationships from meta-analyses
   - All references cited with PMIDs

## Data Methodology

### Bacteria-Condition Associations
- Associations are manually curated from peer-reviewed studies
- "Study count" represents an estimated number of supporting studies, not an exhaustive count
- Effect direction (depleted/enriched/varied) based on consensus across cited studies
- All claims are linked to PubMed IDs for verification

### Limitations
- This is an educational demonstration, not a comprehensive meta-analysis
- Study counts are estimates and may not reflect all published research
- Associations may vary by bacterial strain, study population, and methodology

## Project Structure

```
gut-brain-explorer/
├── index.html              # Main dashboard page
├── css/
│   └── style.css           # Styling
├── js/
│   └── app.js              # Chart rendering & interactivity
├── data/
│   ├── bacteria_conditions.json    # Bacteria ↔ condition mappings
│   ├── gut_brain_species.json      # Key species profiles
│   └── diet_microbiome.json        # Diet ↔ bacteria relationships
├── scripts/
│   └── data_pipeline.py    # Data fetching & processing
└── README.md
```

## Technical Details

### Data Pipeline

The Python script (`scripts/data_pipeline.py`) demonstrates ETL skills:
- **Extract**: Fetches data from PubMed API and processes curated datasets
- **Transform**: Normalizes bacteria names, aggregates study counts, categorizes effects
- **Load**: Outputs clean JSON ready for visualization

### Frontend

Built with minimal dependencies for easy deployment:
- Pure HTML/CSS/JavaScript
- Chart.js for interactive visualizations
- Responsive design for mobile/desktop

## Key Talking Points

1. **Data Engineering**: Pipeline aggregates and normalizes microbiome research data from multiple sources
2. **Domain Knowledge**: Focus on GABA-producing bacteria (Lactobacillus), butyrate producers (Faecalibacterium), and their mental health connections
3. **Accessibility**: Making complex research accessible to non-experts aligns with the goal of creating tools for everyone

## Disclaimer

This dashboard is for educational purposes only. The associations shown represent research findings and should not be interpreted as medical advice. Always consult healthcare professionals for health decisions.

## License

MIT License - feel free to use, modify, and share.
