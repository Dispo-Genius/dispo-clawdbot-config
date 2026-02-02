#!/usr/bin/env npx tsx
/**
 * twitter-cc: Twitter CLI using cookie-based authentication
 *
 * For Polaris: uses its own Twitter account (not Andy's).
 * Credentials stored in ~/.clawdbot/credentials.json:
 *   TWITTER_AUTH_TOKEN - auth_token cookie value
 *   TWITTER_CT0 - ct0 cookie value
 *
 * Usage: gateway-cc exec twitter <command> [args...]
 */

import { postTweet, getTimeline, searchTweets, getUser, getTweet } from './api/client';
import type { Tweet, User } from './api/client';

const [command, ...args] = process.argv.slice(2);

function formatTweet(t: Tweet): string {
  const date = t.createdAt ? new Date(t.createdAt).toLocaleString() : '';
  return `@${t.author} (${date})
${t.text}
[${t.id}] ${t.likes} likes, ${t.retweets} RTs, ${t.replies} replies
`;
}

function formatUser(u: User): string {
  return `@${u.username} ${u.verified ? '[verified]' : ''}
${u.name}
${u.description}
Followers: ${u.followers} | Following: ${u.following} | Tweets: ${u.tweets}
`;
}

function printHelp(): void {
  console.log(`twitter-cc: Twitter CLI (cookie-based auth)

Usage: gateway-cc exec twitter <command> [args...]

Commands:
  post <text>              Post a tweet
  timeline [count]         Get home timeline (default: 20)
  search <query> [count]   Search tweets (default: 20)
  user <@handle>           Get user profile
  tweet <id>               Get a specific tweet

Setup:
  1. Log into Twitter in your browser
  2. Open DevTools > Application > Cookies > twitter.com
  3. Copy 'auth_token' and 'ct0' cookie values
  4. Add to ~/.clawdbot/credentials.json:
     {
       "TWITTER_AUTH_TOKEN": "your-auth-token",
       "TWITTER_CT0": "your-ct0"
     }

For Polaris: each machine uses its own credentials file.
`);
}

async function main(): Promise<void> {
  if (!command || command === 'help' || command === '--help') {
    printHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'post': {
        const text = args.join(' ');
        if (!text) {
          console.error('Usage: twitter post <text>');
          process.exit(1);
        }
        const tweet = await postTweet(text);
        console.log('Posted successfully:');
        console.log(formatTweet(tweet));
        break;
      }

      case 'timeline': {
        const count = args[0] ? parseInt(args[0], 10) : 20;
        const tweets = await getTimeline(count);
        if (tweets.length === 0) {
          console.log('No tweets found');
        } else {
          tweets.forEach((t) => console.log(formatTweet(t)));
        }
        break;
      }

      case 'search': {
        const query = args[0];
        if (!query) {
          console.error('Usage: twitter search <query> [count]');
          process.exit(1);
        }
        const count = args[1] ? parseInt(args[1], 10) : 20;
        const tweets = await searchTweets(query, count);
        if (tweets.length === 0) {
          console.log('No tweets found');
        } else {
          tweets.forEach((t) => console.log(formatTweet(t)));
        }
        break;
      }

      case 'user': {
        const handle = args[0];
        if (!handle) {
          console.error('Usage: twitter user <@handle>');
          process.exit(1);
        }
        const user = await getUser(handle);
        console.log(formatUser(user));
        break;
      }

      case 'tweet': {
        const id = args[0];
        if (!id) {
          console.error('Usage: twitter tweet <id>');
          process.exit(1);
        }
        const tweet = await getTweet(id);
        console.log(formatTweet(tweet));
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    process.exit(1);
  }
}

main();
