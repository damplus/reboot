#!/bin/bash
set -e

if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
  echo "We are in a pull request, not releasing"
  exit 0
fi

if [[ $TRAVIS_BRANCH == 'master' ]]; then
  npm run semantic-release
  git push origin master
  git push --tags

else
  echo "We are not in master branch, not releasing"
  exit 0
fi
