"use strict";
// In the docs mention that on Tor this program
// is called Bastet and say interesting stuff.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
    NOTE: this is not the client! The client will build the circuit.
    The client will establish session keys with each node in the circuit
    for the return trip encryption (https://security.stackexchange.com/questions/87172/how-does-a-tor-exit-node-know-the-public-key-of-the-client)
    Si si. Fascinating! So there is a process of building a session.
    I'll need to delete sessions as well, lest I create a memory leak
    (been awhile since I've had to deal with that!)
*/
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const aes_js_1 = __importDefault(require("aes-js"));
const crypto_1 = __importDefault(require("crypto"));
const yargs_1 = require("yargs");
const directoryAuthority = yargs_1.argv.dirauth || 'http://localhost:9001';
const sessions = [];
const expireSessions = (sessions) => {
};
var kind = (yargs_1.argv.type || 'middle');
var relay;
const app = express_1.default();
app.use(express_1.default.json());
// A relay would like to join the network
app.get('/ping', (req, res) => {
    res.send('ping');
});
// Return an ephemeral key and session identifier
// TODO: Understand/implement Diffie Hellman
// & make these ephemeral by deleting old ones
app.get('/session', (req, res) => {
    function randInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }
    let key = [];
    let max = 16;
    for (let i = 1; i <= max; i++) {
        key.push(randInt(max));
    }
    let sessionIdHash = crypto_1.default.createHash('md5').update(JSON.stringify(sessions)).digest('hex');
    let session = {
        sessionId: sessionIdHash,
        key: key,
        timestamp: new Date()
    };
    sessions.push(session);
    res.json(session);
});
const forwardRoute = async (res, decryptedPayload) => {
    try {
        console.log('Routing request to:');
        console.table(decryptedPayload);
        let routeRequest = await axios_1.default.post(`http://${decryptedPayload.next}/route`, decryptedPayload.remainingPayload);
        let routeResponse = routeRequest.data;
        // obvious we need to be encrypting this data on it's way home (which would
        // likewise be a great time to delete sessions). For now let's just get this to work.
        // See similar comment on exit relay code.
        res.end(routeResponse);
    }
    catch (e) {
        console.log(e);
        res.end('Could not route request');
    }
};
app.post('/route', (req, res) => {
    let route = { ...req.body };
    let session = sessions.find(({ sessionId }) => sessionId === route.sessionId);
    var aesCtr = new aes_js_1.default.ModeOfOperation.ctr(session.key);
    var decryptedBytes = aesCtr.decrypt(route.payload);
    // Convert our bytes back into text
    var decryptedPayload = JSON.parse(aes_js_1.default.utils.utf8.fromBytes(decryptedBytes));
    // json stringify the decryption. It will give us a destination
    // and depending on our relay type we will pass it along (or not)
    if (decryptedPayload.nextType === 'cleartext') {
        if (kind !== 'exit') {
            return res.end('Cannot exit from middle relay');
        }
        else {
            /*
                This immediately limits the requests our proxy can make to get requests.
                One decent solution would be to have the relays communicate via HTTP
                (so we can enjoy the convenience of Node's HTTP handling libraries)
                but have the final payload's be raw protocol content. That we we
                could proxy any TCP traffic, just like Tor.
            */
            // we need to encrypt this. For now let's just see if it works at all!
            return axios_1.default.get(`http://${decryptedPayload.next}`)
                .then(response => {
                console.log(response.data);
                res.end(response.data);
            });
        }
    }
    forwardRoute(res, decryptedPayload);
});
const server = app.listen(0, () => {
    // The relay is defined here, because we need to know which ephemeral port we'll be listening on
    let { port } = server === null || server === void 0 ? void 0 : server.address();
    relay = {
        name: `localhost:${port}`,
        kind: kind // TODO: use real command line parsing
    };
    axios_1.default.post(`${directoryAuthority}/register`, relay);
    console.log(`App is listening on port ${port}!`);
});
//# sourceMappingURL=relay.js.map