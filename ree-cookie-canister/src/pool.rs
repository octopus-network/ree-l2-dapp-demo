use ree_types::{bitcoin::{key::TweakedPublicKey, Address}, exchange_interfaces::PoolInfo};
use std::{cmp::max, collections::BTreeMap};

use crate::{utils::request_address, *};

#[derive(Deserialize, Serialize, Clone, Debug, CandidType)]
pub struct Pool {
    pub key_derivation_path: String,
    pub name: String,
    pub pubkey: Pubkey,
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
        address: AddressStr,
        attributes: String,
        utxo: Utxo
    )->Self {
        Self {
            key_derivation_path: key_path,
            name: pool_name,
            pubkey,
            address,
            pending_transaction_counts: 0,
            nonce: 0,
            states: vec![
                PoolState {
                    id: utxo.txid,
                    nonce: 0,
                    utxo,
                    user_action: UserAction::Init,
                }
            ],
            attributes,
        }

    }

    pub fn commit(&mut self, new_state: PoolState) {
        self.nonce = new_state.nonce;
        self.states.push(new_state);
        self.pending_transaction_counts += 1;
    }

     pub(crate) fn finalize(&mut self, txid: Txid) -> Result<()> {
        let tx_count_before = self.states.len();
        let idx = self
            .states
            .iter()
            .position(|s| s.id == txid)
            .ok_or(ExchangeError::InvalidState("txid not found".to_string()))?;

        if idx == 0 {
            return Ok(());
        }

        self.states.rotate_left(idx);
        self.states.truncate(self.states.len() - idx);
        let tx_count_after = self.states.len();
        self.pending_transaction_counts -= max(self.pending_transaction_counts, tx_count_after - tx_count_before);

        Ok(())
    }

    pub fn rollback(&mut self, txid: Txid) -> Result<Vec<PoolState>> {
        let idx = self
            .states
            .iter()
            .position(|s| s.id == txid)
            .ok_or(ExchangeError::InvalidState("txid not found".to_string()))?;

        if idx == 0 {
            return Ok(vec![]);
        }

        let mut rollback_states = vec![];
        while self.states.len() > idx {
            let state = self.states.pop().ok_or(ExchangeError::InvalidState("No state to pop".to_string()))?;
            rollback_states.push(state);
        }

        Ok(rollback_states)
    }

    pub fn last_state(&self) -> Option<PoolState> {
        self.states
            .last()
            .cloned()
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
            key_derivation_path: vec![pool.key_derivation_path.into_bytes()],
            name: pool.name,
            address: pool.address,
            nonce: pool.nonce,
            coin_reserved: last_state
                .utxo
                .coins.iter().map(|c| c.clone()).collect(),
            btc_reserved: last_state.btc_balance(),
            utxos: vec![last_state.utxo],
            attributes: pool.attributes,
        })
    }
}

#[derive(Deserialize, Serialize, Clone, Debug, CandidType)]
pub struct PoolState {
    pub id: Txid,
    pub nonce: u64,
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
    pub btc_pools: BTreeMap<AddressStr, Pool>,
    pub rune_pool: Option<Pool>,
    pub path_prefix: String,
}

impl PoolManager {
    pub const MAX_PENDING_TRANSACTION_COUNTS: usize = 25;

    pub fn new(
        path_prefix: String,    
    )->Self{
        PoolManager { 
            btc_pools: BTreeMap::new(), 
            rune_pool: None,
            path_prefix, 
        }
    }

    pub async fn try_new(
        rune_id: String,
        rune_name: String,
        rune_utxo: Utxo
    )->Result<Self>{

        let (pubkey, _tweaked_pubkey, address) = 
        request_address(rune_id.clone()).await?;

        Ok(PoolManager { 
            btc_pools: BTreeMap::new(), 
            rune_pool: Some(Pool::init(
                rune_name, 
                rune_id.clone(), 
                pubkey, 
                address.to_string(), 
                "".to_string(), 
                rune_utxo)
            ),
            path_prefix: rune_id, 
        })
    }

    pub fn get_usable_deposit_pool(&self) -> Option<&Pool> {
        self.btc_pools
            .values()
            .find(|pool| pool.pending_transaction_counts < Self::MAX_PENDING_TRANSACTION_COUNTS)
    }

    pub async fn next_new_btc_pool_address(&self) -> Result<(Pubkey, TweakedPublicKey, Address, String)> {
        let next_pool_key_path = format!("{}_{}", self.path_prefix, self.btc_pools.len() );
        let (pubkey, tweaked_pubkey, address) = request_address(next_pool_key_path.clone()).await?;
        Ok((pubkey, tweaked_pubkey, address, next_pool_key_path))
    }

    pub fn add_new_btc_pool(
        &mut self,
        pk: Pubkey,
        addr: Address,
        path: String,
        utxo: Utxo,
    ) -> Result<()> {
        // let (pk, _tpk, addr, next_path) = self.next_new_btc_pool_address().await?;
        self.btc_pools.insert(
            addr.to_string(),
            Pool::init(
                path.clone(),
                path,
                pk,
                addr.to_string(),
                "".to_string(),
                utxo,
            ),
        );

        Ok(())
        
    }

    pub fn get_rune_pool_path(&self) -> String {
        return format!("{}", self.path_prefix);
    }

    pub async fn get_rune_pool_address(&self) -> Result<AddressStr> {
        if let Some(rune_pool) = &self.rune_pool {
            return Ok(rune_pool.address.clone());
        } else {
            let path = self.get_rune_pool_path();
            let (_pubkey, _tweaked_pubkey, address) = request_address(path).await?;
            return Ok(address.to_string())
        }
    }

    pub fn add_rune_pool(
        &mut self,
        pk: Pubkey,
        addr: Address,
        utxo: Utxo,
    ) {

        let key_path = self.get_rune_pool_path();
        // let (_pubkey, _tweaked_pubkey, address) = request_address(key_path).await?;

        self.rune_pool = Some(Pool::init(
            self.path_prefix.clone(), 
            key_path, 
            pk, 
            addr.to_string(), 
            "".to_string(), 
            utxo
        )) ;
    }
}
