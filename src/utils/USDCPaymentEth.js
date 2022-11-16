import {ethers} from "ethers";
import EscrowAbi from "./EscrowAbi";
import ERC20Abi from "./ERC20Abi";
import {parse as uuidParse} from "uuid";

const SendPayment = async ({spec, usdcContractAddress}) => {
  const signer = (new ethers.providers.Web3Provider(window.ethereum)).getSigner();
  const address = await signer.getAddress();
  const escrow = new ethers.Contract(spec.program_id, EscrowAbi, signer);
  const token = new ethers.Contract(usdcContractAddress, ERC20Abi, signer);

  const total = spec.amounts.reduce((sum, amount) => sum + parseFloat(amount), 0);

  let allowance = parseFloat((await token.allowance(address, spec.program_id)).toString());
  // eslint-disable-next-line no-console
  console.warn("Allocating", total - allowance, "for transfer");
  await token.approve(spec.program_id, total - allowance);
  while(allowance < total) {
    // eslint-disable-next-line no-console
    console.warn(`Allowance: ${allowance}, Total: ${total}`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    allowance = parseFloat((await token.allowance(address, spec.program_id)).toString());
  }

  const result = await escrow.createPayment(
    spec.payees,
    { paymentId: uuidParse(spec.reference_id), oracleId: spec.oracle },
    usdcContractAddress,
    spec.amounts,
    { gasLimit: 10000000 }
  );

  return result.hash;
};

export default SendPayment;
