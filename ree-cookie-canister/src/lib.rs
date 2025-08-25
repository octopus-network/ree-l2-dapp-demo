pub mod canister;
pub mod errors;
pub mod external;
pub mod game;
pub mod log;
pub mod memory;
pub mod reorg;
pub mod state;
pub mod utils;
pub mod exchange;

pub use candid::{CandidType, Principal};
pub use errors::ExchangeError;
pub use external::rune_indexer::{RuneEntry, Service as RuneIndexer};
pub use ic_canister_log::log;
pub use ic_stable_structures::StableBTreeMap;
pub use log::*;
pub use serde::{Deserialize, Serialize};
use game::game::CreateGameArgs;
use state::ExchangeState;
use game::game::Game;
use utils::AddLiquidityInfo;
use ree_exchange_sdk::{types::{Txid, Utxo, Pubkey}, Metadata};
use exchange::CookiePoolState;
use game::game::GameAndPool;

pub const SIWB_TESTNET_CANISTER: &'static str = "stxih-wyaaa-aaaah-aq2la-cai";
pub const RUNE_INDEXER_CANISTER: &'static str = "f2dwm-caaaa-aaaao-qjxlq-cai";
pub const TESTNET_RUNE_INDEXER_CANISTER: &'static str = "f2dwm-caaaa-aaaao-qjxlq-cai";
pub const ORCHESTRATOR_CANISTER: &'static str = "kqs64-paaaa-aaaar-qamza-cai";
pub const ICP_LEDGER_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";
pub const ETCH_CANISTER_ID: &str = "e2rzq-6iaaa-aaaan-qz2ca-cai";

pub type Seconds = u64;
pub type SecondTimestamp = u64;
pub type PoolId = Pubkey;
pub type AddressStr = String;
pub type RuneName = String;
pub type RuneId = String;
pub type GameId = String;
pub const DUST_BTC_VALUE: u64 = 546;


// Enable Candid export
ic_cdk::export_candid!();
