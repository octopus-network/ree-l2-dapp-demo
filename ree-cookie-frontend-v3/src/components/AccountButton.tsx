import { useLaserEyes } from '@omnisat/lasereyes'
import { Button, Drawer, Skeleton } from 'antd'
import { SideBarContent } from 'layout/sidebar/Sidebar'
import { useState } from 'react'
import {
	ArrowDown,
	ChevronDown,
	ChevronRight,
	ChevronsRight
} from 'react-feather'
import { Link, useNavigate } from 'react-router-dom'
import { createStyles } from 'antd-style';
import { DrawerClassNames, DrawerStyles } from 'antd/es/drawer/DrawerPanel'

export function AccountButton() {
	const {
		address,
		isInitializing,
		paymentAddress,
		connect,
		disconnect,
		signMessage
	} = useLaserEyes()
	const [open, setOpen] = useState(false)

	const drawerStyles: DrawerStyles = {
    mask: {
      backdropFilter: 'blur(10px)',
    },
    content: {
			backgroundColor: 'black',
    },
    header: {
			// backgroundColor: 'black',
      // borderBottom: `1px solid`,
    },
    body: {
			// backgroundColor: 'black',
    },
    footer: {
      borderTop: `1px solid`,
    },
  };


	return (
		<div>
			{isInitializing ? (
				<Skeleton />
			) : (
				<div className='flex items-center '>
					<div
						onClick={() => setOpen(true)}
						className='text-foreground relative flex cursor-pointer items-center rounded-sm border border-orange-500 px-3 text-xl font-medium text-orange-500 md:text-2xl'
					>
						{shortenAddress(address)}
						<ChevronDown />
					</div>
					<button
						onClick={disconnect}
						className='ml-2 rounded-full bg-red-500/20 p-2 transition-all hover:bg-red-500/30'
					>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							className='h-5 w-5 text-red-400'
							fill='none'
							viewBox='0 0 24 24'
							stroke='currentColor'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
							/>
						</svg>
					</button>
				</div>
			)}
			<Drawer
				closeIcon={<ChevronsRight className='text-blue-300' />}
				onClose={() => setOpen(false)}
				width={500}
				open={open}
				// className='bg-black'
				// style={{backgroundColor: 'gray'}}
				// maskClassName='bg-green-500 opacity-90'
				// rootClassName='bg-black/60 opacity-70 transition-opacity'

				// classNames={classNames}
				styles={drawerStyles}
				
				
				
			>
				<SideBarContent />
			</Drawer>
		</div>
	)
}

export const shortenAddress = (addr: string) => {
	if (!addr) return ''
	return `${addr.slice(0, 6)}...${addr.slice(Math.max(0, addr.length - 4))}`
}
