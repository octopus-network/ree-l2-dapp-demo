import { Actor, AnonymousIdentity, DerEncodedPublicKey, HttpAgent, Identity, SignIdentity, Signature } from "@dfinity/agent";
import { AuthClientStorage, IdbStorage, KEY_STORAGE_KEY } from "@dfinity/auth-client";
import { KEY_STORAGE_DELEGATION, KEY_VECTOR } from "@dfinity/auth-client/lib/cjs/storage";
import { Delegation, DelegationChain, DelegationIdentity, Ed25519KeyIdentity, Ed25519PublicKey, PartialDelegationIdentity, PartialIdentity, isDelegationValid } from "@dfinity/identity";
import { LaserEyesClient, createStores, createConfig, UNISAT } from '@omnisat/lasereyes-core';
import { idlFactory as CustomIdentityFactory, _SERVICE as CustomIdentityService, SignedDelegation } from "./service.did";
import { Principal } from "@dfinity/principal";
import { toHexString } from "@dfinity/candid";
import { TESTNET4 } from "@omnisat/lasereyes";

export function fromHexString(hexString: string): ArrayBuffer {
    return new Uint8Array((hexString.match(/.{1,2}/g) ?? []).map(byte => parseInt(byte, 16))).buffer;
}

const ECDSA_KEY_LABEL = 'ECDSA';
const ED25519_KEY_LABEL = 'Ed25519';
// export const isBrowser = typeof window !== 'undefined';
type BaseKeyType = typeof ECDSA_KEY_LABEL | typeof ED25519_KEY_LABEL;
type PublicKey = Array<number>;

// Create stores for state management
// const stores = createStores();

// Optional: Create configuration with network setting
// const config = createConfig({
//     network: TESTNET4
// });

// Initialize the client
// const client = new LaserEyesClient(stores, config);
// client.initialize();

export class Bip322AuthClient {

    constructor(
        public identity: Identity,
        public key: Ed25519KeyIdentity,
        public chain: DelegationChain | null,
        public storage: AuthClientStorage
    ) {

    }

    public static async create(): Promise<Bip322AuthClient> {
        const storage = new IdbStorage();

        let key: null | Ed25519KeyIdentity = null;
        let identity: SignIdentity | PartialIdentity = new AnonymousIdentity() as PartialIdentity;
        let chain: null | DelegationChain = null;

        let delegationExist = await storage.get(KEY_STORAGE_DELEGATION) && await storage.get(KEY_STORAGE_KEY);
        let maybeIdentityStorage = await storage.get(KEY_STORAGE_KEY);
        if (delegationExist) {
            if (typeof maybeIdentityStorage === 'string') {
                key = Ed25519KeyIdentity.fromJSON(maybeIdentityStorage);
                // key = await ECDSAKeyIdentity.fromKeyPair(maybeIdentityStorage);
                const chainStorage = await storage.get(KEY_STORAGE_DELEGATION);
                chain = DelegationChain.fromJSON(chainStorage!);
                // Verify that the delegation isn't expired.
                if (!isDelegationValid(chain)) {
                    await _deleteStorage();
                    key = null;
                } else {
                    // If the key is a public key, then we create a PartialDelegationIdentity.
                    if ('toDer' in key) {
                        // identity = PartialDelegationIdentity.fromDelegation(key, chain);
                        throw new Error('Should not have toDer in key');
                        // otherwise, we create a DelegationIdentity.
                    } else {
                        identity = DelegationIdentity.fromDelegation(key, chain);
                    }
                }
            } else {
                throw new Error('Invalid key type');
            }
        }

        if (!key) {
            // key = await ECDSAKeyIdentity.generate();
            key = Ed25519KeyIdentity.generate();
            identity = key
            await storage.set(KEY_STORAGE_KEY, JSON.stringify((key as Ed25519KeyIdentity).toJSON()));

        }

        return new this(identity, key, chain, storage);
    }

    async isValidDelegationExisted() {
        const storage = new IdbStorage();
        let delegationExist = await storage.get(KEY_STORAGE_DELEGATION) && await storage.get(KEY_STORAGE_KEY);
        if (!delegationExist) return false
        let maybeIdentityStorage = await storage.get(KEY_STORAGE_KEY);
        if (!maybeIdentityStorage) return false
        const chainStorage = await storage.get(KEY_STORAGE_DELEGATION);
        let chain = DelegationChain.fromJSON(chainStorage!);
        return isDelegationValid(chain)


    }

    // async loginWithUnisat(): Promise<void> {
    //     // 
    //     let key = this.key;

    //     let hex_pub_key = key.toJSON()[0]
    //     console.log(
    //         "generate key", this.key.toJSON(),
    //         "generate key identity", this.key.getPrincipal().toText(),
    //         "generate key publicKey hex", hex_pub_key
    //     )

