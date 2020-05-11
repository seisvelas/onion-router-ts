"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const directoryAuthority = 'http://localhost:9001';
;
;
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
}).then(circuit => {
    console.table(circuit);
})
    // then ANOTHER .then to build + send the request!
    .catch(e => console.log(e));
//# sourceMappingURL=client.js.map