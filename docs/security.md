security.md
===========

Since there are cases where personal information will be made available, there
must be security controls in place to protect said personal information.

Now, I don't want to pay for an SSL cert.  All applications and secret bootstrap
will be done manually.  So, I'm making some simplifying assumptions...

## Simplifying assumptions

1. Mutual authentication is accomplished by a shared secret.
1. Integrity is verified by signature checks.
1. All request bodies are encrypted, with a header of random data.
1. Requests expire after 5 minutes (5 minutes is only to compensate for clock
   skew between clients and servers).
1. All requests to the server will be idempotent, making replayed requests
   harmless.

## API Security

Each user of the system must be added manually via the cli tools that are
located on the server where the data resides.  All users have the same
privileges (there's no plan for a 'read only' mode), so we're going to ignore
authorization problems and assume if we can authenticate a user, we're good to
let them access what anyone can.

Each user will get a name and a password.  The password is a secret chosen by
the administrator and is a shared secret that cannot be changed via the UI.
The administrator would need to delete and recreate the user for a "password"
change.

The password is a shared secret that is used for authentication and for
encryption.  Now, normally this is frowned upon by the security community, but
it will work for the purposes of this simple application.  I wish aes-gcm were
available in the browser and in node, but it's just not there yet.  So we'll use
PBKDF2 to generate the encryption key, and use the straight key for an
hmac-sha256.

So this is how to send a message, verification is done in reverse.  All messages
(client to server and server to client) follow the same pattern.

    Start with name=[name] password=[password]
    Generate key salt => KSALT
    PBKDF2(password, KSALT) => encryption_key
    Generate Random Data => random_data
    aesencrypt(random_data + data, encryption_key) => body //Can base64
    sha256(body) => DIGEST
    hmacsha256(['method: METHOD',
                'host: HOST',
                'path: PATH',
                'ksalt: KSALT',
                'date: DATE',
                'name: NAME',
                'content-sha256: DIGEST',
                'content-type: TYPE',
                'content-length: LENGTH].sort().join('\n'),
               password) => SIGNATURE

    Verification:
    check date header +- 5 minutes.
    check body digest
    check signature (recreate ^^)
    derive encryption key (as above)
    Decrypt body, throw away random-prefixed data.

That's it.

## Browser Security

Ultimately we need a "trustworthy" place (using conventional security mechanisms
like SSL) to server our web application from.  This is due to the simple fact
that if we serve the web app over a plaintext connection, the javascript could
be modified in-flight to send a user's shared secret to /dev/evil.  The
trustworthy place becomes, in effect the "bottom turtle".

Fortunately, there are many low-cost places for hosting content, so the Web App
will be uploaded to (pick your favorite cloud provider), and the server will
add CORS headers to allow x-site access.  To make sure that the credentials for
the user get sent to the hosting provider, we'll use the browser fragment
trick for keeping the credentials client-side.  For example:

    https://cloudprovider.com/path/login.html#name=bob&password=Xcc5_TrI
    | <---------- Sent to server ---------> || <---- browser only ---> |

In the example above, name and password get parsed out of the html fragment by
javascript, stored in local storage, and are used to sign/encrypt CORS requests
to the server.  The login.html page redirects to app.html when credentials are
present, app.html redirects to login when not.
