const express = require('express');
const { AuthenticationClient, DataManagementClient } = require('forge-nodejs-utils');

let router = express.Router();
let auth = new AuthenticationClient(process.env.FORGE_CLIENT_ID, process.env.FORGE_CLIENT_SECRET);
let data = new DataManagementClient(auth);

function idToUrn(id) {
    return Buffer.from(id).toString('base64').replace(/\=/g, '');
}

router.get('/facilities', async function(req, res) {
    try {
        const objects = await data.objects(process.env.FORGE_BUCKET);
        const facilities = new Set();
        for (const object of objects) {
            const match = object.objectKey.match(/^(\w+)\-(\d+)\-(\w+)\.nwd$/);
            if (match) {
                const facilityKey = match[1].toLowerCase();
                facilities.add(facilityKey);
            }
        }
        res.json(Array.from(facilities.values()));
    } catch(err) {
        res.status(500).send(err);
    }
});

router.get('/facilities/:facility', async function(req, res) {
    try {
        const objects = await data.objects(process.env.FORGE_BUCKET);
        const areas = {};
        for (const object of objects) {
            const match = object.objectKey.match(/^(\w+)\-(\d+)\-(\w+)\.nwd$/);
            if (match) {
                const facilityKey = match[1].toLowerCase();
                if (facilityKey === req.params.facility) {
                    const areaKey = match[2];
                    const typeKey = match[3].toLowerCase();
                    const area = areas[areaKey] = areas[areaKey] || {};
                    area[typeKey] = idToUrn(object.objectId);
                }
            }
        }
        res.json(areas);
    } catch(err) {
        res.status(500).send(err);
    }
});

module.exports = router;
