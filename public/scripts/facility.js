async function initViewer() {
    async function getAccessToken(callback) {
        const resp = await fetch('/api/auth/token');
        const json = await resp.json();
        const token = json.access_token;
        callback(token.access_token, token.expires_in);
    }
    await Autodesk.Viewing.Utilities.Initialize(document.getElementById('viewer'), getAccessToken);
    NOP_VIEWER.loadExtension('IssuesExtension');
}

async function initSidebar(facility) {
    await initModelsTable(facility);
}

async function initModelsTable(facility) {
    const resp = await fetch('/api/data/facilities/' + facility);
    const areas = await resp.json();
    const types = new Set();
    for (const areaKey in areas) {
        for (const prop of Object.getOwnPropertyNames(areas[areaKey])) {
            types.add(prop);
        }
    }

    // Create table header
    const $table = $('#models');
    $table.empty();
    const $header = $table.append(`<th></th>`);
    for (const areaKey in areas) {
        $header.append(`<td class="model-area-select">${areaKey}</td>`);
    }

    // Create table content
    for (const type of types.values()) {
        const $row = $table.append(`<tr></tr>`);
        $row.append(`<td class="model-type-select">${type}</td>`);
        for (const areaKey in areas) {
            const area = areas[areaKey];
            if (area[type]) {
                $row.append(`<td><input type="checkbox" value="${area[type]}" data-area="${areaKey}" data-type="${type}" /></td>`);
            } else {
                $row.append(`<td></td>`);
            }
        }
    }

    // Setup event handlers
    $('#models input').on('change', function() {
        const urn = this.value;
        if (this.checked) {
            addModel(urn);
        } else {
            removeModel(urn);
        }
    });
    $('#models .model-area-select').on('click', function() {
        const area = $(this).text();
        const checkboxes = Array.from($(`#models input[data-area="${area}"]`));
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
    $('#models .model-type-select').on('click', function() {
        const type = $(this).text();
        const checkboxes = Array.from($(`#models input[data-type="${type}"]`));
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
    const checkboxes = Array.from($(`#models input[data-area="${area}"]`));
    for (const checkbox of checkboxes) {
        checkbox.checked = true;
        addModel(checkbox.value);
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

$(function() {
    initViewer();
    initSidebar('montreal');
});
