import { PoolBasic } from 'canister/rich_ordi/service.did'
import { useLatestBlock } from 'hooks/useBlock'
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useEffect, useMemo, useState } from 'react'
import { partition } from 'lodash'
import { getTransactionFromMempool, mempoolTxDetailLink } from 'api/mempool'
import { List } from 'antd'
import moment from 'moment';
import { shortenAddress } from 'components/AccountButton'
import { AlertTriangle, ArrowDownLeft, ArrowUpLeft, ArrowUpRight, Check, ChevronDown, ChevronUp, Clock, Loader, Minus, Plus, XCircle } from 'react-feather'
import { inscriptionImgUrlFromUnisat } from 'api/unisat'
import { useRunesInfo } from 'hooks/useRunes'
import Link from 'antd/es/typography/Link'
import { useLaserEyes } from '@omnisat/lasereyes'
import { InscriptionImg } from 'components/InscriptionImg'
import { ocActor } from 'canister/orchestrator/actor'


export enum TransactionStatus {
  BROADCASTED,
  CONFIRMING,
  FINALIZED,
  REJECTED,
  FAILED,
  PENDING
}

type IntentionActionType =
  | 'deposit_nft'
  | 'reclaim_nft'
  | 'auction'
  | 'claim_bid'
  | 'settle_bid'

export type IntentionRecord = {
  intentionActionType: IntentionActionType
  transactionStatus: TransactionStatus
  timestamp: number
  poolBasic: PoolBasic
  txid: string
  includedBlockHeight?: number
  rejectedReason?: string
  invokeAction: string
  fee: string
  feeRate: number
  initiator: string
  intention:
  DepositIntention
  | ReclaimNftIntention
  | AuctionIntention
  | ClaimBidIntention
  | SettleIntention
}

export type DepositIntention = {
  runeId: string
  // spacedRuneName: string
  inscriptionId: string
  receiveRuneAmount: string
}

export type ReclaimNftIntention = {
  runeId: string
  inscriptionId: string
  sendRuneAmount: string
  nftDepositId: string
}

export type AuctionIntention = {
  runeId: string
  // spacedRuneName: string
  sendRuneAmount: string
  inscriptionId: string
  nftDepositId: string
}

export type ClaimBidIntention = {
  runeId: string
  // spacedRuneName: string
  receiveRuneAmount: string
  inscriptionId: string
  nftDepositId: string
}

export type SettleIntention = {
  runeId: string
  finalPrice: string
  inscriptionId: string
  nftDepositId: string
}

export const intentionsAtom = atomWithStorage<IntentionRecord[]>(
  'intentions',
  []
)



export function useIntentions() {
  const intentions = useAtomValue(intentionsAtom)
  return intentions
}

export const addIntentionsAtom = atom(
  null,
  (get, set, intentions: IntentionRecord[]) => {
    set(intentionsAtom, get(intentionsAtom).concat(intentions))
  }
)

export const updateOrAddIntentionsAtom = atom(
  null,
  (get, set, newIntentions: IntentionRecord[]) => {

    let intentions = get(intentionsAtom)

    for(let i = 0; i < newIntentions.length; i++) {
      let intention = newIntentions[i]
      let index = intentions.findIndex(e => e.txid === intention.txid)
      if (index !== -1) {
        intentions[index] = intention
      } else {
        intentions.push(intention)
      }
    }

    set(intentionsAtom, intentions)
  }
)

export function useUpdateOrAddIntentions() {
  return useSetAtom(updateOrAddIntentionsAtom)
}

export const useAddIntentions = () => {
  return useSetAtom(addIntentionsAtom)
}

export function IntentionList() {
  const { paymentAddress } = useLaserEyes()
  const intentions = useIntentions()
  const filterSortIntentions = useMemo(() => {
    return (intentions ?? [])
    .filter(e => e.initiator === paymentAddress)
    .sort((b, a) => a.timestamp - b.timestamp)
  }, [paymentAddress, intentions])

  return <div >
    <List
      dataSource={filterSortIntentions}
      renderItem={(record) => {
        return <IntentionItem record={record} />
      }}
    />
  </div>
}

