import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {useRouteMatch} from "react-router-dom";
import {NFTInfo} from "../../../utils/Utils";
import {MarketplaceItemDetails, MintedNFTDetails} from "Components/nft/NFTDetails";
import SwiperCore, {Lazy, Navigation, Keyboard} from "swiper";

SwiperCore.use([Lazy, Navigation, Keyboard]);
import {rootStore} from "Stores";
import NFTMediaBrowser from "Components/nft/media/Browser";
import NFTActiveMedia from "Components/nft/media/Active";

export const NFTMediaContainer = observer(({nftInfo, nft, item, browserOnly}) => {
  const match = useRouteMatch();
  const [loaded, setLoaded] = useState(false);

  if(!nftInfo) {
    nftInfo = NFTInfo({nft, item});
  }
  window.nftInfo = nftInfo;

  useEffect(() => {
    rootStore.CheckViewedMedia({
      nft: nftInfo.nft,
      mediaIds: nftInfo.watchedMediaIds,
      preview: !nftInfo.nft.details.TokenIdStr
    })
      .finally(() => setLoaded(true));

    const mediaViewedInterval = setInterval(() => {
      rootStore.CheckViewedMedia({
        nft: nftInfo.nft,
        mediaIds: nftInfo.watchedMediaIds,
        preview: !nftInfo.nft.details.TokenIdStr
      });
    }, 60000);

    return () => clearInterval(mediaViewedInterval);
  }, []);

  if(!loaded) { return null; }

  if(browserOnly) {
    return <NFTMediaBrowser nftInfo={nftInfo} />;
  }

  return (
    <div className="nft-media-page" id="top-scroll-target">
      <NFTActiveMedia nftInfo={nftInfo} key={`nft-media-${match.params.sectionIndex}-${match.params.collectionIndex}`} />
      {
        nftInfo.additionalMedia.isSingleList || nftInfo.additionalMedia.isSingleAlbum ? null :
          <div className="page-block page-block--lower-content page-block--media-browser">
            <div className="page-block__content page-block__content--unrestricted">
              <NFTMediaBrowser nftInfo={nftInfo} />
            </div>
          </div>
      }
    </div>
  );
});

const NFTMediaWrapper = (props) => {
  const match = useRouteMatch();

  if(match.params.sku) {
    return (
      <MarketplaceItemDetails
        Render={({item}) => <NFTMediaContainer item={item} {...props} />}
      />
    );
  }

  return (
    <MintedNFTDetails
      Render={({nft}) => <NFTMediaContainer nft={nft} {...props} />}
    />
  );
};

export default NFTMediaWrapper;
