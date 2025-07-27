import { Button, Modal, Spin, Steps } from 'antd'
import { useFeeRate } from 'hooks/useOrchestrator'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import * as bitcoin from 'bitcoinjs-lib'
import { Loader } from 'react-feather'
import { getAddressType } from 'utils/address'
import { OKX, useLaserEyes } from '@omnisat/lasereyes'
import { AddressType } from 'types/utxo'
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'
import { GenPsbtResult } from 'utils'
import { ocActor } from 'canister/orchestrator/actor'
import { useAddSpentUtxos } from 'store/spent-utxos'
import { mempoolTxDetailLink } from 'api/mempool'
import Link from 'antd/es/typography/Link'

export const invokeModalOpenAtom = atom(false)
// export const genPsbtAtom = atom<GenPsbt>()
export const invokeStepAtom = atom(0)
export const invokeErrorMessageAtom = atom<string | undefined>(undefined)
export const invokeModalTitleAtom = atom<string>()
export const invokeTxidAtom = atom<string | undefined>()

// export interface GenPsbt {
//   (): ()=>Promise<GenPsbtResult>
// }

// export interface Invoke {
//   (psbt: bitcoin.Psbt): Promise<string>
// }

// export const setGenPsbtAndOpenInvokeModalAtom = atom(
//   null,
//   (get, set, genPsbt: GenPsbt) => {
//     set(genPsbtAtom, genPsbt)
//     // set(invokeAtom, invoke)
//     set(invokeModalOpenAtom, true)
//   }
// )

// export const useSetGenPsbtAndOpenInvokeModal = () => {
//   const setGenPsbtAndOpenInvokeModal = useSetAtom(setGenPsbtAndOpenInvokeModalAtom)
//   return setGenPsbtAndOpenInvokeModal
// }

export function InvokeModal() {
  const [invokeModalOpen, setInvokeModalOpen] = useAtom(invokeModalOpenAtom)
  const [errorMessage, setErrorMessage] = useAtom(invokeErrorMessageAtom)
  // const errorMessage = useAtomValue(invokeErrorMessageAtom)

  const stepIndex = useAtomValue(invokeStepAtom)
  const setStepIndex = useSetAtom(invokeStepAtom)
  const title = useAtomValue(invokeModalTitleAtom)

  // const txid = useAtomValue<string | undefined>(invokeTxidAtom)
  const [txid, setTxid] = useAtom(invokeTxidAtom)
  const status = useMemo(() => {
    if (txid) {
      return 'finish'
    }
    if (errorMessage) {
      return 'error'
    }
    return 'process'
  }, [txid, errorMessage])

  const showDescription = (
    index: number,
    process: ReactNode,
    finishedContent: ReactNode
  ) => {
    if (index === stepIndex) {
      if (errorMessage !== undefined) {
        return <div className='text-sm text-red-500'>{errorMessage}</div>
      }
      return process
    }
    if (index < stepIndex) {
      return finishedContent
    }
    return null
  }

  const showLoadingIcon = (index: number) => {
    if (index === stepIndex && status==='process') {
      return <Loader className='animate-spin' size={20} />
    }
    return null
  }

  return (
    <Modal
      zIndex={1000}
      closable={false}
      title={title}
      open={invokeModalOpen}
      className='max-w-md'
      maskClosable={false}
      footer={status!=='process' ?
        <Button onClick={() => {
          setStepIndex(0)
          setErrorMessage(undefined)
          setTxid(undefined)
          setInvokeModalOpen(false)
        }}>Close</Button>
        : null}
    >
      <Steps
        status={status}
        direction='vertical'
        current={stepIndex}
        items={[
          {
            icon: showLoadingIcon(0),
            title: 'Build Psbt',
            description: showDescription(
              0,
              <p>Generating Psbt</p>,
              <p>Finished Psbt </p>
            )
          },
          {
            icon: showLoadingIcon(1),
            title: 'Sign Psbt',
            description: showDescription(
              1,
              <p>Signing Psbt</p>,
              <p>Finished signing Psbt</p>
            )
          },
          {
            icon: showLoadingIcon(2),
            title: 'Invoke exchange',
            description: showDescription(
              2,
              <p>Invoking exchange</p>,
              <div className='flex'>
                <p>Finished invoking exchange</p>
                <Link href={mempoolTxDetailLink(txid!)} target='_blank'>
                  View Tx Detail
                </Link>
              </div>

            )
          }
        ]}
      ></Steps>
      {/* {errorMessage !== undefined && (
        <div className='text-sm text-red-500'>{errorMessage}</div>
      )} */}
    </Modal>
  )
}
