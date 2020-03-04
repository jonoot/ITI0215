#Distributed ledger
###Get started
a) Clone project

`git clone https://github.com/jonoot/ITI0215.git`

b) Install dependencies

run `npm install` in project directory

###How program works
####Initializing
To start a new peer run `node peer.js p=<port>` in project directory

Start server peers before running new nodes. Server ports are listed in 'servers.txt' (8080, 9000, 9001)

If starting new peer is successful, peer's already known hosts are logged in console. If port hasn't been
used before (new peer) then a list of known peers will be created by reading data from 'servers.txt' file.
Also, peer's known hosts file will be created under 'peers' directory.

Known hosts file format example: `'peer-<port>.txt'`.

####Finding new peers
After starting up a peer, it will automatically start sending GET requests (/known-peers) to known peers.
Requests are sent every 10 seconds. Peer from known peers list is randomly chosen.
Already requested peers can be requested again as they might have new 
information. If request is successful, new peers will be added to known hosts.<br>If request is not successful, 
automatic requesting is paused and unreachable peer is pinged 5 more times with 3 second intervals. If peer remains
unreachable, it will be removed from known peers. Otherwise program continues as it did for successful request.
<br><strong>Peer which receives request</strong> (GET /known-peers) will save requesting peer as known host.
