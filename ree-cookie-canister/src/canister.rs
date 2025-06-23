use std::str::FromStr;

pub use crate::log::*;
use crate::{
    external::{
        bitcoin_customs::{etching_v3, EtchingArgs},
        internal_identity::get_principal,
        management::request_schnorr_key,
    },
    game::game::GameAndGamer,
    log,
    memory::{
        mutate_state, read_state, set_state, ADDRESS_PRINCIPLE_MAP, BLOCKS, GAMER, TX_RECORDS,
    },
    state::{ExchangeState, PoolState},
    utils::{
        calculate_premine_rune_amount, tweak_pubkey_with_empty, AddLiquidityInfo, ExecuteTxGuard, RegisterInfo
    },
    ExchangeError, Seconds, MIN_BTC_VALUE,
};
use candid::Principal;
use ic_cdk::{api::management_canister::bitcoin::Satoshi, init, post_upgrade, query, update};
use ree_types::{
    bitcoin::{Address, Network, Psbt},
    exchange_interfaces::{
        ExecuteTxArgs, ExecuteTxResponse, GetMinimalTxValueArgs, GetMinimalTxValueResponse,
        GetPoolInfoArgs, GetPoolInfoResponse, GetPoolListResponse, NewBlockArgs, NewBlockResponse,
        PoolBasic, PoolInfo, RollbackTxArgs, RollbackTxResponse,
    },
    psbt::ree_pool_sign,
    CoinBalance, Intention, Pubkey, Utxo,
};

#[init]
fn init(
    key_path: String,
    rune_name: String,
    gamer_register_fee: Satoshi,
    claim_cooling_down: Seconds,
    cookie_amount_per_claim: u128,
    orchestrator: Principal,
    ii_canister: Principal,
    btc_customs_principle: Principal,
    richswap_pool_address: String,
) {
    set_state(ExchangeState::init(
        key_path,
        rune_name,
        gamer_register_fee,
        claim_cooling_down,
        cookie_amount_per_claim,
        orchestrator,
        ii_canister,
        btc_customs_principle,
        richswap_pool_address,
    ));
}

#[update]
pub async fn init_key() -> Result<String, ExchangeError> {
    let (current_address, key_name) = read_state(|s| (s.address.clone(), s.key_path.clone()));
    if let Some(address) = current_address {
        return Ok(address);
    } else {
        let untweaked_pubkey = request_schnorr_key("key_1", key_name.into_bytes()).await?;
        let tweaked_pubkey = tweak_pubkey_with_empty(untweaked_pubkey.clone());
        cfg_if::cfg_if! {
        if #[cfg(feature = "testnet")] {
            let address = Address::p2tr_tweaked(tweaked_pubkey, Network::Testnet4);
        } else {
            let address = Address::p2tr_tweaked(tweaked_pubkey, Network::Bitcoin);
        }
        }
        mutate_state(|es| {
            es.key = Some(untweaked_pubkey.clone());
            es.address = Some(address.to_string());
            es.game_status = es.game_status.finish_init_key();
        });
        Ok(address.to_string())
    }
}

#[update]
pub async fn init_utxo(utxo: Utxo) -> Result<(), ExchangeError> {
    mutate_state(|es| {
        es.rune_id = utxo.maybe_rune.clone().map(|rune| rune.id);
        es.states.push(PoolState {
            id: None,
            nonce: 0,
            utxo,
            user_action: crate::state::UserAction::Init,
        });

        es.game_status = es.game_status.finish_init_utxo();
    });

    Ok(())
}

#[query]
fn get_exchange_state() -> ExchangeState {
    read_state(|s| s.clone())
}

#[query]
fn get_chain_key_btc_address() -> Option<String> {
    read_state(|es| es.address.clone())
}

#[query]
fn get_register_info() -> RegisterInfo {
    let (key, address, register_fee, last_state_res) = read_state(|s| {
        (
            s.key.clone(),
            s.address.clone(),
            s.game.gamer_register_fee,
            s.last_state(),
        )
    });
    let last_state = last_state_res.unwrap();
    let tweaked_key = tweak_pubkey_with_empty(key.clone().unwrap());
    RegisterInfo {
        untweaked_key: key.unwrap(),
        address: address.unwrap(),
        utxo: last_state.utxo.clone(),
        register_fee,
        tweaked_key: Pubkey::from_str(&tweaked_key.to_string()).unwrap(),
        nonce: last_state.nonce,
    }
}

#[update]
pub fn claim() -> Result<u128, ExchangeError> {
    let principal = ic_cdk::caller();

    let address = crate::memory::ADDRESS_PRINCIPLE_MAP.with_borrow(|m| {
        m.get(&principal)
            .ok_or(ExchangeError::GamerNotFound(principal.to_text().clone()))
    })?;

    mutate_state(|s| s.game.claim(address))
}

