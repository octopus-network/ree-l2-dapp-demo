import { OKX, useLaserEyes } from '@omnisat/lasereyes'
import { Checkbox, CheckboxProps, List, Select, SelectProps, Skeleton, Spin, notification } from 'antd'
import { convertUnisatUtxo, inscriptionImgUrlFromUnisat } from 'api/unisat'
import type {
  ExchangeCfg,
  GetNftsResp,
  PoolBasic
} from 'canister/rich_ordi/service.did'
import { useExchangeConfig } from 'hooks/useExchange'
import { useFeeRate } from 'hooks/useOrchestrator'
import { usePoolInfo } from 'hooks/usePool'

import { ocActor } from 'canister/orchestrator/actor'
import { OrchestratorStatus } from 'canister/orchestrator/service.did'
import { usePoolNfts } from 'hooks/usePoolNfts'
import { useLoginUserBtcUtxo, useLoginUserRuneUtxo } from 'hooks/useUtxo'
import { useAtom, useSetAtom } from 'jotai'
import { useAddIntentions } from 'layout/sidebar/IntentionList'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { connectWalletModalOpenAtom } from 'store/connect-wallet-modal'
import { useAddSpentUtxos } from 'store/spent-utxos'
import { convertPoolUtxo, getErrorMessage, parsePoolName } from 'utils'
import { claimPsbt } from 'utils/tx-helper/claim'
import { reclaimPsbt } from 'utils/tx-helper/reclaim'
import { settlePsbt } from 'utils/tx-helper/settle'
import { shortenAddress } from './AccountButton'
import { setNftAndPoolThenOpenAuctionModalAtom } from './AuctionModal'
import {
  invokeErrorMessageAtom,
  invokeModalOpenAtom,
  invokeModalTitleAtom,
  invokeStepAtom,
  invokeTxidAtom
} from './InvokeModal'
import NFTCard from './NftCard'
import { useRunesInfo } from 'hooks/useRunes'
import { setPoolInfoThenOpenLockNftListModalAtom } from './LockNftListModal'
import { NftStatusName } from 'canister/rich_ordi/actor'