function getAssetChangeFromIntentionRecord(record: IntentionRecord): AssetChange[] {
  let assetChanges: AssetChange[] = []
  switch (record.intentionActionType) {
    case 'deposit_nft':
      assetChanges.push({
        receiveOrSend: 'receive',
        assetType: 'RUNE',
        runeId: (record.intention as DepositIntention).runeId,
        runeAmount: (record.intention as DepositIntention).receiveRuneAmount
      })
      assetChanges.push({
        receiveOrSend: 'send',
        assetType: 'ORDI',
        inscriptionId: (record.intention as DepositIntention).inscriptionId
      })
      break
    case 'reclaim_nft':
      assetChanges.push({
        receiveOrSend: 'send',
        assetType: 'RUNE',
        runeId: record.intention.runeId,
        runeAmount: (record.intention as ReclaimNftIntention).sendRuneAmount
      })
      assetChanges.push({
        receiveOrSend: 'receive',
        assetType: 'ORDI',
        inscriptionId: record.intention.inscriptionId
      })
      break
    case 'auction':
      assetChanges.push({
        receiveOrSend: 'send',
        assetType: 'RUNE',
        runeId: record.intention.runeId,
        runeAmount: (record.intention as AuctionIntention).sendRuneAmount
      })
      assetChanges.push({
        receiveOrSend: 'receive',
        assetType: 'ORDI',
        inscriptionId: record.intention.inscriptionId
      })
      break
    case 'claim_bid':
      assetChanges.push({
        receiveOrSend: 'send',
        assetType: 'RUNE',
        runeId: record.intention.runeId,
        runeAmount: (record.intention as ClaimBidIntention).receiveRuneAmount
      })
      assetChanges.push({
        receiveOrSend: 'receive',
        assetType: 'ORDI',
        inscriptionId: record.intention.inscriptionId
      })
      break
    case 'settle_bid':
      assetChanges.push({
        receiveOrSend: 'send',
        assetType: 'RUNE',
        runeId: record.intention.runeId,
        runeAmount: (record.intention as SettleIntention).finalPrice
      })
      break
  }
  return assetChanges
}

