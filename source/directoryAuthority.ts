// In the docs mention that on Tor this program
// is called Bastet and say interesting stuff.

import express = require('express');
import axios from 'axios';
import {
    Relay
} from './types.d'

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
const relayPool: Relay[] = [];

const kickDeadRelays = async (relayPool: Relay[]) => {
    console.log(relayPool);
    for (let i = 0; i < relayPool.length; i++) {
        let relay:Relay = relayPool[i];
        try {
            let response = await axios.get(`http://${relay.name}/ping`, { timeout: 2000 });
            if (response.data !== 'ping') {
                throw new Error('Relay did not return ping: ' + relay.name);
            }
        } catch (e) {
            relayPool.splice(i, 1);
            i--;
            console.log(`unresponsive relay: ${relay.name}`);
            console.log(`error: ${e}`);
        }
    }
}

setInterval(()=>kickDeadRelays(relayPool), 60000);

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
