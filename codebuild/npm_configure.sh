#! /bin/bash

# fail this script on first occurrence of an error
set -e

echo "Setting up NPM config..."

### Setup .npmrc for publishing
NPMRC="
_auth=$(echo -n $NEXUS_USERNAME:$NEXUS_PASSWORD | openssl base64)

init.author.name=$NEXUS_NAME
init.author.email=$NEXUS_EMAIL

email=$NEXUS_EMAIL
progress=false"

echo "$NPMRC" > ~/.npmrc