function IntentionItem({
  record,
  latestBlockHeight
}: {
  record: IntentionRecord,
  latestBlockHeight?: number
}
) {

  const [expanded, setExpanded] = useState(false);

  const assetChanges = getAssetChangeFromIntentionRecord(record)

  const confirmedBlockCount = (latestBlockHeight && record.includedBlockHeight && latestBlockHeight > record.includedBlockHeight)
    ?
    latestBlockHeight - record.includedBlockHeight
    : 0

  const statusConfig = {
    [TransactionStatus.BROADCASTED]: {
      icon: <Clock className="text-white" size={16} />,
      color: 'bg-blue-100 text-blue-800',
      text: 'BROADCASTED',
      class: 'bg-blue-500 text-white'
    },
    [TransactionStatus.CONFIRMING]: {
      icon: <Loader className="text-white animate-spin" size={16} />,
      color: 'bg-yellow-100 text-yellow-800',
      text: `CONFIRMING ${latestBlockHeight ?? record.includedBlockHeight}`,
      class: 'bg-yellow-500 text-white'
    },
    [TransactionStatus.FINALIZED]: {
      icon: <Check className="text-white" size={16} />,
      color: 'bg-green-100 text-green-800',
      text: 'FINALIZED',
      class: 'bg-green-500 text-white'
    },
    [TransactionStatus.REJECTED]: {
      icon: <XCircle className="text-white" size={16} />,
      color: 'bg-red-100 text-red-800',
      text: 'REJECTED',
      class: 'bg-red-500 text-white'
    },
    [TransactionStatus.FAILED]: {
      icon: <AlertTriangle className="text-white" size={16} />,
      color: 'bg-orange-100 text-orange-800',
      text: 'FAILED',
      class: 'bg-orange-500 text-white'
    },
    [TransactionStatus.PENDING]: {
      icon: <Clock className="text-white" size={16} />,
      color: 'bg-orange-100 text-orange-800',
      text: 'PENDING',
      class: 'bg-yellow-500 text-white'
    }
  };

  const statusInfo = statusConfig[record.transactionStatus];

  console.log('intention item', record)

  return <div className='p-3 transition-colors'>
    {/* <div className='flex justify-between'>
      <div>
        {intentContent(record)}
      </div>
      <div className='flex flex-col'>
        {status(record.transactionStatus)}
        <p className='text-sm'>{moment(record.timestamp).fromNow()}</p>
      </div>
    </div> */}
    <div
      // className="mb-3 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      className="text-gray-500 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 rounded-xl p-6 shadow-lg shadow-black/30 hover:shadow-blue-900/20 transition-all"
    >
      <div
        className="p-3 cursor-pointer hover:bg-gray-800 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <div className="text-lg font-semibold text-gray-300">
                {record.intentionActionType}
              </div>
              <p className='text-xs text-gray-500'>{moment(record.timestamp).fromNow()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`rounded-md px-2 py-1 flex items-center text-xs font-medium ${statusInfo.class}`}>
              <span className="mr-1">{statusInfo.icon}</span>
              <span>{statusInfo.text}</span>
            </div>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>
      <div>
        {assetChanges.map((assetChange, index) => {
          return <AssetChangeItem key={index} assetChange={assetChange} />
        })}
      </div>
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-800 pt-2">
          <DetailItem label="Txid" value={<Link
            href={mempoolTxDetailLink(record.txid)}
            target='_blank'
          >
            {shortenAddress(record.txid)}
          </Link>} />
          <DetailItem label="Pool Name" value={record.poolBasic.name} />
          <DetailItem label="Pool Address" value={shortenAddress(record.poolBasic.address)} />
          {/* todo add judge */}
          <DetailItem label="Rune ID" value={record.intention.runeId} />
          {/* todo add judge */}
          <DetailItem label="Inscription ID" value={shortenAddress(record.intention.inscriptionId)} />
          <DetailItem label="Fee" value={`${record.fee} (${record.feeRate} sat/vB)`} />
          {record.includedBlockHeight && (
            <DetailItem label="Block Height" value={record.includedBlockHeight} />
          )}
        </div>
      )}
    </div>
  </div>

}

// 显示详细信息
const DetailItem = ({ label, value }: { label: any, value: any }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-gray-500">{label}:</span>
    <span className="font-medium">{value}</span>
  </div>
);

