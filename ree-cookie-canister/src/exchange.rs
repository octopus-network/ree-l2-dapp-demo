use std::borrow::Cow;

use candid::CandidType;
use ic_stable_structures::{storable::Bound, Storable};
use ree_exchange_sdk::prelude::*;
use ree_exchange_sdk::{
    types::{CoinBalance, Txid, Utxo},
    StateInfo, StateView,
};
use serde::{Deserialize, Serialize};

use crate::{AddressStr, GameId};

#[derive(Deserialize, Serialize, Clone, Debug, CandidType, PartialEq, Eq)]
pub enum UserAction {
    Init,
    AddLiquidity,
    Register(GameId, AddressStr),
    Withdraw(GameId, AddressStr),
}

#[derive(CandidType, Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct CookiePoolState {
    pub txid: Txid,
    pub nonce: u64,
    pub utxo: Utxo,
    pub user_action: UserAction,
}

impl Storable for CookiePoolState {
    const BOUND: Bound = Bound::Unbounded;
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(bincode::serialize(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        bincode::deserialize(bytes.as_ref()).unwrap()
    }

    fn into_bytes(self) -> Vec<u8> {
        let mut bytes = vec![];
        bincode::serialize_into(&mut bytes, &self).unwrap();
        bytes
    }
}

impl StateView for CookiePoolState {
    fn inspect_state(&self) -> StateInfo {
        let mut coin_reserved: Vec<CoinBalance> = vec![]; // Placeholder, as CoinBalance is not defined in the provided context
        self.utxo.coins.iter().for_each(|c| {
            coin_reserved.push(c.clone());
        });

        StateInfo {
            txid: self.txid,
            nonce: self.nonce,
            coin_reserved: coin_reserved,
            btc_reserved: self.utxo.sats,
            utxos: vec![self.utxo.clone()],
            attributes: "{}".to_string(),
        }
    }
}

#[exchange]
pub mod exchange {

    use candid::Principal;
    use ree_exchange_sdk::{
        store::{StableBTreeMap, StableCell},
        types::{bitcoin, Intention, Pubkey},
    };

    use crate::{external::internal_identity::get_principal, state::ExchangeState, utils::RuneCommitList};

    use super::*;

    #[storage(0)]
    pub type State = StableCell<ExchangeState>;

    #[storage(1)]
    pub type AddressPrincipalMap = StableBTreeMap<Principal, AddressStr>;

    #[storage(2)]
    pub type ReceiverRunesMap = StableBTreeMap<AddressStr, RuneCommitList>;

    #[pools]
    pub struct CookiePools;

    impl Pools for CookiePools {
        type State = CookiePoolState;

        const POOL_MEMORY: u8 = 100;

        const BLOCK_MEMORY: u8 = 101;

        const TRANSACTION_MEMORY: u8 = 102;

        fn network() -> Network {
            Network::Testnet4
        }

        // This is optional
        fn finalize_threshold() -> u32 {
            60
        }
    }

    pub fn new_pool_by_utxo(
        pool_name: String,
        key_path: String,
        pubkey: Pubkey,
        address: AddressStr,
        // attributes: String,
        utxo: Utxo,
    ) {
        let mut pool = Pool::new(Metadata {
            key: pubkey,
            key_derivation_path: vec![key_path.clone().into_bytes()],
            name: pool_name.clone(),
            address: address.to_string(),
        });
        pool.states_mut().push(CookiePoolState {
            txid: utxo.txid.clone(),
            nonce: 0,
            utxo: utxo,
            user_action: UserAction::Init,
        });
        CookiePools::insert(pool);
    }

    pub fn mutate_pool(
        pool_address: &AddressStr,
        f: impl FnOnce(&mut Pool<CookiePoolState>) -> std::result::Result<(), String>,
    ) -> std::result::Result<(), String> {
        let mut pool = CookiePools::get(pool_address)
            .ok_or_else(|| format!("Pool with address {} not found", pool_address))?;
        f(&mut pool)?;
        CookiePools::insert(pool);
        Ok(())
    }

    #[hook]
    impl Hook for CookiePools {
        fn on_tx_rollbacked(
            _address: String,
            _txid: Txid,
            _reason: String,
            rollbacked_states: Vec<CookiePoolState>,
        ) {
            for e in rollbacked_states {
                match e.user_action {
                    UserAction::Register(game_id, address) => {
                        // State::with_mut(|es| {
                        //     let game = es.games.get_mut(&game_id).unwrap();
                        //     game.gamers.remove(&address);
                        // });
                        mutate_state(|es| {
                            let game = es.games.get_mut(&game_id).unwrap();
                            game.gamers.remove(&address);
                        });
                    }
                    UserAction::Withdraw(game_id, address) => {
                        mutate_state(|es| {
                            let game = es.games.get_mut(&game_id).unwrap();
                            game.gamers
                                .get_mut(&address)
                                .map(|g| g.is_withdrawn = false);
                        });
                    }
                    _ => {}
                }
            }
        }
    }

