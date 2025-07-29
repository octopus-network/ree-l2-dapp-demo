import { useLaserEyes } from "@omnisat/lasereyes";

interface ConnectWalletFirstButtonProps {
  children: React.ReactNode;
  onClick?: (e: MouseEvent) => void;
}

// export function ConnectWalletFirstButton() {
//   const {
//     publicKey,
//     paymentPublicKey,
//     paymentAddress,
//     address,
//     signPsbt,
//     provider,
//   } = useLaserEyes();



//   return <button className="border">Connect Wallet First</button>;
// }