export function PoolNftList({
  poolBasic
}: {
  // poolInfo: PoolInfo
  poolBasic: PoolBasic
}) {
  const { paymentAddress } = useLaserEyes()
  const { data: poolNfts, isLoading, error } = usePoolNfts(poolBasic.address)
  const {
    data: exchangeConfig,
    isLoading: isLoadingConfig,
    error: getConfigError
  } = useExchangeConfig()
  const { runeId } = parsePoolName(poolBasic.name)
  const {
    data: runeInfo,
    isLoading: isLoadingRuneInfo,
    error: queryRuneInfoError
  } = useRunesInfo(runeId)
  const setPoolInfoThenOpenLockNftListModal = useSetAtom(setPoolInfoThenOpenLockNftListModalAtom)
  const { data: poolInfo } = usePoolInfo(poolBasic.address)

  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'deposit_time' | 'auction_end_time' | 'auction_current_price'>('deposit_time')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [onlySelf, setOnlySelf] = useState<boolean>(false)

  const filterSortNfts = useMemo(() => {
    let handledNfts = (poolNfts ?? [])
      .filter(e => Object.keys(e.status)[0] !== 'Reclaimed')
      .filter(e => {
        // filter my inscriptions, including my locked and my auctioned
        if (!onlySelf) {
          return true
        }
        return e.nft.depositor === paymentAddress ||
          e.nft.auction[0]?.bidders.some(bidder => bidder[1].address === paymentAddress)
      })
      .filter(nft => {
        const nftStatus: NftStatusName = Object.keys(nft.status)[0] as NftStatusName
        return filterStatus.find(e => e === nftStatus) || filterStatus.length === 0
      })
      .sort((aNft, bNft) => {
        let a = getNftSortFields(aNft)
        let b = getNftSortFields(bNft)

        // Handle undefined cases first
        if (a[sortBy] === undefined && b[sortBy] === undefined) return 0;
        if (a[sortBy] === undefined) return sortDirection === 'asc' ? 1 : -1;
        if (b[sortBy] === undefined) return sortDirection === 'asc' ? -1 : 1;

        // Compare values
        let comparison = 0;
        if (a[sortBy]! < b[sortBy]!) {
          comparison = -1;
        } else if (a[sortBy]! > b[sortBy]!) {
          comparison = 1;
        }

        // Apply sort direction
        return sortDirection === 'asc' ? comparison : -comparison;
      })

    console.log({ poolNfts, handledNfts })

    return handledNfts
  }, [sortBy, sortDirection, sortBy, onlySelf, poolNfts, filterStatus])

  // status
  const nftStatusOptions: SelectProps['options'] = ['EndAuction', 'PreAuction', 'Settled', 'UnderAuction']
    .map(e => {
      return {
        label: e,
        value: e
      }
    });

  // sort
  const sortOptions: SelectProps['options'] = [
    {
      label: 'Recently Lock',
      value: JSON.stringify({
        sortDirection: 'desc',
        sortBy: 'deposit_time'
      })
    },
    {
      label: 'Auction End Time',
      value: JSON.stringify({
        sortDirection: 'asc',
        sortBy: 'auction_end_time'
      })
    },
    {
      label: 'Auction Price High to Low',
      value: JSON.stringify({
        sortDirection: 'desc',
        sortBy: 'auction_current_price'
      })
    },
    {
      label: 'Auction Price Low to High',
      value: JSON.stringify({
        sortDirection: 'asc',
        sortBy: 'auction_current_price'
      })
    },
  ]

  const handleStatusChange = (value: string[]) => {
    console.log(`selected ${value}`);
    setFilterStatus(value);
  };

  const handleSortChange = (value: string) => {

    let parsedJsonObj = JSON.parse(value)
    setSortBy(parsedJsonObj.sortBy)
    setSortDirection(parsedJsonObj.sortDirection)

  }

  const onCheckBoxChange: CheckboxProps['onChange'] = (e) => {
    setOnlySelf(e.target.checked)
  };

  if (error) {
    return <div className='text-red-500 text-3xl'>query pool nfts error: {error.message}</div>
  }

  if (queryRuneInfoError) {
    return <div className='text-red-500 text-3xl'>queryRuneInfoError: {queryRuneInfoError.message}</div>
  }

  if (isLoading) {
    return <Skeleton />
  }

  if (getConfigError) {
    return <p className='text-red-500 text-3xl'>getConfig error: {getConfigError.message}</p>
  }

  if (isLoadingConfig || isLoading || isLoadingRuneInfo || !poolInfo) {
    return <Skeleton />
  }

  console.log({
    poolNfts
  })

  return (
    <div className='w-full'>
      <List
        className='w-full'
        header={
          <div className='my-2'>
            <div className='flex items-center'>
              <div className='px-4 text-orange-500 text-4xl font-bold'>{JSON.parse(poolInfo.attributes)?.collection_name}</div>
              <button
                onClick={() => setPoolInfoThenOpenLockNftListModal(poolInfo!)}
                className='mx-4 mt-2 py-1 transform rounded-lg px-3 text-lg bg-orange-500 font-bold text-black shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl'
              >
                Lock
              </button>
              <p className='text-xl mt-2 font-bold text-orange-400'>
                To Get {exchangeConfig!.rune_offering.toString()}
                {runeInfo?.symbol} {runeInfo?.spacedRune}
              </p>

            </div>

            <div className='py-2 my-4 flex items-center  w-full'>
              <Select
                rootClassName=''
                popupClassName='bg-gray-300 text-orange-300'

                className='w-1/5 mx-4'
                mode="multiple"
                allowClear
                placeholder="Filter Status"
                defaultValue={[]}
                onChange={handleStatusChange}
                options={nftStatusOptions}
              />
              <Select
                rootClassName=''
                popupClassName='bg-gray-300 text-orange-300'
                className='w-1/5'
                placeholder="Sort By"
                onChange={handleSortChange}
                options={sortOptions}
              />
              {
                paymentAddress && <Checkbox className='text-orange-500 mx-4' onChange={onCheckBoxChange}>Show My Inscription</Checkbox>
              }
            </div>

          </div>
        }
        bordered
        grid={{ gutter: 16, column: 4 }}
        dataSource={filterSortNfts}
        renderItem={(nft: GetNftsResp) => (
          <List.Item>
            <NFTCard
              className='group relative w-full max-w-sm overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl transition-all duration-300 hover:border-blue-500/50 hover:shadow-2xl'
              nft={nft}
              exchangeConfig={exchangeConfig!}
              collectionName={JSON.parse(poolInfo!.attributes)?.collection_name}
              poolBasic={poolBasic}
            />
          </List.Item>
        )}
      />
    </div>
  )
}

