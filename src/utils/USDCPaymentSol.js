import {
  Connection,
  PublicKey,
  Transaction
} from "@solana/web3.js";
import { setupCreatePaymentIxns } from "@eluvio/elv-paymentgate/lib/paymentgate";
import { getAssociatedTokenAddress } from "@solana/spl-token/lib/esm/state/mint.mjs";

/*
spec = {
  "endpoint":"https://api.devnet.solana.com",
  "program_id":"GxpPCk3i3eVDy8Au2hGPCHjZAzgW2HCpLo54KmzxR7Bz",
  "payer_id":"0xdb1d0eb7fcf63bcfce95a12a91ca6693ec18b2ed",
  "oracle":"FQncCDuhDeCyVWqtBj7wfBqjNfGoTxuBVnPjAWNetTAv",
  "mint":"8uZyvyKSAxgRLMCxdrcRCppYEgokH2xBLrXshL6wCzJ4",
  "payees":[
    "EeskaaMfSHSMZAfdeHEs6zy9Bc9M9EAsjftc1K3TNEyj",
    "BA4JeQgipi3NhAnHhwyXiYSewXTRQSjyCNQoC4vGYNwY"
  ],
  "amounts":[
    66660000000,
    3340000000
  ],
  "reference_id":"0xc1f476acf7214ed2a4142e64d4f2ef01"
};

 */

const SendPayment = async ({spec, payer, Sign}) => {
  const refId = "0x" + spec.reference_id.replace(/-/g, "");

  const sourceTokenAcc = await getAssociatedTokenAddress(new PublicKey(spec.mint), new PublicKey(payer));
  const connection = new Connection(spec.endpoint);

  const [payerTokens, instructions] = await setupCreatePaymentIxns({
    connection,
    programId: new PublicKey(spec.program_id),
    payer: new PublicKey(payer),
    sourceTokenAcc,
    payerId: spec.payer_id,
    refId,
    oracle: new PublicKey(spec.oracle),
    mint: new PublicKey(spec.mint),
    payees: spec.payees.map(key => new PublicKey(key)),
    amounts: spec.amounts.map(amount => BigInt(amount))
  });

  // Build txn
  let transaction = new Transaction({ feePayer: new PublicKey(payer) });
  transaction.add(...instructions);
  transaction.recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
  transaction.sign(payerTokens);
  const signedTransaction = await Sign(transaction);

  // signature
  return connection.sendRawTransaction(signedTransaction.serialize());
};

export default SendPayment;
