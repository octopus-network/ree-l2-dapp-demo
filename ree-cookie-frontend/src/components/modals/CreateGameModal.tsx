import { Button, Form, Input, InputNumber, Modal } from "antd";
import { atom, useAtom } from "jotai";
import type { FormProps } from "antd";
import { cookieActor, cookieActorWithIdentity } from "canister/cookie/actor";
import { useSiwbIdentity } from "ic-siwb-lasereyes-connector";

export const createGameModalOpenAtom = atom(false);

type FieldType = {
  gameName?: string;
  registerFee?: number;
  claimCoolingDown?: number;
  claimAmountPerClick?: number;
  runePremineAmount?: number;
};

export function CreateGameModal() {
  const [createGameModalOpen, setCreateGameModalOpen] = useAtom(
    createGameModalOpenAtom
  );

  const {identity, identityAddress} = useSiwbIdentity();

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    console.log("Form values:", values);
    console.log("Identity & Identity Address:", identity?.getPrincipal()!.toText(), identityAddress);
    cookieActorWithIdentity(identity!)
      .create_game({
        game_name: values.gameName!,
        gamer_register_fee: BigInt(values.registerFee!),
        claim_cooling_down: BigInt(values.claimCoolingDown!),
        claim_amount_per_click: BigInt(values.claimAmountPerClick!),
        create_address: identityAddress!,
        rune_premine_amount: BigInt(values.runePremineAmount!),
      })
      .then(() => {
        console.log("Game created successfully");
        alert("Game created successfully!");
        // reload page
        window.location.reload();
      })
      .catch((error) => {
        console.error("Error creating game:", error);
        // Handle error appropriately, e.g., show a notification
        alert("Failed to create game. Please try again.");
        setCreateGameModalOpen(false);
      });
  };

  return (
    <Modal
      title="Create Game"
      open={createGameModalOpen}
      onCancel={() => setCreateGameModalOpen(false)}
      onOk={() => {
        // Handle form submission logic here
        setCreateGameModalOpen(false);
      }}
      footer={null}
    >
      <Form 
        name="create-game"
        onFinish={onFinish}
      >
        <Form.Item<FieldType>
          label="Game Name"
          name="gameName"
          rules={[{ required: true, message: "Please input your game name!" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item<FieldType>
          label="Register Fee"
          name="registerFee"
          rules={[{ required: true, message: "Please input your register fee!" }]}
        >
          <InputNumber />
        </Form.Item>
        <Form.Item<FieldType>
          label="Click Cooling Down(Seconds)"
          name="claimCoolingDown"
          rules={[{ required: true, message: "Please input your click cooling down!" }]}
        >
          <InputNumber />
        </Form.Item>
        <Form.Item<FieldType>
          label="Claim Amount Per Click"
          name="claimAmountPerClick"
          rules={[{ required: true, message: "Please input your claim amount per click!" }]}
        >
          <InputNumber />
        </Form.Item>
         <Form.Item<FieldType>
          label="Rune Premine Amount"
          name="runePremineAmount"
          rules={[{ required: true, message: "Please input your rune premine amount!" }]}
        >
          <InputNumber />
        </Form.Item>

        <Form.Item label={null}>
          <Button
          type="primary"
          htmlType="submit"
          >Submit</Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
