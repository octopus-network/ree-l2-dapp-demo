use std::borrow::Cow;

use ic_stable_structures::storable::Bound;
use ic_stable_structures::Storable;

use crate::utils::get_chain_second_timestamp;
use crate::SecondTimestamp;
use crate::*;

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Gamer {
    pub address: String,
    pub cookies: u128,
    pub last_click_time: SecondTimestamp,
    pub is_withdrawn: bool,
}

impl Storable for Gamer {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        Cow::Owned(bincode::serialize(self).unwrap())
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        bincode::deserialize(bytes.as_ref()).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Gamer {
    pub fn new(address: String) -> Self {
        Self {
            address,
            cookies: 0,
            last_click_time: 0,
            is_withdrawn: false,
        }
    }

    pub fn claim(&mut self, claimed_cookies: u128) -> Result<u128> {
        self.cookies = self
            .cookies
            .checked_add(claimed_cookies)
            .ok_or(ExchangeError::Overflow)?;
        self.last_click_time = get_chain_second_timestamp();
        Ok(self.cookies)
    }
}
