use candid::{CandidType, Nat, Principal};
use icrc_ledger_client_cdk::{CdkRuntime, ICRC1Client};
use icrc_ledger_types::{
    icrc1::account::Account,
    icrc2::approve::ApproveArgs,
};
use serde::{Deserialize, Serialize};

use crate::{ETCH_CANISTER_ID, ICP_LEDGER_CANISTER_ID};

#[derive(CandidType, Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct LogoParams {
    pub content_type: String,
    pub content_base64: String,
}

#[derive(Default, CandidType, Serialize, Deserialize, Debug, PartialEq, Copy, Clone, Eq)]
pub struct OrdinalsTerms {
    pub amount: u128,
    pub cap: u128,
    pub height: (Option<u64>, Option<u64>),
    pub offset: (Option<u64>, Option<u64>),
}

#[derive(CandidType, Clone, Default, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct EtchingArgs {
    pub rune_name: String,
    pub divisibility: Option<u8>,
    pub premine: Option<u128>,
    pub logo: Option<LogoParams>,
    pub symbol: Option<String>,
    pub terms: Option<OrdinalsTerms>,
    pub premine_receiver: String,
    pub turbo: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, Eq, PartialEq, CandidType)]
pub struct SendEtchingInfo {
    pub etching_args: EtchingArgs,
    pub commit_txid: String,
    pub reveal_txid: String,
    pub err_info: String,
    pub time_at: u64,
    pub script_out_address: String,
    pub status: EtchingStatus,
    pub receiver: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Eq, PartialEq, CandidType)]
pub enum EtchingStatus {
    Initial,
    SendCommitSuccess,
    SendCommitFailed,
    SendRevealSuccess,
    SendRevealFailed,
    Final,
}

pub async fn get_etching_request(commit_tx: String)-> Option<SendEtchingInfo> {
    let etching_principal = Principal::from_text(ETCH_CANISTER_ID).ok()?;
    let (info,): (Option<SendEtchingInfo>,) = ic_cdk::api::call::call(
        etching_principal,
        "get_etching_request",
        (commit_tx,),
    )
    .await
    .ok()?;
    info
}

pub async fn etching(args: EtchingArgs) -> Result<String, String> {
    let client = ICRC1Client {
        runtime: CdkRuntime,
        ledger_canister_id: Principal::from_text(ICP_LEDGER_CANISTER_ID).unwrap(),
    };

    let etching_principal = Principal::from_text(ETCH_CANISTER_ID).map_err(|e| format!("Invalid etching canister ID: {}", e))?;

    client
        .approve(ApproveArgs {
            from_subaccount: None,
            spender: Account {
                owner: etching_principal,
                subaccount: None,
            },
            amount: Nat::from(100_000_000_u64),
            expected_allowance: None,
            expires_at: None,
            fee: None,
            memo: None,
            created_at_time: None,
        })
        .await
        .map_err(|e| format!("Failed to approve etching canister: {:?}", e))
        .map_err(|e| e)?
        .map_err(|e| format!("Failed to approve etching canister: {:?}", e))?;

    let r: (Result<String, String>,) =
        ic_cdk::api::call::call(etching_principal, "etching", (args,))
            .await
            .expect("Failed to call etch canister");
    r.0
}
