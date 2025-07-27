import { UNISAT, MAGIC_EDEN, XVERSE, OKX } from "@omnisat/lasereyes";

export const WALLETS: Record<
  string,
  {
    name: string;
    icon: string;
    url: string;
  }
> = {
  [UNISAT]: {
    name: "Unisat",
    icon: "/icons/unisat.png",
    url: "https://unisat.io/download",
  },
  // [MAGIC_EDEN]: {
  //   name: "Magic Eden Wallet",
  //   icon: "/static/icons/magic_eden.png",
  //   url: "https://wallet.magiceden.io/download",
  // },
  // [PHANTOM]: {
  //   name: "Phantom",
  //   icon: "/static/icons/phantom.png",
  //   url: "https://phantom.com",
  // },
  // [XVERSE]: {
  //   name: "Xverse",
  //   icon: "/static/icons/xverse.png",
  //   url: "https://www.xverse.app",
  // },
  // [OKX]: {
  //   name: "OKX Wallet",
  //   icon: "/static/icons/okx.png",
  //   url: "https://www.okx.com",
  // },
};
