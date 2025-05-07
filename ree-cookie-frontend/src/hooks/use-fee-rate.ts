import axios from "axios";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import Decimal from "decimal.js";
// import { Orchestrator } from "../canister/orchestrator";

export function useFeeRate() {
  const { data } = useSWR(
    `/api/fee-rate`,
    (url: string) =>
      axios
        .get<{
          data: [{ title: string; desc: string; feeRate: number }];
        }>(url)
        .then((res) => res.data.data),
    { refreshInterval: 10 * 1000 }
  );

  return data ?? [];
}

export function useRecommendedFeeRate() {
  const feeRate = useFeeRate();

  return useMemo(
    () =>
      feeRate?.length
        ? new Decimal(
            feeRate?.length
              ? feeRate.sort((a, b) => b.feeRate - a.feeRate)[0].feeRate
              : 10
          )
            .mul(1)
            .toNumber()
        : undefined,
    [feeRate]
  );
}

// export function useRecommendedFeeRateFromOrchestrator(refetch?: boolean) {
//   const [feeRate, setFeeRate] = useState(5);
//   const [timer, setTimer] = useState<number>(0);
//   useEffect(() => {
//     Orchestrator.getRecommendedFee().then((fee) => {
//       setFeeRate(fee);
//     });
//   }, [timer]);

//   useEffect(() => {
//     if (!refetch) {
//       return;
//     }
//     const interval = setInterval(() => setTimer(Date.now()), 15 * 1000);

//     return () => {
//       clearInterval(interval);
//     };
//   }, [refetch]);

//   return feeRate;
// }
