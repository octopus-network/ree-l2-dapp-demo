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
async fn test_register() {
    //
    // tb1pv94p65fgcya7yd0rh8rxd7uumfxtyjxx8dsdtwgwxc24k5trmklsuz647t
    // tb1p7vyzpmqv3k52uvv3pevzdtalggr8z9kezmxspzwwzxykqh6lt63q0qp6pf
    let pool_address = "tb1pv94p65fgcya7yd0rh8rxd7uumfxtyjxx8dsdtwgwxc24k5trmklsuz647t".to_string();
    let pool_tweaked_key =
        "f30820ec0c8da8ae31910e5826afbf42067116d916cd0089ce1189605f5f5ea2".to_string();
    let pool_script_buf =
        ScriptBuf::from_hex(format!("5120{}", pool_tweaked_key).as_str()).unwrap();
    let pool_balance = 546_u64;
    let pool_utxo_txid = "476cdee3e0875e629a50b26c27222081c2ca2357bb54c4d0bb9825b549035fbe";
    let pool_utxo_vout = 1;

    let user_address = "tb1q2yjrwc8fgdkdndl5jzhq0j96hd0vv7mrf9t359";
    let user_script_buf =
        ScriptBuf::from_hex("001451243760e9436cd9b7f490ae07c8babb5ec67b63").unwrap();
    let user_balance = 48790_u64;
    let user_utxo_txid = "4808e4041c970c79200e0592e3cc40bb4bd3908930bba4f3b8364eaa1db43fe0";
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

    let register_fee = 20000;

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

    let user_change = user_balance - register_fee - estimated_fee.clone().unwrap();
    psbt.unsigned_tx.output[1].value = Amount::from_sat(user_change);

    // Sign the inputs
    for i in 0..1 {
        let witness = sign_input(&psbt, i, &user_address);
        psbt.inputs[i].final_script_witness = Some(witness);
    }
    // Construct the intention set
    let txid = psbt.unsigned_tx.compute_txid().to_string();
    let intention_set = IntentionSet {
        initiator_address: user_address.to_string(),
        tx_fee_in_sats: estimated_fee.unwrap(),
        intentions: vec![Intention {
            exchange_id: "ree_cookie".to_string(),
            action: "register".to_string(),
            action_params: String::new(),
            pool_address: pool_address.clone(),
            nonce: 0,
            pool_utxo_spend: vec![
                "31430cddbdae89b78e8d7873de3dc2d65840c6ab498ccb8a4268b5b75de5a6bc:0".to_string(),
            ],
            pool_utxo_receive: vec![format!("{}:0", txid)],
            input_coins: vec![InputCoin {
                from: user_address.to_string(),
                coin: CoinBalance {
                    id: CoinId::from_str("0:0").unwrap(),
                    value: user_balance as u128,
                },
            }],
            output_coins: vec![],
        }],
    };
    // Construct the InvokeArgs
    let psbt_hex = hex::encode(psbt.serialize());
    let invoke_args = InvokeArgs {
        psbt_hex,
        intention_set,
        initiator_utxo_proof: vec![]
    };
    println!(
        "InvokeArgs: {}\n",
        serde_json::to_string(&invoke_args).unwrap()
    );

    let result = call_invoke_on_testnet(&invoke_args).await;
    println!("Invoke result: {:?}\n", result);
}