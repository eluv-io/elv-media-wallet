import {ethers} from "ethers";
import EscrowAbi from "./EscrowAbi";
import ERC20Abi from "./ERC20Abi";
import {parse as uuidParse} from "uuid";

const SendPayment = async ({spec}) => {
  const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
  const address = await signer.getAddress();
  const escrow = new ethers.Contract(spec.program_id, EscrowAbi, signer);
  const token = new ethers.Contract(spec.mint, ERC20Abi, signer);

  const total = spec.amounts.reduce((sum, amount) => new ethers.utils.BigNumber(amount).add(sum), new ethers.utils.BigNumber("0"));

  // eslint-disable-next-line no-console
  console.warn("Allocating", total.toString(), "for transfer");

  await token.approve(spec.program_id, total);

  let allowance = new ethers.utils.BigNumber((await token.allowance(address, spec.program_id)).toString());
  while(allowance.lt(total)) {
    // eslint-disable-next-line no-console
    console.warn(`Allowance: ${allowance.toString()}, Total: ${total.toString()}`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    allowance = new ethers.utils.BigNumber((await token.allowance(address, spec.program_id)).toString());
  }

  const result = await escrow.createPayment(
    spec.payees,
    { paymentId: uuidParse(spec.reference_id), oracleId: spec.oracle },
    spec.mint,
    spec.amounts,
    //{ gasLimit: 10000000 }
  );

  return result.hash;
};

export default SendPayment;
