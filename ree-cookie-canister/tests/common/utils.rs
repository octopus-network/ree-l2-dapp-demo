// use crate::test::args::EstimateMinTxFeeArgs;

use std::{collections::BTreeMap, path::PathBuf, str::FromStr};

use candid::{Decode, Encode, Principal};
// use super::common::args::EstimateMinTxFeeArgs;
use ic_agent::{identity::Secp256k1Identity, Agent};
use ic_cdk::api::management_canister::bitcoin::Satoshi;
use ree_types::{
    bitcoin::{
        key::Secp256k1,
        psbt::{Input, Output},
        secp256k1::{Message, SecretKey, Signing},
        sighash::SighashCache,
        Amount, EcdsaSighashType, OutPoint, Psbt, ScriptBuf, Sequence, TxIn, TxOut, Txid,
        WPubkeyHash, Witness,
    },
    orchestrator_interfaces::{InvokeArgs, InvokeResponse},
};

use super::args::EstimateMinTxFeeArgs;

pub fn get_local_identity() -> Secp256k1Identity {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    let path = PathBuf::from(format!("{}/../default_identity.pem", manifest_dir));
    let pem_content = std::fs::read_to_string(path).expect("Failed to read pem file.");
    Secp256k1Identity::from_pem(pem_content.as_bytes()).expect("Failed to get identity.")
}

pub async fn call_estimate_min_tx_fee_on_testnet(
    args: &EstimateMinTxFeeArgs,
) -> Result<u64, String> {
    let agent_identity = get_local_identity();

    let agent = Agent::builder()
        .with_url("https://ic0.app")
        .with_identity(agent_identity)
        .build()
        .map_err(|e| format!("{:?}", e))?;

    let canister_id = Principal::from_text("hvyp5-5yaaa-aaaao-qjxha-cai".to_string())
        .expect("Failed to parse canister id.");

    let arg: Vec<u8> = Encode!(args).expect("Failed to encode the arguments.");

    let res = agent
        .update(&canister_id, "estimate_min_tx_fee")
        .with_arg(arg)
        .call_and_wait()
        .await
        .expect("Failed to call the canister.");
    Decode!(&res, Result<u64, String>).expect("Failed to decode the response.")
}

pub fn sign_input(psbt: &Psbt, input_index: usize, owner_address: &str) -> Witness {
    let secp = Secp256k1::new();
    let sighash_type = EcdsaSighashType::All;
    let mut unsigned_tx = psbt.unsigned_tx.clone();
    let mut sighasher = SighashCache::new(&mut unsigned_tx);
    let prev_txout = &psbt.inputs[input_index].witness_utxo.clone().unwrap();
    let sighash = sighasher
        .p2wpkh_signature_hash(
            input_index,
            &prev_txout.script_pubkey,
            prev_txout.value,
            sighash_type,
        )
        .expect("Failed to get sighash");
    //
    // Sign the sighash using the secp256k1 library (exported by rust-bitcoin).
    //
    let msg = Message::from(sighash);
    let (sk, _) = get_sender_keys(&secp, &owner_address);
    let signature = secp.sign_ecdsa(&msg, &sk);
    //
    // Update the witness stack.
    //
    let signature = ree_types::bitcoin::ecdsa::Signature {
        signature,
        sighash_type,
    };
    let pk = sk.public_key(&secp);
    Witness::p2wpkh(&signature, &pk)
}

fn get_sender_keys<C: Signing>(secp: &Secp256k1<C>, address: &str) -> (SecretKey, WPubkeyHash) {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    let path = PathBuf::from(format!("{}/../sk_{}.txt", manifest_dir, address));
    let sk_hex = std::fs::read_to_string(path).expect("Failed to read pem file.");
    let sk = SecretKey::from_slice(&hex::decode(sk_hex.trim()).unwrap()).expect("Failed to get sk");
    let pk = ree_types::bitcoin::PublicKey::new(sk.public_key(secp));
    let wpkh = pk.wpubkey_hash().expect("key is compressed");

    (sk, wpkh)
}

pub async fn call_invoke_on_testnet(invoke_args: &InvokeArgs) -> InvokeResponse {
    let agent_identity = get_local_identity();

    let agent = Agent::builder()
        .with_url("https://ic0.app")
        .with_identity(agent_identity)
        .build()
        .map_err(|e| format!("{:?}", e))?;

    let canister_id = Principal::from_text("hvyp5-5yaaa-aaaao-qjxha-cai".to_string())
        .expect("Failed to parse canister id.");

    let arg: Vec<u8> = Encode!(invoke_args).expect("Failed to encode the arguments.");

    let res = agent
        .update(&canister_id, "invoke")
        .with_arg(arg)
        .call_and_wait()
        .await
        .expect("Failed to call the canister.");

    let result = Decode!(&res, InvokeResponse).expect("Failed to decode the response.");
    result

    // match ret {
    //     ic_agent::agent::CallResponse::Response(out) => {
    //         let result = Decode!(&out.0, InvokeResponse).expect("Failed to decode the response.");
    //         result
    //     }
    //     ic_agent::agent::CallResponse::Poll(request_id) => {
    //         panic!("Call timeout. Request id: {:?}", request_id)
    //     }
    // }
}

pub fn add_output(psbt: &mut Psbt, value: Satoshi, script_pubkey: ScriptBuf) {
    psbt.unsigned_tx.output.push(TxOut {
        value: Amount::from_sat(value),
        script_pubkey,
    });

    psbt.outputs.push(Output {
        redeem_script: None,
        witness_script: None,
        bip32_derivation: BTreeMap::new(),
        tap_internal_key: None,
        tap_tree: None,
        tap_key_origins: BTreeMap::new(),
        proprietary: BTreeMap::new(),
        unknown: BTreeMap::new(),
    });
}

pub fn add_input(
    psbt: &mut Psbt,
    txid: &str,
    vout: u32,
    satoshi: Satoshi,
    script_pubkey: ScriptBuf,
) {
    psbt.unsigned_tx.input.push(TxIn {
        previous_output: OutPoint {
            txid: Txid::from_str(txid).unwrap(),
            vout,
        },
        script_sig: ScriptBuf::default(),
        sequence: Sequence(0xffffffff),
        witness: Witness::default(),
    });
    psbt.inputs.push(Input {
        non_witness_utxo: None,
        witness_utxo: Some(TxOut {
            value: Amount::from_sat(satoshi),
            script_pubkey: script_pubkey,
        }),
        partial_sigs: BTreeMap::new(),
        sighash_type: None,
        redeem_script: None,
        witness_script: None,
        bip32_derivation: BTreeMap::new(),
        final_script_sig: None,
        final_script_witness: None,
        ripemd160_preimages: BTreeMap::new(),
        sha256_preimages: BTreeMap::new(),
        hash160_preimages: BTreeMap::new(),
        hash256_preimages: BTreeMap::new(),
        tap_key_sig: None,
        tap_script_sigs: BTreeMap::new(),
        tap_scripts: BTreeMap::new(),
        tap_key_origins: BTreeMap::new(),
        tap_internal_key: None,
        tap_merkle_root: None,
        proprietary: BTreeMap::new(),
        unknown: BTreeMap::new(),
    });
}
