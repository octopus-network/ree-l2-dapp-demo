import { useQuery } from "@tanstack/react-query";
import { getTransactionFromMempool } from "api/mempool";
import { useIntentions } from "layout/sidebar/IntentionList";

export function useIntentionTransactionStatus(txid: string)  {
  let localStatus = useIntentions()

}

// export function useQueryTransactionStatus(txid: string):  {
//   return useQuery({
//     enabled
//   })
// }

export function useQueryTransactionStatus(txid: string) {
  return useQuery({
    queryKey: ["transaction", txid],
    queryFn: async () => {
      let status = await (getTransactionFromMempool(txid))
      console.log('query ' +txid + " transaction status res", status)
      if (status) {
      }
    },
    refetchInterval: 15 * 1000 // Refetch every 30 s
  })

}