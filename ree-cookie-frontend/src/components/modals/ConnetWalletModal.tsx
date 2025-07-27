// "use client";

// import { atom, useAtom, useSetAtom } from "jotai";

// import { Image, Modal, Skeleton, Typography, notification } from "antd";
// import type { ProviderType } from "@omnisat/lasereyes";
// import {
//   MAGIC_EDEN,
//   OKX,
//   PHANTOM,
//   UNISAT,
//   XVERSE,
//   useLaserEyes,
// } from "@omnisat/lasereyes";
// import { useCallback, useEffect, useMemo, useState } from "react";
// import { WALLETS } from "../../constants/wallet";
// import { cn } from "utils/common";
// import { useSiwbIdentity } from "ic-siwb-lasereyes-connector";

// const { Text, Link } = Typography;

// export const connectWalletModalOpenAtom = atom(false);

// export function ConnectWalletModal() {
//   const [connectWalletModalOpen, setConnectWalletModalOpen] = useAtom(
//     connectWalletModalOpenAtom
//   );

//   return (
//     <Modal
//       className="z-50 w-80"
//       open={isOpen}
//       footer={null}
//       onCancel={() => {
//         setIsOpen(false);
//       }}
//     >
//       <Typography.Title> Select Wallet</Typography.Title>
//       <div className="mt-8">
//         <Button
//           key="wizz"
//           onClick={async () => {
//             setManually(true);
//             await setLaserEyes(p, WIZZ);
//           }}
//           disabled={loading}
//           block
//         >
//           Wizz Wallet
//         </Button>
//       </div>
//       <div className="mt-8">
//         <Button
//           key="unisat"
//           onClick={async () => {
//             setManually(true);
//             await setLaserEyes(p, UNISAT);
//           }}
//           disabled={loading}
//           block
//         >
//           Unisat Wallet
//         </Button>
//         <Button
//           key="xverse"
//           onClick={async () => {
//             setManually(true);
//             await setLaserEyes(p, XVERSE);
//           }}
//           disabled={loading}
//           block
//         >
//           Xverse Wallet
//         </Button>
//       </div>
//       {loading && <Spin fullscreen />}
//     </Modal>
//   );
// }

// function WalletRow({ wallet }: { wallet: ProviderType }) {
//   const laserEyes = useLaserEyes();
//   const {
//     connect,
//     isConnecting,
//     hasOkx,
//     hasUnisat,
//     hasPhantom,
//     hasXverse,
//     hasMagicEden,
//     paymentAddress,
//   } = laserEyes;

//   const [connectingWallet, setConnectingWallet] = useState<string>();
//   const setConnectWalletModalOpen = useSetAtom(connectWalletModalOpenAtom);

//   const installed = useMemo(() => {
//     const hasInstalled: Record<string, boolean> = {
//       [UNISAT]: hasUnisat,
//       [OKX]: hasOkx,
//       [PHANTOM]: hasPhantom,
//       [MAGIC_EDEN]: hasMagicEden,
//       [XVERSE]: hasXverse,
//     };

//     return hasInstalled[wallet];
//   }, [wallet, hasXverse, hasOkx, hasUnisat, hasPhantom, hasMagicEden]);

//   const onConnectWallet = useCallback(async () => {
//     // if (!installed) {
//     //   window.open(WALLETS[wallet].url, "_blank");
//     //   return;
//     // }
//     setConnectingWallet(wallet);

//     try {
//       console.log("onConnectWallet", { wallet });
//       await connect(wallet);
//       setConnectWalletModalOpen(false);
//       setConnectingWallet(undefined);
//     } catch (error) {
//       console.log(error);
//       setConnectingWallet(undefined);
//     }
//   }, [
//     setConnectingWallet,
//     setConnectWalletModalOpen,
//     connect,
//     wallet,
//     installed,
//   ]);

//   return (
//     <div
//       className={cn(
//         "bg-secondary/70 hover:bg-secondary flex cursor-pointer items-center justify-between px-3 py-2 first:rounded-t-lg last:rounded-b-lg",
//         isConnecting &&
//           connectingWallet !== wallet &&
//           "pointer-events-none opacity-50"
//       )}
//       onClick={onConnectWallet}
//     >
//       <div className="flex items-center">
//         <div className="flex size-10 items-center justify-center">
//           {connectingWallet === wallet ? (
//             <Skeleton />
//           ) : (
//             <Image
//               src={WALLETS[wallet]!.icon}
//               className="size-4 rounded-lg"
//               alt={WALLETS[wallet]!.name}
//             />
//           )}
//         </div>
//         <span className="ml-2 text-lg font-semibold">
//           {WALLETS[wallet]!.name}
//         </span>
//       </div>
//       {installed ? (
//         <span className="text-muted-foreground/80 text-xs">Detected</span>
//       ) : null}
//     </div>
//   );
// }
