import UrlJoin from "url-join";

export const MediaLinkPath = ({match, sectionId, collectionId, mediaIndex, autoplay}) => {
  let path = match.url.split("/media")[0];

  if(sectionId === "list") {
    path = UrlJoin(path, "media", "list", mediaIndex.toString());
  } else if(sectionId === "featured") {
    path = UrlJoin(path, "media", "featured", mediaIndex.toString());
  } else {
    path = UrlJoin(path, "media", sectionId, collectionId, mediaIndex.toString());
  }

  if(autoplay) {
    path = path + "?ap=1";
  }

  return path;
};

export const NavigateToMedia = ({match, history, sectionId, collectionId, mediaIndex, autoplay}) => {
  history.push(MediaLinkPath({match, sectionId, collectionId, mediaIndex, autoplay}));
};

export const MediaImageUrl = ({mediaItem, maxWidth}) => {
  let imageUrl = mediaItem.image || (mediaItem.media_type === "Image" && mediaItem.media_file?.url);

  if(imageUrl && maxWidth){
    imageUrl = new URL(imageUrl);
    imageUrl.searchParams.set("width", maxWidth);
    imageUrl = imageUrl.toString();
  }

  return imageUrl;
};

export const AvailableMedia = ({additionalMedia, sectionId, collectionId, mediaIndex}) => {
  let sectionIndex = 0;
  let collectionIndex = 0;
  mediaIndex = parseInt(mediaIndex);

  let display = "Media";
  let availableMediaList = [];
  let currentListIndex = 0;
  switch(sectionId) {
    case "list":
      display = additionalMedia.sections[0].collections[0].display;
      availableMediaList = additionalMedia.sections[0].collections[0].media
        .map((mediaItem, mediaIndex) => ({ display, sectionId, sectionIndex, collectionId, collectionIndex, mediaIndex, mediaItem }));
      currentListIndex = mediaIndex;
      break;
    case "featured":
      availableMediaList = [{ display, sectionId, sectionIndex, collectionId, collectionIndex, mediaIndex, mediaItem: additionalMedia.featured_media[mediaIndex] }];
      currentListIndex = 0;
      break;
    default:
      let listIndex = 0;
      additionalMedia.sections.forEach((section, sIndex) => {
        section.collections.forEach((collection, cIndex) => {
          collection.media.forEach((mediaItem, mIndex) => {
            availableMediaList[listIndex] = {
              display: collection.display,
              sectionId: section.id,
              sectionIndex: sIndex,
              collectionId: collection.id,
              collectionIndex: cIndex,
              mediaIndex: mIndex,
              mediaId: mediaItem.id,
              mediaItem,
              listIndex
            };

            if(sectionId === section.id && collectionId === collection.id && mediaIndex === mIndex) {
              currentListIndex = listIndex;
            }

            listIndex += 1;
          });
        });
      });
      break;
  }

  return { availableMediaList, currentListIndex };
};
