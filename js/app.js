/**
 * GutBrain Explorer - Interactive Dashboard
 *
 * Visualizes gut-brain axis research data using Chart.js
 */

// ===== Global State =====
let bacteriaConditionsData = null;
let speciesData = null;
let dietData = null;
let mainChart = null;
let dietChart = null;

// Color schemes
const COLORS = {
    beneficial: 'rgba(64, 145, 108, 0.7)',
    beneficialBorder: 'rgba(64, 145, 108, 1)',
    enriched: 'rgba(230, 57, 70, 0.7)',
    enrichedBorder: 'rgba(230, 57, 70, 1)',
    varied: 'rgba(157, 78, 221, 0.7)',
    variedBorder: 'rgba(157, 78, 221, 1)',
    primary: 'rgba(45, 106, 79, 0.7)',
    primaryBorder: 'rgba(45, 106, 79, 1)',
    secondary: 'rgba(67, 97, 238, 0.7)',
    secondaryBorder: 'rgba(67, 97, 238, 1)'
};

// ===== Data Loading =====
async function loadData() {
    try {
        const [conditionsRes, speciesRes, dietRes] = await Promise.all([
            fetch('data/bacteria_conditions.json'),
            fetch('data/gut_brain_species.json'),
            fetch('data/diet_microbiome.json')
        ]);

        bacteriaConditionsData = await conditionsRes.json();
        speciesData = await speciesRes.json();
        dietData = await dietRes.json();

        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        showErrorState(error.message || 'Failed to load data');
        return false;
    }
}

// Error state handler with user feedback and retry option
function showErrorState(message) {
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
        chartContainer.innerHTML = `
            <div class="error-state">
                <p class="error-message">Unable to load data: ${escapeHtml(message)}</p>
                <p class="error-hint">Please ensure the data files exist in the data/ directory.</p>
                <button class="retry-button" onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

// HTML escape helper to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Filter Population =====
function populateFilters() {
    const conditionFilter = document.getElementById('condition-filter');
    const bacteriaFilter = document.getElementById('bacteria-filter');

    // Clear existing options except "All"
    conditionFilter.innerHTML = '<option value="all">All Conditions</option>';
    bacteriaFilter.innerHTML = '<option value="all">All Bacteria</option>';

    // Add condition options
    bacteriaConditionsData.conditions.forEach(condition => {
        const option = document.createElement('option');
        option.value = condition;
        option.textContent = condition;
        conditionFilter.appendChild(option);
    });

    // Add bacteria options
    bacteriaConditionsData.bacteria.forEach(bacteria => {
        const option = document.createElement('option');
        option.value = bacteria;
        option.textContent = bacteria;
        bacteriaFilter.appendChild(option);
    });
}

// ===== Main Chart =====
function getEffectColor(effect) {
    switch (effect) {
        case 'beneficial':
        case 'depleted':
            return { bg: COLORS.beneficial, border: COLORS.beneficialBorder };
        case 'enriched':
            return { bg: COLORS.enriched, border: COLORS.enrichedBorder };
        default:
            return { bg: COLORS.varied, border: COLORS.variedBorder };
    }
}

function createBubbleChart(data, conditionFilter = 'all', bacteriaFilter = 'all') {
    const ctx = document.getElementById('main-chart').getContext('2d');

    // Filter data
    let filtered = data.associations;
    if (conditionFilter !== 'all') {
        filtered = filtered.filter(a => a.condition === conditionFilter);
    }
    if (bacteriaFilter !== 'all') {
        filtered = filtered.filter(a => a.bacteria === bacteriaFilter);
    }

    // Prepare bubble data
    const bubbleData = filtered.map(a => ({
        x: data.bacteria.indexOf(a.bacteria),
        y: data.conditions.indexOf(a.condition),
        r: Math.min(Math.sqrt(a.study_count) * 4 + 5, 25),
        bacteria: a.bacteria,
        condition: a.condition,
        count: a.study_count,
        effect: a.effect,
        pmids: a.pmids
    }));

    // Group by effect for coloring
    const beneficialData = bubbleData.filter(d => d.effect === 'beneficial' || d.effect === 'depleted');
    const enrichedData = bubbleData.filter(d => d.effect === 'enriched');
    const variedData = bubbleData.filter(d => d.effect === 'varied');

    const chartData = {
        datasets: [
            {
                label: 'Beneficial/Depleted',
                data: beneficialData,
                backgroundColor: COLORS.beneficial,
                borderColor: COLORS.beneficialBorder,
                borderWidth: 2
            },
            {
                label: 'Enriched',
                data: enrichedData,
                backgroundColor: COLORS.enriched,
                borderColor: COLORS.enrichedBorder,
                borderWidth: 2
            },
            {
                label: 'Varied',
                data: variedData,
                backgroundColor: COLORS.varied,
                borderColor: COLORS.variedBorder,
                borderWidth: 2
            }
        ]
    };

    if (mainChart) {
        mainChart.destroy();
    }

    mainChart = new Chart(ctx, {
        type: 'bubble',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const d = context.raw;
                            return [
                                `${d.bacteria} - ${d.condition}`,
                                `Studies: ${d.count}`,
                                `Effect: ${d.effect}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: -0.5,
                    max: data.bacteria.length - 0.5,
                    ticks: {
                        callback: function(value) {
                            return data.bacteria[Math.round(value)] || '';
                        },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    title: {
                        display: true,
                        text: 'Bacteria Genus'
                    }
                },
                y: {
                    type: 'linear',
                    min: -0.5,
                    max: data.conditions.length - 0.5,
                    ticks: {
                        callback: function(value) {
                            return data.conditions[Math.round(value)] || '';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Mental Health Condition'
                    }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    const element = elements[0];
                    const datasetIndex = element.datasetIndex;
                    const index = element.index;
                    const point = chartData.datasets[datasetIndex].data[index];
                    showAssociationDetails(point);
                }
            }
        }
    });
}