export function AuctionStatus({
  nft,
  exchangeConfig,
  poolBasic
}: {
  nft: GetNftsResp
  exchangeConfig: ExchangeCfg
  poolBasic: PoolBasic
}) {
  const nftStatus = Object.keys(nft.status)[0]

  const content = () => {
    if (nftStatus === 'PreAuction') {
      return (
        <PreAuction
          nft={nft}
          exchangeConfig={exchangeConfig}
          poolBasic={poolBasic}
        />
      )
    }

    if (nftStatus === 'UnderAuction') {
      return <UnderAuction
        nft={nft}
        exchangeConfig={exchangeConfig}
        poolBasic={poolBasic}
      />
    }

    if (nftStatus === 'EndAuction' || nftStatus === 'Settled') {
      return <EndAuction
        nft={nft}
        exchangeConfig={exchangeConfig}
        poolBasic={poolBasic}
      />
    }

    return null
  }

  return <div>{content()}</div>
}

function PreAuction({
  nft,
  exchangeConfig,
  poolBasic
}: {
  nft: GetNftsResp
  exchangeConfig: ExchangeCfg
  poolBasic: PoolBasic
}) {
  const { address, paymentAddress, publicKey, signPsbt, provider, paymentPublicKey } = useLaserEyes()
  const setNftAndOpenAuctionModal = useSetAtom(
    setNftAndPoolThenOpenAuctionModalAtom
  )
  const { data: poolInfo } = usePoolInfo(poolBasic.address)

  // invoke modal atom
  const setInvokeModalOpen = useSetAtom(invokeModalOpenAtom)
  const [stepIndex, setStepIndex] = useAtom(invokeStepAtom)
  const setInvokeModalTitle = useSetAtom(invokeModalTitleAtom)
  const setInvokeTxid = useSetAtom(invokeTxidAtom)
  const setInvokeErrorMessage = useSetAtom(invokeErrorMessageAtom)
  const addSpentUtxos = useAddSpentUtxos()
  const addIntentions = useAddIntentions()

  const { data: userBtcUtxos } = useLoginUserBtcUtxo()
  const [api, contextHolder] = notification.useNotification()
  const setConnectWalletModalOpen = useSetAtom(connectWalletModalOpenAtom)
  const nftStatus = Object.keys(nft.status)[0]
  const isInscriptionOwner = useMemo(() => {
    if (nft.nft.inscription_id === '83fa8efe3bd4fa5dae70a28e0eb8db6cb8169391f7e9140d3ce1719666477b01i0') {
      console.log({ nft, paymentAddress })
    }
    if (nft.nft.depositor === paymentAddress) {
      return true
    }
    return false
  }, [paymentAddress, nft])

  // todo use pool rune id
  // const { data: userRuneUtxos, isLoading: isLoadingRuneUtxo } =
  // 	useLoginUserRuneUtxo(parsePoolName(poolBasic.name).runeId)

  // const userRuneUtxos = useWalletRuneUtxos(parsePoolName(poolBasic.name).runeId)

  const { data: userRuneUtxos } = useLoginUserRuneUtxo(parsePoolName(poolBasic.name).runeId)

  if (poolInfo === undefined) {
    return <Skeleton />
  }

  if (nftStatus !== 'PreAuction') {
    throw new Error('Invalid NFT status, Expected PreAuction')
  }

  const onClickClaimBack = async () => {
    // const pool_info = await getTestPoolInfo()
    const recommendedFeeRate = await ocActor
      .get_status()
      .then(
        (res: OrchestratorStatus) => res.mempool_tx_fee_rate.medium
      )
      .catch(error => {
        console.log('get recommendedFeeRate error', error)
        throw error
      })

    const runeId = poolInfo.coin_reserved[0].id
    const poolRuneUtxo = poolInfo.utxos.find(
      u => u.coins.length > 0 && 
      !!u.coins.find(coin=>coin.id===runeId) 
    )!
    if (poolRuneUtxo === undefined) {
      api.error({
        message: 'Error',
        description: 'Pool Rune utxo not found',
        placement: 'topRight',
        duration: 0
      })
      return
    }

    if (userRuneUtxos === undefined) {
      api.error({
        message: 'Error',
        description: 'Fetch User Rune Utxo Error',
        placement: 'topRight',
        duration: 0
      })
      return
    }

    if (userBtcUtxos === undefined) {
      api.error({
        message: 'Error',
        description: 'Fetch User BTC Utxo Error',
        placement: 'topRight',
        duration: 0
      })
      return
    }

    const poolInscriptionUtxo = nft.nft.locked_utxo


    try {
      setInvokeModalTitle('Reclaim')
      setStepIndex(0)
      setInvokeModalOpen(true)

      if (userBtcUtxos === undefined || userBtcUtxos.length === 0) {
        throw new Error('No user BTC UTXOs found')
      }

      let genPsbtRes = await reclaimPsbt({
        runeIdStr: runeId,
        userRuneUtxo: userRuneUtxos,
        poolRuneUtxo: convertPoolUtxo(poolRuneUtxo, poolInfo.key),
        inscriptionId: nft.nft.inscription_id,
        poolInscriptionUtxo: convertPoolUtxo(
          poolInscriptionUtxo,
          poolInfo!.key
        ),
        userBtcUtxos: (userBtcUtxos ?? []).map(e => convertUnisatUtxo(e, paymentPublicKey)),
        userAddress: address,
        poolAddress: poolInfo.address,
        poolName: poolInfo.name,
        userPayRuneAmount: exchangeConfig.rune_offering,
        feeRate: Number(recommendedFeeRate.toString()),
        nonce: poolInfo.nonce,
        nftDepositId: nft.deposit_id
      })

      setStepIndex(1)

      // 2. user sign psbt
      let signedPsbtHex = undefined
      if (provider === OKX) {
        // console.log("is okx wallet", toSignInputs, toSpendUtxos);
        const psbtHex = genPsbtRes.psbt.toHex()

        signedPsbtHex = await window.okxwallet.bitcoin.signPsbt(
          psbtHex,
          {
            toSignInputs: genPsbtRes.toSignInputs,
            autoFinalized: false
          }
        )
        console.log(signedPsbtHex)
      } else {
        const psbtBase64 = genPsbtRes.psbt.toBase64()
        const res = await signPsbt(psbtBase64)
        signedPsbtHex = res?.signedPsbtHex
      }

      if (signedPsbtHex === undefined) {
        setInvokeErrorMessage('Signed Psbt failed.')
        return
      }

      setStepIndex(2)

      // 3. invoke
      await ocActor
        .invoke({
          intention_set: genPsbtRes.intentionSet,
          initiator_utxo_proof: [],
          psbt_hex: signedPsbtHex
        })
        .then(res => {
          if ('Err' in res) {
            throw new Error(res.Err)
          }
          return res.Ok
        })
        .then(txid => {
          addIntentions(genPsbtRes.intentionRecords)
          addSpentUtxos(genPsbtRes.toSpendUtxos)
          setInvokeTxid(txid)
          setStepIndex(3)
        })
    } catch (e: any) {
      console.log("invoke error: ", e)
      setInvokeErrorMessage(getErrorMessage(e))
    }
  }

  return (
    <div>
      {contextHolder}
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-xs text-white'>Starting Bid</p>
          <p className='text-xl font-bold text-orange-400'>
            {Number(exchangeConfig.starting_bid)}
          </p>
        </div>

        {isInscriptionOwner ? (
          <div className='flex'>
            <button
              className='text-xs font-medium mr-2 my-2 transform rounded-sm bg-gradient-to-r from-orange-500 to-orange-700 px-1 py-2.5 text-black shadow-sm transition-all duration-200  hover:shadow-xl'
              onClick={onClickClaimBack}
            >
              Claim Back
            </button>
            <button
              className='text-xs font-medium my-2 transform rounded-sm bg-gradient-to-r from-orange-500 to-orange-700 px-1 py-2.5 text-black shadow-lg transition-all duration-200 hover:shadow-xl'
              onClick={() =>
                address
                  ? setNftAndOpenAuctionModal(nft, poolInfo)
                  : setConnectWalletModalOpen(true)
              }
            >
              Start Bidding
            </button>

          </div>

        ) : (
          <button
            className='my-1 transform rounded-sm bg-gradient-to-r from-orange-500 to-orange-700 px-6 py-2.5 font-medium text-black shadow-lg transition-all duration-200 hover:shadow-xl'
            onClick={() =>
              address
                ? setNftAndOpenAuctionModal(nft, poolInfo)
                : setConnectWalletModalOpen(true)
            }
          >
            Start Bidding
          </button>
        )}
      </div>
    </div>
  )
}

