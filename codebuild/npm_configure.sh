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
assert_variable_exists "NEXUS_EMAIL"
assert_variable_exists "NPM_TOKEN"
assert_variable_exists "GITHUB_TOKEN"

NPMRC="
//registry.npmjs.org:_authToken=$NPM_TOKEN
//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN

init.author.name=$NEXUS_NAME
init.author.email=$NEXUS_EMAIL
email=$NEXUS_EMAIL
progress=false"
echo "$NPMRC" > ~/.npmrc