import {flow, makeAutoObservable} from "mobx";
import UrlJoin from "url-join";

class MediaStore {
  displayedContent = [];
  sidebarContent = {};
  mediaTags = {};

  showSidebar = true;
  showTagSidebar = false;
  showMultiviewSelectionModal = false;

  get client() {
    return this.rootStore.client;
  }

  get walletClient() {
    return this.rootStore.walletClient;
  }

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this);

    this.Log = this.rootStore.Log;
    this.LoadResource = this.rootStore.LoadResource;
  }

  Reset() {
    this.displayedContent = [];
    this.sidebarContent = {};
    this.mediaTags = {};

    this.showSidebar = true;
    this.showTagSidebar = false;
    this.showMultiviewSelectionModal = false;
  }

  SetDisplayedContent(displayedContent) {
    this.displayedContent = displayedContent;
  }

  SetSidebarContent(sidebarContent) {
    this.sidebarContent = sidebarContent;
  }

  SetShowSidebar(show) {
    this.showSidebar = show;
  }

  SetShowTagSidebar(show) {
    this.showTagSidebar = show;
  }

  SetShowMultiviewSelectionModal(show) {
    this.showMultiviewSelectionModal = show;
  }

  /* Tags */

  LoadMediaTags = flow(function * ({objectId, versionHash, compositionKey}) {
    if(versionHash) {
      objectId = this.client.utils.DecodeVersionHash(versionHash).objectId;
    }

    this.mediaTags = yield this.LoadResource({
      key: "MediaTags",
      id: objectId,
      Load: async () => {
        const {tracks} = await this.QueryAIAPI({
          objectId,
          path: UrlJoin("/tagstore", objectId, "tracks"),
          format: "JSON"
        });

        const formattedTrack = tracks.find(track => track.name === "game_events_all_events_beautified") ;
        const singleTrack = tracks.find(track => track.name.startsWith("game_events_all") && track.name.includes("single_track"));
        const playByPlayTracks =
          formattedTrack ? [formattedTrack] :
            singleTrack ? [singleTrack] :
              tracks.filter(track => track.name.startsWith("game_events_all"));

        let playByPlayTags = (await this.client.utils.LimitedMap(
          5,
          playByPlayTracks,
          async ({name}) => (
            await this.QueryAIAPI({
              objectId,
              path: compositionKey ?
                UrlJoin("/tagstore", "compositions", objectId, "tags") :
                UrlJoin("/tagstore", objectId, "tags"),
              queryParams: {
                channel_key: compositionKey,
                limit: 1000000,
                track: name
              },
              format: "JSON"
            })
          ).tags || []
        ))
          .filter(tags => tags)
          .flat()
          .map(tag => ({
            ...tag,
            start_time: tag.start_time / 1000,
            end_time: tag.end_time / 1000
          }))
          .sort((a, b) => a.start_time < b.start_time ? -1 : 1);

        if(formattedTrack) {
          // CSV
          playByPlayTags = playByPlayTags
            .map(tag => {
              try {
                const [action1, action2, player, team] = tag?.tag?.split(",").map(token => token.trim());

                return {
                  ...tag,
                  tag: [`${action1} ${action2}`.trim(), player, team]
                    .filter(item => item)
                    .join(" - ").toUpperCase()
                };
              } catch(error) {
                this.Log(`Error parsing tag ${JSON.stringify(tag)}`, true);
                this.Log(error, true);
              }
            });
        }

        let transcriptionTags = [];
        if(tracks.find(track => track.name === "auto_captions")) {
          transcriptionTags = (await this.QueryAIAPI({
            objectId,
            path: compositionKey ?
              UrlJoin("/tagstore", "compositions", objectId, "tags") :
              UrlJoin("/tagstore", objectId, "tags"),
            queryParams: {
              channel_key: compositionKey,
              limit: 1000000,
              track: "auto_captions"
            },
            format: "JSON"
          })).tags
            ?.sort((a, b) => a.start_time < b.start_time ? -1 : 1)
            ?.map(tag => ({
              ...tag,
              start_time: tag.start_time / 1000,
              end_time: tag.end_time / 1000
            })) || [];
        }

        let tracksMap = {};
        tracks.forEach(track =>
          tracksMap[track.name] = track
        );

        return {
          hasTags: transcriptionTags.length > 0 || transcriptionTags.length > 0,
          hasTranscription: transcriptionTags.length > 0,
          hasPlayByPlay: playByPlayTags.length > 0,
          hasChapters: false,
          tracks: tracksMap,
          transcriptionTags,
          playByPlayTags
        };
      }
    });
  });

  QueryAIAPI = flow(function * ({
    server="ai",
    method="GET",
    path,
    objectId,
    queryParams={},
    body,
    stringifyBody=true,
    authTokenInBody=false,
    headers={},
    format="json",
    allowStatus=[],
  }) {
    const url = new URL(`https://${server}.contentfabric.io/`);
    url.pathname = path;

    Object.keys(queryParams).forEach(key =>
      queryParams[key] && url.searchParams.set(key, queryParams[key])
    );

    const authToken =
      this.rootStore.authToken ||
      new URL(yield this.client.FabricUrl({
        versionHash: yield this.client.LatestVersionHash({objectId}),
        channelAuth: true
      })).searchParams.get("authorization");

    url.searchParams.set("authorization", authToken);

    if(authTokenInBody) {
      body.append ?
        body.append("authorization", authToken) :
        body.authorization = authToken;
    }

    if(body && stringifyBody) {
      body = JSON.stringify(body);
    }

    const response = yield fetch(
      url,
      {
        method,
        headers,
        body
      }
    );

    if(response.status >= 400 && !allowStatus.includes(response.status)) {
      throw response;
    }

    if(response.status === 204) {
      return;
    }

    return !format ? response :
      yield this.client.utils.ResponseToFormat(format, response);
  });
}

export default MediaStore;

