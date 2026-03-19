package pyrus.sync;

import pyrus.sync.http.SyncHttpClient;

public class PyrusSyncPlugin {

    private static PyrusSyncPlugin instance;

    private SyncHttpClient httpClient;
    private String serverUrl = Constants.DEFAULT_HOST;

    private PyrusSyncPlugin() {}

    public static PyrusSyncPlugin getInstance() {
        if (instance == null) {
            instance = new PyrusSyncPlugin();
        }
        return instance;
    }

    public void initialize() {
        httpClient = new SyncHttpClient(serverUrl);
        Activator.log("PyrusSyncPlugin initialisé — serveur : " + serverUrl);
    }

    public void dispose() {
        httpClient = null;
    }

    public SyncHttpClient getHttpClient() {
        return httpClient;
    }

    public String getServerUrl() { return serverUrl; }

    public void setServerUrl(String url) {
        this.serverUrl = url;
        if (httpClient != null) {
            httpClient.setBaseUrl(url);
        }
    }
}