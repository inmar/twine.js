#! /bin/bash

# fail this script on first occurrence of an error
set -e

if [[ $HELPERS_INCLUDED ]]; then
  echo "Helpers have already been included in this script. Skipping duplicate inclusion"
else
  echo "Using /npm/helpers.sh; Script-Version: $BUILD_VERSION"

  ##########################
  # Global Variables
  ##########################

  lastTimestamp=`expr $(date +%s) - 1`
  durationLog="\n\n##########################\n\n# Build Profile\n\n"

  ##########################
  # Helper Functions
  ##########################

  # print duration (in ms) since last call
  recordAndPrintDuration()
  {
    currentTimestamp=$(date +%s)
    commandDuration=`expr $currentTimestamp - $lastTimestamp`
    echo -e "\n$1 : $commandDuration seconds \n\n"
    durationLog="$durationLog \n"
    durationLog="$durationLog $1 after $commandDuration seconds \n"
    lastTimestamp=`expr $currentTimestamp - 1`
  }

  printRecordedDurations()
  {
    echo -e "$durationLog"
    echo "##########################"
  }

  printCurrentTime()
  {
    echo ""
    echo "$1 @ $(date +%T)"
    echo ""
  }

  printLogDivider()
  {
    echo -e ".\n---------------- $1 ----------------"
  }

  hasPackageJson() {
    [[ -f "package.json" ]]
  }

  hasNpmScript() {
    # Check that the currently directory itself has a package.json.
    # Then use node to check if the package.json has defined the script in question.
    inlineScript='const pkg = require("./package.json"); console.log(pkg.scripts && !!pkg.scripts["'$1'"])'
    hasPackageJson && [[ $(node -e "$inlineScript" | grep "true" | wc -l) > 0 ]]
  }

  getPackageName() {
    # Check that the currently directory itself has a package.json
    # Then use node to retrieve the
    hasPackageJson && echo $(node -e "console.log(require('./package.json').name)")
  }

  ## run this function before exiting
  trap printRecordedDurations EXIT

  # keep track of the last executed command
  trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG

  # echo an error message before exiting on error
  trap 'echo "\"${current_command}\" command failed with exit code $?."' ERR

  # Setup variable to prevent duplicate includes
  HELPERS_INCLUDED=1
fi