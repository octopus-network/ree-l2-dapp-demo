use crate::memory::GAMER;
use crate::*;
use crate::{utils::get_chain_second_timestamp, Address, ExchangeError, Seconds};
use ic_cdk::api::management_canister::bitcoin::Satoshi;
use serde::{Deserialize, Serialize};

use super::gamer::Gamer;

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct Game {
    pub is_end: bool,
    pub gamer_register_fee: Satoshi,
    pub claim_cooling_down: Seconds,
    pub cookie_amount_per_claim: u128,
    pub claimed_cookies: u128,
    pub already_add_liquidity: bool,
    pub start_time: u64,
}

impl Game {
    pub fn init(
        gamer_register_fee: Satoshi,
        claim_cooling_down: Seconds,
        claimed_cookies_per_click: u128,
    ) -> Self {
        Self {
            is_end: false,
            gamer_register_fee,
            claim_cooling_down,
            cookie_amount_per_claim: claimed_cookies_per_click,
            claimed_cookies: 0,
            already_add_liquidity: false,
            start_time: 0,
        }
    }

    pub fn register_new_gamer(&mut self, gamer_id: Address) {
        GAMER.with_borrow_mut(|g| g.insert(gamer_id.clone(), Gamer::new(gamer_id.clone())));
    }

    pub fn is_end(&self) -> bool {
        self.is_end
    }

    pub fn add_liquidity(&mut self) {
        self.already_add_liquidity = true;
    }

    pub fn able_claim(&self, gamer_id: Address) -> Result<()> {
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

    pub fn claim(&mut self, gamer_id: Address) -> Result<u128> {
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

    pub fn withdraw(&mut self, gamer_id: Address) -> Result<u128> {
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
