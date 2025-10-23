import { Button, Form, Input } from "antd";
import Search from "antd/es/input/Search";
import { COOKIE_CANISTER_ID, cookieActor } from "canister/cookie/actor";
import { useEtchingRequest } from "hooks/use-pool";
import { useState } from "react";

export function Etch() {
  return (
    <div>
      <Etching />
    </div>
  );
}

type FieldType = {
  rune_name?: string;
  symbol?: string;
  premine?: string;
  premine_receiver?: string;
  divisibility?: string;
};

function Etching({}: {}) {
  const [isEtching, setIsEtching] = useState<boolean>(false);
  const [commitList, setCommitList] = useState<string[]>([]);

  const onFinish = (values: FieldType) => {
    cookieActor.etch({
      terms: [],
      turbo: false,
      premine: values.premine ? [BigInt(values.premine)] : [],
      logo: [],
      rune_name: values.rune_name || "",
      divisibility: values.divisibility ? [Number(values.divisibility)] : [],
      premine_receiver: values.premine_receiver || "",
      symbol: values.symbol ? [values.symbol] : [],
    });
  };

  return (
    <div className="flex flex-col items-center text-black">
      <div className="w-100 m-10">
        <p>
          Please transfer 1 $ICP to this canister before etch: <br />
          <p className="text-blue-500 text-xl font-medium my-2">
            {COOKIE_CANISTER_ID}
          </p>{" "}
        </p>

        <p className="mt-2 text-sm text-gray-500">
          Find a usable Rune Name on
          <a
            className="text-blue-500 underline ml-1"
            href="https://testnet4.unisat.io/runes/inscribe?tab=etch"
            target="_blank"
            rel="noopener noreferrer"
          >
            Unisat
          </a>
        </p>
      </div>

      <Form onFinish={onFinish}>
        <Form.Item<FieldType> name="rune_name" label="Rune Name">
          <Input placeholder="Enter something" />
        </Form.Item>
        <Form.Item<FieldType> name="symbol" label="Symbol(optional)">
          <Input placeholder="Enter something" />
        </Form.Item>
        <Form.Item<FieldType> name="premine" label="Premine(optional)">
          <Input placeholder="Enter something" />
        </Form.Item>
        <Form.Item<FieldType>
          name="divisibility"
          label="Divisibility(optional)"
        >
          <Input placeholder="Enter something" />
        </Form.Item>
        <Form.Item<FieldType>
          name="premine_receiver"
          label="Premine Receiver(optional)"
        >
          <Input placeholder="Enter something" />
        </Form.Item>
        <Form.Item>
          <Button htmlType="submit" type="primary">
            Etch
          </Button>
        </Form.Item>
      </Form>

        <Search
        style={{ width: 400, marginTop: 20 }}
          placeholder="Search Receiver history"
          onSearch={value => {
            cookieActor.query_etching_list(value).then(res => {
                setCommitList(res);
            })
          }}
        />

        {
            commitList.map((commit_txid) => (
              <EtchRecord key={commit_txid} commit_txid={commit_txid} />
            ))
        }
    </div>
  );
}

function EtchRecord({ commit_txid }: { commit_txid: string }) {
  const {
    data: etchingRequest,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useEtchingRequest(commit_txid);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const status = Object.keys(etchingRequest![0]!.status)[0];

  const isFinal = status === "Final";

  return (
    <div>
      <p>Rune Name: {etchingRequest![0]!.etching_args.rune_name}</p>
      <p>Premine: {etchingRequest![0]!.etching_args.premine}</p>
      <p>Commit ID: {commit_txid}</p>
      <p>Reveal ID: {etchingRequest![0]!.reveal_txid}</p>
      <p className="flex">
        Status:{" "}
        <p className={isFinal ? "text-green-500 ml-1" : "text-yellow-500 ml-1"}>
          {Object.keys(etchingRequest![0]!.status)[0]}
        </p>
      </p>
      <p>
        Create At:{" "}
        {new Date(
          Number(etchingRequest![0]!.time_at / BigInt(1000000))
        ).toLocaleString()}
      </p>
      {!isFinal && (
        <Button
          loading={isFetching}
          onClick={() => {
            refetch();
          }}
        >
          Sync
        </Button>
      )}
    </div>
  );
}
