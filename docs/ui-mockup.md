ui-mockup
=========

Yes, this mockup is done in ascii-art.  I said simplicity was the goal.

## Login

Most people will just have a link that they will use all the time.  For those
that enjoy pain, there will be a login screen if the appropriate cookies aren't
set:

     -----------------------------------------
    |           Mini LDS Tools                |
    |-----------------------------------------|
    |                                         |
    |               ____________________      |
    |    Username: |____________________|     |
    |               ____________________      |
    |    Password: |____________________|     |
    |                                         |
    |                                         |
    v v v v v v v v v v v v v v v v v v v v v v

## Front Page

Front Page consists of an auto-completion search bar and a field to search on:

     -----------------------------------------
    | Search Box (Autosearches)  | Field  | V |
    |-----------------------------------------|
    |                                         |
    |                                         |
    |                                         |
    v v v v v v v v v v v v v v v v v v v v v v

Once a field is selected and typing begins:

     -----------------------------------------
    | Smi                     | Last Name | V |
    |-----------------------------------------|
    |                                         |
    | Smith, Alvin                            |
    | Smith, Emma                             |
    | Smith, Joe                              |
    v v v v v v v v v v v v v v v v v v v v v v

## Detail Page

Clicking on a name brings you to a detail page:

     -----------------------------------------
    | < Back |                                |
    |-----------------------------------------|
    | Name: Smith, Alvin                  | | |
    | Known, Active, Age: 32              | V |
    |-----------------------------------------|
    | Type to add comment                 | + |
    |-----------------------------------------|
    | Comment 10                              |
    | Comment 9                               |
    | Comment 8                               |
    | Comment 7                               |
    | Comment 6                               |
    v v v v v v v v v v v v v v v v v v v v v v

Comments are typed and submitted.  Hitting Back will take you back to the front
page.  Hitting the `V` (down) arrow will expand the details to include all
fields, in sorted order (we'll only special case a few fields to give an
overview).  For example:

     -----------------------------------------
    | < Back |                                |
    |-----------------------------------------|
    | Name: Smith, Alvin                  | ^ |
    | Known, Active, Age: 32              | | |
    | Move in Date:  6/12/2011            | | |
    | Current Calling: Priests Q. Adv     | | |
    | Head Of Household: Yes              | | |
    |-----------------------------------------|
    | Type to add comment                 | + |
    |-----------------------------------------|
    | Comment 10                              |
    | Comment 9                               |
    | Comment 8                               |
    | Comment 7                               |
    | Comment 6                               |
    v v v v v v v v v v v v v v v v v v v v v v
