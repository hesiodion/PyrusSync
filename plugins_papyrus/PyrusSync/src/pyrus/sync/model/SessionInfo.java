package pyrus.sync.model;

public class SessionInfo {
    private String id;
    private String modelPath;
    private int participantCount;

    public SessionInfo(String id, String modelPath, int participantCount) {
        this.id = id;
        this.modelPath = modelPath;
        this.participantCount = participantCount;
    }

    public String getId()             { return id; }
    public String getModelPath()      { return modelPath; }
    public int getParticipantCount()  { return participantCount; }
}