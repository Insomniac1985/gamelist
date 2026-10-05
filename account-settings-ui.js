export function accountSettingsMarkup() {
  return `
    <div class="settings-grid settings-detail-grid">
      <div class="settings-account-field settings-igdb-field">
        <span>IGDB API</span>
        <small class="settings-provider-intro" id="settingsIgdbIntro" data-account-intro="igdb">Create a Twitch developer app for IGDB using these steps:</small>
        <ol class="settings-igdb-steps" id="settingsIgdbSteps" data-account-steps="igdb">
          <li>Click the Twitch Developer Console button.</li>
          <li>Make sure the account has email verification and 2FA enabled.</li>
          <li>Go to <strong>Applications</strong>.</li>
          <li>Click <strong>Register Your Application</strong>.</li>
          <li>Use any app name, for example <strong>Gamelist</strong>.</li>
          <li>Use <code>https://localhost</code> as the OAuth Redirect URL.</li>
          <li>Set the category to <strong>Website Integration</strong>.</li>
          <li>Set the client type as <strong>Confidential</strong>.</li>
          <li>Create the app.</li>
          <li>Click the manage button on the Application you just created.</li>
          <li>Copy the <strong>Client ID</strong>.</li>
          <li>Click <strong>Generate New Secret</strong> and copy the <strong>Client Secret</strong>.</li>
          <li>Paste the Client ID and Client Secret, then click <strong>Verify and connect IGDB</strong>.</li>
        </ol>
        <div class="settings-provider-controls">
          <span id="settingsIgdbStatus" data-account-status="igdb" class="settings-provider-status" hidden></span>
          <a class="ghost-button settings-provider-page-button" id="settingsIgdbOpen" data-account-open="igdb" href="https://dev.twitch.tv/console" target="_blank" rel="noopener noreferrer">Log in to Twitch Developer Console</a>
          <button class="ghost-button" id="settingsIgdbDisconnect" data-account-action="igdb-disconnect" type="button" hidden>Disconnect</button>
        </div>
        <div class="settings-provider-callback" id="settingsIgdbCredentialSetup" data-account-entry="igdb" hidden>
          <label for="settingsIgdbClientId">Twitch Client ID</label>
          <input id="settingsIgdbClientId" data-account-input="igdb-id" type="text" autocomplete="off" name="igdb-client-id-entry" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" readonly placeholder="Paste the Client ID">
          <label for="settingsIgdbClientSecret">Twitch Client Secret</label>
          <input id="settingsIgdbClientSecret" data-account-input="igdb-secret" type="password" autocomplete="off" name="igdb-client-secret-entry" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" readonly placeholder="Paste the Client Secret">
          <span id="settingsIgdbApiStatus" data-account-error="igdb" class="settings-provider-status" hidden></span>
          <button class="ghost-button" id="settingsIgdbConnect" data-account-action="igdb-connect" type="button">Verify and connect IGDB</button>
        </div>
      </div>
      <div class="settings-account-field settings-psn-field">
        <span data-i18n="PlayStation account">PlayStation Account</span>
        <small class="settings-provider-intro" id="settingsPsnIntro" data-account-intro="psn">Log in with PlayStation, open the token page, then copy and paste the full text including the brackets here. Gamelist reads the npsso token and uses expires_in to show how long it remains valid. Then enter your PlayStation ID to confirm.</small>
        <div class="settings-provider-controls">
          <span id="settingsPsnStatus" data-account-status="psn" class="settings-provider-status" hidden></span>
          <button class="ghost-button settings-provider-page-button" id="settingsPsnConnect" data-account-action="psn-start" type="button">Log in with PlayStation</button>
          <button class="ghost-button" id="settingsPsnDisconnect" data-account-action="psn-disconnect" type="button" hidden>Disconnect</button>
        </div>
        <div class="settings-provider-callback" id="settingsPsnCallback" data-account-entry="psn" hidden>
          <button class="ghost-button settings-provider-page-button" id="settingsPsnTokenPage" data-account-action="psn-token" type="button" hidden>Open PSN Token page</button>
          <small class="settings-provider-intro" id="settingsPsnPasteInfo" hidden>Copy the full JSON code inside the brackets, including npsso and expires_in, and paste it below.</small>
          <label for="settingsPsnNpsso" id="settingsPsnTokenLabel" hidden>PlayStation token JSON</label>
          <input id="settingsPsnNpsso" data-account-input="psn-token" type="password" autocomplete="off" name="psn-token-entry" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" readonly placeholder="Paste the full token response">
          <small class="settings-provider-intro" id="settingsPsnConfirmInfo" hidden>Add your PlayStation ID, then confirm the connection.</small>
          <label for="settingsPsnUser" id="settingsPsnUserLabel" hidden>PlayStation online ID</label>
          <input id="settingsPsnUser" data-account-input="psn-user" autocomplete="off" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" placeholder="PlayStation online ID" data-i18n-placeholder="PlayStation online ID" hidden>
          <button class="ghost-button" id="settingsPsnConfirm" data-account-action="psn-connect" type="button" hidden disabled>Confirm connection</button>
        </div>
      </div>
      <div class="settings-account-field settings-provider-field settings-xbox-field">
        <span data-i18n="Xbox account">Xbox Account</span>
        <small class="settings-provider-intro" id="settingsXboxIntro" data-account-intro="xbox">Log in with Xbox, open the OpenXBL API keys page, then copy and paste your API key here.</small>
        <input id="settingsMicrosoftUser" autocomplete="off" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" hidden placeholder="Xbox gamertag or XUID" data-i18n-placeholder="Xbox gamertag or XUID">
        <div class="settings-provider-controls">
          <span id="settingsXboxStatus" data-account-status="xbox" class="settings-provider-status" hidden></span>
          <span id="settingsXboxApiStatus" data-account-error="xbox" class="settings-provider-status" hidden></span>
          <button class="ghost-button" id="settingsXboxDisconnect" data-account-action="xbox-disconnect" type="button" hidden>Disconnect</button>
        </div>
        <div class="settings-provider-callback" id="settingsXboxApiSetup" data-account-entry="xbox" hidden>
          <a class="ghost-button settings-provider-page-button" id="settingsXboxApiOpen" data-account-open="xbox" href="https://xbl.io/dashboard/keys" target="_blank" rel="noopener noreferrer">Log in with Xbox</a>
          <div id="settingsXboxApiEntry" data-account-entry="xbox-key" hidden>
            <label for="settingsXboxApiKey">OpenXBL API key</label>
            <input id="settingsXboxApiKey" data-account-input="xbox-key" type="password" autocomplete="off" name="xbox-api-key-entry" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" readonly placeholder="Paste the API key">
          </div>
        </div>
      </div>
      <div class="settings-account-field settings-provider-field settings-steam-field">
        <span data-i18n="Steam account">Steam Account</span>
        <small class="settings-provider-intro" id="settingsSteamApiIntro" data-account-intro="steam">Log in with Steam, then open the Steam API key page, register this site's domain and paste the key below.</small>
        <input id="settingsSteamUser" autocomplete="off" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" hidden placeholder="SteamID64, profile URL, or vanity name" data-i18n-placeholder="SteamID64, profile URL, or vanity name">
        <div class="settings-provider-controls">
          <span id="settingsSteamStatus" data-account-status="steam" class="settings-provider-status" hidden></span>
          <span id="settingsSteamApiStatus" data-account-error="steam" class="settings-provider-status" hidden></span>
          <button class="ghost-button" id="settingsSteamConnect" data-account-action="steam-start" type="button">Log in with Steam</button>
          <button class="ghost-button" id="settingsSteamDisconnect" data-account-action="steam-disconnect" type="button" hidden>Disconnect</button>
        </div>
        <div class="settings-provider-callback" id="settingsSteamApiSetup" data-account-entry="steam-key" hidden>
          <a class="ghost-button settings-provider-page-button" href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noreferrer">Open Steam API key page</a>
          <label for="settingsSteamApiKey">Steam Web API key</label>
          <input id="settingsSteamApiKey" data-account-input="steam-key" type="password" autocomplete="off" name="steam-api-key-entry" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" readonly placeholder="Paste the API key">
        </div>
      </div>
      <div class="settings-account-field settings-nintendo-field">
        <span>Nintendo Account</span>
        <small class="settings-nintendo-intro" id="settingsNintendoIntro" data-account-intro="nintendo">Log in with Nintendo, select your account, then right click and Copy the Link address from Select this person. Paste the link below.</small>
        <div class="settings-nintendo-controls">
          <span id="settingsNintendoStatus" data-account-status="nintendo" class="settings-nintendo-status" hidden></span>
          <button class="ghost-button" id="settingsNintendoConnect" data-account-action="nintendo-start" type="button">Log in with Nintendo</button>
          <button class="ghost-button" id="settingsNintendoDisconnect" data-account-action="nintendo-disconnect" type="button" hidden>Disconnect</button>
        </div>
        <div class="settings-nintendo-callback" id="settingsNintendoCallback" data-account-entry="nintendo" hidden>
          <label for="settingsNintendoCallbackUrl">Nintendo sign-in link with code</label>
          <input id="settingsNintendoCallbackUrl" data-account-input="nintendo-link" autocomplete="off" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" placeholder="Paste the copied link here">
        </div>
      </div>
      <label class="settings-account-field settings-twitch-field">
        <span data-i18n="Twitch account">Twitch Account</span>
        <input id="settingsTwitchUser" autocomplete="off" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" placeholder="Twitch username" data-i18n-placeholder="Twitch username">
      </label>
    </div>
  `;
}
