// In the docs mention that on Tor this program
// is called Bastet and say interesting stuff.


/*
    NOTE: this is not the client! The client will build the circuit.
    The client will establish session keys with each node in the circuit
    for the return trip encryption (https://security.stackexchange.com/questions/87172/how-does-a-tor-exit-node-know-the-public-key-of-the-client)
    Si si. Fascinating! So there is a process of building a session.
    I'll need to delete sessions as well, lest I create a memory leak
    (been awhile since I've had to deal with that!)
*/

import express from 'express';
import { AddressInfo } from 'net';
import axios from 'axios';
import aesjs from 'aes-js';
import crypto from'crypto';

const directoryAuthority = 'http://localhost:9001';

/*
    Lots of scattered 'utility' functions that
    lack an obvious home are a kind of code smell.
    TODO: Architect strong, logical structure
    for accomodating functions like kickDeadRelays et al.
*/

const kickDeadRelays = (): void => {
    // TODO: Ping all relays (Promise.all?)
    // NB - This goes in a setInterval
}

// Eventually, name and kind should be command-line supplied (all optional)
// with key being a filename. If they aren't supplied they'll be generated at random, which
// is all I'll got fer now.
type relayKind = 'entry' | 'middle' | 'exit' | 'cleartext';
interface Relay {
    name: string,
    kind: relayKind
};

interface Session {
    readonly sessionId: string,
    readonly key: number[],
    readonly timestamp: Date
};

const sessions: Session[] = []

var kind:relayKind = (process.argv[2] || 'middle') as relayKind;
var relay: Relay;

const app: express.Application = express();

app.use(express.json());

// A relay would like to join the network
app.get('/ping', (req, res) => {
    res.send('ping');
});

// Return an ephemeral key and session identifier
// TODO: Understand/implement Diffie Hellman
// & make these ephemeral by deleting old ones
app.get('/session', (req, res) => {
    function randInt(max: number) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    let key: number[] = [];
    let max: number = 16;

    for (let i = 1; i <= max; i++) {
        key.push(randInt(max));
    }

    let sessionIdHash = crypto.createHash('md5').update(
        JSON.stringify(sessions)
    ).digest('hex');

    let session: Session = {
        sessionId: sessionIdHash,
        key: key,
        timestamp: new Date()
    };

    sessions.push(session);

    res.json(session);
});

interface OnionRequest {
    sessionId: string,
    payload: number[]
}

interface decryptedPayload {
    next: string,
    nextType: relayKind,
    remainingPayload: {
        payload: number[],
        sessionId: string
    }
}

const forwardRoute = async (res: any, decryptedPayload: decryptedPayload) => {
    try {
        let routeRequest = await axios.post(`${decryptedPayload.next}/route`, {a:1})
        let routeResponse = routeRequest.data;
        // obvious we need to be encrypting this data on it's way home (which would
        // likewise be a great time to delete sessions). For now let's just get this to work.
        // See similar comment on exit relay code.
        res.end(routeResponse);
    } catch (e) {
        res.end('Could not route request');
    }
}

app.post('/route', (req, res) => {
    let route:OnionRequest = { ...req.body };
    let session:Session = sessions.find(({ sessionId }) => sessionId === route.sessionId) as Session;

    var aesCtr = new aesjs.ModeOfOperation.ctr(session.key);
    var decryptedBytes = aesCtr.decrypt(route.payload);
 
// Convert our bytes back into text
    var decryptedPayload:decryptedPayload = JSON.parse(aesjs.utils.utf8.fromBytes(decryptedBytes));
    // json stringify the decryption. It will give us a destination
    // and depending on our relay type we will pass it along (or not)

    if (decryptedPayload.nextType === 'cleartext') {
        if (kind !== 'exit') {
            return res.end('Cannot exit from middle relay');
        } else {
            /*
                This immediately limits the requests our proxy can make to get requests.
                One decent solution would be to have the relays communicate via HTTP
                (so we can enjoy the convenience of Node's HTTP handling libraries)
                but have the final payload's be raw protocol content. That we we 
                could proxy any TCP traffic, just like Tor.
            */

            // we need to encrypt this. For now let's just see if it works at all!
            axios.get(`${decryptedPayload.next}`)
            .then(response => res.end(response));
        }
    }

    forwardRoute(res, decryptedPayload)
});

const server = app.listen(0, () => {
    let { port } = server?.address() as AddressInfo;
    relay = {
        name: `localhost:${port}`, // blah blah blah command line parsing blah blah (even then, the machine's hostname would be a saner default than 'localhost')
        kind: kind // TODO: use real command line parsing
    };
    axios.post(`${directoryAuthority}/register`, relay);
    console.log(`App is listening on port ${port}!`);
});
