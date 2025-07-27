import { List, Skeleton } from "antd"
import { PoolNftList } from "components/PoolNftList"
import { usePoolList } from "hooks/usePool"

export function Pools({
}: {
}) {

  const { data: pools, isLoading } = usePoolList()

  return <div>
    {
      isLoading ?
        <Skeleton />
        :
        <List
          className='mx-auto w-full md:w-4/5 lg:w-4/5'
          itemLayout='horizontal'
          dataSource={pools}
          renderItem={pool => (
            <List.Item key={pool.address}>
              <PoolNftList poolBasic={pool} />
            </List.Item>
          )}
        />
    }

  </div>
}