use ic_cdk::api::management_canister::bitcoin::{BitcoinNetwork, Satoshi};
use ree_exchange_sdk::types::bitcoin::{key::{Secp256k1, TapTweak, TweakedPublicKey}, Address, Network};
use errors::*;
use crate::{external::management::request_schnorr_key, *};

pub(crate) fn tweak_pubkey_with_empty(untweaked: Pubkey) -> TweakedPublicKey {
    let secp = Secp256k1::new();
    let (tweaked, _) = untweaked
    .to_x_only_public_key()
    .tap_tweak(&secp,None);
    tweaked
}

pub(crate) fn get_chain_second_timestamp() -> SecondTimestamp {
    ic_cdk::api::time() / 1000_000_000
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct RegisterInfo {
    pub untweaked_key: Pubkey,
    pub tweaked_key: Pubkey,
    pub address: String,
    pub utxo: Utxo,
    pub register_fee: Satoshi,
    pub nonce: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct AddLiquidityInfo {
    pub btc_amount_for_add_liquidity: Satoshi,
    pub rune_amount_for_add_liquidity: u128,
}

pub fn get_max_recoverable_reorg_depth(network: BitcoinNetwork) -> u32 {
    match network {
        BitcoinNetwork::Regtest => 6,
        BitcoinNetwork::Testnet => 64,
        BitcoinNetwork::Mainnet => 6,
    }
}

pub async fn request_address(key_path: String)->Result<(Pubkey, TweakedPublicKey, Address)> {
    let untweaked_pubkey = request_schnorr_key("test_key_1", key_path.into_bytes()).await?;
    let tweaked_pubkey = tweak_pubkey_with_empty(untweaked_pubkey.clone());
    cfg_if::cfg_if! {
    if #[cfg(feature = "testnet")] {
        let address = Address::p2tr_tweaked(tweaked_pubkey, Network::Testnet4);
    } else {
        let address = Address::p2tr_tweaked(tweaked_pubkey, Network::Bitcoin);
    }
    }

    return Ok((untweaked_pubkey, tweaked_pubkey, address))

}