use crate::*;
use ic_cdk::api::management_canister::bitcoin::Satoshi;

pub(crate) fn get_chain_second_timestamp() -> SecondTimestamp {
    ic_cdk::api::time() / 1000_000_000
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct AddLiquidityInfo {
    pub btc_amount_for_add_liquidity: Satoshi,
    pub rune_amount_for_add_liquidity: u128,
}
