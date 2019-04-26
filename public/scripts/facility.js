async function initViewer() {
    async function getAccessToken(callback) {
        const resp = await fetch('/api/auth/token');
        const json = await resp.json();
        const token = json.access_token;
        callback(token.access_token, token.expires_in);
    }
    await Autodesk.Viewing.Utilities.Initialize(document.getElementById('viewer'), getAccessToken);
    const viewer = NOP_VIEWER;
    viewer.loadExtension('IssuesExtension');
    viewer.loadExtension('HeatmapExtension');
    viewer.setQualityLevel(/* ambient shadows */ false, /* antialiasing */ true);
    viewer.setGroundShadow(true);
    viewer.setGroundReflection(false);
    viewer.setGhosting(true);
    viewer.setEnvMapBackground(false);
    viewer.setLightPreset(1);
    viewer.setSelectionColor(new THREE.Color(0xEBB30B));

    const geometryLoadedCallback = () => {
        viewer.removeEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, geometryLoadedCallback);
        //viewer.displayViewCube(true);
        //viewer.setViewCube('front, top, right');
        viewer.navigation.toOrthographic();
        viewer.fitToView();
    };
    viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, geometryLoadedCallback);
}

async function initSidebar(facility) {
    initModelsTable(facility);
    initCharts(facility);
    initTables(facility);

    // Prevent clicking inside the navigation dropdown from closing the dropdown
    $('#map').on('click', function(e) { e.stopPropagation(); });
}

async function initModelsTable(facility) {
    const resp = await fetch('/api/data/facilities/' + facility);
    const areas = await resp.json();
    const systems = new Set();
    for (const areaKey in areas) {
        for (const prop of Object.getOwnPropertyNames(areas[areaKey])) {
            systems.add(prop);
        }
    }

    // Create table header
    const $thead = $('<thead></thead>');
    const $row = $('<tr></tr>');
    $row.append(`<th>Area/System</th>`);
    for (const areaKey in areas) {
        $row.append(`<th class="model-area-select">${areaKey}</th>`);
    }
    $thead.append($row);
    const $table = $('#models-table').empty().append($thead);

    // Create table content
    const $tbody = $(`<tbody></tbody>`);
    for (const system of systems.values()) {
        const $row = $('<tr></tr>');
        $row.append(`<th class="model-system-select">${system}</th>`);
        for (const areaKey in areas) {
            const area = areas[areaKey];
            if (area[system]) {
                $row.append(`<td><input type="checkbox" value="${area[system]}" data-area="${areaKey}" data-system="${system}" /></td>`);
            } else {
                $row.append(`<td></td>`);
            }
        }
        $tbody.append($row);
    }
    $table.append($tbody);

    // Setup event handlers
    $('#models-table input').on('change', function() {
        const urn = this.value;
        if (this.checked) {
            addModel(urn);
        } else {
            removeModel(urn);
        }
    });
    $('#models-table .model-area-select').on('click', function() {
        const area = $(this).text();
        const checkboxes = Array.from($(`#models-table input[data-area="${area}"]`));
        if (checkboxes.filter(el => el.checked).length > 0) {
            for (const checkbox of checkboxes) {
                checkbox.checked = false;
                removeModel(checkbox.value);
            }
        } else {
            for (const checkbox of checkboxes) {
                checkbox.checked = true;
                addModel(checkbox.value);
            }
        }
    });
    $('#models-table .model-system-select').on('click', function() {
        const system = $(this).text();
        const checkboxes = Array.from($(`#models-table input[data-system="${system}"]`));
        if (checkboxes.filter(el => el.checked).length > 0) {
            for (const checkbox of checkboxes) {
                checkbox.checked = false;
                removeModel(checkbox.value);
            }
        } else {
            for (const checkbox of checkboxes) {
                checkbox.checked = true;
                addModel(checkbox.value);
            }
        }
    });

    // By default, load all models for the first available area
    const area = Object.getOwnPropertyNames(areas)[0];
    const checkboxes = Array.from($(`#models-table input[data-area="${area}"]`));
    for (const checkbox of checkboxes) {
        checkbox.checked = true;
        addModel(checkbox.value);
    }
}

