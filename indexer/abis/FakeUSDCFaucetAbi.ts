export const FakeUSDCFaucetAbi = [
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "user",   type: "address", indexed: true,  internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
  },
] as const;
