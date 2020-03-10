//TODO: return only block hashes in gethandler

const http = require('http');
const url = require('url');
const fs = require('fs');
const request = require('request');
const crypto = require('crypto');

let port = 0;
let peerHost = 0;
let knownPeers = [];
let paused = false;
let retrying = false;

process.argv.forEach(arg => {
    if (arg.includes('p=')) {
        port = parseInt(arg.split('=')[1]);
    }
});

const ip = require("ip");
peerHost = ip.address();

const filePath = `peers/peer-${peerHost}-${port}.txt`;
const blockFilePath = `blocks/peer-${peerHost}-${port}.txt`;

const requestListener = function (req, res) {
    console.log('request from ' + req.connection.remoteAddress + ':' + req.connection.remotePort);
    if (req.method === 'GET') {
        handleGet(req, res);
    } else if (req.method === 'POST') {
        handlePost(req, res);
    }
};

const server = http.createServer(requestListener);
server.listen(port, peerHost);
console.log('Starting peer on ' + peerHost + ':' + port);

try {
    if (fileExists(filePath)) {
        console.log('File exists. Reading known hosts...');
        getDataFromFile(filePath, function(result) {
            knownPeers = result;
            console.log(knownPeers);
            startSendingRequests()
        });
    } else {
        console.log('File does not exist. Creating new');
        fs.writeFile(filePath,'', function (err) {
            if (!err) {
                getDataFromFile('servers.txt', function (servers) {
                    servers.forEach(s => {
                        appendToFile(s);
                    });
                    console.log('Known peers: ');
                    console.log(knownPeers);
                    startSendingRequests();
                })
            }
        })
    }
} catch (e) {
    console.log(e)
}

function handleGet(req, res) {
    const parsedUrl = url.parse(req.url, true);
    if (parsedUrl.pathname === '/known-peers') {
        returnKnownPeers(req, parsedUrl, res);
    } else if (parsedUrl.pathname === '/getBlocks') {
        const hash = parsedUrl.query.hash;
        if (hash) {
            if (fileExists(blockFilePath)) {
                returnBlocksFromHash(hash, res);
            } else {
                endRes(res, 404, '', 'No blocks found');
            }

        } else {
            if (fileExists(blockFilePath)) {
                returnAllBlocks(res);
            } else {
                endRes(res, 404, '', 'No blocks found');
            }
        }
    } else if (parsedUrl.pathname === '/block') {
        const hash = parsedUrl.query.hash;
        if (hash && fileExists(blockFilePath)) {
            returnBlockDetails(hash, res);
        } else {
            endRes(res, 404, '', 'No blocks found');
        }
    } else {
        endRes(res, 500, '', 'Endpoint not defined');
    }
}

function handlePost(req, res) {
    let body = '';
    let transaction = '';
    req.on('data', function(data) {
        body += data;
    });
    req.on('end', function() {
        if (req.url === '/inv') {
            if (validTransaction(JSON.parse(body))) {
                console.log('Transaction valid');
                transaction = createTransaction(body);
                transactionExists(transaction, function (result) {
                    if (!result) {
                        transaction = JSON.stringify(transaction);
                        saveTransactionAndSendToOthers(transaction, res);
                    } else {
                        endRes(res, 400, '', 'Transaction already exists');
                    }
                })
            } else {
                endRes(res, 400, '', 'Transaction not valid');
            }

        } else if (req.url === '/block') {
            let requestBody = JSON.parse(body);
            console.log('Incoming transaction from peer: ' + requestBody.peer);
            console.log(requestBody);
            if (!knownPeers.includes(requestBody.peer)) {
                appendToFile(requestBody.peer)
            }
            transaction = requestBody.body;
            saveTransaction(transaction, res);
        } else {
            endRes(res, 500, '', 'Endpoint not defined');
        }

    })
}

function endRes(res, head, contentType, end) {
    if (contentType) {
        res.writeHead(head, contentType);
        res.end(end);
    }
    res.writeHead(head);
    res.end(end);
}

function returnKnownPeers(req, parsedUrl, res) {
    console.log(req.url);
    const clientPort = parsedUrl.query.client;
    if (!knownPeers.includes(clientPort)) {
        console.log('Adding new port ' + clientPort + ' to known peers \n');
        appendToFile(clientPort);
    }
    endRes(res, 200, '', knownPeers.toString());
}

function returnAllBlocks(res) {
    let allHashes = [];
    fs.readFile(blockFilePath, 'utf8', function (error, data) {
        let JSONObject = JSON.parse('[' + data.split('\n').filter(e => e !== '').toString() + ']');
        JSONObject.forEach(obj => {
            allHashes.push(Object.keys(obj))
        });
        if (error) {
            console.log('Error:- ' + error);
            endRes(res, 500,'', 'Error reading blocks');
        }
        endRes(res, 200, {'Content-Type': 'application/json'}, JSON.stringify(allHashes));
    });
}

