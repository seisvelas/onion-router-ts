// In the docs mention that on Tor this program
// is called Bastet and say interesting stuff.

import express = require('express');

/*
    Lots of scattered 'utility' functions that
    lack an obvious home are a kind of code smell.
    TODO: Architect strong, logical structure
    for accomodating functions like kickDeadRelays et al.
*/

// Eventually, name and kind should be command-line supplied (all optional)
// with key being a filename. If they aren't supplied they'll be generated at random, which
// is all I'll got fer now.
interface Relay {
    name: string,
    kind: 'entry' | 'middle' | 'exit'
}

// I'll crank up the complexity
// by throwing in some global state!
const relayPool: Relay[] = [];

const kickDeadRelays = (relayPool: Relay[]): void => {
    // TODO: Ping all relays (Promise.all?)
    // NB - This goes in a setInterval
}
/*
setInterval(()=>kickDeadRelays(relayPool), 20000);
*/

const app: express.Application = express();

app.use(express.json());

// A relay would like to join the network
app.post('/register', (req, res) => {
    console.log('received registration request:');
    console.table(req.body);
    const newRelay: Relay = { ...req.body } as Relay;
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