// need permission check
#[update]
async fn end_game() {
    mutate_state(|s| {
        s.game.is_end = true;
        s.game_status = s.game_status.end();
    });
}

#[update]
async fn etch_rune() -> std::result::Result<String, String> {
    let (etching_args, address) = read_state(|s| {
        (
            EtchingArgs {
                rune_name: s.rune_name.clone(),
                divisibility: Some(8),
                premine: Some(calculate_premine_rune_amount()),
                logo: None,
                symbol: None,
                terms: None,
                turbo: false,
            },
            s.address.clone().unwrap(),
        )
    });

    let etch_key = etching_v3(etching_args, address)
        .await
        .map_err(|e| format!("etching_v3 failed: {:?}", e))?
        .0?;
    mutate_state(|s| {
        s.etching_key = Some(etch_key.clone());
    });

    Ok(etch_key)
}

#[query]
pub fn query_add_liquidity_info() -> AddLiquidityInfo {
    read_state(|s| AddLiquidityInfo {
        btc_amount_for_add_liquidity: s.game.gamer_register_fee
            * GAMER.with_borrow(|g| g.len() as u64),
        rune_amount_for_add_liquidity: calculate_premine_rune_amount() - s.game.claimed_cookies,
    })
}

/// REE API

#[query]
fn get_minimal_tx_value(_args: GetMinimalTxValueArgs) -> GetMinimalTxValueResponse {
    MIN_BTC_VALUE
}

#[query]
pub fn get_pool_states() -> Vec<PoolState> {
    read_state(|s| s.states.clone())
}

#[query]
pub fn get_pool_info(args: GetPoolInfoArgs) -> GetPoolInfoResponse {
    let pool_address = args.pool_address;

    read_state(|es| match es.last_state() {
        Ok(last_state) => pool_address
            .eq(&es.address.clone().unwrap())
            .then_some(PoolInfo {
                key: es.key.clone().unwrap(),
                key_derivation_path: vec![es.key_path.clone().into_bytes()],
                name: es.rune_name.clone(),
                address: es.address.clone().unwrap(),
                nonce: last_state.nonce,
                coin_reserved: es
                    .rune_id
                    .map(|rune_id| {
                        vec![CoinBalance {
                            id: rune_id,
                            value: last_state.utxo.maybe_rune.unwrap().value,
                        }]
                    })
                    .unwrap_or(vec![]),
                btc_reserved: last_state.btc_balance(),
                utxos: vec![last_state.utxo],
                attributes: "".to_string(),
            }),
        Err(_) => {
            return None;
        }
    })
}

#[query]
pub fn get_game_and_gamer_infos(gamer_id: crate::Address) -> GameAndGamer {
    read_state(|s| GameAndGamer {
        is_end: s.game.is_end,
        gamer_register_fee: s.game.gamer_register_fee,
        claim_cooling_down: s.game.claim_cooling_down,
        cookie_amount_per_claim: s.game.cookie_amount_per_claim,
        claimed_cookies: s.game.claimed_cookies,
        gamer: GAMER.with_borrow(|g| g.get(&gamer_id)),
    })
}

#[query]
pub fn get_pool_list() -> GetPoolListResponse {
    let address = read_state(|s| s.address.clone().unwrap());
    vec![PoolBasic {
        name: "REE_COOKIE".to_string(),
        address,
    }]
}

#[query(hidden = true)]
fn http_request(
    req: ic_canisters_http_types::HttpRequest,
) -> ic_canisters_http_types::HttpResponse {
    if ic_cdk::api::data_certificate().is_none() {
        ic_cdk::trap("update call rejected");
    }
    if req.path() == "/logs" {
        log::do_reply(req)
    } else {
        ic_canisters_http_types::HttpResponseBuilder::not_found().build()
    }
}