function returnBlocksFromHash(hash, res) {
    fs.readFile(blockFilePath, 'utf8', function (error, data) {
        if (error) {
            console.log('Error:- ' + error);
            endRes(res, 500, '', 'Error reading blocks');
        }
        try {
            data = data.split('\n');
            data.forEach(row => {
                if (row.includes(hash)) {
                    let hashes = [];

                    let blocksFromHash = data.slice(data.indexOf(row), data.length);
                    console.log(blocksFromHash);
                    let JSONObject = JSON.parse('[' + blocksFromHash.filter(e => e !== '') + ']');
                    JSONObject.forEach(block => {
                        hashes.push(Object.keys(block))
                    });

                    endRes(res, 200, {'Content-Type': 'application/json'}, JSON.stringify(hashes));
                }
            });
            endRes(res, 404, '', 'Not found');
        } catch (e) {
            console.log(e);
            endRes(res, 500, '', 'Error reading blocks');
        }
    });
}

function returnBlockDetails(hash, res) {
    fs.readFile(blockFilePath, 'utf8', function (error, data) {
        if (error) {
            console.log('Error:- ' + error);
            endRes(res, 500, '', 'Error reading blocks');
        }
        try {
            data = data.split('\n');
            data.forEach(row => {
                if (row.includes(hash)) {
                    endRes(res, 200, {'Content-Type': 'application/json'}, row.toString());
                }
            });
            endRes(res, 404, '', 'Not found');
        } catch (e) {
            console.log(e);
            endRes(res, 500, '', 'Error reading blocks');
        }
    });
}

function fileExists(filePath) {
    return fs.existsSync(filePath);
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

function saveTransaction(transaction, res) {
    if (fileExists(blockFilePath)) {
        const stream = fs.createWriteStream(blockFilePath, {flags: 'a'});
        stream.write(transaction + '\n');
        stream.end();
        endRes(res, 200, {'Content-Type': 'text/html'}, 'post received');
    } else {
        fs.writeFile(blockFilePath, transaction + '\n', function (err) {
            if (!err) {
                endRes(res, 200, {'Content-Type': 'text/html'}, 'post received');
            }
        })
    }
}

function createTransaction(body) {
    let transaction = {};
    const sha256 = crypto.createHash('sha256');
    sha256.update(body);
    let key = sha256.digest('hex');
    transaction[key] = body;
    return transaction;
}

function validTransaction(transaction) {
    return transaction.from !== undefined &&
        transaction.to !== undefined &&
        transaction.date !== undefined &&
        transaction.amount !== undefined;
}

function saveTransactionAndSendToOthers(transaction, res) {
    saveTransaction(transaction, res);
    knownPeers.forEach(peer => {
        console.log('POSTing new transaction to ' + peer);
        const req_url = 'http://' + peer + '/block';

        let transactionToSend = {};
        transactionToSend.body = transaction;
        transactionToSend.peer = peerHost + ':' + port;

        console.log('TRANSACTION: ');
        console.log(transactionToSend);

        request.post({
            headers: {'content-type': 'application/json'},
            url: req_url,
            body: JSON.stringify(transactionToSend)
        }, function (error, response, body) {
            if (error) {
                console.log('ERROR OCCURRED: ');
                console.log(error);
            }
            console.log(body);
        });
    });
}

function startSendingRequests() {
    setInterval(function () {
        if (!paused) {
            const p = knownPeers[Math.floor(Math.random() * knownPeers.length)];
            makeGet(p.split(':')[0], p.split(':')[1])
        }
    }, 10000)
}

function getDataFromFile(filePath, callback) {
    fs.readFile(filePath, 'utf8', function(error, data) {
        if (error) {
            console.log('Error:- ' + error);
            throw error;
        }
        callback(data.split('\n').filter(s => s !== '' && parseInt(s) !== port));
    });
}

function appendToFile(line) {
    if (!knownPeers.includes(line)) {
        const stream = fs.createWriteStream(filePath, {flags: 'a'});
        stream.write(line + '\n');
        stream.end();
        knownPeers.push(line);
        console.log('Added new port ' + line)
    }
}

function removePeer(p) {
    const removePort = p.split(':')[1];
    if (removePort !== '8080' && removePort !== '9000' && removePort !== '9001') {
        knownPeers = knownPeers.filter(h => h !== p);
        fs.writeFile(filePath, knownPeers.join('\n'), function () {

        });
    }
}

function retryRequest(h, p) {
    let count = 1;
    const interval = setInterval(function () {
        if (!retrying) {
            clearInterval(interval);
            paused = false;
        }
        console.log('Retrying to connect peer ' + h + ':' + p + ' - Tried ' + count + ' times...\n');
        makeGet(h, p);
        count++;
        if (count > 5 && retrying) {
            console.log('Peer unreachable. Deleting from known peers');
            removePeer(h + ':' + p);
            clearInterval(interval);
            paused = false;
        }
    }, 4000)
}

function makeGet(host, p) {
    console.log('GET known peers from ' + host + ':' + p);
    const req_url = 'http://' + host + ':' + p + '/known-peers?client=' + peerHost + ':' + port;
    request({url: req_url}, function (error, response, body) {
        if (error) {
            console.log(host + ':' + p + ' unreachable\n');
            if (!paused) {
                paused = true;
                retrying = true;
                retryRequest(host, p)
            }
        }
        if (!error && response.statusCode === 200) {
            retrying = false;
            knownPeers = [...new Set(knownPeers.concat(body.split(',')))];
            knownPeers = knownPeers.filter(peer => peer !== (peerHost + ':' + port));
            console.log(body.split(','));

            fs.writeFile(filePath, knownPeers.join('\n'), function () {

            });
        }
    })
}
