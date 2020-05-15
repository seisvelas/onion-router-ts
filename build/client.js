"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const aes_js_1 = __importDefault(require("aes-js"));
const yargs_1 = require("yargs");
const directoryAuthority = yargs_1.argv.dirauth || 'http://localhost:9001';
// we will make a get request to next and get the results back
const payload = {
    next: 'localhost/secret.txt',
    nextType: 'cleartext'
};
axios_1.default.get(`${directoryAuthority}/list`).then(res => {
    // get all relays
    const relays = res.data;
    return relays;
})
    .then(relays => {
    // build circuit
    const entryRelay = relays.find(({ kind }) => kind === 'entry');
    const middleRelay = relays.find(({ kind }) => kind === 'middle');
    const exitRelay = relays.find(({ kind }) => kind === 'exit');
    // In reality, we can do better than just ge the same first valid circuit possible.
    if (!entryRelay || !middleRelay || !exitRelay) {
        throw new Error('Could not build circuit');
    }
    const circuit = {
        entryRelay,
        middleRelay,
        exitRelay
    };
    return circuit;
}).then(async (circuit) => {
    // build sessions
    circuit.entryRelay.session = (await axios_1.default.get(`http://${circuit.entryRelay.name}/session`)).data;
    circuit.middleRelay.session = (await axios_1.default.get(`http://${circuit.middleRelay.name}/session`)).data;
    circuit.exitRelay.session = (await axios_1.default.get(`http://${circuit.exitRelay.name}/session`)).data;
    // Sessions all built!
    return circuit;
}).then(async (circuit) => {
    var _a, _b, _c, _d, _e, _f;
    // Here we will build our payload and send it through the network!!!!
    var payloadBytes = aes_js_1.default.utils.utf8.toBytes(JSON.stringify(payload));
    // The counter is optional, and if omitted will begin at 1
    var aesCtr = new aes_js_1.default.ModeOfOperation.ctr((_a = circuit.exitRelay.session) === null || _a === void 0 ? void 0 : _a.key);
    var encryptedBytes = aesCtr.encrypt(payloadBytes);
    let exitPayload = {
        sessionId: (_b = circuit.exitRelay.session) === null || _b === void 0 ? void 0 : _b.sessionId,
        payload: Array.from(encryptedBytes)
    };
    // Make Middle payload
    /*
        A better approach would be to make the middle an array of relays,
        in case we want more than 3 hops
    */
    payloadBytes = aes_js_1.default.utils.utf8.toBytes(JSON.stringify({
        next: circuit.exitRelay.name,
        nextType: 'exit',
        remainingPayload: exitPayload
    }));
    aesCtr = new aes_js_1.default.ModeOfOperation.ctr((_c = circuit.middleRelay.session) === null || _c === void 0 ? void 0 : _c.key);
    encryptedBytes = aesCtr.encrypt(payloadBytes);
    let middlePayload = {
        sessionId: (_d = circuit.middleRelay.session) === null || _d === void 0 ? void 0 : _d.sessionId,
        payload: Array.from(encryptedBytes)
    };
    // Make Entry payload
    payloadBytes = aes_js_1.default.utils.utf8.toBytes(JSON.stringify({
        next: circuit.middleRelay.name,
        nextType: 'middle',
        remainingPayload: middlePayload
    }));
    aesCtr = new aes_js_1.default.ModeOfOperation.ctr((_e = circuit.entryRelay.session) === null || _e === void 0 ? void 0 : _e.key);
    encryptedBytes = aesCtr.encrypt(payloadBytes);
    let entryPayload = {
        sessionId: (_f = circuit.entryRelay.session) === null || _f === void 0 ? void 0 : _f.sessionId,
        payload: Array.from(encryptedBytes)
    };
    return await axios_1.default.post(`http://${circuit.entryRelay.name}/route`, entryPayload);
    // imagine what a nightmare it will be to test this network with Postman
}).then(({ data }) => {
    console.log(data);
})
    // then ANOTHER .then to build + send the request!
    .catch(e => console.log(e));
//# sourceMappingURL=client.js.map