import { List, Skeleton } from 'antd'
import type {
  ExchangeCfg,
  PoolBasic
} from 'canister/rich_ordi/service.did'
import { useExchangeConfig } from 'hooks/useExchange'
import { usePoolInfo, usePoolList } from 'hooks/usePool'
import { usePoolNfts } from 'hooks/usePoolNfts'
import { useRunesInfo } from 'hooks/useRunes'
import { useSetAtom } from 'jotai'
import Marquee from 'react-fast-marquee'
import { parsePoolName } from 'utils/common'
import { setPoolInfoThenOpenLockNftListModalAtom } from './LockNftListModal'
import NFTCard from './NftCard'
import Link from 'antd/es/typography/Link'

export function PoolList() {
  const { data: poolList, isLoading, error } = usePoolList()
  const {
    data: exchangeConfig,
    isLoading: isLoadingConfig,
    error: getConfigError
  } = useExchangeConfig()

  if (isLoading) {
    return <Skeleton />
  }

  if (error) {
    return <div>{`get pool list error:${error.message}`}</div>
  }

  if (getConfigError) {
    return <div>{`get exchange config error:${getConfigError.message}`}</div>
  }

  if (isLoadingConfig) {
    return <Skeleton />
  }

  console.log('PoolList', { poolList })

  return (
    <div id='pool-list'>
      <List
        className='mx-auto w-full md:w-4/5 lg:w-4/5'
        itemLayout='horizontal'
        dataSource={poolList}
        renderItem={pool => (
          // <List.Item key={pool.address}>
          <PoolItem
            poolBasic={pool}
            exchangeConfig={exchangeConfig!}
          />
          // </List.Item>
        )}
      />
    </div>
  )
}

function PoolItem({
  poolBasic,
  exchangeConfig,
  // setStakeModalOpen
}: {
  poolBasic: PoolBasic
  exchangeConfig: ExchangeCfg
  // setStakeModalOpen: (v: boolean) => void
}) {
  const setPoolInfoThenOpenLockNftListModal = useSetAtom(setPoolInfoThenOpenLockNftListModalAtom)
  const { data: poolNfts, isLoading, error } = usePoolNfts(poolBasic.address)
  const { runeId } = parsePoolName(poolBasic.name)
  const {
    data: runeInfo,
    isLoading: isLoadingRuneInfo,
    error: queryRuneInfoError
  } = useRunesInfo(runeId)
  const { data: poolInfo } = usePoolInfo(poolBasic.address)

  if (isLoading || isLoadingRuneInfo || !poolInfo) {
    return <Skeleton />
  }

  if (error) {
    return <div className='text-red-500'> get pool nfts error: {error.message}</div>
  }

  if (queryRuneInfoError) {
    return <div className='text-red-500'> query rune info error: {queryRuneInfoError.message}</div>
  }

  // if (poolNfts === undefined || poolNfts.length === 0) {
  //   return <div className='text-red-500'>Pool nfts not found</div>
  // }

  return (
    <div className='m-4 flex w-full flex-col'>
      <div className='flex items-center justify-between '>
        {/* <div className='m-4 inline-block rounded-lg bg-white/10 px-6 py-4 backdrop-blur-sm'> */}
        <div className='flex items-center'>
          <h1 className='text-4xl font-extrabold text-white drop-shadow-[0_0_10px_rgba(165,180,252,0.8)]'>
            {
              JSON.parse(poolInfo.attributes).collection_name
            }
          </h1>
          {/* </div> */}
          <button
            onClick={() => setPoolInfoThenOpenLockNftListModal(poolInfo)}
            className='mx-4 mt-2 py-1 transform rounded-lg px-3 text-lg bg-orange-500 font-bold text-black shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl'
          >
            Lock
          </button>
          <p className='text-xl mt-2 font-bold text-orange-400'>
            To Get {exchangeConfig.rune_offering.toString()}
            {runeInfo?.symbol} {runeInfo?.spacedRune}
          </p>
        </div>

        <Link href="/pools" >
          <p className="inline-flex items-center text-orange-600 hover:text-orange-800 transition-colors duration-300">
            {'See More >>'}
          </p>
        </Link>

      </div>
      <Marquee pauseOnHover loop={0} speed={150}>
        {(poolNfts ?? [])
          .filter(e => Object.keys(e.status)[0] !== 'Reclaimed')
          .map(nft => (
            <div key={nft.deposit_id} className='w-xs m-8'>
              <NFTCard
                className='group relative w-[300px] max-w-sm overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl transition-all duration-300 hover:border-blue-500/50 hover:shadow-2xl'
                nft={nft}
                exchangeConfig={exchangeConfig}
                collectionName={JSON.parse(poolInfo.attributes)?.collection_name}
                poolBasic={poolBasic}
              />
            </div>
          ))}
      </Marquee>
    </div>
  )
}
