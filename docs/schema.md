schema.md
=========

## Overview

There are only a few tables:

1. `users`
1. `members`
1. `mls`
1. `comments`

# `users`

The users table contains auth information for the system:

    users
    -------------
    name
    secret
    create_time

# `members`

The members table contains all members that have ever been imported into the
database.  Only a few fields are kept persistent, just enough to recognize
comments for those that have moved away.

    members
    ------------
    id
    first_name
    last_name
    known

# `comments`

The comments table contains comments, by date, that are associated with members.

    comments
    ------------
    id
    date
    comment

# `mls`

The mls table is blown away and recreated with each mls import.  The only
requirement is that it has the member id and can be joined with `members` and
`comments`.

    mls
    ------------
    id
    (other fields created from mls dump)