function UnderAuction({
  nft,
  exchangeConfig,
  poolBasic
}: {
  nft: GetNftsResp
  exchangeConfig: ExchangeCfg
  poolBasic: PoolBasic
}) {
  const { paymentAddress } = useLaserEyes()

  const { data: poolInfo } = usePoolInfo(poolBasic.address)

  const setNftPoolAndOpenAuctionModal = useSetAtom(
    setNftAndPoolThenOpenAuctionModalAtom
  )
  const setConnectWalletModalOpen = useSetAtom(connectWalletModalOpenAtom)

  const nftStatus = Object.keys(nft.status)[0]
  // let auctionPrice = exchangeConfig.starting_bid

  if (nftStatus !== 'UnderAuction') {
    throw new Error('Invalid NFT status, Expected PreAuction or UnderAuction')
  }

  if (poolInfo === undefined) {
    return <Skeleton />
  }

  const nftAuction = nft.nft.auction[0]!
  let auctionPrice = nftAuction.bidders.reduce(
    (accumulator, bidder) =>
      accumulator > bidder[1].amount ? accumulator : bidder[1].amount,
    BigInt(0)
  )
  const topBidder = nft.nft.auction[0]!.top_bidder

  return (

    <div className=''>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-xs text-white'>Current Bid Price</p>
          <p className='text-xl font-bold text-orange-400'>
            {Number(auctionPrice).toString()}
          </p>
        </div>
        <div className='flex flex-col items-end'>
          {
            (topBidder !== paymentAddress) &&
            <button
              className='my-1 transform rounded-sm bg-gradient-to-r from-orange-500 to-orange-700 px-6 py-2.5 font-medium text-black shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl'
              onClick={() => {
                paymentAddress
                  ? setNftPoolAndOpenAuctionModal(nft, poolInfo)
                  : setConnectWalletModalOpen(true)
              }}
            >
              Place Bid
            </button>
          }
        </div>
      </div>
    </div>
  )
}

