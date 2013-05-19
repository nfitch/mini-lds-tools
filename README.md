mini-lds-tools
==============

Mini LDS Tools

The mini LDS tool consists of:

1. Command line tools for ingesting MLS exports and exporting comments.
1. A REST api for accessing information.
1. Simple UI for displaying information, adding comments and adjusting status.

The intent is a simplistic system for tracking those moving in and out of wards
and keeping personal notes about visits made, etc.

## Command-line tools

See [the CLI](docs/cli.md)

## Server and REST API

See [the REST api](docs/rest-api.md)

## Web App

If the interface isn't self-explanatory, then these tools are a
failure... though these are [the UI mockups](docs/ui-mockup.md)

## SQLite3 access

You should be familiar with sqlite3 (guide is here
http://www.sqlite.org/sqlite.html), but this should get you started:

    $ sqlite3 [path to db]
    sqlite> .tables
    sqlite> .schema [table]

## TODO

1. ✓ Mock out Webapp
1. ✓ Define security interactions
1. ✓ Define REST API
1. ✓ Define CLI
1. ✓ Sqlite schema
1. ✓ Persistence layer
1. Restify security filter
1. Implement API over persistence
1. Import cli
1. Export cli
1. Add/delete user cli
1. "Login"
1. Web App

## TO FIX

1. Those without #s

## License

MIT, see LICENSE.txt
