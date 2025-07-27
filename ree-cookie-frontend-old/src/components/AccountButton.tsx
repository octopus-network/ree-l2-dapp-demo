import { UNISAT, useLaserEyes } from "@omnisat/lasereyes";
import { Skeleton } from "antd";
import { useSiwbIdentity } from "ic-siwb-lasereyes-connector";
import { useEffect, useState } from "react";

export function AccountButton() {
  const laserEyes = useLaserEyes();
  const { address, isInitializing, disconnect, isConnecting } = laserEyes;
  const {
    login,
    prepareLogin,
    identity,
    identityAddress,
    clear,
    getAddress,
    setLaserEyes,
    isPrepareLoginIdle,
    connectedBtcAddress,
    isInitializing: isSiwbInitializing,
  } = useSiwbIdentity();

  // const [loading, setLoading] = useState<boolean>(false);
  const [manually, setManually] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      if (
        !isPrepareLoginIdle ||
        isInitializing ||
        isConnecting ||
        isSiwbInitializing
      ) {
        return;
      }

      const address = getAddress();
      if (address) {

        await setLaserEyes(laserEyes, UNISAT);

        prepareLogin();
        if (connectedBtcAddress && !identity && manually) {
          (async () => {
            // setLoading(true);
            const res = await login();
            // setLoading(false);
            if (res) {
              setManually(false);
              // setIsOpen(false);
            }
          })();
        }
      }

      // if (!identityAddress || identityAddress !== address) {
      //   setIsHandling(true);
      //   console.log("identityAddress not match, clear and setLaserEyes");
      //   clear();
      //   await setLaserEyes(laserEyes, UNISAT);
      //   console.log('before prepare login', {address})
      //   prepareLogin();
      //   const res = await login();
      //   console.log("finish login", res);
      // }
    })();
  }, [
    prepareLogin, 
    isPrepareLoginIdle, 
    getAddress, 
    login, 
    connectedBtcAddress, 
    identity, 
    manually
  ]);

  return (
    <div>
      {isInitializing ? (
        <Skeleton />
      ) : (
        <div className="flex items-center ">
          {identity && (
            <div className="text-foreground relative flex items-center rounded-sm border border-orange-500 px-3 text-xl font-medium text-orange-500 md:text-2xl">
              {shortenAddress(identity?.getPrincipal().toText())}
            </div>
          )}

          <div className="text-foreground relative flex items-center rounded-sm border border-orange-500 px-3 text-xl font-medium text-orange-500 md:text-2xl">
            {shortenAddress(address)}
          </div>
          <button
            onClick={() => {
              clear();
              disconnect();
            }}
            className="ml-2 rounded-full bg-red-500/20 p-2 transition-all hover:bg-red-500/30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export const shortenAddress = (addr: string) => {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(Math.max(0, addr.length - 4))}`;
};
