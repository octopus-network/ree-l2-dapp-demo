use std::str::FromStr;

pub use crate::log::*;
use crate::{
    exchange::{self, exchange::CookiePools, CookiePoolState},
    external::{
        etch_canister::{etching, get_etching_request, EtchingArgs, EtchingStatus},
        internal_identity::get_principal,
        rune_indexer::get_etching,
    },
    game::game::{CreateGameArgs, Game, GameAndPool, RuneInfo},
    log,
    memory::{mutate_state, read_state, set_state, ADDRESS_PRINCIPLE_MAP, GAME_POOLS},
    state::ExchangeState,
    utils::{request_address, AddLiquidityInfo},
    AddressStr, ExchangeError, GameId, DUST_BTC_VALUE,
};
use candid::types::principal;
use ic_cdk::{init, post_upgrade, query, update};
use itertools::Itertools;
use ree_exchange_sdk::{
    types::{CoinBalance, CoinBalances, CoinId, Txid, Utxo},
    Metadata, PoolStorageAccess,
};

#[init]
fn init() {
    set_state(ExchangeState::init());
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

// #[update]
// pub async fn create_pool() {
//     exchange::exchange::new_pool_by_utxo(
//         pool_name,
//         key_path,
//         pubkey,
//         address,
//         utxo
//     );
// }

#[query]
fn get_exchange_state() -> ExchangeState {
    read_state(|s| s.clone())
}

#[query]
fn get_games_info() -> Vec<GameAndPool> {
    let games = read_state(|es| es.games.values().cloned().collect_vec());

    let mut game_and_pool_list = vec![];
    for game in games {
        let pool_address_opt = GAME_POOLS.with_borrow(|m| m.get(&game.game_id));

        let pool = pool_address_opt
            .map(|pool_address| {
                exchange::exchange::CookiePools::get(&pool_address)
                    .map(|p| (p.metadata().clone(), p.last_state().unwrap().clone()))
            })
            .unwrap_or(None);

        // let pool = exchange::exchange::CookiePools::get(&game.game_id)
        //     .map(|p| (p.metadata().clone(), p.last_state().unwrap().clone()));

        game_and_pool_list.push(GameAndPool {
            game,
            pool_metadata: pool.clone().map(|p| p.0),
            pool_state: pool.map(|p| p.1),
        });
    }

    game_and_pool_list
}

#[query]
fn get_game_info(game_id: GameId) -> Option<GameAndPool> {
    let game = read_state(|s| s.games.get(&game_id).cloned());
    if game.is_none() {
        return None;
    }
    let pool_address_opt = GAME_POOLS.with_borrow(|m| m.get(&game_id));
    let pool = pool_address_opt
        .map(|pool_address| {
            exchange::exchange::CookiePools::get(&pool_address)
                .map(|p| (p.metadata().clone(), p.last_state().unwrap().clone()))
        })
        .unwrap_or(None);

    game.map(|game| GameAndPool {
        game,
        pool_metadata: pool.clone().map(|p| p.0),
        pool_state: pool.map(|p| p.1),
    })
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
pub async fn test() {
    let pool_name = "test_pool".to_string();
    let key_path = "test_key_path".to_string();
    let (pubkey, _tweaked_pubkey, pool_address) = request_address(key_path.clone())
        .await
        .expect("Failed to request address");

    let mut coin_balances = CoinBalances::new();
    coin_balances.add_coin(&CoinBalance {
        id: CoinId::btc(),
        value: DUST_BTC_VALUE as u128,
    });

    exchange::exchange::new_pool_by_utxo(
        pool_name,
        key_path,
        pubkey,
        pool_address.to_string(),
        Utxo {
            txid: Txid::from_str(
                "4d3f5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
            )
            .unwrap(),
            vout: 1,
            coins: coin_balances,
            sats: DUST_BTC_VALUE,
        },
    );
    GAME_POOLS.with_borrow_mut(|m| {
        m.insert("111".to_string(), pool_address.to_string());
    });
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

    GAME_POOLS.with_borrow_mut(|m| {
        m.insert(game_id.clone(), pool_address.to_string());
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

#[query(hidden = true)]
fn http_request(req: ic_http_types::HttpRequest) -> ic_http_types::HttpResponse {
    if ic_cdk::api::data_certificate().is_none() {
        ic_cdk::trap("update call rejected");
    }
    if req.path() == "/logs" {
        log::do_reply(req)
    } else {
        ic_http_types::HttpResponseBuilder::not_found().build()
    }
}

#[post_upgrade]
fn post_upgrade() {
    mutate_state(|es| {
        es.games.get_mut(&"0".to_string()).map(|game| {
            game.etch_rune_commit_tx =
                "343658c5f1937d38f9db2fe65d43a3cd7a96054b31387b148d511be3e6a9292b".to_string();
            game.rune_info = Some(RuneInfo {
                rune_id: CoinId::btc(),
                rune_name: "TEST•COOKIE•VWG".to_string(),
            });
        })
    });

    log!(
        INFO,
        "Finish Upgrade current version: {}",
        env!("CARGO_PKG_VERSION")
    );
}
