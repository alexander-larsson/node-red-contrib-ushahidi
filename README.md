# Node-Red Ushahidi Node

## Introduction

A node that can be used for posting information to Ushahidi. It does not support
any other ways to interact with Ushahidi as of right now. There might be more
nodes added in the future (getting posts, updating data, deleting posts).

## Installation

Use npm to install locally:
> npm install node-red-contrib-ushahidi

Or if you're running a global Node-Red installation:
> npm install -g node-red-contrib-ushahidi

## Usage

Drag the node into the workspace and then set it up by entering the appropriate
information in the settings box that shows up when double clicking the node.

### Inputs

#### Required

- <code>msg.title</code> will be the title of the post
- <code>msg.payload</code> will be the description of the post
- <code>msg.loc</code> is a JavaScript object that includes the location of the post. The latitude should be set in a property <code>lat</code> and the longitude in <code>lon</code>. E.g: <code>msg.loc = {lat: 13, lon: 37}</code>

#### Optional

- <code>msg.author</code> will be the name of the author of the post. Cannot be used when logged on to a non-admin account.
- <code>msg.email</code> will be the author's email. Cannot be used when logged on to a non-admin account.
- <code>msg.formId</code> will be the id of the form on the Ushahidi deployment. Defaults to 1.

### Outputs

- <code>msg.payload</code> is the payload you get back from the server
- <code>msg.statusCode</code> is the HTTP status code returned by the server

## Other notes

- In order for your posts to show up directly on the map you have to log on using an admin account (and post them as Published not Draft). This is how Ushahidi works and nothing we can do anything about. You can also post using a regular account or without an account (as Draft) but these won't show up on the map until the admin approves them.
- Posting an email address that is not valid will result in an error from Ushahidi. To solve this, simply send no email address at all in your <code>msg</code> object.