    //     await client.connect(UNISAT);
    //     const accounts = await client.requestAccounts();
    //     if (!accounts || accounts?.length === 0) {
    //         throw new Error('No accounts found');
    //     }
    //     let current_account = accounts[0];
    //     const signature = (await client.signMessage(hex_pub_key, {
    //         toSignAddress: current_account,
    //         protocol: "bip322"
    //     }))!;
    //     // client.disconnect();
    //     // Set default maxTimeToLive to 8 hours
    //     const defaultTimeToLive = /* hours */ BigInt(8) * /* nanoseconds */ BigInt(3_600_000_000_000);
    //     await this.delegation_process(
    //         current_account,
    //         signature,
    //         defaultTimeToLive
    //     );
    // }

    public get_hex_pub_key() {
        return this.key.toJSON()[0]
    }

    async delegation_process(
        address: string,
        bip322_signature: string,
        maxTimeToLive: bigint | undefined = BigInt(8) * BigInt(3_600_000_000_000),
    ) {
        let hex_pub_key = this.get_hex_pub_key()
        const actor = Bip322AuthClient.getActor(this.identity);
        const arg: [string, string, string] = [address, hex_pub_key, bip322_signature]
        const res = (await actor.prepare_delegation([maxTimeToLive], {
            'Bip322': arg
        })) //as [Uint8Array, bigint]
        if ("Ok" in res) {
            let r = res.Ok as [Uint8Array, bigint];
            console.log('Prepare Delegation:', JSON.stringify(r[0]));
            console.log('Prepare Delegation return session key hex', toHexString(r[0]));

            let publicKeyArray = [...new Uint8Array(this.key.getPublicKey().toDer())]
            let get_delegation_res = await actor.get_delegation(
                address,
                publicKeyArray,
                r[1]
            )
            console.log('Get Delegation:', get_delegation_res);
            if ("Ok" in get_delegation_res) {
                let signed_delegation: SignedDelegation = get_delegation_res.Ok
                console.log('Get Delegation res:', r);
                console.log('Get Delegation res signature:', toHexString(signed_delegation.signature as Uint8Array));
                console.log('Get Delegation res, delegation publickey:', toHexString(signed_delegation.delegation.pubkey as Uint8Array));

                // let delegations = [signed_delegation]
                // PublicKey.fr

                // DelegationChain.fromDelegations
                // let delegationChain = await DelegationChain.create(
                //     this.key,
                //     Ed25519PublicKey.fromRaw(signed_delegation.delegation.pubkey as Uint8Array),
                //     new Date(r[1].toLocaleString())
                // )

                let delegationChain = DelegationChain.fromDelegations(
                    [
                        {
                            delegation: new Delegation(
                                signed_delegation.delegation.pubkey as Uint8Array,
                                signed_delegation.delegation.expiration,
                                signed_delegation.delegation.targets as Principal[]
                            ),
                            signature: Uint8Array.from(signed_delegation.signature).buffer as Signature
                        }
                    ],
                    // this.key.getPublicKey().toDer() as DerEncodedPublicKey
                    r[0].buffer as DerEncodedPublicKey
                )


                this.chain = delegationChain
                console.log('before get delegation chain identity:', this.identity.getPrincipal().toText());
                if ('toDer' in this.key) {
                    this.identity = PartialDelegationIdentity.fromDelegation(this.key.getPublicKey(), this.chain);
                } else {
                    this.identity = DelegationIdentity.fromDelegation(this.key, this.chain)
                }
                console.log('after get delegation chain identity:', this.identity.getPrincipal().toText());
                if (this.chain) {
                    await this.storage.set(
                        KEY_STORAGE_DELEGATION,
                        JSON.stringify(this.chain.toJSON()),
                    );
                }

            } else {
                // throw new Error('Error Res from get_delegation', get_delegation_res)
                throw new Error(`Error Res from get_delegation, error: ${get_delegation_res}`);
            }
        } else {
            throw new Error(`Error Res from prepare_delegation, error: ${JSON.stringify(res)}`);
        }
    }

    static getActor(identity?: Identity) {
        const agent = HttpAgent.createSync({
            identity: identity,
            host: "https://ic0.app"
        });
        return Actor.createActor<CustomIdentityService>(CustomIdentityFactory, {
            agent,
            canisterId: "ohog6-aqaaa-aaaam-aeheq-cai",
        });
    }
}

export async function _deleteStorage() {
    const storage = new IdbStorage();
    await storage.remove(KEY_STORAGE_KEY);
    await storage.remove(KEY_STORAGE_DELEGATION);
    await storage.remove(KEY_VECTOR);
}