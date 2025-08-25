pub(crate) use std::cell::RefCell;

use candid::Principal;
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    Cell, DefaultMemoryImpl, StableBTreeMap,
};
use ree_exchange_sdk::types::{NewBlockInfo, TxRecord, Txid};
// use ree_exchange_sdk::{exchange_interfaces::NewBlockInfo, TxRecord, Txid};

use crate::{game::{game::Game, gamer::Gamer}, state::ExchangeState, AddressStr, GameId};

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

const STATE_MEMORY_ID: MemoryId = MemoryId::new(1);
const GAME_POOLS_MEMORY_ID: MemoryId = MemoryId::new(2);
const ADDRESS_PRINCIPAL_MAP_MEMORY_ID: MemoryId = MemoryId::new(3);

thread_local! {

    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
    RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    pub static STATE: RefCell<Cell<ExchangeState, Memory>> = RefCell::new(
        Cell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(STATE_MEMORY_ID)),
            ExchangeState::default()
        )
        // .expect("state memory not initialized")
    );

    pub static GAME_POOLS: RefCell<StableBTreeMap<GameId, AddressStr, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(GAME_POOLS_MEMORY_ID)),
        )
    );

    pub static ADDRESS_PRINCIPLE_MAP: RefCell<StableBTreeMap<Principal, AddressStr, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(ADDRESS_PRINCIPAL_MAP_MEMORY_ID)),
        )
    );

}

pub fn get_state() -> ExchangeState {
    STATE.with(|c| c.borrow().get().clone())
}

pub fn set_state(state: ExchangeState) {
    STATE.with(|c| {
        c.borrow_mut()
            .set(state)
            // .expect("Failed to set STATE.")
    });
}

pub fn mutate_state<F, R>(f: F) -> R
where
    F: FnOnce(&mut ExchangeState) -> R,
{
    let mut state = get_state();
    let r = f(&mut state);
    set_state(state);
    r
}

pub fn read_state<F, R>(f: F) -> R
where
    F: FnOnce(&ExchangeState) -> R,
{
    let state = get_state();
    let r = f(&state);
    r
}
