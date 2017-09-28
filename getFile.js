var google = require('googleapis');
var fs = require('fs');
var excel = require('exceljs');
var service = google.drive('v3');
var path = require('path');


module.exports = function getFile(auth, fileId, callback) {
    if (!fileId) {
        fileId = '1Of4B-kQD5gKgp6qi9IWNSUBQLLYYa9QPDuPBDojdQ-s';
    }

    service.files.get({
        auth: auth,
        fileId,
    }, function(err, response) {
        console.log(response);
        if (err) {
            callback.send('The API returned an error: ' + err);
        }
        if (response.mimeType !== 'application/vnd.google-apps.spreadsheet') {
            callback.send('Type file is not spreadsheet');
        }
        getDataFile(response, auth, callback);
    });
}

function getDataFile(fileInfo, auth, callback) {
    var datetimestamp = Date.now();
    var filePath = './downloads/' + fileInfo.name + '-' + datetimestamp + '.xlsx';
    var dest = fs.createWriteStream(filePath);

    service.files.export({
            auth,
            fileId: fileInfo.id,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        .on('end', function() {
            console.log('Done');
            setTimeout(function() {
                createFileTranslate(filePath, callback);
            }, 2000);

        })
        .on('error', function(err) {
            console.log('Error during download', err);
            callback.send('Error during download: ' + err);
        })
        .pipe(dest);
}

function createFileTranslate(filePath, callback) {

    

    var workbook = new excel.Workbook();
    workbook.xlsx.readFile(filePath)
        .then(function() {
            var worksheet = workbook.getWorksheet(1);
            var translations = {};
            var rowHeader = worksheet.getRow(1).values;
            worksheet.eachRow({
                includeEmpty: true
            }, function(row, rowNumber) {
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
                            if (err) {
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
                callback.json({
                    error_code: 0,
                    err_desc: null,
                    data: translations
                });

            });
        });
}

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
    } else {
        obj[arr[0]] = val;
    }
    return obj;

}