function createBarChart(data, conditionFilter = 'all', bacteriaFilter = 'all') {
    const ctx = document.getElementById('main-chart').getContext('2d');

    let filtered = data.associations;
    if (conditionFilter !== 'all') {
        filtered = filtered.filter(a => a.condition === conditionFilter);
    }
    if (bacteriaFilter !== 'all') {
        filtered = filtered.filter(a => a.bacteria === bacteriaFilter);
    }

    // Aggregate by bacteria
    const bacteriaCounts = {};
    filtered.forEach(a => {
        if (!bacteriaCounts[a.bacteria]) {
            bacteriaCounts[a.bacteria] = { beneficial: 0, enriched: 0, varied: 0 };
        }
        if (a.effect === 'beneficial' || a.effect === 'depleted') {
            bacteriaCounts[a.bacteria].beneficial += a.study_count;
        } else if (a.effect === 'enriched') {
            bacteriaCounts[a.bacteria].enriched += a.study_count;
        } else {
            bacteriaCounts[a.bacteria].varied += a.study_count;
        }
    });

    const labels = Object.keys(bacteriaCounts).sort();
    const beneficialData = labels.map(b => bacteriaCounts[b].beneficial);
    const enrichedData = labels.map(b => bacteriaCounts[b].enriched);
    const variedData = labels.map(b => bacteriaCounts[b].varied);

    if (mainChart) {
        mainChart.destroy();
    }

    mainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Beneficial/Depleted',
                    data: beneficialData,
                    backgroundColor: COLORS.beneficial,
                    borderColor: COLORS.beneficialBorder,
                    borderWidth: 1
                },
                {
                    label: 'Enriched',
                    data: enrichedData,
                    backgroundColor: COLORS.enriched,
                    borderColor: COLORS.enrichedBorder,
                    borderWidth: 1
                },
                {
                    label: 'Varied',
                    data: variedData,
                    backgroundColor: COLORS.varied,
                    borderColor: COLORS.variedBorder,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Bacteria Genus'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Total Study Count'
                    }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    const element = elements[0];
                    const bacteriaName = labels[element.index];
                    // Find all associations for this bacteria
                    const bacteriaAssocs = filtered.filter(a => a.bacteria === bacteriaName);
                    if (bacteriaAssocs.length > 0) {
                        showBarChartDetails(bacteriaName, bacteriaAssocs, bacteriaCounts[bacteriaName]);
                    }
                }
            }
        }
    });
}