function initCharts(facility) {
    const temperatureChart = new Chart(document.getElementById('temperature-chart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: [{
                label: 'Temperature [F]',
                borderColor: 'rgba(255, 196, 0, 1.0)',
                backgroundColor: 'rgba(255, 196, 0, 0.5)',
                data: []
            }]
        },
        options: {
            scales: {
                xAxes: [{ type: 'realtime', realtime: { delay: 2000 } }],
                yAxes: [{ ticks: { beginAtZero: true } }]
            }
        }
    });

    const pressureChart = new Chart(document.getElementById('pressure-chart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: [{
                label: 'Pressure [MPa]',
                borderColor: 'rgba(255, 196, 0, 1.0)',
                backgroundColor: 'rgba(255, 196, 0, 0.5)',
                data: []
            }]
        },
        options: {
            scales: {
                xAxes: [{ type: 'realtime', realtime: { delay: 2000 } }],
                yAxes: [{ ticks: { beginAtZero: true } }]
            }
        }
    });

    const $alert =  $('#realtime div.alert');
    const $temperatureChart = $('#temperature-chart');
    const $pressureChart = $('#pressure-chart');
    $alert.show();
    $temperatureChart.hide();
    $pressureChart.hide();
    NOP_VIEWER.addEventListener(Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT, function(ev) {
        const results = NOP_VIEWER.getAggregateSelection();
        if (results.length === 1 && results[0].selection.length === 1) {
            $alert.hide();
            $temperatureChart.show();
            $pressureChart.show();
        } else {
            $alert.show();
            $temperatureChart.hide();
            $pressureChart.hide();
        }
    });

    setInterval(function() {
        temperatureChart.data.datasets[0].data.push({
            x: Date.now(),
            y: 175.0 + Math.random() * 50.0
        });
        pressureChart.data.datasets[0].data.push({
            x: Date.now(),
            y: 975.0 + Math.random() * 50.0
        });
    }, 1000);
}

