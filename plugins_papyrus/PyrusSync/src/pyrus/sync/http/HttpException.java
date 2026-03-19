package pyrus.sync.http;

public class HttpException extends RuntimeException {
	private static final long serialVersionUID = 1L;
	private final int statusCode;

    public HttpException(int statusCode, String message) {
        super("HTTP " + statusCode + " : " + message);
        this.statusCode = statusCode;
    }

    public int getStatusCode() { return statusCode; }
}