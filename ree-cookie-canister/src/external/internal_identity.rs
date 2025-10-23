use candid::Principal;
use ic_cdk::api::call::CallResult;
use serde_bytes::ByteBuf;

use crate::SIWB_TESTNET_CANISTER;

pub async fn get_principal(address: String) -> Result<Principal, String> {
    let siwb_principal = Principal::from_text(SIWB_TESTNET_CANISTER)
        .map_err(|e| format!("Failed to parse SIWB_TESTNET_CANISTER principal: {}", e))?;
    let result: CallResult<(Result<ByteBuf, String>,)> =
        ic_cdk::call(siwb_principal, "get_principal", (address,)).await;
    let success_result = result
        .map_err(|e| format!("Failed to call get_principal: {:?}", e))?
        .0
        .map_err(|e| format!("Error in get_principal response: {}", e))?;

    Principal::try_from_slice(&success_result)
        .map_err(|e| format!("Failed to convert ByteBuf to Principal: {}", e))
}

#[test]
pub fn test_principal() {
    let principal = Principal::from_slice(&vec![
        225, 209, 222, 36, 248, 96, 118, 238, 2, 172, 201, 226, 207, 83, 78, 83, 28, 133, 229, 192,
        29, 162, 40, 195, 199, 202, 155, 62, 2,
    ]);
    dbg!(&principal.to_text());
}
