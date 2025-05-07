use crate::{memory::read_state, *};
use ic_cdk::api::call::CallResult;

#[derive(CandidType, Clone, Default, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct EtchingArgs {
    pub rune_name: String,
    pub divisibility: Option<u8>,
    pub premine: Option<u128>,
    pub logo: Option<LogoParams>,
    pub symbol: Option<String>,
    pub terms: Option<OrdinalsTerms>,
    pub turbo: bool,
}

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

pub async fn etching_v3(
    etching_arg: EtchingArgs,
    premine_addr: String,
) -> CallResult<(std::result::Result<String, String>,)> {
    let btc_customs_principle = read_state(|s| s.btc_customs_principle.clone());
    ic_cdk::call(
        btc_customs_principle,
        "etching_v3",
        (etching_arg, premine_addr),
    )
    .await
}
