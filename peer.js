const http = require('http');
const url = require('url');
const fs = require('fs');
const request = require('request');
const crypto = require('crypto');

let port = 0;
let known_hosts = [];
let paused = false;

process.argv.forEach(arg => {
    if (arg.includes('p=')) {
        port = parseInt(arg.split('=')[1]);
    }
});

const filePath = `peers/peer-${port}.txt`;
const blockFilePath = `blocks/peer-${port}.txt`;

console.log('Starting peer on port ' + port);

function returnAllBlocks(res) {
    fs.readFile(blockFilePath, 'utf8', function (error, data) {
        if (error) {
            console.log('Error:- ' + error);
            res.writeHead(500);
            res.end('Error reading blocks');
        }
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(data.split('\n').toString());
    });
}

function returnBlocksFromHash(hash, res) {
    fs.readFile(blockFilePath, 'utf8', function (error, data) {
        if (error) {
            console.log('Error:- ' + error);
            res.writeHead(500);
            res.end('Error reading blocks')
        }
        try {
            data = data.split('\n');
            data.forEach(row => {
                if (row.includes(hash)) {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(data.slice(data.indexOf(row), data.length).toString())
                }
            });
            res.writeHead(404);
            res.end('Not found')
        } catch (e) {
            console.log(e);
            res.writeHead(500);
            res.end('Error reading blocks')
        }
    });
}

function returnKnownHosts(req, parsedUrl, res) {
    console.log(req.url);
    const clientPort = parsedUrl.query.client;
    console.log('Request from port ' + clientPort + '\n');
    if (!known_hosts.includes(clientPort)) {
        console.log('Adding new port ' + clientPort + ' to known hosts \n');
        appendToFile(clientPort);
    }
    res.writeHead(200);
    res.end(known_hosts.toString());
}

function handleGet(req, res) {
    const parsedUrl = url.parse(req.url, true);
    if (parsedUrl.pathname === '/known-hosts') {
        returnKnownHosts(req, parsedUrl, res);
    } else if (parsedUrl.pathname === '/getBlocks') {
        const hash = parsedUrl.query.hash;
        if (hash) {
            if (fileExists(blockFilePath)) {
                returnBlocksFromHash(hash, res);
            } else {
                res.writeHead(404);
                res.end('No blocks found')
            }

        } else {
            if (fileExists(blockFilePath)) {
                returnAllBlocks(res);
            } else {
                res.writeHead(404);
                res.end('No blocks found')
            }
        }
    } else {
        res.writeHead(200);
        res.end('Get request received')
    }

    /*console.log(req.url);
    const clientPort = url.parse(req.url, true).query.client;
    console.log('Request from port ' + clientPort + '\n');
    if (!known_hosts.includes(clientPort)) {
        console.log('Adding new port ' + clientPort + ' to known hosts \n');
        appendToFile(clientPort);
    }
    res.writeHead(200);
    res.end(known_hosts.toString());*/
}

function fileExists(filePath) {
    return fs.existsSync(filePath);
}

function saveTransaction(transaction, res) {
    if (fileExists(blockFilePath)) {
        const stream = fs.createWriteStream(blockFilePath, {flags: 'a'});
        stream.write(transaction + '\n');
        stream.end();
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end('post received')
    } else {
        fs.writeFile(blockFilePath, transaction + '\n', function (err) {
            if (!err) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end('post received')
            }
        })
    }
}

function transactionExists(transaction, callback) {
    if (!fileExists(blockFilePath)) {
        callback(false);
    }
    fs.readFile(blockFilePath, 'utf8', function(error, data) {
        if (error) {
            console.log('Error:- ' + error);
            throw error;
        }
        callback(data.includes(JSON.stringify(transaction)));
    });
}

