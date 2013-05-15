cli.md
======

## A cli?

Yes, a CLI.  The CLI has the following features, and is meant to interact
directly with the sqlite db.

1. Import dumps from MLS
1. Export comments to csv
1. Add/remove users
1. List Users/secrets
1. Add/remove shared secrets
1. Generate login URLs

Sample usage is below.

## Import Dump

    $ ./bin/import.js -s ./data/db -f /tmp/mls_dump.csv

## Export Comments

    $ ./bin/dump.js -s ./data/db -f /tmp/comments_dump.csv

## Add User

    $ ./bin/user.js add -n bob -s super_secret -e 127.0.0.1
    http://127.0.0.1/login.html#user=bob&secret=super_secret

## Remove User

    $ ./bin/user.js remove -n bob
    Ok.

## List Users

    $ ./bin/user.js list
    bob        super_secret

## Add Secret

    $ ./bin/user.js secretAdd -n bob -s another_secret -e 127.0.0.1
    http://127.0.0.1/login.html#user=bob&secret=another_secret

## Remove Secret

    $ ./bin/user.js secretRemove -n bob -s another_secret
    Ok.

## Generate Login Url

    $ ./bin/user.js url -n bob -e 127.0.0.1
    http://127.0.0.1/login.html#user=bob&secret=super_secret
    http://127.0.0.1/login.html#user=bob&secret=another_secret
