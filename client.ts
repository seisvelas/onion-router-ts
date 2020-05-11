import axios from 'axios';

const directoryAuthority = 'http://localhost:9001';

interface Session {
    readonly sessionId: string,
    readonly key: number[],
    readonly timestamp: Date
};

type relayKind = 'entry' | 'middle' | 'exit' | 'cleartext';
interface Relay {
    name: string,
    kind: relayKind,
    session?: Session
};

axios.get(`${directoryAuthority}/list`).then( res => {
    // get all relays
    const relays: any[] = res.data;
    return relays;
})
.then( relays => {
    // build circuit
    const entryRelay:Relay = relays.find( ({ kind }) => kind === 'entry');
    const middleRelay:Relay = relays.find( ({ kind }) => kind === 'middle')
    const exitRelay:Relay = relays.find( ({ kind }) => kind === 'exit')
    // In reality, we can do better than just ge the same first valid circuit possible.

    if (!entryRelay || !middleRelay || !exitRelay) {
        throw new Error('Could not build circuit');
    }

    const circuit = {
        entryRelay,
        middleRelay,
        exitRelay
    }

    return circuit;
}).then( async circuit => {
    // build sessions
    circuit.entryRelay.session = (await axios.get(`http://${circuit.entryRelay.name}/session`)).data;
    circuit.middleRelay.session = (await axios.get(`http://${circuit.middleRelay.name}/session`)).data;
    circuit.exitRelay.session = (await axios.get(`http://${circuit.exitRelay.name}/session`)).data;

    // Sessions all built!
    return circuit
}).then( circuit => {
    console.table(circuit);
})
// then ANOTHER .then to build + send the request!
.catch( e => console.log(e));