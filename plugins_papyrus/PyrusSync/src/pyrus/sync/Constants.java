package pyrus.sync;

public final class Constants {
    private Constants() {}

    public static final String PLUGIN_ID       = "PyrusSync";
    public static final String DEFAULT_HOST    = "http://localhost:3000";
    public static final int    REQUEST_TIMEOUT = 10; // secondes

    // Clés pour les préférences Eclipse (servira plus tard)
    public static final String PREF_SERVER_URL = "server.url";
    public static final String PREF_USERNAME   = "username";
}