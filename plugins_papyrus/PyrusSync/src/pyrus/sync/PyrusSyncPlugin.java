package pyrus.sync;

import pyrus.sync.http.SyncHttpClient;

public class PyrusSyncPlugin {

    private static PyrusSyncPlugin _instance;

    private SyncHttpClient _httpClient;
    private String _serverUrl = Constants.DEFAULT_HOST;

    private PyrusSyncPlugin() {}

    public static PyrusSyncPlugin getInstance() {
        if (_instance == null) {
        	_instance = new PyrusSyncPlugin();
        }
        return _instance;
    }

    public void initialize() {
    	_httpClient = new SyncHttpClient(_serverUrl);
        Activator.log("PyrusSyncPlugin initialised — server : " + _serverUrl);
    }

    public void dispose() {
    	_httpClient = null;
    }

    public SyncHttpClient getHttpClient() {
        return _httpClient;
    }

    public String getServerUrl() { return _serverUrl; }

    public void setServerUrl(String url) {
        this._serverUrl = url;
        if (_httpClient != null) {
        	_httpClient.setBaseUrl(url);
        }
    }
}