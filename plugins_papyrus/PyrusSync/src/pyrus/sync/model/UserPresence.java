package pyrus.sync.model;

public class UserPresence {
    private String userId;
    private String displayName;
    private String color;      // couleur attribuée par le serveur
    private String location;   // ex : "Class::MyClass"

    public UserPresence(String userId, String displayName, String color) {
        this.userId = userId;
        this.displayName = displayName;
        this.color = color;
    }

    public String getUserId()      { return userId; }
    public String getDisplayName() { return displayName; }
    public String getColor()       { return color; }
    public String getLocation()    { return location; }
    public void setLocation(String location) { this.location = location; }
}