let buildingData = [];
let filteredData = null;

// Helper to get all unique values for a field
function getUniqueValues(data, field) {
    return [...new Set(data.map(item => item[field]).filter(Boolean))];
}

// Populate filter dropdowns
function populateNavFilters() {
    const areaSelect = document.getElementById('areaFilterNav');
    const typeSelect = document.getElementById('buildingTypeFilterNav');
    const statusSelect = document.getElementById('statusFilterNav');
    const yearSelect = document.getElementById('yearFilterNav');

    // Clear existing options except the first
    [areaSelect, typeSelect, statusSelect, yearSelect].forEach(select => {
        if (select) {
            while (select.options.length > 1) select.remove(1);
        }
    });

    getUniqueValues(buildingData, 'Area').forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        areaSelect.appendChild(opt);
    });
    getUniqueValues(buildingData, 'Building_Type').forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        typeSelect.appendChild(opt);
    });
    getUniqueValues(buildingData, 'Building_Status').forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        statusSelect.appendChild(opt);
    });
    getUniqueValues(buildingData, 'Construction_Year').sort((a, b) => b - a).forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        yearSelect.appendChild(opt);
    });
}

// Get filter values from sidebar
function getSidebarFilters() {
    const filters = {
        area: document.getElementById('areaFilterNav')?.value || '',
        type: document.getElementById('buildingTypeFilterNav')?.value || '',
        status: document.getElementById('statusFilterNav')?.value || '',
        year: document.getElementById('yearFilterNav')?.value || '',
        priority: document.getElementById('priorityFilterNav')?.value || '',
        green: document.getElementById('greenFilterNav')?.value || '',
        minFloors: document.getElementById('minFloorsNav')?.value || '',
        maxFloors: document.getElementById('maxFloorsNav')?.value || '',
        minDevices: document.getElementById('minDevicesNav')?.value || '',
        maxDevices: document.getElementById('maxDevicesNav')?.value || '',
        minOccupancy: document.getElementById('minOccupancyNav')?.value || '',
        maxOccupancy: document.getElementById('maxOccupancyNav')?.value || '',
        minEnergy: document.getElementById('minEnergyNav')?.value || '',
        maxEnergy: document.getElementById('maxEnergyNav')?.value || ''
    };
    console.log('Current filters:', filters); // Debug log
    return filters;
}

function filterDataWith(filters) {
    return buildingData.filter(b => {
        return (!filters.area || b.Area === filters.area) &&
            (!filters.type || b.Building_Type === filters.type) &&
            (!filters.status || b.Building_Status === filters.status) &&
            (!filters.year || b.Construction_Year === filters.year) &&
            (!filters.priority || b.Maintenance_Priority === filters.priority) &&
            (!filters.green || b.Green_Certified === filters.green) &&
            (!filters.minFloors || parseInt(b.Number_of_Floors) >= parseInt(filters.minFloors)) &&
            (!filters.maxFloors || parseInt(b.Number_of_Floors) <= parseInt(filters.maxFloors)) &&
            (!filters.minDevices || parseInt(b.Smart_Devices_Count) >= parseInt(filters.minDevices)) &&
            (!filters.maxDevices || parseInt(b.Smart_Devices_Count) <= parseInt(filters.maxDevices)) &&
            (!filters.minOccupancy || parseFloat(b.Occupancy_Rate) >= parseFloat(filters.minOccupancy)) &&
            (!filters.maxOccupancy || parseFloat(b.Occupancy_Rate) <= parseFloat(filters.maxOccupancy)) &&
            (!filters.minEnergy || parseFloat(b.Energy_Consumption_Per_SqM) >= parseFloat(filters.minEnergy)) &&
            (!filters.maxEnergy || parseFloat(b.Energy_Consumption_Per_SqM) <= parseFloat(filters.maxEnergy)) &&
            (!filters.cluster || String(b.Cluster) === String(filters.cluster));
    });
}

// Chart instances for updating
let chartRefs = {};

function destroyCharts() {
    Object.values(chartRefs).forEach(chart => chart && chart.destroy());
    chartRefs = {};
}

function createVisualizations() {
    destroyCharts();
    chartRefs.age = createAgeDistributionChart();
    chartRefs.energy = createEnergyConsumptionChart();
    chartRefs.status = createStatusChart();
    chartRefs.area = createAreaDistributionChart();
}

function createAgeDistributionChart(data = null, title = 'Building Age Distribution') {
    const ctx = document.getElementById('ageDistributionChart').getContext('2d');
    const chartData = data || filteredData || buildingData;
    const yearGroups = chartData.reduce((acc, building) => {
        const year = building.Construction_Year;
        acc[year] = (acc[year] || 0) + 1;
        return acc;
    }, {});
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(yearGroups).sort(),
            datasets: [{
                label: 'Number of Buildings',
                data: Object.values(yearGroups),
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Buildings'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Construction Year'
                    }
                }
            }
        }
    });
}

