pub(crate) use std::cell::RefCell;

use candid::Principal;
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    Cell, DefaultMemoryImpl, StableBTreeMap,
};
use ree_types::{exchange_interfaces::NewBlockInfo, TxRecord, Txid};

use crate::{game::{game::Game, gamer::Gamer}, state::ExchangeState, AddressStr};

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

const STATE_MEMORY_ID: MemoryId = MemoryId::new(1);
const GAMERS_MEMORY_ID: MemoryId = MemoryId::new(2);
const ADDRESS_PRINCIPAL_MAP_MEMORY_ID: MemoryId = MemoryId::new(3);
const BLOCKS_MEMORY_ID: MemoryId = MemoryId::new(4);
const TX_RECORDS_MEMORY_ID: MemoryId = MemoryId::new(5);

thread_local! {

    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
    RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    pub static STATE: RefCell<Cell<Option<ExchangeState>, Memory>> = RefCell::new(
        Cell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(STATE_MEMORY_ID)),
            Option::None
        ).expect("state memory not initialized")
    );

    pub static GAMER: RefCell<StableBTreeMap<AddressStr, Gamer, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(GAMERS_MEMORY_ID)),
        )
    );

    pub static GAMES: RefCell<StableBTreeMap<AddressStr, Game, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(GAMERS_MEMORY_ID)),
        )
    );
    // pub static GAMER: RefCell<StableBTreeMap<AddressStr, Gamer, Memory>> = RefCell::new(
    //     StableBTreeMap::init(
    //         MEMORY_MANAGER.with(|m| m.borrow().get(GAMERS_MEMORY_ID)),
    //     )
    // );

    pub static ADDRESS_PRINCIPLE_MAP: RefCell<StableBTreeMap<Principal, AddressStr, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(ADDRESS_PRINCIPAL_MAP_MEMORY_ID)),
        )
    );

    pub static BLOCKS: RefCell<StableBTreeMap<u32, NewBlockInfo, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(BLOCKS_MEMORY_ID)),
        )
    );

    pub static TX_RECORDS: RefCell<StableBTreeMap<(Txid, bool), TxRecord, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(TX_RECORDS_MEMORY_ID)),
        )
    );

}

pub fn init_gamer() -> StableBTreeMap<AddressStr, Gamer, Memory> {
    // StableBTreeMap::init(with_memory_manager(|m| m.get(GAMERS_MEMORY_ID)))
    StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(GAMERS_MEMORY_ID)))
}

// pub fn init_address_principal_map() -> StableBTreeMap<Principal, Address, Memory> {
//     // StableBTreeMap::init(with_memory_manager(|m| m.get(ADDRESS_PRINCIPAL_MAP_MEMORY_ID)))
//     StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(ADDRESS_PRINCIPAL_MAP_MEMORY_ID)))
// }

pub fn get_state() -> ExchangeState {
    STATE.with(|c| c.borrow().get().clone().unwrap())
}

pub fn set_state(state: ExchangeState) {
    STATE.with(|c| {
        c.borrow_mut()
            .set(Some(state))
            .expect("Failed to set SETTINGS.")
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
