const express = require('express');
const { AuthenticationClient, DataManagementClient } = require('forge-nodejs-utils');

const Issue = require('../model/issue');
const IssueTableLimit = 256;

let router = express.Router();
let auth = new AuthenticationClient(process.env.FORGE_CLIENT_ID, process.env.FORGE_CLIENT_SECRET);
let data = new DataManagementClient(auth);

const FacilityData = [
    {
        name: 'Montreal Facility',
        id: 'montreal',
        region: [
            { lat: 45.643634, lng: -73.527693 },
            { lat: 45.644899, lng: -73.526520 },
            { lat: 45.642727, lng: -73.521655 },
            { lat: 45.641473, lng: -73.522854 }
        ]
    },
    {
        name: 'El Facility',
        id: 'el',
        region: [
            { lat: 45.641858, lng: -73.522272  },
            { lat: 45.643710, lng: -73.520559 },
            { lat: 45.643289, lng: -73.519494 },
            { lat: 45.642545, lng: -73.519196 },
            { lat: 45.640949, lng: -73.520143 }
        ]
    }
];

function idToUrn(id) {
    return Buffer.from(id).toString('base64').replace(/\=/g, '');
}

function countIssues() {
    return new Promise(function(resolve, reject) {
        Issue.count({}, (err, count) => {
            if (err) {
                reject(err);
            } else {
                resolve(count);
            }
        });
    });
}

router.get('/facilities', async function(req, res) {
    try {
        res.json(FacilityData);
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

router.get('/facilities/:facility/issues', function(req, res) {
    let query = {
        facility: req.params.facility
    };
    Issue.find(query, (err, issues) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(issues);
        }
    });
});

router.post('/facilities/:facility/issues', async function(req, res) {
    const { partId, author, text, img, x, y, z } = req.body;
    const facility = req.params.facility;
    try {
        const numIssues = await countIssues();
        if (numIssues >= IssueTableLimit) {
            throw new Error('Cannot create more issues.');
        }
        const issue = await Issue.create({ createdAt: new Date, facility, partId, author, text, img, x, y, z });
        res.json(issue);
    } catch(err) {
        res.status(500).send(err);
    }
});

module.exports = router;
