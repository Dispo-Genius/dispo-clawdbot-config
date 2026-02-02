/**
 * Twitter API client using cookie-based authentication.
 * Uses Twitter's internal GraphQL API with auth cookies.
 */

const GRAPHQL_API = 'https://twitter.com/i/api/graphql';
const REST_API = 'https://api.twitter.com';

interface TwitterConfig {
  authToken: string;
  ct0: string;
}

function getConfig(): TwitterConfig {
  const authToken = process.env.TWITTER_AUTH_TOKEN;
  const ct0 = process.env.TWITTER_CT0;

  if (!authToken || !ct0) {
    throw new Error(
      'Missing Twitter credentials. Set TWITTER_AUTH_TOKEN and TWITTER_CT0 in ~/.clawdbot/credentials.json'
    );
  }

  return { authToken, ct0 };
}

function getHeaders(config: TwitterConfig): Record<string, string> {
  return {
    'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'Cookie': `auth_token=${config.authToken}; ct0=${config.ct0}`,
    'X-Csrf-Token': config.ct0,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'X-Twitter-Active-User': 'yes',
    'X-Twitter-Auth-Type': 'OAuth2Session',
    'X-Twitter-Client-Language': 'en',
  };
}

export interface Tweet {
  id: string;
  text: string;
  author: string;
  authorId: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  description: string;
  followers: number;
  following: number;
  tweets: number;
  verified: boolean;
}

// GraphQL query IDs (these can change, update as needed)
const QUERY_IDS = {
  CreateTweet: 'SoVnbfCycZ7fERGCwpZkYA',
  HomeTimeline: 'HJFjzBgCs16TqxewQOeLNg',
  SearchAdaptive: 'gkjsKepM6gl_HmFWoWKfgg',
  UserByScreenName: 'G3KGOASz96M-Qu0nwmGXNg',
  TweetDetail: 'VWFGPVAGkZMGRKGe3GFFnA',
};

export async function postTweet(text: string): Promise<Tweet> {
  const config = getConfig();
  const headers = getHeaders(config);

  const variables = {
    tweet_text: text,
    dark_request: false,
    media: { media_entities: [], possibly_sensitive: false },
    semantic_annotation_ids: [],
  };

  const features = {
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: false,
    tweet_awards_web_tipping_enabled: false,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    responsive_web_media_download_video_enabled: false,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_enhance_cards_enabled: false,
  };

  const response = await fetch(`${GRAPHQL_API}/${QUERY_IDS.CreateTweet}/CreateTweet`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ variables, features, queryId: QUERY_IDS.CreateTweet }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to post tweet: ${response.status} ${text}`);
  }

  const data = await response.json();
  const result = data?.data?.create_tweet?.tweet_results?.result;

  if (!result) {
    throw new Error('Failed to post tweet: no result returned');
  }

  return parseTweet(result);
}

export async function getTimeline(count: number = 20): Promise<Tweet[]> {
  const config = getConfig();
  const headers = getHeaders(config);

  const variables = {
    count,
    includePromotedContent: false,
    latestControlAvailable: true,
    withCommunity: true,
  };

  const features = {
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false,
  };

  const url = new URL(`${GRAPHQL_API}/${QUERY_IDS.HomeTimeline}/HomeTimeline`);
  url.searchParams.set('variables', JSON.stringify(variables));
  url.searchParams.set('features', JSON.stringify(features));

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get timeline: ${response.status} ${text}`);
  }

  const data = await response.json();
  const entries = data?.data?.home?.home_timeline_urt?.instructions?.[0]?.entries ?? [];

  return entries
    .filter((e: any) => e.content?.itemContent?.tweet_results?.result)
    .map((e: any) => parseTweet(e.content.itemContent.tweet_results.result))
    .slice(0, count);
}

