var google = require('googleapis');
var fs = require('fs');

function updateFile(data, callback) {
    fs.readFile('./index.html', 'utf8', function(err, result) {
        if (err) {
            return console.log(err);
        }

        data = result.replace('${listFiles}', data);
        callback.send(data);
    });
}

module.exports = function listFiles(auth, callback) {
    var service = google.drive('v3');
    service.files.list({
        auth: auth,
        pageSize: 10,
        fields: "nextPageToken, files(id, name)"
    }, function(err, response) {

        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var files = response.files;
        var data = '<div>';
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            data += `<p>${file.name}</p><p>${file.id}</p>`;
        }
        data += '</div>';
        updateFile(data, callback);
    });
}