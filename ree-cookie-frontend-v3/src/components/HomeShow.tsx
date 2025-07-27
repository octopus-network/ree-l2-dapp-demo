
function scrollToElement(elementId: any) {
	const element = document.getElementById(elementId)

	if (element) {
		element.scrollIntoView({
			behavior: 'smooth', // 平滑滚动
			block: 'start' // 元素顶部与视口顶部对齐
		})
	}
}

export function HomeShow() {
	return (
		<div>
			<Title />
		</div>
	)
}

function Title() {
	return (
		<div className='flex w-full justify-around py-2'>
			<div className='px-4 text-center'>
				<h1 className='mb-2 text-white bg-clip-text text-xl font-medium md:text-6xl'>
					Fragment Ordinals NFTs into Runes
				</h1>
				<h2 className='mt-2 text-orange-500 text-2xl md:text-4xl'>
					Start an auction with Runes to redeem an NFT
				</h2>

				<div className='mt-6 flex justify-center'>
					<button
						onClick={
							() => scrollToElement('pool-list')
						}
						className='mr-4 transform rounded-sm bg-gradient-to-r from-orange-400 to-orange-500 px-8 py-3 font-bold text-black shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl'
					>
						Lock Now
					</button>
					<button
						onClick={() => scrollToElement('pool-list')}
						className='mr-4 transform rounded-sm bg-gradient-to-r from-orange-400 to-orange-500 px-8 py-3 font-bold text-black shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl'
					>
						Join Auction
					</button>
				</div>
			</div>
		</div>
	)
}

function StatisticalData() {
	return <div />
}
