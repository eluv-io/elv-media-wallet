export const MediaItemScheduleInfo = mediaItem => {
  const isLiveVideoType =
    mediaItem &&
    mediaItem?.type === "media" &&
    mediaItem.media_type === "Video" &&
    mediaItem.live_video;

  if(!isLiveVideoType) {
    return {
      isLiveContent: false
    };
  }

  try {
    const now = new Date();
    const startTime = mediaItem.start_time && new Date(mediaItem.start_time);
    const endTime = mediaItem.end_time && new Date(mediaItem.end_time);
    const started = !startTime || now > startTime;
    const ended = endTime && now > endTime;
    const currentLocale = (navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language;
    const displayStartDate = startTime?.toLocaleDateString(currentLocale, {day: "numeric", month: "numeric"}).replace(/0(\d)/g, "$1");
    const displayStartTime = startTime?.toLocaleTimeString(currentLocale, {hour: "numeric", minute: "numeric"}).replace(/^0(\d)/, "$1");

    return {
      startTime,
      endTime,
      isLiveContent: true,
      currentlyLive: started && !ended,
      started,
      ended,
      displayStartDate,
      displayStartTime
    };
  } catch(error) {
    // eslint-disable-next-line no-console
    console.error(`Error parsing start/end time in media item ${mediaItem.name}`);
    // eslint-disable-next-line no-console
    console.error(error);

    return {
      isLiveContent: false
    };
  }
};