function showBarChartDetails(bacteria, associations, counts) {
    const detailsDiv = document.getElementById('association-details');
    const contentDiv = document.getElementById('details-content');

    detailsDiv.classList.remove('hidden');

    const totalStudies = counts.beneficial + counts.enriched + counts.varied;
    const conditionsList = associations.map(a => a.condition).join(', ');

    contentDiv.innerHTML = '';

    const bacteriaP = document.createElement('p');
    bacteriaP.innerHTML = '<strong>Bacteria:</strong> ';
    bacteriaP.appendChild(document.createTextNode(bacteria));
    contentDiv.appendChild(bacteriaP);

    const totalP = document.createElement('p');
    totalP.innerHTML = `<strong>Total Studies:</strong> ${totalStudies}`;
    contentDiv.appendChild(totalP);

    const breakdownP = document.createElement('p');
    breakdownP.innerHTML = `<strong>Breakdown:</strong> ${counts.beneficial} beneficial/depleted, ${counts.enriched} enriched, ${counts.varied} varied`;
    contentDiv.appendChild(breakdownP);

    const conditionsP = document.createElement('p');
    conditionsP.innerHTML = '<strong>Associated Conditions:</strong> ';
    conditionsP.appendChild(document.createTextNode(conditionsList));
    contentDiv.appendChild(conditionsP);
}

