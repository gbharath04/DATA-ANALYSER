let buildingData = [];

// Fetch and parse the CSV data
async function loadData() {
    try {
        const response = await fetch('building_data_clustered.csv');
        const csvText = await response.text();
        const rows = csvText.split('\n');
        const headers = rows[0].split(',').map(h => h.trim());
        
        buildingData = rows.slice(1).map(row => {
            const values = row.split(',');
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index];
                return obj;
            }, {});
        });
        // Debug: log the keys of the first row
        if (buildingData.length > 0) {
            console.log('First row keys:', Object.keys(buildingData[0]));
        }

        initializeDashboard();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function initializeDashboard() {
    populateFilters();
    updateMetrics();
    displayBuildings();
}

function populateFilters() {
    const areas = [...new Set(buildingData.map(b => b.Area))];
    const types = [...new Set(buildingData.map(b => b.Building_Type))];
    const statuses = [...new Set(buildingData.map(b => b.Building_Status))];
    const years = [...new Set(buildingData.map(b => b.Construction_Year))].sort((a, b) => b - a);

    const areaFilter = document.getElementById('areaFilter');
    const typeFilter = document.getElementById('buildingTypeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const yearFilter = document.getElementById('yearFilter');

    areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        areaFilter.appendChild(option);
    });

    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });

    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        statusFilter.appendChild(option);
    });

    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });

    // Add event listeners for filters
    [areaFilter, typeFilter, statusFilter, yearFilter].forEach(filter => {
        filter.addEventListener('change', () => {
            updateMetrics();
            displayBuildings();
        });
    });
}

function updateMetrics() {
    const filteredData = getFilteredData();
    
    // Calculate averages
    const avgEnergy = filteredData.reduce((sum, b) => sum + parseFloat(b.Energy_Consumption_Per_SqM), 0) / filteredData.length;
    const avgWater = filteredData.reduce((sum, b) => sum + parseFloat(b.Water_Usage_Per_Building), 0) / filteredData.length;
    const avgRecycling = filteredData.reduce((sum, b) => sum + parseFloat(b.Waste_Recycled_Percentage), 0) / filteredData.length;
    const avgOccupancy = filteredData.reduce((sum, b) => sum + parseFloat(b.Occupancy_Rate), 0) / filteredData.length;

    // Update metric cards
    document.getElementById('avgEnergy').textContent = avgEnergy.toFixed(2);
    document.getElementById('avgWater').textContent = avgWater.toFixed(2);
    document.getElementById('avgRecycling').textContent = avgRecycling.toFixed(2);
    document.getElementById('avgOccupancy').textContent = avgOccupancy.toFixed(2);
}

function displayBuildings() {
    const filteredData = getFilteredData();
    const buildingCards = document.getElementById('buildingCards');
    buildingCards.innerHTML = '';

    filteredData.forEach(building => {
        if (!building.Building_Status) {
            console.log('Skipping row with missing status:', building);
            return;
        }
        const card = document.createElement('div');
        card.className = 'building-card';
        
        const statusClass = building.Building_Status.toLowerCase().replace(' ', '-');
        const priorityClass = building.Maintenance_Priority.toLowerCase();
        const clusterLabel = `<span class="cluster-label cluster-${building.Cluster}">Cluster ${building.Cluster}</span>`;
        
        card.innerHTML = `
            <h3>${building.Area} - ${building.Building_Type} ${clusterLabel}</h3>
            <p>Construction Year: ${building.Construction_Year}</p>
            <p>Floors: ${building.Number_of_Floors}</p>
            <p>Residents: ${building.Number_of_Residents}</p>
            <p>Energy Consumption: ${building.Energy_Consumption_Per_SqM} kWh/m²</p>
            <p>Water Usage: ${building.Water_Usage_Per_Building} L</p>
            <p>Waste Recycling: ${building.Waste_Recycled_Percentage}%</p>
            <p>Occupancy Rate: ${building.Occupancy_Rate}%</p>
            <p>Air Quality: ${building.Indoor_Air_Quality}</p>
            <p>Smart Devices: ${building.Smart_Devices_Count}</p>
            <p>Green Certified: ${building.Green_Certified ? 'Yes' : 'No'}</p>
            <div class="status-indicator status-${statusClass}">${building.Building_Status}</div>
            <div class="priority-indicator priority-${priorityClass}"></div>
            <span>${building.Maintenance_Priority} Priority</span>
        `;
        
        buildingCards.appendChild(card);
    });
}

