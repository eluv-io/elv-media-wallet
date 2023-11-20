import React, {useEffect, useState} from "react";
import {observer} from "mobx-react";
import {Link, useRouteMatch} from "react-router-dom";
import {NFTInfo} from "../../../utils/Utils";
import {MarketplaceItemDetails, MintedNFTDetails} from "Components/nft/NFTDetails";
import SwiperCore, {Lazy, Navigation, Keyboard} from "swiper";

SwiperCore.use([Lazy, Navigation, Keyboard]);
import {rootStore} from "Stores";
import NFTMediaBrowser from "Components/nft/media/Browser";
import NFTActiveMedia from "Components/nft/media/Active";
import ImageIcon from "Components/common/ImageIcon";
import BackIcon from "Assets/icons/arrow-left";
import {LocalizeString} from "Components/common/UIComponents";

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

  const backPage = rootStore.navigationBreadcrumbs.slice(-2)[0];

  return (
    <div className="nft-media-page">
      {
        !match.params.mediaIndex ? null :
          <NFTActiveMedia
            nftInfo={nftInfo}
            key={`nft-media-${match.params.sectionIndex}-${match.params.collectionIndex}`}
          />
      }
      {
        nftInfo.additionalMedia.isSingleList || nftInfo.additionalMedia.isSingleAlbum ? null :
          <div className="page-block page-block--lower-content page-block--media-browser">
            <div className="page-block__content page-block__content--extra-wide">
              {
                typeof match.params.mediaIndex !== "undefined" ? null :
                  <Link
                    to={match.url.split("/media")[0]}
                    className="details-page__back-link nft-media-browser__back-link"
                  >
                    <ImageIcon icon={BackIcon}/>
                    <div className="details-page__back-link__text ellipsis">
                      {LocalizeString(rootStore.l10n.actions.back_to, {thing: backPage.name})}
                    </div>
                  </Link>
              }
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
