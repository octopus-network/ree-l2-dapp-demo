use crate::*;
use ic_cdk::api::management_canister::bitcoin::Satoshi;
use ic_stable_structures::{storable::Bound, Storable};

pub(crate) fn get_chain_second_timestamp() -> SecondTimestamp {
    ic_cdk::api::time() / 1000_000_000
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct AddLiquidityInfo {
    pub btc_amount_for_add_liquidity: Satoshi,
    pub rune_amount_for_add_liquidity: u128,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Default)]
pub struct RuneCommitList {
    pub commit_txs: Vec<String>,
}

impl Storable for RuneCommitList {
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