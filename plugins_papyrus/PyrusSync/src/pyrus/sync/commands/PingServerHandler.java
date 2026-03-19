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

        // On fait le ping dans un Job Eclipse — jamais bloquer le thread UI
        Job job = new Job("PyrusSync — ping serveur") {
            @Override
            protected IStatus run(IProgressMonitor monitor) {
                boolean ok = PyrusSyncPlugin.getInstance()
                                            .getHttpClient()
                                            .ping();

                // Retour sur le thread UI pour afficher le résultat
                Display.getDefault().asyncExec(() -> {
                    String url = PyrusSyncPlugin.getInstance().getServerUrl();
                    if (ok) {
                        MessageDialog.openInformation(
                            HandlerUtil.getActiveShell(event),
                            "PyrusSync",
                            "Serveur joignable ✓\n" + url
                        );
                    } else {
                        MessageDialog.openError(
                            HandlerUtil.getActiveShell(event),
                            "PyrusSync",
                            "Impossible de joindre le serveur ✗\n" + url
                        );
                    }
                });

                return Status.OK_STATUS;
            }
        };

        job.setUser(true); // affiche une progress bar si ça prend du temps
        job.schedule();

        return null;
    }
}