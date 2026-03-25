package pyrus.sync.http;

import pyrus.sync.Activator;
import pyrus.sync.Constants;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

import pyrus.sync.dto.ConnectedUser;
import pyrus.sync.dto.DocPresenceResponse;
import pyrus.sync.dto.DocsResponse;
import pyrus.sync.dto.HealthResponse;

import java.util.List;
import java.util.Map;

public class SyncHttpClient {

    private HttpClient client;
    private String baseUrl;

    public SyncHttpClient(String baseUrl) {
        this.baseUrl = baseUrl;
        this.client = buildClient();
    }

    private HttpClient buildClient() {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(Constants.REQUEST_TIMEOUT))
                .version(HttpClient.Version.HTTP_1_1)
                .build();
    }

    // Asynchronous GET — Avoid UI thread locking
    public CompletableFuture<String> getAsync(String endpoint) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + endpoint))
                .header("Content-Type", "application/json")
                .version(HttpClient.Version.HTTP_1_1)
                .GET()
                .build();

        return client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(this::checkResponse);
    }

    // Synchronous ping — simple ping to test the connection
    public boolean ping() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + ApiEndpoints.HEALTH))
                    .timeout(Duration.ofSeconds(5))
                    .version(HttpClient.Version.HTTP_1_1)
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            return response.statusCode() == 200;

        } catch (Exception e) {
            Activator.logError("Ping failed : " + baseUrl, e);
            return false;
        }
    }
    
    // Asynchronous POST with JSON body
    public CompletableFuture<String> postAsync(String endpoint, String jsonBody) {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + endpoint))
                .version(HttpClient.Version.HTTP_1_1)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        return client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(this::checkResponse);
    }
    
 // GET /health
    public CompletableFuture<HealthResponse> getHealth() {
        return getAsync(ApiEndpoints.HEALTH)
                .thenApply(json -> JsonParser.parse(json, HealthResponse.class));
    }

    // GET /docs
    public CompletableFuture<DocsResponse> getDocs() {
        return getAsync(ApiEndpoints.DOCS)
                .thenApply(json -> JsonParser.parse(json, DocsResponse.class));
    }

    // GET /presence
    public CompletableFuture<Map<String, List<ConnectedUser>>> getPresence() {
        return getAsync(ApiEndpoints.PRESENCE)
                .thenApply(JsonParser::parsePresenceSummary);
    }

    // GET /presence/:docId
    public CompletableFuture<DocPresenceResponse> getPresenceForDoc(String docId) {
        return getAsync(ApiEndpoints.presenceForDoc(docId))
                .thenApply(json -> JsonParser.parse(json, DocPresenceResponse.class));
    }

    private String checkResponse(HttpResponse<String> response) {
        if (response.statusCode() >= 400) {
            throw new HttpException(response.statusCode(), response.body());
        }
        return response.body();
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getBaseUrl() {
        return baseUrl;
    }
}