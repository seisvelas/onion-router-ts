import axios from 'axios';
import aesjs from 'aes-js';
import { argv } from 'yargs';
import {
    Relay,
    decryptedPayload
} from './types.d'

const directoryAuthority = argv.dirauth || 'http://localhost:9001';

// we will make a get request to next and get the results back
const payload: decryptedPayload = {
    next: '',
    nextType: 'cleartext',
    finalPayload: {
        method: 'get',
        url: 'http://localhost/secret.txt',
    }
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

    /*
        A better approach would be to make the middle an array of relays,
        in case we want more than 3 hops
    */
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
.catch( e => console.log(e));