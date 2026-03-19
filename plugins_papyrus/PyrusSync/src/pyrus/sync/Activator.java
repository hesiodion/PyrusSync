package pyrus.sync;

import org.eclipse.core.runtime.ILog;
import org.eclipse.core.runtime.Platform;
import org.eclipse.ui.plugin.AbstractUIPlugin;
import org.osgi.framework.BundleContext;

public class Activator extends AbstractUIPlugin {

    private static Activator instance;

    @Override
    public void start(BundleContext context) throws Exception {
        super.start(context);
        instance = this;
        log("PyrusSync démarré");
        PyrusSyncPlugin.getInstance().initialize();
    }

    @Override
    public void stop(BundleContext context) throws Exception {
        PyrusSyncPlugin.getInstance().dispose();
        instance = null;
        super.stop(context);
    }

    public static Activator getDefault() {
        return instance;
    }

    public static void log(String message) {
        ILog logger = Platform.getLog(Activator.class);
        logger.info(message);
    }

    public static void logError(String message, Throwable t) {
        ILog logger = Platform.getLog(Activator.class);
        logger.error(message, t);
    }
}