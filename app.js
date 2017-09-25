var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var excel = require('exceljs');
var fs = require('fs');
var path = require('path');

app.use(bodyParser.json());

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function(req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')
        [file.originalname.split('.').length - 1])
    }
});

var upload = multer({
    storage: storage
    }).single('file');

app.post('/upload', function(req, res) {
    var exceltojson;
    upload(req, res, function(err) {
        if (err) {
            res.json({error_code: 1, err_desc: err});
            return;
        }
        if (!req.file) {
            res.json({error_code: 1, err_desc: 'No file passed'});
            return;
        }
        
        var workbook = new excel.Workbook();
        workbook.xlsx.readFile(req.file.path)
        .then(function() {
            var worksheet = workbook.getWorksheet(1);
            var translations = {};
            var rowHeader = worksheet.getRow(1).values;
            worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
                const value = row.values;
                if (rowNumber > 1 && value[1] && value[2]) {
                    var keys = value[2].split(":");
                    for (var i = 3; i < rowHeader.length; i++) {
                        if (value[i]) {
                            addProps(translations, [value[1], rowHeader[i], keys[0], keys[1]], value[i]);
                        }
                    }
                }
            });
            var promises = [];            
            Object.keys(translations).forEach(function(projectName) {
                Object.keys(translations[projectName]).forEach(function(languageId) {
                    promises.push(new Promise(function(resolve, reject) {
                        var filePath = `translate/${projectName}/${languageId}/quoine.json`;
                        ensureDirectoryExistence(filePath);
                        fs.writeFile(filePath, JSON.stringify(translations[projectName][languageId], null, 4), function(err) {
                            if(err) {
                                console.log('err', err);
                                reject();
                            }
                            console.log("The file was saved!");
                            resolve();
                        }); 
                    }));
                })
            })
            Promise.all(promises).then(function() {
                res.json({error_code:0,err_desc:null, data: translations});
            
            });
        });
        
    })
})

function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
      return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
  }

function addProps(obj, arr, val) {
    obj[arr[0]] = obj[arr[0]] || {};
    var tmpObj = obj[arr[0]];
    if (arr.length > 1) {
        arr.shift();
        addProps(tmpObj, arr, val);
    }
    else {
        obj[arr[0]] = val;
    }
    return obj;

}

app.get('/',function(req,res){
    res.sendFile(__dirname + "/index.html");
});

app.listen('3006', function() {
    console.log('running on 3006...');
});