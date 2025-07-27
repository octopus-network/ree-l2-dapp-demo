import { Typography } from 'antd'
import { getInscriptionCode } from 'api/magicEden'
import { NftStatusName } from 'canister/rich_ordi/actor'
import type {
  ExchangeCfg,
  GetNftsResp,
  PoolBasic
} from 'canister/rich_ordi/service.did'
import { useEffect, useState } from 'react'
import Countdown from 'react-countdown'
import { parsePoolName } from 'utils'
import { InscriptionImg } from './InscriptionImg'
import { AuctionStatus } from './PoolNftList'
import moment from 'moment'
import { Eye } from 'react-feather'

const { Link } = Typography

export default function NFTCard({
  nft,
  exchangeConfig,
  poolBasic,
  className,
  collectionName
}: {
  nft: GetNftsResp
  exchangeConfig: ExchangeCfg
  poolBasic: PoolBasic
  collectionName: string
  className?: string,
}) {
  // const imgSource = inscriptionImgUrlFromUnisat(nft.nft.inscription_id)
  const nftTitle = 'NFT Title'
  const [nftCode, setNftCode] = useState<number>(0)
  const nftStatus: NftStatusName = Object.keys(nft.status)[0] as NftStatusName
  const isSold = nftStatus === 'EndAuction' || nftStatus === 'Settled'
  // const inscriptionLink = nft.nft.inscription_id
  const currentPrice = nft.nft.auction[0]?.bidders.reduce(
    (accumulator, bidder) =>
      accumulator > bidder[1].amount ? accumulator : bidder[1].amount,
    exchangeConfig.starting_bid
  )

  useEffect(() => {
    getInscriptionCode(nft.nft.inscription_id)
      .then(code => {
        setNftCode(code)
      })
  }, [])

  return (
    <div
      // className='group relative w-full max-w-sm overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl transition-all duration-300 hover:border-blue-500/50 hover:shadow-2xl'
      className={className}
    >
      {/* NFT Card */}
      <div className='relative aspect-square w-full overflow-hidden'>
        {/* NFT Img */}
        {/* <img
          src={imgSource}
          alt={nftTitle}
          className={`h-full w-full object-cover transition-all duration-500 ${isSold ? 'opacity-80 grayscale' : 'group-hover:scale-105'}`}
        /> */}
        <InscriptionImg
          inscriptionId={nft.nft.inscription_id}
          className={`h-full w-full object-cover transition-all duration-500 ${isSold ? 'opacity-80 grayscale' : 'group-hover:scale-105'}`}
        />

        {/* {isSold ? (
          <div className='absolute inset-0 flex items-center justify-center bg-gradient-to-t from-gray-900/80 to-transparent'>
            <div className='-rotate-12 transform rounded-full border-2 border-white/30 bg-red-600/70 px-6 py-2 text-xl font-bold text-white shadow-lg backdrop-blur-sm'>
              SOLD OUT
            </div>
          </div>
        ) : null} */}

        {isSold ? (
          <div className='absolute mt-32 inset-0 flex items-center justify-center bg-gradient-to-t from-gray-900/80 to-transparent'>
            <div className='transform rounded-sm bg-orange-600 px-6 py-2 text-xl font-bold text-black shadow-lg backdrop-blur-sm'>
              Redeemed
            </div>
          </div>
        ) : null}

        {/* 倒计时标记 - 仅在拍卖活跃时显示 */}
        {nftStatus === 'UnderAuction' && (
          <div className='absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-2 backdrop-blur-sm'>
            <div className='flex items-center justify-between'>
              <div className='animate-pulse rounded-full bg-green-900/30 px-1 py-1 text-sm font-medium text-green-400'>
                Live Auction
              </div>

              <div className='flex items-center'>
                <span className='text-sm font-medium text-orange-300'>
                  Ends in:
                </span>
                <Countdown
                  daysInHours
                  date={Number(
                    nft.nft.auction[0]!.end_time / BigInt(1_000_000)
                  )}
                  className='font-mono rounded-md bg-gray-900/80 px-1 py-1 text-sm font-bold text-amber-400'
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NFT Info */}
      <div className='p-4'>
        <div className='flex items-start justify-between'>
          <div>
            <h3 className='mb-1 truncate text-lg font-bold text-white'>
              {collectionName}#{nftCode}
            </h3>
            <p className='text-gray-500 text-xs'>
              Lock Time: {
                moment(Number(nft.nft.deposit_time / BigInt(1_000_000))).format('YYYY-MM-DD HH:mm')
              }
            </p>
            <Link
              href={`${import.meta.env.VITE_UNISAT_BASE_URL}/inscription/${nft.nft.inscription_id}`}
              target='_blank'
            >
              <p className='mt-1 text-orange-500 flex items-center hover:text-blue-500'>
                <Eye className='mx-1' size={15}/> View Inscription
              </p>
            </Link>
          
          </div>
          {/* <div className='rounded-sm bg-orange-900/30 px-3 py-1 text-sm font-medium text-orange-400'>
            #{nftCode}
          </div> */}
          {/* <h3 className="text-lg font-bold text-white mb-1 truncate">{nftTitle}</h3> */}
        </div>

        <div className='mb-2 '>
          <div className='inset-0 flex items-center'>
            <div className='w-full border-t border-gray-700' />
          </div>
        </div>

        <AuctionStatus
          nft={nft}
          exchangeConfig={exchangeConfig}
          poolBasic={poolBasic}
        />
      </div>
    </div>
  )
}