function handlePost(req, res) {
    let body = '';
    let transaction = 'corrupt';
    req.on('data', function(data) {
        body += data;
        console.log('Partial body: ' + body)
    });
    req.on('end', function() {
        //TODO: Väljade valideerimine - et kõik olemas
        if (req.url === '/inv') {
            let transaction = {};
            const sha256 = crypto.createHash('sha256');
            sha256.update(body);
            let key = sha256.digest('hex');
            transaction[key] = body;

            transactionExists(transaction, function (result) {
                if (!result) {
                    transaction = JSON.stringify(transaction);
                    saveTransaction(transaction, res);
                    known_hosts.forEach(peer => {
                        console.log('POSTing new transaction to ' + '127.0.0.1:' + peer);
                        const req_url = 'http://' + '127.0.0.1:' + peer + '/block';
                        console.log(req_url);

                        request.post({
                            headers: {'content-type' : 'text'},
                            url: req_url,
                            body: transaction
                        }, function(error, response, body){
                            console.log(body);
                        });
                    });
                } else {
                    res.writeHead(400);
                    res.end('Transaction already exists')
                }
            })



        } else if (req.url === '/block') {
            transaction = body;
            console.log(transaction);
            saveTransaction(transaction, res);
        } else {
            res.writeHead(500);
            res.end('Endpoint not defined')
        }

    })
}

const requestListener = function (req, res) {
    if (req.method === 'GET') {
        handleGet(req, res);
    } else if (req.method === 'POST') {
        handlePost(req, res);
    }
    console.log(req.method)
    /*console.log(req.url);
    const clientPort = url.parse(req.url, true).query.client;
    console.log('Request from port ' + clientPort + '\n');
    if (!known_hosts.includes(clientPort)) {
        console.log('Adding new port ' + clientPort + ' to known hosts \n');
        appendToFile(clientPort);
    }
    res.writeHead(200);
    res.end(known_hosts.toString());*/
};
const server = http.createServer(requestListener);
server.listen(port);
console.log('listening on port ' + port);

function startSendingRequests() {
    setInterval(function () {
        if (!paused) {
            const p = known_hosts[Math.floor(Math.random() * known_hosts.length)];
            makeGet('127.0.0.1', p)
        }
    }, 5000)
}

try {
    if (fileExists(blockFilePath)) {
        console.log('File exists. Reading known hosts...');
        getDataFromFile(filePath, function(result) {
            known_hosts = result;
            console.log(known_hosts);
            // startSendingRequests()
        });
    } else {
        console.log('File does not exist. Creating new');
        fs.writeFile(filePath,'', function (err) {
            if (!err) {
                getDataFromFile('servers.txt', function (servers) {
                    servers.forEach(s => {
                        appendToFile(s);
                    });
                    console.log('Known hosts: ');
                    console.log(known_hosts);
                    // startSendingRequests();
                })
            }
        })
    }
} catch (e) {
    console.log(e)
}

function getDataFromFile(filePath, callback) {
    fs.readFile(filePath, 'utf8', function(error, data) {
        if (error) {
            console.log('Error:- ' + error);
            throw error;
        }
        callback(data.split('\n').filter(s => s.match(/^-?\d+$/) && parseInt(s) !== port));
    });
}

function appendToFile(line) {
    if (!known_hosts.includes(line)) {
        const stream = fs.createWriteStream(filePath, {flags: 'a'});
        stream.write(line + '\n');
        stream.end();
        known_hosts.push(line);
        console.log('Added new port ' + line)
    }
}

function removePeer(p) {
    if (p !== '8080' && p !== '9000' && p !== '9001') {
        known_hosts = known_hosts.filter(h => h !== p);
        console.log(known_hosts);
        fs.writeFile(filePath, known_hosts.join('\n'), function () {

        });
    }
}

function retryRequest(h, p) {
    let count = 1;
    const interval = setInterval(function () {
        console.log('Retrying to connect peer ' + h + ':' + p + ' - Tried ' + count + ' times...\n');
        count++;
        if (count > 5) {
            console.log('Peer unreachable. Deleting from known peers');
            removePeer(p);
            clearInterval(interval);
            paused = false;
        }
    }, 2000)
}

function makeGet(host, p) {
    console.log('Sending GET request to ' + host + ':' + p);
    const req_url = 'http://' + host + ':' + p + '?client=' + port;
    console.log(req_url);
    request({url: req_url}, function (error, response, body) {
        if (error) {
            console.log(host + ':' + p + ' unreachable\n');
            paused = true;
            retryRequest(host, p)
        }
        if (!error && response.statusCode === 200) {
            known_hosts = [...new Set(known_hosts.concat(body.split(',')))];
            console.log(known_hosts);
            console.log(body.split(','));

            fs.writeFile(filePath, known_hosts.join('\n'), function () {

            });
        }
    })
}
