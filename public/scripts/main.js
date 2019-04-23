async function initViewer() {
    async function getAccessToken(callback) {
        const resp = await fetch('/api/auth/token');
        const json = await resp.json();
        const token = json.access_token;
        callback(token.access_token, token.expires_in);
    }
    await Autodesk.Viewing.Utilities.Initialize(document.getElementById('viewer'), getAccessToken);
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
        const models = NOP_VIEWER.getVisibleModels();
        const model = models.find(m => m.getData().urn === urn);

        if (this.checked && !model) {
            Autodesk.Viewing.Document.load(
                'urn:' + urn,
                function(doc) {
                    const viewables = doc.getRoot().search({ type: 'geometry' });
                    NOP_VIEWER.loadModel(doc.getViewablePath(viewables[0]));
                },
                function(err) {
                    console.error(err);
                });
        } else if (!this.checked && model) {
            NOP_VIEWER.impl.unloadModel(model);
        }
    });
    // TODO: event handlers for group-selecting areas or types
}

$(function() {
    initViewer();
    initSidebar('montreal');
});
