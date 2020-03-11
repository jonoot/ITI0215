# Distributed ledger
### Get started
a) Clone project

`git clone https://github.com/jonoot/ITI0215.git`

b) Install dependencies

run `npm install` in project directory

### How program works
#### Initializing
To start a new peer run `node peer.js p=<port>` in project directory

Start server peers before running new nodes. Server addresses are listed in 'servers.txt'. Make sure to set correct IP 
for the servers when running in different machines.

If starting new peer is successful, peer's already known hosts are logged in console. If port hasn't been
used before (new peer) then a list of known peers will be created by reading data from 'servers.txt' file.
Also, peer's known hosts file will be created under 'peers' directory.

Known hosts file format example: `'peer-<host>-<port>.txt'`. 

#### Finding new peers
After starting up a peer, it will automatically start sending GET requests (/known-peers) to known peers.
Requests are sent every 10 seconds. Peer from known peers list is randomly chosen.
Already requested peers can be requested again as they might have new 
information. If request is successful, new peers will be added to known hosts.<br>If request is not successful, 
automatic requesting is paused and unreachable peer is pinged 5 more times with 5 second sleep period. 
If peer remains unreachable, it will be removed from known peers. Otherwise program continues as it did for successful request.
<br> New peers can also be added when request is received from unknown peer and it's address is given. Such requests can be
GET /known-hosts and POST /block 

#### Sending transactions
To add new transaction send POST request (/inv) to one of the peers. POST request must have transaction as JSON object.
If received transaction is valid and it's not existing already, it will be saved to peer's known blocks under 'blocks'
directory. Transaction is valid, if it has all fields filled: from, to, date, amount.

Known blocks file format example: `'peer-<host>-<port>.txt'`.
<br>Block will be saved as `{"hash":"transaction"}`. 
<br>Example: `{"07304f6f550af2d7ab9a768abbcdcee2b9b4d88523f477d8655090179b18fb5a":"{\n\t\"from\": \"Jaan\",\n\t\"to\": \"Riho\",\n\t\"date\": \"29-02-20\",\n\t\"amount\": \"0.0001\"\n}"}`
 
Received transaction will be also sent to all known peers with POST request (/block). Blocks which are received over
/block request will not be sent to others again.

#### Getting transactions
To view all blocks use GET request (/getBlocks). Use "hash" parameter to view blocks from specific hash.

### Endpoints

#### GET

`/known-peers?client=<clientAddresss>`
<br>returns list of known peers as string<br>
<br>example: `GET 127.0.0.1:9000/known-peers?client=127.0.0.1:8888`
<br>response: `127.0.0.1:8080,127.0.0.1:8888` | peer 127.0.0.1:8888 will be added as known host for the
peer 127.0.0.1:9000 if it wasn't known before. If no known peers are found, empty list will be returned.

`/getBlocks`
<br>returns list of all blocks hashes<br>
<br>example: `GET 127.0.0.1:9000/getBlocks`
<br>response: `[["ef9722a65076535bc2c5293e4ccd3c6eea152fefd7b54f6feb1c79efe8346e81"],["20b995e94e5d27a1024be327933682b07476f2ec3e0f9f2fe4dd6d6a58a4b361"]]`
<br>If no blocks are found, error message will be returned `{"errMessage":"No blocks found"}`

`/getBlocks?hash=<hash>`
<br>returns list of all blocks hashes starting from given hash<br>
<br>example: `GET 127.0.0.1:9000/getBlocks?hash=20b995e94e5d27a1024be327933682b07476f2ec3e0f9f2fe4dd6d6a58a4b361`
<br>response: `[["20b995e94e5d27a1024be327933682b07476f2ec3e0f9f2fe4dd6d6a58a4b361"]]`
<br>If no blocks are found, error message will be returned `{"errMessage":"No blocks found"}`

`/block?hash=<hash>`
<br>returns block details by hash
<br>example: `GET 127.0.0.1:9000/block?hash=20b995e94e5d27a1024be327933682b07476f2ec3e0f9f2fe4dd6d6a58a4b361`
<br>response: `{
                   "20b995e94e5d27a1024be327933682b07476f2ec3e0f9f2fe4dd6d6a58a4b361": "{\n\t\"from\": \"Tom823\",\n\t\"to\": \"Peep55\",\n\t\"date\": \"29-02-20\",\n\t\"amount\": \"0.0001\"\n}"
               }`
<br>If no blocks are found, error message will be returned `{"errMessage":"No blocks found"}`

#### POST

`/inv`
<br>requires body: transaction as JSON object. Transaction must be valid - must have 'from', 'to', 'date', 'amount'
fields filled
<br>saves transaction if it's not existing and sends it out to other known peers
<br>example: `POST 127.0.0.1:9000/inv` 
<br>body: `{
           	"from": "Tom",
           	"to": "Jay",
           	"date": "29-02-20",
           	"amount": "0.0001"
           }`
<br>response: `{
                   "success": "post received"
               }`
<br>If transaction is not valid, error is returned `{
                                                        "errMessage": "Transaction not valid"
                                                    }`
<br>If transaction already exists, error is returned `{
                                                        "errMessage": "Transaction already exists"
                                                    }`

`/block`
<br>requires body: stringified JSON object - transaction hash as key and transaction itself as value. Also requires sending peer's address
<br>example: `POST 127.0.0.1:9000/block` 
<br>body: `{ body:
              '{"ef9722a65076535bc2c5293e4ccd3c6eea152fefd7b54f6feb1c79efe8346e81":"{\\n\\t\\"from\\": \\"Tom83\\",\\n\\t\\"to\\": \\"Peep55\\",\\n\\t\\"date\\": \\"29-02-20\\",\\n\\t\\"amount\\": \\"0.0001\\"\\n}"}',
             peer: '127.0.0.1:9001' 
           }`
<br>saves transaction straight to receiving client's blocks file. If sender is unknown for the receiving peer,
sender address will be added as known peer.
