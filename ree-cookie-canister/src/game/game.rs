use std::borrow::Cow;
use std::collections::HashMap;

use crate::memory::read_state;
use crate::pool::{PoolManager, PoolState, UserAction};
use crate::*;
use crate::{utils::get_chain_second_timestamp, AddressStr, ExchangeError, Seconds};
use ic_cdk::api::management_canister::bitcoin::Satoshi;
use ic_stable_structures::storable::Bound;
use ic_stable_structures::Storable;
use ree_types::{CoinBalance, CoinId, InputCoin, OutputCoin};
use serde::{Deserialize, Serialize};

use super::gamer::Gamer;

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct Game {
    pub game_id: GameId,
    pub game_name: String,
    pub gamer_register_fee: Satoshi,
    pub claim_cooling_down: Seconds,
    pub claim_amount_per_click: u128,
    pub game_status: GameStatus,
    pub creator: Principal,
    pub creator_address: AddressStr,
    pub pool_manager: PoolManager,
    pub rune_info: Option<RuneInfo>,
    pub claimed_cookies: u128,
    pub gamers: HashMap<AddressStr, Gamer>,
    #[serde(default)]
    pub etch_rune_commit_tx: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct RuneInfo {
    pub rune_id: CoinId,
    pub rune_name: RuneName,
    pub rune_premine_amount: u128,
}

impl Storable for Game {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(bincode::serialize(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        bincode::deserialize(bytes.as_ref()).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Game {
    pub fn new(
        args: CreateGameArgs, 
        creator: Principal, 
        game_id: GameId,
    ) -> Self {
        Self {
            game_id: game_id,
            game_name: args.game_name.clone(),
            gamer_register_fee: args.gamer_register_fee,
            claim_cooling_down: args.claim_cooling_down,
            claim_amount_per_click: args.claim_amount_per_click,
            game_status: GameStatus::Initializing,
            creator: creator,
            creator_address: args.create_address.clone(),
            pool_manager: PoolManager::new(game_id.to_string()),
            rune_info: None,
            claimed_cookies: 0,
            gamers: HashMap::new(),
            etch_rune_commit_tx: "".to_string(),
        }
    }

    pub fn calculate_premine_rune_amount(&self) -> u128 {
        self.claimed_cookies * 120 / 100
    }

    pub fn register_new_gamer(&mut self, gamer_id: AddressStr) -> Result<()> {
        if self.gamers.contains_key(&gamer_id) {
            return Err(ExchangeError::GamerAlreadyExist(gamer_id));
        }

        self.gamers
            .insert(gamer_id.clone(), Gamer::new(gamer_id.clone()));

        Ok(())
    }

    pub fn is_end(&self) -> bool {
        self.rune_info
            .as_ref()
            .is_some_and(|rune_info| self.claimed_cookies == rune_info.rune_premine_amount)
        // &&
        // self.claimed_cookies + self.cookie_amount_per_claim > self.rune_info.unwrap()
    }

    // pub fn add_liquidity(&mut self) {
    //     self.already_add_liquidity = true;
    // }

    pub fn able_claim(&self, gamer_id: AddressStr) -> Result<()> {
        if self.is_end() {
            return Err(ExchangeError::GameEnd);
        }

        self.gamers
            .get(&gamer_id)
            .ok_or(ExchangeError::GamerNotFound(gamer_id.clone()))
            .and_then(|gamer| {
                if get_chain_second_timestamp() > gamer.last_click_time + self.claim_cooling_down {
                    Ok(())
                } else {
                    Err(ExchangeError::GamerCoolingDown(
                        gamer_id,
                        gamer.last_click_time + self.claim_cooling_down,
                    ))
                }
            })
    }

    pub fn end(&mut self) {
        self.game_status = self.game_status.game_end();
    }

    pub fn claim(&mut self, gamer_id: AddressStr) -> Result<u128> {
        self.able_claim(gamer_id.clone())?;

        // let mut gamer = GAMER.with_borrow(|g| {
        //     g.get(&gamer_id)
        //         .ok_or(ExchangeError::GamerNotFound(gamer_id.clone()))
        // })?;

        let gamer = self
            .gamers
            .get_mut(&gamer_id)
            .ok_or(ExchangeError::GamerNotFound(gamer_id.clone()))?;

        self.claimed_cookies = self
            .claimed_cookies
            .checked_add(self.claim_amount_per_click)
            .ok_or(ExchangeError::Overflow)?;
        gamer.claim(self.claim_amount_per_click)?;

        let new_cookies_balance = gamer.cookies;

        Ok(new_cookies_balance)
    }

    pub fn withdraw(&mut self, gamer_id: AddressStr) -> Result<u128> {
        if !self.is_end() {
            return Err(ExchangeError::GameNotEnd);
        }
        let gamer = self
            .gamers
            .get_mut(&gamer_id)
            .ok_or(ExchangeError::GamerNotFound(gamer_id.clone()))?;

        if !gamer.is_withdrawn {
            gamer.is_withdrawn = true;
            let cookies = gamer.cookies;

            Ok(cookies)
        } else {
            Err(ExchangeError::GamerWithdrawRepeatedly(gamer_id))
        }
    }

    pub fn finalize_tx(&mut self, txid: Txid, pool_address: String) -> Result<()> {
        if let Some(pool) = self.pool_manager.btc_pools.get_mut(&pool_address) {
            pool.finalize(txid)?;
        } else if let Some(pool) = self.pool_manager.rune_pool.as_mut() {
            pool.finalize(txid)?;
        } else {
            return Err(ExchangeError::PoolNotFound(pool_address));
        }
        Ok(())
    }

    pub fn rollback_tx(&mut self, txid: Txid, pool_address: String)->Result<()>{
        if let Some(pool) = self.pool_manager.btc_pools.get_mut(&pool_address) {
            pool.rollback(txid)?;
        } else if let Some(pool) = self.pool_manager.rune_pool.as_mut() {
            let rollback_state = pool.rollback(txid)?;
            for state in rollback_state {
                match state.user_action {
                    UserAction::Register(address) => {
                        self.gamers.remove(&address);
                    }
                    UserAction::Withdraw(address) => {
                        self.gamers
                            .get_mut(&address)
                            .ok_or(ExchangeError::GamerNotFound(address.clone()))?
                            .is_withdrawn = false;
                    }
                    _ => {}
                }
            }
        } else {
            return Err(ExchangeError::PoolNotFound(pool_address));
        }
        Ok(())
    }
}

impl Game {
    pub fn validate_add_liquidity_rune(
        &self,
        txid: Txid,
        nonce: u64,
        pool_utxo_spent: Vec<String>,
        pool_utxo_received: Vec<Utxo>,
        input_coins: Vec<InputCoin>,
        output_coins: Vec<OutputCoin>,
        address: AddressStr,
        rune_pool_address: AddressStr,
        richswap_pool_address: AddressStr,
    ) -> Result<(PoolState, (String, Utxo))> {
        let rune_info = self
            .rune_info
            .as_ref()
            .ok_or(ExchangeError::RuneNotFound(self.game_name.clone()))?;

        let rune_pool = self
            .pool_manager
            .rune_pool
            .clone()
            .ok_or(ExchangeError::PoolNotFound(self.game_name.clone()))?;

        let last_state = self
            .pool_manager
            .rune_pool.clone()
            .ok_or(ExchangeError::PoolNotFound(self.game_name.clone()))?
            .last_state()
            .ok_or(ExchangeError::LastStateNotFound)?;

        let pool_expected_spend_rune = self.calculate_premine_rune_amount();

        // the input coins should be only one and the value should be equal to the register fee
        (input_coins.len() == 0
            && output_coins.len() == 1
            && output_coins[0].coin.id.eq(&CoinId::btc())
            && output_coins[0].coin.value == pool_expected_spend_rune
            && output_coins[0].to.eq(&richswap_pool_address)
        )
            .then(|| ())
            .ok_or(ExchangeError::InvalidSignPsbtArgs(format!(
                "input_coins: {:?}, output_coins: {:?}",
                input_coins, output_coins
            )))?;

        // check nonce matches
        (last_state.nonce == nonce)
            .then(|| ())
            .ok_or(ExchangeError::PoolStateExpired(last_state.nonce))?;

        // the pool_utxo_receive should exist
        let new_utxo = pool_utxo_received.last().map(|s| s.clone()).ok_or(
            ExchangeError::InvalidSignPsbtArgs("pool_utxo_receive not found".to_string()),
        )?;

        let new_rune_balance = rune_info
            .rune_premine_amount
            .checked_sub(pool_expected_spend_rune)
            .ok_or(ExchangeError::Overflow)?;

        // let new_utxo = Utxo::try_from(
        //     pool_new_outpoint,
        //     Some(CoinBalance {
        //         id: rune_info.rune_id.clone(),
        //         value: new_rune_balance,
        //     }),
        //     last_state
        //         .utxo
        //         .sats
        //         .checked_add(self.gamer_register_fee)
        //         .ok_or(ExchangeError::Overflow)?,
        // )
        // .map_err(|e| ExchangeError::InvalidSignPsbtArgs(e.to_string()))?;

        let new_state = PoolState {
            id: txid,
            nonce: last_state
                .nonce
                .checked_add(1)
                .ok_or(ExchangeError::Overflow)?,
            utxo: new_utxo,
            user_action: UserAction::AddLiquidity,
        };

        return Ok((
            new_state,
            (
                rune_pool.key_derivation_path.clone(),
                last_state.utxo.clone(),
            ),
        ));
    }

    pub fn validate_add_liquidity_btc(
        &self,
        txid: Txid,
        nonce: u64,
        pool_utxo_spent: Vec<String>,
        pool_utxo_received: Vec<Utxo>,
        input_coins: Vec<InputCoin>,
        output_coins: Vec<OutputCoin>,
        initiator: AddressStr,
        btc_pool_address: AddressStr,
        richswap_pool_address: AddressStr,
    ) -> Result<(PoolState, (String, Utxo))> {
        assert!(
            matches!(self.game_status, GameStatus::WaitAddedLiquidity),
            "GameStatus should be WaitAddedLiquidity, but got: {:?}",
            self.game_status
        );

        let btc_pool = self
            .pool_manager
            .btc_pools
            .get(&btc_pool_address)
            .ok_or(ExchangeError::PoolNotFound(btc_pool_address.clone()))?;

        let last_state = btc_pool
            .last_state()
            .ok_or(ExchangeError::LastStateNotFound)?;

        let expected_spend_btc = last_state.btc_balance() as u128 - 546;

        (input_coins.is_empty()
            && output_coins.len() == 1
            && output_coins[0].coin.id.eq(&CoinId::btc())
            && output_coins[0].coin.value == expected_spend_btc
            && output_coins[0].to.eq(&richswap_pool_address)
        )
            .then(|| ())
            .ok_or(ExchangeError::InvalidSignPsbtArgs(format!(
                "input_coins: {:?}, output_coins: {:?}",
                input_coins, output_coins
            )))?;

        // check nonce matches
        (last_state.nonce == nonce)
            .then(|| ())
            .ok_or(ExchangeError::PoolStateExpired(last_state.nonce))?;

        // the pool_utxo_receive should exist
        let new_utxo = pool_utxo_received.last().map(|s| s.clone()).ok_or(
            ExchangeError::InvalidSignPsbtArgs("pool_utxo_receive not found".to_string()),
        )?;

        // let new_utxo = Utxo::try_from(pool_new_outpoint, None, 546)
        //     .map_err(|e| ExchangeError::InvalidSignPsbtArgs(e.to_string()))?;

        let new_state = PoolState {
            id: txid,
            nonce: last_state
                .nonce
                .checked_add(1)
                .ok_or(ExchangeError::Overflow)?,
            utxo: new_utxo,
            user_action: UserAction::AddLiquidity,
        };

        return Ok((
            new_state,
            (
                btc_pool.key_derivation_path.clone(),
                last_state.utxo.clone(),
            ),
        ));
    }

    pub fn validate_register(
        &self,
        txid: Txid,
        nonce: u64,
        pool_utxo_spend: Vec<String>,
        pool_utxo_receive: Vec<Utxo>,
        input_coins: Vec<InputCoin>,
        output_coins: Vec<OutputCoin>,
        address: AddressStr,
        btc_pool_address: AddressStr,
    ) -> Result<(PoolState, (String, Utxo))> {

        if !matches!(self.game_status, GameStatus::Playing) {
            return Err(ExchangeError::GameStatusNotMatch(
                self.game_status.clone(),
                GameStatus::Playing,
            ));
        }

        if self.gamers.contains_key(&address) {
            return Err(ExchangeError::GamerAlreadyExist(address.clone()));
        }

        // the input coins should be only one and the value should be equal to the register fee
        (input_coins.len() == 1
            && output_coins.is_empty()
            && input_coins[0].coin.id.eq(&CoinId::btc())
            && input_coins[0].coin.value == self.gamer_register_fee as u128)
            .then(|| ())
            .ok_or(ExchangeError::InvalidSignPsbtArgs(format!(
                "input_coins: {:?}, output_coins: {:?}",
                input_coins, output_coins
            )))?;

        // the pool_utxo_spend should be equal to the utxo of the last state
        let btc_pool = self
            .pool_manager
            .btc_pools
            .get(&btc_pool_address)
            .ok_or(ExchangeError::PoolAddressNotFound)?;

        let last_state = btc_pool
            .last_state()
            .ok_or(ExchangeError::LastStateNotFound)?;

        // check nonce matches
        (last_state.nonce == nonce)
            .then(|| ())
            .ok_or(ExchangeError::PoolStateExpired(last_state.nonce))?;

        last_state
            .utxo
            .outpoint()
            .eq(pool_utxo_spend
                .last()
                .ok_or(ExchangeError::InvalidSignPsbtArgs(
                    "pool_utxo_spend is empty".to_string(),
                ))?)
            .then(|| ())
            .ok_or(ExchangeError::InvalidSignPsbtArgs(format!(
                "pool_utxo_spend: {:?}, last_state_utxo: {:?}",
                pool_utxo_spend, last_state.utxo
            )))?;

        // the pool_utxo_receive should exist
        let new_utxo = pool_utxo_receive.last().map(|s| s.clone()).ok_or(
            ExchangeError::InvalidSignPsbtArgs("pool_utxo_receive not found".to_string()),
        )?;

        // let new_utxo = Utxo::try_from(
        //     pool_new_outpoint.outpoint(),
        //     last_state.utxo.maybe_rune.clone(),
        //     last_state
        //         .utxo
        //         .sats
        //         .checked_add(self.gamer_register_fee)
        //         .ok_or(ExchangeError::Overflow)?,
        // )
        // .map_err(|e| ExchangeError::InvalidSignPsbtArgs(e.to_string()))?;
        let new_state = PoolState {
            id: txid,
            nonce: last_state
                .nonce
                .checked_add(1)
                .ok_or(ExchangeError::Overflow)?,
            utxo: new_utxo,
            user_action: UserAction::Register(address.clone()),
        };

        Ok((
            new_state,
            (
                btc_pool.key_derivation_path.clone(),
                last_state.utxo.clone(),
            ),
        ))
    }

    pub fn validate_withdraw(
        &self,
        txid: Txid,
        nonce: u64,
        pool_utxo_spend: Vec<String>,
        pool_utxo_received: Vec<Utxo>,
        input_coins: Vec<InputCoin>,
        output_coins: Vec<OutputCoin>,
        initiator_address: AddressStr,
    ) -> Result<(PoolState, (String, Utxo))> {
        assert!(
            matches!(self.game_status, GameStatus::Withdrawing),
            "GameStatus should be Withdrawing, but got: {:?}",
            self.game_status
        );

        let rune_info = self
            .rune_info
            .as_ref()
            .ok_or(ExchangeError::RuneNotFound(self.game_name.clone()))?;

        let rune_pool = self
            .pool_manager
            .rune_pool
            .clone()
            .ok_or(ExchangeError::PoolNotFound(self.game_name.clone()))?;

        let last_state = self
            .pool_manager
            .rune_pool.clone()
            .ok_or(ExchangeError::PoolNotFound(self.game_name.clone()))?
            .last_state()
            .ok_or(ExchangeError::LastStateNotFound)?;

        let gamer = self
            .gamers
            .get(&initiator_address)
            .ok_or(ExchangeError::GamerNotFound(initiator_address.clone()))?;

        let pool_expected_spend_rune = gamer.cookies;

        assert!(
            output_coins.len() == 1
                && input_coins.is_empty()
                && output_coins[0].coin.id.eq(&rune_info.rune_id)
                && output_coins[0].coin.value == pool_expected_spend_rune
                && output_coins[0].to.eq(&initiator_address),
        );

        // check nonce matches
        (last_state.nonce == nonce)
            .then(|| ())
            .ok_or(ExchangeError::PoolStateExpired(last_state.nonce))?;

        (pool_utxo_spend.len() == 1 && pool_utxo_spend.contains(&last_state.utxo.outpoint()))
            .then(|| ())
            .ok_or(ExchangeError::InvalidSignPsbtArgs(format!(
            "Pool Utxo Spend not eq last pool state utxos, pool_utxo_spend: {:?}, last_state: {:?}",
            pool_utxo_spend, last_state
        )))?;

        // the pool_utxo_receive should exist
        let new_utxo = pool_utxo_received.first().map(|s| s.clone()).ok_or(
            ExchangeError::InvalidSignPsbtArgs("pool_utxo_receive not found".to_string()),
        )?;

        // let last_rune_info =
        //     last_state
        //         .utxo
        //         .maybe_rune
        //         .ok_or(ExchangeError::InvalidSignPsbtArgs(
        //             "rune_utxo not found".to_string(),
        //         ))?;

        // let new_utxo = Utxo::try_from(
        //     pool_new_outpoint,
        //     Some(CoinBalance {
        //         id: last_rune_info.id,
        //         value: last_rune_info
        //             .value
        //             .checked_sub(pool_expected_spend_rune)
        //             .ok_or(ExchangeError::Overflow)?,
        //     }),
        //     last_state.utxo.sats,
        // )
        // .map_err(|e| ExchangeError::InvalidSignPsbtArgs(e.to_string()))?;

        let new_state = PoolState {
            id: txid,
            nonce: last_state
                .nonce
                .checked_add(1)
                .ok_or(ExchangeError::Overflow)?,
            utxo: new_utxo,
            user_action: UserAction::AddLiquidity,
        };

        return Ok((new_state, (rune_pool.key_derivation_path.clone(), last_state.utxo.clone())));
    }
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone)]
pub struct GameAndGamer {
    pub is_end: bool,
    pub gamer_register_fee: Satoshi,
    pub claim_cooling_down: Seconds,
    pub cookie_amount_per_claim: u128,
    pub claimed_cookies: u128,
    pub gamer: Option<Gamer>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum GameStatus {
    Initializing,
    Playing,
    Etching,
    WaitAddedLiquidity,
    Withdrawing,
}

impl GameStatus {


    pub fn init(&self) -> GameStatus {
        match self {
            GameStatus::Initializing => GameStatus::Playing,
            _ => panic!("GameStatus should be Initializing"),
        }
    }

    pub fn finish_etching(&self) -> GameStatus {
        match self {
            GameStatus::Etching => GameStatus::WaitAddedLiquidity,
            _ => panic!("GameStatus should be Etching"),
        }
    }

    pub fn game_end(&self) -> GameStatus {
        match self {
            GameStatus::Playing => GameStatus::Etching,
            _ => panic!("GameStatus should be Playing"),
        }
    }

    pub fn finish_add_liquidity(&self) -> GameStatus {
        match self {
            GameStatus::WaitAddedLiquidity => GameStatus::Withdrawing,
            _ => panic!("GameStatus should be WaitAddedLiquidity"),
        }
    }
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct CreateGameArgs {
    pub game_name: String,
    pub gamer_register_fee: Satoshi,
    pub claim_cooling_down: Seconds,
    pub claim_amount_per_click: u128,
    pub create_address: AddressStr,
}
