package pyrus.sync.http;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonSyntaxException;
import com.google.gson.reflect.TypeToken;

import pyrus.sync.Activator;
import pyrus.sync.dto.ConnectedUser;

import java.lang.reflect.Type;
import java.util.List;
import java.util.Map;

public class JsonParser {

    private static final Gson GSON = new GsonBuilder()
            .create();

    // Désérialisation générique pour tous les DTOs simples
    public static <T> T parse(String json, Class<T> clazz) {
        try {
            return GSON.fromJson(json, clazz);
        } catch (JsonSyntaxException e) {
            Activator.logError("Échec désérialisation vers " + clazz.getSimpleName(), e);
            throw new HttpException(0, "JSON invalide : " + e.getMessage());
        }
    }

    // Désérialisation spécifique pour GET /presence
    // → Map<String, List<ConnectedUser>>
    public static Map<String, List<ConnectedUser>> parsePresenceSummary(String json) {
        Type type = new TypeToken<Map<String, List<ConnectedUser>>>() {}.getType();
        try {
            return GSON.fromJson(json, type);
        } catch (JsonSyntaxException e) {
            Activator.logError("Échec désérialisation presence summary", e);
            throw new HttpException(0, "JSON invalide : " + e.getMessage());
        }
    }
}