function createEnergyConsumptionChart(data = null, title = 'Energy Consumption by Building Type') {
    const ctx = document.getElementById('energyConsumptionChart').getContext('2d');
    const chartData = data || filteredData || buildingData;
    const typeGroups = chartData.reduce((acc, building) => {
        const type = building.Building_Type;
        if (!acc[type]) {
            acc[type] = { sum: 0, count: 0 };
        }
        acc[type].sum += parseFloat(building.Energy_Consumption_Per_SqM);
        acc[type].count++;
        return acc;
    }, {});
    const avgEnergyByType = Object.entries(typeGroups).map(([type, data]) => ({
        type,
        avg: data.sum / data.count
    }));
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: avgEnergyByType.map(d => d.type),
            datasets: [{
                label: 'Average Energy Consumption (kWh/m²)',
                data: avgEnergyByType.map(d => d.avg),
                backgroundColor: [
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(155, 89, 182, 0.7)'
                ],
                borderColor: [
                    'rgba(46, 204, 113, 1)',
                    'rgba(52, 152, 219, 1)',
                    'rgba(155, 89, 182, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Average Energy Consumption (kWh/m²)'
                    }
                }
            }
        }
    });
}

function createStatusChart(data = null, title = 'Building Status Overview') {
    const ctx = document.getElementById('statusChart').getContext('2d');
    const chartData = data || filteredData || buildingData;
    const statusCounts = chartData.reduce((acc, building) => {
        const status = building.Building_Status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    return new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    'rgba(46, 204, 113, 0.7)',  // Operational
                    'rgba(241, 196, 15, 0.7)',  // Under Maintenance
                    'rgba(231, 76, 60, 0.7)'    // Closed
                ],
                borderColor: [
                    'rgba(46, 204, 113, 1)',
                    'rgba(241, 196, 15, 1)',
                    'rgba(231, 76, 60, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function createAreaDistributionChart(data = null, title = 'Area-wise Building Distribution') {
    const ctx = document.getElementById('areaDistributionChart').getContext('2d');
    const chartData = data || filteredData || buildingData;
    const areaCounts = chartData.reduce((acc, building) => {
        const area = building.Area;
        acc[area] = (acc[area] || 0) + 1;
        return acc;
    }, {});
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(areaCounts),
            datasets: [{
                label: 'Number of Buildings',
                data: Object.values(areaCounts),
                backgroundColor: 'rgba(155, 89, 182, 0.7)',
                borderColor: 'rgba(155, 89, 182, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title
                }
            },
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Buildings'
                    }
                }
            }
        }
    });
}

// Apply filters and update charts
function applySidebarFilters() {
    try {
        console.log('Applying filters...');
        const filters = getSidebarFilters();
        filteredData = filterDataWith(filters);
        console.log('Filtered data count:', filteredData.length);
        createVisualizations();
        console.log('Visualizations updated');
    } catch (error) {
        console.error('Error applying filters:', error);
    }
}

// Reset filters and update charts
function resetSidebarFilters() {
    // Reset all filter fields
    [
        'areaFilterNav','buildingTypeFilterNav','statusFilterNav','yearFilterNav','priorityFilterNav','greenFilterNav',
        'minFloorsNav','maxFloorsNav','minDevicesNav','maxDevicesNav','minOccupancyNav','maxOccupancyNav','minEnergyNav','maxEnergyNav',
        'clusterFilterNav'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    filteredData = null;
    createVisualizations();
}

// On page load
async function loadData() {
    try {
        console.log('Loading data...');
        const response = await fetch('building_data_clustered.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        const rows = csvText.split('\n');
        const headers = rows[0].split(',').map(h => h.trim());
        buildingData = rows.slice(1).map(row => {
            const values = row.split(',');
            if (values.length !== headers.length) {
                console.warn('Skipping malformed row:', row);
                return null;
            }
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index];
                return obj;
            }, {});
        }).filter(Boolean); // remove nulls
        
        console.log('Data loaded successfully. Row count:', buildingData.length);
        if (buildingData.length > 0) {
            console.log('First row keys:', Object.keys(buildingData[0]));
        }
        
        populateNavFilters();
        filteredData = null;
        createVisualizations();
        populatePredictionDropdowns();
        populateRecommendationDropdowns();
        console.log('Initial visualizations created');
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Please check the console for details.');
    }
}

// Populate prediction form dropdowns
function populatePredictionDropdowns() {
    const buildingTypes = getUniqueValues(buildingData, 'Building_Type');
    const areas = getUniqueValues(buildingData, 'Area');
    
    const typeSelect = document.getElementById('predBuildingType');
    const areaSelect = document.getElementById('predArea');
    
    buildingTypes.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        typeSelect.appendChild(opt);
    });
    
    areas.forEach(area => {
        const opt = document.createElement('option');
        opt.value = area;
        opt.textContent = area;
        areaSelect.appendChild(opt);
    });
}

