import { Button } from 'antd'
import { HomeShow } from 'components/HomeShow'
import { PoolList } from 'components/PoolList'

export function Home({ }: {}) {
	return (
		<div>
			<div className='flex w-full flex-col justify-around py-8'>
				<HomeShow />
				<PoolList />
			</div>
		</div>
	)
}