    #[action]
    pub async fn register(_psbt: &bitcoin::Psbt, args: ActionArgs) -> ActionResult<CookiePoolState> {
        let Intention {
            exchange_id: _,
            action: _,
            action_params,
            pool_address,
            nonce,
            pool_utxo_spent,
            pool_utxo_received,
            input_coins,
            output_coins,
        } = args.intention;
        let action_params_json_value =
            serde_json::from_str::<serde_json::Value>(action_params.as_str())
                .map_err(|_| "invalid action params".to_string())?;
        let game = read_state(|es| {
            let game_id = action_params_json_value
                .get("game_id")
                .map(|v| v.to_string())
                .ok_or("invalid game id".to_string())?;

            es.games
                .get(&game_id)
                .cloned()
                .ok_or("Game not found".to_string())
        })?;
        let (new_state, (_key_derivation_path, _utxo)) = game
            .validate_register(
                pool_address.clone(),
                args.txid.clone(),
                nonce,
                pool_utxo_spent,
                pool_utxo_received,
                input_coins,
                output_coins,
                args.initiator_address.clone(),
            )
            .map_err(|e| e.to_string())?;

        let initiator = args.initiator_address.clone();
        let principal_of_initiator = get_principal(initiator.clone()).await?;
        mutate_state(|es| {
            let game_id = game.game_id;
            let game = es.games.get_mut(&game_id).ok_or("Game not found").unwrap();
            game.register_new_gamer(initiator.clone())
                .expect("Failed to register gamer");
        });
        AddressPrincipalMap::with_mut(|m| {
            m.insert(principal_of_initiator, initiator.clone());
        });
        Ok(new_state)
    }

    #[action]
    pub async fn add_liquidity(
        _psbt: &bitcoin::Psbt,
        args: ActionArgs,
    ) -> ActionResult<CookiePoolState> {
        let Intention {
            exchange_id: _,
            action: _,
            action_params,
            pool_address,
            nonce,
            pool_utxo_spent,
            pool_utxo_received,
            input_coins,
            output_coins,
        } = args.intention;
        let action_params_json_value =
            serde_json::from_str::<serde_json::Value>(action_params.as_str())
                .map_err(|_| "invalid action params".to_string())?;
        let game = read_state(|es| {
            let game_id = action_params_json_value
                .get("game_id")
                .map(|v| v.to_string())
                .ok_or("invalid game id".to_string())?;

            es.games
                .get(&game_id)
                .cloned()
                .ok_or("Game not found".to_string())
        })?;
        let (new_state, (_key_derivation_path, _utxo)) = game
            .validate_add_liquidity(
                pool_address.clone(),
                args.txid.clone(),
                nonce,
                pool_utxo_spent,
                pool_utxo_received,
                input_coins,
                output_coins,
            )
            .map_err(|e| e.to_string())?;

        mutate_state(|es| {
            let game_id = game.game_id;
            let game = es.games.get_mut(&game_id).ok_or("Game not found").unwrap();
            game.game_status = game.game_status.finish_add_liquidity();
        });

        Ok(new_state)
    }

    #[action]
    pub async fn withdraw(_psbt: &bitcoin::Psbt, args: ActionArgs) -> ActionResult<CookiePoolState> {
        let Intention {
            exchange_id: _,
            action: _,
            action_params,
            pool_address,
            nonce,
            pool_utxo_spent,
            pool_utxo_received,
            input_coins,
            output_coins,
        } = args.intention;
        let action_params_json_value =
            serde_json::from_str::<serde_json::Value>(action_params.as_str())
                .map_err(|_| "invalid action params".to_string())?;
        let game = read_state(|es| {
            let game_id = action_params_json_value
                .get("game_id")
                .map(|v| v.to_string())
                .ok_or("invalid game id".to_string())?;

            es.games
                .get(&game_id)
                .cloned()
                .ok_or("Game not found".to_string())
        })?;
        let (new_state, (_key_derivation_path, _utxo)) = game
            .validate_withdraw(
                pool_address.clone(),
                args.txid.clone(),
                nonce,
                pool_utxo_spent,
                pool_utxo_received,
                input_coins,
                output_coins,
                args.initiator_address.clone(),
            )
            .map_err(|e| e.to_string())?;

        mutate_state(|es| {
            let game_id = game.game_id;
            let game = es.games.get_mut(&game_id).ok_or("Game not found").unwrap();
            game.withdraw(args.initiator_address.clone())
                .expect("Failed to withdraw");
        });

        Ok(new_state)
    }

    pub fn mutate_state<F, R>(f: F) -> R
    where
        F: FnOnce(&mut ExchangeState) -> R,
    {
        State::with_mut(|es| {
            let mut a = es.get().clone().expect("Failed to get state");
            let r = f(&mut a);
            es.set(Some(a));
            r
        })
    }

    pub fn read_state<F, R>(f: F) -> R
    where
        F: FnOnce(&ExchangeState) -> R,
    {
        State::with(|es| {
            es.get()
                .as_ref()
                .map(|s| f(&s))
                .expect("Failed to get state")
        })
    }
}


#[test]
pub fn test() {
    let empty_txid = Txid::zero();
}