package pyrus.sync.http;

public final class ApiEndpoints {
    private ApiEndpoints() {}

    public static final String HEALTH    = "/health";
    public static final String SESSIONS  = "/sessions";
    public static final String PRESENCE  = "/presence";
    public static final String JOIN      = "/sessions/%s/join";   // %s = sessionId
    public static final String LEAVE     = "/sessions/%s/leave";
    public static final String DOCS             = "/docs";
    public static final String PRESENCE_DOC     = "/presence/%s";

    public static String join(String sessionId) {
        return String.format(JOIN, sessionId);
    }

    public static String leave(String sessionId) {
        return String.format(LEAVE, sessionId);
    }

    public static String presenceForDoc(String docId) {
        return String.format(PRESENCE_DOC, docId);
    }
}