function EndAuction({
  nft,
  exchangeConfig,
  poolBasic
}: {
  nft: GetNftsResp
  exchangeConfig: ExchangeCfg
  poolBasic: PoolBasic
}) {
  const [api, contextHolder] = notification.useNotification()

  const { paymentAddress, paymentPublicKey, signPsbt, provider } = useLaserEyes()
  const { data: feeRate } = useFeeRate()
  const { data: poolInfo } = usePoolInfo(poolBasic.address)
  const { data: userBtcUtxos } = useLoginUserBtcUtxo()
  const poolRune = useMemo(() => poolInfo?.coin_reserved[0], [poolInfo])

  // invoke modal atom
  const setInvokeModalOpen = useSetAtom(invokeModalOpenAtom)
  const [stepIndex, setStepIndex] = useAtom(invokeStepAtom)
  const setInvokeModalTitle = useSetAtom(invokeModalTitleAtom)
  const setInvokeTxid = useSetAtom(invokeTxidAtom)
  const setInvokeErrorMessage = useSetAtom(invokeErrorMessageAtom)
  const addSpentUtxos = useAddSpentUtxos()
  const addIntentions = useAddIntentions()

  const auction = useMemo(()=>nft.nft.auction[0]!,[nft])

  const bidder = useMemo(
    () =>
      auction.bidders.find(
        ([_, bidder]) => bidder.address === paymentAddress
      )?.[1],
    [paymentAddress]
  )
  const winner = auction.top_bidder
  const nftStatus = useMemo(()=>{
    return Object.keys(nft.status)[0]
  }, [nft]) 

  if (nftStatus !== 'EndAuction' && nftStatus !== 'Settled') {
    throw new Error('Invalid NFT status, Expected EndAuction or Settled')
  }

  type UserState =
    | 'Bidder'
    | 'ClaimedBidder'
    | 'NotBidder'
    | 'SettledWinner'
    | 'Winner'
  let userState: UserState = 'NotBidder'
  let userClaimAmount: bigint | undefined

  const finalBidPrice: bigint = nft.nft.auction[0]!.bidders.find(
    ([_, bidder]) => bidder.address === winner
  )?.[1].amount!

  if (bidder !== undefined) {
    if (bidder.claimed) {
      userState = 'ClaimedBidder'
    } else {
      userState = 'Bidder'
      userClaimAmount = bidder.amount
    }

    if (winner === paymentAddress) {
      if (nftStatus === 'Settled') {
        userState = 'SettledWinner'
      } else {
        userState = 'Winner'
        // finalBidPrice = bidder.amount
      }
    }
  }

  const contentOrSpin = (c: ReactNode) =>
    !!poolInfo && !!feeRate ? c : <Spin />

  let claimButton = () => {
    if(userState === 'Winner') {
      return winnerClaimButton
    } else if (userState==='Bidder') {
      return bidderClaimButton
    } else {
      return undefined
    }
  }
  const bidderClaimButton = contentOrSpin(
    <button
      className='text-xs transform rounded-sm bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-1 font-bold text-black shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:from-green-400 hover:to-emerald-500 hover:shadow-xl'
      onClick={async () => {
        const runeId = poolRune!.id
        const poolRuneUtxo = poolInfo!.utxos.find(
          u => u.coins.length > 0 && 
          !!u.coins.find(coin=>coin.id===runeId) 
        )!
        if (poolRuneUtxo === undefined) {
          throw new Error('Pool Rune utxo not found')
        }

        try {
          setInvokeModalTitle('Claim')
          setStepIndex(0)
          setInvokeModalOpen(true)

          if (userBtcUtxos === undefined || userBtcUtxos.length === 0) {
            throw new Error('No user BTC UTXOs found')
          }

          let genPsbtRes = await claimPsbt({
            runeIdStr: runeId,
            poolRuneUtxo: convertPoolUtxo(poolRuneUtxo, poolInfo!.key),
            inscriptionId: nft.nft.inscription_id,
            userBtcUtxos: (userBtcUtxos ?? []).map(e => convertUnisatUtxo(e, paymentPublicKey)),
            paymentAddress,
            poolAddress: poolInfo!.address,
            poolName: poolInfo!.name,
            userClaimRuneAmount: userClaimAmount!,
            feeRate: Number(feeRate!),
            nonce: poolInfo!.nonce,
            nftDepositId: nft.deposit_id
          })

          setStepIndex(1)

          // 2. user sign psbt
          let signedPsbtHex = undefined
          if (provider === OKX) {
            // console.log("is okx wallet", toSignInputs, toSpendUtxos);
            const psbtHex = genPsbtRes.psbt.toHex()

            signedPsbtHex = await window.okxwallet.bitcoin.signPsbt(psbtHex, {
              toSignInputs: genPsbtRes.toSignInputs,
              autoFinalized: false
            })
            console.log(signedPsbtHex)
          } else {
            const psbtBase64 = genPsbtRes.psbt.toBase64()
            const res = await signPsbt(psbtBase64)
            signedPsbtHex = res?.signedPsbtHex
          }

          if (signedPsbtHex === undefined) {
            throw new Error('Failed to sign psbt')
          }
          setStepIndex(2)

          // 3. invoke
          await ocActor
            .invoke({
              intention_set: genPsbtRes.intentionSet,
              initiator_utxo_proof: [],
              psbt_hex: signedPsbtHex
            })
            .then(res => {
              if ('Err' in res) {
                throw new Error(res.Err)
              }
              addSpentUtxos(genPsbtRes.toSpendUtxos)
              return res.Ok
            })
            .then(txid => {
              addIntentions(genPsbtRes.intentionRecords)
              addSpentUtxos(genPsbtRes.toSpendUtxos)
              setInvokeTxid(txid)
              setStepIndex(3)
            })
        } catch (e: any) {
          console.log("invoke error: ", e)
          setInvokeErrorMessage(getErrorMessage(e))
        }
      }
      }
    >
      Claim: {userClaimAmount?.toString()}
    </button>
  )

  const winnerClaimButton = contentOrSpin(
    <button
      className='text-xs transform gap-2 rounded-sm bg-gradient-to-r from-green-500 to-emerald-600 px-2 py-3 text-black shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:from-green-400 hover:to-emerald-500 hover:shadow-xl'
      onClick={async () => {
        const runeId = poolRune!.id
   

        const poolRuneUtxo = poolInfo!.utxos.find(
          u => u.coins.length > 0 && 
          !!u.coins.find(coin=>coin.id===runeId) 
        )!

        const poolInscriptionUtxo = nft.nft.locked_utxo

        try {
          setInvokeModalTitle('Settle')
          setStepIndex(0)
          setInvokeModalOpen(true)

          if(userBtcUtxos===undefined || userBtcUtxos.length === 0) {
            throw new Error('No user BTC UTXOs found')
          }

          let genPsbtRes = await settlePsbt({
            runeIdStr: runeId,
            poolRuneUtxo: convertPoolUtxo(poolRuneUtxo, poolInfo!.key),
            inscriptionId: nft.nft.inscription_id,
            poolInscriptionUtxo: convertPoolUtxo(
              poolInscriptionUtxo,
              poolInfo!.key
            ),
            userBtcUtxos: userBtcUtxos!.map(e => convertUnisatUtxo(e, paymentPublicKey)),
            paymentAddress,
            poolAddress: poolInfo!.address,
            poolName: poolInfo!.name,
            feeRate: Number(feeRate!),
            nonce: poolInfo!.nonce,
            nftDepositId: nft.deposit_id,
            depositor_share: exchangeConfig.depositor_share,
            depositor_address: nft.nft.depositor,
            fee_collector_share: exchangeConfig.fee_collector_share,
            fee_collector_address: exchangeConfig.fee_collector,
            startBidPrice: exchangeConfig.starting_bid,
            finalBidPrice
          })

          setStepIndex(1)

          // 2. user sign psbt
          let signedPsbtHex = undefined
          if (provider === OKX) {
            // console.log("is okx wallet", toSignInputs, toSpendUtxos);
            const psbtHex = genPsbtRes.psbt.toHex()

            signedPsbtHex = await window.okxwallet.bitcoin.signPsbt(psbtHex, {
              toSignInputs: genPsbtRes.toSignInputs,
              autoFinalized: false
            })
            console.log(signedPsbtHex)
          } else {
            const psbtBase64 = genPsbtRes.psbt.toBase64()
            const res = await signPsbt(psbtBase64)
            signedPsbtHex = res?.signedPsbtHex
          }

          if (signedPsbtHex === undefined) {
            throw new Error('Failed to sign psbt')
          }

          setStepIndex(2)

          // 3. invoke
          await ocActor
            .invoke({
              intention_set: genPsbtRes.intentionSet,
              initiator_utxo_proof: [],
              psbt_hex: signedPsbtHex
            })
            .then(res => {
              if ('Err' in res) {
                throw new Error(res.Err)
              }
              return res.Ok
            })
            .then(txid => {
              addIntentions(genPsbtRes.intentionRecords)
              addSpentUtxos(genPsbtRes.toSpendUtxos)
              setInvokeTxid(txid)
              setStepIndex(3)
            })

        } catch (e: any) {
          console.log("invoke error: ", e)
          setInvokeErrorMessage(getErrorMessage(e))
        }
      }}
    >
      Settle Inscription
    </button>
  )

  // switch (userState) {
  //   case 'Bidder': {
  //     claimButton = 
  //     break
  //   }
  //   case 'Winner': {
  //     claimButton = 
  //     break
  //   }
  // }

  return (
    <div>
      {/* {contextHolder} */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-md text-white'>Final Price</p>
            <p className='text-xl font-bold text-orange-500'>
              {Number(finalBidPrice).toString()}
            </p>
          </div>

          {
            claimButton() === undefined
              ?
              (paymentAddress === winner ? (
                <div className='mt-2 rounded-full bg-green-900/30 px-3 py-1 text-sm font-medium text-green-400'>
                  You Won!
                </div>
              ) : (
                <div className='flex flex-col items-end'>
                  <div className='text-md mb-2 rounded-full font-medium text-yellow-300'>
                    Winner:
                  </div>
                  <p className='text-md text-yellow-300'>
                    {shortenAddress(winner)}
                  </p>
                </div>
              ))
              :
              (claimButton())
          }
          {/* {paymentAddress === winner ? (
            <div className='mt-2 rounded-full bg-green-900/30 px-3 py-1 text-sm font-medium text-green-400'>
              You Won!
            </div>
          ) : (
            <div className='flex flex-col items-end'>
              <div className='text-md mb-2 rounded-full font-medium text-yellow-300'>
                Winner:
              </div>
              <p className='text-md text-yellow-300'>
                {shortenAddress(winner)}
              </p>
            </div>
          )}
        {claimButton} */}
        </div>
      </div>

    </div>
  )
}

type NftSortFields = {
  deposit_time: bigint,
  auction_end_time: bigint | undefined,
  auction_current_price: bigint | undefined
}

function getNftSortFields(nft: GetNftsResp): NftSortFields {

  return {
    deposit_time: nft.nft.deposit_time,
    auction_end_time: nft.nft.auction[0]?.end_time,
    auction_current_price: nft.nft.auction[0]?.bidders.reduce(
      (accumulator, bidder) =>
        accumulator > bidder[1].amount ? accumulator : bidder[1].amount,
      BigInt(0)
    )
  }

  // nft.nft.deposit_time
  // nft.nft.au

}