use ree_types::{bitcoin::{key::TweakedPublicKey, Address}, exchange_interfaces::PoolInfo};
use std::collections::{BTreeMap, HashMap, HashSet};

use crate::{utils::request_address, *};

#[derive(Deserialize, Serialize, Clone, Debug, CandidType)]
pub struct Pool {
    pub key_path: String,
    pub name: String,
    pub pubkey: Pubkey,
    // pub tweaked: Pubkey,
    pub address: AddressStr,

    pub pending_transaction_counts: usize,
    pub nonce: u64,

    pub states: Vec<PoolState>,

    pub attributes: String,
}

impl Pool {
    pub fn init(
        pool_name: String,
        key_path: String,
        pubkey: Pubkey,
        // tweaked_key: Pubkey,
        address: AddressStr,
        attributes: String,
        utxo: Utxo
    )->Self {
        Self {
            key_path,
            name: pool_name,
            pubkey,
            // tweaked: tweaked_key,
            address,
            pending_transaction_counts: 0,
            nonce: 0,
            states: vec![
                PoolState {
                    id: utxo.txid,
                    utxo,
                    user_action: UserAction::Init,
                }
            ],
            attributes,
        }

    }
}

impl TryFrom<Pool> for PoolInfo {

    type Error = ExchangeError;
    fn try_from(pool: Pool) -> std::result::Result<Self, ExchangeError> {
        let last_state = pool
            .states
            .last()
            .cloned()
            .ok_or(ExchangeError::LastStateNotFound)?;
        Ok(PoolInfo {
            key: pool.pubkey,
            key_derivation_path: vec![pool.key_path.into_bytes()],
            name: pool.name,
            address: pool.address,
            nonce: pool.nonce,
            coin_reserved: last_state
                .utxo
                .maybe_rune
                .map(|e| vec![e])
                .unwrap_or(vec![]),
            btc_reserved: last_state.btc_balance(),
            utxos: vec![last_state.utxo],
            attributes: pool.attributes,
        })
    }
}

#[derive(Deserialize, Serialize, Clone, Debug, CandidType)]
pub struct PoolState {
    pub id: Txid,
    // pub nonce: u64,
    pub utxo: Utxo,
    pub user_action: UserAction,
}

impl PoolState {
    pub fn btc_balance(&self) -> u64 {
        self.utxo.sats
    }
}

#[derive(Deserialize, Serialize, Clone, Debug, CandidType)]
pub enum UserAction {
    Init,
    AddLiquidity,
    Register(AddressStr),
    Withdraw(AddressStr),
}

#[derive(Deserialize, Serialize, Clone, Debug, CandidType)]
pub struct PoolManager {
    pub pools: BTreeMap<AddressStr, Pool>,
    pub rune_pool: Option<Pool>,
    pub path_prefix: String,
}

impl PoolManager {
    pub const MAX_PENDING_TRANSACTION_COUNTS: usize = 25;

    pub fn new(path_prefix: String)->Self{
        PoolManager { 
            pools: BTreeMap::new(), 
            rune_pool: Option::None,
            path_prefix 
        }
    }

    pub fn get_usable_deposit_pool(&self) -> Option<&Pool> {
        self.pools
            .values()
            .find(|pool| pool.pending_transaction_counts < Self::MAX_PENDING_TRANSACTION_COUNTS)
    }

    pub async fn next_new_pool_address(&self) -> Result<(Pubkey, TweakedPublicKey, Address)> {
        let next_pool_key_path = format!("{}_{}", self.path_prefix, self.pools.len() + 1);
        let (pubkey, tweaked_pubkey, address) = request_address(next_pool_key_path).await?;
        Ok((pubkey, tweaked_pubkey, address))
    }

    pub fn get_rune_pool_path(&self) -> String {
        return format!("{}_rune", self.path_prefix);
    }

    // pub async fn create_new_pool(
    //     &mut self,
    //     pool_address: AddressStr,
    //     utxo: Utxo
    // ) -> Result<String> {
    //     let (pubkey, tweaked_pubkey, address) = self.next_new_pool_address().await?;

    // }

    pub async fn get_rune_pool_address(&self) -> Result<AddressStr> {
        if let Some(rune_pool) = &self.rune_pool {
            return Ok(rune_pool.address.clone());
        } else {
            let (_pubkey, _tweaked_pubkey, address) =
                request_address(self.get_rune_pool_path()).await?;
            Ok(address.to_string())
        }
    }
}
