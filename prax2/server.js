let https = require('https');
const url = require('url');
let fs = require('fs');

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

function returnAllVideos(res) {
    let allVideos = [];
    fs.readFile('videos.txt', 'utf8', function (error, data) {
        allVideos = data.split('\n').filter(v => v!=='');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(allVideos));
    })
}

function handleGet(req, res) {
    const parsedUrl = url.parse(req.url, true);
    console.log(parsedUrl.pathname)
    if (parsedUrl.pathname === '/') {
        fs.readFile('stream.html', function (err, html) {
            if (err) throw err;

            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(html);
            res.end()
        })
    } else if (parsedUrl.pathname === '/video') {
        returnAllVideos(res);
    } else if (parsedUrl.pathname.includes('/video/download')) {
        const videoId = parsedUrl.pathname.replace('/video/download/', '');
        const videoPath = 'videos/' + videoId + '.webm';
        let downloadFile = fs.createReadStream(videoPath);
        res.writeHead(200, {'Content-disposition': 'attachment'}); //here you can specify file name
        downloadFile.pipe(res); // also you can set content-type
    } else if (parsedUrl.pathname.includes('/video/')) {
        const videoId = parsedUrl.pathname.replace('/video/', '');
        const path = 'videos/' + videoId + '.webm';
        const stat = fs.statSync(path);
        const fileSize = stat.size;
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1]
                ? parseInt(parts[1], 10)
                : fileSize-1;
            const chunksize = (end-start)+1;
            const file = fs.createReadStream(path, {start, end});
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/webm',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/webm',
            };
            res.writeHead(200, head);
            fs.createReadStream(path).pipe(res)
        }
    }
}

function handlePost(req, res) {
    console.log(req.url);
    let body = '';
    req.on('data', function (data) {
        body += data;
    });
    req.on('end', function () {
        let base64String = unescape(body.replace('blob=', ''));
        console.log(base64String);
        let buf = new Buffer(base64String, 'base64'); // decode

        let fileName = Date.now();

        fs.writeFile("videos/" + fileName + ".webm", buf, function (err) {
            if (err) {
                console.log("err", err);
            } else {
                console.log('Nice')
            }
        });

        if (fs.existsSync('videos.txt')) {
            fs.readFile('videos.txt', 'utf8', function (error, data) {
                if (!error) {
                    data = data + (fileName + '\n');
                    fs.writeFile('videos.txt', data, function (err) {
                        if (err) {
                            console.log("err", err);
                        } else {
                            console.log('Nice')
                        }
                    })
                }
            })
        } else {
            fs.writeFile('videos.txt', fileName + '\n', function (err) {
                if (err) {
                    console.log("err", err);
                } else {
                    console.log('Nice')
                }
            })
        }

    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.writeHead(200);
}

const server = https.createServer(options, function (req, res) {
    console.log('request from ' + req.connection.remoteAddress + ':' + req.connection.remotePort);
    if (req.method === 'GET') {
        handleGet(req, res);
    } else if (req.method === 'POST') {
        handlePost(req, res);
    }
});
server.listen(3001);
console.log('Listening on port 3001');
