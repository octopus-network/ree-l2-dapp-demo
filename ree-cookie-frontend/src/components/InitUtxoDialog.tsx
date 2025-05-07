import { cookieActor } from "../canister/cookie/actor";
import { CoinBalance } from "../types";
import { useLaserEyes } from "@omnisat/lasereyes";
import { Button, Form, FormProps, Input } from "antd";
import Modal from "antd/es/modal/Modal";
import { useSiwbIdentity } from "ic-siwb-lasereyes-connector";
import { useState } from "react";

type FieldType = {
    txid?: string;
    vout?: number;
    sats?: number;
    runeId?: string;
    runeValue?: bigint;
};

export default function InitUtxoDialog({
    isOpen,
    setIsOpen
}: {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}) {

    const onFinish: FormProps<FieldType>['onFinish'] = async (values) => {
        console.log('Success Finish form:', values);
        await cookieActor.init_utxo({
            txid: values.txid!,
            vout: Number(values.vout!),
            sats: BigInt(values.sats!),
            maybe_rune: [{
                id: values.runeId!,
                value: BigInt(values.runeValue!)
            }]
        }).then((res) => { 
            console.log("init utxo", res)
            window.location.reload();
        })
    };

    return (
        <div>
            <Modal
                title="Init Utxo"
                style={{ "paddingTop": "10px" }}
                open={isOpen}
                footer={null}
                onCancel={() => {
                    setIsOpen(false);
                }}
            >
                <Form
                    name="Init"
                    onFinish={onFinish}
                >
                    <Form.Item<FieldType>
                        label="txid"
                        name="txid"
                        rules={[{ required: true, message: 'Please input txid!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item<FieldType>
                        label="vout"
                        name="vout"
                        rules={[{ required: true, message: 'Please input vout!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item<FieldType>
                        label="sats"
                        name="sats"
                        rules={[{ required: true, message: 'Please input sats!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item<FieldType>
                        label="runeId"
                        name="runeId"
                        rules={[{ required: true, message: 'Please input runeId!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item<FieldType>
                        label="runeValue"
                        name="runeValue"
                        rules={[{ required: true, message: 'Please input runeValue!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item label={null}>
                        <Button type="primary" htmlType="submit">
                            Set Rune Info
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}