use candid::{CandidType, Deserialize};
use serde::Serialize;

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
pub struct BlockBasic {
    pub block_height: u32,
    pub block_hash: String,
}

#[derive(CandidType, serde::Deserialize)]
pub enum DeployArgs {
    Init,
    Upgrade,
}

#[derive(CandidType, Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct NewBlockDetectedArgs {
    pub block_height: u32,
    pub block_hash: String,
    pub block_timestamp: u64,
    pub tx_ids: Vec<String>,
}

#[derive(CandidType, Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct SetTxFeePerVbyteArgs {
    pub low: u64,
    pub medium: u64,
    pub high: u64,
}

#[derive(CandidType, Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub enum GetFailedInvokeLogArgs {
    All,
    ByAddress(String),
    ByTxid(String),
}

#[derive(CandidType, Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub enum TxOutputType {
    P2WPKH,
    P2TR,
    OpReturn(usize),
}

#[derive(CandidType, Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct EstimateMinTxFeeArgs {
    pub input_types: Vec<TxOutputType>,
    pub output_types: Vec<TxOutputType>,
    pub pool_address: String,
}

#[derive(CandidType, Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct SaveIncludedBlockForTxArgs {
    pub txid: String,
    pub block: BlockBasic,
    pub timestamp: u64,
}