#[update(guard = "ensure_orchestrator")]
pub async fn execute_tx(args: ExecuteTxArgs) -> ExecuteTxResponse {
    let ExecuteTxArgs {
        psbt_hex,
        txid,
        intention_set,
        intention_index,
        zero_confirmed_tx_queue_length: _zero_confirmed_tx_queue_length,
    } = args;
    let raw = hex::decode(&psbt_hex).map_err(|_| "invalid psbt".to_string())?;
    let mut psbt = Psbt::deserialize(raw.as_slice()).map_err(|_| "invalid psbt".to_string())?;
    let intention = intention_set.intentions[intention_index as usize].clone();
    let initiator = intention_set.initiator_address.clone();
    let Intention {
        exchange_id: _,
        action,
        action_params: _,
        pool_address,
        nonce,
        pool_utxo_spend,
        pool_utxo_receive,
        input_coins,
        output_coins,
    } = intention;

    let _guard = ExecuteTxGuard::new(pool_address.clone())
    .ok_or(format!("Pool {0} Executing", pool_address).to_string())?;

    read_state(|s| {
        return s
            .address
            .clone()
            .ok_or("Exchange address not init".to_string())
            .and_then(|address| {
                address
                    .eq(&pool_address)
                    .then(|| ())
                    .ok_or("address not match".to_string())
            });
    })?;

    match action.as_str() {
        "register" => {
            let (new_state, consumed) = read_state(|es| {
                es.validate_register(
                    txid.clone(),
                    nonce,
                    pool_utxo_spend,
                    pool_utxo_receive,
                    input_coins,
                    output_coins,
                    initiator.clone(),
                )
            })
            .map_err(|e| e.to_string())?;
            let key_name = read_state(|s| s.key_path.clone());
            ree_pool_sign(
                &mut psbt,
                vec![&consumed],
                "key_1",
                vec![key_name.into_bytes()],
            )
            .await
            .map_err(|e| e.to_string())?;

            let principal_byte_buf = get_principal(initiator.clone())
                .await
                .map_err(|e| format!("get_principal failed: {:?}, initiator: {:?}", e, initiator))?
                .0?;

            let principal_of_initiator = Principal::from_slice(&principal_byte_buf);

            mutate_state(|s| {
                s.game.register_new_gamer(initiator.clone());
                s.commit(new_state);
            });

            ADDRESS_PRINCIPLE_MAP.with_borrow_mut(|m| {
                m.insert(principal_of_initiator, initiator.clone());
            });
        }
        "add_liquidity" => {
            let (new_state, btc_utxo) = read_state(|es| {
                es.validate_add_liquidity(
                    txid.clone(),
                    nonce,
                    pool_utxo_spend,
                    pool_utxo_receive,
                    input_coins,
                    output_coins,
                    initiator.clone(),
                )
            })
            .map_err(|e| e.to_string())?;
            let key_name = read_state(|s| s.key_path.clone());
            log!(INFO, "psbt: {:?}", serde_json::to_string_pretty(&psbt));
            ree_pool_sign(
                &mut psbt,
                vec![&btc_utxo],
                "key_1",
                vec![key_name.into_bytes()],
            )
            .await
            .map_err(|e| e.to_string())?;
            log!(INFO, "psbt: {:?}", serde_json::to_string_pretty(&psbt));

            mutate_state(|s| {
                s.game.add_liquidity();
                s.game_status = s.game_status.finish_add_liquidity();
                s.commit(new_state);
            });
        }
        "withdraw" => {
            let (new_state, consumed) = read_state(|es| {
                es.validate_withdraw(
                    txid.clone(),
                    nonce,
                    pool_utxo_spend,
                    pool_utxo_receive,
                    input_coins,
                    output_coins,
                    initiator.clone(),
                )
            })
            .map_err(|e| e.to_string())?;
            let key_name = read_state(|s| s.key_path.clone());
            ree_pool_sign(
                &mut psbt,
                vec![&consumed],
                "key_1",
                vec![key_name.into_bytes()],
            )
            .await
            .map_err(|e| e.to_string())?;

            mutate_state(|s| {
                s.commit(new_state);
                s.game.withdraw(initiator.clone())
            })
            .map_err(|e| e.to_string())?;
        }
        _ => {
            return Err("invalid method".to_string());
        }
    }

    // Record the transaction as unconfirmed and track which pools it affects
    TX_RECORDS.with_borrow_mut(|m| {
        ic_cdk::println!("new unconfirmed txid: {} in pool: {} ", txid, pool_address);
        let mut record = m.get(&(txid.clone(), false)).unwrap_or_default();
        if !record.pools.contains(&pool_address) {
            record.pools.push(pool_address.clone());
        }
        m.insert((txid.clone(), false), record);
    });

    Ok(psbt.serialize_hex())
}

