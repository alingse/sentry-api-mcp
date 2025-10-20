import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// This config object will be populated by yargs.
// yargs will automatically handle the priority: CLI arguments > environment variables.
export const config = yargs(hideBin(process.argv))
  // Define the --host option
  .option('host', {
    alias: 'h',
    type: 'string',
    description: 'The Sentry host URL.',
  })
  // Define the --access-token option
  .option('access-token', {
    alias: 't',
    type: 'string',
    description: 'The Sentry API access token.',
  })
  // Tell yargs to look for environment variables prefixed with SENTRY_
  // It will automatically map SENTRY_HOST to --host, and SENTRY_ACCESS_TOKEN to --access-token
  .env('SENTRY')
  // Make both options required. If not provided, yargs will show an error.
  .demandOption(['host', 'access-token'], 'Both --host and --access-token (or their corresponding SENTRY_ environment variables) are required.')
  // Enable help message
  .help()
  .alias('help', 'H')
  // Parse the arguments
  .parseSync();
