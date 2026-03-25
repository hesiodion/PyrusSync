package pyrus.sync.dto;

public class ConnectedUser {
    public String clientId;
    public String name;
    public String color;
    public String docId;
    public String connectedAt;

    @Override
    public String toString() {
        return name + " (" + docId + ")";
    }
}