/// REE API
#[update(guard = "ensure_orchestrator")]
pub fn new_block(args: NewBlockArgs) -> NewBlockResponse {
    match crate::reorg::detect_reorg(Network::Testnet4, args.clone()) {
        Ok(_) => {}
        Err(crate::reorg::ReorgError::DuplicateBlock { height, hash }) => {
            ic_cdk::println!(
                "Duplicate block detected at height {} with hash {}",
                height,
                hash
            );
        }
        Err(crate::reorg::ReorgError::Unrecoverable) => {
            return Err("Unrecoverable reorg detected".to_string());
        }
        Err(crate::reorg::ReorgError::BlockNotFoundInState { height }) => {
            return Err(format!("Block not found in state at height {}", height));
        }
        Err(crate::reorg::ReorgError::Recoverable { height, depth }) => {
            crate::reorg::handle_reorg(height, depth);
        }
    }

    let NewBlockArgs {
        block_height,
        block_hash: _,
        block_timestamp: _,
        confirmed_txids,
    } = args.clone();

    // Store the new block information
    BLOCKS.with_borrow_mut(|m| {
        m.insert(block_height, args);
        ic_cdk::println!("new block {} inserted into blocks", block_height,);
    });

    // Mark transactions as confirmed
    for txid in confirmed_txids {
        TX_RECORDS.with_borrow_mut(|m| {
            if let Some(record) = m.get(&(txid.clone(), false)) {
                m.insert((txid.clone(), true), record.clone());
                ic_cdk::println!("confirm txid: {} with pools: {:?}", txid, record.pools);
            }
        });
    }
    // Calculate the height below which blocks are considered fully confirmed (beyond reorg risk)
    let confirmed_height =
        block_height - crate::reorg::get_max_recoverable_reorg_depth(Network::Testnet4) + 1;

    let exchange_pool_address =
        read_state(|s| s.address.clone()).ok_or("pool address not init".to_string())?;
    // Finalize transactions in confirmed blocks
    BLOCKS.with_borrow(|m| {
        m.iter()
            .take_while(|(height, _)| *height <= confirmed_height)
            .for_each(|(height, block_info)| {
                ic_cdk::println!("finalizing txs in block: {}", height);
                block_info.confirmed_txids.into_iter().for_each(|txid| {
                    TX_RECORDS.with_borrow_mut(|m| {
                        if let Some(record) = m.get(&(txid.clone(), true)) {
                            record.pools.iter().for_each(|pool| {
                                if pool.eq(&exchange_pool_address) {
                                    mutate_state(|s| {
                                        s.finalize(txid.clone()).map_err(|e| e.to_string())
                                    })
                                    .unwrap();
                                }
                            });
                        }
                    })
                })
            })
    });

    // Clean up old block data that's no longer needed
    BLOCKS.with_borrow_mut(|m| {
        let heights_to_remove: Vec<u32> = m
            .iter()
            .take_while(|(height, _)| *height <= confirmed_height)
            .map(|(height, _)| height)
            .collect();
        for height in heights_to_remove {
            ic_cdk::println!("removing block: {}", height);
            m.remove(&height);
        }
    });

    Ok(())
}

/// REE API
#[update(guard = "ensure_orchestrator")]
pub fn rollback_tx(args: RollbackTxArgs) -> RollbackTxResponse {
    // read_state(|s|
    //     s.key.clone().ok_or("key not init".to_string())?
    //     .eq(&args.pool_key)
    //     .then(|| ())
    //     .ok_or("key not match".to_string())
    // )?;

    // mutate_state(|es| es.rollback(args.txid)).map_err(|e| e.to_string())

    let cookie_pool =
        read_state(|s| s.address.clone()).ok_or("pool address not init".to_string())?;

    TX_RECORDS.with_borrow(|m| {
        let maybe_unconfirmed_record = m.get(&(args.txid.clone(), false));
        let maybe_confirmed_record = m.get(&(args.txid.clone(), true));
        let record = maybe_confirmed_record.or(maybe_unconfirmed_record).unwrap();
        ic_cdk::println!(
            "rollback txid: {} with pools: {:?}",
            args.txid,
            record.pools
        );

        // Roll back each affected pool to its state before this transaction
        record.pools.iter().for_each(|pool_address| {
            if pool_address.eq(&cookie_pool) {
                // Rollback the state of the pool
                mutate_state(|s| s.rollback(args.txid)).unwrap();
            }
        });
    });

    Ok(())
}

#[update(guard = "is_controller")]
pub fn reset_blocks() {
    BLOCKS.with_borrow_mut(|b| {
        b.clear_new();
    });
}

fn is_controller() -> std::result::Result<(), String> {
    ic_cdk::api::is_controller(&ic_cdk::caller())
        .then(|| ())
        .ok_or("Access denied".to_string())
}

fn ensure_orchestrator() -> std::result::Result<(), String> {
    read_state(|s| {
        s.orchestrator
            .eq(&ic_cdk::caller())
            .then(|| ())
            .ok_or("Access denied".to_string())
    })
}

#[post_upgrade]
fn post_upgrade() {
    log!(
        INFO,
        "Finish Upgrade current version: {}",
        env!("CARGO_PKG_VERSION")
    );
}

// Enable Candid export
ic_cdk::export_candid!();
