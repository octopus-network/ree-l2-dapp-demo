use std::{collections::HashMap, str::FromStr};

pub use crate::log::*;
use crate::{
    exchange::{self, exchange::mutate_pool}, external::{
        etch_canister::{etching, get_etching_request, EtchingArgs, EtchingStatus},
        internal_identity::get_principal,
        rune_indexer::get_etching,
    }, game::game::{CreateGameArgs, Game, RuneInfo}, log, memory::{mutate_state, read_state, set_state, ADDRESS_PRINCIPLE_MAP, BLOCKS, TX_RECORDS}, pool::Pool, state::ExchangeState, utils::{request_address, AddLiquidityInfo}, AddressStr, ExchangeError, GameId, DUST_BTC_VALUE
};
use candid::Principal;
use ic_cdk::{init, post_upgrade, query, update};
use ree_exchange_sdk::{types::{bitcoin::Psbt, exchange_interfaces::{ExecuteTxArgs, ExecuteTxResponse}, CoinBalance, CoinBalances, CoinId, Intention, Txid, Utxo}, PoolStorageAccess};

#[init]
fn init(orchestrator: Principal) {
    set_state(ExchangeState::init(orchestrator));
}

#[update]
pub async fn create_game(create_game_args: CreateGameArgs) -> Result<GameId, String> {
    let principle = get_principal(create_game_args.create_address.to_string()).await?;
    assert_eq!(ic_cdk::caller().to_text(), principle.to_text());

    assert!(
        create_game_args.rune_premine_amount > create_game_args.claim_amount_per_click,
        "Total cookie amount must be greater than cookie amount per claim"
    );
    assert!(
        create_game_args.rune_premine_amount % 10 == 0,
        "Total cookie amount must be divisible by 10"
    );
    assert!(
        (create_game_args.rune_premine_amount * 4 / 5) % create_game_args.claim_amount_per_click
            == 0,
        "Total cookie amount must be divisible by cookie amount per claim"
    );

    let game_id = mutate_state(|s| {
        let game_id = s.games.len().to_string();
        let game = Game::new(create_game_args, ic_cdk::caller(), game_id.clone());
        s.games.insert(game_id.clone(), game);
        game_id
    });

    Ok(game_id)
}

#[update]
pub async fn get_game_pool_address(game_id: GameId) -> AddressStr {
    let pool_opt = exchange::exchange::CookiePools::get(&game_id);
    let game = read_state(|es| es.games.get(&game_id).expect("Game Not Found").clone());

    if let Some(pool) = pool_opt {
        return pool.metadata().address.to_string();
    } else {
        let key_path = game.key_path();
        let (_pubkey, _tweaked_pubkey, address) = request_address(key_path)
            .await
            .expect("Failed to request address");
        return address.to_string();
    }
}

#[query]
fn get_exchange_state() -> ExchangeState {
    read_state(|s| s.clone())
}

#[query]
fn get_games_info() -> Vec<Game> {
    read_state(|es| es.games.values().cloned().collect())
}

#[query]
fn get_game_info(game_id: GameId) -> Option<Game> {
    read_state(|s| s.games.get(&game_id).cloned())
}

#[update]
pub fn claim(game_id: GameId) -> Result<u128, ExchangeError> {
    let principal = ic_cdk::caller();

    let address = crate::memory::ADDRESS_PRINCIPLE_MAP.with_borrow(|m| {
        m.get(&principal)
            .ok_or(ExchangeError::GamerNotFound(principal.to_text().clone()))
    })?;

    mutate_state(|s| {
        s.games
            .get_mut(&game_id)
            .ok_or(ExchangeError::GameNotFound(game_id.clone()))?
            .claim(address)
    })
}

#[update]
async fn etch_rune(game_id: GameId, rune_name: String) -> std::result::Result<String, String> {
    let game = read_state(|s| {
        s.games
            .get(&game_id)
            .cloned()
            .ok_or_else(|| format!("Game with ID {} not found", game_id))
    })?;

    assert_eq!(
        game.creator.to_text(),
        ic_cdk::caller().to_text(),
        "Only game creator can etch rune for game"
    );

    let key_path = game.key_path();
    let (_pubkey, _tweaked_pubkey, pool_address) = request_address(key_path)
        .await
        .expect("Failed to request address");

    let premine_amount = game.premine_rune_amount();
    let args = EtchingArgs {
        rune_name: rune_name.clone(),
        divisibility: Some(2),
        premine: Some(premine_amount),
        logo: None,
        symbol: None,
        terms: None,
        premine_receiver: pool_address.to_string(),
        turbo: false,
    };

    let commit_tx = etching(args)
        .await
        .map_err(|e| format!("Failed to etch rune: {}", e))?;
    mutate_state(|es| {
        let game = es.games.get_mut(&game_id).expect("Game not found");
        game.rune_info = Some(RuneInfo {
            rune_id: CoinId::btc(), // Placeholder, should be set to the actual rune ID after etching
            rune_name,
            // rune_premine_amount: premine_amount,
        });
        game.etch_rune_commit_tx = commit_tx.clone();
    });

    Ok(commit_tx)
}

