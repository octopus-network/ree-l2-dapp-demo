use std::borrow::Cow;

use crate::memory::GAMER;
use crate::pool::PoolManager;
use crate::*;
use crate::{utils::get_chain_second_timestamp, AddressStr, ExchangeError, Seconds};
use ic_cdk::api::management_canister::bitcoin::Satoshi;
use ic_stable_structures::storable::Bound;
use ic_stable_structures::Storable;
use serde::{Deserialize, Serialize};

use super::gamer::Gamer;

pub const GAME_RUNE_PREMINE_AMOUNT: u32 = 1_000_000_000_000; // 1 billion cookies

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct Game {
    pub game_name: String,
    pub gamer_register_fee: Satoshi,
    pub claim_cooling_down: Seconds,
    pub cookie_amount_per_claim: u128,
    pub game_status: GameStatus,
    pub creator: AddressStr,
    pub pool_manager: PoolManager,
    pub rune_info: Option<RuneInfo>,
    pub claimed_cookies: u128,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct RuneInfo {
    pub rune_id: String,
    pub rune_name: String,
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
        creator: AddressStr,
    )-> Self {
        Self {
            game_name: args.game_name.clone(),
            gamer_register_fee: args.gamer_register_fee,
            claim_cooling_down: args.claim_cooling_down,
            cookie_amount_per_claim: args.cookie_amount_per_claim,
            game_status: GameStatus::Etching,
            creator,
            pool_manager: PoolManager::new(args.game_name),
            rune_info: Option::None ,
            claimed_cookies: 0,
        }
    }

    // pub fn init(
    //     creator: AddressStr,
    //     gamer_register_fee: Satoshi,
    //     claim_cooling_down: Seconds,
    //     claimed_cookies_per_click: u128,
    // ) -> Self {
    //     Self {
    //         // is_end: false,
    //         gamer_register_fee,
    //         claim_cooling_down,
    //         cookie_amount_per_claim: claimed_cookies_per_click,
    //         claimed_cookies: 0,
    //         // already_add_liquidity: false,
    //         // start_time: 0,
    //         game_status: GameStatus::Etching,
    //         creator,
    //         pool_manager: PoolManager::ini,
    //         rune_info: todo!(),
    //     }
    // }

    pub fn register_new_gamer(&mut self, gamer_id: AddressStr) {
        GAMER.with_borrow_mut(|g| g.insert(gamer_id.clone(), Gamer::new(gamer_id.clone())));
    }

    pub fn is_end(&self) -> bool {

        self.rune_info.as_ref().is_some_and( |rune_info| {
            self.claimed_cookies == rune_info.rune_premine_amount
        }) 
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

        GAMER
            .with_borrow(|g| {
                g.get(&gamer_id)
                    .ok_or(ExchangeError::GamerNotFound(gamer_id.clone()))
            })
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

    pub fn claim(&mut self, gamer_id: AddressStr) -> Result<u128> {
        self.able_claim(gamer_id.clone())?;

        let mut gamer = GAMER.with_borrow(|g| {
            g.get(&gamer_id)
                .ok_or(ExchangeError::GamerNotFound(gamer_id.clone()))
        })?;

        self.claimed_cookies = self
            .claimed_cookies
            .checked_add(self.cookie_amount_per_claim)
            .ok_or(ExchangeError::Overflow)?;
        gamer.claim(self.cookie_amount_per_claim)?;

        let new_cookies_balance = gamer.cookies;
        GAMER.with_borrow_mut(|g| g.insert(gamer_id.clone(), gamer.clone()));

        Ok(new_cookies_balance)
    }

    pub fn withdraw(&mut self, gamer_id: AddressStr) -> Result<u128> {
        let mut gamer = GAMER.with_borrow(|g| {
            g.get(&gamer_id)
                .ok_or(ExchangeError::GamerNotFound(gamer_id.clone()))
        })?;

        if self.is_end() {
            if !gamer.is_withdrawn {
                gamer.is_withdrawn = true;
                let cookies = gamer.cookies;

                GAMER.with_borrow_mut(|g| g.insert(gamer_id.clone(), gamer.clone()));

                Ok(cookies)
            } else {
                Err(ExchangeError::GamerWithdrawRepeatedly(gamer_id))
            }
        } else {
            Err(ExchangeError::GameNotEnd)
        }
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
    Etching,
    Playing,
    // AddedLiquidity,
    Withdrawing,
}


impl GameStatus {

    pub fn finish_etching(&self) -> GameStatus {
        match self {
            GameStatus::Etching => GameStatus::Playing,
            _ => panic!("GameStatus should be Etching"),
        }
    }

    pub fn end(&self) -> GameStatus {
        match self {
            GameStatus::Playing => GameStatus::Withdrawing,
            _ => panic!("GameStatus should be Playing"),
        }
    }

    // pub fn finish_add_liquidity(&self) -> GameStatus {
    //     match self {
    //         GameStatus::AddLiquidity => GameStatus::Withdrawable,
    //         _ => panic!("GameStatus should be RunesMinted"),
    //     }
    // }
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct CreateGameArgs {
    game_name: String,
    gamer_register_fee: Satoshi,
    claim_cooling_down: Seconds,
    cookie_amount_per_claim: u128,
}