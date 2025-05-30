import { useLaserEyes } from "@omnisat/lasereyes";
import { useSiwbIdentity } from "ic-siwb-lasereyes-connector";
import {Button} from "antd";

export function AccountButton({ }: {
}) {
    // const { address, provider, signMessage } = useLaserEyes();

    const { address, paymentAddress, connect, disconnect,signMessage } = useLaserEyes();
    const { isInitializing, identity, identityAddress, clear } = useSiwbIdentity();

    if(isInitializing) {
        return null
    }

    return <div className="flex items-start">
        { <div>{identity?.getPrincipal().toText()}</div>}
        <div className="mr-5">{identityAddress}</div>
        <div className="mr-5">address: {address}</div>
        <div className="mr-5">payment address: {paymentAddress}</div>
        <Button onClick={()=>{clear(); disconnect()}}>logout</Button>
        {/* <button>
            {address}
        </button> */}
    </div>
}