#[update]
pub async fn finalize_etch(game_id: GameId) -> Result<String, String> {
    // query reveal tx id from etching canister
    let game = read_state(|s| {
        s.games
            .get(&game_id)
            .cloned()
            .ok_or_else(|| format!("Game with ID {} not found", game_id))
    })?;
    let commit_tx = game.etch_rune_commit_tx.clone();

    let info = get_etching_request(commit_tx)
        .await
        .ok_or("Failed to get etching request".to_string())?;

    ic_cdk::println!("Etching request info: {:?}", info);

    assert_eq!(
        info.status,
        EtchingStatus::Final,
        "Etching not finalized yet"
    );

    let reveal_tx_id = info.reveal_txid;

    let result = get_etching(reveal_tx_id.clone())
        .await
        .ok_or("Failed to get etching result".to_string())?;

    ic_cdk::println!("Etching result: {:?}", result,);

    assert!(result.confirmations >= 1, "Etching not confirmed yet");

    let key_path = game.key_path();
    let (pubkey, _tweaked_pubkey, pool_address) = request_address(key_path.clone())
        .await
        .expect("Failed to request address");

    let mut coin_balances = CoinBalances::new();
    coin_balances.add_coin(&CoinBalance {
        id: CoinId::btc(),
        value: DUST_BTC_VALUE as u128,
    });
    coin_balances.add_coin(&CoinBalance {
        id: CoinId::from_str(result.rune_id.as_str())
            .expect("Failed to parse rune ID from etching result"),
        value: info.etching_args.premine.expect("Premine amount not found") as u128,
    });

    exchange::exchange::new_pool_by_utxo(
        key_path.clone(),
        key_path,
        pubkey,
        pool_address.to_string(),
        Utxo {
            txid: Txid::from_str(&reveal_tx_id).expect("Failed to parse reveal tx id"),
            vout: 1,
            coins: coin_balances,
            sats: DUST_BTC_VALUE,
        },
    );

    mutate_state(|es| {
        let game = es.games.get_mut(&game_id).expect("Game not found");
        let mut old_rune_info = game.rune_info.clone().expect("Rune info not found");
        old_rune_info.rune_id = CoinId::from_str(result.rune_id.as_str())
            .expect("Failed to parse rune ID from etching result");
        game.rune_info = Some(old_rune_info);

        game.game_status = game.game_status.finish_etching();
    });

    Ok(reveal_tx_id)
}

#[query]
pub fn query_add_liquidity_info(game_id: GameId) -> AddLiquidityInfo {
    read_state(|s| {
        let game = s.games.get(&game_id).expect("Game not found");

        AddLiquidityInfo {
            btc_amount_for_add_liquidity: game.gamer_register_fee * game.gamers.len() as u64,
            rune_amount_for_add_liquidity: game.calculate_add_liquidity_rune_amount(),
        }
    })
}

/// REE API
// #[query]
// pub fn get_pool_info(args: GetPoolInfoArgs) -> GetPoolInfoResponse {
//     let pool_address = args.pool_address;

//     read_state(|es| {
//         let mut aim_pool = None;
//         for (_id, game) in &es.games {
//             if let Some(pool) = &game.pool {
//                 if pool.address.eq(&pool_address) {
//                     aim_pool = Some(pool.clone());
//                     break;
//                 }
//             }
//         }

//         if let Some(pool) = aim_pool {
//             return pool.last_state().map(|last_state| PoolInfo {
//                 key: pool.pubkey.clone(),
//                 key_derivation_path: vec![pool.key_derivation_path.clone().into_bytes()],
//                 name: pool.name.clone(),
//                 address: pool.address.clone(),
//                 nonce: last_state.nonce,
//                 coin_reserved: last_state.utxo.coins.iter().map(|cb| cb.clone()).collect(),
//                 btc_reserved: last_state.btc_balance(),
//                 utxos: vec![last_state.utxo],
//                 attributes: pool.attributes.to_string(),
//             });
//         } else {
//             return None;
//         }
//     })
// }