function createHeatmap(data, conditionFilter = 'all', bacteriaFilter = 'all') {
    const ctx = document.getElementById('main-chart').getContext('2d');

    let bacteria = data.bacteria;
    let conditions = data.conditions;

    if (bacteriaFilter !== 'all') {
        bacteria = [bacteriaFilter];
    }
    if (conditionFilter !== 'all') {
        conditions = [conditionFilter];
    }

    // Create matrix
    const matrix = [];
    bacteria.forEach((b, bIndex) => {
        conditions.forEach((c, cIndex) => {
            const assoc = data.associations.find(a => a.bacteria === b && a.condition === c);
            if (assoc) {
                matrix.push({
                    x: bIndex,
                    y: cIndex,
                    v: assoc.study_count,
                    effect: assoc.effect,
                    bacteria: b,
                    condition: c,
                    pmids: assoc.pmids
                });
            }
        });
    });

    // Calculate min/max for intensity scaling
    const studyCounts = matrix.map(m => m.v);
    const minCount = Math.min(...studyCounts);
    const maxCount = Math.max(...studyCounts);

    // Helper to calculate opacity based on study count (0.3 to 1.0 range)
    function getIntensity(count) {
        if (maxCount === minCount) return 0.7;
        return 0.3 + (0.7 * (count - minCount) / (maxCount - minCount));
    }

    // Helper to apply intensity to a color
    function applyIntensity(baseColor, intensity) {
        // Parse rgba color and adjust alpha
        const match = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
            const r = match[1], g = match[2], b = match[3];
            return `rgba(${r}, ${g}, ${b}, ${intensity})`;
        }
        return baseColor;
    }

    // Use scatter chart with colored points to simulate heatmap
    const heatmapData = matrix.map(m => ({
        x: m.x,
        y: m.y,
        r: 18,
        ...m
    }));

    if (mainChart) {
        mainChart.destroy();
    }

    mainChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: heatmapData,
                backgroundColor: heatmapData.map(d => {
                    const colors = getEffectColor(d.effect);
                    const intensity = getIntensity(d.v);
                    return applyIntensity(colors.bg, intensity);
                }),
                borderColor: heatmapData.map(d => {
                    const colors = getEffectColor(d.effect);
                    return colors.border;
                }),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const d = context.raw;
                            return [
                                `${d.bacteria} - ${d.condition}`,
                                `Studies: ${d.v}`,
                                `Effect: ${d.effect}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: -0.5,
                    max: bacteria.length - 0.5,
                    ticks: {
                        callback: function(value) {
                            return bacteria[Math.round(value)] || '';
                        },
                        maxRotation: 45,
                        minRotation: 45
                    },
                    title: {
                        display: true,
                        text: 'Bacteria Genus'
                    }
                },
                y: {
                    type: 'linear',
                    min: -0.5,
                    max: conditions.length - 0.5,
                    ticks: {
                        callback: function(value) {
                            return conditions[Math.round(value)] || '';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Condition'
                    }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    const element = elements[0];
                    const index = element.index;
                    const point = heatmapData[index];
                    showAssociationDetails({
                        bacteria: point.bacteria,
                        condition: point.condition,
                        count: point.v,
                        effect: point.effect,
                        pmids: point.pmids
                    });
                }
            }
        }
    });
}

function updateChart() {
    const chartType = document.getElementById('chart-type').value;
    const conditionFilter = document.getElementById('condition-filter').value;
    const bacteriaFilter = document.getElementById('bacteria-filter').value;

    switch (chartType) {
        case 'bubble':
            createBubbleChart(bacteriaConditionsData, conditionFilter, bacteriaFilter);
            break;
        case 'bar':
            createBarChart(bacteriaConditionsData, conditionFilter, bacteriaFilter);
            break;
        case 'heatmap':
            createHeatmap(bacteriaConditionsData, conditionFilter, bacteriaFilter);
            break;
    }
}

function showAssociationDetails(point) {
    const detailsDiv = document.getElementById('association-details');
    const contentDiv = document.getElementById('details-content');

    detailsDiv.classList.remove('hidden');

    const effectDescription = {
        'beneficial': 'This bacterium shows beneficial effects or is typically depleted in this condition.',
        'depleted': 'This bacterium is typically found at lower levels in individuals with this condition.',
        'enriched': 'This bacterium is typically found at higher levels in individuals with this condition.',
        'varied': 'Results vary across studies - effects may depend on strain or context.'
    };

    // Clear content and build safely
    contentDiv.innerHTML = '';

    // Bacteria
    const bacteriaP = document.createElement('p');
    bacteriaP.innerHTML = '<strong>Bacteria:</strong> ';
    bacteriaP.appendChild(document.createTextNode(point.bacteria));
    contentDiv.appendChild(bacteriaP);

    // Condition
    const conditionP = document.createElement('p');
    conditionP.innerHTML = '<strong>Condition:</strong> ';
    conditionP.appendChild(document.createTextNode(point.condition));
    contentDiv.appendChild(conditionP);

    // Study count
    const countP = document.createElement('p');
    countP.innerHTML = `<strong>Number of Studies:</strong> ${parseInt(point.count, 10)}`;
    contentDiv.appendChild(countP);

    // Effect
    const effectP = document.createElement('p');
    effectP.innerHTML = '<strong>Effect:</strong> ';
    effectP.appendChild(document.createTextNode(point.effect));
    contentDiv.appendChild(effectP);

    // Effect description
    if (effectDescription[point.effect]) {
        const descP = document.createElement('p');
        descP.textContent = effectDescription[point.effect];
        contentDiv.appendChild(descP);
    }

    // References (PMIDs are validated as numeric IDs)
    if (point.pmids && point.pmids.length > 0) {
        const refsP = document.createElement('p');
        refsP.innerHTML = '<strong>Key References:</strong> ';
        point.pmids.forEach((id, index) => {
            // Validate PMID is numeric
            const pmid = String(id).replace(/\D/g, '');
            if (pmid) {
                const link = document.createElement('a');
                link.href = `https://pubmed.ncbi.nlm.nih.gov/${pmid}`;
                link.target = '_blank';
                link.textContent = `PMID: ${pmid}`;
                if (index > 0) {
                    refsP.appendChild(document.createTextNode(', '));
                }
                refsP.appendChild(link);
            }
        });
        contentDiv.appendChild(refsP);
    }
}

// ===== Species Cards =====
function renderSpeciesCards() {
    const grid = document.getElementById('species-grid');
    grid.innerHTML = '';

    speciesData.forEach(species => {
        const card = document.createElement('div');
        card.className = 'species-card';

        const researchClass = species.research_strength.toLowerCase();

        card.innerHTML = `
            <span class="nickname">${species.nickname}</span>
            <h3>${species.name}</h3>
            <p class="description">${species.description}</p>
            <div class="findings">
                <h4>Key Findings:</h4>
                <ul>
                    ${species.key_findings.map(f => `<li>${f}</li>`).join('')}
                </ul>
            </div>
            <div class="tags">
                ${species.mental_health_associations.map(a =>
                    `<span class="tag condition">${a}</span>`
                ).join('')}
            </div>
            <span class="research-badge ${researchClass}">
                ${species.research_strength} Evidence
            </span>
        `;

        grid.appendChild(card);
    });
}

