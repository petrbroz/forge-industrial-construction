const express = require('express');
const { AuthenticationClient, DataManagementClient } = require('forge-nodejs-utils');

let router = express.Router();
let auth = new AuthenticationClient(process.env.FORGE_CLIENT_ID, process.env.FORGE_CLIENT_SECRET);
let data = new DataManagementClient(auth);

function idToUrn(id) {
    return Buffer.from(id).toString('base64').replace(/\=/g, '');
}

router.get('/models', async function(req, res, next) {
    try {
        const objects = await data.objects(process.env.FORGE_BUCKET);
        const models = new Map();
        for (const object of objects) {
            const match = object.objectKey.match(/^Area\.(\d+)\.(\w+)\.NWD$/);
            if (match) {
                const [_, area, type] = match;
                if (!models.has(area)) {
                    models.set(area, { area, datasets: {} });
                }
                const model = models.get(area);
                model.datasets[type] = idToUrn(object.objectId);
            }
        }
        res.json(Array.from(models.values()));
    } catch(err) {
        next(err);
    }
});

module.exports = router;
