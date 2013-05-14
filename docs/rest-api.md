rest-api
========

The rest API allows for:

1. Errors for unauthenticated/unauthorized access
1. List of fields that can be searched
1. Search keyed on field
1. Get member information, including comments, already sorted
1. POST new comment
1. Update certain fields to list of Enums

## All APIs

All APIs require certain headers to function correctly.  Specifically, the
headers for security.  Here is a sample request:

    ------------------------------------------
    GET /foo HTTP/1.1
    host: 127.0.0.1
    x-auth: name=bob;ksalt=abc;signature=ghi
    date: 2013-05-11T11:02Z
    content-type: application/octet-stream
    content-sha256: checksum
    content-length: 54

    encrypted_body

The discussion around security mechanisms can be found in
[security](security.md).  All requests/responses assume that the security
mechanisms are done at a "lower level" than what we have below, i.e., what's
below is before encryption and after decryption.

In the following examples, line breaks have been added for clarity.

## GET /fields

    ------------------------------------------
    GET /fields HTTP/1.1
    host: 127.0.0.1
    ...

    ------------------------------------------
    HTTP/1.1 200 Ok
    ...

    ["First Name", "Last Name", ...]

## GET /member/:id

    ------------------------------------------
    GET /member/1234 HTTP/1.1
    host: 127.0.0.1
    ...

    ------------------------------------------
    HTTP/1.1 200 Ok
    ...

    { "First Name": "Alvin",
      "Last Name": "Smith",
      ...
      "Comments": [
         { "Date": "2012-05-13T04:21:03Z",
           "Comment": "Alvin is awesome!" },
         ...
       ]
    }

## GET /member?field=:field&term=:term

    ------------------------------------------
    GET /member?field=Last%20Name&term=smi HTTP/1.1
    host: 127.0.0.1
    ...

    ------------------------------------------
    HTTP/1.1 200 Ok
    ...

    [ { "First Name": "Alvin",
        "Last Name": "Smith",
        ...
      },
      ...
    ]

## POST /member/:id

Only some fields will be update-able, and even those to a set of known values.

    ------------------------------------------
    POST /member/1234 HTTP/1.1
    host: 127.0.0.1
    ...

    { "Status": "Known" }

    ------------------------------------------
    HTTP/1.1 204 No Content
    ...


## POST /member/:id/comment

    ------------------------------------------
    POST /member/1234/comment HTTP/1.1
    host: 127.0.0.1
    ...

    { "Date": "2012-05-13T04:21:03Z",
      "Comment": "Alvin is awesome!" }

    ------------------------------------------
    HTTP/1.1 204 No Content
    ...
