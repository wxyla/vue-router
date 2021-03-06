set -e
echo "Enter release version: "
read VERSION

read -p "Releasing $VERSION - are you sure? (y/n)" -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  echo "Releasing $VERSION ..."
  npm test
  VERSION=$VERSION npm run build

  # commit
  git add dist
  git commit -m "chore(build): $VERSION"
  npm version $VERSION --message "chore(release): $VERSION"

  # publish
  git push origin refs/tags/v$VERSION
  git push
  npm publish

  # changelog
  npm run changelog
  read OKAY
  git add CHANGELOG.md
  git commit -m "chore(changelog): $VERSION"
  git push
fi
