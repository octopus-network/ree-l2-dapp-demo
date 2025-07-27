import { useEffect, useState } from 'react';
import { Button, Modal, Spin, Typography } from 'antd';
import { useSiwbIdentity } from 'ic-siwb-lasereyes-connector';
import { ContentType, NetworkType, ProviderType, UNISAT, useLaserEyes, WIZZ, XVERSE } from '@omnisat/lasereyes';
import { atom, useAtom } from 'jotai';

export const connectWalletModalOpenAtom = atom(false);

export default function ConnectWalletModal() {
  const [connectWalletModalOpen, setConnectWalletModalOpen] = useAtom(
    connectWalletModalOpenAtom
  );
  const p = useLaserEyes();

  const {
    address,
  } = p;

  const {
    prepareLogin,
    isPrepareLoginIdle,
    prepareLoginError,
    loginError,
    setLaserEyes,
    login,
    getAddress,
    getPublicKey,
    connectedBtcAddress,
    identity,
    identityAddress,
    identityPublicKey,
  } = useSiwbIdentity();

  const [loading, setLoading] = useState<boolean>(false);
  const [manually, setManually] = useState<boolean>(false);
  /**
   * Preload a Siwb message on every address change.
   */
  useEffect(() => {
    if (!isPrepareLoginIdle) return;
    const address = getAddress();
    const pubkey = getPublicKey();
    console.log({ address, pubkey, identityPublicKey, connectedBtcAddress });

    if (address) {
      console.log({
        address,
        // canisterId: process.env.
      });

      prepareLogin();
      console.log('prepareLogin called');
      console.log({
        connectedBtcAddress,
        identity,
        manually
      })
      if (connectedBtcAddress && !identity && manually) {
        (async () => {
          setLoading(true);
          const res = await login();
          console.log('finish login', res);
          setLoading(false);
          if (res) {
            setManually(false);
            setConnectWalletModalOpen(false);
          }
        })();
      }
    }
  }, [address, prepareLogin, isPrepareLoginIdle, getAddress, login, connectedBtcAddress, identity, manually]);

  /**
   * Show an error toast if the prepareLogin() call fails.
   */
  useEffect(() => {}, [prepareLoginError]);

  /**
   * Show an error toast if the login call fails.
   */
  useEffect(() => {}, [loginError]);

  return (
    <Modal
      className="z-50 w-80"
      open={connectWalletModalOpen}
      footer={null}
      onCancel={() => {
        setConnectWalletModalOpen(false);
      }}
    >
      <Typography.Title> Select Wallet</Typography.Title>
      {/* <div className="mt-8">
        <Button
          key="wizz"
          onClick={async () => {
            setManually(true);
            await setLaserEyes(p, WIZZ);
          }}
          disabled={loading}
          block
        >
          Wizz Wallet
        </Button>
      </div> */}
      <div className="mt-8">
        <Button
          key="unisat"
          onClick={async () => {
            setManually(true);
            await setLaserEyes(p, UNISAT);
          }}
          disabled={loading}
          block
        >
          Unisat Wallet
        </Button>
        {/* <Button
          key="xverse"
          onClick={async () => {
            setManually(true);
            await setLaserEyes(p, XVERSE);
          }}
          disabled={loading}
          block
        >
          Xverse Wallet
        </Button> */}
      </div>
      {loading && <Spin fullscreen />}
    </Modal>
  );
}
