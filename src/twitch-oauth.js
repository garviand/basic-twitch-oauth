/*!
 * basic-twitch-oauth
 * Copyright(c) 2019-present caLLowCreation
 * MIT Licensed
 */

'use strict';

const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

function getBasicHeaders(client_id, client_secret) {
    return {
        'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
    };
}

function getBearerHeaders(access_token) {
    return {
        'Authorization': 'Bearer ' + access_token,
        'Content-Type': 'application/json'
    }
}

function TwitchOAuth({ client_id, client_secret, redirect_uri, force_verify, scopes }, state) {

    this.secondsOff = 60;

    this.client_id = client_id;
    this.client_secret = client_secret;
    this.redirect_uri = redirect_uri;
    this.force_verify = force_verify;
    this.scopes = scopes.join(' ');

    this.state = state;

    this.authenticated = {
        success: false,
        access_token: null,
        refresh_token: null,
        expires_in: 0,
        expires_time: 0
    };

    const urlParams = [
        `client_id=${this.client_id}`,
        `redirect_uri=${encodeURIComponent(this.redirect_uri)}`,
        `response_type=code`,
        `scope=${encodeURIComponent(this.scopes)}`,
        `force_verify=${this.force_verify}`,
        `state=${state}`
    ];
    const urlQuery = urlParams.join('&');

    this.authorizeUrl = `https://id.twitch.tv/oauth2/authorize?${urlQuery}`
}

TwitchOAuth.prototype.confirmState = function (state) {
    return state === this.state;
};

TwitchOAuth.prototype.setAuthenticated = function ({ access_token, refresh_token, expires_in }) {
    this.authenticated.access_token = access_token;
    this.authenticated.refresh_token = refresh_token;
    this.authenticated.expires_in = expires_in;
    
    this.authenticated.success = true;

    const d = new Date();
    const seconds = Math.round(d.getTime() / 1000);
    this.authenticated.expires_time = (seconds + this.authenticated.expires_in) - this.secondsOff;

    return this.authenticated;
};

TwitchOAuth.prototype.fetchToken = async function (code) {
    return fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: getBasicHeaders(this.client_id, this.client_secret),
        body: new URLSearchParams({
            client_id: this.client_id,
            client_secret: this.client_secret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: this.redirect_uri
        })
    }).then(result => result.json()).then(json => this.setAuthenticated(json)).catch(e => e);
};

TwitchOAuth.prototype.fetchRefreshToken = async function (refresh_token) {
    let token = refresh_token;
    if (!token) {
        token = this.authenticated.refresh_token;
    }
    return fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: getBasicHeaders(this.client_id, this.client_secret),
        body: new URLSearchParams({
            client_id: this.client_id,
            client_secret: this.client_secret,
            grant_type: 'refresh_token',
            refresh_token: token
        })
    }).then(result => result.json()).then(json => this.setAuthenticated(json)).catch(e => e);
};

TwitchOAuth.prototype.getEndpoint = async function (url, access_token) {
    console.log(`access_token: ${access_token}`)
    return fetch(url, {
        method: 'GET',
        headers: getBearerHeaders(access_token)
    }).then(result => {
        console.log(result)
        return result.json()
    }).catch(e => e);
};

TwitchOAuth.prototype.postEndpoint = async function (url, body, access_token) {
    return fetch(url, {
        method: 'POST',
        headers: getBearerHeaders(access_token),
        body: body
    }).then(result => result.json()).catch(e => e);
};

module.exports = TwitchOAuth;