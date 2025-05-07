import axios from "axios";
import { MEMPOOL_URL } from "../constants";

const unisatApi = axios.create({
  baseURL: `https://wallet-api.unisat.io/v5`,
  headers: {
    "Content-Type": "application/json",
    "X-Client": "UniSat Wallet",
    "X-Version": "1.4.9",
  },
});

const unisatOpenApi = axios.create({
  baseURL: "https://open-api.unisat.io/v1",
  headers: {
    "Content-Type": "application/json",
    "Authorization:":
      "3262ea26c68b0b364f62f78213a4850f6340c32127ea2a8bcdd8bf3ed5e67834",
  },
});

const mempoolApi = axios.create({
  baseURL: `${MEMPOOL_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function getRuneList(address: string) {
  const runeList = await unisatApi
    .get<{
      data: {
        list: {
          divisibility: number;
          amount: string;
          rune: string;
          runeid: string;
        }[];
      };
    }>(`/runes/list?address=${address}&cursor=0&size=500`)
    .then((res) => res.data?.data?.list || []);

  return runeList;
}

export async function getAddressBalance(address: string) {
  const btcAmount = await unisatApi
    .get<{
      data: {
        confirm_amount: string;
        amount: string;
      };
    }>(`/address/balance?address=${address}`)
    .then((res) => res.data?.data?.amount || "0");

  return Number(btcAmount);
}

// export async function getAddressUtxos(address: string) {
//   const data = await mempoolApi
//     .get<
//       {
//         txid: string;
//         vout: number;
//         value: number;
//         status: {
//           confirmed: boolean;
//           block_height: number;
//         };
//       }[]
//     >(`address/${address}/utxo`)
//     .then((res) => res.data ?? []);

//   const url = `https://api.hiro.so/ordinals/v1/inscriptions?${data
//     .map(({ vout, txid }) => `id=${txid}i${vout}`)
//     .join("&")}`;

//   const utxoInscriptions = data.length
//     ? await axios.get(url).then((res) => res.data.results)
//     : [];

//   console.log("utxoInscriptions", utxoInscriptions);

//   const utxos = data.length
//     ? await Promise.all(
//         data.map(({ txid, vout }) => getUtxoByOutpoint(txid, vout))
//       )
//     : [];

//   return utxos.filter((utxo) => !!utxo);
// }

export async function getBtcUtxos(address: string) {
  const [blockHeight, utxoData] = await Promise.all([
    getLatestBlockHeight(),
    unisatOpenApi
      .get<{
        data: {
          cursor: number;
          total: number;
          totalConfirmed: number;
          totalUnconfirmed: number;
          totalUnconfirmedSpend: number;
          utxo: {
            inscriptions: any[];
            height: number;
            address: string;
            satoshi: number;
            scriptPk: string;
            txid: string;
            vout: number;
          }[];
        };
      }>(`/indexer/address/${address}/utxo-data`)
      .then((res) => res.data?.data || []),
  ]);

  return utxoData.utxo
    .filter(
      ({ height, inscriptions }) =>
        height <= Number(blockHeight) && !inscriptions.length
    )
    .map((utxo) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      satoshis: utxo.satoshi.toString(),
      scriptPk: utxo.scriptPk,
      address,
      runes: [],
    }));
}

export async function getRuneUtxos(address: string, runeId: string) {
  const utxos = await unisatApi
    .get<{
      data: {
        txid: string;
        scriptPk: string;
        vout: number;
        satoshis: number;
        runes: any[];
        addressType: number;
      }[];
    }>(`/runes/utxos?address=${address}&runeid=${runeId}`)
    .then((res) => res.data?.data || []);

  return utxos.map((utxo) => ({
    txid: utxo.txid,
    vout: utxo.vout,
    satoshis: utxo.satoshis.toString(),
    scriptPk: utxo.scriptPk,
    address,
    addressType: utxo.addressType,
    runes: utxo.runes.map((rune) => ({
      id: rune.runeid,
      amount: rune.amount,
    })),
  }));
}

export async function getBtcPrice() {
  const { price } = await unisatApi
    .get<{
      data: {
        price: number;
        updateTime: number;
      };
    }>(`/default/btc-price`)
    .then((res) => res.data?.data || {});

  return price || 0;
}

export async function getFeeSummary() {
  const data = await unisatApi
    .get<{
      data: {
        list: {
          title: string;
          desc: string;
          feeRate: number;
        }[];
      };
    }>(`/default/fee-summary`)
    .then((res) => res.data?.data.list || []);

  return data;
}

export async function getLatestBlockHeight() {
  const data = await axios
    .get("https://blockchain.info/q/getblockcount")
    .then((res) => res.data);

  return data;
}

export async function getTxInfo(txid: string) {
  const data = await mempoolApi
    .get(`tx/${txid}`)
    .then((res) => res.data)
    .catch(() => ({}));

  return data;
}

export async function getRawTx(txid: string) {
  const data = await mempoolApi
    .get(`tx/${txid}/hex`)
    .then((res) => res.data)
    .catch(() => "");

  return data;
}