// #[query]
// pub fn get_pool_list() -> GetPoolListResponse {
//     read_state(|es| {
//         let mut pool_list = vec![];
//         for (_, game) in &es.games {
//             if let Some(pool) = &game.pool {
//                 pool_list.push(PoolBasic {
//                     name: pool.name.clone(),
//                     address: pool.address.clone(),
//                 });
//             }
//         }

//         return pool_list;
//     })
// }

#[query(hidden = true)]
fn http_request(
    req: ic_http_types::HttpRequest,
) -> ic_http_types::HttpResponse {
    if ic_cdk::api::data_certificate().is_none() {
        ic_cdk::trap("update call rejected");
    }
    if req.path() == "/logs" {
        log::do_reply(req)
    } else {
        ic_http_types::HttpResponseBuilder::not_found().build()
    }
}

// #[update(guard = "ensure_orchestrator")]
// async fn execute_tx(args: ExecuteTxArgs) -> ExecuteTxResponse {
//     let r = internal_execute_tx(args).await;

//     if r.is_err() {
//         log!(ERROR, "execute_tx error: {:?}", r);
//     } else {
//         log!(INFO, "execute_tx success, txid: {:?}", r.clone().unwrap());
//     }

//     r
// }

// pub(crate) async fn internal_execute_tx(args: ExecuteTxArgs) -> ExecuteTxResponse {
//     let ExecuteTxArgs {
//         psbt_hex,
//         txid,
//         intention_set,
//         intention_index,
//         zero_confirmed_tx_queue_length: _zero_confirmed_tx_queue_length,
//     } = args;
//     let raw = hex::decode(&psbt_hex).map_err(|_| "invalid psbt".to_string())?;
//     let mut psbt = Psbt::deserialize(raw.as_slice()).map_err(|_| "invalid psbt".to_string())?;
//     let intention = intention_set.intentions[intention_index as usize].clone();
//     let initiator = intention_set.initiator_address.clone();
//     let Intention {
//         exchange_id: _,
//         action,
//         action_params,
//         pool_address,
//         nonce,
//         pool_utxo_spent,
//         pool_utxo_received,
//         input_coins,
//         output_coins,
//     } = intention;
//     let action_params_json_value =
//         serde_json::from_str::<serde_json::Value>(action_params.as_str())
//             .map_err(|_| "invalid action params".to_string())?;

//     let game = read_state(|es| {
//         let game_id = action_params_json_value
//             .get("game_id")
//             .map(|v| v.to_string())
//             .ok_or("invalid game id".to_string())?;

//         es.games
//             .get(&game_id)
//             .cloned()
//             .ok_or("Game not found".to_string())
//     })?;

//     match action.as_str() {
//         "register" => {
//             let (new_state, (key_derivation_path, utxo)) = game
//                 .validate_register(
//                     pool_address.clone(),
//                     txid,
//                     nonce,
//                     pool_utxo_spent,
//                     pool_utxo_received,
//                     input_coins,
//                     output_coins,
//                     initiator.clone(),
//                 )
//                 .map_err(|e| e.to_string())?;
//             ree_pool_sign(
//                 &mut psbt,
//                 vec![&utxo],
//                 "key_1",
//                 key_derivation_path,
//             )
//             .await
//             .map_err(|e| e.to_string())?;

//             let principal_of_initiator = get_principal(initiator.clone()).await?;

//             mutate_state(|es| {
//                 let game_id = game.game_id;
//                 let game = es.games.get_mut(&game_id).ok_or("Game not found").unwrap();
//                 game.register_new_gamer(initiator.clone())
//                     .expect("Failed to register gamer");
//                 // game.pool.as_mut().unwrap().commit(new_state);
//             });
//             mutate_pool(&pool_address, |pool| {
//                 pool.push(new_state);
//                 // let mut pool = CookiePools::get(pool_address)
//                 //     .ok_or_else(|| format!("Pool with address {} not found", pool_address))?;
//                 // pool.metadata_mut().pubkey = principal_of_initiator;
//                 Ok(())
//             });

