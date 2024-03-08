import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, Redirect, useRouteMatch} from "react-router-dom";
import {checkoutStore, rootStore} from "Stores";
import UrlJoin from "url-join";
import ImageIcon from "Components/common/ImageIcon";

import {PageLoader} from "Components/common/Loaders";
import {ButtonWithLoader, LocalizeString} from "Components/common/UIComponents";
import ListingIcon from "Assets/icons/listings icon";

import BackIcon from "Assets/icons/arrow-left";
import Confirm from "Components/common/Confirm";
import NFTCard from "Components/nft/NFTCard";
import {LoginGate} from "Components/common/LoginGate";

const { ElvClient } = require("@eluvio/elv-client-js");
const Utils = require("@eluvio/elv-client-js/src/Utils");

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
        obj: obj,
        signature: "0x" + signature.toString("hex")
      }
      break;
    default:
      throw new Error(`Bad message type: ${type}`);
  }

  return res;
};

export default {
  CreateSignedMessageJSON,
  DecodeSignedMessageJSON
}
