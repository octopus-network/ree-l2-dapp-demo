use std::collections::{BTreeMap, HashMap, HashSet};
use crate::*;

// #[derive(CandidType, Clone, Debug, Deserialize, Serialize)]
// pub struct Pool {
//     pub states: Vec<PoolState>,
// }

// #[derive(CandidType, Clone, Debug, Deserialize, Serialize)]
// pub struct GamePool {
//     pub states: Vec<PoolState>,
//     pub fee_rate: u64,
//     pub burn_rate: u64,
//     // pub meta: CoinMeta,
//     pub pubkey: Pubkey,
//     pub tweaked: Pubkey,
//     pub addr: String,
// }


// #[derive(CandidType, Clone, Debug, Deserialize, Serialize, Default)]
// pub struct PoolState {
//     pub id: Option<Txid>,
//     pub nonce: u64,
//     pub utxo: Option<Utxo>,
//     pub gamers_withdrawn_amount: Vec<(Pubkey, u128)>,
// }