//             ADDRESS_PRINCIPLE_MAP.with_borrow_mut(|m| {
//                 m.insert(principal_of_initiator, initiator.clone());
//             });
//         }
//         "add_liquidity" => {
//             // let rich_swap_address = read_state(|s| s.richswap_pool_address.clone());
//             let (new_state, (key_derivation_path, utxo)) = game
//                 .validate_add_liquidity(
//                     pool_address.clone(),
//                     txid,
//                     nonce,
//                     pool_utxo_spent,
//                     pool_utxo_received,
//                     input_coins,
//                     output_coins,
//                 )
//                 .map_err(|e| e.to_string())?;

//             log!(INFO, "psbt: {:?}", serde_json::to_string_pretty(&psbt));

//             ree_pool_sign(
//                 &mut psbt,
//                 vec![&utxo],
//                 "key_1",
//                 key_derivation_path,
//             )
//             .await
//             .map_err(|e| e.to_string())?;
//             log!(INFO, "psbt: {:?}", serde_json::to_string_pretty(&psbt));

//             mutate_state(|es| {
//                 // let game_id = serde_json::from_str::<GameId>(action_params.as_str())
//                 //     .map_err(|_| "invalid game id".to_string())
//                 //     .unwrap();
//                 let game_id = game.game_id;
//                 let game = es.games.get_mut(&game_id).ok_or("Game not found").unwrap();
//                 // game.pool.as_mut().unwrap().commit(new_state);
//                 game.game_status = game.game_status.finish_add_liquidity();
//             });
//             mutate_pool(&pool_address, |pool| {
//                 pool.push(new_state);
//                 Ok(())
//             });
//         }
//         "withdraw" => {
//             let (new_state, (key_derivation_path, utxo)) = game
//                 .validate_withdraw(
//                     pool_address.clone(),
//                     txid,
//                     nonce,
//                     pool_utxo_spent,
//                     pool_utxo_received,
//                     input_coins,
//                     output_coins,
//                     initiator.clone(),
//                 )
//                 .map_err(|e| e.to_string())?;

//             ree_pool_sign(
//                 &mut psbt,
//                 vec![&utxo],
//                 "key_1",
//                 key_derivation_path,
//             )
//             .await
//             .map_err(|e| e.to_string())?;
//             log!(INFO, "psbt: {:?}", serde_json::to_string_pretty(&psbt));

//             mutate_state(|es| {
//                 let game_id = game.game_id;
//                 let game = es.games.get_mut(&game_id).ok_or("Game not found").unwrap();
//                 // game.pool.as_mut().unwrap().commit(new_state);
//                 game.withdraw(initiator.clone())
//                     .expect("Failed to withdraw");
//             });
//               mutate_pool(&pool_address, |pool| {
//                 pool.push(new_state);
//                 Ok(())
//             });
//         }
//         _ => {
//             return Err("invalid method".to_string());
//         }
//     }

//     // Record the transaction as unconfirmed and track which pools it affects
//     TX_RECORDS.with_borrow_mut(|m| {
//         ic_cdk::println!("new unconfirmed txid: {} in pool: {} ", txid, pool_address);
//         let mut record = m.get(&(txid.clone(), false)).unwrap_or_default();
//         if !record.pools.contains(&pool_address) {
//             record.pools.push(pool_address.clone());
//         }
//         m.insert((txid.clone(), false), record);
//     });

//     Ok(psbt.serialize_hex())
// }

/// REE API
// #[update(guard = "ensure_orchestrator")]
// pub fn new_block(args: NewBlockArgs) -> NewBlockResponse {
//     match crate::reorg::detect_reorg(Network::Testnet4, args.clone()) {
//         Ok(_) => {}
//         Err(crate::reorg::ReorgError::DuplicateBlock { height, hash }) => {
//             ic_cdk::println!(
//                 "Duplicate block detected at height {} with hash {}",
//                 height,
//                 hash
//             );
//         }
//         Err(crate::reorg::ReorgError::Unrecoverable) => {
//             return Err("Unrecoverable reorg detected".to_string());
//         }
//         Err(crate::reorg::ReorgError::BlockNotFoundInState { height }) => {
//             return Err(format!("Block not found in state at height {}", height));
//         }
//         Err(crate::reorg::ReorgError::Recoverable { height, depth }) => {
//             crate::reorg::handle_reorg(height, depth);
//         }
//     }

//     let NewBlockArgs {
//         block_height,
//         block_hash: _,
//         block_timestamp: _,
//         confirmed_txids,
//     } = args.clone();

//     // Store the new block information
//     BLOCKS.with_borrow_mut(|m| {
//         m.insert(block_height, args);
//         ic_cdk::println!("new block {} inserted into blocks", block_height,);
//     });

