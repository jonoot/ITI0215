# Distributed ledger
### Get started
a) Clone project

`git clone https://github.com/jonoot/ITI0215.git`

b) Install dependencies

run `npm install` in project directory

### How program works
#### Initializing
To start a new peer run `node peer.js p=<port>` in project directory

Start server peers before running new nodes. Server ports are listed in 'servers.txt' (8080, 9000, 9001)

If starting new peer is successful, peer's already known hosts are logged in console. If port hasn't been
used before (new peer) then a list of known peers will be created by reading data from 'servers.txt' file.
Also, peer's known hosts file will be created under 'peers' directory.

Known hosts file format example: `'peer-<port>.txt'`. 

#### Finding new peers
After starting up a peer, it will automatically start sending GET requests (/known-peers) to known peers.
Requests are sent every 10 seconds. Peer from known peers list is randomly chosen.
Already requested peers can be requested again as they might have new 
information. If request is successful, new peers will be added to known hosts.<br>If request is not successful, 
automatic requesting is paused and unreachable peer is pinged 5 more times with 5
unreachable, it will be removed from known peers. Otherwise program continues as it did for successful request.
<br><strong>Peer which receives request</strong> (GET /known-peers) will save requesting peer as known host.

#### Sending transactions
To add new transaction send POST request (/inv) to one of the peers. POST request must have transaction as JSON object.
If received transaction is valid and it's not existing already, it will be saved to peer's known blocks under 'blocks'
directory. Transaction is valid, if it has all fields filled: from, to, date, amount.

Known blocks file format example: `'peer-<port>.txt'`.
<br>Block will be saved as `{"hash":"transaction"}`. 
<br>Example: `{"07304f6f550af2d7ab9a768abbcdcee2b9b4d88523f477d8655090179b18fb5a":"{\n\t\"from\": \"Jaan\",\n\t\"to\": \"Riho\",\n\t\"date\": \"29-02-20\",\n\t\"amount\": \"0.0001\"\n}"}`
 
Received transaction will be also sent to all known peers with POST request (/block). Blocks which are received over
/block request will not be sent to others again.

#### Getting transactions
To view all blocks use GET request (/getBlocks). Use "hash" parameter to view blocks from specific hash.

### Endpoints

#### GET

`/known-peers?client=<clientPort>`
<br>returns list of known peers as string

`/getBlocks`
<br>returns list of all blocks as JSON objects

`/getBlocks?hash=<hash>`
<br>returns list of blocks as JSON objects starting from given hash

#### POST

`/inv`
<br>requires body: transaction as JSON object
<br>saves transaction if it's not existing and sends it out to other known peers

`/block`
<br>requires body: hashed transaction + transaction itself
<br>saves transaction straight to file
