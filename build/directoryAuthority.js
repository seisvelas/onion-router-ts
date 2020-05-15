"use strict";
// In the docs mention that on Tor this program
// is called Bastet and say interesting stuff.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const axios_1 = __importDefault(require("axios"));
/*
    Lots of scattered 'utility' functions that
    lack an obvious home are a kind of code smell.
    TODO: Architect strong, logical structure
    for accomodating functions like kickDeadRelays et al.
*/
// Eventually, name and kind should be command-line supplied (all optional)
// with key being a filename. If they aren't supplied they'll be generated at random, which
// is all I'll got fer now.
// I'll crank up the complexity
// by throwing in some global state!
const relayPool = [];
const kickDeadRelays = async (relayPool) => {
    console.log(relayPool);
    for (let i = 0; i < relayPool.length; i++) {
        let relay = relayPool[i];
        try {
            let response = await axios_1.default.get(`http://${relay.name}/ping`, { timeout: 2000 });
            if (response.data !== 'ping') {
                throw new Error('Relay did not return ping: ' + relay.name);
            }
        }
        catch (e) {
            relayPool.splice(i, 1);
            i--;
            console.log(`unresponsive relay: ${relay.name}`);
            console.log(`error: ${e}`);
        }
    }
};
setInterval(() => kickDeadRelays(relayPool), 60000);
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
//# sourceMappingURL=directoryAuthority.js.map