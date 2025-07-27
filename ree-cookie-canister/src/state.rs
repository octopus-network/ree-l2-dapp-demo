use ic_cdk::api::management_canister::bitcoin::Satoshi;
use ic_stable_structures::storable::Bound;
use ic_stable_structures::Storable;
use itertools::Itertools;
use ree_types::{CoinBalance, CoinId, InputCoin, OutputCoin};
use std::borrow::Cow;
use std::collections::HashMap;

use crate::game::game::{CreateGameArgs, Game, GameStatus};
use crate::memory::{read_state, };
use crate::pool::PoolManager;
use crate::*;

#[derive(Deserialize, Serialize, Clone, CandidType)]
pub struct ExchangeState {
    pub games: HashMap<GameId, Game>,
    pub orchestrator: Principal,
    pub ii_canister: Principal,
    pub ethcing_canister_principle: Principal,
    pub richswap_pool_address: String,
    pub txid_game_map: HashMap<String, GameId>,
}


impl Storable for ExchangeState {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(bincode::serialize(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        bincode::deserialize(bytes.as_ref()).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl ExchangeState {
    pub fn init(
        orchestrator: Principal,
        ii_canister: Principal,
        etching_canister_principle: Principal,
        richswap_pool_address: String,
    ) -> Self {
        Self {
            games: HashMap::new(),
            orchestrator,
            ii_canister,
            ethcing_canister_principle: etching_canister_principle,
            richswap_pool_address,
            txid_game_map: HashMap::new(),
        }
    }

    // pub fn last_state(&self) -> Result<PoolState> {
    //     // The last state should always exist
    //     self.states
    //         .last()
    //         .cloned()
    //         .ok_or(ExchangeError::LastStateNotFound)
    //         .inspect_err(|e| log!(ERROR, "{}", e))
    // }

    // pub fn validate_withdraw(
    //     &self,
    //     txid: Txid,
    //     nonce: u64,
    //     pool_utxo_spend: Vec<String>,
    //     pool_utxo_receive: Vec<String>,
    //     input_coins: Vec<InputCoin>,
    //     output_coins: Vec<OutputCoin>,
    //     initiator_address: AddressStr,
    // ) -> Result<(PoolState, Utxo)> {
    //     assert!(
    //         matches!(self.game.game_status, GameStatus::Withdrawable),
    //         "GameStatus should be Withdrawable, but got: {:?}",
    //         self.game.game_status
    //     );

    //     let gamer = GAMER
    //         .with_borrow(|g| g.get(&initiator_address))
    //         .ok_or(ExchangeError::GamerNotFound(initiator_address.clone()))?;
    //     let pool_expected_spend_rune = CoinBalance {
    //         id: self.rune_id.clone().ok_or(ExchangeError::InvalidRuneId)?,
    //         value: gamer.cookies,
    //     };
    //     assert!(
    //         output_coins.len() == 1
    //             && input_coins.is_empty()
    //             && output_coins[0].coin.id.eq(&pool_expected_spend_rune.id)
    //             && output_coins[0].coin.value == pool_expected_spend_rune.value
    //             && output_coins[0].to.eq(&initiator_address),
    //     );

    //     // the pool_utxo_spend should be equal to the utxo of the last state
    //     let last_state = self.last_state()?;
    //     // check nonce matches
    //     (last_state.nonce == nonce)
    //         .then(|| ())
    //         .ok_or(ExchangeError::PoolStateExpired(last_state.nonce))?;

    //     (pool_utxo_spend.len() == 1 && pool_utxo_spend.contains(&last_state.utxo.outpoint()))
    //         .then(|| ())
    //         .ok_or(ExchangeError::InvalidSignPsbtArgs(format!(
    //         "Pool Utxo Spend not eq last pool state utxos, pool_utxo_spend: {:?}, last_state: {:?}",
    //         pool_utxo_spend, last_state
    //     )))?;

    //     // the pool_utxo_receive should exist
    //     let pool_new_outpoint = pool_utxo_receive.first().map(|s| s.clone()).ok_or(
    //         ExchangeError::InvalidSignPsbtArgs("pool_utxo_receive not found".to_string()),
    //     )?;

    //     let last_rune_info =
    //         last_state
    //             .utxo
    //             .maybe_rune
    //             .ok_or(ExchangeError::InvalidSignPsbtArgs(
    //                 "rune_utxo not found".to_string(),
    //             ))?;

    //     let new_utxo = Utxo::try_from(
    //         pool_new_outpoint,
    //         Some(CoinBalance {
    //             id: last_rune_info.id,
    //             value: last_rune_info
    //                 .value
    //                 .checked_sub(pool_expected_spend_rune.value as u128)
    //                 .ok_or(ExchangeError::Overflow)?,
    //         }),
    //         last_state
    //             .utxo
    //             .sats
    //     )
    //     .map_err(|e| ExchangeError::InvalidSignPsbtArgs(e.to_string()))?;

    //     let new_state = PoolState {
    //         id: Some(txid),
    //         nonce: last_state
    //             .nonce
    //             .checked_add(1)
    //             .ok_or(ExchangeError::Overflow)?,
    //         utxo: new_utxo,
    //         user_action: UserAction::AddLiquidity,
    //     };

    //     return Ok((new_state, last_state.utxo.clone()));
    // }

    // pub fn validate_add_liquidity(
    //     &self,
    //     txid: Txid,
    //     nonce: u64,
    //     pool_utxo_spend: Vec<String>,
    //     pool_utxo_receive: Vec<String>,
    //     input_coins: Vec<InputCoin>,
    //     output_coins: Vec<OutputCoin>,
    //     _initiator_address: AddressStr,
    // ) -> Result<(PoolState, Utxo)> {
    //     assert!(
    //         matches!(self.game.game_status, GameStatus::AddLiquidity),
    //         "GameStatus should be RunesMinted, but got: {:?}",
    //         self.game.game_status
    //     );

    //     self.game
    //         .is_end()
    //         .then(|| ())
    //         .ok_or(ExchangeError::GameNotEnd)?;

    //     // check input and output coin
    //     let gamer_count = GAMER.with_borrow(|g| g.len());
    //     let pool_expected_spend_btc = CoinBalance {
    //         id: CoinId::btc(),
    //         value: (gamer_count as u128) * (self.game.gamer_register_fee as u128),
    //     };

    //     let pool_expected_spend_rune = CoinBalance {
    //         id: self.rune_id.clone().ok_or(ExchangeError::InvalidRuneId)?,
    //         value: calculate_premine_rune_amount() - self.game.claimed_cookies,
    //     };

    //     let richswap_pool_address = read_state(|s| s.richswap_pool_address.clone());

    //     assert!(
    //         output_coins.len() == 2
    //             && input_coins.is_empty()
    //             && output_coins[0].coin.id.eq(&pool_expected_spend_btc.id)
    //             && output_coins[0].coin.value == pool_expected_spend_btc.value
    //             && output_coins[0].to.eq(&richswap_pool_address)
    //             && output_coins[1].coin.id.eq(&pool_expected_spend_rune.id)
    //             && output_coins[1].coin.value == pool_expected_spend_rune.value
    //             && output_coins[1].to.eq(&richswap_pool_address),
    //         "Failed to check input/output coins, input_coins: {:?}, output_coins: {:?}, pool_expected_spend_btc: {:?}, pool_expected_spend_rune: {:?}",
    //         input_coins,
    //         output_coins,
    //         pool_expected_spend_btc,
    //         pool_expected_spend_rune
    //     );

    //     // the pool_utxo_spend should be equal to the utxo of the last state
    //     let last_state = self.last_state()?;
    //     // check nonce matches
    //     (last_state.nonce == nonce)
    //         .then(|| ())
    //         .ok_or(ExchangeError::PoolStateExpired(last_state.nonce.clone()))?;

    //     (pool_utxo_spend.len() == 1 && pool_utxo_spend.contains(&last_state.utxo.outpoint()))
    //         .then(|| ())
    //         .ok_or(ExchangeError::InvalidSignPsbtArgs(format!(
    //         "Pool Utxo Spend not eq last pool state utxos, pool_utxo_spend: {:?}, last_state: {:?}",
    //         pool_utxo_spend, last_state
    //     )))?;

    //     // the pool_utxo_receive should exist
    //     let pool_new_outpoint = pool_utxo_receive.first().map(|s| s.clone()).ok_or(
    //         ExchangeError::InvalidSignPsbtArgs("pool_utxo_receive not found".to_string()),
    //     )?;

    //     let last_rune_info =
    //         last_state
    //             .utxo
    //             .maybe_rune
    //             .ok_or(ExchangeError::InvalidSignPsbtArgs(
    //                 "rune_utxo not found".to_string(),
    //             ))?;

    //     let new_utxo = Utxo::try_from(
    //         pool_new_outpoint,
    //         Some(CoinBalance {
    //             id: last_rune_info.id,
    //             value: last_rune_info
    //                 .value
    //                 .checked_sub(pool_expected_spend_rune.value as u128)
    //                 .ok_or(ExchangeError::Overflow)?,
    //         }),
    //         last_state
    //             .utxo
    //             .sats
    //             .checked_sub(pool_expected_spend_btc.value as u64)
    //             .ok_or(ExchangeError::Overflow)?,
    //     )
    //     .map_err(|e| ExchangeError::InvalidSignPsbtArgs(e.to_string()))?;

    //     let new_state = PoolState {
    //         id: Some(txid),
    //         nonce: last_state
    //             .nonce
    //             .checked_add(1)
    //             .ok_or(ExchangeError::Overflow)?,
    //         utxo: new_utxo,
    //         user_action: UserAction::AddLiquidity,
    //     };

    //     return Ok((new_state, last_state.utxo.clone()));
    // }

    // pub fn validate_register(
    //     &self,
    //     txid: Txid,
    //     nonce: u64,
    //     pool_utxo_spend: Vec<String>,
    //     pool_utxo_receive: Vec<String>,
    //     input_coins: Vec<InputCoin>,
    //     output_coins: Vec<OutputCoin>,
    //     address: AddressStr,
    //     game: &Game,
    // ) -> Result<(PoolState, (Utxo, String))> {
    //     // if GAMER.with_borrow(|g| g.contains_key(&address)) {
    //     //     return Err(ExchangeError::GamerAlreadyExist(address.clone()));
    //     // }

    //     game.validate_register(gamer_id)

    //     // the input coins should be only one and the value should be equal to the register fee
    //     (input_coins.len() == 1
    //         && output_coins.is_empty()
    //         && input_coins[0].coin.id.eq(&CoinId::btc())
    //         && input_coins[0].coin.value == self.game.gamer_register_fee as u128)
    //         .then(|| ())
    //         .ok_or(ExchangeError::InvalidSignPsbtArgs(format!(
    //             "input_coins: {:?}, output_coins: {:?}",
    //             input_coins, output_coins
    //         )))?;

    //     // the pool_utxo_spend should be equal to the utxo of the last state
    //     let last_state = self.last_state()?;

    //     // check nonce matches
    //     (last_state.nonce == nonce)
    //         .then(|| ())
    //         .ok_or(ExchangeError::PoolStateExpired(last_state.nonce))?;

    //     last_state
    //         .utxo
    //         .outpoint()
    //         .eq(pool_utxo_spend
    //             .last()
    //             .ok_or(ExchangeError::InvalidSignPsbtArgs(
    //                 "pool_utxo_spend is empty".to_string(),
    //             ))?)
    //         .then(|| ())
    //         .ok_or(ExchangeError::InvalidSignPsbtArgs(format!(
    //             "pool_utxo_spend: {:?}, last_state_utxo: {:?}",
    //             pool_utxo_spend, last_state.utxo
    //         )))?;

    //     // the pool_utxo_receive should exist
    //     let pool_new_outpoint = pool_utxo_receive.last().map(|s| s.clone()).ok_or(
    //         ExchangeError::InvalidSignPsbtArgs("pool_utxo_receive not found".to_string()),
    //     )?;

    //     let new_utxo = Utxo::try_from(
    //         pool_new_outpoint,
    //         last_state.utxo.maybe_rune.clone(),
    //         last_state
    //             .utxo
    //             .sats
    //             .checked_add(game.gamer_register_fee)
    //             .ok_or(ExchangeError::Overflow)?,
    //     )
    //     .map_err(|e| ExchangeError::InvalidSignPsbtArgs(e.to_string()))?;
    //     let new_state = PoolState {
    //         id: Some(txid),
    //         nonce: last_state
    //             .nonce
    //             .checked_add(1)
    //             .ok_or(ExchangeError::Overflow)?,
    //         utxo: new_utxo,
    //         user_action: UserAction::Register(address.clone()),
    //     };

    //     Ok((new_state, last_state.utxo.clone()))
    // }

    // pub(crate) fn commit(&mut self, state: PoolState) {
    //     self.states.push(state);
    // }

    // pub(crate) fn finalize(&mut self, txid: Txid) -> Result<()> {
    //     let idx = self
    //         .states
    //         .iter()
    //         .position(|s| s.id == Some(txid))
    //         .ok_or(ExchangeError::InvalidState("txid not found".to_string()))?;

    //     if idx == 0 {
    //         return Ok(());
    //     }

    //     self.states.rotate_left(idx);
    //     self.states.truncate(self.states.len() - idx);

    //     Ok(())
    // }

    // pub(crate) fn rollback(&mut self, txid: Txid) -> Result<()> {
    //     let idx = self
    //         .states
    //         .iter()
    //         .position(|state| state.id == Some(txid))
    //         .ok_or(ExchangeError::InvalidState("txid not found".to_string()))?;
    //     if idx == 0 {
    //         // why impossible to rollback index 0 state?
    //         // In init case, the state is empty, so the first state pushed in deposit interface which needn't finalize or rollback
    //         // In other case, the finalize will always keep the last finalized state in vec, so the rollback should be impossible to rollback index 0 state
    //         return Err(ExchangeError::InvalidState(
    //             "Should not rollback index 0 state".to_string(),
    //         ));
    //     }

    //     while self.states.len() > idx {
    //         let state = self.states.pop().ok_or(ExchangeError::InvalidState(
    //             "Should not rollback index 0 state".to_string(),
    //         ))?;
    //         match state.user_action {
    //             UserAction::Init => {
    //                 // impossible to rollback init state
    //                 return Err(ExchangeError::InvalidState(
    //                     "Should not rollback init action".to_string(),
    //                 ));
    //             }
    //             UserAction::AddLiquidity => {
    //                 // do nothing
    //             }
    //             UserAction::Register(address) => {
    //                 GAMER.with_borrow_mut(|g| {
    //                     g.remove(&address);
    //                 });
    //             }
    //             UserAction::Withdraw(address) => {
    //                 GAMER.with_borrow_mut(|g| {
    //                     let mut gamer = g.get(&address).expect("Gamer should exist in rollback");
    //                     gamer.is_withdrawn = false;
    //                     g.insert(address.clone(), gamer.clone());
    //                 });
    //             }
    //         }
    //     }

    //     Ok(())
    // }
}

#[derive(Deserialize, Serialize, Clone, Debug, CandidType)]
pub enum UserAction {
    Init,
    AddLiquidity,
    Register(AddressStr),
    Withdraw(AddressStr),
}

#[test]
pub fn test() {
    let input = "225; 209; 222; 36; 248; 96; 118; 238; 2; 172; 201; 226; 207; 83; 78; 83; 28; 133; 229; 192; 29; 162; 40; 195; 199; 202; 155; 62; 2";
    let numbers_vec: Vec<u8> = input
        .split(';')
        .map(|s| s.trim())
        .filter_map(|s| s.parse().ok())
        .collect();
    let p_blob = Principal::from_slice(&numbers_vec);
    dbg!(&p_blob.to_text());
}
