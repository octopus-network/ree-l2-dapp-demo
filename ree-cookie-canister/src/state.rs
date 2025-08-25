use ic_stable_structures::storable::Bound;
use ic_stable_structures::Storable;
use std::borrow::Cow;
use std::collections::HashMap;

use crate::game::game::Game;
use crate::*;

#[derive(Deserialize, Serialize, Clone, CandidType, Default)]
pub struct ExchangeState {
    pub games: HashMap<GameId, Game>,
    pub txid_game_map: HashMap<String, GameId>,
}


impl Storable for ExchangeState {
     fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        let bytes = bincode::serialize(self).unwrap();
        std::borrow::Cow::Owned(bytes)
    }

    fn into_bytes(self) -> Vec<u8> {
        bincode::serialize(&self).unwrap()
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        bincode::deserialize(bytes.as_ref()).unwrap()
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl ExchangeState {
    pub fn init() -> Self {
        Self {
            games: HashMap::new(),
            txid_game_map: HashMap::new(),
        }
    }
}

// #[derive(Deserialize, Serialize, Clone, Debug, CandidType)]
// pub enum UserAction {
//     Init,
//     AddLiquidity,
//     Register(AddressStr),
//     Withdraw(AddressStr),
// }

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