// Populate recommendation form dropdowns
function populateRecommendationDropdowns() {
    const buildingTypes = getUniqueValues(buildingData, 'Building_Type');
    const typeSelect = document.getElementById('recBuildingType');
    buildingTypes.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        typeSelect.appendChild(opt);
    });
}

// Handle prediction form submission (now suitability check)
async function handlePredictionSubmit(event) {
    event.preventDefault();
    const formData = {
        Building_Type: document.getElementById('predBuildingType').value,
        Area: document.getElementById('predArea').value,
        Number_of_Floors: parseInt(document.getElementById('predFloors').value)
    };
    try {
        const response = await fetch('http://localhost:5000/check_suitability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        if (!response.ok) throw new Error('Suitability request failed');
        const result = await response.json();
        document.getElementById('suitabilityMessage').textContent = result.message;
        if (typeof result.existing_count !== 'undefined') {
            document.getElementById('existingCount').textContent = result.existing_count;
            document.getElementById('existingCountContainer').style.display = 'block';
        } else {
            document.getElementById('existingCountContainer').style.display = 'none';
        }
        document.getElementById('predictionResults').style.display = 'block';
    } catch (error) {
        alert('Error checking suitability. Please try again.');
    }
}

// Handle recommendation form submission
async function handleRecommendationSubmit(event) {
    event.preventDefault();
    const buildingType = document.getElementById('recBuildingType').value;
    const outcome = document.getElementById('recOutcome').value;
    try {
        const response = await fetch('http://localhost:5000/recommend_area', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ building_type: buildingType, outcome })
        });
        if (!response.ok) throw new Error('Recommendation request failed');
        const result = await response.json();
        const recAreaList = document.getElementById('recAreaList');
        recAreaList.innerHTML = result.areas.map(area => `<div>${area}</div>`).join('');
        document.getElementById('recommendationResults').style.display = 'block';
    } catch (error) {
        alert('Error making recommendation. Please try again.');
    }
}

// Model Metrics Modal Logic
function showMetricsModal() {
    const modal = document.getElementById('metricsModal');
    const content = document.getElementById('metricsContent');
    modal.style.display = 'flex';
    content.innerHTML = '<div>Loading...</div>';
    fetch('http://localhost:5000/model_metrics')
        .then(res => res.json())
        .then(metrics => {
            if (metrics.error) {
                content.innerHTML = '<div style="color:red;">Error loading metrics.</div>';
                return;
            }
            content.innerHTML = `
                <table>
                    <tr><th>Model</th><th>MAE</th><th>MSE</th><th>R²</th></tr>
                    <tr><td>Energy Consumption</td><td>${metrics.energy.mae.toFixed(2)}</td><td>${metrics.energy.mse.toFixed(2)}</td><td>${metrics.energy.r2.toFixed(3)}</td></tr>
                    <tr><td>Occupancy Rate</td><td>${metrics.occupancy.mae.toFixed(2)}</td><td>${metrics.occupancy.mse.toFixed(2)}</td><td>${metrics.occupancy.r2.toFixed(3)}</td></tr>
                </table>
                <div style="margin-top:1rem;font-size:0.95rem;color:#666;">
                    <b>MAE</b>: Mean Absolute Error &nbsp; <b>MSE</b>: Mean Squared Error &nbsp; <b>R²</b>: Coefficient of Determination
                </div>
            `;
        })
        .catch(() => {
            content.innerHTML = '<div style="color:red;">Error loading metrics.</div>';
        });
}
function hideMetricsModal() {
    document.getElementById('metricsModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    document.getElementById('applyFiltersNav').onclick = applySidebarFilters;
    document.getElementById('resetBtnNav').onclick = resetSidebarFilters;
    document.getElementById('predictionForm').addEventListener('submit', handlePredictionSubmit);
    document.getElementById('recommendationForm').addEventListener('submit', handleRecommendationSubmit);
    // Toggle extra filters
    const toggleBtn = document.getElementById('toggleExtraFilters');
    const extraFilters = document.getElementById('extraFiltersNav');
    let extraVisible = false;
    toggleBtn.onclick = () => {
        extraVisible = !extraVisible;
        extraFilters.style.display = extraVisible ? 'flex' : 'none';
        toggleBtn.textContent = extraVisible ? '–' : '+';
        toggleBtn.title = extraVisible ? 'Hide extra filters' : 'Show more filters';
    };
    document.getElementById('metricsInfoIcon').onclick = showMetricsModal;
    document.getElementById('metricsModalClose').onclick = hideMetricsModal;
    document.getElementById('metricsModal').onclick = function(e) {
        if (e.target === this) hideMetricsModal();
    };
}); 