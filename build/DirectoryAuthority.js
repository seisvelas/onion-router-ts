"use strict";
// In the docs mention that on Tor this program
// is called Bastet and say interesting stuff.
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
// I'll crank up the complexity
// by throwing in some global state!
const relayPool = [];
const kickDeadRelays = (relayPool) => {
    // TODO: Ping all relays (Promise.all?)
    // NB - This goes in a setInterval
};
/*
setInterval(()=>kickDeadRelays(relayPool), 20000);
*/
const app = express();
app.use(express.json());
// A relay would like to join the network
app.post('/register', (req, res) => {
    console.log('received registration request:');
    console.table(req.body);
    const newRelay = { ...req.body };
    relayPool.push(newRelay);
    res.json(newRelay);
});
app.get('/list', (req, res) => {
    // Mix this up or else lazy clients will just grab
    // and exhaust the first valid set of relays possible
    res.json(relayPool);
});
//Vegeta port
app.listen(9001, () => {
    console.log('App is listening on port 9001!');
});
//# sourceMappingURL=DirectoryAuthority.js.map