function getFilteredData() {
    const areaFilter = document.getElementById('areaFilter').value;
    const typeFilter = document.getElementById('buildingTypeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const yearFilter = document.getElementById('yearFilter').value;
    const clusterFilter = document.getElementById('clusterFilter')?.value;
    const priorityFilter = document.getElementById('priorityFilter')?.value;
    const greenFilter = document.getElementById('greenFilter')?.value;
    const minFloors = parseInt(document.getElementById('minFloors')?.value || '');
    const maxFloors = parseInt(document.getElementById('maxFloors')?.value || '');
    const minDevices = parseInt(document.getElementById('minDevices')?.value || '');
    const maxDevices = parseInt(document.getElementById('maxDevices')?.value || '');
    const minOccupancy = parseFloat(document.getElementById('minOccupancy')?.value || '');
    const maxOccupancy = parseFloat(document.getElementById('maxOccupancy')?.value || '');
    const minEnergy = parseFloat(document.getElementById('minEnergy')?.value || '');
    const maxEnergy = parseFloat(document.getElementById('maxEnergy')?.value || '');

    return buildingData.filter(building => {
        // Debug log for cluster filtering
        console.log('Row:', building.Cluster, 'Filter:', clusterFilter, 'Match:', (clusterFilter === "" || Number(building.Cluster) === Number(clusterFilter)));
        return (!areaFilter || building.Area === areaFilter) &&
               (!typeFilter || building.Building_Type === typeFilter) &&
               (!statusFilter || building.Building_Status === statusFilter) &&
               (!yearFilter || building.Construction_Year === yearFilter) &&
               (clusterFilter === "" || Number(building.Cluster) === Number(clusterFilter))
               && (!priorityFilter || building.Maintenance_Priority === priorityFilter)
               && (!greenFilter || building.Green_Certified === greenFilter)
               && (!minFloors || parseInt(building.Number_of_Floors) >= minFloors)
               && (!maxFloors || parseInt(building.Number_of_Floors) <= maxFloors)
               && (!minDevices || parseInt(building.Smart_Devices_Count) >= minDevices)
               && (!maxDevices || parseInt(building.Smart_Devices_Count) <= maxDevices)
               && (!minOccupancy || parseFloat(building.Occupancy_Rate) >= minOccupancy)
               && (!maxOccupancy || parseFloat(building.Occupancy_Rate) <= maxOccupancy)
               && (!minEnergy || parseFloat(building.Energy_Consumption_Per_SqM) >= minEnergy)
               && (!maxEnergy || parseFloat(building.Energy_Consumption_Per_SqM) <= maxEnergy);
    });
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // Manualize cluster filter: only update on button click
    const loadClusterBtn = document.getElementById('loadClusterBtn');
    if (loadClusterBtn) {
        loadClusterBtn.addEventListener('click', () => {
            updateMetrics();
            displayBuildings();
        });
    }

    // View Visual Analytics button logic
    const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');
    if (viewAnalyticsBtn) {
        viewAnalyticsBtn.addEventListener('click', () => {
            // Save current filters to localStorage
            const filters = {
                area: document.getElementById('areaFilter').value,
                type: document.getElementById('buildingTypeFilter').value,
                status: document.getElementById('statusFilter').value,
                year: document.getElementById('yearFilter').value,
                cluster: document.getElementById('clusterFilter').value,
                priority: document.getElementById('priorityFilter').value,
                green: document.getElementById('greenFilter').value,
                minFloors: document.getElementById('minFloors').value,
                maxFloors: document.getElementById('maxFloors').value,
                minDevices: document.getElementById('minDevices').value,
                maxDevices: document.getElementById('maxDevices').value,
                minOccupancy: document.getElementById('minOccupancy').value,
                maxOccupancy: document.getElementById('maxOccupancy').value,
                minEnergy: document.getElementById('minEnergy').value,
                maxEnergy: document.getElementById('maxEnergy').value
            };
            localStorage.setItem('buildingFilters', JSON.stringify(filters));
            window.location.href = 'navigation.html';
        });
    }

    // + Filter icon logic
    const extraFilterBtn = document.getElementById('extraFilterBtn');
    const extraFiltersDiv = document.getElementById('extraFilters');
    if (extraFilterBtn && extraFiltersDiv) {
        extraFilterBtn.addEventListener('click', () => {
            if (extraFiltersDiv.style.display === 'none') {
                extraFiltersDiv.style.display = 'flex';
            } else {
                extraFiltersDiv.style.display = 'none';
            }
        });
    }
}); 