// import React, { useState, useEffect } from 'react';

// export default function TestNFTCard({
//   auctionStatus,
//   nft,
//   currentUser,
// }: {
//   auctionStatus: string
//   nft?: any,
//   currentUser?: any
// }) {
//   // 示例NFT数据
//   const defaultNft = {
//     id: '1138',
//     title: 'Cosmic Voyager #1138',
//     image: '/Auction.svg',
//     artist: 'CryptoArtist',
//     price: '2.5 ETH',
//     minBid: '0.1 ETH',
//     currentBid: '2.8 ETH',
//     auctionStatus: auctionStatus, // 'not_started', 'active', 'ended'
//     endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
//     winner: 'user123',
//     isSold: false
//   };

//   // 使用传入的NFT数据或默认数据
//   const displayNft = nft || defaultNft;

//   // 默认登录用户 (用于演示)
//   const user = currentUser || { id: 'user123' };

//   // 倒计时状态
//   const [timeLeft, setTimeLeft] = useState('');

//   // 计算倒计时
//   useEffect(() => {
//     if (displayNft.auctionStatus !== 'active') return;

//     const timer = setInterval(() => {
//       const now = new Date();
//       const end = new Date(displayNft.endTime);
//       const diff = end - now;

//       if (diff <= 0) {
//         setTimeLeft('Ended');
//         clearInterval(timer);
//         return;
//       }

//       const hours = Math.floor(diff / (1000 * 60 * 60));
//       const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
//       const seconds = Math.floor((diff % (1000 * 60)) / 1000);

//       setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
//     }, 1000);

//     return () => clearInterval(timer);
//   }, [displayNft.endTime, displayNft.auctionStatus]);

//   // 是否为获胜者
//   const isWinner = displayNft.auctionStatus === 'ended' && displayNft.winner === user.id;

//   return (
//     <div className="relative group w-full max-w-sm overflow-hidden rounded-xl bg-gray-800 border border-gray-700 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-blue-500/50">
//       {/* NFT 图片容器 */}
//       <div className="relative aspect-square w-full overflow-hidden">
//         {/* NFT 图片 */}
//         <img
//           src={displayNft.image}
//           alt={displayNft.title}
//           className={`w-full h-full object-cover transition-all duration-500 ${displayNft.auctionStatus === 'ended' && !isWinner ? 'grayscale opacity-80' : 'group-hover:scale-105'}`}
//         />

//         {/* 已售出标记 - 红色角标 */}
//         {displayNft.auctionStatus === 'ended' && !isWinner && (
//           <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden">
//             <div className="absolute -right-4 top-12 transform rotate-45 bg-red-600 text-white font-bold py-2 px-12 shadow-lg z-10">
//               SOLD
//             </div>
//           </div>
//         )}

//         {/* 赢家标记 */}
//         {isWinner && (
//           <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden">
//             <div className="absolute -right-4 top-12 transform rotate-45 bg-green-600 text-white font-bold py-2 px-12 shadow-lg z-10">
//               WON
//             </div>
//           </div>
//         )}

//         {/* 倒计时标记 - 仅在拍卖活跃时显示 */}
//         {displayNft.auctionStatus === 'active' && (
//           <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm py-2 px-3">
//             <div className="flex justify-between items-center">
//               <div className="mb-2 px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-sm font-medium animate-pulse">
//                 Live Auction
//               </div>

//               <div className="flex items-center">
//                 <span className="text-md font-medium text-gray-300">Ends in:</span>
//                 <div className="px-3 py-1 bg-gray-900/80 rounded-md text-amber-400 font-mono text-sm font-bold">
//                   {timeLeft}
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* NFT 信息 */}
//       <div className="p-4">
//         <div className="flex justify-between items-start">
//           <div>
//             <h3 className="text-lg font-bold text-white mb-1 truncate">{displayNft.title}</h3>
//             <p className="text-sm text-gray-400">by {displayNft.artist}</p>
//           </div>

//           <div className="px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 text-sm font-medium">
//             #{displayNft.id}
//           </div>
//         </div>

//         {/* 美观的分隔线 */}
//         <div className="my-4 relative">
//           <div className="absolute inset-0 flex items-center">
//             <div className="w-full border-t border-gray-700"></div>
//           </div>
//           <div className="relative flex justify-center">
//             <span className="bg-gray-800 px-3 text-xs text-gray-500 uppercase tracking-wider">Auction Status</span>
//           </div>
//         </div>

//         {/* 拍卖状态部分 - 根据状态显示不同内容 */}
//         {displayNft.auctionStatus === 'not_started' && (
//           <div className="flex justify-between items-center">
//             <div>
//               <p className="text-xs text-gray-400">Starting Bid</p>
//               <p className="text-xl font-bold text-blue-400">{displayNft.minBid}</p>
//             </div>

//             <button className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200">
//               Start Bidding
//             </button>
//           </div>
//         )}

//         {displayNft.auctionStatus === 'active' && (
//           <div className="space-y-4">
//             <div className="flex justify-between items-center">
//               <div>
//                 <p className="text-xs text-gray-400">Current Bid</p>
//                 <p className="text-xl font-bold text-blue-400">{displayNft.currentBid}</p>
//               </div>

//               <div className="flex flex-col items-end">
//                 <div className="mb-2 px-3 py-1 rounded-full bg-green-900/30 text-green-400 text-sm font-medium animate-pulse">
//                   Live Auction
//                 </div>
//               </div>
//             </div>

//             <div className="flex items-center gap-3">
//               <input
//                 type="text"
//                 placeholder="Enter bid amount"
//                 className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//               <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-medium rounded-lg shadow-md transition-all duration-200">
//                 Place Bid
//               </button>
//             </div>
//           </div>
//         )}

//         {displayNft.auctionStatus === 'ended' && (
//           <div className="space-y-4">
//             <div className="flex justify-between items-center">
//               <div>
//                 <p className="text-xs text-gray-400">Final Price</p>
//                 <p className="text-xl font-bold text-blue-400">{displayNft.currentBid}</p>
//               </div>

//               <div className="flex flex-col items-end">
//                 <div className={`mb-2 px-3 py-1 rounded-full ${isWinner ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'} text-sm font-medium`}>
//                   {isWinner ? 'You Won!' : 'Auction Ended'}
//                 </div>
//               </div>
//             </div>

//             {isWinner && (
//               <button className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                 </svg>
//                 Claim NFT
//               </button>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
