import { OwnedNfts } from 'components/OwnedNftList'
import { useParams } from 'react-router-dom'

export function Profile() {
	const { address } = useParams()

	return (
		<div>
			<h1>Profile</h1>
			<h1>Owned NFT</h1>
			{/* <OwnedNfts address={address!} /> */}
			<p>This is the profile page.</p>
			<p>
				Here you can manage your account settings, view your activity, and more.
			</p>
			<p>Currently, this page is under construction.</p>
		</div>
	)
}