export function IntentionUpdater() {
  // const intentions = useIntentions()
  // const [intentions, setIntentions] = useAtom(intentionsAtom)
  const intentions = useAtomValue(intentionsAtom)
  const updateOrAddIntentions = useUpdateOrAddIntentions()
  const [timer, setTimer] = useState<number>(0);
  const { data: currentBlock } = useLatestBlock()

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 30 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {

    if (intentions === undefined || intentions.length === 0) {
      console.log("no intentions!!!")
      return
    }

    console.log("update intention status", intentions)
    const updateStatus = async () => {
      let [unconfirmedIntentions, othersIntentions] = partition(
        intentions,
        (record) => record.transactionStatus === TransactionStatus.BROADCASTED
          || record.transactionStatus === TransactionStatus.CONFIRMING
          || record.transactionStatus === TransactionStatus.PENDING
        )

      console.log("unconfirmed intentions", unconfirmedIntentions, "others intentions", othersIntentions)
      let updatedIntentions = (await Promise.all(unconfirmedIntentions.map(async (record) => {

        try {

          let res = await ocActor.get_tx_sent(record.txid)
          let needQueryMempool = true
          let txRes = res?.[0]
          let status = txRes?.status?.[0]
          record.includedBlockHeight = txRes?.included_block?.[0]?.block_height
          if (status) {
            needQueryMempool = false
            switch (Object.keys(status)[0]) {
              case 'Rejected':
                record.transactionStatus = TransactionStatus.REJECTED
                record.rejectedReason = Object.values(status)[0]
                break
              case 'Confirmed':
                record.transactionStatus = TransactionStatus.FINALIZED
                break
              case 'Pending':
                record.transactionStatus = TransactionStatus.PENDING
                break
              default:
                console.error("unknown status", status)
            }

            if (needQueryMempool) {
              let transaction = await getTransactionFromMempool(record.txid)
              if (transaction) {
                if (transaction.status.confirmed === false) {
                  record.transactionStatus = TransactionStatus.PENDING
                } else {
                  record.includedBlockHeight = transaction.status.block_height
                  if (!currentBlock) {
                    throw new Error("current block is not available")
                  }
                  if (currentBlock > record.includedBlockHeight + 4) {
                    record.transactionStatus = TransactionStatus.FINALIZED
                  } else {
                    record.transactionStatus = TransactionStatus.CONFIRMING
                  }
                }
              }
            }
          }
        } catch (e) {
          console.log("update transaction from OC or mempool error", e)
        }

        return record
      })))
      let newIntentions = updatedIntentions.concat(othersIntentions)
      console.log("new intentions", newIntentions)
      updateOrAddIntentions(newIntentions)
    }

    updateStatus()

  }, [timer])

  return null
}

type AssetChange = {
  receiveOrSend: 'receive' | 'send' | 'involve'
  assetType: 'RUNE' | 'ORDI'
  runeId?: string,
  runeAmount?: string,
  inscriptionId?: string
}

function AssetChangeItem({
  assetChange
}: {
  assetChange: AssetChange
}) {

  const { data: runeInfo } = useRunesInfo(assetChange.runeId)

  const icon = () => {
    switch (assetChange.receiveOrSend) {
      case 'send':
        return <ArrowUpRight className="text-red-500 mx-2" size={14} />
      case 'receive':
        return <ArrowDownLeft className="text-green-600 mx-2" size={14} />
      default:
        return <Clock className="text-gray-500 mx-2" size={16} />
    }
  }

  const assetContent = () => {
    if (assetChange.assetType === 'RUNE') {
      return <div className='flex items-center px-2 py-2'>
        <p>
          {assetChange.assetType}
        </p>
        {icon()}
        {`${assetChange.runeAmount} ${runeInfo?.spacedRune}`}
      </div>
    } else {
      return (
        <div className='flex items-start px-2 py-2'>
          <div className='flex mr-4'>
            {assetChange.assetType}
            {icon()}
          </div>
          ID: 	<Link
            href={`${import.meta.env.VITE_UNISAT_BASE_URL}/inscription/${assetChange.inscriptionId}`}
            target='_blank'
          >
            {shortenAddress(assetChange.inscriptionId!)}
          </Link>
          <InscriptionImg
            inscriptionId={assetChange.inscriptionId!}
            className='ml-4 w-[60px]'
          />
        </div>
      )
    }
  }

  return <div className='border border-gray-500'>
    {assetContent()}
  </div>
}

async function getReceipt(txid: string) {

  return ocActor.get_tx_sent(txid)
    .then((res: any) => {
      if (res.length === 0) {
        return undefined
      }

      const errorMessage = res[0]?.status?.[0].Rejected;
      if (errorMessage) {
        return {
          status: "Rejected",
          errorMessage,
        };
      }
      return undefined;

    }).then((res: any) => {
      if (res) {
        return res;
      } else {
        return getTransactionFromMempool(txid)
      }
    })

}