async function initViewer() {
    async function getAccessToken(callback) {
        const resp = await fetch('/api/auth/token');
        const json = await resp.json();
        const token = json.access_token;
        callback(token.access_token, token.expires_in);
    }
    await Autodesk.Viewing.Utilities.Initialize(document.getElementById('viewer'), getAccessToken);
}

async function initSidebar() {
    const resp = await fetch('/api/data/models');
    if (resp.status !== 200) {
        const text = await resp.text();
        throw new Error('Could not load models: ' + text);
    }
    const models = await resp.json();
    const $models = $('#models');
    $models.empty();
    for (const model of models) {
        $models.append(`<h5>Area ${model.area}</h5>`);
        const datasets = Object.getOwnPropertyNames(model.datasets);
        for (const dataset of datasets) {
            const id = `area-${model.area}-${dataset.toLowerCase()}`;
            const $checkbox = $(`
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${model.datasets[dataset]}" id="${id}" />
                    <label class="form-check-label" for="${id}">${dataset}</label>
                </div>
            `);
            $models.append($checkbox);
        }
    }

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
}

$(function() {
    initViewer();
    initSidebar();
});
