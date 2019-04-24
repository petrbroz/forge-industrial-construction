const express = require('express');
const path = require('path');

const { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_BUCKET, GOOGLE_MAPS_API_KEY } = process.env;
if (!FORGE_CLIENT_ID || !FORGE_CLIENT_SECRET || !FORGE_BUCKET || !GOOGLE_MAPS_API_KEY) {
    console.warn('Following env. variables must be provided in order to run this application:');
    console.warn('FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_BUCKET, GOOGLE_MAPS_API_KEY');
    return;
}

const app = express();

app.set('view engine', 'pug');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/data', require('./routes/data'));
app.use('/facility/:name', function(req, res) {
    res.render('facility', { facility: req.params.name });
});
app.use('/', function(req, res) {
    res.render('index', { GOOGLE_MAPS_API_KEY });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
