#! /bin/bash

# fail this script on first occurrence of an error
set -e

assert_variable_exists() {
  varname=$1
  if [[ -z ${!varname} ]]; then
    echo "Failed to find expected environment variable: '$varname'"
    exit 1
  fi
}

echo "Setting up NPM config..."
assert_variable_exists "NEXUS_NAME"
assert_variable_exists "NEXUS_USERNAME"
assert_variable_exists "NEXUS_PASSWORD"
assert_variable_exists "NEXUS_EMAIL"
assert_variable_exists "GITHUB_TOKEN"

### Setup .npmrc for Nexus
NPMRC="
## Not currently deploying to nexus, so don't set these values.
# registry=https://nexus.inmar.com/nexus/content/repositories/npm-all/
# _auth=$(echo -n $NEXUS_USERNAME:$NEXUS_PASSWORD | openssl base64)

@inmar:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN

init.author.name=$NEXUS_NAME
init.author.email=$NEXUS_EMAIL
email=$NEXUS_EMAIL
always-auth=true
progress=false"
echo "$NPMRC" > ~/.npmrc