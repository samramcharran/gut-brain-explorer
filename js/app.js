/**
 * Gut-Brain Explorer - Interactive Dashboard
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

// ===== Age Filter Helpers =====
function matchesAgeFilter(association, ageFilter) {
    if (ageFilter === 'all') return true;
    if (!association.age_ranges || association.age_ranges.length === 0) {
        return false; // No age data = not highlighted
    }
    return association.age_ranges.includes(ageFilter);
}

function updateAgeFilterStatus(ageFilter) {
    const statusDiv = document.getElementById('age-filter-status');
    const labelSpan = document.getElementById('age-filter-label');
    if (ageFilter !== 'all') {
        statusDiv.classList.remove('hidden');
        labelSpan.textContent = ageFilter;
    } else {
        statusDiv.classList.add('hidden');
    }
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

function createBubbleChart(data, conditionFilter = 'all', bacteriaFilter = 'all', ageFilter = 'all') {
    const ctx = document.getElementById('main-chart').getContext('2d');

    // Filter data
    let filtered = data.associations;
    if (conditionFilter !== 'all') {
        filtered = filtered.filter(a => a.condition === conditionFilter);
    }
    if (bacteriaFilter !== 'all') {
        filtered = filtered.filter(a => a.bacteria === bacteriaFilter);
    }

    // Prepare bubble data with age highlighting
    const bubbleData = filtered.map(a => ({
        x: data.bacteria.indexOf(a.bacteria),
        y: data.conditions.indexOf(a.condition),
        r: Math.min(Math.sqrt(a.study_count) * 4 + 5, 25),
        bacteria: a.bacteria,
        condition: a.condition,
        count: a.study_count,
        effect: a.effect,
        pmids: a.pmids,
        age_ranges: a.age_ranges || [],
        ageHighlighted: matchesAgeFilter(a, ageFilter)
    }));

    // Group by effect for coloring
    const beneficialData = bubbleData.filter(d => d.effect === 'beneficial' || d.effect === 'depleted');
    const enrichedData = bubbleData.filter(d => d.effect === 'enriched');
    const variedData = bubbleData.filter(d => d.effect === 'varied');

    // Apply conditional styling based on age highlighting
    const applyAgeHighlighting = (dataArray, baseColor, baseBorder) => {
        if (ageFilter === 'all') {
            return {
                backgroundColor: baseColor,
                borderColor: baseBorder,
                borderWidth: 2
            };
        }
        return {
            backgroundColor: dataArray.map(d =>
                d.ageHighlighted ? baseColor : baseColor.replace(/[\d.]+\)$/, '0.2)')
            ),
            borderColor: dataArray.map(d =>
                d.ageHighlighted ? '#f77f00' : baseBorder.replace(/[\d.]+\)$/, '0.4)')
            ),
            borderWidth: dataArray.map(d => d.ageHighlighted ? 3 : 1)
        };
    };

    const chartData = {
        datasets: [
            {
                label: 'Beneficial/Depleted',
                data: beneficialData,
                ...applyAgeHighlighting(beneficialData, COLORS.beneficial, COLORS.beneficialBorder)
            },
            {
                label: 'Enriched',
                data: enrichedData,
                ...applyAgeHighlighting(enrichedData, COLORS.enriched, COLORS.enrichedBorder)
            },
            {
                label: 'Varied',
                data: variedData,
                ...applyAgeHighlighting(variedData, COLORS.varied, COLORS.variedBorder)
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
                        stepSize: 1,
                        callback: function(value) {
                            if (value < 0 || value >= data.bacteria.length) return '';
                            return data.bacteria[value] || '';
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
                        stepSize: 1,
                        callback: function(value) {
                            if (value < 0 || value >= data.conditions.length) return '';
                            return data.conditions[value] || '';
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

function createBarChart(data, conditionFilter = 'all', bacteriaFilter = 'all', ageFilter = 'all') {
    const ctx = document.getElementById('main-chart').getContext('2d');

    let filtered = data.associations;
    if (conditionFilter !== 'all') {
        filtered = filtered.filter(a => a.condition === conditionFilter);
    }
    if (bacteriaFilter !== 'all') {
        filtered = filtered.filter(a => a.bacteria === bacteriaFilter);
    }

    // Aggregate by bacteria, tracking age relevance
    const bacteriaCounts = {};
    const bacteriaHasAgeMatch = {};
    filtered.forEach(a => {
        if (!bacteriaCounts[a.bacteria]) {
            bacteriaCounts[a.bacteria] = { beneficial: 0, enriched: 0, varied: 0 };
            bacteriaHasAgeMatch[a.bacteria] = false;
        }
        if (a.effect === 'beneficial' || a.effect === 'depleted') {
            bacteriaCounts[a.bacteria].beneficial += a.study_count;
        } else if (a.effect === 'enriched') {
            bacteriaCounts[a.bacteria].enriched += a.study_count;
        } else {
            bacteriaCounts[a.bacteria].varied += a.study_count;
        }
        // Track if any association for this bacteria matches age filter
        if (matchesAgeFilter(a, ageFilter)) {
            bacteriaHasAgeMatch[a.bacteria] = true;
        }
    });

    const labels = Object.keys(bacteriaCounts).sort();
    const beneficialData = labels.map(b => bacteriaCounts[b].beneficial);
    const enrichedData = labels.map(b => bacteriaCounts[b].enriched);
    const variedData = labels.map(b => bacteriaCounts[b].varied);

    // Apply age-based highlighting to bar colors
    const getBarColors = (baseColor, baseBorder) => {
        if (ageFilter === 'all') {
            return {
                backgroundColor: baseColor,
                borderColor: baseBorder,
                borderWidth: 1
            };
        }
        return {
            backgroundColor: labels.map(b =>
                bacteriaHasAgeMatch[b] ? baseColor : baseColor.replace(/[\d.]+\)$/, '0.2)')
            ),
            borderColor: labels.map(b =>
                bacteriaHasAgeMatch[b] ? '#f77f00' : baseBorder.replace(/[\d.]+\)$/, '0.4)')
            ),
            borderWidth: labels.map(b => bacteriaHasAgeMatch[b] ? 2 : 1)
        };
    };

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
                    ...getBarColors(COLORS.beneficial, COLORS.beneficialBorder)
                },
                {
                    label: 'Enriched',
                    data: enrichedData,
                    ...getBarColors(COLORS.enriched, COLORS.enrichedBorder)
                },
                {
                    label: 'Varied',
                    data: variedData,
                    ...getBarColors(COLORS.varied, COLORS.variedBorder)
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

function createHeatmap(data, conditionFilter = 'all', bacteriaFilter = 'all', ageFilter = 'all') {
    // Replace canvas with HTML table-based heatmap for true grid appearance
    const chartContainer = document.querySelector('.chart-container');
    const canvas = document.getElementById('main-chart');

    if (mainChart) {
        mainChart.destroy();
        mainChart = null;
    }

    let bacteria = data.bacteria;
    let conditions = data.conditions;

    if (bacteriaFilter !== 'all') {
        bacteria = [bacteriaFilter];
    }
    if (conditionFilter !== 'all') {
        conditions = [conditionFilter];
    }

    // Build lookup map
    const assocMap = {};
    data.associations.forEach(a => {
        assocMap[`${a.bacteria}-${a.condition}`] = a;
    });

    // Calculate min/max for intensity scaling
    const studyCounts = data.associations.map(a => a.study_count);
    const minCount = Math.min(...studyCounts);
    const maxCount = Math.max(...studyCounts);

    function getIntensity(count) {
        if (maxCount === minCount) return 0.7;
        return 0.3 + (0.7 * (count - minCount) / (maxCount - minCount));
    }

    function getColorForEffect(effect, intensity) {
        const colors = {
            depleted: { r: 64, g: 145, b: 108 },   // green
            enriched: { r: 230, g: 57, b: 70 },     // red
            varied: { r: 157, g: 78, b: 221 }       // purple
        };
        const c = colors[effect] || colors.varied;
        return `rgba(${c.r}, ${c.g}, ${c.b}, ${intensity})`;
    }

    // Create HTML table heatmap
    let html = '<div class="heatmap-wrapper">';
    html += '<table class="heatmap-table"><thead><tr><th></th>';

    // Header row with bacteria names
    bacteria.forEach(b => {
        html += `<th class="heatmap-header-cell">${escapeHtml(b)}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Data rows
    conditions.forEach(condition => {
        html += `<tr><td class="heatmap-row-label">${escapeHtml(condition)}</td>`;
        bacteria.forEach(bact => {
            const key = `${bact}-${condition}`;
            const assoc = assocMap[key];
            if (assoc) {
                const intensity = getIntensity(assoc.study_count);
                const bgColor = getColorForEffect(assoc.effect, intensity);
                const textColor = intensity > 0.6 ? 'white' : 'inherit';

                // Age highlighting
                const isAgeRelevant = matchesAgeFilter(assoc, ageFilter);
                const highlightClass = (ageFilter !== 'all' && isAgeRelevant) ? ' age-highlighted' : '';
                const dimmedStyle = (ageFilter !== 'all' && !isAgeRelevant) ? 'opacity: 0.35;' : '';

                html += `<td class="heatmap-cell${highlightClass}" style="background-color: ${bgColor}; color: ${textColor}; ${dimmedStyle}"
                    data-bacteria="${escapeHtml(bact)}"
                    data-condition="${escapeHtml(condition)}"
                    data-count="${assoc.study_count}"
                    data-effect="${assoc.effect}"
                    data-pmids="${(assoc.pmids || []).join(',')}"
                    data-age-ranges="${(assoc.age_ranges || []).join(',')}"
                    title="${bact} + ${condition}: ${assoc.study_count} studies (${assoc.effect})">
                    ${assoc.study_count}
                </td>`;
            } else {
                html += '<td class="heatmap-cell heatmap-empty">-</td>';
            }
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    html += '<div class="heatmap-legend">';
    html += '<span class="heatmap-legend-item"><span class="heatmap-swatch" style="background: rgba(64,145,108,0.7)"></span> Depleted in condition<span class="legend-tooltip">This bacteria is typically found at lower levels in people with this condition. Often these are protective or beneficial species.</span></span>';
    html += '<span class="heatmap-legend-item"><span class="heatmap-swatch" style="background: rgba(230,57,70,0.7)"></span> Enriched in condition<span class="legend-tooltip">This bacteria is typically found at higher levels in people with this condition. May indicate dysbiosis or an imbalanced microbiome.</span></span>';
    html += '<span class="heatmap-legend-item"><span class="heatmap-swatch" style="background: rgba(157,78,221,0.7)"></span> Mixed results<span class="legend-tooltip">Research shows inconsistent results across studies. Effects may depend on specific strains, diet, or other factors.</span></span>';
    html += '<span class="heatmap-legend-note">Cell intensity shows number of studies (darker = more research)</span>';
    html += '</div></div>';

    // Replace chart container content
    chartContainer.innerHTML = html;

    // Add click handlers to cells
    chartContainer.querySelectorAll('.heatmap-cell:not(.heatmap-empty)').forEach(cell => {
        cell.addEventListener('click', function() {
            const pmidsStr = this.dataset.pmids;
            const ageRangesStr = this.dataset.ageRanges;
            showAssociationDetails({
                bacteria: this.dataset.bacteria,
                condition: this.dataset.condition,
                count: parseInt(this.dataset.count, 10),
                effect: this.dataset.effect,
                pmids: pmidsStr ? pmidsStr.split(',') : [],
                age_ranges: ageRangesStr ? ageRangesStr.split(',').filter(Boolean) : []
            });
        });
    });
}

// Restore canvas when switching away from heatmap
function restoreCanvas() {
    const chartContainer = document.querySelector('.chart-container');
    const existingCanvas = document.getElementById('main-chart');
    if (!existingCanvas) {
        chartContainer.innerHTML = '<canvas id="main-chart"></canvas>';
    }
}

function updateChart() {
    const chartType = document.getElementById('chart-type').value;
    const conditionFilter = document.getElementById('condition-filter').value;
    const bacteriaFilter = document.getElementById('bacteria-filter').value;
    const ageFilter = document.getElementById('age-filter').value;

    // Update age filter status indicator
    updateAgeFilterStatus(ageFilter);

    // Restore canvas if switching from heatmap to chart view
    if (chartType !== 'heatmap') {
        restoreCanvas();
    }

    switch (chartType) {
        case 'bubble':
            createBubbleChart(bacteriaConditionsData, conditionFilter, bacteriaFilter, ageFilter);
            break;
        case 'bar':
            createBarChart(bacteriaConditionsData, conditionFilter, bacteriaFilter, ageFilter);
            break;
        case 'heatmap':
            createHeatmap(bacteriaConditionsData, conditionFilter, bacteriaFilter, ageFilter);
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

    // Age groups studied
    const ageP = document.createElement('p');
    if (point.age_ranges && point.age_ranges.length > 0) {
        ageP.innerHTML = '<strong>Age Groups Studied:</strong> ';
        ageP.appendChild(document.createTextNode(point.age_ranges.join(', ')));
    } else {
        ageP.innerHTML = '<em>Age group data not available for these studies</em>';
        ageP.style.color = 'var(--text-muted)';
    }
    contentDiv.appendChild(ageP);
}

// ===== Species Cards =====
function renderSpeciesCards() {
    const grid = document.getElementById('species-grid');
    grid.innerHTML = '';

    speciesData.forEach(species => {
        const card = document.createElement('div');
        card.className = 'species-card';

        const researchClass = species.research_strength.toLowerCase();
        const pmid = species.pmid ? String(species.pmid).replace(/\D/g, '') : '';

        card.innerHTML = `
            <span class="nickname">${escapeHtml(species.nickname)}</span>
            <h3>${escapeHtml(species.name)}</h3>
            <p class="description">${escapeHtml(species.description)}</p>
            <div class="findings">
                <h4>Key Findings:</h4>
                <ul>
                    ${species.key_findings.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
                </ul>
            </div>
            <div class="tags">
                ${species.mental_health_associations.map(a =>
                    `<span class="tag condition">${escapeHtml(a)}</span>`
                ).join('')}
            </div>
            <div class="card-footer">
                <span class="research-badge ${researchClass}">
                    ${escapeHtml(species.research_strength)} Evidence
                </span>
                ${pmid ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${pmid}" target="_blank" class="reference-link">View Study (PMID: ${pmid})</a>` : ''}
            </div>
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

    // Set canvas height based on number of items (40px per bar)
    const chartContainer = document.querySelector('.diet-chart-container');
    const minHeight = Math.max(300, labels.length * 45 + 80);
    chartContainer.style.height = minHeight + 'px';

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
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 12
                        }
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
    document.getElementById('age-filter').addEventListener('change', updateChart);
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

    console.log('Gut-Brain Explorer initialized successfully!');
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
