cli.md
======

## A cli?

Yes, a CLI.  The CLI has the following features, and will interact directly with
the sqlite db.

1. Import dumps from MLS
1. Export comments to csv
1. Put/delete users
1. List Users
1. Generate login URLs

Sample usage is below.

## Import Dump

    $ ./bin/import.js -d ./data/db -f /tmp/mls_dump.csv

## Export Comments

    $ ./bin/dump.js -d ./data/db -f /tmp/comments_dump.csv

## Put User

    $ ./bin/user.js putUser -n bob -s super_secret -e 127.0.0.1 -d ./data/db
    http://127.0.0.1/login.html#user=bob&secret=super_secret

## Delete User

    $ ./bin/user.js delUser -n bob -d ./data/db
    Ok.

## List Users

    $ ./bin/user.js listUsers -d ./data/db
    bob

## Generate Login Url

    $ ./bin/user.js userUrl -n bob -e 127.0.0.1 -d ./data/db
    http://127.0.0.1/login.html#user=bob&secret=super_secret
