import { Tabs, TabsProps } from 'antd'
import { IntentionList } from './IntentionList'

export function SideBarContent() {

  const tabItems: TabsProps['items'] = [
		{
			key: '3',
			label: <p className='text-orange-500'>{'Transaction'}</p>,
			children: <IntentionList />
		}
	]

	return (
		<div>
			<Tabs defaultActiveKey='1' items={tabItems} />
		</div>
	)
}

function CoinList() {

}
