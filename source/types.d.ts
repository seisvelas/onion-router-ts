export type relayKind = 'entry' | 'middle' | 'exit' | 'cleartext'
export interface Relay {
    name: string,
    kind: relayKind,
    session?: Session
}


export interface Session {
    readonly sessionId: string,
    readonly key: number[],
    readonly timestamp: Date
}

export interface OnionRequest {
    sessionId: string,
    payload: number[]
}

export interface decryptedPayload {
    next: string,
    nextType: relayKind,
    remainingPayload?: {
        payload: number[],
        sessionId: string
    }
    finalPayload?: any
}