function initTables(facility) {
    let issuesTable;

    async function updateIssues() {
        if (issuesTable) {
            issuesTable.rows().deselect();
            issuesTable.destroy();
        }
        const $tbody = $('#issues-table > tbody');
        $tbody.empty();

        const resp = await fetch(`/api/data/facilities/${facility}/issues`);
        const issues = await resp.json();
        for (const issue of issues) {
            $tbody.append(`
                <tr>
                    <td>${new Date(issue.createdAt).toLocaleDateString()}</td>
                    <td><a href="#" class="part-link" data-urn="${issue.urn}" data-dbid="${issue.partId}">${issue.partId}</a></td>
                    <td>${issue.author}</td>
                    <td>${issue.text}</td>
                </tr>
            `);
        }
        issuesTable = $('#issues-table').DataTable(/*{ select: true }*/);
    }

    updateIssues();

    // After a mouse click on 3D viewport, populate X/Y/Z of the intersection
    $('#viewer').on('click', function(ev) {
        const viewer = NOP_VIEWER;
        let intersections = [];
        const bounds = document.getElementById('viewer').getBoundingClientRect();
        viewer.impl.castRayViewport(viewer.impl.clientToViewport(ev.clientX - bounds.left, ev.clientY - bounds.top), false, null, null, intersections);
        if (intersections.length > 0) {
            const intersection = intersections[0];
            $('#issue-model').val(intersection.model.getData().urn);
            $('#issue-part').val(intersection.dbId);
            $('#issue-position-x').val(intersection.point.x.toFixed(2));
            $('#issue-position-y').val(intersection.point.y.toFixed(2));
            $('#issue-position-z').val(intersection.point.z.toFixed(2));
        }
    });

    // Handle the event of submitting new issue
    $('#issue-form button').on('click', function(ev) {
        const urn = $('#issue-model').val();
        const partId = parseInt($('#issue-part').val());
        const text = $('#issue-title').val();
        const author = $('#issue-author').val();
        const x = parseFloat($('#issue-position-x').val());
        const y = parseFloat($('#issue-position-y').val());
        const z = parseFloat($('#issue-position-z').val());
        fetch(`/api/data/facilities/${facility}/issues`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urn, partId, text, author, x, y, z })
        }).then(resp => {
            const $modal = $('#issue-modal');
            if (resp.status === 200) {
                $('#issue-modal .modal-body > p').text(`Issue Response: ${resp.statusText} (${resp.status})`);
                $modal.modal('show');
                setTimeout(function() { $modal.modal('hide'); }, 1000);
                updateIssues();
            } else {
                resp.text().then(text => {
                    $('#issue-modal .modal-body > p').text(`Issue Response: ${resp.statusText} (${resp.status}) ${text}`);
                    $modal.modal('show');
                    setTimeout(function() { $modal.modal('hide'); }, 5000);
                });
            }
        });
        ev.preventDefault();
    });

    // Highlight a part in 3D view when its ID is clicked in the issues table
    $('#issues-table').on('click', function(ev) {
        const urn = $(ev.target).data('urn');
        const dbid = $(ev.target).data('dbid');
        if (urn && dbid) {
            const partId = parseInt(dbid);
            const viewer = NOP_VIEWER;
            const results = viewer.getAggregateSelection();
            if (results.length === 1 && results[0].selection.length === 1 && results[0].selection[0] === partId) {
                // skip
            } else {
                const model = viewer.impl.findModel(m => m.getData().urn === urn);
                if (model) {
                    viewer.select(partId, model);
                    viewer.fitToView([partId], model);
                }
            }
        }
    });

    // Only enable the issue form when exactly one part is selected
    const $alert =  $('#issues div.alert');
    const $form = $('#issue-form');
    $alert.show();
    $form.hide();
    NOP_VIEWER.addEventListener(Autodesk.Viewing.AGGREGATE_SELECTION_CHANGED_EVENT, function(ev) {
        const results = NOP_VIEWER.getAggregateSelection();
        if (results.length === 1 && results[0].selection.length === 1) {
            $alert.hide();
            $form.show();
        } else {
            $alert.show();
            $form.hide();
        }
    });
}

async function initMap() {
    const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 45.643940, lng: -73.520483 },
        zoom: 16
    });
    map.setMapTypeId('satellite');

    const resp = await fetch('/api/data/facilities');
    const facilities = await resp.json();
    for (const facility of facilities) {
        const url = '/facility/' + facility.id;
        const facilityPath = new google.maps.Polygon({
            path: facility.region,
            geodesic: true,
            strokeColor: '#EBB30B',
            strokeOpacity: 0.8,
            fillColor: '#EBB30B',
            fillOpacity: 0.6,
            strokeWeight: 2
        });
        facilityPath.setMap(map);
        facilityPath.addListener('click', function() { window.location = url; });
        const infoWindow = new google.maps.InfoWindow();
        infoWindow.setContent(`<a href="${url}">${facility.name}</a>`);
        infoWindow.setPosition({
            lat: facility.region.reduce((prev, curr) => prev + curr.lat, 0) / facility.region.length,
            lng: facility.region.reduce((prev, curr) => prev + curr.lng, 0) / facility.region.length,
        });
        infoWindow.open(map);
    }
}

function addModel(urn) {
    const models = NOP_VIEWER.getVisibleModels();
    const model = models.find(m => m.getData().urn === urn);
    if (!model) {
        Autodesk.Viewing.Document.load(
            'urn:' + urn,
            function(doc) {
                const viewables = doc.getRoot().search({ type: 'geometry' });
                NOP_VIEWER.loadModel(doc.getViewablePath(viewables[0]));
            },
            function(err) {
                console.error(err);
            }
        );
    }
}

function removeModel(urn) {
    const models = NOP_VIEWER.getVisibleModels();
    const model = models.find(m => m.getData().urn === urn);
    if (model) {
        NOP_VIEWER.impl.unloadModel(model);
    }
}

$(async function() {
    await initViewer();
    const urlTokens = window.location.pathname.split('/');
    const facility = urlTokens[urlTokens.length - 1];
    initSidebar(facility);
});
