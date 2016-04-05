Trello Card Dependency
======================

### Gertting started.

- install the extension
- open your Trello Card

If you dont have any existing checklist that you're using to keep track of your dependencies, that's ok.

#### First Time
<img src="img/no-existing-deps.png">

If you have an existing checklist that you're using to keep track of your dependencies,
simply rename the checklist to `card_dependency` and refresh the page.

#### Before
<img src="img/before.png">

#### Rename Checklist
<img src="img/rename_checklist.png">

#### After
<img src="img/after.png">


### Releasing A New Version

- make code changes + git commit (don't bump package.json version, this is done as part of `cut_release`)
- npm run cut_release
- git fetch
- git rebase
- git push
- git push origin --tags
- check the [travis build](https://travis-ci.org/amcmillan01/trello_card_dependency)

### License

Licensed under The MIT License (MIT)

For the full copyright and license information, please view the LICENSE.txt file.