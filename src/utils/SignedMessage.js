const Utils = require("@eluvio/elv-client-js/src/Utils");

//
//
// this will move to elv-client-js via https://github.com/eluv-io/elv-client-js/pull/267
//
//


// Create a signed JSON message
const CreateSignedMessageJSON = async ({
  client,
  obj,
}) => {

  // Only one kind of signature supported currently
  const type = "mje_" // JSON message, EIP192 signature
  const msg = JSON.stringify(obj);

  const signature = await client.PersonalSign({message: msg, addEthereumPrefix: true});
  return `${type}${Utils.B58(
    Buffer.concat([
      Buffer.from(signature.replace(/^0x/, ""), "hex"),
      Buffer.from(msg)
    ])
  )}`;
}

// Decode a signed JSON message
const DecodeSignedMessageJSON = async ({
  signedMessage
}) => {
  const type = signedMessage.slice(0,4);
  let res = {};
  switch(type) {
    case "mje_":
      const msgBytes = Utils.FromB58(signedMessage.slice(4));
      const signature = msgBytes.slice(0, 65);
      const msg = msgBytes.slice(65);
      const obj = JSON.parse(msg);
      res = {
        type: type,
        message: obj,
        signature: "0x" + signature.toString("hex"),
      };
      break;
    default:
      throw new Error(`Bad message type: ${type}`);
  }

  return res;
};

export {
  CreateSignedMessageJSON,
  DecodeSignedMessageJSON,
};
