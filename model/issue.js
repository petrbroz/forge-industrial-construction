const mongoose = require('mongoose');
const validator = require('validator');

const AcceptedFacilities = [
    'montreal',
    'el'
];

function validateFacility(value) {
    return AcceptedFacilities.indexOf(value) !== -1;
}

function validateAuthor(value) {
    return value.match(/^[a-zA-Z ]{1,64}$/);
}

function validateDescription(value) {
    return value.match(/^[a-zA-Z.,?!\s]{1,256}$/);
}

const issueSchema = new mongoose.Schema({
    createdAt: {
        type: Date,
        required: true
    },
    facility: {
        type: String,
        required: true,
        validate: validateFacility
    },
    author: {
        type: String,
        required: true,
        validate: validateAuthor
    },
    text: {
        type: String,
        required: true,
        validate: validateDescription
    },
    img: {
        type: String,
        validate: value => validator.isURL(value) && value.length < 256
    },
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    },
    z: {
        type: Number,
        required: true
    },
    partId: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Issue', issueSchema);
