import { getAddressUtxo } from "api/mempool"
import { getUtxoData } from "api/unisat"
import { ocActor } from "canister/orchestrator/actor"
import { useUserBtcUtxoDebug } from "hooks/useUtxo"
import { useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { spentUtxosAtom } from "store/spent-utxos"

export function Debug() {

  const { address } = useParams()
  console.log("Debug address", address)

  const { data } = useUserBtcUtxoDebug(address)
  const spentUtxos = useAtomValue(spentUtxosAtom);

  const [res, setRes] = useState<any>()

  console.log(data?.spentOutPointSet)

  useEffect(() => {
    if (!spentUtxos) {
      return
    }
    const f = async () => {
      let paymentAddress = address
      const spentOutPointSet = new Set()
      spentUtxos.forEach(e => spentOutPointSet.add(`${e.txid}:${e.vout}`))
      const res = await getUtxoData(paymentAddress!)
      const ocStatus = await ocActor.get_status()
      const utxoFromMempool = await getAddressUtxo(paymentAddress!) ?? []
      const findUtxoHeightInMempool = (txid: string, vout: number) => {
        const utxo = utxoFromMempool.find(e => e.txid === txid && e.vout === vout)
        return utxo?.status.block_height
      }
      let filteredUtxo = res.data.utxo
        .filter(
          (e) => !spentOutPointSet.has(`${e.txid}:${e.vout}`)
        )
        .filter(
          e => {
            let block_height_from_mempool = findUtxoHeightInMempool(e.txid, e.vout)
            if (block_height_from_mempool === undefined) return false
            return block_height_from_mempool <= (ocStatus.last_block?.[0]?.block_height ?? 0)
          }
        )
      console.log({ utxoFromMempool, ocStatus, res, filteredUtxo })
      setRes({
        filteredUtxo: filteredUtxo,
        utxoFromMempool: utxoFromMempool,
        utxoFromUnisat: res,
        ocStatus,
        spentOutPointSet
      })
    }

    f().catch(e=>{
      console.log(e)
      setRes(e)
    })

  }, [spentUtxos])



  return <div className="text-orange-500">

    {
      'utxo res: ' + JSON.stringify(res, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value)
    }

  </div>

}