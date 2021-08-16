#! /bin/bash

# fail this script on first occurrence of an error
set -e

# Import build helpers
source './ci/helpers.sh'

#####################
# Install and Setup #
#####################

printLogDivider "Install"
echo "Setting up and installing packages for Twine.js (npm install)..."
for i in {1..3}; do
  if npm i --unsafe-perm; then
    recordAndPrintDuration "Setup and install of Twine.js complete"
    break
  else
    if [[ $i == 3 ]]; then
      recordAndPrintDuration "Setup of Twine.js failed after 3 attempts"
      exit 1
    else
      echo "Failed to install. Retrying..."
      continue
    fi
  fi
done

#########
# Build #
#########
for PACKAGE_DIRECTORY in packages/*
do

  ### Move into library folder
  cd $PACKAGE_DIRECTORY
  PACKAGE_NAME=$(getPackageName)

  ### Build the library if it needs to be build
  if hasNpmScript "build"; then
    echo "Building $PACKAGE_NAME (npm build)..."
    if npm run build
      then
        recordAndPrintDuration "Building of $PACKAGE_NAME complete"
      else
        recordAndPrintDuration "Building of $PACKAGE_NAME failed"
        exit 1
      fi
  else
    echo "Skipping 'npm build' for $PACKAGE_NAME as it isn't defined"
  fi

  ### TODO: setup tests
  # npm run test

  ### Prepare for next library
  cd - > /dev/null
  echo ------
done

###########
# Publish #
###########

# registries=('https://registry.npmjs.org' 'https://npm.pkg.github.com')
registries=('https://registry.npmjs.org')
for registry in "${registries[@]}"
do
  :
  # Publish all packages, assuming there was a version bump
  if npx lerna publish from-package --registry $registry  --yes ; then
    recordAndPrintDuration "Publish to $registry Completed"
  else
    echo "Failed to publish Twine.js to $registry"
    exit 1
  fi

done