export async function searchTweets(query: string, count: number = 20): Promise<Tweet[]> {
  const config = getConfig();
  const headers = getHeaders(config);

  const variables = {
    rawQuery: query,
    count,
    querySource: 'typed_query',
    product: 'Latest',
  };

  const features = {
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false,
  };

  const url = new URL(`${GRAPHQL_API}/${QUERY_IDS.SearchAdaptive}/SearchTimeline`);
  url.searchParams.set('variables', JSON.stringify(variables));
  url.searchParams.set('features', JSON.stringify(features));

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to search tweets: ${response.status} ${text}`);
  }

  const data = await response.json();
  const instructions = data?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions ?? [];
  const entries = instructions.find((i: any) => i.type === 'TimelineAddEntries')?.entries ?? [];

  return entries
    .filter((e: any) => e.content?.itemContent?.tweet_results?.result)
    .map((e: any) => parseTweet(e.content.itemContent.tweet_results.result))
    .slice(0, count);
}

export async function getUser(username: string): Promise<User> {
  const config = getConfig();
  const headers = getHeaders(config);

  const variables = {
    screen_name: username.replace(/^@/, ''),
    withSafetyModeUserFields: true,
  };

  const features = {
    hidden_profile_likes_enabled: true,
    hidden_profile_subscriptions_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    subscriptions_verification_info_is_identity_verified_enabled: true,
    subscriptions_verification_info_verified_since_enabled: true,
    highlights_tweets_tab_ui_enabled: true,
    responsive_web_twitter_article_notes_tab_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true,
  };

  const url = new URL(`${GRAPHQL_API}/${QUERY_IDS.UserByScreenName}/UserByScreenName`);
  url.searchParams.set('variables', JSON.stringify(variables));
  url.searchParams.set('features', JSON.stringify(features));

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get user: ${response.status} ${text}`);
  }

  const data = await response.json();
  const result = data?.data?.user?.result;

  if (!result) {
    throw new Error(`User @${username} not found`);
  }

  return parseUser(result);
}

export async function getTweet(tweetId: string): Promise<Tweet> {
  const config = getConfig();
  const headers = getHeaders(config);

  const variables = {
    focalTweetId: tweetId,
    with_rux_injections: false,
    includePromotedContent: false,
    withCommunity: true,
    withQuickPromoteEligibilityTweetFields: true,
    withBirdwatchNotes: true,
    withVoice: true,
    withV2Timeline: true,
  };

  const features = {
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false,
  };

  const url = new URL(`${GRAPHQL_API}/${QUERY_IDS.TweetDetail}/TweetDetail`);
  url.searchParams.set('variables', JSON.stringify(variables));
  url.searchParams.set('features', JSON.stringify(features));

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get tweet: ${response.status} ${text}`);
  }

  const data = await response.json();
  const entries = data?.data?.tweetResult?.result?.timeline_response?.timeline?.instructions?.[0]?.entries ?? [];
  const tweetEntry = entries.find((e: any) => e.entryId?.startsWith('tweet-'));
  const result = tweetEntry?.content?.itemContent?.tweet_results?.result;

  if (!result) {
    throw new Error(`Tweet ${tweetId} not found`);
  }

  return parseTweet(result);
}

function parseTweet(result: any): Tweet {
  // Handle tombstones and restricted tweets
  if (result.__typename === 'TweetTombstone') {
    return {
      id: 'tombstone',
      text: result.tombstone?.text?.text || '[Tweet unavailable]',
      author: 'unknown',
      authorId: 'unknown',
      createdAt: '',
      likes: 0,
      retweets: 0,
      replies: 0,
    };
  }

  const tweet = result.tweet || result;
  const legacy = tweet.legacy || tweet;
  const user = tweet.core?.user_results?.result?.legacy || {};

  return {
    id: legacy.id_str || tweet.rest_id,
    text: legacy.full_text || legacy.text || '',
    author: user.screen_name || 'unknown',
    authorId: user.id_str || '',
    createdAt: legacy.created_at || '',
    likes: legacy.favorite_count || 0,
    retweets: legacy.retweet_count || 0,
    replies: legacy.reply_count || 0,
  };
}

function parseUser(result: any): User {
  const legacy = result.legacy || {};

  return {
    id: result.rest_id,
    username: legacy.screen_name,
    name: legacy.name,
    description: legacy.description || '',
    followers: legacy.followers_count || 0,
    following: legacy.friends_count || 0,
    tweets: legacy.statuses_count || 0,
    verified: result.is_blue_verified || legacy.verified || false,
  };
}
