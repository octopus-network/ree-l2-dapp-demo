use ic_cdk::api::call::CallResult;
use serde_bytes::ByteBuf;

use crate::memory::read_state;

pub async fn get_principal(address: String) -> CallResult<(Result<ByteBuf, String>,)> {
    let ii_canister = read_state(|s| s.ii_canister.clone());
    ic_cdk::call(ii_canister, "get_principal", (address,)).await
}