//     // Mark transactions as confirmed
//     for txid in confirmed_txids {
//         TX_RECORDS.with_borrow_mut(|m| {
//             if let Some(record) = m.get(&(txid.clone(), false)) {
//                 m.insert((txid.clone(), true), record.clone());
//                 ic_cdk::println!("confirm txid: {} with pools: {:?}", txid, record.pools);
//             }
//         });
//     }
//     // Calculate the height below which blocks are considered fully confirmed (beyond reorg risk)
//     let confirmed_height =
//         block_height - crate::reorg::get_max_recoverable_reorg_depth(Network::Testnet4) + 1;

//     // let exchange_pool_address =
//     //     read_state(|s| s.address.clone()).ok_or("pool address not init".to_string())?;

//     let all_pool_of_game_map: HashMap<String, usize> = read_state(|es| {
//         es.games
//             .iter()
//             .filter_map(|(game_id, game)| {
//                 game.pool
//                     .clone()
//                     .and_then(|pool| Some((pool.address.clone(), *game_id)))
//             })
//             .collect()
//     });

//     // Finalize transactions in confirmed blocks
//     BLOCKS.with_borrow(|m| {
//         m.iter()
//             .take_while(|(height, _)| *height <= confirmed_height)
//             .for_each(|(height, block_info)| {
//                 ic_cdk::println!("finalizing txs in block: {}", height);
//                 block_info.confirmed_txids.into_iter().for_each(|txid| {
//                     TX_RECORDS.with_borrow_mut(|m| {
//                         if let Some(record) = m.get(&(txid.clone(), true)) {
//                             record.pools.iter().for_each(|pool_addr| {
//                                 if let Some(game_id) = all_pool_of_game_map.get(pool_addr) {
//                                     mutate_state(|es| {
//                                         es.games
//                                             .get_mut(game_id)
//                                             .expect("Game not found")
//                                             .finalize_tx(txid.clone())
//                                             .expect("Failed to finalize tx")
//                                     });
//                                 }
//                             });
//                         }
//                     })
//                 })
//             })
//     });

//     // Clean up old block data that's no longer needed
//     BLOCKS.with_borrow_mut(|m| {
//         let heights_to_remove: Vec<u32> = m
//             .iter()
//             .take_while(|(height, _)| *height <= confirmed_height)
//             .map(|(height, _)| height)
//             .collect();
//         for height in heights_to_remove {
//             ic_cdk::println!("removing block: {}", height);
//             m.remove(&height);
//         }
//     });

//     Ok(())
// }

/// REE API
// #[update(guard = "ensure_orchestrator")]
// pub fn rollback_tx(args: RollbackTxArgs) -> RollbackTxResponse {
//     // read_state(|s|
//     //     s.key.clone().ok_or("key not init".to_string())?
//     //     .eq(&args.pool_key)
//     //     .then(|| ())
//     //     .ok_or("key not match".to_string())
//     // )?;

//     // mutate_state(|es| es.rollback(args.txid)).map_err(|e| e.to_string())

//     // let cookie_pool =
//     //     read_state(|s| s.address.clone()).ok_or("pool address not init".to_string())?;

//     let all_pool_of_game_map: HashMap<String, usize> = read_state(|es| {
//         es.games
//             .iter()
//             .filter_map(|(game_id, game)| {
//                 game.pool
//                     .clone()
//                     .and_then(|pool| Some((pool.address.clone(), *game_id)))
//             })
//             .collect()
//     });

//     TX_RECORDS.with_borrow(|m| {
//         let maybe_unconfirmed_record = m.get(&(args.txid.clone(), false));
//         let maybe_confirmed_record = m.get(&(args.txid.clone(), true));
//         let record = maybe_confirmed_record.or(maybe_unconfirmed_record).unwrap();
//         ic_cdk::println!(
//             "rollback txid: {} with pools: {:?}",
//             args.txid,
//             record.pools
//         );

//         // Roll back each affected pool to its state before this transaction
//         record.pools.iter().for_each(|pool_address| {
//             if let Some(game_id) = all_pool_of_game_map.get(pool_address) {
//                 mutate_state(|es| {
//                     es.games
//                         .get_mut(&game_id)
//                         .expect("Game not found")
//                         .rollback_tx(args.txid.clone())
//                         .expect("Failed to rollback tx");
//                 });
//             }

//             // if pool_address.eq(&cookie_pool) {
//             //     // Rollback the state of the pool
//             //     mutate_state(|s| s.rollback(args.txid)).unwrap();
//             // }
//         });
//     });

//     Ok(())
// }

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
