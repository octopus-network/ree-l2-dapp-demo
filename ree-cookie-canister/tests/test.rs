mod common;

use std::{collections::BTreeMap, str::FromStr};

use candid::CandidType;
use common::{
    args::{EstimateMinTxFeeArgs, TxOutputType},
    utils::{
        add_input, add_output, call_estimate_min_tx_fee_on_testnet, call_invoke_on_testnet,
        sign_input,
    },
};
use ic_cdk::api::management_canister::bitcoin::Satoshi;
use ree_types::{
    bitcoin::{
        absolute::LockTime,
        opcodes::all::{OP_PUSHNUM_13, OP_RETURN},
        psbt::{Input, Output},
        script::{self, Instruction},
        transaction::Version,
        Amount, OutPoint, Psbt, ScriptBuf, Sequence, Transaction, TxIn, TxOut, Txid, Witness,
    },
    orchestrator_interfaces::InvokeArgs,
    CoinBalance, CoinId, InputCoin, Intention, IntentionSet,
};
use serde::{Deserialize, Serialize};

#[tokio::test]
async fn test_build_psbt() {
    //
    let pool_address = "tb1p7vyzpmqv3k52uvv3pevzdtalggr8z9kezmxspzwwzxykqh6lt63q0qp6pf".to_string();
    let pool_tweaked_key =
        "f30820ec0c8da8ae31910e5826afbf42067116d916cd0089ce1189605f5f5ea2".to_string();
    let pool_script_buf =
        ScriptBuf::from_hex(format!("5120{}", pool_tweaked_key).as_str()).unwrap();
    let pool_balance = 11_000_u64;
    let user_address = "tb1q2yjrwc8fgdkdndl5jzhq0j96hd0vv7mrf9t359";
    let user_script_buf =
        ScriptBuf::from_hex("001451243760e9436cd9b7f490ae07c8babb5ec67b63").unwrap();
    let user_balance = 50000_u64;

    let pool_utxo_txid = "0ea821b98422cd76425d81f1dd37f6c4f0644b9802ada64205568166067d2726";
    let pool_utxo_vout = 0;

    let user_utxo_txid = "f7bdc3919537227a1bd2f5122b9faa40012d87f29754d8d1108349f6ab418a60";
    let user_utxo_vout = 1;

    //
    let mut psbt = Psbt {
        unsigned_tx: Transaction {
            version: Version(2),
            lock_time: LockTime::ZERO,
            input: vec![],
            output: vec![],
        },
        version: 0,
        xpub: BTreeMap::new(),
        proprietary: BTreeMap::new(),
        unknown: BTreeMap::new(),
        inputs: vec![],
        outputs: vec![],
    };

    let register_fee = 1000;

    // pool btc utxo add input
    add_input(
        &mut psbt,
        &pool_utxo_txid,
        pool_utxo_vout,
        pool_balance,
        pool_script_buf.clone(),
    );

    // user utxo add input
    add_input(
        &mut psbt,
        &user_utxo_txid,
        user_utxo_vout,
        user_balance,
        user_script_buf.clone(),
    );

    // pool output
    add_output(
        &mut psbt,
        pool_balance + register_fee,
        pool_script_buf.clone(),
    );

    add_output(
        &mut psbt,
        0, // tmp set 0, after calculate fee set change balance
        user_script_buf.clone(),
    );

    // user change output

    let estimated_fee = call_estimate_min_tx_fee_on_testnet(&EstimateMinTxFeeArgs {
        input_types: vec![TxOutputType::P2WPKH, TxOutputType::P2WPKH],
        output_types: vec![TxOutputType::P2TR, TxOutputType::P2WPKH],
        pool_address: pool_address.clone(),
    })
    .await;
    dbg!(&estimated_fee);
    let estimated_fee_unwrap = 221;

    let user_change = user_balance - register_fee - estimated_fee_unwrap;
    dbg!(&user_change);
    psbt.unsigned_tx.output[1].value = Amount::from_sat(user_change);
    let psbt_hex = hex::encode(psbt.serialize());
    dbg!(&psbt_hex);
    let txid = psbt.unsigned_tx.compute_txid().to_string();
    dbg!(&txid);
    dbg!(&psbt);

    // Sign the inputs
    // for i in 0..1 {
    //     let witness = sign_input(&psbt, i, &user_address);
    //     psbt.inputs[i].final_script_witness = Some(witness);
    // }
    // Construct the intention set
    // let txid = psbt.unsigned_tx.compute_txid().to_string();
    // let intention_set = IntentionSet {
    //     initiator_address: user_address.to_string(),
    //     intentions: vec![Intention {
    //         exchange_id: "ree_cookie".to_string(),
    //         action: "register".to_string(),
    //         action_params: String::new(),
    //         pool_address: pool_address.clone(),
    //         nonce: 0,
    //         pool_utxo_spend: vec![
    //             format!("{}:{}", pool_utxo_txid, pool_utxo_vout),
    //         ],
    //         pool_utxo_receive: vec![format!("{}:0", txid)],
    //         input_coins: vec![InputCoin {
    //             from: user_address.to_string(),
    //             coin: CoinBalance {
    //                 id: CoinId::from_str("0:0").unwrap(),
    //                 value: user_balance as u128,
    //             },
    //         }],
    //         output_coins: vec![],
    //     }],
    // };
    // Construct the InvokeArgs

    // let invoke_args = InvokeArgs {
    //     psbt_hex,
    //     intention_set,
    // };
    // println!(
    //     "InvokeArgs: {}\n",
    //     serde_json::to_string(&invoke_args).unwrap()
    // );

    // let result = call_invoke_on_testnet(&invoke_args).await;
    // println!("Invoke result: {:?}\n", result);
}

#[tokio::test]
async fn test_call_invoke_1() {
    //
    let pool_address = "tb1pfr420a6qr8t00xwjyfz7x4lg2ppdqnnm3n7gk8x4q4qra93wx88qpam69j".to_string();
    let pool_tweaked_key =
        "48eaa7f74019d6f799d22245e357e85042d04e7b8cfc8b1cd505403e962e31ce".to_string();
    //

    let mut psbt = Psbt {
        unsigned_tx: Transaction {
            version: Version(2),
            lock_time: LockTime::ZERO,
            input: vec![],
            output: vec![],
        },
        version: 0,
        xpub: BTreeMap::new(),
        proprietary: BTreeMap::new(),
        unknown: BTreeMap::new(),
        inputs: vec![],
        outputs: vec![],
    };
}