// ===== Diet Section =====
function createDietChart() {
    const ctx = document.getElementById('diet-chart').getContext('2d');

    // Count bacteria associations per diet
    const labels = dietData.map(d => d.diet_factor);
    const increasedCounts = dietData.map(d => d.bacteria_increased.length);
    const decreasedCounts = dietData.map(d => d.bacteria_decreased.length);

    if (dietChart) {
        dietChart.destroy();
    }

    dietChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Bacteria Increased',
                    data: increasedCounts,
                    backgroundColor: COLORS.beneficial,
                    borderColor: COLORS.beneficialBorder,
                    borderWidth: 1
                },
                {
                    label: 'Bacteria Decreased',
                    data: decreasedCounts,
                    backgroundColor: COLORS.enriched,
                    borderColor: COLORS.enrichedBorder,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Diet Impact on Gut Bacteria'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Number of Bacteria Genera Affected'
                    }
                }
            }
        }
    });
}

function renderDietCards() {
    const container = document.getElementById('diet-cards');
    container.innerHTML = '';

    dietData.forEach(diet => {
        const card = document.createElement('div');

        // Determine card type based on mental health impact
        let cardClass = 'neutral';
        let impactClass = 'neutral';
        let impactIcon = '~';

        if (diet.mental_health_impact.toLowerCase().includes('positive')) {
            cardClass = 'positive';
            impactClass = 'positive';
            impactIcon = '+';
        } else if (diet.mental_health_impact.toLowerCase().includes('negative')) {
            cardClass = 'negative';
            impactClass = 'negative';
            impactIcon = '-';
        }

        card.className = `diet-card ${cardClass}`;

        card.innerHTML = `
            <h3>${escapeHtml(diet.diet_factor)}</h3>
            <p class="diet-description">${escapeHtml(diet.description)}</p>
            <div class="impact ${impactClass}">
                <span class="impact-icon">${impactIcon}</span>
                <span>${escapeHtml(diet.mental_health_impact)}</span>
            </div>
            <p class="mechanism"><strong>Mechanism:</strong> ${escapeHtml(diet.mechanism)}</p>
            ${diet.bacteria_increased.length > 0 ?
                `<p class="bacteria-list"><strong>Increases:</strong> ${diet.bacteria_increased.map(b => escapeHtml(b)).join(', ')}</p>` : ''}
            ${diet.bacteria_decreased.length > 0 ?
                `<p class="bacteria-list"><strong>Decreases:</strong> ${diet.bacteria_decreased.map(b => escapeHtml(b)).join(', ')}</p>` : ''}
            ${diet.note ? `<p class="diet-note"><em>${escapeHtml(diet.note)}</em></p>` : ''}
        `;

        container.appendChild(card);
    });
}

// ===== Event Listeners =====
function setupEventListeners() {
    document.getElementById('condition-filter').addEventListener('change', updateChart);
    document.getElementById('bacteria-filter').addEventListener('change', updateChart);
    document.getElementById('chart-type').addEventListener('change', updateChart);
}

// ===== Initialization =====
async function init() {
    // Show loading state
    const chartContainer = document.querySelector('.chart-container');
    chartContainer.innerHTML = '<div class="loading">Loading data</div><canvas id="main-chart"></canvas>';

    const loaded = await loadData();

    if (!loaded) {
        chartContainer.innerHTML = '<p style="text-align: center; color: #e63946;">Error loading data. Please ensure data files exist.</p>';
        return;
    }

    // Remove loading state
    chartContainer.innerHTML = '<canvas id="main-chart"></canvas>';

    // Initialize all components
    populateFilters();
    setupEventListeners();
    createBubbleChart(bacteriaConditionsData);
    renderSpeciesCards();
    createDietChart();
    renderDietCards();

    console.log('GutBrain Explorer initialized successfully!');
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
