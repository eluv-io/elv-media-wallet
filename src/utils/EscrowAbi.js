export default [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes16",
        "name": "paymentId",
        "type": "bytes16"
      }
    ],
    "name": "Canceled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes16",
        "name": "paymentId",
        "type": "bytes16"
      }
    ],
    "name": "Claimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes16",
        "name": "paymentId",
        "type": "bytes16"
      }
    ],
    "name": "Created",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "_amounts",
        "type": "uint256[]"
      }
    ],
    "name": "calculateTotal",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "total",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes16",
        "name": "_paymentId",
        "type": "bytes16"
      }
    ],
    "name": "cancelPayment",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes16",
        "name": "_paymentId",
        "type": "bytes16"
      }
    ],
    "name": "claimPayment",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "_receivers",
        "type": "address[]"
      },
      {
        "components": [
          {
            "internalType": "bytes16",
            "name": "paymentId",
            "type": "bytes16"
          },
          {
            "internalType": "address",
            "name": "oracleId",
            "type": "address"
          }
        ],
        "internalType": "struct ERC20Payments.Payment",
        "name": "_payment",
        "type": "tuple"
      },
      {
        "internalType": "address",
        "name": "_tokenContract",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "_amounts",
        "type": "uint256[]"
      }
    ],
    "name": "createPayment",
    "outputs": [
      {
        "internalType": "bytes16",
        "name": "paymentId",
        "type": "bytes16"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes16",
        "name": "_paymentId",
        "type": "bytes16"
      }
    ],
    "name": "getPayment",
    "outputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "address[]",
        "name": "receivers",
        "type": "address[]"
      },
      {
        "internalType": "address",
        "name": "tokenContract",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      },
      {
        "internalType": "address",
        "name": "oracle",
        "type": "address"
      },
      {
        "internalType": "enum ERC20Payments.PaymentState",
        "name": "state",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
