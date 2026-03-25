package pyrus.sync.commands;

import org.eclipse.core.commands.AbstractHandler;
import org.eclipse.core.commands.ExecutionEvent;
import org.eclipse.core.commands.ExecutionException;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.IStatus;
import org.eclipse.core.runtime.Status;
import org.eclipse.core.runtime.jobs.Job;
import org.eclipse.swt.widgets.Display;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.ui.handlers.HandlerUtil;

import pyrus.sync.PyrusSyncPlugin;

public class PingServerHandler extends AbstractHandler {

    @Override
    public Object execute(ExecutionEvent event) throws ExecutionException {

    	// Start the ping in an Eclipse job to avoid UI thread locking
        Job job = new Job("PyrusSync — ping serveur") {
            @Override
            protected IStatus run(IProgressMonitor monitor) {
            	
            	PyrusSyncPlugin.getInstance()
                .getHttpClient()
                .getHealth()
                .thenAccept(health -> Display.getDefault().asyncExec(() ->
                    MessageDialog.openInformation(
                        HandlerUtil.getActiveShell(event),
                        "PyrusSync",
                        "Server OK ✓\nUptime : " + health.uptime + "s\n" +
                        "Active docs : " + health.activeDocs
                    )
                ))
                .exceptionally(e -> {
                    Display.getDefault().asyncExec(() ->
                        MessageDialog.openError(
                            HandlerUtil.getActiveShell(event),
                            "PyrusSync",
                            "Server unreachable ✗\n" + e.getMessage()
                        )
                    );
                    return null;
                });
            	
                boolean ok = PyrusSyncPlugin.getInstance()
                                            .getHttpClient()
                                            .ping();

                // Sync display results with the main thread (UI)
                Display.getDefault().asyncExec(() -> {
                    String url = PyrusSyncPlugin.getInstance().getServerUrl();
                    if (ok) {
                        MessageDialog.openInformation(
                            HandlerUtil.getActiveShell(event),
                            "PyrusSync",
                            "Server reachable\n" + url
                        );
                    } else {
                        MessageDialog.openError(
                            HandlerUtil.getActiveShell(event),
                            "PyrusSync",
                            "Server unreachable\n" + url
                        );
                    }
                });

                return Status.OK_STATUS;
            }
        };

        job.setUser(true); // Display progress bar if its too long...
        job.schedule();

        return null;
    }
}