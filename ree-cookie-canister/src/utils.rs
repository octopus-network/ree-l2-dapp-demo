use ic_cdk::api::management_canister::bitcoin::{BitcoinNetwork, Satoshi};
use ree_types::bitcoin::{Address, key::{Secp256k1, TapTweak, TweakedPublicKey}, Network};

use crate::{external::management::request_schnorr_key, *};

pub(crate) fn tweak_pubkey_with_empty(untweaked: Pubkey) -> TweakedPublicKey {
    let secp = Secp256k1::new();
    let (tweaked, _) = untweaked.to_x_only_public_key().tap_tweak(&secp, None);
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

#[test]
pub fn test_tweak_pubkey() {
    let mock_raw_pubkey: Vec<u8> = vec![
        0x02, 0x79, 0xBE, 0x66, 0x7E, 0xF9, 0xDC, 0xBB, 0xAC, 0x55, 0xA0, 0x62, 0x95, 0xCE, 0x87,
        0x0B, 0x07, 0x02, 0x9B, 0xFC, 0xDB, 0x2D, 0xCE, 0x28, 0xD9, 0x59, 0xF2, 0x81, 0x5B, 0x16,
        0xF8, 0x17, 0x98,
    ];

    let pubkey = Pubkey::from_raw(mock_raw_pubkey).unwrap();
    let tweaked_pubkey = tweak_pubkey_with_empty(pubkey.clone());
    let addr = ree_types::bitcoin::Address::p2tr_tweaked(
        tweaked_pubkey,
        ree_types::bitcoin::Network::Bitcoin,
    );
    dbg!(&addr);
}

pub fn get_max_recoverable_reorg_depth(network: BitcoinNetwork) -> u32 {
    match network {
        BitcoinNetwork::Regtest => 6,
        BitcoinNetwork::Testnet => 64,
        BitcoinNetwork::Mainnet => 6,
    }
}

// pub fn calculate_premine_rune_amount() -> u128 {
//     read_state(|s| s.game.claimed_cookies * 120 / 100)
// }

pub async fn request_address(key_path: String)->Result<(Pubkey, TweakedPublicKey, Address)> {
    let untweaked_pubkey = request_schnorr_key("key_1", key_path.into_bytes()).await?;
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

// pub(crate) fn detect_reorg(network: BitcoinNetwork, new_block: NewBlockInfo) -> Result<()> {
//     ic_cdk::println!(
//         "Processing new block - height: {}, hash: {}, timestamp: {}, confirmed_txs: {:?}",
//         new_block.block_height,
//         new_block.block_hash,
//         new_block.block_timestamp,
//         new_block.confirmed_txids
//     );
//     let current_block =
//         BLOCKS.with_borrow(|m| m.iter().rev().next().map(|(_height, block)| block));
//     match current_block {
//         None => {
//             ic_cdk::println!("No blocks found in exchange - this is expected for new exchanges");
//             return Ok(());
//         }
//         Some(current_block) => {
//             ic_cdk::println!(
//                 "Current block - height: {:?}, hash: {:?}, timestamp: {:?}",
//                 current_block.block_height,
//                 current_block.block_hash,
//                 current_block.block_timestamp
//             );
//             if new_block.block_height == current_block.block_height + 1 {
//                 ic_cdk::println!("New block is the next block in the chain");
//                 return Ok(());
//             } else if new_block.block_height > current_block.block_height + 1 {
//                 ic_cdk::println!("New block is more than one block ahead of the current block");
//                 return Err(ExchangeError::Unrecoverable);
//             } else {
//                 let reorg_depth = current_block.block_height - new_block.block_height + 1;
//                 ic_cdk::println!("Detected reorg - depth: {}", reorg_depth,);
//                 if reorg_depth > get_max_recoverable_reorg_depth(network) {
//                     ic_cdk::println!("Reorg depth is greater than the max recoverable reorg depth");
//                     return Err(ExchangeError::Unrecoverable);
//                 }
//                 let target_block =
//                     BLOCKS.with_borrow(|m| m.get(&new_block.block_height).unwrap());
//                 if target_block.block_hash == new_block.block_hash {
//                     ic_cdk::println!("New block is a duplicate block");
//                     return Err(ExchangeError::DuplicateBlock(
//                         new_block.block_height,
//                         new_block.block_hash,
//                     ));
//                 }
//                 return Err(ExchangeError::Recoverable(current_block.block_height, reorg_depth));
//             }
//         }
//     }
// }
