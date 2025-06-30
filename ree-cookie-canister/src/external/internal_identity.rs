use candid::Principal;
use ic_cdk::api::call::CallResult;
use serde_bytes::ByteBuf;

use crate::memory::read_state;

pub async fn get_principal(address: String) -> Result<Principal, String> {
    let ii_canister = read_state(|s| s.ii_canister.clone());
    let result: CallResult<(Result<ByteBuf, String>,)> = ic_cdk::call(ii_canister, "get_principal", (address,)).await;
    let success_result = result
        .map_err(|e| format!("Failed to call get_principal: {:?}", e))?
        .0
        .map_err(|e| format!("Error in get_principal response: {}", e))?;

    Principal::try_from_slice(&success_result)
        .map_err(|e| format!("Failed to convert ByteBuf to Principal: {}", e))
}
