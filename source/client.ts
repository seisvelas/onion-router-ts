import axios from 'axios';
import aesjs from 'aes-js';

const payload = {
    next: 'localhost/secret.txt',
    nextType: 'cleartext'
}

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
    };

    return circuit;
}).then( async circuit => {
    // build sessions
    circuit.entryRelay.session = (await axios.get(`http://${circuit.entryRelay.name}/session`)).data;
    circuit.middleRelay.session = (await axios.get(`http://${circuit.middleRelay.name}/session`)).data;
    circuit.exitRelay.session = (await axios.get(`http://${circuit.exitRelay.name}/session`)).data;

    // Sessions all built!
    return circuit
}).then( async circuit => {
    // Here we will build our payload and send it through the network!!!!
    var payloadBytes = aesjs.utils.utf8.toBytes(JSON.stringify(payload));
    
    // The counter is optional, and if omitted will begin at 1
    var aesCtr = new aesjs.ModeOfOperation.ctr(circuit.exitRelay.session?.key as number[]);
    var encryptedBytes = aesCtr.encrypt(payloadBytes);

    let exitPayload = {
        sessionId: circuit.exitRelay.session?.sessionId,
        payload: Array.from(encryptedBytes)
    };

    // Make Middle payload


    payloadBytes = aesjs.utils.utf8.toBytes(JSON.stringify({
        next: circuit.exitRelay.name,
        nextType: 'exit',
        remainingPayload: exitPayload
    }));

    aesCtr = new aesjs.ModeOfOperation.ctr(circuit.middleRelay.session?.key as number[]);
    encryptedBytes = aesCtr.encrypt(payloadBytes);

    let middlePayload = {
        sessionId: circuit.middleRelay.session?.sessionId,
        payload: Array.from(encryptedBytes)
    };

    // Make Entry payload

    payloadBytes = aesjs.utils.utf8.toBytes(JSON.stringify({
        next: circuit.middleRelay.name,
        nextType: 'middle',
        remainingPayload: middlePayload
    }));

    aesCtr = new aesjs.ModeOfOperation.ctr(circuit.entryRelay.session?.key as number[]);
    encryptedBytes = aesCtr.encrypt(payloadBytes);

    let entryPayload = {
        sessionId: circuit.entryRelay.session?.sessionId,
        payload: Array.from(encryptedBytes)
    };

    return await axios.post(`http://${circuit.entryRelay.name}/route`, entryPayload);
    // imagine what a nightmare it will be to test this network with Postman
}).then(({data}) => {
    console.log(data);
})
// then ANOTHER .then to build + send the request!
.catch( e => console.log(e));