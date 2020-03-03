let http = require('http');
let options = {
    host: '127.0.0.1',
    port: 8080,
    localAddress : '127.0.0.1',
    localPort: 8100,
    path: '/'
};

let req = http.get(options, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));

    // Buffer the body entirely for processing as a whole.
    let bodyChunks = [];
    res.on('data', function(chunk) {
        // You can process streamed parts here...
        bodyChunks.push(chunk);
    }).on('end', function() {
        let body = Buffer.concat(bodyChunks);
        console.log('BODY: ' + body);
        // ...and/or process the entire body here.
    })
});

req.on('error', function(e) {
    console.log('ERROR: ' + e.message);
});
