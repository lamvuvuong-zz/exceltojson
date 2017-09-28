var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var fs = require('fs');
var OAuth2 = require('./OAuth2.js');
var listFiles = require('./listFiles.js');
var getFile = require('./getFile.js');

var abc = require('./translate/accounts/en/quoine.json');
console.log(abc['sign-in']['help-email-text']);

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function(req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1])
    }
});

var upload = multer({
    storage: storage
}).single('file');

app.get('/download', function(req, res) {
    if (!req.query.fileid) {
        res.send('Not found file id');
    }
    new Promise(function(resolve) {
        OAuth2(resolve);
    }).then(function(result) {
        getFile(result, req.query.fileid, res);
    });
});

app.get('/', function(req, res) {
    new Promise(function(resolve) {
        OAuth2(resolve);
    }).then(function(result) {
        listFiles(result, res);
    });
});

app.listen('3006', function() {
    console.log('running on 3006...');
});